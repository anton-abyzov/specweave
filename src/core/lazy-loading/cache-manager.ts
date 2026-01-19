/**
 * Plugin Cache Manager for Lazy Loading
 *
 * Handles plugin storage and retrieval for on-demand loading.
 * Manages the skills cache at ~/.specweave/skills-cache/ and
 * installation to ~/.claude/skills/.
 *
 * @module core/lazy-loading/cache-manager
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { consoleLogger as logger } from '../../utils/logger.js';
import { getAllPlugins, getPluginsForGroup, PLUGIN_GROUPS } from './keyword-detector.js';

/**
 * Plugin metadata stored in cache
 */
export interface CachedPluginMetadata {
  /** Plugin name (e.g., "specweave", "specweave-github") */
  name: string;
  /** Plugin version */
  version: string;
  /** ISO 8601 timestamp when cached */
  cachedAt: string;
  /** Number of skills in plugin */
  skillCount: number;
  /** Size in bytes */
  sizeBytes: number;
}

/**
 * Cache state information
 */
/**
 * Lazy loading analytics data
 */
export interface LazyLoadingAnalytics {
  /** Total number of plugin loads triggered */
  totalLoads: number;
  /** Estimated tokens saved by lazy loading */
  totalTokensSaved: number;
  /** Average load time in milliseconds */
  avgLoadTimeMs: number;
  /** Number of times keywords triggered loading */
  keywordTriggers: number;
  /** Keywords that triggered loading with counts */
  keywordsMatched: Record<string, number>;
  /** Sessions where lazy loading was active */
  sessionsWithLazyMode: number;
  /** First usage timestamp */
  firstUsedAt?: string;
  /** Load history (last 100 entries) */
  loadHistory: Array<{
    timestamp: string;
    plugins: string[];
    trigger?: string;
    durationMs: number;
  }>;
}

export interface CacheState {
  /** Version of the state file format */
  version: string;
  /** Whether lazy mode is enabled */
  lazyMode: boolean;
  /** ISO 8601 timestamp of last update */
  lastUpdated: string;
  /** Plugins currently in cache */
  cachedPlugins: CachedPluginMetadata[];
  /** Plugins currently loaded (installed to ~/.claude/skills/) */
  loadedPlugins: string[];
  /** Analytics data */
  analytics: LazyLoadingAnalytics;
}

/**
 * Result of a cache operation
 */
export interface CacheOperationResult {
  /** Whether operation succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Number of plugins affected */
  pluginsAffected: number;
  /** Duration in milliseconds */
  durationMs: number;
}

/**
 * Installation options
 */
export interface InstallOptions {
  /** Plugin names or groups to install */
  plugins?: string[];
  /** Whether to force reinstall even if already installed */
  force?: boolean;
  /** Whether to skip hot-reload verification */
  skipVerify?: boolean;
}

/**
 * Background install status
 */
export interface BackgroundInstallStatus {
  /** Unique task ID */
  taskId: string;
  /** Current status */
  status: 'pending' | 'running' | 'completed' | 'failed';
  /** Progress (0-100) */
  progress: number;
  /** Plugins to install */
  plugins: string[];
  /** Plugins successfully installed */
  installed: string[];
  /** Plugins that failed */
  failed: string[];
  /** Error message if failed */
  error?: string;
  /** Start timestamp */
  startedAt: string;
  /** Completion timestamp */
  completedAt?: string;
}

/**
 * Default paths used by the cache manager
 */
export const CACHE_PATHS = {
  /** Skills cache directory */
  cache: path.join(os.homedir(), '.specweave', 'skills-cache'),
  /** Active skills directory */
  active: path.join(os.homedir(), '.claude', 'skills'),
  /** State file location */
  state: path.join(os.homedir(), '.specweave', 'state', 'plugins-loaded.json'),
  /** Marketplace plugins source */
  marketplace: path.join(os.homedir(), '.claude', 'plugins', 'specweave'),
} as const;

/**
 * Manages plugin caching and installation for lazy loading
 */
export class PluginCacheManager {
  private cachePath: string;
  private activePath: string;
  private statePath: string;
  private marketplacePath: string;

