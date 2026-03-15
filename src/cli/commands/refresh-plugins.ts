/**
 * Refresh SpecWeave Plugins
 *
 * Copies plugin skills directly into project .claude/skills/.
 * No Claude CLI dependency. No marketplace lookups.
 *
 * @since 1.0.279
 * @updated 1.0.535 - Migrated from CLI-based install to direct file copy
 */

import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { consoleLogger as logger } from '../../utils/logger.js';
import { getDirname } from '../../utils/esm-helpers.js';
import {
  copyPluginSkillsToProject,
  findSpecweaveRoot,
} from '../../utils/plugin-copier.js';
import { getProjectRoot } from '../../utils/find-project-root.js';

const __dirname = getDirname(import.meta.url);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RefreshPluginsOptions {
  verbose?: boolean;
  force?: boolean;
  /** @deprecated All plugins are always installed. Kept for CLI compat. */
  all?: boolean;
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
 * Refresh plugins by copying skills directly into .claude/skills/.
 *
 * Always installs all plugins. Uses hash comparison to skip unchanged ones.
 */
export async function refreshPluginsCommand(options: RefreshPluginsOptions = {}): Promise<void> {
  console.log(chalk.blue.bold('\n  SpecWeave Plugin Refresh'));
  console.log(chalk.blue.bold(`  Mode: direct copy to .claude/skills/\n`));

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

  // Step 3: Determine project root
  const projectRoot = getProjectRoot();

  // Step 4: Process each plugin — direct copy to .claude/skills/
  let installed = 0;
  let skipped = 0;
  let failed = 0;

  for (const plugin of allPlugins) {
    const result = copyPluginSkillsToProject(plugin.name, specweaveRoot, projectRoot, {
      force: options.force,
    });

    if (result.success && result.skipped) {
      console.log(chalk.green(`  ✓ ${plugin.name}: active`));
      skipped++;
    } else if (result.success) {
      console.log(chalk.green(`  + ${plugin.name}: installed`));
      installed++;
    } else {
      console.log(chalk.red(`  ✗ ${plugin.name}: failed`));
      if (result.error) {
        console.log(chalk.gray(`    ${result.error}`));
      }
      failed++;
    }
  }

  // Step 5: Summary
  console.log('');
  console.log(chalk.blue.bold('  Summary'));
  if (installed > 0) console.log(chalk.green(`  Installed: ${installed}`));
  if (skipped > 0) console.log(chalk.green(`  Active: ${skipped}`));
  if (failed > 0) console.log(chalk.red(`  Failed: ${failed}`));
  if (installed === 0 && skipped === 0 && failed === 0) {
    console.log(chalk.gray('  No plugins processed'));
  }
  console.log(chalk.gray(`  Location: .claude/skills/ (project-local)`));
  console.log('');
}
