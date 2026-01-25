/**
 * Plugin Cache Manager for Lazy Loading (SIMPLIFIED v1.0.157)
 *
 * Manages plugin installation using Claude CLI.
 * Uses Claude Code's native plugin system:
 * - ~/.claude/plugins/installed_plugins.json (registry)
 * - ~/.claude/plugins/cache/ (plugin files)
 * - ~/.claude/plugins/marketplaces/specweave/plugins/ (source)
 *
 * @module core/lazy-loading/cache-manager
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { consoleLogger as logger } from '../../utils/logger.js';
import { getAllPlugins, getPluginsForGroup } from './keyword-detector.js';
import { detectClaudeCli } from '../../utils/claude-cli-detector.js';
import { execFileNoThrowSync } from '../../utils/execFileNoThrow.js';
import { isOfficialPlugin, isSpecWeavePlugin } from './llm-plugin-detector.js';

/**
 * Claude plugin registry entry format
 */
interface PluginRegistryEntry {
  scope: string;
  installPath: string;
  version: string;
  installedAt: string;
  lastUpdated: string;
  gitCommitSha?: string;
}

/**
 * Claude plugin registry format
 */
interface PluginRegistry {
  version: number;
  plugins: Record<string, PluginRegistryEntry[]>;
}

/**
 * Environment detection for CI/CD safety
 */
function isCI(): boolean {
  return !!(
    process.env.CI ||
    process.env.GITHUB_ACTIONS ||
    process.env.JENKINS_URL ||
    process.env.GITLAB_CI ||
    process.env.CIRCLECI ||
    process.env.TRAVIS
  );
}

/**
 * Get the Claude plugins registry path
 */
function getRegistryPath(): string {
  return path.join(os.homedir(), '.claude', 'plugins', 'installed_plugins.json');
}

/**
 * Simple state for tracking loaded plugins
 */
export interface CacheState {
  version: string;
  lastUpdated: string;
  loadedPlugins: string[];
  totalLoads: number;
}

/**
 * Result of a cache operation
 */
export interface CacheOperationResult {
  success: boolean;
  error?: string;
  pluginsAffected: number;
  durationMs: number;
}

/**
 * Installation options
 */
export interface InstallOptions {
  plugins?: string[];
  force?: boolean;
  skipVerify?: boolean;
}

/**
 * Default paths
 */
export const CACHE_PATHS = {
  state: path.join(os.homedir(), '.specweave', 'state', 'plugins-loaded.json'),
  marketplace: path.join(os.homedir(), '.claude', 'plugins', 'marketplaces', 'specweave', 'plugins'),
} as const;

/**
 * Maps marketplace plugin names to directory names
 * sw -> specweave, sw-frontend -> specweave-frontend
 */
export function marketplaceNameToDirectory(marketplaceName: string): string {
  if (marketplaceName === 'sw') return 'specweave';
  if (marketplaceName.startsWith('sw-')) return 'specweave-' + marketplaceName.slice(3);
  if (marketplaceName.startsWith('specweave')) return marketplaceName;
  return marketplaceName;
}

/**
 * Maps directory names to marketplace plugin names
 * specweave -> sw, specweave-frontend -> sw-frontend
 */
export function directoryToMarketplaceName(directoryName: string): string {
  if (directoryName === 'specweave') return 'sw';
  if (directoryName.startsWith('specweave-')) return 'sw-' + directoryName.slice(10);
  if (directoryName.startsWith('sw')) return directoryName;
  return directoryName;
}

/**
 * Simplified Plugin Cache Manager
 * Only does what's needed: install plugins via Claude CLI
 */
export class PluginCacheManager {
  private statePath: string;
  private marketplacePath: string;
  private registryPath: string;

  constructor(options?: {
    statePath?: string;
    marketplacePath?: string;
    registryPath?: string;
  }) {
    this.statePath = options?.statePath ?? CACHE_PATHS.state;
    this.marketplacePath = options?.marketplacePath ?? CACHE_PATHS.marketplace;
    this.registryPath = options?.registryPath ?? getRegistryPath();
  }