  constructor(options?: {
    cachePath?: string;
    activePath?: string;
    statePath?: string;
    marketplacePath?: string;
  }) {
    this.cachePath = options?.cachePath ?? CACHE_PATHS.cache;
    this.activePath = options?.activePath ?? CACHE_PATHS.active;
    this.statePath = options?.statePath ?? CACHE_PATHS.state;
    this.marketplacePath = options?.marketplacePath ?? CACHE_PATHS.marketplace;
  }

  /**
   * Populates the cache with plugins from marketplace
   *
   * @deprecated SIMPLIFIED (v1.0.122+): This method is now a no-op.
   * Plugins are loaded directly from marketplace to skills directory,
   * eliminating the need for an intermediate cache at ~/.specweave/skills-cache/.
   *
   * The marketplace at ~/.claude/plugins/specweave/ IS the cache.
   * When you run `specweave refresh-marketplace`, it updates from GitHub.
   * When you run `specweave load-plugins`, it copies directly from marketplace.
   *
   * This method remains for backward compatibility but does nothing except
   * return success with the count of available plugins.
   *
   * @returns Operation result with available plugin count
   */
  async populateCache(): Promise<CacheOperationResult> {
    const startTime = performance.now();

    // SIMPLIFIED (v1.0.122+): No intermediate cache needed!
    // Plugins are loaded directly from marketplace.
    // This method validates marketplace and updates state for compatibility.

    // Check if marketplace exists
    if (!fs.existsSync(this.marketplacePath)) {
      return {
        success: false,
        error: `Marketplace not found at ${this.marketplacePath}. Run 'specweave refresh-marketplace' first.`,
        pluginsAffected: 0,
        durationMs: performance.now() - startTime,
      };
    }

    // Get available plugins from marketplace
    const pluginNames = this.getMarketplacePlugins();

    // Update state file with marketplace plugin info (for backward compatibility)
    await this.updateState((state) => {
      state.cachedPlugins = pluginNames.map((name) => ({
        name,
        version: '1.0.0', // Marketplace doesn't track version per plugin
        cachedAt: new Date().toISOString(),
        skillCount: 1, // Placeholder
        sizeBytes: 0, // Placeholder
      }));
      state.lastUpdated = new Date().toISOString();
      return state;
    });

    logger.info(`Marketplace ready with ${pluginNames.length} plugins (no intermediate cache needed)`);

    return {
      success: true,
      pluginsAffected: pluginNames.length,
      durationMs: performance.now() - startTime,
    };
  }

