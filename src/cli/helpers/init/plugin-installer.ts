/**
 * Plugin installation for Claude Code
 * Uses inline copier for first-party plugin installation (no vskill dependency).
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { detectClaudeCli, getClaudeCliDiagnostic, getClaudeCliSuggestions } from '../../../utils/claude-cli-detector.js';
import { findSourceDir } from './path-utils.js';
import { cleanupStalePlugins } from '../../../utils/cleanup-stale-plugins.js';
import { enablePluginsInSettings } from './claude-plugin-enabler.js';
import { copyPlugin, findSpecweaveRoot } from '../../../utils/plugin-copier.js';
import { getDirname } from '../../../utils/esm-helpers.js';

const __dirname = getDirname(import.meta.url);

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
 * Install SpecWeave plugins via inline copier
 *
 * By default (lazyMode=true), only the core plugin (sw) is installed.
 * Other plugins are loaded on-demand based on keywords detected by
 * the detect-intent command in the user-prompt-submit hook.
 *
 * With lazyMode=false, all plugins are installed.
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
    const diagnostic = getClaudeCliDiagnostic(claudeStatus);
    const suggestions = getClaudeCliSuggestions(claudeStatus);

    spinner.warn(diagnostic);
    console.log('');
    console.log(chalk.yellow.bold('⚠️  Claude Code CLI Issue Detected'));
    console.log('');

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

    console.log(chalk.cyan('💡 How to fix:'));
    console.log('');
    suggestions.forEach(suggestion => {
      console.log(chalk.gray(`   ${suggestion}`));
    });
    console.log('');

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

  // Claude CLI available - proceed with inline copier installation
  try {
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

    console.log(chalk.blue(`   Found ${allPlugins.length} plugins available`));
    spinner.succeed(`Found ${allPlugins.length} plugins`);

    // Clean up stale plugin references
    spinner.start('Checking for stale plugin references...');
    const cleanupResult = await cleanupStalePlugins(marketplaceJsonPath, false);

    if (cleanupResult.removedCount > 0) {
      console.log(chalk.yellow(`   Removed ${cleanupResult.removedCount} stale plugin reference(s)`));
      cleanupResult.removedPlugins.forEach(p => {
        console.log(chalk.gray(`      - ${p}`));
      });
      spinner.succeed('Cleaned up stale plugins');
    } else {
      spinner.succeed('No stale plugins found');
    }

    // LAZY LOADING MODE (default)
    if (lazyMode) {
      return await installLazyMode(allPlugins, spinner);
    }

    // FULL MODE (--full flag)
    const result = await installPluginsFullMode(allPlugins, spinner, forceRefresh);

    // Enable installed plugins in Claude settings
    if (result.installedPlugins.length > 0) {
      spinner.start('Enabling plugins in Claude Code...');

      const enabled = enablePluginsInSettings(result.installedPlugins, 'specweave');
      if (enabled) {
        spinner.succeed('Plugins enabled in Claude Code');
        console.log(chalk.green('   All installed plugins are now active'));
      } else {
        spinner.warn('Could not auto-enable plugins');
        console.log(chalk.yellow('   Manual: Enable plugins in /plugin menu'));
      }
    }

    // Report results
    console.log('');
    console.log(chalk.green.bold('Plugin Installation Complete'));
    console.log(chalk.white(`   Installed: ${result.successCount}/${allPlugins.length} plugins`));

    if (result.failCount > 0) {
      console.log(chalk.yellow(`   Failed: ${result.failCount} plugins`));
      console.log(chalk.gray(`   Failed plugins: ${result.failedPlugins.join(', ')}`));
      console.log(chalk.gray('   You can install these manually later'));
    }

    console.log('');
    console.log(chalk.cyan('Available capabilities:'));
    console.log(chalk.gray('   /sw:increment - Plan new features'));
    console.log(chalk.gray('   /sw:do - Execute tasks'));
    console.log(chalk.gray('   /specweave-github:sync - GitHub integration'));
    console.log(chalk.gray('   /specweave-jira:sync - JIRA integration'));
    console.log(chalk.gray('   /sw:docs preview - Documentation preview'));
    console.log(chalk.gray('   ...and more!'));

    return {
      success: result.successCount > 0,
      successCount: result.successCount,
      failCount: result.failCount,
      failedPlugins: result.failedPlugins,
      marketplaceOnly: false
    };

  } catch (error: unknown) {
    spinner.warn('Could not auto-install plugins');
    console.log('');

    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('not found') || errorMessage.includes('ENOENT')) {
      console.log(chalk.yellow('   Reason: Plugin source not found'));
    } else if (errorMessage.includes('EACCES') || errorMessage.includes('permission')) {
      console.log(chalk.yellow('   Reason: Permission denied'));
      console.log(chalk.gray('   Check file permissions or run with appropriate access'));
    } else if (process.env.DEBUG) {
      console.log(chalk.gray(`   Error: ${errorMessage}`));
    }

    console.log('');
    return { success: false, successCount: 0, failCount: 0, failedPlugins: [] };
  }
}

/**
 * Install in lazy mode - core plugin only, load others on-demand
 */
