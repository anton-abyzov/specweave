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
  migrateBundledToGlobalLock,
  migrateSatelliteToUnifiedLock,
} from '../../utils/plugin-copier.js';
import { cleanupStalePlugins, migrateUserLevelPlugins } from '../../utils/cleanup-stale-plugins.js';
import { getProjectRoot } from '../../utils/find-project-root.js';
import { detectClaudeCli } from '../../utils/claude-cli-detector.js';
import { enablePluginsInSettings } from '../helpers/init/claude-plugin-enabler.js';
import { enableDciPermissions } from '../helpers/init/claude-settings-permissions.js';
import { AdapterLoader } from '../../adapters/adapter-loader.js';

const __dirname = getDirname(import.meta.url);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The core plugin that is always installed by default. */
const CORE_PLUGIN = 'sw';

export interface RefreshResult {
  failed: number;
  errors: string[];
}

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
// Adapter resolution
// ---------------------------------------------------------------------------

export interface ResolvedAdapter {
  name: string;
  method: 'native-cli' | 'file-copy';
  skillsDir: string;
}

/**
 * Determine the active adapter for plugin installation.
 *
 * Resolution order:
 * 1. Read config.adapters.default from .specweave/config.json
 * 2. If non-Claude adapter with known mapping → file-copy to adapter's skills dir
 * 3. If unknown adapter → warn and fall through to Claude detection
 * 4. If Claude or unset → detectClaudeCli() for native-cli or file-copy fallback
 */
