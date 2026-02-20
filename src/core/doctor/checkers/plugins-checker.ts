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

  private checkMarketplaceDirectory(_fix: boolean): CheckResult {
    const marketplaceDir = path.join(
      this.homeDir,
      '.claude',
      'plugins',
      'marketplaces',
      'specweave'
    );

    if (!fs.existsSync(marketplaceDir)) {
      return {
        name: 'SpecWeave marketplace',
        status: 'warn',
        message: 'not installed',
        fixSuggestion:
          'Run: claude plugin marketplace add specweave/specweave-plugins',
      };
    }

    try {
      const pluginsDir = path.join(marketplaceDir, 'plugins');
      if (!fs.existsSync(pluginsDir)) {
        return {
          name: 'SpecWeave marketplace',
          status: 'warn',
          message: 'installed but empty',
          fixSuggestion: 'Run: specweave update',
        };
      }

      const plugins = fs.readdirSync(pluginsDir);
      return {
        name: 'SpecWeave marketplace',
        status: 'pass',
        message: `${plugins.length} plugin(s) available`,
      };
    } catch {
      return {
        name: 'SpecWeave marketplace',
        status: 'warn',
        message: 'could not read marketplace',
      };
    }
  }

  private checkCorePlugin(_fix: boolean): CheckResult {
    const corePluginDir = path.join(
      this.homeDir,
      '.claude',
      'plugins',
      'marketplaces',
      'specweave',
      'plugins',
      'specweave'
    );

    if (!fs.existsSync(corePluginDir)) {
      return {
        name: 'Core plugin (sw)',
        status: 'warn',
        message: 'not installed',
        fixSuggestion: 'Run: specweave update',
      };
    }

    // Check for essential files
    const skillsDir = path.join(corePluginDir, 'skills');
    const commandsDir = path.join(corePluginDir, 'commands');

    const hasSkills = fs.existsSync(skillsDir);
    const hasCommands = fs.existsSync(commandsDir);

    if (!hasSkills && !hasCommands) {
      return {
        name: 'Core plugin (sw)',
        status: 'fail',
        message: 'incomplete installation',
        fixSuggestion: 'Run: specweave update',
      };
    }

    return {
      name: 'Core plugin (sw)',
      status: 'pass',
      message: 'installed',
    };
  }
}
