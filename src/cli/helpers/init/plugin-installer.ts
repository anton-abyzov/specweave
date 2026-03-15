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
import { copyPluginSkillsToProject, findSpecweaveRoot } from '../../../utils/plugin-copier.js';
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

    // Find specweave root for the plugin copier
    const specweaveRoot = findSpecweaveRoot(__dirname);
    if (!specweaveRoot) {
      console.log(chalk.yellow('  Could not find specweave root directory'));
      return { success: false, successCount: 0, failCount: allPlugins.length, failedPlugins: allPlugins.map((p: { name: string }) => p.name) };
    }

    // Determine project root for .claude/skills/ target
    const projectRoot = getProjectRoot();

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

    // Report results
    console.log('');
    console.log(chalk.green.bold('Plugin Installation Complete'));
    console.log(chalk.white(`   Installed: ${successCount}/${allPlugins.length} plugins`));
    console.log(chalk.gray(`   Location: .claude/skills/ (project-local)`));

    if (failCount > 0) {
      console.log(chalk.yellow(`   Failed: ${failCount} plugins`));
      console.log(chalk.gray(`   Failed plugins: ${failedPlugins.join(', ')}`));
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
      success: successCount > 0,
      successCount,
      failCount,
      failedPlugins,
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
