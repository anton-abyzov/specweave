/**
 * Git Service for Safe Feature Deletion
 * Increment: 0053-safe-feature-deletion
 * Tasks: T-018, T-019, T-020, T-021, T-022, T-023
 */

import { Logger, consoleLogger } from '../../utils/logger.js';
import { GitServiceOptions, ValidationResult } from './types.js';
import { execFileNoThrow } from '../../utils/execFileNoThrow.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Feature Deletion Git Service
 * Handles git operations for feature deletion
 */
export class FeatureDeletionGitService {
  private projectRoot: string;
  private logger: Logger;

  constructor(options: GitServiceOptions) {
    this.projectRoot = options.projectRoot;
    this.logger = options.logger || consoleLogger;
  }

  /**
   * T-018, T-023: Stage git deletions (git rm for tracked, fs.unlink for untracked)
   */
  async stageGitDeletions(files: string[]): Promise<{ tracked: number; untracked: number }> {
    if (!(await this.detectGitRepository())) {
      throw new Error('Not a git repository. Use --no-git to skip git operations.');
    }

    let tracked = 0;
    let untracked = 0;

    for (const file of files) {
      if (await this.isFileTracked(file)) {
        await execFileNoThrow('git', ['rm', file], { cwd: this.projectRoot });
        tracked++;
      } else {
        await fs.unlink(file);
        untracked++;
      }
    }

    this.logger.log(`Staged ${tracked} tracked files (git rm), ${untracked} untracked files (unlink)`);
    return { tracked, untracked };
  }

  /**
   * T-019: Create git commit with descriptive message
   */
  async commitDeletion(featureId: string, validation: ValidationResult): Promise<string> {
    const user = await this.getGitUser();
    const orphanedLine = validation.orphanedIncrements.length > 0
      ? `- Orphaned increments: ${validation.orphanedIncrements.join(', ')} (force mode)\n`
      : '';

    const message = `feat: delete feature ${featureId}

- Deleted ${validation.files.length} files
- Living docs: ${validation.livingDocsFiles.length}
- User stories: ${validation.userStoryFiles.length}
${orphanedLine}
Deleted by: ${user}
Timestamp: ${new Date().toISOString()}
Mode: ${validation.mode}`;

    await execFileNoThrow('git', ['commit', '-m', message], { cwd: this.projectRoot });

    const result = await execFileNoThrow('git', ['rev-parse', 'HEAD'], { cwd: this.projectRoot });
    const sha = result.stdout.trim();

    this.logger.log(`Created commit ${sha.substring(0, 7)}`);
    return sha;
  }

  /**
   * T-021: Unstage git deletions (rollback)
   */
  async unstageGitDeletions(files: string[]): Promise<void> {
    await Promise.all(files.map(file =>
      execFileNoThrow('git', ['reset', 'HEAD', '--', file], { cwd: this.projectRoot })
        .catch(err => this.logger.warn(`Failed to unstage ${file}: ${err}`))
    ));
    this.logger.log(`Unstaged ${files.length} files`);
  }

  /**
   * T-023: Detect git repository
   */
  async detectGitRepository(): Promise<boolean> {
    try {
      const gitDir = path.join(this.projectRoot, '.git');
      await fs.access(gitDir);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if file is tracked by git
   */
  private async isFileTracked(file: string): Promise<boolean> {
    try {
      await execFileNoThrow('git', ['ls-files', '--error-unmatch', file], { cwd: this.projectRoot });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get git user name
   */
  private async getGitUser(): Promise<string> {
    const result = await execFileNoThrow('git', ['config', 'user.name'], { cwd: this.projectRoot });
    return result.stdout.trim() || process.env.USER || 'unknown';
  }
}
