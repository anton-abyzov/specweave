/**
 * Plugin installation for Claude Code
 *
 * Copies skill files directly into project .claude/skills/ (no CLI dependency).
 * All plugins are installed at init time — no on-demand marketplace lookups.
 *
 * @since 1.0.535 (replaced lazy/CLI-based installation)
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { findSourceDir } from './path-utils.js';
import { copyPluginSkillsToProject, findSpecweaveRoot, migrateSatelliteToUnifiedLock, migrateBundledToGlobalLock } from '../../../utils/plugin-copier.js';
import { getDirname } from '../../../utils/esm-helpers.js';
import { getProjectRoot } from '../../../utils/find-project-root.js';
import { enablePluginsInSettings } from './claude-plugin-enabler.js';

const __dirname = getDirname(import.meta.url);

/**
 * Options for plugin installation
 */
export interface PluginInstallOptions {
  dirname: string;
  forceRefresh?: boolean;
  /** Project root directory (where .claude/ lives). Falls back to getProjectRoot() if not provided. */
  projectRoot?: string;
}

/**
 * Result of plugin installation
 */
export interface PluginInstallResult {
  success: boolean;
  successCount: number;
  failCount: number;
  failedPlugins: string[];
  /** @deprecated No longer used — always false */
  marketplaceOnly?: boolean;
}

/**
 * Install all SpecWeave plugin skills by copying SKILL.md files
 * directly into the project's .claude/skills/ directory.
 *
 * No Claude CLI dependency. No marketplace lookups. No on-demand loading.
 * All skills are available immediately after init.
 *
 * @param options - Installation options
 * @returns Installation result
 */
export async function installAllPlugins(options: PluginInstallOptions): Promise<PluginInstallResult> {
  const { dirname, forceRefresh } = options;
  const spinner = ora();

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

    // Clean satellite plugin entries from lockfiles (post-consolidation)
    try {
      const projectRoot = options.projectRoot || getProjectRoot();
      migrateSatelliteToUnifiedLock(projectRoot);
    } catch {
      // Non-blocking
    }

    // Find specweave root for the plugin copier
    const specweaveRoot = findSpecweaveRoot(__dirname);
    if (!specweaveRoot) {
      console.log(chalk.yellow('  Could not find specweave root directory'));
      return { success: false, successCount: 0, failCount: allPlugins.length, failedPlugins: allPlugins.map((p: { name: string }) => p.name) };
    }

    // Determine project root for .claude/skills/ target
    // Prefer explicit projectRoot (from init's targetDir) over getProjectRoot() fallback
    const projectRoot = options.projectRoot || getProjectRoot();

    // Ensure .claude/skills/ directory exists
    const skillsTargetDir = path.join(projectRoot, '.claude', 'skills');
    fs.mkdirSync(skillsTargetDir, { recursive: true });

    // Install all plugins by copying skills directly
    let successCount = 0;
    let failCount = 0;
    const failedPlugins: string[] = [];

    for (const plugin of allPlugins) {
      const pluginName = plugin.name;
      spinner.start(`Installing ${pluginName}...`);

      const result = copyPluginSkillsToProject(pluginName, specweaveRoot, projectRoot, { force: forceRefresh });

      if (result.success) {
        successCount++;
        if (result.skipped) {
          spinner.succeed(`${pluginName} (up to date)`);
        } else {
          spinner.succeed(`${pluginName} installed`);
        }
      } else {
        failCount++;
        failedPlugins.push(pluginName);
        spinner.warn(`${pluginName} failed: ${result.error || 'unknown'}`);
      }
    }

    // Enable successfully installed plugins in Claude Code settings
    if (successCount > 0) {
      const successfulPluginNames = allPlugins
        .map((p: { name: string }) => p.name)
        .filter((name: string) => !failedPlugins.includes(name));
      const enabled = enablePluginsInSettings(successfulPluginNames);
      if (!enabled) {
        console.log(chalk.yellow('  Could not enable plugins in ~/.claude/settings.json'));
      }
    }

    // Migrate bundled lock entries to global lock (removes project-level vskill.lock)
    if (successCount > 0) {
      try {
        migrateBundledToGlobalLock(projectRoot);
      } catch {
        // Non-blocking — lock cleanup is best-effort
      }
    }

    // Report results
    console.log('');
    console.log(chalk.green.bold('Plugin Installation Complete'));
    console.log(chalk.white(`   Installed: ${successCount}/${allPlugins.length} plugins`));
    // Be honest about EVERY location this writes: telling users the install is
    // "project-local" while rewriting their global Claude config is not okay.
    console.log(chalk.gray(`   Skills:  ${path.join('.claude', 'skills')}${path.sep} (project-local)`));
    console.log(chalk.gray('   Also writes (global, outside this project):'));
    console.log(chalk.gray('     ~/.claude/settings.json        enables the plugins for Claude Code'));
    console.log(chalk.gray('     ~/.specweave/plugins-lock.json records the installed plugin versions'));

    if (failCount > 0) {
      console.log(chalk.yellow(`   Failed: ${failCount} plugins`));
      console.log(chalk.gray(`   Failed plugins: ${failedPlugins.join(', ')}`));
    }

    console.log('');
    console.log(chalk.cyan('Available capabilities:'));
    console.log(chalk.gray('   sw:increment - Plan new features'));
    console.log(chalk.gray('   sw:do - Execute tasks'));
    console.log(chalk.gray('   sw:done - Close an increment'));
    console.log(chalk.gray('   sw:sync - GitHub / Jira / Azure DevOps sync'));
    console.log(chalk.gray('   sw:handoff - Hand work to another AI tool'));
    console.log(chalk.gray('   ...and more!'));

    const corePluginFailed = failedPlugins.includes('sw');
    if (corePluginFailed) {
      console.log(chalk.red.bold('  CRITICAL: Core plugin "sw" failed to install'));
      console.log(chalk.yellow('  SpecWeave will not function correctly without the sw plugin'));
      console.log(chalk.gray('  Run: specweave refresh-plugins --plugin sw --force'));
    }

    return {
      success: successCount > 0 && !corePluginFailed,
      successCount,
      failCount,
      failedPlugins,
      marketplaceOnly: false,
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
    } else {
      // Always show error reason so failures are diagnosable
      console.log(chalk.yellow(`   Reason: ${errorMessage}`));
    }

    console.log('');
    return { success: false, successCount: 0, failCount: 0, failedPlugins: [] };
  }
}
