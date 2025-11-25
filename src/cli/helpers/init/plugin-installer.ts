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

    // Check if cache is fresh (< 5 min old) and valid
    let needsRefresh = true;

    if (!forceRefresh && fs.existsSync(marketplaceCachePath)) {
      const cacheStats = fs.statSync(marketplaceCachePath);
      const cacheAge = Date.now() - cacheStats.mtimeMs;
      const fiveMinutes = 5 * 60 * 1000;

      if (cacheAge < fiveMinutes) {
        try {
          const cacheData = JSON.parse(fs.readFileSync(marketplaceCachePath, 'utf-8'));
          const hasValidPlugins = cacheData.plugins &&
            cacheData.plugins.length >= 25 &&
            cacheData.plugins.every((p: { name?: string; version?: string; description?: string }) =>
              p.name && p.version && p.description);

          if (hasValidPlugins) {
            needsRefresh = false;
            console.log(chalk.green('   ⚡ Using cached marketplace (fresh)'));
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
    console.log(chalk.gray('   • /specweave:increment - Plan new features'));
    console.log(chalk.gray('   • /specweave:do - Execute tasks'));
    console.log(chalk.gray('   • /specweave-github:sync - GitHub integration'));
    console.log(chalk.gray('   • /specweave-jira:sync - JIRA integration'));
    console.log(chalk.gray('   • /specweave:docs preview - Documentation preview'));
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
 */
async function refreshMarketplace(spinner: ReturnType<typeof ora>): Promise<void> {
  spinner.start('Refreshing SpecWeave marketplace...');

  const listResult = execFileNoThrowSync('claude', ['plugin', 'marketplace', 'list']);

  const marketplaceExists = listResult.success &&
    (listResult.stdout || '').toLowerCase().includes('specweave');

  if (marketplaceExists) {
    execFileNoThrowSync('claude', ['plugin', 'marketplace', 'remove', 'specweave']);
    console.log(chalk.blue('   🔄 Removed existing marketplace for update'));
  }

  // Add marketplace from GitHub
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
 * Install plugins with retry logic
 */
async function installPluginsWithRetry(
  plugins: Array<{ name: string }>,
  spinner: ReturnType<typeof ora>
): Promise<{ successCount: number; failCount: number; failedPlugins: string[] }> {
  let successCount = 0;
  let failCount = 0;
  const failedPlugins: string[] = [];

  for (const plugin of plugins) {
    const pluginName = plugin.name;
    spinner.start(`Installing ${pluginName}...`);

    // Retry up to 3 times with exponential backoff
    let installed = false;
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
