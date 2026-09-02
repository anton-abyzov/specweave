/**
 * Git Checker - validates git repository status
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  installGitHooks,
  needsHookRefresh,
  readInstalledHookVersion,
  PRE_COMMIT_HOOK_VERSION,
} from '../../../cli/helpers/init/git-hooks-installer.js';
import { findSourceDir } from '../../../cli/helpers/init/path-utils.js';
import type {
  HealthChecker,
  CategoryResult,
  CheckResult,
  DoctorOptions,
} from '../types.js';
import { calculateOverallStatus } from '../types.js';

export class GitChecker implements HealthChecker {
  category = 'Git';

  async check(
    projectRoot: string,
    options: DoctorOptions
  ): Promise<CategoryResult> {
    const checks: CheckResult[] = [];

    // Check if git repo
    const isGitRepo = this.isGitRepository(projectRoot);
    checks.push({
      name: 'Git repository',
      status: isGitRepo ? 'pass' : 'skip',
      message: isGitRepo ? 'yes' : 'not a git repository',
    });

    if (!isGitRepo) {
      return {
        category: this.category,
        status: 'skip',
        checks,
      };
    }

    // Check working directory status
    checks.push(this.checkWorkingDirectory(projectRoot));

    // Check for remote
    checks.push(this.checkRemote(projectRoot));

    // Pre-commit hook freshness: a 1.x hook body blocks the 2.0 loop
    // (it rejects ledger.jsonl / handoff.md at the increment root).
    checks.push(this.checkPreCommitHook(projectRoot, options));

    // Skip branch checks in quick mode
    if (!options.quick) {
      checks.push(this.checkBranch(projectRoot));
    }

    return {
      category: this.category,
      status: calculateOverallStatus(checks),
      checks,
    };
  }

  private isGitRepository(projectRoot: string): boolean {
    try {
      execSync('git rev-parse --git-dir', {
        cwd: projectRoot,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * A SpecWeave pre-commit hook installed by an older CLI still carries the 1.x
   * "only 4 files at increment root" rule and the maxdepth-2 duplicate-ID scan,
   * both of which reject a perfectly valid 2.0 increment. Detect and (with
   * --fix) rewrite it.
   */
  private checkPreCommitHook(projectRoot: string, options: DoctorOptions): CheckResult {
    const hookPath = path.join(projectRoot, '.git', 'hooks', 'pre-commit');
    if (!fs.existsSync(hookPath)) {
      return {
        name: 'Pre-commit hook',
        status: 'skip',
        message: 'not installed',
      };
    }

    let content = '';
    try {
      content = fs.readFileSync(hookPath, 'utf-8');
    } catch {
      return { name: 'Pre-commit hook', status: 'warn', message: 'could not read hook' };
    }

    const installed = readInstalledHookVersion(content);
    if (installed === null) {
      return {
        name: 'Pre-commit hook',
        status: 'skip',
        message: 'custom (not SpecWeave)',
      };
    }

    if (!needsHookRefresh(content)) {
      return {
        name: 'Pre-commit hook',
        status: 'pass',
        message: `v${installed}`,
      };
    }

    if (options.fix) {
      try {
        const here = path.dirname(fileURLToPath(import.meta.url));
        const templatesDir = findSourceDir('templates', here);
        fs.unlinkSync(hookPath);
        installGitHooks(projectRoot, templatesDir);
        return {
          name: 'Pre-commit hook',
          status: 'pass',
          message: `refreshed v${installed} → v${PRE_COMMIT_HOOK_VERSION}`,
        };
      } catch {
        // fall through to the warning below
      }
    }

    // FAIL, not warn: this hook rejects `ledger.jsonl` at the increment root and
    // reports a false duplicate id for any increment with a `reports/` folder,
    // so the user's next commit is BLOCKED. A check whose failure stops work is
    // not a warning, and `doctor` must exit non-zero so CI and the upgrade path
    // notice it.
    return {
      name: 'Pre-commit hook',
      status: 'fail',
      message: `stale v${installed} — blocks commits in 2.0 increments (current v${PRE_COMMIT_HOOK_VERSION})`,
      fixSuggestion: 'Run: specweave doctor --fix (or specweave update)',
    };
  }

  private checkWorkingDirectory(projectRoot: string): CheckResult {
    try {
      const status = execSync('git status --porcelain', {
        cwd: projectRoot,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      if (!status.trim()) {
        return {
          name: 'Working directory',
          status: 'pass',
          message: 'clean',
        };
      }

      const lines = status.trim().split('\n');
      const staged = lines.filter((l) => l.match(/^[MADRC]/)).length;
      const unstaged = lines.filter((l) => l.match(/^.[MADRC]/)).length;
      const untracked = lines.filter((l) => l.startsWith('??')).length;

      const parts: string[] = [];
      if (staged) parts.push(`${staged} staged`);
      if (unstaged) parts.push(`${unstaged} modified`);
      if (untracked) parts.push(`${untracked} untracked`);

      return {
        name: 'Working directory',
        status: 'warn',
        message: `dirty: ${parts.join(', ')}`,
        details: lines.slice(0, 5),
      };
    } catch {
      return {
        name: 'Working directory',
        status: 'fail',
        message: 'could not check status',
      };
    }
  }

  private checkRemote(projectRoot: string): CheckResult {
    try {
      const remotes = execSync('git remote -v', {
        cwd: projectRoot,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      if (!remotes.trim()) {
        return {
          name: 'Remote',
          status: 'warn',
          message: 'no remote configured',
          fixSuggestion: 'git remote add origin <url>',
        };
      }

      // Extract origin URL
      const originMatch = remotes.match(/origin\s+(\S+)/);
      const origin = originMatch ? originMatch[1] : 'configured';

      // Sanitize URL (hide tokens)
      const sanitized = origin
        .replace(/\/\/[^@]+@/, '//')
        .replace(/\.git$/, '');

      return {
        name: 'Remote',
        status: 'pass',
        message: sanitized,
      };
    } catch {
      return {
        name: 'Remote',
        status: 'warn',
        message: 'could not check remotes',
      };
    }
  }

  private checkBranch(projectRoot: string): CheckResult {
    try {
      const branch = execSync('git branch --show-current', {
        cwd: projectRoot,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();

      // Check if ahead/behind
      try {
        const status = execSync(
          `git rev-list --left-right --count @{u}...HEAD 2>/dev/null || echo "0 0"`,
          {
            cwd: projectRoot,
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
          }
        ).trim();

        const [behind, ahead] = status.split(/\s+/).map(Number);

        if (behind > 0 || ahead > 0) {
          const parts: string[] = [];
          if (ahead > 0) parts.push(`${ahead} ahead`);
          if (behind > 0) parts.push(`${behind} behind`);

          return {
            name: 'Branch',
            status: 'warn',
            message: `${branch} (${parts.join(', ')})`,
            fixSuggestion: behind > 0 ? 'git pull' : 'git push',
          };
        }
      } catch {
        // No upstream, which is fine
      }

      return {
        name: 'Branch',
        status: 'pass',
        message: branch || 'detached HEAD',
      };
    } catch {
      return {
        name: 'Branch',
        status: 'warn',
        message: 'could not determine branch',
      };
    }
  }
}
