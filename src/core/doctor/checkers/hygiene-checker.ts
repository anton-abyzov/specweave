/**
 * Hygiene Checker — repository hygiene that has actually bitten users:
 *
 * 1. `.npmrc` with `ignore-scripts=true` — the confirmed supply-chain vector
 *    was a dependency install script running in CI (warn, never fail).
 * 2. Files under `.specweave/state/` tracked by git — machine-local state that
 *    produces endless merge conflicts once committed.
 * 3. Tracked files larger than 5 MB under `.specweave/increments/` — binary
 *    evidence belongs in `reports/artifacts/` (gitignored).
 */

import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import type { HealthChecker, CategoryResult, CheckResult, DoctorOptions } from '../types.js';
import { calculateOverallStatus } from '../types.js';

/** Tracked increment files above this size are flagged. */
export const MAX_TRACKED_FILE_BYTES = 5 * 1024 * 1024;

/** `git ls-files -z` under one pathspec, or null when git is unavailable. */
function trackedFiles(projectRoot: string, pathspec: string): string[] | null {
  try {
    const out = execFileSync('git', ['ls-files', '-z', '--', pathspec], {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 15000,
    });
    return out.split('\0').filter(Boolean);
  } catch {
    return null;
  }
}

export class HygieneChecker implements HealthChecker {
  category = 'Hygiene';

  async check(projectRoot: string, _options: DoctorOptions): Promise<CategoryResult> {
    const checks: CheckResult[] = [
      this.checkNpmrc(projectRoot),
      this.checkTrackedState(projectRoot),
      this.checkLargeIncrementFiles(projectRoot),
    ];
    return { category: this.category, status: calculateOverallStatus(checks), checks };
  }

  private checkNpmrc(projectRoot: string): CheckResult {
    const npmrc = path.join(projectRoot, '.npmrc');
    if (!fs.existsSync(npmrc)) {
      return {
        name: '.npmrc ignore-scripts',
        status: 'warn',
        message: 'no .npmrc in the repo',
        fixSuggestion: "Add a committed .npmrc with 'ignore-scripts=true'",
      };
    }
    const content = fs.readFileSync(npmrc, 'utf8');
    const enabled = /^\s*ignore-scripts\s*=\s*true\s*$/m.test(content);
    return enabled
      ? { name: '.npmrc ignore-scripts', status: 'pass', message: 'ignore-scripts=true' }
      : {
          name: '.npmrc ignore-scripts',
          status: 'warn',
          message: 'ignore-scripts is not set to true',
          fixSuggestion: "Add 'ignore-scripts=true' to .npmrc (dependency install scripts are a supply-chain vector)",
        };
  }

  private checkTrackedState(projectRoot: string): CheckResult {
    const files = trackedFiles(projectRoot, '.specweave/state');
    if (files === null) {
      return { name: 'Tracked state files', status: 'skip', message: 'not a git repository' };
    }
    if (files.length === 0) {
      return { name: 'Tracked state files', status: 'pass', message: '.specweave/state is untracked' };
    }
    return {
      name: 'Tracked state files',
      status: 'warn',
      message: `${files.length} file(s) under .specweave/state are tracked by git`,
      details: files.slice(0, 5),
      fixSuggestion: 'Run: git rm -r --cached .specweave/state (and keep it in .gitignore)',
    };
  }

  private checkLargeIncrementFiles(projectRoot: string): CheckResult {
    const files = trackedFiles(projectRoot, '.specweave/increments');
    if (files === null) {
      return { name: 'Large increment files', status: 'skip', message: 'not a git repository' };
    }
    const big: string[] = [];
    for (const rel of files) {
      try {
        const { size } = fs.statSync(path.join(projectRoot, rel));
        if (size > MAX_TRACKED_FILE_BYTES) {
          big.push(`${rel} (${(size / 1024 / 1024).toFixed(1)} MB)`);
        }
      } catch {
        // deleted-but-still-tracked file — nothing to measure
      }
    }
    if (big.length === 0) {
      return { name: 'Large increment files', status: 'pass', message: 'no tracked file over 5 MB' };
    }
    return {
      name: 'Large increment files',
      status: 'warn',
      message: `${big.length} tracked file(s) over 5 MB under .specweave/increments`,
      details: big.slice(0, 5),
      fixSuggestion: 'Move binaries to <increment>/reports/artifacts/ (gitignored) and git rm --cached them',
    };
  }
}
