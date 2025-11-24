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
    let tracked = 0;
    let untracked = 0;

    // Check if git repo exists
    const isGitRepo = await this.detectGitRepository();
    if (!isGitRepo) {
      throw new Error('Not a git repository. Use --no-git to skip git operations.');
    }

    for (const file of files) {
      const isTracked = await this.isFileTracked(file);

      if (isTracked) {
        // Use git rm for tracked files
        await execFileNoThrow('git', ['rm', file], { cwd: this.projectRoot });
        tracked++;
      } else {
        // Use fs.unlink for untracked files
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
    // Get user from git config
    const user = await this.getGitUser();
    const timestamp = new Date().toISOString();
    const mode = validation.mode;

    // Format commit message
    const message = [
      `feat: delete feature ${featureId}`,
      '',
      `- Deleted ${validation.files.length} files`,
      `- Living docs: ${validation.livingDocsFiles.length}`,
      `- User stories: ${validation.userStoryFiles.length}`,
      validation.orphanedIncrements.length > 0 ? `- Orphaned increments: ${validation.orphanedIncrements.join(', ')} (force mode)` : '',
      '',
      `Deleted by: ${user}`,
      `Timestamp: ${timestamp}`,
      `Mode: ${mode}`
    ].filter(Boolean).join('\n');

    // Create commit
    await execFileNoThrow('git', ['commit', '-m', message], { cwd: this.projectRoot });

    // Get commit SHA
    const result = await execFileNoThrow('git', ['rev-parse', 'HEAD'], { cwd: this.projectRoot });
    const sha = result.stdout.trim();

    this.logger.log(`Created commit ${sha.substring(0, 7)}`);
    return sha;
  }

  /**
   * T-021: Unstage git deletions (rollback)
   */
  async unstageGitDeletions(files: string[]): Promise<void> {
    for (const file of files) {
      try {
        await execFileNoThrow('git', ['reset', 'HEAD', '--', file], { cwd: this.projectRoot });
      } catch (error) {
        this.logger.warn(`Failed to unstage ${file}: ${error}`);
      }
    }

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
    try {
      const result = await execFileNoThrow('git', ['config', 'user.name'], { cwd: this.projectRoot });
      return result.stdout.trim();
    } catch {
      return process.env.USER || 'unknown';
    }
  }
}
