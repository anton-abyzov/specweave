/**
 * Plugins Checker - validates plugin installation and cache health
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type {
  HealthChecker,
  CategoryResult,
  CheckResult,
  DoctorOptions,
} from '../types.js';
import { calculateOverallStatus } from '../types.js';
import { execFileNoThrowSync } from '../../../utils/execFileNoThrow.js';
import { findSpecweaveRoot } from '../../../utils/plugin-copier.js';
import { getDirname } from '../../../utils/esm-helpers.js';

const __dirname = getDirname(import.meta.url);

interface PluginsCheckerOptions {
  homeDir?: string;
}

export class PluginsChecker implements HealthChecker {
  category = 'Plugins';
  private homeDir: string;

  constructor(opts?: PluginsCheckerOptions) {
    this.homeDir = opts?.homeDir ?? os.homedir();
  }

  async check(
    projectRoot: string,
    options: DoctorOptions
  ): Promise<CategoryResult> {
    const fix = options.fix ?? false;
    const checks: CheckResult[] = [];

    // Check local plugin state
    checks.push(this.checkLocalPluginState(projectRoot, fix));

    // Check global plugin cache
    checks.push(this.checkGlobalPluginCache(fix));

    // Check marketplace availability
    checks.push(this.checkMarketplaceDirectory(fix));

    // Check for core plugin
    checks.push(this.checkCorePlugin(fix));

    // Check for stale version directories in plugin cache
    checks.push(this.checkStaleVersionDirs());

    return {
      category: this.category,
      status: calculateOverallStatus(checks),
      checks,
    };
  }

  private checkLocalPluginState(projectRoot: string, fix: boolean): CheckResult {
    const statePath = path.join(
      projectRoot,
      '.specweave',
      'state',
      'plugins-loaded.json'
    );

    if (!fs.existsSync(statePath)) {
      return {
        name: 'Local plugin state',
        status: 'skip',
        message: 'no state file (plugins load on demand)',
      };
    }

    try {
      const content = fs.readFileSync(statePath, 'utf8');
      const state = JSON.parse(content);

      const plugins = state.loadedPlugins || [];
      return {
        name: 'Local plugin state',
        status: 'pass',
        message: `${plugins.length} plugin(s) tracked`,
        details: plugins.slice(0, 5),
      };
    } catch {
      if (fix) {
        fs.unlinkSync(statePath);
        return {
          name: 'Local plugin state',
          status: 'warn',
          message: 'invalid state file removed',
          fixSuggestion: 'Deleted corrupt state file',
        };
      }
      return {
        name: 'Local plugin state',
        status: 'warn',
        message: 'invalid state file',
        fixSuggestion: 'Run: specweave update',
      };
    }
  }

  private checkGlobalPluginCache(fix: boolean): CheckResult {
    const globalDir = path.join(this.homeDir, '.specweave', 'state');
    const cachePath = path.join(globalDir, 'plugins-loaded.json');

    if (!fs.existsSync(cachePath)) {
      return {
        name: 'Global plugin cache',
        status: 'skip',
        message: 'no global cache',
      };
    }

    try {
      const stat = fs.statSync(cachePath);
      const ageHours = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60);

      if (ageHours > 24) {
        if (fix) {
          fs.unlinkSync(cachePath);
          return {
            name: 'Global plugin cache',
            status: 'warn',
            message: `stale cache removed (was ${Math.round(ageHours)}h old)`,
            fixSuggestion: 'Deleted stale cache file',
          };
        }
        return {
          name: 'Global plugin cache',
          status: 'warn',
          message: `stale (${Math.round(ageHours)}h old)`,
          fixSuggestion: 'Run: specweave update',
        };
      }

      return {
        name: 'Global plugin cache',
        status: 'pass',
        message: `fresh (${Math.round(ageHours)}h old)`,
      };
    } catch {
      return {
        name: 'Global plugin cache',
        status: 'warn',
        message: 'could not read cache',
      };
    }
  }

  private checkMarketplaceDirectory(fix: boolean): CheckResult {
    const knownMarketplacesPath = path.join(
      this.homeDir, '.claude', 'plugins', 'known_marketplaces.json'
    );

    let isRegistered = false;
    try {
      const content = fs.readFileSync(knownMarketplacesPath, 'utf8');
      const marketplaces = JSON.parse(content);
      isRegistered = 'specweave' in marketplaces;
    } catch {
      isRegistered = false;
    }

    if (isRegistered) {
      return {
        name: 'SpecWeave marketplace',
        status: 'pass',
        message: 'registered in Claude Code',
      };
    }

    if (fix) {
      const specweaveRoot = findSpecweaveRoot(__dirname);
      if (!specweaveRoot) {
        return {
          name: 'SpecWeave marketplace',
          status: 'fail',
          message: 'not registered — could not locate specweave installation to fix',
          fixSuggestion: 'Run: specweave update',
        };
      }
      const result = execFileNoThrowSync(
        'claude', ['plugin', 'marketplace', 'add', specweaveRoot], { timeout: 10_000 }
      );
      if (result.success) {
        return {
          name: 'SpecWeave marketplace',
          status: 'pass',
          message: 're-registered (was missing)',
          fixSuggestion: 'Marketplace re-registered successfully',
        };
      }
      return {
        name: 'SpecWeave marketplace',
        status: 'fail',
        message: 'not registered, fix failed',
        fixSuggestion: 'Run: specweave update',
      };
    }

    return {
      name: 'SpecWeave marketplace',
      status: 'warn',
      message: 'not registered in Claude Code',
      fixSuggestion: 'Run: specweave doctor --fix (or specweave update)',
    };
  }

  private checkStaleVersionDirs(): CheckResult {
    const cacheBase = path.join(this.homeDir, '.claude', 'plugins', 'cache');
    if (!fs.existsSync(cacheBase)) {
      return { name: 'Plugin version cache', status: 'skip', message: 'no cache directory' };
    }

    let totalStale = 0;
    const details: string[] = [];

    try {
      // Iterate all marketplace subdirs (specweave, and any others)
      const marketplaces = fs.readdirSync(cacheBase, { withFileTypes: true });
      for (const mkt of marketplaces) {
        if (!mkt.isDirectory()) continue;
        const mktDir = path.join(cacheBase, mkt.name);
        try {
          const plugins = fs.readdirSync(mktDir, { withFileTypes: true });
          for (const plugin of plugins) {
            if (!plugin.isDirectory()) continue;
            const pluginDir = path.join(mktDir, plugin.name);
            const versions = fs.readdirSync(pluginDir, { withFileTypes: true })
              .filter(v => v.isDirectory())
              .map(v => v.name);
            if (versions.length > 1) {
              totalStale += versions.length - 1;
              const prefix = mkt.name === 'specweave' ? '' : `${mkt.name}/`;
              details.push(`${prefix}${plugin.name}: ${versions.length} versions (${versions.join(', ')})`);
            }
          }
        } catch (err) {
          console.debug?.(`checkStaleVersionDirs: marketplace ${mkt.name} unreadable: ${err}`);
        }
      }
    } catch (err) {
      console.debug?.(`checkStaleVersionDirs: cache base unreadable: ${err}`);
      return { name: 'Plugin version cache', status: 'skip', message: 'could not read cache' };
    }

    if (totalStale > 0) {
      return {
        name: 'Plugin version cache',
        status: 'warn',
        message: `${totalStale} stale version dir(s) across ${details.length} plugin(s)`,
        details,
        fixSuggestion: 'Run: specweave refresh-plugins --force',
      };
    }

    return { name: 'Plugin version cache', status: 'pass', message: 'clean (1 version per plugin)' };
  }

  private checkCorePlugin(fix: boolean): CheckResult {
    const installedPluginsPath = path.join(
      this.homeDir, '.claude', 'plugins', 'installed_plugins.json'
    );

    let isInstalled = false;
    try {
      const content = fs.readFileSync(installedPluginsPath, 'utf8');
      const data = JSON.parse(content);
      const plugins = data.plugins ?? data;
      isInstalled = !Array.isArray(plugins) && typeof plugins === 'object' && plugins !== null
        && 'sw@specweave' in plugins;
    } catch {
      isInstalled = false;
    }

    if (isInstalled) {
      return {
        name: 'Core plugin (sw)',
        status: 'pass',
        message: 'installed',
      };
    }

    if (fix) {
      // sw@specweave always uses user scope (per plugin-scope.ts override)
      const result = execFileNoThrowSync(
        'claude', ['plugin', 'install', 'sw@specweave', '--scope', 'user'], { timeout: 15_000 }
      );
      if (result.success) {
        return {
          name: 'Core plugin (sw)',
          status: 'pass',
          message: 'installed (was missing)',
          fixSuggestion: 'Installed sw@specweave successfully',
        };
      }
      return {
        name: 'Core plugin (sw)',
        status: 'fail',
        message: 'not installed, fix failed',
        fixSuggestion: 'Run: specweave update',
      };
    }

    return {
      name: 'Core plugin (sw)',
      status: 'warn',
      message: 'not installed',
      fixSuggestion: 'Run: specweave doctor --fix (or specweave update)',
    };
  }
}