  /**
   * Populates the cache - NO-OP for backwards compatibility
   * The marketplace IS the cache now.
   */
  async populateCache(): Promise<CacheOperationResult> {
    const startTime = performance.now();

    if (!fs.existsSync(this.marketplacePath)) {
      return {
        success: false,
        error: `Marketplace not found at ${this.marketplacePath}. Run 'specweave refresh-marketplace' first.`,
        pluginsAffected: 0,
        durationMs: performance.now() - startTime,
      };
    }

    const pluginNames = this.getMarketplacePlugins();
    logger.info(`Marketplace ready with ${pluginNames.length} plugins`);

    return {
      success: true,
      pluginsAffected: pluginNames.length,
      durationMs: performance.now() - startTime,
    };
  }

  /**
   * Install plugins using Claude CLI
   */
  async installPlugins(options: InstallOptions = {}): Promise<CacheOperationResult> {
    const startTime = performance.now();
    const { plugins, force = false } = options;

    try {
      if (!fs.existsSync(this.marketplacePath)) {
        return {
          success: false,
          error: `Marketplace not found. Run 'specweave refresh-marketplace' first.`,
          pluginsAffected: 0,
          durationMs: performance.now() - startTime,
        };
      }

      // Determine plugins to install
      let pluginsToInstall: string[] = [];
      if (plugins && plugins.length > 0) {
        for (const pluginOrGroup of plugins) {
          const groupPlugins = getPluginsForGroup(pluginOrGroup);
          pluginsToInstall.push(...(groupPlugins.length > 0 ? groupPlugins : [pluginOrGroup]));
        }
      } else {
        pluginsToInstall = this.getMarketplacePlugins();
      }
      // Normalize to marketplace names (sw-*, not specweave-*)
      // This ensures consistent registry keys: sw-github@specweave, not specweave-github@specweave
      pluginsToInstall = [...new Set(pluginsToInstall)].map(directoryToMarketplaceName);

      // Check CLI availability
      const claudeStatus = isCI() ? { available: false } : detectClaudeCli();
      const useCliInstall = claudeStatus.available;

      let installedCount = 0;

      for (const pluginName of pluginsToInstall) {
        // v1.0.159: Handle both SpecWeave and official plugins
        const isOfficial = isOfficialPlugin(pluginName);
        const isSW = isSpecWeavePlugin(pluginName);

        // Only check local existence for SpecWeave plugins (official plugins are in different marketplace)
        if (isSW) {
          const directoryName = marketplaceNameToDirectory(pluginName);
          const sourcePath = path.join(this.marketplacePath, directoryName);

          if (!fs.existsSync(sourcePath)) {
            logger.warn(`Plugin not in marketplace: ${pluginName}`);
            continue;
          }
        } else if (!isOfficial) {
          logger.warn(`Unknown plugin (not SW or official): ${pluginName}`);
          continue;
        }

        // Skip if already registered (unless force)
        if (!force && this.isPluginRegistered(pluginName)) {
          logger.debug(`Plugin already installed: ${pluginName}`);
          continue;
        }

        let installed = false;

        // ONLY use Claude CLI - NEVER manipulate registry directly
        if (useCliInstall) {
          // v1.0.159: Install from correct marketplace
          const marketplace = isSW ? 'specweave' : 'claude-plugins-official';
          installed = await this.installPluginViaCli(pluginName, marketplace);
        } else {
          const marketplace = isSW ? 'specweave' : 'claude-plugins-official';
          logger.warn(`Cannot install ${pluginName}: Claude CLI not available. Run 'claude plugin install ${pluginName}@${marketplace}' manually.`);
        }

        if (installed) installedCount++;
      }

      // Simple state update
      this.updateStateSimple(pluginsToInstall.filter(p => this.isPluginRegistered(p)));

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

  /**
   * Install plugin via Claude CLI
   * v1.0.159: Now supports both specweave and claude-plugins-official marketplaces
   */
  private async installPluginViaCli(pluginName: string, marketplace: string = 'specweave'): Promise<boolean> {
    try {
      // CRITICAL: Use correct format - pluginName@marketplace
      const pluginKey = `${pluginName}@${marketplace}`;
      const result = execFileNoThrowSync('claude', ['plugin', 'install', pluginKey], {
        timeout: 30000,
      });

      if (result.success) {
        logger.debug(`Installed via CLI: ${pluginName} from @${marketplace}`);
        return true;
      }

      logger.debug(`CLI install failed for ${pluginName}: ${result.stderr || result.stdout}`);
      return false;
    } catch (error) {
      logger.debug(`CLI install error for ${pluginName}: ${error}`);
      return false;
    }
  }

  // NOTE: Direct registry manipulation removed (v1.0.157)
  // All plugin operations MUST go through Claude CLI:
  // - claude plugin install sw-github@specweave
  // - claude plugin uninstall sw-github@specweave
  // - claude plugin enable/disable sw-github@specweave
  // NEVER write to ~/.claude/plugins/installed_plugins.json directly!

  /**
   * Check if plugin is registered
   * v1.0.159: Checks both specweave and claude-plugins-official marketplaces
   */
  isPluginRegistered(pluginName: string): boolean {
    if (!fs.existsSync(this.registryPath)) return false;

    try {
      const registry: PluginRegistry = JSON.parse(fs.readFileSync(this.registryPath, 'utf8'));
      // Check both marketplaces
      const swKey = `${pluginName}@specweave`;
      const officialKey = `${pluginName}@claude-plugins-official`;
      return !!registry.plugins[swKey]?.length || !!registry.plugins[officialKey]?.length;
    } catch {
      return false;
    }
  }

  /**
   * Check if plugin is loaded (alias for isPluginRegistered)
   */
  isPluginLoaded(pluginName: string): boolean {
    return this.isPluginRegistered(pluginName);
  }

  /**
   * Get plugins available in marketplace
   */
  getMarketplacePlugins(): string[] {
    if (!fs.existsSync(this.marketplacePath)) return [];

    try {
      return fs.readdirSync(this.marketplacePath)
        .filter(name => {
          const fullPath = path.join(this.marketplacePath, name);
          return fs.statSync(fullPath).isDirectory() && name.startsWith('specweave');
        })
        .map(directoryToMarketplaceName);
    } catch {
      return [];
    }
  }

  /**
   * Update state after installing plugins
   */
  private updateStateSimple(loadedPlugins: string[]): void {
    try {
      const stateDir = path.dirname(this.statePath);
      if (!fs.existsSync(stateDir)) {
        fs.mkdirSync(stateDir, { recursive: true });
      }

      const state = this.readState();
      state.loadedPlugins = [...new Set([...state.loadedPlugins, ...loadedPlugins.map(directoryToMarketplaceName)])];
      state.lastUpdated = new Date().toISOString();
      state.totalLoads++;

      fs.writeFileSync(this.statePath, JSON.stringify(state, null, 2));
    } catch (error) {
      logger.debug(`Failed to update state: ${error}`);
    }
  }

  /**
   * Read state file
   */
  readState(): CacheState {
    const defaultState: CacheState = {
      version: '1.0.157',
      lastUpdated: new Date().toISOString(),
      loadedPlugins: [],
      totalLoads: 0,
    };

    if (!fs.existsSync(this.statePath)) return defaultState;

    try {
      return { ...defaultState, ...JSON.parse(fs.readFileSync(this.statePath, 'utf8')) };
    } catch {
      return defaultState;
    }
  }

  /**
   * Get simple analytics summary
   */
  getAnalyticsSummary(): {
    totalLoads: number;
    loadedPlugins: number;
    availablePlugins: number;
  } {
    const state = this.readState();
    return {
      totalLoads: state.totalLoads,
      loadedPlugins: state.loadedPlugins.length,
      availablePlugins: this.getMarketplacePlugins().length,
    };
  }
}
