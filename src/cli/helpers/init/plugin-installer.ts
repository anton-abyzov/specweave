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
import { cleanupStalePlugins } from '../../../utils/cleanup-stale-plugins.js';

/**
 * SpecWeave marketplace GitHub repository
 * Used for both CLI-based and fallback registration
 */
const SPECWEAVE_MARKETPLACE_REPO = 'anton-abyzov/specweave';
const SPECWEAVE_MARKETPLACE_URL = `https://github.com/${SPECWEAVE_MARKETPLACE_REPO}`;

/**
 * Options for plugin installation
 */
export interface PluginInstallOptions {
  dirname: string;
  forceRefresh?: boolean;
  /** Lazy mode (default true) - install only core plugin, load others on-demand */
  lazyMode?: boolean;
}

/**
 * Result of plugin installation
 */
export interface PluginInstallResult {
  success: boolean;
  successCount: number;
  failCount: number;
  failedPlugins: string[];
  /** True if only marketplace was registered (plugins need manual install) */
  marketplaceOnly?: boolean;
}

/**
 * Install SpecWeave plugins via Claude CLI
 *
 * By default (lazyMode=true), only the core plugin (sw) is installed.
 * Other plugins are loaded on-demand based on keywords detected by
 * the detect-intent command in the user-prompt-submit hook.
 *
 * With lazyMode=false, all plugins are installed (legacy behavior).
 *
 * @param options - Installation options
 * @returns Installation result
 */
export async function installAllPlugins(options: PluginInstallOptions): Promise<PluginInstallResult> {
  const { dirname, forceRefresh, lazyMode = true } = options;
  const spinner = ora();

  // Pre-flight check: Is Claude CLI available?
  const claudeStatus = detectClaudeCli();

  if (!claudeStatus.available) {
    // Claude CLI NOT working - but we can still register the marketplace!
    // CRITICAL FIX (v1.0.64): Register marketplace via direct file write even without CLI
    // This ensures the marketplace appears in Claude Code's /plugin UI
    spinner.start('Registering SpecWeave marketplace...');
    const fallbackResult = await registerMarketplaceFallback();

    if (fallbackResult.success) {
      spinner.succeed('SpecWeave marketplace registered');
      console.log(chalk.green('   ✓ Marketplace ready for Claude Code'));
      console.log('');
      console.log(chalk.cyan('📦 Next: Install plugins inside Claude Code:'));
      console.log(chalk.white('   /plugin install sw'));
      console.log(chalk.gray('   (Or use Marketplaces tab → specweave)'));
      console.log('');

      // Return partial success - marketplace registered but plugins not installed
      return { success: true, successCount: 0, failCount: 0, failedPlugins: [], marketplaceOnly: true };
    }

    // Fallback also failed - show original diagnostics
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
      console.log(chalk.gray('   → The marketplace is already registered!'));
      console.log(chalk.gray('   → Go to /plugin → Marketplaces tab → specweave'));
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
    // CRITICAL FIX (v0.35.2): Simplified marketplace registration
    // Just ensure marketplace is registered - Claude CLI handles caching internally
    // No need for manual cache management - that was over-engineering!
    await refreshMarketplace(spinner);

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

    // CRITICAL FIX (v0.35.2): Clean up stale plugin references
    // Remove plugins from ~/.claude/settings.json that no longer exist in marketplace
    // This prevents "Plugin not found" errors for removed/renamed plugins
    spinner.start('Checking for stale plugin references...');
    const cleanupResult = await cleanupStalePlugins(marketplaceJsonPath, false);

    if (cleanupResult.removedCount > 0) {
      console.log(chalk.yellow(`   🧹 Removed ${cleanupResult.removedCount} stale plugin reference(s)`));
      cleanupResult.removedPlugins.forEach(p => {
        console.log(chalk.gray(`      - ${p}`));
      });
      spinner.succeed('Cleaned up stale plugins');
    } else {
      spinner.succeed('No stale plugins found');
    }

    // LAZY LOADING MODE (default)
    // Install only router skill, cache the rest for on-demand loading
    if (lazyMode) {
      return await installLazyMode(allPlugins, spinner, dirname);
    }

    // FULL MODE (--full flag)
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
    console.log(chalk.white('   /plugin install sw@specweave'));
    console.log(chalk.white('   /plugin install sw-github@specweave'));
    console.log(chalk.white('   ...etc.'));
    console.log('');

    return { success: false, successCount: 0, failCount: 0, failedPlugins: [] };
  }
}

