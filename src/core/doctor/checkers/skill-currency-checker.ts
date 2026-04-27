/**
 * Skill Currency Checker — bridges vskill registry into specweave doctor.
 *
 * In projects that use vskill (i.e. have a `vskill.lock` file), shells out
 * to `vskill outdated --json` and summarises the count of skills with
 * available updates. Gracefully no-ops when vskill is not installed or
 * when the project has no lockfile.
 *
 * Increment 0794 — US-005 / T-017.
 * ADR: 0794-04-doctor-as-update-visibility-surface.md
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
import { execFileNoThrowSync } from '../../../utils/execFileNoThrow.js';

interface OutdatedEntry {
  name: string;
  installed: string;
  latest: string;
  versionBump?: string;
  certTier?: string;
}

interface SkillCurrencyOptions {
  vskillBin?: string;
  cwd?: string;
}

export class SkillCurrencyChecker implements HealthChecker {
  category = 'Skill Currency';
  private vskillBin: string;
  private cwd: string;

  constructor(opts?: SkillCurrencyOptions) {
    this.vskillBin = opts?.vskillBin ?? 'vskill';
    this.cwd = opts?.cwd ?? process.cwd();
  }

  async check(projectRoot: string, _options: DoctorOptions): Promise<CategoryResult> {
    const checks: CheckResult[] = [];
    const lockPath = path.join(projectRoot, 'vskill.lock');

    if (!fs.existsSync(lockPath)) {
      checks.push({
        name: 'Skill currency',
        status: 'skip',
        message: 'no vskill.lock in project (skipped)',
      });
      return { category: this.category, status: calculateOverallStatus(checks), checks };
    }

    // Probe for vskill CLI before invoking
    const probe = execFileNoThrowSync(this.vskillBin, ['--version'], {
      cwd: projectRoot,
      timeout: 5000,
    });
    if (probe.error || probe.exitCode !== 0) {
      checks.push({
        name: 'Skill currency',
        status: 'warn',
        message: 'vskill.lock present but vskill CLI not on PATH',
        fixSuggestion: 'Install via: npm i -g vskill',
      });
      return { category: this.category, status: calculateOverallStatus(checks), checks };
    }

    const result = execFileNoThrowSync(this.vskillBin, ['outdated', '--json'], {
      cwd: projectRoot,
      timeout: 30000,
    });

    if (result.error || (result.exitCode !== 0 && result.exitCode !== 1)) {
      // exit 0 = no outdated, exit 1 = outdated found (vskill convention varies — accept both as success).
      checks.push({
        name: 'Skill currency',
        status: 'warn',
        message: `unable to run \`${this.vskillBin} outdated\` (network or auth issue)`,
        details: result.stderr ? [result.stderr.slice(0, 400)] : undefined,
        fixSuggestion: `Run manually: ${this.vskillBin} outdated`,
      });
      return { category: this.category, status: calculateOverallStatus(checks), checks };
    }

    let outdated: OutdatedEntry[] = [];
    try {
      const parsed = JSON.parse(result.stdout || '[]');
      outdated = Array.isArray(parsed) ? parsed : (parsed.outdated ?? []);
    } catch {
      checks.push({
        name: 'Skill currency',
        status: 'warn',
        message: `\`${this.vskillBin} outdated --json\` returned non-JSON output`,
        fixSuggestion: `Run manually: ${this.vskillBin} outdated`,
      });
      return { category: this.category, status: calculateOverallStatus(checks), checks };
    }

    if (outdated.length === 0) {
      checks.push({
        name: 'Skill currency',
        status: 'pass',
        message: 'all installed skills up to date',
      });
    } else {
      const details = outdated.slice(0, 10).map(
        (o) => `${o.name}: v${o.installed} -> v${o.latest}${o.versionBump ? ` (${o.versionBump})` : ''}`
      );
      if (outdated.length > 10) details.push(`... and ${outdated.length - 10} more`);
      checks.push({
        name: 'Skill currency',
        status: 'warn',
        message: `${outdated.length} skill(s) outdated`,
        details,
        fixSuggestion: `Run: ${this.vskillBin} update`,
      });
    }

    return { category: this.category, status: calculateOverallStatus(checks), checks };
  }
}
