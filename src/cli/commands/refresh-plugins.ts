/**
 * Refresh SpecWeave Plugins
 *
 * Copies first-party plugins from specweave's bundled plugins/ directory
 * to ~/.claude/commands/<name>/. Uses inline plugin copier (no vskill dependency).
 *
 * Modes:
 *   - Default (lazy): Install only core `sw` plugin
 *   - --all: Install all plugins from marketplace.json
 *   - Hash comparison: Skip plugins whose content hash hasn't changed
 *
 * @since 1.0.279
 */

import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { consoleLogger as logger } from '../../utils/logger.js';
import { getDirname } from '../../utils/esm-helpers.js';
import {
  copyPlugin,
  computePluginHash,
  findSpecweaveRoot,
  readLockfile as readLockfileFromDir,
  writeLockfile as writeLockfileToDir,
  ensureLockfile as ensureLockfileInDir,
} from '../../utils/plugin-copier.js';

const __dirname = getDirname(import.meta.url);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RefreshPluginsOptions {
  verbose?: boolean;
  force?: boolean;
  /** Install ALL plugins (not just core). Default: false (lazy mode - core only). */
  all?: boolean;
}

interface MarketplacePlugin {
  name: string;
  source: string;
  version: string;
  description?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Core plugins that are always installed in lazy mode */
const CORE_PLUGINS = ['sw'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the path to the specweave root directory.
 * Tries multiple strategies for both development and production layouts.
 */
function resolveSpecweaveRoot(): string | null {
  // Strategy 1: Walk up from this file's location
  const fromFile = findSpecweaveRoot(__dirname);
  if (fromFile) return fromFile;

  // Strategy 2: Check known installed marketplace location
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
 * Refresh plugins using inline copier.
 *
 * Default (lazy mode): installs only core `sw` plugin.
 * With --all flag: installs all plugins from marketplace.json.
 * Uses hash comparison to skip unchanged plugins.
 */
export async function refreshPluginsCommand(options: RefreshPluginsOptions = {}): Promise<void> {
  const lazyMode = !(options.all ?? false);

  console.log(chalk.blue.bold('\n  SpecWeave Plugin Refresh'));
  console.log(chalk.blue.bold(`  Mode: ${lazyMode ? 'lazy (core only)' : 'all plugins'}\n`));

  // Step 1: Find specweave root
  const specweaveRoot = resolveSpecweaveRoot();
  if (!specweaveRoot) {
    console.log(chalk.yellow('Could not find specweave installation'));
    console.log(chalk.gray('  Ensure specweave is installed globally or run from the specweave project.'));
    return;
  }

  const marketplacePath = path.join(specweaveRoot, '.claude-plugin', 'marketplace.json');
  logger.debug(`Found specweave root at ${specweaveRoot}`);

  // Step 2: Read available plugins
  const allPlugins = getAvailablePlugins(marketplacePath);
  if (allPlugins.length === 0) {
    console.log(chalk.yellow('No plugins found in marketplace.json'));
    return;
  }

  console.log(chalk.gray(`  Found ${allPlugins.length} plugins in marketplace.json`));

  // Step 3: Determine which plugins to process
  const pluginsToProcess = lazyMode
    ? allPlugins.filter(p => CORE_PLUGINS.includes(p.name))
    : allPlugins;

  // Step 4: Process each plugin
  let installed = 0;
  let skipped = 0;
  let failed = 0;

  for (const plugin of pluginsToProcess) {
    console.log(chalk.blue(`  Installing ${plugin.name}...`));

    const result = copyPlugin(plugin.name, specweaveRoot, {
      force: options.force,
    });

    if (result.success && result.skipped) {
      if (options.verbose) {
        console.log(chalk.gray(`  - ${plugin.name}: unchanged (skipped)`));
      }
      skipped++;
    } else if (result.success) {
      installed++;
      console.log(chalk.green(`  + ${plugin.name} installed`));
    } else {
      failed++;
      console.log(chalk.red(`  x ${plugin.name} failed`));
      if (result.error) {
        console.log(chalk.gray(`    ${result.error}`));
      }
    }
  }

  // Step 5: Summary
  console.log('');
  console.log(chalk.blue.bold('  Summary'));
  console.log(chalk.green(`  Installed: ${installed}`));
  if (skipped > 0) console.log(chalk.gray(`  Skipped (unchanged): ${skipped}`));
  if (failed > 0) console.log(chalk.red(`  Failed: ${failed}`));
  console.log('');

  if (lazyMode) {
    console.log(chalk.cyan('  Lazy mode: Only core plugin installed.'));
    console.log(chalk.gray('  Use --all to install all plugins.'));
  }

  console.log('');
}
