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
 * Refresh plugins using the best available installation method.
 *
 * When Claude Code CLI is available, uses native `claude plugin install` for
 * proper marketplace registration, scope management, and settings enablement.
 * Falls back to direct file copy when CLI is unavailable.
 *
 * Always installs all plugins. Uses hash comparison to skip unchanged ones.
 */
export async function refreshPluginsCommand(options: RefreshPluginsOptions = {}): Promise<void> {
  // Step 0: Detect Claude CLI for native install support.
  // Wrapped in try-catch because detectClaudeCli() spawns child processes
  // (which, claude --version, claude plugin --help) that could fail unexpectedly.
  let useNativeCli = false;
  try {
    const cliStatus = detectClaudeCli();
    useNativeCli = cliStatus.available && cliStatus.pluginCommandsWork;
  } catch {
    // CLI detection failed — fall back to direct copy silently
    logger.debug('Claude CLI detection failed, falling back to direct copy');
  }

  console.log(chalk.blue.bold('\n  SpecWeave Plugin Refresh'));
  if (useNativeCli) {
    console.log(chalk.blue.bold(`  Mode: native Claude CLI (claude plugin install)\n`));
  } else {
    console.log(chalk.blue.bold(`  Mode: direct copy to .claude/skills/\n`));
  }

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

  // Step 3: Determine project root (always needed — fallback copy uses it,
  // and installPlugin() calls getProjectRoot() internally for the lockfile)
  const projectRoot = getProjectRoot();

  // Step 4: Process each plugin
  let installed = 0;
  let skipped = 0;
  let failed = 0;
  const installedPluginNames: string[] = [];

  for (const plugin of allPlugins) {
    let result;

    if (useNativeCli) {
      // Try native install first; fall back to direct copy if it fails
      result = installPlugin(plugin.name, specweaveRoot, { force: options.force });
      if (!result.success) {
        logger.debug(`Native install failed for ${plugin.name}, trying direct copy`);
        result = copyPluginSkillsToProject(plugin.name, specweaveRoot, projectRoot, { force: options.force });
      }
    } else {
      result = copyPluginSkillsToProject(plugin.name, specweaveRoot, projectRoot, { force: options.force });
    }

    if (result.success && result.skipped) {
      console.log(chalk.green(`  ✓ ${plugin.name}: active`));
      skipped++;
      installedPluginNames.push(plugin.name);
    } else if (result.success) {
      console.log(chalk.green(`  + ${plugin.name}: installed`));
      installed++;
      installedPluginNames.push(plugin.name);
    } else {
      console.log(chalk.red(`  ✗ ${plugin.name}: failed`));
      if (result.error) {
        console.log(chalk.gray(`    ${result.error}`));
      }
      failed++;
    }
  }

  // Step 4b: Enable plugins in Claude Code settings (native mode only)
  if (useNativeCli && installedPluginNames.length > 0) {
    const enabled = enablePluginsInSettings(installedPluginNames);
    if (!enabled) {
      console.log(chalk.yellow('  ⚠ Could not enable plugins in ~/.claude/settings.json'));
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
  if (useNativeCli) {
    console.log(chalk.gray(`  Location: ~/.claude/plugins/cache/ (native)`));
  } else {
    console.log(chalk.gray(`  Location: .claude/skills/ (project-local)`));
  }
  console.log('');
}
