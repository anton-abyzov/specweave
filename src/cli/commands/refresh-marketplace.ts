#!/usr/bin/env node
/**
 * Refresh SpecWeave Marketplace
 *
 * Automates the complete marketplace refresh process with LAZY LOADING support:
 * 1. Updates or adds marketplace (GitHub or local)
 * 2. Installs router plugin only (default) OR all plugins (--all)
 * 3. Populates lazy loading cache for on-demand plugin loading
 * 4. Merges skill memories (preserves user learnings)
 * 5. Updates instruction files (CLAUDE.md, AGENTS.md)
 *
 * LAZY LOADING (default - v1.0.122+):
 *   - Installs only `specweave-router` plugin (~500 tokens)
 *   - Other plugins load on-demand directly from marketplace
 *   - No intermediate cache needed (marketplace IS the cache!)
 *   - Result: ~5K tokens at startup instead of ~60K (90% savings!)
 *
 * MINIMAL MODE (--minimal):
 *   - Removes specweave marketplace entirely
 *   - Installs only core plugins (sw, sw-router)
 *   - Clean /plugin output (only shows installed plugins)
 *   - Tradeoff: Lazy loading disabled (use --all to reinstall all)
 *
 * Usage:
 *   specweave refresh-marketplace           # Lazy mode (default) - router only
 *   specweave refresh-marketplace --all     # Legacy mode - install all plugins
 *   specweave refresh-marketplace --minimal # Minimal mode - clean /plugin output
 *   specweave refresh-marketplace --local   # Use local dev version
 *   specweave refresh-marketplace --github  # Use GitHub version (default)
 *
 * @since 1.0.60
 * @updated 1.0.122 - Added lazy loading support
 * @updated 1.0.138 - Added minimal mode for clean /plugin output
 */

import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import os from 'os';
import { CacheHealthMonitor } from '../../core/plugin-cache/cache-health-monitor.js';
import { CacheInvalidator } from '../../core/plugin-cache/cache-invalidator.js';
import { CacheMetadataManager } from '../../core/plugin-cache/cache-metadata.js';
import { PluginCacheManager } from '../../core/lazy-loading/cache-manager.js';
import { consoleLogger as logger } from '../../utils/logger.js';
import { execFileNoThrowSync, ExecResult } from '../../utils/execFileNoThrow.js';

// Configuration
const MARKETPLACE_NAME = 'specweave';
const GITHUB_REPO = 'anton-abyzov/specweave';

interface RefreshOptions {
  local?: boolean;
  github?: boolean;
  verbose?: boolean;
  force?: boolean;
  /** Install ALL plugins (legacy mode). Default: false (lazy loading - router only) */
  all?: boolean;
  /** Minimal mode: Remove marketplace entirely, install only core plugins directly.
   * Results in clean /plugin output but disables lazy loading. */
  minimal?: boolean;
}

interface PluginResult {
  name: string;
  success: boolean;
  error?: string;
}

/**
 * Safely execute a CLI command using execFileNoThrow (no shell injection risk)
 *
 * @param command - The command executable (e.g., 'claude', 'git', 'npx')
 * @param args - Array of arguments (safely escaped automatically)
 * @param _silent - Unused, kept for API compatibility
 * @returns Result with success status and output
 */
function runCommand(command: string, args: string[], _silent = false): { success: boolean; output: string } {
  const result: ExecResult = execFileNoThrowSync(command, args);
  const output = (result.stdout + result.stderr).trim();
  return { success: result.success, output };
}

/**
 * Run git command safely
 */
function runGitCommand(args: string[]): { success: boolean; output: string } {
  return runCommand('git', args);
}

function checkMarketplaceExists(): boolean {
  const result = runCommand('claude', ['plugin', 'marketplace', 'list'], true);
  return result.success && result.output.includes(MARKETPLACE_NAME);
}

function getMarketplaceInstallPath(): string | null {
  const knownMarketplacesPath = path.join(os.homedir(), '.claude/plugins/known_marketplaces.json');

  if (!fs.existsSync(knownMarketplacesPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(knownMarketplacesPath, 'utf8');
    const data = JSON.parse(content);
    return data[MARKETPLACE_NAME]?.installLocation || null;
  } catch {
    return null;
  }
}

function getPluginsFromMarketplace(marketplacePath: string): string[] {
  const marketplaceJsonPath = path.join(marketplacePath, '.claude-plugin/marketplace.json');

  if (!fs.existsSync(marketplaceJsonPath)) {
    throw new Error(`Marketplace JSON not found at ${marketplaceJsonPath}`);
  }

  try {
    const content = fs.readFileSync(marketplaceJsonPath, 'utf8');
    const data = JSON.parse(content);
    return data.plugins?.map((p: { name: string }) => p.name) || [];
  } catch (error) {
    throw new Error(`Failed to parse marketplace.json: ${error}`);
  }
}

/**
 * Get all installed SpecWeave plugins from the registry
 * Reads ~/.claude/plugins/installed_plugins.json and filters to specweave marketplace
 */
function getInstalledSpecweavePlugins(): string[] {
  const installedPluginsPath = path.join(os.homedir(), '.claude/plugins/installed_plugins.json');

  if (!fs.existsSync(installedPluginsPath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(installedPluginsPath, 'utf8');
    const data = JSON.parse(content);

    // Filter to only specweave marketplace plugins (format: "plugin-name@specweave")
    const specweavePlugins: string[] = [];
    for (const key of Object.keys(data.plugins || {})) {
      if (key.endsWith('@specweave')) {
        // Extract plugin name from "plugin-name@specweave"
        const pluginName = key.replace('@specweave', '');
        specweavePlugins.push(pluginName);
      }
    }

    return specweavePlugins;
  } catch {
    return [];
  }
}

/**
 * Uninstall a plugin via Claude CLI
 */
function uninstallPlugin(pluginName: string): { success: boolean; output: string } {
  // Security: Validate plugin name
  if (!isValidPluginName(pluginName)) {
    return { success: false, output: 'Invalid plugin name format' };
  }

  return runCommand('claude', ['plugin', 'uninstall', pluginName], true);
}

/**
 * Disable a plugin via Claude CLI (keeps it in marketplace but hides from /plugin)
 */
function disablePlugin(pluginName: string): { success: boolean; output: string } {
  // Security: Validate plugin name
  if (!isValidPluginName(pluginName)) {
    return { success: false, output: 'Invalid plugin name format' };
  }

  return runCommand('claude', ['plugin', 'disable', pluginName], true);
}

/**
 * Remove a marketplace entirely
 */
function removeMarketplace(name: string): { success: boolean; output: string } {
  return runCommand('claude', ['plugin', 'marketplace', 'remove', name], true);
}

/**
 * Install a plugin directly from GitHub URL (not from marketplace)
 */
function installPluginFromGitHub(repo: string, pluginPath: string): { success: boolean; output: string } {
  const url = `https://github.com/${repo}/tree/main/${pluginPath}`;
  return runCommand('claude', ['plugin', 'install', url], true);
}

/**
 * Get version from plugin manifest
 */
function getPluginVersion(cachePath: string): string {
  const manifestPath = path.join(cachePath, '.claude-plugin/manifest.json');
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      return manifest.version || '1.0.0';
    } catch {
      return '1.0.0';
    }
  }
  return '1.0.0';
}

