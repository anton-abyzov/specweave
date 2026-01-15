#!/usr/bin/env node
/**
 * Refresh SpecWeave Marketplace
 *
 * Automates the complete marketplace refresh process:
 * 1. Updates or adds marketplace (GitHub or local)
 * 2. Installs all plugins from marketplace
 * 3. Merges skill memories (preserves user learnings)
 * 4. Updates instruction files (CLAUDE.md, AGENTS.md)
 *
 * Usage:
 *   specweave refresh-marketplace
 *   specweave refresh-marketplace --local
 *   specweave refresh-marketplace --github
 *
 * @since 1.0.60
 */

import chalk from 'chalk';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import os from 'os';
import { mergeSkillMemoriesOnRefresh } from './merge-skill-memories.js';
import { CacheHealthMonitor } from '../../core/plugin-cache/cache-health-monitor.js';
import { CacheInvalidator } from '../../core/plugin-cache/cache-invalidator.js';
import { CacheMetadataManager } from '../../core/plugin-cache/cache-metadata.js';
import { consoleLogger as logger } from '../../utils/logger.js';

// Configuration
const MARKETPLACE_NAME = 'specweave';
const GITHUB_REPO = 'anton-abyzov/specweave';

interface RefreshOptions {
  local?: boolean;
  github?: boolean;
  verbose?: boolean;
  force?: boolean;
}

interface PluginResult {
  name: string;
  success: boolean;
  error?: string;
}

function runCommand(command: string, silent = false): { success: boolean; output: string } {
  try {
    const output = execSync(command, {
      encoding: 'utf8',
      stdio: silent ? 'pipe' : ['pipe', 'pipe', 'pipe'],
    });
    return { success: true, output: output.trim() };
  } catch (error: unknown) {
    const err = error as { stdout?: Buffer | string; stderr?: Buffer | string; message?: string };
    const output = (err.stdout?.toString() || '') + (err.stderr?.toString() || '');
    return { success: false, output: output || err.message || 'Unknown error' };
  }
}

