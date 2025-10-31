/**
 * Plugin Manager
 *
 * Central orchestrator for plugin lifecycle management.
 * Handles loading/unloading, dependency resolution, configuration management.
 *
 * @module core/plugin-manager
 * @version 0.4.0
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import { PluginLoader } from './plugin-loader.js';
import type {
  Plugin,
  PluginInfo,
  PluginConfig,
  PluginLoadOptions,
  PluginUnloadOptions,
  PluginDependency
} from './types/plugin.js';
import {
  PluginError,
  PluginDependencyError,
  PluginNotFoundError
} from './types/plugin.js';
import type { IAdapter } from '../adapters/adapter-interface.js';

/**
 * PluginManager - Manages plugin lifecycle and configuration
 */
export class PluginManager {
  private loader: PluginLoader;
  private configPath: string;
  private pluginsDir: string;
  private loadedPlugins: Map<string, Plugin>;

  /**
   * Create a new PluginManager
   *
   * @param projectPath - Path to project root
   * @param pluginsDir - Path to plugins directory (default: src/plugins)
   */
  constructor(
    private projectPath: string = process.cwd(),
    pluginsDir?: string
  ) {
    this.loader = new PluginLoader();
    this.configPath = path.join(projectPath, '.specweave', 'config.yaml');
    this.pluginsDir = pluginsDir || path.join(projectPath, 'src', 'plugins');
    this.loadedPlugins = new Map();
  }

  /**
   * Load (enable) a plugin
   *
   * 1. Load plugin from src/plugins/
   * 2. Check dependencies
   * 3. Install via adapter
   * 4. Update config
   *
   * @param name - Plugin name (e.g., "github", "kubernetes")
   * @param adapter - Adapter to use for installation
   * @param options - Load options
   */
  async loadPlugin(
    name: string,
    adapter: IAdapter,
    options: PluginLoadOptions = {}
  ): Promise<void> {
    console.log(`\n📦 Loading plugin: ${name}...`);

    // Check if already loaded
    if (this.loadedPlugins.has(name) && !options.force) {
      console.log(`ℹ️  Plugin ${name} already loaded`);
      return;
    }

    // Load plugin from disk
    const pluginPath = path.join(this.pluginsDir, name);
    const plugin = await this.loader.loadFromDirectory(pluginPath);

    // Validate plugin integrity
    if (options.validate !== false) {
      const isValid = await this.loader.verifyPlugin(plugin);
      if (!isValid) {
        throw new PluginError(`Plugin ${name} failed integrity check`, name);
      }
    }

    // Check dependencies
    if (!options.skipDependencies) {
      await this.checkDependencies(plugin);
    }

    // Install via adapter
    console.log(`📋 Installing ${name} via ${adapter.name} adapter...`);
    if (adapter.supportsPlugins && adapter.supportsPlugins()) {
      await adapter.compilePlugin(plugin);
    } else {
      console.warn(`⚠️  Adapter ${adapter.name} does not support plugins`);
      throw new PluginError(
        `Adapter ${adapter.name} does not support plugins`,
        name,
        'ADAPTER_NOT_SUPPORTED'
      );
    }

    // Update config
    await this.updateConfig(name, 'enable');

    // Cache loaded plugin
    this.loadedPlugins.set(name, plugin);

    console.log(`✅ Plugin ${name} loaded successfully!`);
    console.log(`   - ${plugin.skills.length} skills`);
    console.log(`   - ${plugin.agents.length} agents`);
    console.log(`   - ${plugin.commands.length} commands`);
  }

  /**
   * Unload (disable) a plugin
   *
   * @param name - Plugin name
   * @param adapter - Adapter to use for uninstallation
   * @param options - Unload options
   */
  async unloadPlugin(
    name: string,
    adapter: IAdapter,
    options: PluginUnloadOptions = {}
  ): Promise<void> {
    console.log(`\n🗑️  Unloading plugin: ${name}...`);

    // Check if plugin is loaded
    if (!this.loadedPlugins.has(name)) {
      console.log(`ℹ️  Plugin ${name} not loaded`);
      return;
    }

    // Check if other plugins depend on this one
    if (!options.force) {
      const dependents = await this.getDependents(name);
      if (dependents.length > 0) {
        throw new PluginDependencyError(
          `Cannot unload ${name}: Required by ${dependents.join(', ')}`,
          name
        );
      }
    }

    // Uninstall via adapter
    if (adapter.supportsPlugins && adapter.supportsPlugins()) {
      await adapter.unloadPlugin(name);
    }

    // Update config
    await this.updateConfig(name, 'disable');

    // Remove from cache
    this.loadedPlugins.delete(name);

    console.log(`✅ Plugin ${name} unloaded`);
  }