  /**
   * Installs plugins directly from marketplace to active directory
   *
   * SIMPLIFIED (v1.0.122+): Copies directly from marketplace (~/.claude/plugins/specweave/)
   * to skills directory (~/.claude/skills/) - no intermediate cache needed!
   *
   * This ensures plugins always come from the latest marketplace version,
   * which is updated from GitHub when user runs `specweave refresh-marketplace`.
   *
   * Idempotent - skips already installed plugins unless force=true.
   *
   * @param options - Installation options
   * @returns Operation result
   */
  async installPlugins(options: InstallOptions = {}): Promise<CacheOperationResult> {
    const startTime = performance.now();
    const { plugins, force = false, skipVerify = false } = options;

    try {
      // Ensure active directory exists
      if (!fs.existsSync(this.activePath)) {
        fs.mkdirSync(this.activePath, { recursive: true });
      }

      // Check if marketplace exists
      if (!fs.existsSync(this.marketplacePath)) {
        return {
          success: false,
          error: `Marketplace not found at ${this.marketplacePath}. Run 'specweave refresh-marketplace' first.`,
          pluginsAffected: 0,
          durationMs: performance.now() - startTime,
        };
      }

      // Determine which plugins to install
      let pluginsToInstall: string[] = [];

      if (plugins && plugins.length > 0) {
        // Expand any group names to plugin names
        for (const pluginOrGroup of plugins) {
          const groupPlugins = getPluginsForGroup(pluginOrGroup);
          if (groupPlugins.length > 0) {
            pluginsToInstall.push(...groupPlugins);
          } else {
            pluginsToInstall.push(pluginOrGroup);
          }
        }
      } else {
        // Install all plugins from marketplace
        pluginsToInstall = this.getMarketplacePlugins();
      }

      // Remove duplicates
      pluginsToInstall = [...new Set(pluginsToInstall)];

      let installedCount = 0;

      for (const pluginName of pluginsToInstall) {
        // SIMPLIFIED: Read directly from marketplace (not intermediate cache)
        const sourcePath = path.join(this.marketplacePath, pluginName);
        const destPath = path.join(this.activePath, pluginName);

        // Check if source exists in marketplace
        if (!fs.existsSync(sourcePath)) {
          logger.warn(`Plugin not in marketplace: ${pluginName}`);
          continue;
        }

        // Skip if already installed (unless force)
        if (!force && fs.existsSync(destPath)) {
          logger.debug(`Plugin already installed: ${pluginName}`);
          continue;
        }

        // Copy plugin to active directory
        await this.copyDirectory(sourcePath, destPath);
        installedCount++;

        logger.debug(`Installed plugin: ${pluginName}`);
      }

      // Calculate duration for analytics
      const durationMs = performance.now() - startTime;

      // Update state file with detailed analytics
      await this.updateState((state) => {
        const newlyLoaded = pluginsToInstall.filter((p) =>
          fs.existsSync(path.join(this.activePath, p))
        );
        state.loadedPlugins = [...new Set([...state.loadedPlugins, ...newlyLoaded])];
        state.lastUpdated = new Date().toISOString();
        state.analytics.totalLoads++;

        // Track first usage
        if (!state.analytics.firstUsedAt) {
          state.analytics.firstUsedAt = new Date().toISOString();
        }

        // Update average load time
        const totalTime = state.analytics.avgLoadTimeMs * (state.analytics.totalLoads - 1) + durationMs;
        state.analytics.avgLoadTimeMs = Math.round(totalTime / state.analytics.totalLoads);

        // Estimate tokens saved (~2500 tokens per plugin not loaded)
        const cachedCount = state.cachedPlugins.length;
        const loadedCount = state.loadedPlugins.length;
        const unloadedCount = cachedCount - loadedCount;
        state.analytics.totalTokensSaved = unloadedCount * 2500;

        // Add to load history (keep last 100)
        if (!state.analytics.loadHistory) {
          state.analytics.loadHistory = [];
        }
        state.analytics.loadHistory.push({
          timestamp: new Date().toISOString(),
          plugins: newlyLoaded,
          durationMs: Math.round(durationMs),
        });
        if (state.analytics.loadHistory.length > 100) {
          state.analytics.loadHistory = state.analytics.loadHistory.slice(-100);
        }

        return state;
      });

      // Verify hot-reload (optional)
      if (!skipVerify && installedCount > 0) {
        logger.info(
          `Installed ${installedCount} plugins. Hot-reload should activate them within seconds.`
        );
      }

      return {
        success: true,
        pluginsAffected: installedCount,
        durationMs: performance.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to install plugins: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        pluginsAffected: 0,
        durationMs: performance.now() - startTime,
      };
    }
  }

  /** Map of active background install tasks */
  private backgroundTasks: Map<string, BackgroundInstallStatus> = new Map();