/**
 * Ensure SpecWeave marketplace is registered and updated
 *
 * Uses the proper Claude CLI commands:
 * 1. First checks if marketplace exists
 * 2. If not → adds it with `marketplace add` (HTTPS URL)
 * 3. If yes → tries `marketplace update`
 * 4. If update fails with SSH error → removes and re-adds with HTTPS
 *
 * This is the recommended approach per Claude Code documentation.
 *
 * CRITICAL FIX (v0.35.2): Simplified marketplace registration
 * Just ensure marketplace is registered - Claude CLI handles caching internally.
 * No need for manual cache management - that was over-engineering!
 *
 * CRITICAL FIX (v1.0.24): Handle Windows SSH authentication failures!
 * Previously registered marketplaces may use SSH URLs that fail on Windows.
 * When update fails with "SSH authentication failed", we remove the old
 * registration and re-add with HTTPS URL which works for everyone.
 */
async function refreshMarketplace(spinner: ReturnType<typeof ora>): Promise<void> {
  spinner.start('Checking SpecWeave marketplace...');

  // Check if marketplace is already registered
  const listResult = execFileNoThrowSync('claude', ['plugin', 'marketplace', 'list']);
  const marketplaceExists = listResult.success &&
    (listResult.stdout || '').toLowerCase().includes('specweave');

  if (marketplaceExists) {
    // Marketplace exists - try UPDATE command first
    spinner.text = 'Updating SpecWeave marketplace...';
    const updateResult = execFileNoThrowSync('claude', [
      'plugin',
      'marketplace',
      'update',
      'specweave'
    ]);

    if (!updateResult.success) {
      // Convert error to string for pattern matching
      const errorStr = updateResult.error instanceof Error
        ? updateResult.error.message
        : String(updateResult.error || '');
      const errorMsg = (updateResult.stderr || errorStr).toLowerCase();

      // CRITICAL FIX (v1.0.24): Handle SSH authentication failures on Windows
      // If the marketplace was previously registered with SSH URL (or owner/repo format
      // which Claude CLI converts to SSH), the update will fail with SSH auth error.
      // Solution: Remove the marketplace and re-add with HTTPS URL.
      if (errorMsg.includes('ssh') ||
          errorMsg.includes('permission denied') ||
          errorMsg.includes('publickey') ||
          errorMsg.includes('authentication failed')) {

        spinner.text = 'Re-registering marketplace with HTTPS...';
        console.log(chalk.yellow('\n   ⚠️  SSH authentication failed - switching to HTTPS'));

        // Remove the old SSH-based registration
        const removeResult = execFileNoThrowSync('claude', [
          'plugin',
          'marketplace',
          'remove',
          'specweave'
        ]);

        if (!removeResult.success) {
          // If remove fails, try to add anyway (might work if it's just stale)
          console.log(chalk.gray('   → Could not remove old registration, attempting fresh add...'));
        }

        // Re-add with HTTPS URL
        const addResult = execFileNoThrowSync('claude', [
          'plugin',
          'marketplace',
          'add',
          SPECWEAVE_MARKETPLACE_URL
        ]);

        if (!addResult.success) {
          throw new Error(`Failed to re-add marketplace with HTTPS: ${addResult.stderr || addResult.error}`);
        }

        console.log(chalk.green('   ✔ Marketplace re-registered with HTTPS (works on all platforms)'));

        // Enable auto-update for seamless future updates
        enableMarketplaceAutoUpdate(spinner);

        spinner.succeed('SpecWeave marketplace ready');
        return;
      }

      // Other error - throw as before (use original stderr for clear message)
      throw new Error(`Failed to update marketplace: ${updateResult.stderr || errorStr}`);
    }

    console.log(chalk.green('   ✔ Marketplace updated (latest from GitHub)'));

    // Enable auto-update for seamless future updates
    enableMarketplaceAutoUpdate(spinner);

    spinner.succeed('SpecWeave marketplace ready');
  } else {
    // Marketplace not registered - use ADD command with HTTPS URL
    // CRITICAL (v0.35.3): Use full HTTPS URL, NOT owner/repo format!
    // Claude CLI converts owner/repo to SSH URL (git@github.com:owner/repo.git)
    // which fails for users without SSH keys configured.
    // Using full HTTPS URL works for ALL users (public repo).
    spinner.text = 'Adding SpecWeave marketplace...';
    const addResult = execFileNoThrowSync('claude', [
      'plugin',
      'marketplace',
      'add',
      SPECWEAVE_MARKETPLACE_URL
    ]);

    if (!addResult.success) {
      throw new Error(`Failed to add marketplace: ${addResult.stderr || addResult.error}`);
    }

    console.log(chalk.green('   ✔ Marketplace added from GitHub'));

    // Enable auto-update for seamless future updates
    enableMarketplaceAutoUpdate(spinner);

    spinner.succeed('SpecWeave marketplace ready');
  }
}

