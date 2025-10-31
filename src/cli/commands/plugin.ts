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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * List available and enabled plugins
 */
export async function listPlugins(options: { enabled?: boolean; available?: boolean }): Promise<void> {
  try {
    console.log(chalk.blue('\n📦 SpecWeave Plugins\n'));

    const projectRoot = process.cwd();
    const manager = new PluginManager(projectRoot);

    if (options.enabled || (!options.enabled && !options.available)) {
      // Show enabled plugins
      const enabledPlugins = await manager.getEnabledPlugins();

      console.log(chalk.green('✅ Enabled Plugins:'));
      if (enabledPlugins.length === 0) {
        console.log(chalk.gray('  (none)'));
      } else {
        for (const pluginName of enabledPlugins) {
          try {
            const plugin = manager.getPlugin(pluginName);
            console.log(`  ${chalk.cyan(plugin.manifest.name)} ${chalk.gray(`v${plugin.manifest.version}`)}`);
            console.log(`    ${chalk.gray(plugin.manifest.description)}`);
            console.log(`    ${chalk.gray(`Skills: ${plugin.skills.length}, Agents: ${plugin.agents.length}, Commands: ${plugin.commands.length}`)}`);
          } catch (error) {
            console.log(`  ${chalk.cyan(pluginName)} ${chalk.red('(error loading)')}`);
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

      console.log(chalk.yellow('📚 Available Plugins:'));
      if (disabledPlugins.length === 0) {
        console.log(chalk.gray('  (all enabled)'));
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
      console.log(chalk.magenta('💡 Suggested Plugins (auto-detected):'));
      for (const suggestion of newSuggestions) {
        console.log(`  ${chalk.cyan(suggestion)}`);
      }
      console.log(chalk.gray('\nRun `specweave plugin enable <name>` to enable a plugin'));
    }

  } catch (error) {
    console.error(chalk.red('❌ Error listing plugins:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * Enable a plugin
 */
export async function enablePlugin(pluginName: string, options: { force?: boolean }): Promise<void> {
  try {
    console.log(chalk.blue(`\n🔌 Enabling plugin: ${pluginName}\n`));

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
      console.log(chalk.yellow(`⚠️  Plugin ${pluginName} is already enabled`));
      console.log(chalk.gray('Use --force to reinstall'));
      return;
    }

    // Load and enable plugin
    const loadOptions = {
      force: options.force,
      autoInstallDependencies: true
    };

    await manager.loadPlugin(pluginName, adapter, loadOptions);

    console.log(chalk.green(`\n✅ Plugin ${pluginName} enabled successfully!`));

    // Show what was installed
    try {
      const plugin = manager.getPlugin(pluginName);
      console.log(chalk.gray(`\nInstalled:`));
      if (plugin.skills.length > 0) {
        console.log(chalk.gray(`  Skills: ${plugin.skills.map(s => s.name).join(', ')}`));
      }
      if (plugin.agents.length > 0) {
        console.log(chalk.gray(`  Agents: ${plugin.agents.map(a => a.name).join(', ')}`));
      }
      if (plugin.commands.length > 0) {
        console.log(chalk.gray(`  Commands: ${plugin.commands.map(c => c.name).join(', ')}`));
      }
    } catch (error) {
      // Plugin info not available, skip
    }

    console.log(chalk.gray(`\nPlugin installed to: ${adapter.name === 'claude' ? '.claude/' : 'AGENTS.md'}`));

    if (adapter.name === 'claude') {
      console.log(chalk.yellow('\n⚠️  Restart Claude Code to activate the new plugin'));
    }

  } catch (error) {
    console.error(chalk.red('❌ Error enabling plugin:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * Disable a plugin
 */
export async function disablePlugin(pluginName: string, options: { force?: boolean }): Promise<void> {
  try {
    console.log(chalk.blue(`\n🔌 Disabling plugin: ${pluginName}\n`));

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
      console.log(chalk.yellow(`⚠️  Plugin ${pluginName} is not currently enabled`));
      return;
    }

    // Unload plugin
    const unloadOptions = {
      force: options.force
    };

    await manager.unloadPlugin(pluginName, adapter, unloadOptions);

    console.log(chalk.green(`\n✅ Plugin ${pluginName} disabled successfully!`));

    if (adapter.name === 'claude') {
      console.log(chalk.yellow('\n⚠️  Restart Claude Code to deactivate the plugin'));
    }

  } catch (error) {
    console.error(chalk.red('❌ Error disabling plugin:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * Show detailed plugin information
 */
export async function pluginInfo(pluginName: string): Promise<void> {
  try {
    console.log(chalk.blue(`\n📋 Plugin Information: ${pluginName}\n`));

    const projectRoot = process.cwd();
    const manager = new PluginManager(projectRoot);
    const { PluginLoader } = await import('../../core/plugin-loader.js');

    // Check if plugin exists
    const availablePlugins = await manager.getAvailablePlugins();
    const basicInfo = availablePlugins.find(p => p.name === pluginName);

    if (!basicInfo) {
      console.log(chalk.red(`❌ Plugin ${pluginName} not found`));
      console.log(chalk.gray('\nRun `specweave plugin list --available` to see available plugins'));
      return;
    }

    // Load full plugin to get manifest details
    const loader = new PluginLoader();
    const plugin = await loader.loadFromDirectory(basicInfo.path);
    const manifest = plugin.manifest;

    // Basic info
    console.log(chalk.cyan('Name:'), manifest.name);
    console.log(chalk.cyan('Version:'), manifest.version);
    console.log(chalk.cyan('Description:'), manifest.description);

    if (manifest.author) {
      console.log(chalk.cyan('Author:'), manifest.author);
    }

    if (manifest.license) {
      console.log(chalk.cyan('License:'), manifest.license);
    }

    console.log(chalk.cyan('SpecWeave Core Version:'), manifest.specweave_core_version);

    // Status
    const enabledPlugins = await manager.getEnabledPlugins();
    const isEnabled = enabledPlugins.includes(pluginName);
    console.log(chalk.cyan('Status:'), isEnabled ? chalk.green('✅ Enabled') : chalk.gray('⚪ Disabled'));

    // Provides
    console.log(chalk.cyan('\nProvides:'));
    console.log(`  Skills: ${manifest.provides.skills.length > 0 ? manifest.provides.skills.join(', ') : chalk.gray('(none)')}`);
    console.log(`  Agents: ${manifest.provides.agents.length > 0 ? manifest.provides.agents.join(', ') : chalk.gray('(none)')}`);
    console.log(`  Commands: ${manifest.provides.commands.length > 0 ? manifest.provides.commands.join(', ') : chalk.gray('(none)')}`);

    // Dependencies
    if (manifest.dependencies?.plugins && manifest.dependencies.plugins.length > 0) {
      console.log(chalk.cyan('\nDependencies:'));
      for (const dep of manifest.dependencies.plugins) {
        console.log(`  - ${dep}`);
      }
    }

    // Auto-detection
    if (manifest.auto_detect) {
      console.log(chalk.cyan('\nAuto-Detection Triggers:'));
      if (manifest.auto_detect.files) {
        console.log(`  Files: ${manifest.auto_detect.files.join(', ')}`);
      }
      if (manifest.auto_detect.packages) {
        console.log(`  Packages: ${manifest.auto_detect.packages.join(', ')}`);
      }
      if (manifest.auto_detect.env_vars) {
        console.log(`  Environment Variables: ${manifest.auto_detect.env_vars.join(', ')}`);
      }
      if (manifest.auto_detect.git_remote_pattern) {
        console.log(`  Git Remote Pattern: ${manifest.auto_detect.git_remote_pattern}`);
      }
    }

    // Credits
    if (manifest.credits) {
      console.log(chalk.cyan('\nCredits:'));
      if (manifest.credits.based_on) {
        console.log(`  Based on: ${manifest.credits.based_on}`);
      }
      if (manifest.credits.original_author) {
        console.log(`  Original Author: ${manifest.credits.original_author}`);
      }
      if (manifest.credits.contributors && manifest.credits.contributors.length > 0) {
        console.log(`  Contributors: ${manifest.credits.contributors.join(', ')}`);
      }
    }

    console.log();

  } catch (error) {
    console.error(chalk.red('❌ Error getting plugin info:'), error instanceof Error ? error.message : error);
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
  switch (action) {
    case 'list':
      await listPlugins(options || {});
      break;

    case 'enable':
      if (!pluginName) {
        console.error(chalk.red('❌ Plugin name required for enable command'));
        console.log(chalk.gray('Usage: specweave plugin enable <plugin-name>'));
        process.exit(1);
      }
      await enablePlugin(pluginName, options || {});
      break;

    case 'disable':
      if (!pluginName) {
        console.error(chalk.red('❌ Plugin name required for disable command'));
        console.log(chalk.gray('Usage: specweave plugin disable <plugin-name>'));
        process.exit(1);
      }
      await disablePlugin(pluginName, options || {});
      break;

    case 'info':
      if (!pluginName) {
        console.error(chalk.red('❌ Plugin name required for info command'));
        console.log(chalk.gray('Usage: specweave plugin info <plugin-name>'));
        process.exit(1);
      }
      await pluginInfo(pluginName);
      break;

    default:
      console.error(chalk.red(`❌ Unknown plugin action: ${action}`));
      console.log(chalk.gray('Valid actions: list, enable, disable, info'));
      process.exit(1);
  }
}
