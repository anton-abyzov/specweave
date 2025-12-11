/**
 * Plugin installation for Claude Code
 * Handles marketplace registration and plugin installation
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';
import * as os from 'os';
import chalk from 'chalk';
import ora from 'ora';
import { execFileNoThrowSync } from '../../../utils/execFileNoThrow.js';
import { detectClaudeCli, getClaudeCliDiagnostic, getClaudeCliSuggestions } from '../../../utils/claude-cli-detector.js';
import { findSourceDir } from './path-utils.js';

/**
 * Detect if we're running in the SpecWeave framework repository itself.
 * Framework developers need faster cache TTL for plugin iteration.
 */
function isSpecWeaveFrameworkRepository(dirname: string): boolean {
  try {
    // Walk up from dirname to find package.json
    let currentDir = dirname;
    for (let i = 0; i < 10; i++) {
      const packageJsonPath = path.join(currentDir, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        return packageJson.name === 'specweave';
      }
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) break;
      currentDir = parentDir;
    }
  } catch {
    // Ignore errors, assume not framework repo
  }
  return false;
}

/**
 * Options for plugin installation
 */
export interface PluginInstallOptions {
  dirname: string;
  forceRefresh?: boolean;
}

/**
 * Result of plugin installation
 */
export interface PluginInstallResult {
  success: boolean;
  successCount: number;
  failCount: number;
  failedPlugins: string[];
}

/**
 * Install all SpecWeave plugins via Claude CLI
 *
 * @param options - Installation options
 * @returns Installation result
 */