export function resolveActiveAdapter(projectRoot: string): ResolvedAdapter {
  // 1. Read config
  let adapterName: string | undefined;
  try {
    const configPath = path.join(projectRoot, '.specweave', 'config.json');
    const configRaw = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configRaw);
    adapterName = config?.adapters?.default;
  } catch {
    // Config missing or unreadable — fall through to Claude detection
  }

  // 2. Non-Claude adapter with known mapping
  if (typeof adapterName === 'string' && adapterName && adapterName !== 'claude') {
    try {
      const loader = new AdapterLoader();
      const adapter = loader.getAdapter(adapterName);
      if (adapter) {
        const skillsDir = adapter.getSkillsDirectory();
        if (skillsDir) {
          return {
            name: adapterName,
            method: 'file-copy',
            skillsDir,
          };
        }
        logger.debug(`Adapter "${adapterName}" returned empty skillsDir, falling back to Claude detection`);
      } else {
        // 3. Unknown adapter — warn and fall through
        logger.debug(`Unknown adapter "${adapterName}" in config, falling back to Claude detection`);
      }
    } catch (err) {
      logger.debug(`AdapterLoader error for "${adapterName}": ${err}; falling back to Claude detection`);
    }
  }

  // 4. Claude or unset — detect CLI
  try {
    const cliStatus = detectClaudeCli();
    if (cliStatus.available && cliStatus.pluginCommandsWork) {
      return { name: 'claude', method: 'native-cli', skillsDir: '' };
    }
  } catch {
    logger.debug('Claude CLI detection failed');
  }

  return { name: 'claude', method: 'file-copy', skillsDir: '.claude/skills' };
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
  } catch (err) {
    logger.debug(`getAvailablePlugins: failed to read marketplace.json: ${err}`);
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
export async function refreshPluginsCommand(options: RefreshPluginsOptions = {}): Promise<RefreshResult> {
  const quiet = !!options.quiet;
  const log = quiet ? (..._args: unknown[]) => {} : console.log;
  const errors: string[] = [];
  const logError = (plainMsg: string, formattedMsg?: string) => {
    errors.push(plainMsg);
    if (!quiet) console.log(formattedMsg ?? plainMsg);
  };

  // Step 0: Resolve which adapter/tool this project uses.
  const projectRoot = getProjectRoot();
  const resolved = resolveActiveAdapter(projectRoot);
  const useNativeCli = resolved.method === 'native-cli';
  const isClaude = resolved.name === 'claude';

  // Steps 0.5-0.7: Claude-specific lockfile cleanup and migrations
  if (isClaude) {
    // Step 0.5: Clean stale lockfiles
    try {
      const { cleanupLegacyLockfiles, cleanupOrphanedChildLocks } = await import('../../utils/cleanup-stale-plugins.js');

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
    } catch (err) {
      logger.debug(`Step 0.5: lockfile cleanup failed: ${err}`);
    }

    // Step 0.6: Migrate bundled entries from project vskill.lock to global plugins-lock.json
    try {
      migrateBundledToGlobalLock(projectRoot);
    } catch (err) {
      logger.debug(`Step 0.6: bundled-to-global migration failed: ${err}`);
    }

    // Step 0.7: Remove satellite plugin entries from lockfiles (post-consolidation cleanup)
    try {
      migrateSatelliteToUnifiedLock(projectRoot);
    } catch (err) {
      logger.debug(`Step 0.7: satellite migration failed: ${err}`);
    }
  }

  log(chalk.blue.bold('\n  SpecWeave Plugin Refresh'));
  if (useNativeCli) {
    log(chalk.blue.bold(`  Mode: native Claude CLI (claude plugin install)\n`));
  } else if (isClaude) {
    log(chalk.blue.bold(`  Mode: direct copy to .claude/skills/\n`));
  } else {
    log(chalk.blue.bold(`  Mode: ${resolved.name} adapter (${resolved.skillsDir})\n`));
  }

  // Step 1: Find specweave root
  const specweaveRoot = resolveSpecweaveRoot();
  if (!specweaveRoot) {
    log(chalk.yellow('Could not find specweave installation'));
    log(chalk.gray('  Ensure specweave is installed globally or run from the specweave project.'));
    return { failed: 1, errors: ['Could not find specweave installation'] };
  }

  const marketplacePath = path.join(specweaveRoot, '.claude-plugin', 'marketplace.json');
  logger.debug(`Found specweave root at ${specweaveRoot}`);

  // Step 2: Read available plugins
  const allPlugins = getAvailablePlugins(marketplacePath);
  if (allPlugins.length === 0) {
    log(chalk.yellow('No plugins found in marketplace.json'));
    return { failed: 0, errors: [] };
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
      return { failed: 1, errors: [`Plugin '${pluginName}' not found in marketplace.json`] };
    }
  } else if (options.all) {
    pluginsToInstall = allPlugins;
  } else {
    pluginsToInstall = allPlugins.filter(p => p.name === CORE_PLUGIN);
  }

  log(chalk.gray(`  Installing ${pluginsToInstall.length} of ${allPlugins.length} plugins`));

  // Step 3: Project root already resolved in Step 0 via resolveActiveAdapter()

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
        logger.warn(`Native install failed for ${plugin.name}, falling back to direct copy`);
        result = copyPluginSkillsToProject(plugin.name, specweaveRoot, projectRoot, { force: options.force });
      }
    } else {
      const copyOptions: { force?: boolean; targetSkillsDir?: string } = { force: options.force };
      if (!isClaude && resolved.skillsDir) {
        copyOptions.targetSkillsDir = resolved.skillsDir;
      }
      result = copyPluginSkillsToProject(plugin.name, specweaveRoot, projectRoot, copyOptions);
    }

    if (result.success && result.skipped) {
      log(chalk.green(`  ✓ ${plugin.name}: active`) + (plugin.version ? chalk.gray(` (v${plugin.version})`) : ''));
      skipped++;
      installedPluginNames.push(plugin.name);
    } else if (result.success) {
      log(chalk.green(`  + ${plugin.name}: installed`) + (plugin.version ? chalk.gray(` (v${plugin.version})`) : ''));
      installed++;
      installedPluginNames.push(plugin.name);
    } else {
      logError(`${plugin.name}: failed`, chalk.red(`  ✗ ${plugin.name}: failed`));
      if (result.error) {
        logError(result.error, chalk.gray(`    ${result.error}`));
      }
      failed++;
    }
  }

  // Step 4b-4d: Claude-only operations (settings enablement, stale cleanup, migration)
  if (isClaude) {
    // Step 4b: Enable plugins in Claude Code settings
    if (installedPluginNames.length > 0) {
      const enabled = enablePluginsInSettings(installedPluginNames);
      if (!enabled) {
        log(chalk.yellow('  ⚠ Could not enable plugins in ~/.claude/settings.json'));
      }
    }

    // Step 4b2: Enable DCI script permissions (project-level)
    try {
      enableDciPermissions(projectRoot);
    } catch {
      log(chalk.yellow('  ⚠ Could not enable DCI permissions (non-critical)'));
    }

    // Step 4b3: Copy DCI scripts to .specweave/scripts/
    try {
      const { installDciScripts } = await import('../helpers/init/dci-scripts-installer.js');
      installDciScripts(projectRoot);
    } catch {
      // Non-critical — DCI blocks use || true for graceful degradation
    }

    // Step 4c: Clean up stale plugin references from settings
    try {
      const cleanupResult = await cleanupStalePlugins(marketplacePath, options.verbose);
      if (cleanupResult.removedCount > 0) {
        log(chalk.green(`  ✓ Cleaned ${cleanupResult.removedCount} stale plugin(s): ${cleanupResult.removedPlugins.join(', ')}`));
      }
    } catch (err) {
      logger.debug(`Step 4c: stale plugin cleanup failed: ${err}`);
    }

    // Step 4d-fix: Clean up any project-level vskill.lock with bundled entries
    //   Older versions wrote bundled state to project lock. Run migration AFTER the
    //   install loop so newly-created project lockfiles (from pre-fix fallback paths
    //   or older specweave versions) are migrated to the global lock.
    try {
      migrateBundledToGlobalLock(projectRoot);
    } catch (err) {
      logger.debug(`Step 4d-fix: post-install bundled-to-global migration failed: ${err}`);
    }

    // Step 4e: Migrate user-level domain plugins to project scope + restore sw@specweave
    try {
      const migrationResult = await migrateUserLevelPlugins(process.cwd(), options.verbose);
      if (migrationResult.migratedCount > 0) {
        log(chalk.green(`  ✓ Migrated ${migrationResult.migratedCount} plugin(s) to project scope: ${migrationResult.migratedPlugins.join(', ')}`));
      }
    } catch (err) {
      logger.debug(`Step 4d: user-level plugin migration failed: ${err}`);
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
  } else if (isClaude) {
    log(chalk.gray(`  Location: .claude/skills/ (project-local)`));
  } else {
    log(chalk.gray(`  Location: ${resolved.skillsDir} (${resolved.name} adapter)`));
  }
  log('');

  if (failed > 0) {
    process.exitCode = 1;
  }

  return { failed, errors };
}
