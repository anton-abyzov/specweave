/**
 * Configuration Checker - validates config.json, CLAUDE.md freshness, etc.
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  HealthChecker,
  CategoryResult,
  CheckResult,
  DoctorOptions,
} from '../types.js';
import { calculateOverallStatus } from '../types.js';

// Current version - should match CLAUDE.md template
const CURRENT_VERSION = '1.0.183';

export class ConfigurationChecker implements HealthChecker {
  category = 'Configuration';

  async check(
    projectRoot: string,
    _options: DoctorOptions
  ): Promise<CategoryResult> {
    const checks: CheckResult[] = [];

    // Check config.json
    checks.push(this.checkConfigJson(projectRoot));

    // Check CLAUDE.md freshness
    checks.push(this.checkClaudeMd(projectRoot));

    // Check AGENTS.md if exists
    checks.push(this.checkAgentsMd(projectRoot));

    // Check .env presence (for configured integrations)
    checks.push(this.checkEnvFile(projectRoot));

    // Check Opus 4.7 config keys (0669 Wave 2)
    checks.push(this.checkOpus47Keys(projectRoot));

    return {
      category: this.category,
      status: calculateOverallStatus(checks),
      checks,
    };
  }

  private checkOpus47Keys(projectRoot: string): CheckResult {
    const configPath = path.join(projectRoot, '.specweave', 'config.json');

    if (!fs.existsSync(configPath)) {
      return {
        name: 'Opus 4.7 config keys',
        status: 'skip',
        message: 'config.json missing (separate check)',
      };
    }

    let config: Record<string, Record<string, unknown> | undefined>;
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch {
      return {
        name: 'Opus 4.7 config keys',
        status: 'skip',
        message: 'config.json invalid JSON (separate check)',
      };
    }

    const missing: string[] = [];
    const expectedKeys: Array<{ section: string; key: string; defaultValue: string }> = [
      { section: 'quality', key: 'thinkingBudget', defaultValue: '"xhigh"' },
      { section: 'quality', key: 'grillConfidenceThreshold', defaultValue: '50' },
      { section: 'quality', key: 'tokenBudgets', defaultValue: '{ pm.interview: 1500, brainstorm.idea: 1800 }' },
      { section: 'cache', key: 'staticContextFiles', defaultValue: '["CLAUDE.md", ...]' },
    ];

    for (const entry of expectedKeys) {
      const section = config[entry.section];
      if (!section || section[entry.key] === undefined) {
        missing.push(`${entry.section}.${entry.key} (default: ${entry.defaultValue})`);
      }
    }

    if (missing.length === 0) {
      return {
        name: 'Opus 4.7 config keys',
        status: 'pass',
        message: 'all present',
      };
    }

    return {
      name: 'Opus 4.7 config keys',
      status: 'warn',
      message: `missing ${missing.length} key${missing.length === 1 ? '' : 's'}`,
      details: missing.map((m) => `Missing config key '${m.split(' ')[0]}'`),
      fixSuggestion: 'Run: node scripts/migrate-config-0669.ts .specweave/config.json',
    };
  }

  private checkConfigJson(projectRoot: string): CheckResult {
    const configPath = path.join(projectRoot, '.specweave', 'config.json');

    if (!fs.existsSync(configPath)) {
      return {
        name: 'config.json',
        status: 'fail',
        message: 'missing',
        fixSuggestion: 'Run: specweave init',
      };
    }

    try {
      const content = fs.readFileSync(configPath, 'utf8');
      JSON.parse(content);

      return {
        name: 'config.json',
        status: 'pass',
        message: 'valid JSON',
      };
    } catch (e) {
      return {
        name: 'config.json',
        status: 'fail',
        message: `invalid JSON: ${e instanceof Error ? e.message : 'parse error'}`,
        fixSuggestion: 'Fix JSON syntax errors in .specweave/config.json',
      };
    }
  }

  private checkClaudeMd(projectRoot: string): CheckResult {
    const claudeMdPath = path.join(projectRoot, 'CLAUDE.md');

    if (!fs.existsSync(claudeMdPath)) {
      return {
        name: 'CLAUDE.md',
        status: 'warn',
        message: 'not found',
        fixSuggestion: 'Run: specweave update',
      };
    }

    try {
      const content = fs.readFileSync(claudeMdPath, 'utf8');
      const versionMatch = content.match(/SW:META[^>]*version="([^"]+)"/);

      if (!versionMatch) {
        return {
          name: 'CLAUDE.md',
          status: 'warn',
          message: 'not managed by SpecWeave',
        };
      }

      const fileVersion = versionMatch[1];
      const comparison = this.compareVersions(fileVersion, CURRENT_VERSION);

      if (comparison === 0) {
        return {
          name: 'CLAUDE.md',
          status: 'pass',
          message: `v${fileVersion} (current)`,
        };
      }

      if (comparison < 0) {
        return {
          name: 'CLAUDE.md',
          status: 'warn',
          message: `v${fileVersion} (current: v${CURRENT_VERSION})`,
          fixSuggestion: 'Run: specweave update',
        };
      }

      // Newer version somehow
      return {
        name: 'CLAUDE.md',
        status: 'pass',
        message: `v${fileVersion}`,
      };
    } catch {
      return {
        name: 'CLAUDE.md',
        status: 'fail',
        message: 'could not read file',
      };
    }
  }

  private checkAgentsMd(projectRoot: string): CheckResult {
    const agentsMdPath = path.join(projectRoot, 'AGENTS.md');

    if (!fs.existsSync(agentsMdPath)) {
      return {
        name: 'AGENTS.md',
        status: 'skip',
        message: 'not present (optional)',
      };
    }

    try {
      const content = fs.readFileSync(agentsMdPath, 'utf8');
      const versionMatch = content.match(/SW:META[^>]*version="([^"]+)"/);

      if (!versionMatch) {
        return {
          name: 'AGENTS.md',
          status: 'pass',
          message: 'present (not version-tracked)',
        };
      }

      const fileVersion = versionMatch[1];
      return {
        name: 'AGENTS.md',
        status: 'pass',
        message: `v${fileVersion}`,
      };
    } catch {
      return {
        name: 'AGENTS.md',
        status: 'warn',
        message: 'could not read file',
      };
    }
  }

  private checkEnvFile(projectRoot: string): CheckResult {
    const configPath = path.join(projectRoot, '.specweave', 'config.json');
    const envPath = path.join(projectRoot, '.env');

    // Check if external integrations are enabled
    let needsEnv = false;
    try {
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        needsEnv =
          config.sync?.github?.enabled ||
          config.sync?.jira?.enabled ||
          config.sync?.ado?.enabled;
      }
    } catch {
      // Ignore config parse errors
    }

    const envExists = fs.existsSync(envPath);

    if (!needsEnv) {
      return {
        name: '.env file',
        status: envExists ? 'pass' : 'skip',
        message: envExists ? 'present' : 'not required (no external sync enabled)',
      };
    }

    if (!envExists) {
      return {
        name: '.env file',
        status: 'warn',
        message: 'missing (external sync is enabled)',
        fixSuggestion: 'Create .env with required tokens (see docs)',
      };
    }

    return {
      name: '.env file',
      status: 'pass',
      message: 'present',
    };
  }

  private compareVersions(a: string, b: string): number {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);

    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const numA = partsA[i] || 0;
      const numB = partsB[i] || 0;
      if (numA < numB) return -1;
      if (numA > numB) return 1;
    }
    return 0;
  }
}