/**
 * Generate cache metadata for a plugin after installation
 */
function generatePluginCacheMetadata(pluginName: string): void {
  const basePath = path.join(os.homedir(), '.claude/plugins/cache/specweave', pluginName);

  if (!fs.existsSync(basePath)) {
    logger.debug(`Cache path not found for ${pluginName}: ${basePath}`);
    return;
  }

  // Find latest version directory
  const versions = fs.readdirSync(basePath).filter(v => {
    const versionPath = path.join(basePath, v);
    return fs.statSync(versionPath).isDirectory();
  });

  if (versions.length === 0) {
    logger.debug(`No version directories found for ${pluginName}`);
    return;
  }

  const version = versions.sort().reverse()[0];
  const versionPath = path.join(basePath, version);

  // Generate metadata
  const metadataManager = new CacheMetadataManager();

  // Try to get commit SHA from marketplace or use timestamp
  const commitSha = getLatestCommitSha() || `installed-${Date.now()}`;

  const metadata = metadataManager.generateMetadata(
    versionPath,
    pluginName,
    version,
    commitSha
  );

  metadataManager.writeMetadata(versionPath, metadata);
  logger.debug(`Generated cache metadata for ${pluginName}@${version}`);
}

/**
 * Get latest commit SHA from Git (if in repo) or marketplace
 */
function getLatestCommitSha(): string | null {
  // Try to get from git (safe - uses array args)
  const result = runGitCommand(['rev-parse', 'HEAD']);
  if (result.success && result.output.length === 40) {
    return result.output;
  }

  // Fallback: check marketplace install location for git info
  const marketplacePath = getMarketplaceInstallPath();
  if (marketplacePath) {
    const gitHeadPath = path.join(marketplacePath, '.git/HEAD');
    if (fs.existsSync(gitHeadPath)) {
      try {
        const headContent = fs.readFileSync(gitHeadPath, 'utf8').trim();
        // If it's a ref, resolve it
        if (headContent.startsWith('ref:')) {
          const refPath = path.join(marketplacePath, '.git', headContent.replace('ref: ', ''));
          if (fs.existsSync(refPath)) {
            return fs.readFileSync(refPath, 'utf8').trim();
          }
        }
        return headContent;
      } catch {
        // Ignore
      }
    }
  }

  return null;
}

/**
 * Validate plugin name to prevent path traversal attacks
 * Plugin names should only contain alphanumeric chars, hyphens, and underscores
 */