/**
 * Enable auto-update for the SpecWeave marketplace
 *
 * Modifies ~/.claude/plugins/known_marketplaces.json to set autoUpdate: true
 * for the specweave marketplace. This ensures plugins stay up-to-date automatically
 * when Claude Code starts.
 *
 * FEATURE: Added in Claude Code v2.0.70 - per-marketplace auto-update control
 * By default, third-party marketplaces have auto-update disabled.
 * We enable it during init for better UX.
 */
function enableMarketplaceAutoUpdate(spinner: ReturnType<typeof ora>): void {
  const knownMarketplacesPath = path.join(
    os.homedir(),
    '.claude/plugins/known_marketplaces.json'
  );

  try {
    // Check if file exists
    if (!fs.existsSync(knownMarketplacesPath)) {
      // File doesn't exist yet - Claude CLI will create it
      // Auto-update will be set on next init
      return;
    }

    // Read current config
    const content = fs.readFileSync(knownMarketplacesPath, 'utf-8');
    const config = JSON.parse(content);

    // Check if specweave marketplace exists and needs auto-update enabled
    if (config.specweave && config.specweave.autoUpdate !== true) {
      config.specweave.autoUpdate = true;

      // Write updated config
      fs.writeFileSync(knownMarketplacesPath, JSON.stringify(config, null, 2));
      console.log(chalk.green('   ✔ Auto-update enabled for SpecWeave marketplace'));
    } else if (config.specweave?.autoUpdate === true) {
      // Already enabled, no action needed
      // Don't log anything to avoid noise
    }
  } catch (error) {
    // Non-critical - don't fail init if this doesn't work
    // User can enable manually via /plugin menu
    if (process.env.DEBUG) {
      console.log(chalk.gray(`   → Could not enable auto-update: ${error instanceof Error ? error.message : String(error)}`));
    }
  }
}

/**
 * Register SpecWeave marketplace by directly writing to known_marketplaces.json
 *
 * CRITICAL FIX (v1.0.64): This is the fallback when Claude CLI is not available.
 * It directly writes to ~/.claude/plugins/known_marketplaces.json which is the
 * file Claude Code reads to populate the Marketplaces tab in /plugin UI.
 *
 * This approach:
 * 1. Works even without Claude CLI installed
 * 2. Works when running from npm's specweave package (not just Claude Code)
 * 3. Ensures the marketplace appears in Claude Code's UI immediately
 *
 * Note: The marketplace content (plugins) will be downloaded by Claude Code
 * when the user first accesses it from the UI.
 */
