/**
 * Git Checker - validates git repository status
 */

import { execSync } from 'child_process';
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