function isValidPluginName(name: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

function installPlugin(pluginName: string, force: boolean = false): PluginResult {
  // Security: Validate plugin name to prevent injection/traversal
  if (!isValidPluginName(pluginName)) {
    return { name: pluginName, success: false, error: 'Invalid plugin name format' };
  }

  // If force mode, uninstall first to ensure fresh copy
  if (force) {
    runCommand('claude', ['plugin', 'uninstall', pluginName], true);
    // Also clear the cache directory to ensure completely fresh install
    const cachePath = path.join(os.homedir(), '.claude/plugins/cache/specweave', pluginName);
    if (fs.existsSync(cachePath)) {
      try {
        fs.rmSync(cachePath, { recursive: true, force: true });
      } catch (e) {
        // Ignore errors, installation will handle it
      }
    }
  }

  const result = runCommand('claude', ['plugin', 'install', pluginName], true);

  if (result.success && result.output.includes('Successfully installed')) {
    // Generate cache metadata after successful installation
    generatePluginCacheMetadata(pluginName);
    return { name: pluginName, success: true };
  }

  // Check if already installed (not an error) - but only if not forcing
  if (!force && result.output.includes('already installed')) {
    // Still generate metadata if missing (for plugins installed before this feature)
    generatePluginCacheMetadata(pluginName);
    return { name: pluginName, success: true };
  }

  return { name: pluginName, success: false, error: result.output };
}

/**
 * Fix executable permissions on hook scripts.
 * Claude Code plugin installation doesn't preserve executable bits,
 * so we need to chmod +x all .sh files in hooks directories.
 */
function fixHookPermissions(marketplacePath: string): { fixed: number; skipped: number; errors: string[] } {
  const errors: string[] = [];
  let fixed = 0;
  let skipped = 0;

  // Skip on Windows - chmod has no effect on NTFS
  if (process.platform === 'win32') {
    return { fixed: 0, skipped: 0, errors: [] };
  }

  const pluginsDir = path.join(marketplacePath, 'plugins');
  if (!fs.existsSync(pluginsDir)) {
    return { fixed, skipped, errors: ['Plugins directory not found'] };
  }

  // Find all plugin directories
  const pluginDirs = fs.readdirSync(pluginsDir).filter(name => {
    const pluginPath = path.join(pluginsDir, name);
    return fs.statSync(pluginPath).isDirectory();
  });

  /**
   * Check if file already has execute permission for owner
   */
  const isExecutable = (filePath: string): boolean => {
    try {
      const stats = fs.statSync(filePath);
      // Check owner execute bit (0o100)
      return (stats.mode & 0o100) !== 0;
    } catch {
      return false;
    }
  };

  /**
   * Fix permission on a single file if needed
   */
  const fixFilePermission = (filePath: string, displayName: string): void => {
    try {
      if (isExecutable(filePath)) {
        skipped++;
        return;
      }
      // Make executable (0o755 = rwxr-xr-x)
      fs.chmodSync(filePath, 0o755);
      fixed++;
    } catch (error) {
      errors.push(`${displayName}: ${error}`);
    }
  };

  for (const pluginName of pluginDirs) {
    const hooksDir = path.join(pluginsDir, pluginName, 'hooks');
    if (fs.existsSync(hooksDir)) {
      // Find all .sh files in hooks directory
      const hookFiles = fs.readdirSync(hooksDir).filter(f => f.endsWith('.sh'));
      for (const hookFile of hookFiles) {
        const hookPath = path.join(hooksDir, hookFile);
        fixFilePermission(hookPath, `${pluginName}/${hookFile}`);
      }
    }

    // Also check scripts directory
    const scriptsDir = path.join(pluginsDir, pluginName, 'scripts');
    if (fs.existsSync(scriptsDir)) {
      const scriptFiles = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.sh'));
      for (const scriptFile of scriptFiles) {
        const scriptPath = path.join(scriptsDir, scriptFile);
        fixFilePermission(scriptPath, `${pluginName}/scripts/${scriptFile}`);
      }
    }
  }

  return { fixed, skipped, errors };
}

/**
 * Fix executable permissions on hook scripts in lazy loading cache.
 * Similar to fixHookPermissions but for ~/.specweave/skills-cache/
 */
function fixHookPermissionsInCache(cachePath: string): { fixed: number; skipped: number; errors: string[] } {
  const errors: string[] = [];
  let fixed = 0;
  let skipped = 0;

  // Skip on Windows - chmod has no effect on NTFS
  if (process.platform === 'win32') {
    return { fixed: 0, skipped: 0, errors: [] };
  }

  if (!fs.existsSync(cachePath)) {
    return { fixed, skipped, errors: [] };
  }

  /**
   * Check if file already has execute permission for owner
   */
  const isExecutable = (filePath: string): boolean => {
    try {
      const stats = fs.statSync(filePath);
      return (stats.mode & 0o100) !== 0;
    } catch {
      return false;
    }
  };

  /**
   * Fix permission on a single file if needed
   */
  const fixFilePermission = (filePath: string): void => {
    try {
      if (isExecutable(filePath)) {
        skipped++;
        return;
      }
      fs.chmodSync(filePath, 0o755);
      fixed++;
    } catch (error) {
      errors.push(`${filePath}: ${error}`);
    }
  };

  // Walk through cached plugins
  const pluginDirs = fs.readdirSync(cachePath).filter(name => {
    const pluginPath = path.join(cachePath, name);
    return fs.statSync(pluginPath).isDirectory();
  });

  for (const pluginName of pluginDirs) {
    const pluginPath = path.join(cachePath, pluginName);

    // Check hooks directory
    const hooksDir = path.join(pluginPath, 'hooks');
    if (fs.existsSync(hooksDir)) {
      const hookFiles = fs.readdirSync(hooksDir).filter(f => f.endsWith('.sh'));
      for (const hookFile of hookFiles) {
        fixFilePermission(path.join(hooksDir, hookFile));
      }
    }

    // Check scripts directory
    const scriptsDir = path.join(pluginPath, 'scripts');
    if (fs.existsSync(scriptsDir)) {
      const scriptFiles = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.sh'));
      for (const scriptFile of scriptFiles) {
        fixFilePermission(path.join(scriptsDir, scriptFile));
      }
    }
  }

  return { fixed, skipped, errors };
}

/**
 * Check plugin cache health before refresh and auto-invalidate critical issues
 */
async function preRefreshCacheCheck(verbose: boolean = false): Promise<void> {
  const basePath = path.join(os.homedir(), '.claude', 'plugins', 'cache', 'specweave');

  if (!fs.existsSync(basePath)) {
    logger.debug('No plugin cache found - skipping pre-refresh check');
    return;
  }

  console.log(chalk.yellow('🔍 Checking cache health before refresh...'));

  const monitor = new CacheHealthMonitor();
  const invalidator = new CacheInvalidator();

  const pluginNames = fs.readdirSync(basePath).filter(name => {
    const pluginPath = path.join(basePath, name);
    return fs.statSync(pluginPath).isDirectory();
  });

  let criticalCount = 0;
  const criticalPlugins: string[] = [];

  for (const pluginName of pluginNames) {
    const pluginPath = path.join(basePath, pluginName);
    const versions = fs.readdirSync(pluginPath).filter(v => {
      const versionPath = path.join(pluginPath, v);
      return fs.statSync(versionPath).isDirectory();
    });

    if (versions.length === 0) continue;

    const version = versions.sort().reverse()[0];
    const versionPath = path.join(pluginPath, version);

    const issues = monitor.checkPluginHealth(versionPath, version);
    const hasCritical = issues.some(i => i.severity === 'critical');

    if (hasCritical) {
      criticalCount++;
      criticalPlugins.push(pluginName);

      if (verbose) {
        console.log(chalk.red(`  ❌ ${pluginName}: Critical issues detected`));
        for (const issue of issues.filter(i => i.severity === 'critical')) {
          console.log(chalk.gray(`     - ${issue.message}`));
        }
      }

      // Auto-invalidate critical issues
      try {
        await invalidator.invalidatePlugin(
          pluginName,
          version,
          {
            strategy: 'hard',
            preserveMemories: true,
            backupFirst: true
          }
        );

        if (verbose) {
          console.log(chalk.green(`  ✓ ${pluginName}: Cache invalidated (will be refreshed)`));
        }
      } catch (error) {
        logger.warn(`Failed to invalidate ${pluginName}: ${error}`);
      }
    }
  }

  if (criticalCount > 0) {
    console.log(chalk.yellow(`⚠️  Found ${criticalCount} plugin(s) with critical issues - auto-invalidated`));
    console.log(chalk.gray(`   Plugins: ${criticalPlugins.join(', ')}`));
  } else {
    console.log(chalk.green('✓ Cache health check passed'));
  }

  console.log('');
}

/**
 * Minimal mode: Remove marketplace entirely, install only core plugins directly.
 * This results in a clean /plugin output with only installed plugins visible.
 * Tradeoff: Disables lazy loading capability.
 */
async function runMinimalMode(options: RefreshOptions): Promise<void> {
  const forceMode = options.force ?? false;

  console.log(chalk.blue.bold('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.blue.bold(`  SpecWeave Minimal Mode`));
  console.log(chalk.blue.bold(`  Clean /plugin output | No lazy loading`));
  console.log(chalk.blue.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  console.log(chalk.yellow('⚠️  Minimal mode:'));
  console.log(chalk.gray('   • Removes specweave marketplace entirely'));
  console.log(chalk.gray('   • Installs only core plugins (sw, sw-router)'));
  console.log(chalk.gray('   • /plugin will show only installed plugins'));
  console.log(chalk.gray('   • Lazy loading will NOT work (use --all to reload)\n'));

  // Step 1: Uninstall all specweave plugins
  console.log(chalk.yellow('📦 Step 1: Uninstalling all SpecWeave plugins...'));

  const installedPlugins = getInstalledSpecweavePlugins();
  let uninstalledCount = 0;

  for (const plugin of installedPlugins) {
    const result = uninstallPlugin(plugin);
    if (result.success || result.output.includes('not installed')) {
      uninstalledCount++;
      if (options.verbose) {
        console.log(chalk.gray(`  ✓ Uninstalled ${plugin}`));
      }
    }
  }

  console.log(chalk.green(`✓ Uninstalled ${uninstalledCount} plugin(s)\n`));

  // Step 2: Remove the specweave marketplace
  console.log(chalk.yellow('🗑️  Step 2: Removing specweave marketplace...'));

  const marketplaceExists = checkMarketplaceExists();
  if (marketplaceExists) {
    const removeResult = removeMarketplace(MARKETPLACE_NAME);
    if (removeResult.success || removeResult.output.includes('removed') || removeResult.output.includes('not found')) {
      console.log(chalk.green('✓ Marketplace removed\n'));
    } else {
      console.log(chalk.yellow('⚠ Could not remove marketplace'));
      if (options.verbose) {
        console.log(chalk.gray(`  ${removeResult.output}`));
      }
      console.log('');
    }
  } else {
    console.log(chalk.blue('ℹ Marketplace not found - already removed\n'));
  }

  // Step 3: Clean up all caches
  console.log(chalk.yellow('🧹 Step 3: Cleaning up all caches...'));

  // Clean plugin cache
  const pluginCacheDir = path.join(os.homedir(), '.claude', 'plugins', 'cache', 'specweave');
  if (fs.existsSync(pluginCacheDir)) {
    try {
      fs.rmSync(pluginCacheDir, { recursive: true, force: true });
      console.log(chalk.gray('  ✓ Removed plugin cache'));
    } catch (e) {
      if (options.verbose) {
        console.log(chalk.yellow(`  ⚠ Could not remove plugin cache: ${e}`));
      }
    }
  }

  // Clean skills directory
  const skillsDir = path.join(os.homedir(), '.claude', 'skills');
  if (fs.existsSync(skillsDir)) {
    const skillDirs = fs.readdirSync(skillsDir).filter(name => {
      const dirPath = path.join(skillsDir, name);
      return fs.statSync(dirPath).isDirectory() && name.startsWith('specweave');
    });

    for (const dir of skillDirs) {
      try {
        fs.rmSync(path.join(skillsDir, dir), { recursive: true, force: true });
        if (options.verbose) {
          console.log(chalk.gray(`  ✓ Removed skills/${dir}`));
        }
      } catch (e) {
        // Ignore
      }
    }

    if (skillDirs.length > 0) {
      console.log(chalk.gray(`  ✓ Removed ${skillDirs.length} skill folder(s)`));
    }
  }

  // Clean marketplace directory
  const marketplaceDir = path.join(os.homedir(), '.claude', 'plugins', 'marketplaces', 'specweave');
  if (fs.existsSync(marketplaceDir)) {
    try {
      fs.rmSync(marketplaceDir, { recursive: true, force: true });
      console.log(chalk.gray('  ✓ Removed marketplace directory'));
    } catch (e) {
      if (options.verbose) {
        console.log(chalk.yellow(`  ⚠ Could not remove marketplace directory: ${e}`));
      }
    }
  }

  // Clean settings.json
  const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
  if (fs.existsSync(settingsPath)) {
    try {
      const settingsContent = fs.readFileSync(settingsPath, 'utf8');
      const settings = JSON.parse(settingsContent);

      if (settings.enabledPlugins) {
        for (const pluginKey of Object.keys(settings.enabledPlugins)) {
          if (pluginKey.endsWith('@specweave')) {
            delete settings.enabledPlugins[pluginKey];
          }
        }
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
        console.log(chalk.gray('  ✓ Cleaned settings.json'));
      }
    } catch (e) {
      // Ignore
    }
  }

  console.log(chalk.green('✓ All caches cleaned\n'));

  // Step 4: Install core plugins directly from GitHub
  console.log(chalk.yellow('📥 Step 4: Installing core plugins from GitHub...'));

  // First, add the marketplace back temporarily to install plugins
  const addResult = runCommand('claude', ['plugin', 'marketplace', 'add', GITHUB_REPO], true);
  if (!addResult.success && !addResult.output.includes('already')) {
    console.log(chalk.red('✗ Failed to add marketplace for installation'));
    console.log(chalk.gray(addResult.output));
    process.exit(1);
  }

  // Install core plugins
  const corePlugins = ['sw', 'sw-router'];
  let installedCount = 0;

  for (const plugin of corePlugins) {
    console.log(chalk.blue(`  Installing ${plugin}...`));
    const result = installPlugin(plugin, forceMode);
    if (result.success) {
      installedCount++;
      console.log(chalk.green(`  ✓ ${plugin} installed`));
    } else {
      console.log(chalk.red(`  ✗ ${plugin} failed`));
      if (options.verbose) {
        console.log(chalk.gray(`    ${result.error}`));
      }
    }
  }

  // Now remove the marketplace again to clean /plugin output
  const removeResult2 = removeMarketplace(MARKETPLACE_NAME);
  if (removeResult2.success || removeResult2.output.includes('removed')) {
    console.log(chalk.gray('  ✓ Marketplace removed after installation'));
  }

  console.log('');
  console.log(chalk.green.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.green.bold('  ✓ MINIMAL MODE COMPLETE'));
  console.log(chalk.green.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  console.log(`  Installed: ${installedCount} core plugin(s)`);
  console.log(chalk.cyan('  /plugin will now show only installed plugins\n'));

  console.log(chalk.yellow('⚠️  Note: Lazy loading is disabled in minimal mode'));
  console.log(chalk.gray('   To re-enable lazy loading, run:'));
  console.log(chalk.gray('   specweave refresh-marketplace\n'));

  console.log(chalk.blue('Next steps:'));
  console.log('  1. Restart Claude Code for changes to take effect');
  console.log('  2. Run /plugin to verify clean output');
  console.log('');
}

export async function refreshMarketplaceCommand(options: RefreshOptions = {}): Promise<void> {
  // Handle minimal mode separately - completely different flow
  if (options.minimal) {
    await runMinimalMode(options);
    return;
  }

  // Determine mode - GitHub is default per CLAUDE.md rules
  const sourceMode = options.local ? 'local' : 'github';
  const forceMode = options.force ?? false;
  // LAZY LOADING (v1.0.122+): Default to lazy mode (router only), use --all for legacy
  const lazyMode = !(options.all ?? false);

  const modeLabel = lazyMode ? 'lazy' : 'all plugins';

  console.log(chalk.blue.bold('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.blue.bold(`  SpecWeave Marketplace Refresh`));
  console.log(chalk.blue.bold(`  Source: ${sourceMode} | Mode: ${modeLabel}${forceMode ? ' | FORCE' : ''}`));
  console.log(chalk.blue.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  if (lazyMode) {
    console.log(chalk.cyan('🚀 Lazy loading mode (default):'));
    console.log(chalk.gray('   • Install only router plugin (~500 tokens)'));
    console.log(chalk.gray('   • Other plugins cached for on-demand loading'));
    console.log(chalk.gray('   • Use --all flag to install all plugins'));
    console.log(chalk.gray('   • Use --minimal flag for clean /plugin output (no lazy loading)\n'));
  } else {
    console.log(chalk.yellow('⚠️  All plugins mode (legacy):'));
    console.log(chalk.gray('   • Installing all 24 plugins (~60K tokens)'));
    console.log(chalk.gray('   • Consider using lazy mode (default) for better performance\n'));
  }

  if (sourceMode === 'local') {
    console.log(chalk.yellow('⚠️  Local source - use only for active development!\n'));
  }

  if (forceMode) {
    console.log(chalk.yellow('🔄 Force mode: Will uninstall and clear cache before reinstalling\n'));
  }

  // Step 1: Check/update marketplace
  console.log(chalk.yellow('📥 Step 1: Checking marketplace status...'));

  const marketplaceExists = checkMarketplaceExists();

  if (marketplaceExists) {
    console.log(chalk.blue(`✓ Marketplace '${MARKETPLACE_NAME}' already registered`));
    console.log(chalk.blue('📥 Updating marketplace from source...'));

    const updateResult = runCommand('claude', ['plugin', 'marketplace', 'update', MARKETPLACE_NAME], true);

    if (updateResult.success || updateResult.output.includes('Updated')) {
      console.log(chalk.green('✓ Marketplace updated successfully'));
    } else {
      console.log(chalk.red('✗ Failed to update marketplace'));
      console.log(chalk.gray(updateResult.output));
      process.exit(1);
    }
  } else {
    console.log(chalk.blue('Marketplace not found - adding it now...'));

    let addArgs: string[];
    if (sourceMode === 'local') {
      const localPath = process.cwd();
      const marketplaceJsonPath = path.join(localPath, '.claude-plugin/marketplace.json');

      if (!fs.existsSync(marketplaceJsonPath)) {
        console.log(chalk.red(`✗ Error: marketplace.json not found at ${localPath}`));
        console.log(chalk.yellow('  Make sure you are in the SpecWeave repository root.'));
        process.exit(1);
      }

      addArgs = ['plugin', 'marketplace', 'add', localPath];
      console.log(chalk.blue(`Using local development version: ${localPath}`));
    } else {
      addArgs = ['plugin', 'marketplace', 'add', GITHUB_REPO];
      console.log(chalk.blue(`Adding from GitHub: ${GITHUB_REPO}`));
    }

    const addResult = runCommand('claude', addArgs, true);

    if (addResult.success || addResult.output.includes('Added') || addResult.output.includes('already')) {
      console.log(chalk.green(`✓ ${sourceMode === 'local' ? 'Local' : 'GitHub'} marketplace added`));
    } else {
      console.log(chalk.red(`✗ Failed to add ${sourceMode} marketplace`));
      console.log(chalk.gray(addResult.output));
      process.exit(1);
    }
  }

  console.log('');

  // Step 1.5: Pre-refresh cache health check
  await preRefreshCacheCheck(options.verbose);

  // Step 1.6: Clean up auto mode state files
  console.log(chalk.yellow('🧹 Cleaning up auto mode state files...'));
  const stateDir = path.join(process.cwd(), '.specweave/state');
  if (fs.existsSync(stateDir)) {
    const filesToClean = [
      'auto-mode.json',
      'auto-session.json',
      'auto-needs-increment.json',
      '.stop-auto-dedup',
      '.stop-auto-last-fire',
    ];

    let cleaned = 0;
    for (const file of filesToClean) {
      const filePath = path.join(stateDir, file);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          cleaned++;
        } catch (e) {
          // Ignore errors
        }
      }
    }

    if (cleaned > 0) {
      console.log(chalk.green(`✓ Cleaned up ${cleaned} auto mode state file(s)`));
    } else {
      console.log(chalk.blue('ℹ No auto mode state files to clean'));
    }
  } else {
    console.log(chalk.blue('ℹ Not in a SpecWeave project - skipping auto mode cleanup'));
  }

  console.log('');

  // Step 2: Get plugin list
  console.log(chalk.yellow('📋 Step 2: Reading plugin list...'));

  const marketplacePath = getMarketplaceInstallPath();

  if (!marketplacePath) {
    console.log(chalk.red('✗ Error: Could not find marketplace install location'));
    console.log(chalk.yellow('  Check ~/.claude/plugins/known_marketplaces.json'));
    process.exit(1);
  }

  let plugins: string[];
  try {
    plugins = getPluginsFromMarketplace(marketplacePath);
  } catch (error) {
    console.log(chalk.red(`✗ Error: ${error}`));
    process.exit(1);
  }

  console.log(chalk.green(`✓ Found ${plugins.length} plugins\n`));

  // Step 3: Install plugins (LAZY LOADING AWARE - v1.0.122+)
  const results: PluginResult[] = [];

  if (lazyMode) {
    // LAZY MODE: Install only router plugin
    // Note: Plugin name in marketplace.json is 'sw-router', folder name is 'specweave-router'
    const routerPlugin = 'sw-router';
    const corePlugins = ['sw', 'sw-router']; // Plugins to keep in lazy mode

    // Step 3a: Uninstall non-core plugins to match fresh install state
    console.log(chalk.yellow('⚙️  Step 3a: Cleaning up non-core plugins...'));

    const installedPlugins = getInstalledSpecweavePlugins();
    const pluginsToUninstall = installedPlugins.filter(p => !corePlugins.includes(p));

    if (pluginsToUninstall.length > 0) {
      console.log(chalk.blue(`  Found ${pluginsToUninstall.length} non-core plugin(s) to uninstall`));

      for (const plugin of pluginsToUninstall) {
        const uninstallResult = uninstallPlugin(plugin);
        if (uninstallResult.success || uninstallResult.output.includes('not installed')) {
          console.log(chalk.gray(`  ✓ Uninstalled ${plugin}`));
        } else if (options.verbose) {
          console.log(chalk.yellow(`  ⚠ Could not uninstall ${plugin}: ${uninstallResult.output}`));
        }
      }

      console.log(chalk.green(`✓ Cleaned up ${pluginsToUninstall.length} non-core plugin(s)\n`));
    } else {
      console.log(chalk.green('✓ No non-core plugins to clean up\n'));
    }

    // Also clean up ~/.claude/skills/ directory for non-core plugins
    // (claude plugin uninstall may not always clean this up)
    const skillsDir = path.join(os.homedir(), '.claude', 'skills');
    const coreSkillDirs = ['specweave', 'specweave-router']; // Folder names to keep

    if (fs.existsSync(skillsDir)) {
      const skillDirs = fs.readdirSync(skillsDir).filter(name => {
        const dirPath = path.join(skillsDir, name);
        return fs.statSync(dirPath).isDirectory() && name.startsWith('specweave');
      });

      const dirsToRemove = skillDirs.filter(dir => !coreSkillDirs.includes(dir));

      if (dirsToRemove.length > 0) {
        console.log(chalk.blue(`  Cleaning up ${dirsToRemove.length} skill folder(s)...`));

        for (const dir of dirsToRemove) {
          try {
            fs.rmSync(path.join(skillsDir, dir), { recursive: true, force: true });
            console.log(chalk.gray(`  ✓ Removed ${dir}/`));
          } catch (e) {
            if (options.verbose) {
              console.log(chalk.yellow(`  ⚠ Could not remove ${dir}/`));
            }
          }
        }
      }
    }

    // CRITICAL: Also clean up ~/.claude/plugins/cache/specweave/ for non-core plugins
    // This is where Claude Code discovers plugins from, even if not "installed"
    const pluginCacheDir = path.join(os.homedir(), '.claude', 'plugins', 'cache', 'specweave');
    const corePluginCacheDirs = ['sw', 'sw-router']; // Cache folder names to keep

    if (fs.existsSync(pluginCacheDir)) {
      const cacheDirs = fs.readdirSync(pluginCacheDir).filter(name => {
        const dirPath = path.join(pluginCacheDir, name);
        return fs.statSync(dirPath).isDirectory();
      });

      const cacheDirsToRemove = cacheDirs.filter(dir => !corePluginCacheDirs.includes(dir));

      if (cacheDirsToRemove.length > 0) {
        console.log(chalk.blue(`  Cleaning up ${cacheDirsToRemove.length} cached plugin(s)...`));

        for (const dir of cacheDirsToRemove) {
          try {
            fs.rmSync(path.join(pluginCacheDir, dir), { recursive: true, force: true });
            console.log(chalk.gray(`  ✓ Removed cache: ${dir}/`));
          } catch (e) {
            if (options.verbose) {
              console.log(chalk.yellow(`  ⚠ Could not remove cache: ${dir}/`));
            }
          }
        }

        console.log(chalk.green(`✓ Cleaned up ${cacheDirsToRemove.length} cached plugin(s)\n`));
      } else {
        console.log(chalk.green('✓ No cached plugins to clean up\n'));
      }
    }

    // Also clean up settings.json enabledPlugins for non-core specweave plugins
    const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
    const coreEnabledPlugins = ['sw@specweave', 'sw-router@specweave'];

    if (fs.existsSync(settingsPath)) {
      try {
        const settingsContent = fs.readFileSync(settingsPath, 'utf8');
        const settings = JSON.parse(settingsContent);

        if (settings.enabledPlugins) {
          const pluginsToDisable: string[] = [];

          for (const pluginKey of Object.keys(settings.enabledPlugins)) {
            // Only target specweave plugins, not official ones
            if (pluginKey.endsWith('@specweave') && !coreEnabledPlugins.includes(pluginKey)) {
              pluginsToDisable.push(pluginKey);
              delete settings.enabledPlugins[pluginKey];
            }
          }

          if (pluginsToDisable.length > 0) {
            fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
            console.log(chalk.blue(`  Disabled ${pluginsToDisable.length} plugin(s) in settings.json`));
            if (options.verbose) {
              for (const p of pluginsToDisable) {
                console.log(chalk.gray(`  ✓ Disabled: ${p}`));
              }
            }
          }
        }
      } catch (e) {
        if (options.verbose) {
          console.log(chalk.yellow(`  ⚠ Could not clean settings.json: ${e}`));
        }
      }
    }

    // Step 3b: Disable all non-core marketplace plugins
    // This ensures they don't show up in /plugin as enabled
    console.log(chalk.yellow('⚙️  Step 3b: Disabling non-core marketplace plugins...'));

    const nonCorePlugins = plugins.filter(p => !corePlugins.includes(p));
    let actuallyDisabled = 0;
    let alreadyNotInstalled = 0;

    for (const plugin of nonCorePlugins) {
      const disableResult = disablePlugin(plugin);
      if (disableResult.success) {
        actuallyDisabled++;
        if (options.verbose) {
          console.log(chalk.gray(`  ✓ Disabled ${plugin}`));
        }
      } else if (disableResult.output.includes('not installed') || disableResult.output.includes('already disabled')) {
        alreadyNotInstalled++;
        if (options.verbose) {
          console.log(chalk.gray(`  - ${plugin} (not installed)`));
        }
      }
    }

    // Show appropriate summary based on what happened
    if (actuallyDisabled > 0 && alreadyNotInstalled > 0) {
      console.log(chalk.green(`✓ Disabled ${actuallyDisabled} plugin(s), ${alreadyNotInstalled} already not installed\n`));
    } else if (actuallyDisabled > 0) {
      console.log(chalk.green(`✓ Disabled ${actuallyDisabled} non-core marketplace plugin(s)\n`));
    } else if (alreadyNotInstalled > 0) {
      console.log(chalk.green(`✓ ${alreadyNotInstalled} non-core plugins not installed (skipped)\n`));
    } else {
      console.log(chalk.green(`✓ No non-core plugins to disable\n`));
    }

    // Step 3c: Install router
    console.log(chalk.yellow(`⚙️  Step 3c: Installing router plugin only${forceMode ? ' + force' : ''}...\n`));

    if (plugins.includes(routerPlugin)) {
      console.log(chalk.blue(`  ${forceMode ? 'Force reinstalling' : 'Installing'} ${routerPlugin}...`));
      const result = installPlugin(routerPlugin, forceMode);
      results.push(result);

      if (result.success) {
        console.log(chalk.green(`  ✓ ${routerPlugin} installed`));
      } else {
        console.log(chalk.red(`  ✗ ${routerPlugin} failed`));
        if (options.verbose && result.error) {
          console.log(chalk.gray(`    ${result.error}`));
        }
      }
    } else {
      // Fallback: install core specweave plugin if router not found
      console.log(chalk.yellow(`  ⚠ Router plugin not found, installing core specweave...`));
      const result = installPlugin('specweave', forceMode);
      results.push(result);
      if (result.success) {
        console.log(chalk.green(`  ✓ specweave (core) installed`));
      }
    }

    console.log('');
    console.log(chalk.blue.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.blue.bold('  Lazy Loading Summary'));
    console.log(chalk.blue.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

    console.log(`  Total plugins available: ${plugins.length}`);
    console.log(chalk.green(`  Installed now: 1 (router only)`));
    console.log(chalk.cyan(`  Cached for on-demand: ${plugins.length - 1}`));
    console.log('');
    console.log(chalk.green('  💡 Token savings:'));
    console.log(chalk.gray(`     Before: ~60,000 tokens (all plugins)`));
    console.log(chalk.gray(`     After:  ~500 tokens (router only)`));
    console.log(chalk.green(`     Saved:  ~59,500 tokens (99% reduction!)`));

  } else {
    // LEGACY MODE: Install all plugins
    console.log(chalk.yellow(`⚙️  Step 3: Installing all plugins${forceMode ? ' (force reinstall)' : ''}...\n`));

    for (const plugin of plugins) {
      console.log(chalk.blue(`  ${forceMode ? 'Force reinstalling' : 'Installing'} ${plugin}...`));
      const result = installPlugin(plugin, forceMode);
      results.push(result);

      if (result.success) {
        console.log(chalk.green(`  ✓ ${plugin} installed`));
      } else {
        console.log(chalk.red(`  ✗ ${plugin} failed`));
        if (options.verbose && result.error) {
          console.log(chalk.gray(`    ${result.error}`));
        }
      }
    }

    console.log('');

    // Summary for all plugins mode
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;
    const failedPlugins = results.filter((r) => !r.success);

    console.log(chalk.blue.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.blue.bold('  Installation Summary'));
    console.log(chalk.blue.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

    console.log(`  Total plugins: ${plugins.length}`);
    console.log(chalk.green(`  Successful: ${successCount}`));

    if (failCount > 0) {
      console.log(chalk.red(`  Failed: ${failCount}\n`));
      console.log(chalk.yellow('Failed plugins:'));
      for (const plugin of failedPlugins) {
        console.log(chalk.red(`  - ${plugin.name}`));
      }
      console.log('');
      console.log(chalk.yellow('⚠ Some plugins failed to install'));
      console.log(chalk.yellow('Check Claude Code logs for details'));
    } else {
      console.log(chalk.red(`  Failed: 0\n`));
      console.log(chalk.green.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
      console.log(chalk.green.bold('  ✓ ALL PLUGINS INSTALLED SUCCESSFULLY!'));
      console.log(chalk.green.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    }
  }

  console.log('');

  // Step 3.5: Fix hook permissions (chmod +x) - Unix only
  if (process.platform !== 'win32') {
    console.log(chalk.yellow('🔧 Step 3.5: Fixing hook permissions...'));

    // Fix permissions on marketplace plugins
    const permResult = fixHookPermissions(marketplacePath);
    let totalFixed = permResult.fixed;
    let totalSkipped = permResult.skipped;

    // LAZY LOADING: Also fix permissions on cached plugins
    const skillsCachePath = path.join(os.homedir(), '.specweave', 'skills-cache');
    if (fs.existsSync(skillsCachePath)) {
      const cachePermResult = fixHookPermissionsInCache(skillsCachePath);
      totalFixed += cachePermResult.fixed;
      totalSkipped += cachePermResult.skipped;
      if (options.verbose && cachePermResult.fixed > 0) {
        console.log(chalk.gray(`  (${cachePermResult.fixed} in lazy cache)`));
      }
    }

    if (totalFixed > 0) {
      console.log(chalk.green(`✓ Fixed permissions on ${totalFixed} hook/script files`));
    }
    if (totalSkipped > 0 && options.verbose) {
      console.log(chalk.dim(`  (${totalSkipped} files already executable)`));
    }
    if (totalFixed === 0 && totalSkipped > 0) {
      console.log(chalk.green(`✓ All ${totalSkipped} hook/script files already executable`));
    }
    if (permResult.errors.length > 0 && options.verbose) {
      for (const err of permResult.errors) {
        console.log(chalk.yellow(`  ⚠ ${err}`));
      }
    }
  } else {
    if (options.verbose) {
      console.log(chalk.dim('🔧 Step 3.5: Skipped (Windows - permissions not applicable)'));
    }
  }

  console.log('');

  // Step 4: Verify marketplace ready for lazy loading
  console.log(chalk.yellow('📦 Step 5: Verifying marketplace for lazy loading...'));

  try {
    const cacheManager = new PluginCacheManager({
      marketplacePath: path.join(marketplacePath, 'plugins'),
    });

    // SIMPLIFIED (v1.0.122+): No intermediate cache needed!
    // Plugins load directly from marketplace (~/.claude/plugins/marketplaces/specweave/plugins/)
    const cacheResult = await cacheManager.populateCache();

    if (cacheResult.success) {
      console.log(chalk.green(`✓ ${cacheResult.pluginsAffected} plugins ready for on-demand loading`));
      console.log(chalk.gray(`  Marketplace: ~/.claude/plugins/marketplaces/specweave/plugins/`));
      console.log(chalk.gray(`  No intermediate cache needed (loads directly from marketplace)`));
      if (options.verbose) {
        console.log(chalk.gray(`  Duration: ${cacheResult.durationMs.toFixed(0)}ms`));
      }
    } else {
      console.log(chalk.yellow('⚠ Marketplace verification failed'));
      if (options.verbose && cacheResult.error) {
        console.log(chalk.gray(`  ${cacheResult.error}`));
      }
    }
  } catch (error) {
    console.log(chalk.yellow('⚠ Could not verify marketplace'));
    if (options.verbose) {
      console.log(chalk.gray(`  ${error}`));
    }
  }

  console.log('');

  // Step 6: Update instruction files
  console.log(chalk.yellow('📄 Step 6: Updating instruction files...'));

  const configPath = path.join(process.cwd(), '.specweave/config.json');

  if (fs.existsSync(configPath)) {
    const updateResult = runCommand('npx', ['specweave', 'update-instructions'], true);

    if (updateResult.success) {
      console.log(chalk.green('✓ Instruction files updated'));
    } else {
      console.log(chalk.yellow('⚠ Could not update instruction files'));
      console.log(chalk.gray('  Run manually: npx specweave update-instructions'));
    }
  } else {
    console.log(chalk.blue('ℹ Not in a SpecWeave project - skipping instruction file update'));
  }

  console.log('');
  console.log(chalk.blue('Next steps:'));
  console.log('  1. Restart Claude Code for changes to take effect');
  if (lazyMode) {
    console.log(`  2. Run ${chalk.yellow('/plugin')} to verify router loaded`);
    console.log(`  3. Use keywords to trigger on-demand plugin loading`);
    console.log(chalk.gray('     Examples: "GitHub sync", "JIRA integration", "React frontend"'));
    console.log(`  4. Or install plugins manually: ${chalk.yellow('claude plugin install sw@specweave')}`);
    console.log(chalk.gray('     Available: sw, sw-frontend, sw-github, sw-jira, sw-ado, sw-ml, sw-infra'));
  } else {
    console.log(`  2. Run ${chalk.yellow('/plugin')} to verify all plugins loaded`);
    console.log(`  3. Check ${chalk.yellow('~/.claude/plugins/installed_plugins.json')}`);
  }
  console.log('');
}

