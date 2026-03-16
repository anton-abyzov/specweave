/**
 * Refresh SpecWeave Plugins
 *
 * When Claude Code CLI is available and supports plugin commands, uses the
 * native `claude plugin install` flow for proper marketplace registration,
 * settings enablement, and scope management.
 *
 * Falls back to direct file copy into .claude/skills/ when Claude CLI is
 * unavailable (e.g. Cursor, Windsurf, or other non-Claude tools).
 *
 * @since 1.0.279
 * @updated 1.0.535 - Migrated from CLI-based install to direct file copy
 * @updated 1.0.475 - Restored native Claude CLI install when available
 * @updated 1.0.540 - Core-only default install + --plugin flag + --quiet mode
 */

import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { consoleLogger as logger } from '../../utils/logger.js';
import { getDirname } from '../../utils/esm-helpers.js';
import {
  copyPluginSkillsToProject,
  installPlugin,
  findSpecweaveRoot,
} from '../../utils/plugin-copier.js';
import { getProjectRoot } from '../../utils/find-project-root.js';
import { detectClaudeCli } from '../../utils/claude-cli-detector.js';
import { enablePluginsInSettings } from '../helpers/init/claude-plugin-enabler.js';

const __dirname = getDirname(import.meta.url);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The core plugin that is always installed by default. */
const CORE_PLUGIN = 'sw';

export interface RefreshPluginsOptions {
  verbose?: boolean;
  force?: boolean;
  /** Install all plugins from marketplace.json, not just core (sw). */
  all?: boolean;
  /** Install a single named plugin. Takes precedence over --all. */
  plugin?: string;
  /** Suppress console output (for use by hooks). */
  quiet?: boolean;
}