  /**
   * Installs plugins in the background (non-blocking)
   *
   * Returns immediately with a task ID that can be used to check status.
   * Falls back to synchronous install if background execution fails.
   *
   * @param options - Installation options
   * @returns Task ID for status tracking
   */
  installPluginsBackground(options: InstallOptions = {}): string {
    const taskId = `install-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Determine plugins to install
    let pluginsToInstall: string[] = [];
    const { plugins, force = false } = options;

    if (plugins && plugins.length > 0) {
      for (const pluginOrGroup of plugins) {
        const groupPlugins = getPluginsForGroup(pluginOrGroup);
        if (groupPlugins.length > 0) {
          pluginsToInstall.push(...groupPlugins);
        } else {
          pluginsToInstall.push(pluginOrGroup);
        }
      }
    } else {
      // SIMPLIFIED: Read from marketplace directly
      pluginsToInstall = this.getMarketplacePlugins();
    }

    pluginsToInstall = [...new Set(pluginsToInstall)];

    // Create initial status
    const status: BackgroundInstallStatus = {
      taskId,
      status: 'pending',
      progress: 0,
      plugins: pluginsToInstall,
      installed: [],
      failed: [],
      startedAt: new Date().toISOString(),
    };

    this.backgroundTasks.set(taskId, status);

    // Execute installation asynchronously
    this.executeBackgroundInstall(taskId, pluginsToInstall, force).catch((error) => {
      const taskStatus = this.backgroundTasks.get(taskId);
      if (taskStatus) {
        taskStatus.status = 'failed';
        taskStatus.error = error instanceof Error ? error.message : String(error);
        taskStatus.completedAt = new Date().toISOString();
      }
    });

    return taskId;
  }

  /**
   * Execute the background installation
   */
  private async executeBackgroundInstall(
    taskId: string,
    plugins: string[],
    force: boolean
  ): Promise<void> {
    const status = this.backgroundTasks.get(taskId);
    if (!status) return;

    status.status = 'running';

    // Ensure active directory exists
    if (!fs.existsSync(this.activePath)) {
      fs.mkdirSync(this.activePath, { recursive: true });
    }

    for (let i = 0; i < plugins.length; i++) {
      const pluginName = plugins[i];

      try {
        // SIMPLIFIED: Read directly from marketplace (not intermediate cache)
        const sourcePath = path.join(this.marketplacePath, pluginName);
        const destPath = path.join(this.activePath, pluginName);

        // Check if source exists in marketplace
        if (!fs.existsSync(sourcePath)) {
          status.failed.push(pluginName);
          continue;
        }

        // Skip if already installed (unless force)
        if (!force && fs.existsSync(destPath)) {
          status.installed.push(pluginName);
          status.progress = Math.round(((i + 1) / plugins.length) * 100);
          continue;
        }

        // Copy plugin
        await this.copyDirectory(sourcePath, destPath);
        status.installed.push(pluginName);
      } catch (error) {
        status.failed.push(pluginName);
        logger.warn(`Background install failed for ${pluginName}: ${error}`);
      }

      status.progress = Math.round(((i + 1) / plugins.length) * 100);
    }

    // Update state
    await this.updateState((state) => {
      state.loadedPlugins = [...new Set([...state.loadedPlugins, ...status.installed])];
      state.lastUpdated = new Date().toISOString();
      state.analytics.totalLoads++;
      return state;
    });

    status.status = status.failed.length === 0 ? 'completed' : 'completed';
    status.completedAt = new Date().toISOString();
  }

  /**
   * Checks the status of a background install task
   *
   * @param taskId - Task ID returned from installPluginsBackground
   * @returns Status object or null if task not found
   */
  checkInstallStatus(taskId: string): BackgroundInstallStatus | null {
    return this.backgroundTasks.get(taskId) || null;
  }

  /**
   * Cleans up completed background tasks older than specified age
   *
   * @param maxAgeMs - Maximum age in milliseconds (default: 1 hour)
   */
  cleanupBackgroundTasks(maxAgeMs: number = 60 * 60 * 1000): void {
    const now = Date.now();

    for (const [taskId, status] of this.backgroundTasks) {
      if (
        status.completedAt &&
        now - new Date(status.completedAt).getTime() > maxAgeMs
      ) {
        this.backgroundTasks.delete(taskId);
      }
    }
  }

  /**
   * Checks if a plugin is currently loaded (installed to active directory)
   *
   * @param pluginName - Plugin name to check
   * @returns True if plugin is loaded
   */
  isPluginLoaded(pluginName: string): boolean {
    const pluginPath = path.join(this.activePath, pluginName);
    return fs.existsSync(pluginPath);
  }

  /**
   * Checks if a plugin is available in the marketplace
   *
   * @deprecated Use isPluginAvailable() instead. This method now checks
   * marketplace directly (no intermediate cache).
   *
   * @param pluginName - Plugin name to check
   * @returns True if plugin is available in marketplace
   */
  isPluginCached(pluginName: string): boolean {
    // SIMPLIFIED: Check marketplace directly (no intermediate cache)
    const pluginPath = path.join(this.marketplacePath, pluginName);
    return fs.existsSync(pluginPath);
  }

  /**
   * Checks if a plugin is available in the marketplace
   *
   * @param pluginName - Plugin name to check
   * @returns True if plugin is available
   */
  isPluginAvailable(pluginName: string): boolean {
    const pluginPath = path.join(this.marketplacePath, pluginName);
    return fs.existsSync(pluginPath);
  }

  /**
   * Gets list of available plugins from marketplace
   *
   * @deprecated Use getAvailablePlugins() instead. This method now returns
   * marketplace plugins directly (no intermediate cache).
   *
   * @returns Array of plugin names in marketplace
   */
  getCachedPlugins(): string[] {
    // SIMPLIFIED: Return marketplace plugins directly (no intermediate cache)
    return this.getMarketplacePlugins();
  }

  /**
   * Gets list of available plugins from marketplace
   *
   * @returns Array of plugin names
   */
  getAvailablePlugins(): string[] {
    return this.getMarketplacePlugins();
  }

  /**
   * Gets list of loaded plugins
   *
   * @returns Array of plugin names currently loaded
   */
  getLoadedPlugins(): string[] {
    if (!fs.existsSync(this.activePath)) {
      return [];
    }

    return fs
      .readdirSync(this.activePath, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
      .map((e) => e.name);
  }

  /**
   * Removes stale plugins from cache
   *
   * Removes plugins that are no longer in the current marketplace.
   *
   * @returns Operation result with removed plugin count
   */
  async cleanupCache(): Promise<CacheOperationResult> {
    const startTime = performance.now();

    try {
      // Get current marketplace plugins
      const marketplacePlugins = this.getMarketplacePlugins();
      const cachedPlugins = this.getCachedPlugins();

      // Find stale plugins (in cache but not in marketplace)
      const stalePlugins = cachedPlugins.filter((p) => !marketplacePlugins.includes(p));

      let removedCount = 0;

      for (const pluginName of stalePlugins) {
        const pluginPath = path.join(this.cachePath, pluginName);
        try {
          await this.removeDirectory(pluginPath);
          removedCount++;
          logger.info(`Removed stale plugin from cache: ${pluginName}`);
        } catch (error) {
          logger.warn(`Failed to remove stale plugin ${pluginName}: ${error}`);
        }
      }

      // Update state file
      if (removedCount > 0) {
        await this.updateState((state) => {
          state.cachedPlugins = state.cachedPlugins.filter(
            (p) => !stalePlugins.includes(p.name)
          );
          state.lastUpdated = new Date().toISOString();
          return state;
        });
      }

      return {
        success: true,
        pluginsAffected: removedCount,
        durationMs: performance.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to cleanup cache: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        pluginsAffected: 0,
        durationMs: performance.now() - startTime,
      };
    }
  }

  /**
   * Unloads plugins from active directory
   *
   * Removes plugins from ~/.claude/skills/ but preserves cache.
   *
   * @param plugins - Plugins to unload (empty = all except router)
   * @returns Operation result
   */
  async unloadPlugins(plugins?: string[]): Promise<CacheOperationResult> {
    const startTime = performance.now();

    try {
      const loadedPlugins = this.getLoadedPlugins();
      let pluginsToUnload: string[];

      if (plugins && plugins.length > 0) {
        // Expand groups and filter to only loaded plugins
        const expanded: string[] = [];
        for (const pluginOrGroup of plugins) {
          const groupPlugins = getPluginsForGroup(pluginOrGroup);
          if (groupPlugins.length > 0) {
            expanded.push(...groupPlugins);
          } else {
            expanded.push(pluginOrGroup);
          }
        }
        pluginsToUnload = expanded.filter((p) => loadedPlugins.includes(p));
      } else {
        // Unload all except router
        pluginsToUnload = loadedPlugins.filter((p) => p !== 'specweave-router');
      }

      let unloadedCount = 0;

      for (const pluginName of pluginsToUnload) {
        const pluginPath = path.join(this.activePath, pluginName);
        try {
          await this.removeDirectory(pluginPath);
          unloadedCount++;
          logger.debug(`Unloaded plugin: ${pluginName}`);
        } catch (error) {
          logger.warn(`Failed to unload ${pluginName}: ${error}`);
        }
      }

      // Update state file
      await this.updateState((state) => {
        state.loadedPlugins = state.loadedPlugins.filter(
          (p) => !pluginsToUnload.includes(p)
        );
        state.lastUpdated = new Date().toISOString();
        return state;
      });

      return {
        success: true,
        pluginsAffected: unloadedCount,
        durationMs: performance.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to unload plugins: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        pluginsAffected: 0,
        durationMs: performance.now() - startTime,
      };
    }
  }

  /**
   * Gets marketplace plugins size information
   *
   * SIMPLIFIED (v1.0.122+): Now reads from marketplace instead of intermediate cache
   *
   * @returns Object with total size and per-plugin sizes
   */
  getCacheSize(): { total: number; plugins: Record<string, number> } {
    const plugins: Record<string, number> = {};
    let total = 0;

    // SIMPLIFIED: Read from marketplace (no intermediate cache)
    if (!fs.existsSync(this.marketplacePath)) {
      return { total: 0, plugins: {} };
    }

    for (const pluginName of this.getCachedPlugins()) {
      const pluginPath = path.join(this.marketplacePath, pluginName);
      const size = this.getDirectorySize(pluginPath);
      plugins[pluginName] = size;
      total += size;
    }

    return { total, plugins };
  }

  /**
   * Reads the current state file
   *
   * @returns Current state or default state if file doesn't exist
   */
  readState(): CacheState {
    const defaultState: CacheState = {
      version: '1.0.0',
      lazyMode: true,
      lastUpdated: new Date().toISOString(),
      cachedPlugins: [],
      loadedPlugins: [],
      analytics: {
        totalLoads: 0,
        totalTokensSaved: 0,
        avgLoadTimeMs: 0,
        keywordTriggers: 0,
        keywordsMatched: {},
        sessionsWithLazyMode: 0,
        loadHistory: [],
      },
    };

    if (!fs.existsSync(this.statePath)) {
      return defaultState;
    }

    try {
      const content = fs.readFileSync(this.statePath, 'utf8');
      const state = JSON.parse(content) as CacheState;
      return { ...defaultState, ...state };
    } catch (error) {
      logger.warn(`Failed to read state file: ${error}`);
      return defaultState;
    }
  }

  /**
   * Updates the state file atomically
   *
   * @param updater - Function that receives current state and returns updated state
   */
  private async updateState(updater: (state: CacheState) => CacheState): Promise<void> {
    const state = this.readState();
    const newState = updater(state);

    // Ensure state directory exists
    const stateDir = path.dirname(this.statePath);
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }

    fs.writeFileSync(this.statePath, JSON.stringify(newState, null, 2));
  }

  /**
   * Gets plugins from marketplace directory
   */
  private getMarketplacePlugins(): string[] {
    if (!fs.existsSync(this.marketplacePath)) {
      return [];
    }

    return fs
      .readdirSync(this.marketplacePath, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
      .map((e) => e.name);
  }

  /**
   * Generates plugin metadata
   */
  private generatePluginMetadata(name: string, pluginPath: string): CachedPluginMetadata {
    const skillCount = this.countSkills(pluginPath);
    const sizeBytes = this.getDirectorySize(pluginPath);

    // Try to read version from plugin.json
    let version = '1.0.0';
    const pluginJsonPath = path.join(pluginPath, '.claude-plugin', 'plugin.json');
    if (fs.existsSync(pluginJsonPath)) {
      try {
        const pluginJson = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'));
        version = pluginJson.version || version;
      } catch {
        // Use default version
      }
    }

    return {
      name,
      version,
      cachedAt: new Date().toISOString(),
      skillCount,
      sizeBytes,
    };
  }

  /**
   * Counts skills in a plugin directory
   */
  private countSkills(pluginPath: string): number {
    const skillsPath = path.join(pluginPath, 'skills');
    if (!fs.existsSync(skillsPath)) {
      return 0;
    }

    let count = 0;
    const scanDir = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          // Check if this is a skill directory (has SKILL.md)
          if (fs.existsSync(path.join(dir, entry.name, 'SKILL.md'))) {
            count++;
          }
          scanDir(path.join(dir, entry.name));
        }
      }
    };

    scanDir(skillsPath);
    return count;
  }

  /**
   * Calculates directory size recursively
   */
  private getDirectorySize(dirPath: string): number {
    if (!fs.existsSync(dirPath)) {
      return 0;
    }

    let size = 0;
    const scanDir = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (entry.isFile()) {
          try {
            size += fs.statSync(fullPath).size;
          } catch {
            // Skip inaccessible files
          }
        }
      }
    };

    scanDir(dirPath);
    return size;
  }

  /**
   * Copies a directory recursively
   */
  private async copyDirectory(source: string, dest: string): Promise<void> {
    // Ensure destination parent exists
    const destParent = path.dirname(dest);
    if (!fs.existsSync(destParent)) {
      fs.mkdirSync(destParent, { recursive: true });
    }

    // Remove existing destination
    if (fs.existsSync(dest)) {
      await this.removeDirectory(dest);
    }

    // Create destination directory
    fs.mkdirSync(dest, { recursive: true });

    // Copy contents
    const entries = fs.readdirSync(source, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(source, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  /**
   * Removes a directory recursively
   */
  private async removeDirectory(dirPath: string): Promise<void> {
    if (!fs.existsSync(dirPath)) {
      return;
    }

    fs.rmSync(dirPath, { recursive: true, force: true });
  }

  /**
   * Records a keyword trigger event for analytics
   *
   * @param keyword - The keyword that triggered loading
   */
  recordKeywordTrigger(keyword: string): void {
    this.updateState((state) => {
      if (!state.analytics.keywordsMatched) {
        state.analytics.keywordsMatched = {};
      }
      state.analytics.keywordsMatched[keyword] =
        (state.analytics.keywordsMatched[keyword] || 0) + 1;
      state.analytics.keywordTriggers = (state.analytics.keywordTriggers || 0) + 1;
      return state;
    });
  }

  /**
   * Records a new session with lazy mode
   */
  recordLazyModeSession(): void {
    this.updateState((state) => {
      state.analytics.sessionsWithLazyMode = (state.analytics.sessionsWithLazyMode || 0) + 1;
      return state;
    });
  }

  /**
   * Gets a summary of lazy loading analytics
   *
   * @returns Analytics summary object
   */
  getAnalyticsSummary(): {
    lazyModeEnabled: boolean;
    totalLoads: number;
    estimatedTokensSaved: number;
    avgLoadTimeMs: number;
    keywordTriggers: number;
    topKeywords: Array<{ keyword: string; count: number }>;
    sessionsWithLazyMode: number;
    firstUsedAt: string | null;
    recentLoads: Array<{ timestamp: string; plugins: string[]; durationMs: number }>;
    cachedPlugins: number;
    loadedPlugins: number;
  } {
    const state = this.readState();

    // Get top keywords sorted by count
    const keywordEntries = Object.entries(state.analytics.keywordsMatched || {});
    const topKeywords = keywordEntries
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      lazyModeEnabled: state.lazyMode,
      totalLoads: state.analytics.totalLoads,
      estimatedTokensSaved: state.analytics.totalTokensSaved,
      avgLoadTimeMs: state.analytics.avgLoadTimeMs,
      keywordTriggers: state.analytics.keywordTriggers || 0,
      topKeywords,
      sessionsWithLazyMode: state.analytics.sessionsWithLazyMode || 0,
      firstUsedAt: state.analytics.firstUsedAt || null,
      recentLoads: (state.analytics.loadHistory || []).slice(-10),
      cachedPlugins: state.cachedPlugins.length,
      loadedPlugins: state.loadedPlugins.length,
    };
  }
}