  /**
   * Get all available plugins (scan src/plugins/)
   *
   * @returns Array of plugin info
   */
  async getAvailablePlugins(): Promise<PluginInfo[]> {
    const plugins: PluginInfo[] = [];

    // Check if plugins directory exists
    if (!(await fs.pathExists(this.pluginsDir))) {
      return plugins;
    }

    // Get enabled plugins from config
    const enabledPlugins = await this.getEnabledPlugins();

    // Scan plugins directory
    const dirs = await fs.readdir(this.pluginsDir);

    for (const dir of dirs) {
      const pluginPath = path.join(this.pluginsDir, dir);
      const stat = await fs.stat(pluginPath);

      if (stat.isDirectory()) {
        try {
          const metadata = await this.loader.getMetadata(pluginPath);
          plugins.push({
            name: dir,
            version: metadata.version,
            description: metadata.description,
            path: pluginPath,
            enabled: enabledPlugins.includes(dir),
            skillCount: metadata.skillCount,
            agentCount: metadata.agentCount,
            commandCount: metadata.commandCount
          });
        } catch (error: any) {
          console.warn(`⚠️  Failed to load metadata for ${dir}: ${error.message}`);
        }
      }
    }

    return plugins;
  }

  /**
   * Get enabled plugins from config
   *
   * @returns Array of enabled plugin names
   */
  async getEnabledPlugins(): Promise<string[]> {
    const config = await this.loadConfig();
    return config.enabled || [];
  }

  /**
   * Check if a plugin is enabled
   *
   * @param name - Plugin name
   * @returns True if enabled
   */
  async isPluginEnabled(name: string): Promise<boolean> {
    const enabled = await this.getEnabledPlugins();
    return enabled.includes(name);
  }

  /**
   * Update plugin configuration
   *
   * @param name - Plugin name
   * @param action - 'enable' or 'disable'
   */
  private async updateConfig(name: string, action: 'enable' | 'disable'): Promise<void> {
    const config = await this.loadConfig();

    if (action === 'enable') {
      if (!config.enabled.includes(name)) {
        config.enabled.push(name);
      }
    } else {
      config.enabled = config.enabled.filter(p => p !== name);
    }

    await this.saveConfig(config);
  }

  /**
   * Load plugin configuration from .specweave/config.yaml
   *
   * @returns Plugin configuration
   */
  private async loadConfig(): Promise<PluginConfig> {
    // Ensure config directory exists
    const configDir = path.dirname(this.configPath);
    await fs.ensureDir(configDir);

    // Check if config file exists
    if (!(await fs.pathExists(this.configPath))) {
      // Create default config
      const defaultConfig: PluginConfig = {
        enabled: [],
        settings: {}
      };
      await this.saveConfig(defaultConfig);
      return defaultConfig;
    }

    // Read and parse config
    const content = await fs.readFile(this.configPath, 'utf-8');
    const config = yaml.load(content) as any;

    // Ensure plugins section exists
    if (!config.plugins) {
      config.plugins = { enabled: [], settings: {} };
    }

    return config.plugins as PluginConfig;
  }

  /**
   * Save plugin configuration to .specweave/config.yaml
   *
   * @param pluginConfig - Plugin configuration to save
   */
  private async saveConfig(pluginConfig: PluginConfig): Promise<void> {
    // Read full config (if exists)
    let fullConfig: any = {};
    if (await fs.pathExists(this.configPath)) {
      const content = await fs.readFile(this.configPath, 'utf-8');
      fullConfig = yaml.load(content) || {};
    }

    // Update plugins section
    fullConfig.plugins = pluginConfig;

    // Write back
    const yamlContent = yaml.dump(fullConfig, { indent: 2 });
    await fs.writeFile(this.configPath, yamlContent, 'utf-8');
  }