interface MarketplacePlugin {
  name: string;
  source: string;
  version: string;
  description?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the path to the specweave root directory.
 */
function resolveSpecweaveRoot(): string | null {
  const fromFile = findSpecweaveRoot(__dirname);
  if (fromFile) return fromFile;

  const home = process.env.HOME || process.env.USERPROFILE || '';
  const installedMarketplace = path.join(home, '.claude/plugins/marketplaces/specweave');
  if (fs.existsSync(path.join(installedMarketplace, '.claude-plugin/marketplace.json'))) {
    return installedMarketplace;
  }

  return null;
}

/**
 * Parse marketplace.json and return available plugins.
 */
function getAvailablePlugins(marketplacePath: string): MarketplacePlugin[] {
  try {
    const content = fs.readFileSync(marketplacePath, 'utf-8');
    const manifest = JSON.parse(content);
    if (!Array.isArray(manifest.plugins)) return [];
    return manifest.plugins.map((p: MarketplacePlugin) => ({
      name: p.name,
      source: p.source,
      version: p.version || '0.0.0',
      ...(p.description ? { description: p.description } : {}),
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Main command
// ---------------------------------------------------------------------------

/**
 * Refresh plugins using the best available installation method.
 *
 * By default, only installs the core `sw` plugin. Use `--all` to install
 * all plugins from marketplace.json, or `--plugin <name>` for a single one.
 *
 * When Claude Code CLI is available, uses native `claude plugin install` for
 * proper marketplace registration, scope management, and settings enablement.
 * Falls back to direct file copy when CLI is unavailable.
 */
export async function refreshPluginsCommand(options: RefreshPluginsOptions = {}): Promise<void> {
  const quiet = !!options.quiet;
  const log = quiet ? (..._args: unknown[]) => {} : console.log;

  // Step 0: Detect Claude CLI for native install support.
  let useNativeCli = false;
  try {
    const cliStatus = detectClaudeCli();
    useNativeCli = cliStatus.available && cliStatus.pluginCommandsWork;
  } catch {
    logger.debug('Claude CLI detection failed, falling back to direct copy');
  }

  // Step 0.5: Clean stale lockfiles
  try {
    const { cleanupLegacyLockfiles, cleanupOrphanedChildLocks } = await import('../../utils/cleanup-stale-plugins.js');
    const projectRoot = getProjectRoot();

    const legacyResult = cleanupLegacyLockfiles(projectRoot, { verbose: options.verbose });
    const orphanResult = cleanupOrphanedChildLocks(projectRoot, { verbose: options.verbose });

    if (options.verbose) {
      if (legacyResult.removedCount > 0) {
        legacyResult.removedPaths.forEach(p => console.log(`  Removed legacy lockfile: ${p}`));
      }
      if (orphanResult.removedCount > 0) {
        orphanResult.removedPaths.forEach(p => console.log(`  Removed orphaned lockfile: ${p}`));
      }
    }
  } catch {
    // Non-blocking: cleanup errors don't abort plugin refresh
  }

  log(chalk.blue.bold('\n  SpecWeave Plugin Refresh'));
  if (useNativeCli) {
    log(chalk.blue.bold(`  Mode: native Claude CLI (claude plugin install)\n`));
  } else {
    log(chalk.blue.bold(`  Mode: direct copy to .claude/skills/\n`));
  }

  // Step 1: Find specweave root
  const specweaveRoot = resolveSpecweaveRoot();
  if (!specweaveRoot) {
    log(chalk.yellow('Could not find specweave installation'));
    log(chalk.gray('  Ensure specweave is installed globally or run from the specweave project.'));
    return;
  }

  const marketplacePath = path.join(specweaveRoot, '.claude-plugin', 'marketplace.json');
  logger.debug(`Found specweave root at ${specweaveRoot}`);

  // Step 2: Read available plugins
  const allPlugins = getAvailablePlugins(marketplacePath);
  if (allPlugins.length === 0) {
    log(chalk.yellow('No plugins found in marketplace.json'));
    return;
  }

  // Step 2b: Select plugins to install based on options
  // Priority: --plugin > --all > core-only default
  let pluginsToInstall: MarketplacePlugin[];

  if (options.plugin) {
    // Strip marketplace suffix if present (e.g., "sw-github@specweave" → "sw-github")
    const pluginName = options.plugin.split('@')[0];
    pluginsToInstall = allPlugins.filter(p => p.name === pluginName);
    if (pluginsToInstall.length === 0) {
      if (!quiet) {
        const available = allPlugins.map(p => p.name).join(', ');
        console.error(chalk.red(`  Plugin '${pluginName}' not found in marketplace.json`));
        console.error(chalk.gray(`  Available plugins: ${available}`));
      }
      process.exitCode = 1;
      return;
    }
  } else if (options.all) {
    pluginsToInstall = allPlugins;
  } else {
    pluginsToInstall = allPlugins.filter(p => p.name === CORE_PLUGIN);
  }

  log(chalk.gray(`  Installing ${pluginsToInstall.length} of ${allPlugins.length} plugins`));

  // Step 3: Determine project root
  const projectRoot = getProjectRoot();

  // Step 4: Process selected plugins
  let installed = 0;
  let skipped = 0;
  let failed = 0;
  const installedPluginNames: string[] = [];

  for (const plugin of pluginsToInstall) {
    let result;

    if (useNativeCli) {
      result = installPlugin(plugin.name, specweaveRoot, { force: options.force });
      if (!result.success) {
        logger.debug(`Native install failed for ${plugin.name}, trying direct copy`);
        result = copyPluginSkillsToProject(plugin.name, specweaveRoot, projectRoot, { force: options.force });
      }
    } else {
      result = copyPluginSkillsToProject(plugin.name, specweaveRoot, projectRoot, { force: options.force });
    }

    if (result.success && result.skipped) {
      log(chalk.green(`  ✓ ${plugin.name}: active`));
      skipped++;
      installedPluginNames.push(plugin.name);
    } else if (result.success) {
      log(chalk.green(`  + ${plugin.name}: installed`));
      installed++;
      installedPluginNames.push(plugin.name);
    } else {
      log(chalk.red(`  ✗ ${plugin.name}: failed`));
      if (result.error) {
        log(chalk.gray(`    ${result.error}`));
      }
      failed++;
    }
  }

  // Step 4b: Enable plugins in Claude Code settings (all modes)
  if (installedPluginNames.length > 0) {
    const enabled = enablePluginsInSettings(installedPluginNames);
    if (!enabled) {
      log(chalk.yellow('  ⚠ Could not enable plugins in ~/.claude/settings.json'));
    }
  }

  // Step 5: Summary
  log('');
  log(chalk.blue.bold('  Summary'));
  if (installed > 0) log(chalk.green(`  Installed: ${installed}`));
  if (skipped > 0) log(chalk.green(`  Active: ${skipped}`));
  if (failed > 0) log(chalk.red(`  Failed: ${failed}`));
  if (installed === 0 && skipped === 0 && failed === 0) {
    log(chalk.gray('  No plugins processed'));
  }
  if (useNativeCli) {
    log(chalk.gray(`  Location: ~/.claude/plugins/cache/ (native)`));
  } else {
    log(chalk.gray(`  Location: .claude/skills/ (project-local)`));
  }
  log('');
}