export async function installAllPlugins(options: PluginInstallOptions): Promise<PluginInstallResult> {
  const { dirname, forceRefresh } = options;
  const spinner = ora();

  // Pre-flight check: Is Claude CLI available?
  const claudeStatus = detectClaudeCli();

  if (!claudeStatus.available) {
    // Claude CLI NOT working - show diagnostics
    const diagnostic = getClaudeCliDiagnostic(claudeStatus);
    const suggestions = getClaudeCliSuggestions(claudeStatus);

    spinner.warn(diagnostic);
    console.log('');
    console.log(chalk.yellow.bold('⚠️  Claude Code CLI Issue Detected'));
    console.log('');

    // Show detailed diagnostic info
    if (claudeStatus.commandExists) {
      console.log(chalk.white('Found command in PATH, but verification failed:'));
      console.log('');
      if (claudeStatus.commandPath) {
        console.log(chalk.gray(`   Path: ${claudeStatus.commandPath}`));
      }
      if (claudeStatus.exitCode !== undefined) {
        console.log(chalk.gray(`   Exit code: ${claudeStatus.exitCode}`));
      }
      console.log(chalk.gray(`   Issue: ${claudeStatus.error}`));
      console.log('');

      if (claudeStatus.error === 'version_check_failed') {
        console.log(chalk.yellow('⚠️  This likely means:'));
        console.log(chalk.gray('   • You have a DIFFERENT tool named "claude" in PATH'));
        console.log(chalk.gray('   • It\'s not the Claude Code CLI from Anthropic'));
        console.log(chalk.gray('   • The command exists but doesn\'t respond to --version'));
      }
    } else {
      console.log(chalk.white('Claude CLI not found in PATH'));
    }
    console.log('');

    // Show actionable suggestions
    console.log(chalk.cyan('💡 How to fix:'));
    console.log('');
    suggestions.forEach(suggestion => {
      console.log(chalk.gray(`   ${suggestion}`));
    });
    console.log('');

    // Show alternatives if CLI not found
    if (claudeStatus.error === 'command_not_found') {
      console.log(chalk.cyan('Alternative Options:'));
      console.log('');
      console.log(chalk.white('1️⃣  Use Claude Code IDE (no CLI needed):'));
      console.log(chalk.gray('   → Open this project in Claude Code'));
      console.log(chalk.gray('   → Run: /plugin install specweave'));
      console.log(chalk.gray('   → Works immediately, no npm installation!'));
      console.log('');
      console.log(chalk.white('2️⃣  Use Different AI Tool:'));
      console.log(chalk.gray('   → Run: specweave init --adapter cursor'));
      console.log(chalk.gray('   → Works without Claude CLI'));
      console.log(chalk.gray('   → Less automation but no CLI dependency'));
      console.log('');
    }

    return { success: false, successCount: 0, failCount: 0, failedPlugins: [] };
  }

  // Claude CLI available - proceed with installation
  try {
    const marketplaceCachePath = path.join(
      os.homedir(),
      '.claude/plugins/marketplaces/specweave/.claude-plugin/marketplace.json'
    );

    // Check if cache is fresh and valid
    // CRITICAL FIX (v0.34.6): Increased from 5 min to 24 hours for users
    // ENHANCEMENT (v0.34.6): Framework developers get 5 min TTL for faster iteration
    let needsRefresh = true;

    if (!forceRefresh && fs.existsSync(marketplaceCachePath)) {
      const cacheStats = fs.statSync(marketplaceCachePath);
      const cacheAge = Date.now() - cacheStats.mtimeMs;

      // Detect if we're in SpecWeave framework repo (developers need faster refresh)
      const isFrameworkRepo = isSpecWeaveFrameworkRepository(dirname);
      const cacheTTL = isFrameworkRepo
        ? 5 * 60 * 1000           // 5 min for framework developers
        : 24 * 60 * 60 * 1000;    // 24 hours for users

      if (cacheAge < cacheTTL) {
        try {
          const cacheData = JSON.parse(fs.readFileSync(marketplaceCachePath, 'utf-8'));
          // Validate cache has at least one plugin with required fields
          // NOTE: Don't hardcode plugin count - marketplace may grow/shrink
          const hasValidPlugins = cacheData.plugins &&
            cacheData.plugins.length > 0 &&
            cacheData.plugins.some((p: { name?: string }) => p.name === 'specweave') && // Core plugin must exist
            cacheData.plugins.every((p: { name?: string; version?: string; description?: string }) =>
              p.name && p.version && p.description);

          if (hasValidPlugins) {
            needsRefresh = false;
            const ttlMsg = isFrameworkRepo ? 'dev mode, 5min TTL' : 'fresh';
            console.log(chalk.green(`   ⚡ Using cached marketplace (${ttlMsg})`));
          }
        } catch {
          // Cache invalid, needs refresh
        }
      }
    }

    if (needsRefresh) {
      await refreshMarketplace(spinner);
    }

    // Load marketplace.json to get ALL available plugins
    spinner.start('Loading available plugins...');
    const marketplaceJsonPath = findSourceDir('.claude-plugin/marketplace.json', dirname);

    if (!fs.existsSync(marketplaceJsonPath)) {
      throw new Error('marketplace.json not found - cannot determine plugins to install');
    }

    const marketplace = JSON.parse(fs.readFileSync(marketplaceJsonPath, 'utf-8'));
    const allPlugins = marketplace.plugins || [];

    if (allPlugins.length === 0) {
      throw new Error('No plugins found in marketplace.json');
    }

    console.log(chalk.blue(`   📦 Found ${allPlugins.length} plugins to install`));
    spinner.succeed(`Found ${allPlugins.length} plugins`);

    // Install ALL plugins with retry logic
    const result = await installPluginsWithRetry(allPlugins, spinner);

    // Report results
    console.log('');
    console.log(chalk.green.bold('✅ Plugin Installation Complete'));
    console.log(chalk.white(`   Installed: ${result.successCount}/${allPlugins.length} plugins`));

    if (result.failCount > 0) {
      console.log(chalk.yellow(`   Failed: ${result.failCount} plugins`));
      console.log(chalk.gray(`   Failed plugins: ${result.failedPlugins.join(', ')}`));
      console.log(chalk.gray('   → You can install these manually later'));
    }

    console.log('');
    console.log(chalk.cyan('📋 Available capabilities:'));
    console.log(chalk.gray('   • /sw:increment - Plan new features'));
    console.log(chalk.gray('   • /sw:do - Execute tasks'));
    console.log(chalk.gray('   • /specweave-github:sync - GitHub integration'));
    console.log(chalk.gray('   • /specweave-jira:sync - JIRA integration'));
    console.log(chalk.gray('   • /sw:docs preview - Documentation preview'));
    console.log(chalk.gray('   • ...and more!'));

    return {
      success: result.successCount > 0,
      successCount: result.successCount,
      failCount: result.failCount,
      failedPlugins: result.failedPlugins
    };

  } catch (error: unknown) {
    // Installation failed - provide helpful diagnostics
    spinner.warn('Could not auto-install plugins');
    console.log('');

    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('not found') || errorMessage.includes('ENOENT')) {
      console.log(chalk.yellow('   Reason: Claude CLI found but command failed'));
      console.log(chalk.gray('   → Try manually: /plugin install specweave'));
    } else if (errorMessage.includes('EACCES') || errorMessage.includes('permission')) {
      console.log(chalk.yellow('   Reason: Permission denied'));
      console.log(chalk.gray('   → Check file permissions or run with appropriate access'));
    } else if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('network')) {
      console.log(chalk.yellow('   Reason: Network error'));
      console.log(chalk.gray('   → Check internet connection and try again'));
    } else if (process.env.DEBUG) {
      console.log(chalk.gray(`   Error: ${errorMessage}`));
    }

    console.log('');
    console.log(chalk.cyan('📦 Manual installation:'));
    console.log(chalk.white('   /plugin install specweave'));
    console.log(chalk.white('   /plugin install specweave-github'));
    console.log(chalk.white('   ...etc.'));
    console.log('');

    return { success: false, successCount: 0, failCount: 0, failedPlugins: [] };
  }
}

/**
 * Refresh the SpecWeave marketplace
 *
 * CRITICAL FIX (v0.34.6): Never remove existing marketplace!
 * Previous behavior:
 *   1. Remove marketplace → all plugins deregistered
 *   2. Re-add marketplace → plugins need reinstall
 *   3. Network failure after removal → broken state!
 *
 * New behavior:
 *   1. Check if marketplace exists → skip if yes
 *   2. Only add if missing → idempotent, safe
 *
 * This prevents the bug where users lose all plugins after
 * running `specweave init .` multiple times.
 */
