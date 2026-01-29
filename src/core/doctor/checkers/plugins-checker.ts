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

export class PluginsChecker implements HealthChecker {
  category = 'Plugins';

  async check(
    projectRoot: string,
    _options: DoctorOptions
  ): Promise<CategoryResult> {
    const checks: CheckResult[] = [];

    // Check local plugin state
    checks.push(this.checkLocalPluginState(projectRoot));

    // Check global plugin cache
    checks.push(this.checkGlobalPluginCache());

    // Check marketplace availability
    checks.push(this.checkMarketplaceDirectory());

    // Check for core plugin
    checks.push(this.checkCorePlugin());

    return {
      category: this.category,
      status: calculateOverallStatus(checks),
      checks,
    };
  }

  private checkLocalPluginState(projectRoot: string): CheckResult {
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
      return {
        name: 'Local plugin state',
        status: 'warn',
        message: 'invalid state file',
        fixSuggestion: 'Run: specweave update',
      };
    }
  }

  private checkGlobalPluginCache(): CheckResult {
    const globalDir = path.join(os.homedir(), '.specweave', 'state');
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

  private checkMarketplaceDirectory(): CheckResult {
    const marketplaceDir = path.join(
      os.homedir(),
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
          fixSuggestion: 'Run: specweave refresh-marketplace',
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

  private checkCorePlugin(): CheckResult {
    const marketplaceDir = path.join(
      os.homedir(),
      '.claude',
      'plugins',
      'marketplaces',
      'specweave',
      'plugins',
      'specweave'
    );

    if (!fs.existsSync(marketplaceDir)) {
      return {
        name: 'Core plugin (sw)',
        status: 'warn',
        message: 'not installed',
        fixSuggestion: 'Run: specweave refresh-marketplace',
      };
    }

    // Check for essential files
    const skillsDir = path.join(marketplaceDir, 'skills');
    const commandsDir = path.join(marketplaceDir, 'commands');

    const hasSkills = fs.existsSync(skillsDir);
    const hasCommands = fs.existsSync(commandsDir);

    if (!hasSkills && !hasCommands) {
      return {
        name: 'Core plugin (sw)',
        status: 'fail',
        message: 'incomplete installation',
        fixSuggestion: 'Run: specweave refresh-marketplace',
      };
    }

    return {
      name: 'Core plugin (sw)',
      status: 'pass',
      message: 'installed',
    };
  }
}