function checkMarketplaceExists(): boolean {
  const result = runCommand('claude plugin marketplace list 2>/dev/null', true);
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
  // Try to get from git
  const result = runCommand('git rev-parse HEAD 2>/dev/null', true);
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

function installPlugin(pluginName: string, force: boolean = false): PluginResult {
  // If force mode, uninstall first to ensure fresh copy
  if (force) {
    runCommand(`claude plugin uninstall "${pluginName}" 2>&1`, true);
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

  const result = runCommand(`claude plugin install "${pluginName}" 2>&1`, true);

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
function fixHookPermissions(marketplacePath: string): { fixed: number; errors: string[] } {
  const errors: string[] = [];
  let fixed = 0;

  const pluginsDir = path.join(marketplacePath, 'plugins');
  if (!fs.existsSync(pluginsDir)) {
    return { fixed, errors: ['Plugins directory not found'] };
  }

  // Find all plugin directories
  const pluginDirs = fs.readdirSync(pluginsDir).filter(name => {
    const pluginPath = path.join(pluginsDir, name);
    return fs.statSync(pluginPath).isDirectory();
  });

  for (const pluginName of pluginDirs) {
    const hooksDir = path.join(pluginsDir, pluginName, 'hooks');
    if (!fs.existsSync(hooksDir)) continue;

    // Find all .sh files in hooks directory
    const hookFiles = fs.readdirSync(hooksDir).filter(f => f.endsWith('.sh'));

    for (const hookFile of hookFiles) {
      const hookPath = path.join(hooksDir, hookFile);
      try {
        // Make executable (0o755 = rwxr-xr-x)
        fs.chmodSync(hookPath, 0o755);
        fixed++;
      } catch (error) {
        errors.push(`${pluginName}/${hookFile}: ${error}`);
      }
    }

    // Also check scripts directory
    const scriptsDir = path.join(pluginsDir, pluginName, 'scripts');
    if (fs.existsSync(scriptsDir)) {
      const scriptFiles = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.sh'));
      for (const scriptFile of scriptFiles) {
        const scriptPath = path.join(scriptsDir, scriptFile);
        try {
          fs.chmodSync(scriptPath, 0o755);
          fixed++;
        } catch (error) {
          errors.push(`${pluginName}/scripts/${scriptFile}: ${error}`);
        }
      }
    }
  }

  return { fixed, errors };
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

export async function refreshMarketplaceCommand(options: RefreshOptions = {}): Promise<void> {
  // Determine mode - GitHub is default per CLAUDE.md rules
  const mode = options.local ? 'local' : 'github';
  const forceMode = options.force ?? false;

  console.log(chalk.blue.bold('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.blue.bold(`  SpecWeave Marketplace Refresh (${mode} mode${forceMode ? ' + FORCE' : ''})`));
  console.log(chalk.blue.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  if (mode === 'local') {
    console.log(chalk.yellow('⚠️  Local mode - use only for active development!\n'));
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

    const updateResult = runCommand(`claude plugin marketplace update "${MARKETPLACE_NAME}" 2>&1`, true);

    if (updateResult.success || updateResult.output.includes('Updated')) {
      console.log(chalk.green('✓ Marketplace updated successfully'));
    } else {
      console.log(chalk.red('✗ Failed to update marketplace'));
      console.log(chalk.gray(updateResult.output));
      process.exit(1);
    }
  } else {
    console.log(chalk.blue('Marketplace not found - adding it now...'));

    let addCommand: string;
    if (mode === 'local') {
      const localPath = process.cwd();
      const marketplaceJsonPath = path.join(localPath, '.claude-plugin/marketplace.json');

      if (!fs.existsSync(marketplaceJsonPath)) {
        console.log(chalk.red(`✗ Error: marketplace.json not found at ${localPath}`));
        console.log(chalk.yellow('  Make sure you are in the SpecWeave repository root.'));
        process.exit(1);
      }

      addCommand = `claude plugin marketplace add "${localPath}" 2>&1`;
      console.log(chalk.blue(`Using local development version: ${localPath}`));
    } else {
      addCommand = `claude plugin marketplace add "${GITHUB_REPO}" 2>&1`;
      console.log(chalk.blue(`Adding from GitHub: ${GITHUB_REPO}`));
    }

    const addResult = runCommand(addCommand, true);

    if (addResult.success || addResult.output.includes('Added') || addResult.output.includes('already')) {
      console.log(chalk.green(`✓ ${mode === 'local' ? 'Local' : 'GitHub'} marketplace added`));
    } else {
      console.log(chalk.red(`✗ Failed to add ${mode} marketplace`));
      console.log(chalk.gray(addResult.output));
      process.exit(1);
    }
  }

  console.log('');

  // Step 1.5: Pre-refresh cache health check
  await preRefreshCacheCheck(options.verbose);

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

  // Step 3: Install all plugins
  console.log(chalk.yellow(`⚙️  Step 3: Installing all plugins${forceMode ? ' (force reinstall)' : ''}...\n`));

  const results: PluginResult[] = [];

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

  // Summary
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

  console.log('');

  // Step 3.5: Fix hook permissions (chmod +x)
  console.log(chalk.yellow('🔧 Step 3.5: Fixing hook permissions...'));

  const permResult = fixHookPermissions(marketplacePath);
  if (permResult.fixed > 0) {
    console.log(chalk.green(`✓ Fixed permissions on ${permResult.fixed} hook/script files`));
  }
  if (permResult.errors.length > 0 && options.verbose) {
    for (const err of permResult.errors) {
      console.log(chalk.yellow(`  ⚠ ${err}`));
    }
  }

  console.log('');

  // Step 4: Merge skill memories (preserves user learnings)
  console.log(chalk.yellow('🧠 Step 4: Merging skill memories...'));

  try {
    const memoryResult = await mergeSkillMemoriesOnRefresh(marketplacePath, options.verbose);

    if (memoryResult.skillsProcessed > 0) {
      console.log(chalk.green(`✓ Merged ${memoryResult.skillsProcessed} skill memories`));
      if (memoryResult.learningsPreserved > 0) {
        console.log(chalk.gray(`  Preserved ${memoryResult.learningsPreserved} user learnings`));
      }
      if (memoryResult.learningsAdded > 0) {
        console.log(chalk.gray(`  Added ${memoryResult.learningsAdded} new default learnings`));
      }
    } else {
      console.log(chalk.blue('ℹ No skill memories to merge'));
    }
  } catch (error) {
    console.log(chalk.yellow('⚠ Could not merge skill memories'));
    if (options.verbose) {
      console.log(chalk.gray(`  ${error}`));
    }
  }

  console.log('');

  // Step 5: Update instruction files
  console.log(chalk.yellow('📄 Step 5: Updating instruction files...'));

  const configPath = path.join(process.cwd(), '.specweave/config.json');

  if (fs.existsSync(configPath)) {
    const updateResult = runCommand('npx specweave update-instructions 2>&1', true);

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
  console.log(`  2. Run ${chalk.yellow('/plugin')} to verify all plugins loaded`);
  console.log(`  3. Check ${chalk.yellow('~/.claude/plugins/installed_plugins.json')}`);
  console.log('');
}