async function refreshMarketplace(spinner: ReturnType<typeof ora>): Promise<void> {
  spinner.start('Checking SpecWeave marketplace...');

  const listResult = execFileNoThrowSync('claude', ['plugin', 'marketplace', 'list']);

  const marketplaceExists = listResult.success &&
    (listResult.stdout || '').toLowerCase().includes('specweave');

  if (marketplaceExists) {
    // CRITICAL: Do NOT remove the marketplace!
    // This was causing users to lose all plugins on every init
    console.log(chalk.green('   ✓ SpecWeave marketplace already registered'));
    spinner.succeed('SpecWeave marketplace ready');
    return;
  }

  // Only add marketplace if it doesn't exist
  spinner.text = 'Adding SpecWeave marketplace...';
  const addResult = execFileNoThrowSync('claude', [
    'plugin',
    'marketplace',
    'add',
    'anton-abyzov/specweave'
  ]);

  if (!addResult.success) {
    throw new Error('Failed to add marketplace from GitHub');
  }

  console.log(chalk.green('   ✔ Marketplace registered from GitHub'));
  spinner.succeed('SpecWeave marketplace ready');
}

/**
 * Work around Claude CLI bug where marketplace name = plugin name causes EINVAL.
 *
 * When the marketplace name matches a plugin name ("specweave"), Claude CLI:
 * 1. Creates cache/specweave/ with full marketplace content
 * 2. Tries to rename cache/specweave → cache/specweave/specweave/0.25.0
 * 3. Fails with EINVAL (can't move directory into itself)
 *
 * WORKAROUND: Manually install the "specweave" plugin by copying from marketplace.
 * Returns true if manual install succeeded, false if should use claude plugin install.
 */
function manuallyInstallSpecweavePlugin(version: string): boolean {
  const marketplacePath = path.join(
    os.homedir(),
    '.claude/plugins/marketplaces/specweave/plugins/specweave'
  );
  const targetPath = path.join(
    os.homedir(),
    '.claude/plugins/cache/specweave/specweave',
    version
  );

  // Check if marketplace plugin exists
  if (!fs.existsSync(marketplacePath)) {
    return false;
  }

  // Check if already installed
  if (fs.existsSync(targetPath)) {
    return true;
  }

  try {
    // Create target directory structure
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });

    // Copy plugin files from marketplace to cache
    copyDirRecursive(marketplacePath, targetPath);

    return true;
  } catch {
    return false;
  }
}

/**
 * Recursively copy directory contents
 */
function copyDirRecursive(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Get the version of a plugin from marketplace.json
 */
function getPluginVersion(pluginName: string): string {
  try {
    const marketplacePath = path.join(
      os.homedir(),
      '.claude/plugins/marketplaces/specweave/.claude-plugin/marketplace.json'
    );
    const marketplace = JSON.parse(fs.readFileSync(marketplacePath, 'utf-8'));
    const plugin = marketplace.plugins?.find((p: { name: string }) => p.name === pluginName);
    return plugin?.version || '0.25.0';
  } catch {
    return '0.25.0';
  }
}

/**
 * Install plugins with retry logic
 */
async function installPluginsWithRetry(
  plugins: Array<{ name: string }>,
  spinner: ReturnType<typeof ora>
): Promise<{ successCount: number; failCount: number; failedPlugins: string[] }> {
  let successCount = 0;
  let failCount = 0;
  const failedPlugins: string[] = [];

  // Sort plugins to install "specweave" FIRST
  // This prevents cache corruption from other plugin installs
  const sortedPlugins = [...plugins].sort((a, b) => {
    if (a.name === 'specweave') return -1;
    if (b.name === 'specweave') return 1;
    return 0;
  });

  for (const plugin of sortedPlugins) {
    const pluginName = plugin.name;
    spinner.start(`Installing ${pluginName}...`);

    let installed = false;

    // Special handling for "specweave" plugin due to Claude CLI bug
    // (marketplace name = plugin name causes EINVAL on rename)
    if (pluginName === 'specweave') {
      const version = getPluginVersion('specweave');
      installed = manuallyInstallSpecweavePlugin(version);

      if (installed) {
        successCount++;
        spinner.succeed(`${pluginName} installed (manual workaround)`);
        continue;
      }
      // Fall through to try claude plugin install if manual failed
    }

    // Retry up to 3 times with exponential backoff
    for (let attempt = 1; attempt <= 3; attempt++) {
      const installResult = execFileNoThrowSync('claude', ['plugin', 'install', pluginName]);

      if (installResult.success) {
        installed = true;
        break;
      }

      // If "not found" error and not last attempt, wait and retry
      if (installResult.stderr?.includes('not found') && attempt < 3) {
        spinner.text = `Installing ${pluginName}... (retry ${attempt}/3)`;
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        continue;
      }

      break;
    }

    if (installed) {
      successCount++;
      spinner.succeed(`${pluginName} installed`);
    } else {
      failCount++;
      failedPlugins.push(pluginName);
      spinner.warn(`${pluginName} failed (will continue)`);
    }
  }

  return { successCount, failCount, failedPlugins };
}