  /**
   * Check plugin dependencies
   *
   * Ensures all required plugins are loaded
   *
   * @param plugin - Plugin to check
   * @throws PluginDependencyError if dependencies are not met
   */
  async checkDependencies(plugin: Plugin): Promise<void> {
    const { dependencies } = plugin.manifest;

    if (!dependencies || !dependencies.plugins) {
      return; // No dependencies
    }

    const enabledPlugins = await this.getEnabledPlugins();
    const missingDeps: string[] = [];

    for (const depName of dependencies.plugins) {
      if (!enabledPlugins.includes(depName)) {
        missingDeps.push(depName);
      }
    }

    if (missingDeps.length > 0) {
      throw new PluginDependencyError(
        `Plugin ${plugin.manifest.name} requires: ${missingDeps.join(', ')}`,
        plugin.manifest.name
      );
    }
  }

  /**
   * Resolve dependency graph for a plugin
   *
   * Returns all plugins that need to be loaded (including transitive deps)
   *
   * @param plugin - Plugin to resolve
   * @returns Array of plugins in load order
   */
  async resolveDependencies(plugin: Plugin): Promise<Plugin[]> {
    const resolved: Plugin[] = [];
    const visited = new Set<string>();

    const resolve = async (p: Plugin) => {
      if (visited.has(p.manifest.name)) {
        return; // Already processed
      }

      visited.add(p.manifest.name);

      // Resolve dependencies first
      if (p.manifest.dependencies?.plugins) {
        for (const depName of p.manifest.dependencies.plugins) {
          const depPath = path.join(this.pluginsDir, depName);
          const depPlugin = await this.loader.loadFromDirectory(depPath);
          await resolve(depPlugin);
        }
      }

      // Add this plugin
      resolved.push(p);
    };

    await resolve(plugin);
    return resolved;
  }

  /**
   * Get plugins that depend on a given plugin
   *
   * @param name - Plugin name
   * @returns Array of dependent plugin names
   */
  private async getDependents(name: string): Promise<string[]> {
    const dependents: string[] = [];
    const availablePlugins = await this.getAvailablePlugins();

    for (const info of availablePlugins) {
      if (info.enabled) {
        const plugin = await this.loader.loadFromDirectory(info.path);
        if (plugin.manifest.dependencies?.plugins?.includes(name)) {
          dependents.push(info.name);
        }
      }
    }

    return dependents;
  }

  /**
   * Validate plugin configuration
   *
   * Checks for circular dependencies, missing plugins, etc.
   *
   * @returns Validation result
   */
  async validateConfig(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const enabledPlugins = await this.getEnabledPlugins();

    // Check if all enabled plugins exist
    for (const name of enabledPlugins) {
      const pluginPath = path.join(this.pluginsDir, name);
      if (!(await fs.pathExists(pluginPath))) {
        errors.push(`Enabled plugin '${name}' not found at ${pluginPath}`);
      }
    }

    // Check for circular dependencies
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = async (name: string): Promise<boolean> => {
      visited.add(name);
      recursionStack.add(name);

      const pluginPath = path.join(this.pluginsDir, name);
      if (!(await fs.pathExists(pluginPath))) {
        return false;
      }

      const plugin = await this.loader.loadFromDirectory(pluginPath);
      const deps = plugin.manifest.dependencies?.plugins || [];

      for (const dep of deps) {
        if (!visited.has(dep)) {
          if (await hasCycle(dep)) {
            return true;
          }
        } else if (recursionStack.has(dep)) {
          errors.push(`Circular dependency detected: ${name} → ${dep}`);
          return true;
        }
      }

      recursionStack.delete(name);
      return false;
    };

    for (const name of enabledPlugins) {
      if (!visited.has(name)) {
        await hasCycle(name);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get plugin by name
   *
   * @param name - Plugin name
   * @returns Loaded plugin
   * @throws PluginNotFoundError if plugin is not loaded
   */
  getPlugin(name: string): Plugin {
    const plugin = this.loadedPlugins.get(name);
    if (!plugin) {
      throw new PluginNotFoundError(name);
    }
    return plugin;
  }

  /**
   * Get all loaded plugins
   *
   * @returns Map of loaded plugins
   */
  getLoadedPlugins(): Map<string, Plugin> {
    return this.loadedPlugins;
  }

  /**
   * Clear loaded plugins cache
   *
   * Useful for testing or forcing reload
   */
  clearCache(): void {
    this.loadedPlugins.clear();
  }
}