async function installLazyMode(
  _allPlugins: Array<{ name: string }>,
  spinner: ReturnType<typeof ora>,
): Promise<PluginInstallResult> {
  const essentialPlugins = [
    { name: 'sw', marketplace: 'specweave', description: 'Core SpecWeave framework' },
  ];

  let installedCount = 0;
  const failedPlugins: string[] = [];
  const successfullyInstalled: string[] = [];

  spinner.start('Installing essential plugins...');
  spinner.stop();

  const specweaveRoot = findSpecweaveRoot(__dirname);
  if (!specweaveRoot) {
    console.log(chalk.yellow('  Could not find specweave root directory'));
    return { success: false, successCount: 0, failCount: 1, failedPlugins: ['sw'] };
  }

  for (const plugin of essentialPlugins) {
    console.log(chalk.blue(`  Installing ${plugin.name}...`));

    const result = copyPlugin(plugin.name, specweaveRoot, { force: true });

    if (result.success && !result.skipped) {
      console.log(chalk.green(`  ${plugin.name} installed`));
      installedCount++;
      successfullyInstalled.push(plugin.name);
    } else if (result.success && result.skipped) {
      console.log(chalk.gray(`  ${plugin.name} (already installed)`));
      installedCount++;
      successfullyInstalled.push(plugin.name);
    } else {
      console.log(chalk.yellow(`  ${plugin.name} failed: ${result.error || 'unknown'}`));
      failedPlugins.push(plugin.name);
    }
  }

  spinner.succeed(`Installed ${installedCount}/${essentialPlugins.length} essential plugins`);

  // Enable installed plugins in Claude settings
  if (successfullyInstalled.length > 0) {
    spinner.start('Enabling plugins in Claude Code...');

    const enabled = enablePluginsInSettings(successfullyInstalled, 'specweave');
    if (enabled) {
      spinner.succeed('Plugins enabled in Claude Code');
      console.log(chalk.green('   All installed plugins are now active'));
    } else {
      spinner.warn('Could not auto-enable plugins');
      console.log(chalk.yellow('   Manual: Enable plugins in /plugin menu'));
    }
  }

  // Register with Claude Code plugin system via CLI (non-fatal)
  if (successfullyInstalled.length > 0) {
    try {
      const { registerPluginsWithClaudeCli } = await import('../../../utils/claude-plugin-cli.js');
      registerPluginsWithClaudeCli(specweaveRoot, successfullyInstalled);
    } catch {
      // Non-fatal: Claude CLI may not be available
    }
  }

  // Show summary
  console.log('');
  console.log(chalk.green.bold('Lazy Loading Enabled'));
  console.log('');
  console.log(chalk.cyan('Installed plugins:'));
  for (const plugin of essentialPlugins) {
    console.log(chalk.gray(`   ${plugin.name}@${plugin.marketplace} - ${plugin.description}`));
  }
  console.log('');
  console.log(chalk.cyan('On-demand plugins (loaded via keywords):'));
  console.log(chalk.gray('   "GitHub sync" -> sw-github'));
  console.log(chalk.gray('   "JIRA" -> sw-jira'));
  console.log(chalk.gray('   "Kubernetes" -> sw-k8s'));
  console.log(chalk.gray('   "React/frontend" -> sw-frontend'));
  console.log('');

  return {
    success: installedCount > 0,
    successCount: installedCount,
    failCount: essentialPlugins.length - installedCount,
    failedPlugins,
    marketplaceOnly: false,
  };
}

/**
 * Install all plugins (full mode) via inline copier
 */
async function installPluginsFullMode(
  plugins: Array<{ name: string }>,
  spinner: ReturnType<typeof ora>,
  forceRefresh?: boolean,
): Promise<{ successCount: number; failCount: number; failedPlugins: string[]; installedPlugins: string[] }> {
  let successCount = 0;
  let failCount = 0;
  const failedPlugins: string[] = [];
  const installedPlugins: string[] = [];

  const specweaveRoot = findSpecweaveRoot(__dirname);
  if (!specweaveRoot) {
    return { successCount: 0, failCount: plugins.length, failedPlugins: plugins.map(p => p.name), installedPlugins: [] };
  }

  for (const plugin of plugins) {
    const pluginName = plugin.name;
    spinner.start(`Installing ${pluginName}...`);

    const result = copyPlugin(pluginName, specweaveRoot, { force: forceRefresh });

    if (result.success) {
      successCount++;
      installedPlugins.push(pluginName);
      spinner.succeed(`${pluginName} installed`);
    } else {
      failCount++;
      failedPlugins.push(pluginName);
      spinner.warn(`${pluginName} failed: ${result.error || 'unknown'}`);
    }
  }

  // Register with Claude Code plugin system via CLI (non-fatal)
  if (installedPlugins.length > 0) {
    try {
      const { registerPluginsWithClaudeCli } = await import('../../../utils/claude-plugin-cli.js');
      registerPluginsWithClaudeCli(specweaveRoot, installedPlugins);
    } catch {
      // Non-fatal: Claude CLI may not be available
    }
  }

  return { successCount, failCount, failedPlugins, installedPlugins };
}
