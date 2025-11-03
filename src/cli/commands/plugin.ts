/**
 * Plugin CLI Command
 *
 * Provides commands for managing SpecWeave plugins:
 * - list: List available and enabled plugins
 * - enable: Enable a plugin
 * - disable: Disable a plugin
 * - info: Show detailed plugin information
 */

import chalk from 'chalk';
import path from 'path';
import { PluginManager } from '../../core/plugin-manager.js';
import { PluginDetector } from '../../core/plugin-detector.js';
import { AdapterLoader } from '../../adapters/adapter-loader.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { getLocaleManager } from '../../core/i18n/locale-manager.js';
import { SupportedLanguage } from '../../core/i18n/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * List available and enabled plugins
 */
export async function listPlugins(options: { enabled?: boolean; available?: boolean; language?: SupportedLanguage }): Promise<void> {
  const locale = getLocaleManager(options.language || 'en');

  try {
    console.log(chalk.blue(`\n${locale.t('cli', 'plugin.list.header')}\n`));

    const projectRoot = process.cwd();
    const manager = new PluginManager(projectRoot);

    if (options.enabled || (!options.enabled && !options.available)) {
      // Show enabled plugins
      const enabledPlugins = await manager.getEnabledPlugins();

      console.log(chalk.green(locale.t('cli', 'plugin.list.enabledHeader')));
      if (enabledPlugins.length === 0) {
        console.log(chalk.gray(`  ${locale.t('cli', 'plugin.list.enabledNone')}`));
      } else {
        for (const pluginName of enabledPlugins) {
          try {
            const plugin = manager.getPlugin(pluginName);
            console.log(`  ${chalk.cyan(plugin.manifest.name)} ${chalk.gray(`v${plugin.manifest.version}`)}`);
            console.log(`    ${chalk.gray(plugin.manifest.description)}`);
            console.log(`    ${chalk.gray(locale.t('cli', 'plugin.list.statsFormat', {
              skills: plugin.skills.length,
              agents: plugin.agents.length,
              commands: plugin.commands.length
            }))}`);
          } catch (error) {
            console.log(`  ${chalk.cyan(pluginName)} ${chalk.red(locale.t('cli', 'plugin.list.errorLoading'))}`);
          }
        }
      }
      console.log();
    }

    if (options.available || (!options.enabled && !options.available)) {
      // Show available plugins
      const availablePlugins = await manager.getAvailablePlugins();
      const enabledPlugins = await manager.getEnabledPlugins();
      const disabledPlugins = availablePlugins.filter(p => !enabledPlugins.includes(p.name));

      console.log(chalk.yellow(locale.t('cli', 'plugin.list.availableHeader')));
      if (disabledPlugins.length === 0) {
        console.log(chalk.gray(`  ${locale.t('cli', 'plugin.list.availableNone')}`));
      } else {
        for (const plugin of disabledPlugins) {
          console.log(`  ${chalk.cyan(plugin.name)} ${chalk.gray(`v${plugin.version}`)}`);
          console.log(`    ${chalk.gray(plugin.description)}`);
        }
      }
      console.log();
    }

    // Show auto-detection suggestions
    const detector = new PluginDetector();
    const detectionResults = await detector.detectFromProject(projectRoot);
    const suggestions = detectionResults.map(r => r.pluginName);
    const enabledPlugins = await manager.getEnabledPlugins();
    const newSuggestions = suggestions.filter(s => !enabledPlugins.includes(s));

    if (newSuggestions.length > 0) {
      console.log(chalk.magenta(locale.t('cli', 'plugin.list.suggestedHeader')));
      for (const suggestion of newSuggestions) {
        console.log(`  ${chalk.cyan(suggestion)}`);
      }
      console.log(chalk.gray(`\n${locale.t('cli', 'plugin.list.enableHint')}`));
    }

  } catch (error) {
    console.error(chalk.red(locale.t('cli', 'plugin.list.errorListing')), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * Enable a plugin
 */
export async function enablePlugin(pluginName: string, options: { force?: boolean; language?: SupportedLanguage }): Promise<void> {
  const locale = getLocaleManager(options.language || 'en');

  try {
    console.log(chalk.blue(`\n${locale.t('cli', 'plugin.enable.enablingPlugin', { name: pluginName })}\n`));

    const projectRoot = process.cwd();
    const adapterLoader = new AdapterLoader();
    const toolName = await adapterLoader.detectTool();
    const adapter = adapterLoader.getAdapter(toolName);

    if (!adapter) {
      throw new Error(`Adapter not found for tool: ${toolName}`);
    }

    const manager = new PluginManager(projectRoot);

    // Check if already enabled
    const enabledPlugins = await manager.getEnabledPlugins();
    if (enabledPlugins.includes(pluginName) && !options.force) {
      console.log(chalk.yellow(locale.t('cli', 'plugin.enable.alreadyEnabled', { name: pluginName })));
      console.log(chalk.gray(locale.t('cli', 'plugin.enable.useForce')));
      return;
    }

    // Load and enable plugin
    const loadOptions = {
      force: options.force,
      autoInstallDependencies: true
    };

    await manager.loadPlugin(pluginName, adapter, loadOptions);

    console.log(chalk.green(`\n${locale.t('cli', 'plugin.enable.success', { name: pluginName })}`));

    // Show what was installed
    try {
      const plugin = manager.getPlugin(pluginName);
      console.log(chalk.gray(`\n${locale.t('cli', 'plugin.enable.installed')}`));
      if (plugin.skills.length > 0) {
        console.log(chalk.gray(`  ${locale.t('cli', 'plugin.enable.skills', { names: plugin.skills.map(s => s.name).join(', ') })}`));
      }
      if (plugin.agents.length > 0) {
        console.log(chalk.gray(`  ${locale.t('cli', 'plugin.enable.agents', { names: plugin.agents.map(a => a.name).join(', ') })}`));
      }
      if (plugin.commands.length > 0) {
        console.log(chalk.gray(`  ${locale.t('cli', 'plugin.enable.commands', { names: plugin.commands.map(c => c.name).join(', ') })}`));
      }
    } catch (error) {
      // Plugin info not available, skip
    }

    console.log(chalk.gray(`\n${locale.t('cli', 'plugin.enable.installedTo', { location: adapter.name === 'claude' ? '.claude/' : 'AGENTS.md' })}`));

    if (adapter.name === 'claude') {
      console.log(chalk.yellow(`\n${locale.t('cli', 'plugin.enable.restartClaude')}`));
    }

  } catch (error) {
    console.error(chalk.red(locale.t('cli', 'plugin.enable.errorEnabling')), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * Disable a plugin
 */
export async function disablePlugin(pluginName: string, options: { force?: boolean; language?: SupportedLanguage }): Promise<void> {
  const locale = getLocaleManager(options.language || 'en');

  try {
    console.log(chalk.blue(`\n${locale.t('cli', 'plugin.disable.disablingPlugin', { name: pluginName })}\n`));

    const projectRoot = process.cwd();
    const adapterLoader = new AdapterLoader();
    const toolName = await adapterLoader.detectTool();
    const adapter = adapterLoader.getAdapter(toolName);

    if (!adapter) {
      throw new Error(`Adapter not found for tool: ${toolName}`);
    }

    const manager = new PluginManager(projectRoot);

    // Check if enabled
    const enabledPlugins = await manager.getEnabledPlugins();
    if (!enabledPlugins.includes(pluginName)) {
      console.log(chalk.yellow(locale.t('cli', 'plugin.disable.notEnabled', { name: pluginName })));
      return;
    }

    // Unload plugin
    const unloadOptions = {
      force: options.force
    };

    await manager.unloadPlugin(pluginName, adapter, unloadOptions);

    console.log(chalk.green(`\n${locale.t('cli', 'plugin.disable.success', { name: pluginName })}`));

    if (adapter.name === 'claude') {
      console.log(chalk.yellow(`\n${locale.t('cli', 'plugin.disable.restartClaude')}`));
    }

  } catch (error) {
    console.error(chalk.red(locale.t('cli', 'plugin.disable.errorDisabling')), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * Show detailed plugin information
 */
export async function pluginInfo(pluginName: string, options?: { language?: SupportedLanguage }): Promise<void> {
  const locale = getLocaleManager(options?.language || 'en');

  try {
    console.log(chalk.blue(`\n${locale.t('cli', 'plugin.info.header', { name: pluginName })}\n`));

    const projectRoot = process.cwd();
    const manager = new PluginManager(projectRoot);
    const { PluginLoader } = await import('../../core/plugin-loader.js');

    // Check if plugin exists
    const availablePlugins = await manager.getAvailablePlugins();
    const basicInfo = availablePlugins.find(p => p.name === pluginName);

    if (!basicInfo) {
      console.log(chalk.red(locale.t('cli', 'plugin.info.notFound', { name: pluginName })));
      console.log(chalk.gray(`\n${locale.t('cli', 'plugin.info.listHint')}`));
      return;
    }

    // Load full plugin to get manifest details
    const loader = new PluginLoader();
    const plugin = await loader.loadFromDirectory(basicInfo.path);
    const manifest = plugin.manifest;

    // Basic info
    console.log(chalk.cyan(locale.t('cli', 'plugin.info.name')), manifest.name);
    console.log(chalk.cyan(locale.t('cli', 'plugin.info.version')), manifest.version);
    console.log(chalk.cyan(locale.t('cli', 'plugin.info.description')), manifest.description);

    if (manifest.author) {
      console.log(chalk.cyan(locale.t('cli', 'plugin.info.author')), manifest.author);
    }

    if (manifest.license) {
      console.log(chalk.cyan(locale.t('cli', 'plugin.info.license')), manifest.license);
    }

    console.log(chalk.cyan(locale.t('cli', 'plugin.info.coreVersion')), manifest.specweave_core_version);

    // Status
    const enabledPlugins = await manager.getEnabledPlugins();
    const isEnabled = enabledPlugins.includes(pluginName);
    console.log(chalk.cyan(locale.t('cli', 'plugin.info.status')), isEnabled ? chalk.green(locale.t('cli', 'plugin.info.statusEnabled')) : chalk.gray(locale.t('cli', 'plugin.info.statusDisabled')));

    // Provides
    console.log(chalk.cyan(`\n${locale.t('cli', 'plugin.info.provides')}`));
    const noneValue = chalk.gray(locale.t('cli', 'plugin.info.noneValue'));
    console.log(`  ${locale.t('cli', 'plugin.info.skillsFormat', { skills: manifest.provides.skills.length > 0 ? manifest.provides.skills.join(', ') : noneValue })}`);
    console.log(`  ${locale.t('cli', 'plugin.info.agentsFormat', { agents: manifest.provides.agents.length > 0 ? manifest.provides.agents.join(', ') : noneValue })}`);
    console.log(`  ${locale.t('cli', 'plugin.info.commandsFormat', { commands: manifest.provides.commands.length > 0 ? manifest.provides.commands.join(', ') : noneValue })}`);

    // Dependencies
    if (manifest.dependencies?.plugins && manifest.dependencies.plugins.length > 0) {
      console.log(chalk.cyan(`\n${locale.t('cli', 'plugin.info.dependencies')}`));
      for (const dep of manifest.dependencies.plugins) {
        console.log(`  - ${dep}`);
      }
    }

    // Auto-detection
    if (manifest.auto_detect) {
      console.log(chalk.cyan(`\n${locale.t('cli', 'plugin.info.autoDetect')}`));
      if (manifest.auto_detect.files) {
        console.log(`  ${locale.t('cli', 'plugin.info.autoDetectFiles', { files: manifest.auto_detect.files.join(', ') })}`);
      }
      if (manifest.auto_detect.packages) {
        console.log(`  ${locale.t('cli', 'plugin.info.autoDetectPackages', { packages: manifest.auto_detect.packages.join(', ') })}`);
      }
      if (manifest.auto_detect.env_vars) {
        console.log(`  ${locale.t('cli', 'plugin.info.autoDetectEnv', { env: manifest.auto_detect.env_vars.join(', ') })}`);
      }
      if (manifest.auto_detect.git_remote_pattern) {
        console.log(`  ${locale.t('cli', 'plugin.info.autoDetectGit', { pattern: manifest.auto_detect.git_remote_pattern })}`);
      }
    }

    // Credits
    if (manifest.credits) {
      console.log(chalk.cyan(`\n${locale.t('cli', 'plugin.info.credits')}`));
      if (manifest.credits.based_on) {
        console.log(`  ${locale.t('cli', 'plugin.info.basedOn', { source: manifest.credits.based_on })}`);
      }
      if (manifest.credits.original_author) {
        console.log(`  ${locale.t('cli', 'plugin.info.originalAuthor', { author: manifest.credits.original_author })}`);
      }
      if (manifest.credits.contributors && manifest.credits.contributors.length > 0) {
        console.log(`  ${locale.t('cli', 'plugin.info.contributors', { contributors: manifest.credits.contributors.join(', ') })}`);
      }
    }

    console.log();

  } catch (error) {
    console.error(chalk.red(locale.t('cli', 'plugin.info.errorGettingInfo')), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * Main plugin command handler
 */
export async function pluginCommand(
  action: 'list' | 'enable' | 'disable' | 'info',
  pluginName?: string,
  options?: any
): Promise<void> {
  const locale = getLocaleManager(options?.language || 'en');

  switch (action) {
    case 'list':
      await listPlugins(options || {});
      break;

    case 'enable':
      if (!pluginName) {
        console.error(chalk.red(locale.t('cli', 'plugin.errors.nameRequired', { command: 'enable' })));
        console.log(chalk.gray(locale.t('cli', 'plugin.errors.usageEnable')));
        process.exit(1);
      }
      await enablePlugin(pluginName, options || {});
      break;

    case 'disable':
      if (!pluginName) {
        console.error(chalk.red(locale.t('cli', 'plugin.errors.nameRequired', { command: 'disable' })));
        console.log(chalk.gray(locale.t('cli', 'plugin.errors.usageDisable')));
        process.exit(1);
      }
      await disablePlugin(pluginName, options || {});
      break;

    case 'info':
      if (!pluginName) {
        console.error(chalk.red(locale.t('cli', 'plugin.errors.nameRequired', { command: 'info' })));
        console.log(chalk.gray(locale.t('cli', 'plugin.errors.usageInfo')));
        process.exit(1);
      }
      await pluginInfo(pluginName, options);
      break;

    default:
      console.error(chalk.red(locale.t('cli', 'plugin.errors.unknownAction', { action })));
      console.log(chalk.gray(locale.t('cli', 'plugin.errors.validActions')));
      process.exit(1);
  }
}