async function registerMarketplaceFallback(): Promise<{ success: boolean; error?: string }> {
  const claudeDir = path.join(os.homedir(), '.claude');
  const pluginsDir = path.join(claudeDir, 'plugins');
  const knownMarketplacesPath = path.join(pluginsDir, 'known_marketplaces.json');

  try {
    // Ensure ~/.claude/plugins directory exists
    if (!fs.existsSync(pluginsDir)) {
      fs.mkdirSync(pluginsDir, { recursive: true });
    }

    // Read existing known_marketplaces.json or create empty object
    let config: Record<string, unknown> = {};
    if (fs.existsSync(knownMarketplacesPath)) {
      try {
        const content = fs.readFileSync(knownMarketplacesPath, 'utf-8');
        config = JSON.parse(content);
      } catch {
        // File exists but invalid JSON - start fresh
        config = {};
      }
    }

    // Check if specweave is already registered
    if (config.specweave) {
      // Already registered - just ensure auto-update is enabled
      if (typeof config.specweave === 'object' && config.specweave !== null) {
        (config.specweave as Record<string, unknown>).autoUpdate = true;
      }
    } else {
      // Register specweave marketplace
      // This matches the format Claude Code expects
      config.specweave = {
        source: {
          source: 'github',
          repo: SPECWEAVE_MARKETPLACE_REPO
        },
        installLocation: path.join(pluginsDir, 'marketplaces', 'specweave'),
        lastUpdated: new Date().toISOString(),
        autoUpdate: true
      };
    }

    // Write updated config
    fs.writeFileSync(knownMarketplacesPath, JSON.stringify(config, null, 2));

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
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
 * Install in lazy mode - core plugin only, load others on-demand
 *
 * This function:
 * 1. Populates the skills cache from marketplace
 * 2. Installs ONLY the core plugin (sw) providing /sw:increment, /sw:do, etc.
 * 3. Other plugins are loaded on-demand via detect-intent (user-prompt-submit hook)
 *
 * NOTE: sw-router is OBSOLETE as of v1.0.160. The detect-intent command
 * in user-prompt-submit.sh now handles plugin detection via LLM.
 */
async function installLazyMode(
  allPlugins: Array<{ name: string }>,
  spinner: ReturnType<typeof ora>,
  dirname: string
): Promise<PluginInstallResult> {
  // Import cache manager dynamically to avoid circular deps
  const { PluginCacheManager } = await import('../../../core/lazy-loading/cache-manager.js');
  const cacheManager = new PluginCacheManager();

  // Step 1: Populate skills cache from marketplace
  spinner.start('Populating skills cache...');
  const cacheResult = await cacheManager.populateCache();

  if (!cacheResult.success) {
    spinner.warn(`Cache population failed: ${cacheResult.error}`);
    // Fall back to installing router only via CLI
  } else {
    spinner.succeed(`Cached ${cacheResult.pluginsAffected} plugins`);
  }

  // Step 2: Install core plugin (sw) from specweave marketplace
  // Core (sw) provides /sw:increment, /sw:do, /sw:done, etc.
  // NOTE: sw-router is OBSOLETE - detect-intent now handles plugin detection
  const corePlugin = allPlugins.find(p => p.name === 'sw');

  let installedCount = 0;

  // Install core plugin first (provides fundamental commands)
  if (corePlugin) {
    spinner.start('Installing core plugin (sw)...');

    // Use marketplace name 'sw' (not directory name 'specweave')
    const coreInstallResult = await cacheManager.installPlugins({
      plugins: ['sw'],
      force: false,
    });

    if (coreInstallResult.success && coreInstallResult.pluginsAffected > 0) {
      spinner.succeed('sw@specweave installed');
      installedCount++;
    } else {
      // Fall back to CLI-based install
      const cliResult = await installPluginsWithRetry([corePlugin], spinner);

      if (cliResult.successCount > 0) {
        installedCount++;
      } else {
        spinner.warn('Could not install core plugin');
        console.log(chalk.yellow('   → Install manually: /plugin install sw@specweave'));
      }
    }
  } else {
    spinner.warn('Core plugin (sw) not found in marketplace');
  }

  // Step 2b: Install essential plugins from claude-plugins-official marketplace
  // These provide important capabilities that complement SpecWeave
  const officialPlugins = ['context7', 'playwright'];

  spinner.start('Installing essential official plugins...');

  for (const pluginName of officialPlugins) {
    const installResult = execFileNoThrowSync('claude', [
      'plugin',
      'install',
      `${pluginName}@claude-plugins-official`,
    ]);

    if (installResult.success) {
      console.log(chalk.green(`   ✓ ${pluginName}@claude-plugins-official installed`));
      installedCount++;
    } else {
      // Check if already installed
      if (installResult.stderr?.includes('already') || installResult.stdout?.includes('already')) {
        console.log(chalk.gray(`   ✓ ${pluginName}@claude-plugins-official (already installed)`));
        installedCount++;
      } else {
        console.log(chalk.yellow(`   ⚠ ${pluginName}@claude-plugins-official failed`));
        console.log(chalk.gray(`     → Install manually: claude plugin install ${pluginName}@claude-plugins-official`));
      }
    }
  }

  spinner.succeed('Essential plugins installed');

  // Step 3: Show lazy loading explanation
  console.log('');
  console.log(chalk.green.bold('✅ Lazy Loading Enabled'));
  console.log('');
  console.log(chalk.cyan('Installed plugins:'));
  console.log(chalk.gray('   • sw@specweave              - Core SpecWeave framework'));
  console.log(chalk.gray('   • context7@claude-plugins-official - Documentation context'));
  console.log(chalk.gray('   • playwright@claude-plugins-official - Browser automation'));
  console.log('');
  console.log(chalk.cyan('How lazy loading works:'));
  console.log(chalk.gray('   • Core plugins loaded initially'));
  console.log(chalk.gray('   • Domain plugins detected & loaded on-demand via LLM'));
  console.log(chalk.gray('   • Claude Code hot-reloads skills within seconds'));
  console.log('');
  console.log(chalk.cyan('Trigger keywords for on-demand plugins:'));
  console.log(chalk.gray('   • "GitHub sync" → loads sw-github'));
  console.log(chalk.gray('   • "JIRA" → loads sw-jira'));
  console.log(chalk.gray('   • "Kubernetes" → loads sw-k8s'));
  console.log(chalk.gray('   • "React", "frontend" → loads sw-frontend'));
  console.log(chalk.gray('   • ...and more'));
  console.log('');

  // Total expected: 1 (sw) + 2 (official) = 3
  const expectedPlugins = 1 + officialPlugins.length;

  return {
    success: installedCount > 0,
    successCount: installedCount,
    failCount: expectedPlugins - installedCount,
    failedPlugins: [],
    marketplaceOnly: false,
  };
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
