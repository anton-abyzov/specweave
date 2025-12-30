/**
 * Feature Deleter - Main Orchestrator
 * Increment: 0053-safe-feature-deletion
 * Tasks: T-012, T-013, T-014, T-015, T-016, T-017, T-036
 */

import { Logger, consoleLogger } from '../../utils/logger.js';
import { FeatureDeleterOptions, DeletionOptions, DeletionResult } from './types.js';
import { FeatureValidator } from './validator.js';
import { ConfirmationManager } from './confirmation-manager.js';
import { DeletionTransaction } from './deletion-transaction.js';
import { FeatureDeletionGitHubService } from './github-service.js';
import { FeatureDeletionAuditLogger } from './audit-logger.js';
import { getProjectRoot } from '../../utils/find-project-root.js';

/**
 * Feature Deleter - Orchestrates safe feature deletion workflow
 * Steps: Validate → Confirm → Execute Transaction → Audit
 */
export class FeatureDeleter {
  private projectRoot: string;
  private logger: Logger;
  private validator: FeatureValidator;
  private confirmationManager: ConfirmationManager;
  private auditLogger: FeatureDeletionAuditLogger;

  constructor(options: FeatureDeleterOptions = {}) {
    // CRITICAL FIX: Uses getProjectRoot() instead of process.cwd() to prevent
    // accessing wrong .specweave folder when CWD != project root.
    this.projectRoot = options.projectRoot || getProjectRoot();
    this.logger = options.logger || consoleLogger;

    this.validator = new FeatureValidator({
      projectRoot: this.projectRoot,
      logger: this.logger
    });

    this.confirmationManager = new ConfirmationManager(this.logger);
    this.auditLogger = new FeatureDeletionAuditLogger(this.projectRoot, this.logger);
  }

  /**
   * T-036: Execute feature deletion workflow
   */
  async execute(featureId: string, options: DeletionOptions): Promise<DeletionResult> {
    try {
      // Step 1: Validate
      const validation = await this.validator.validate(featureId, options);

      // T-013, T-014, T-015: Show dry-run report
      if (options.dryRun) {
        return this.handleDryRun(validation, options);
      }

      // T-003: Display validation report
      const report = this.validator.formatValidationReport(validation);
      console.log('\n' + report + '\n');

      // Check validation errors
      if (!validation.valid) {
        await this.auditLogger.logDeletion({
          featureId,
          mode: validation.mode,
          filesDeleted: 0,
          status: 'failed',
          errors: validation.errors
        });

        return {
          success: false,
          featureId,
          filesDeleted: 0,
          errors: validation.errors,
          warnings: validation.warnings
        };
      }

      // Step 2: Confirm
      const confirmed = await this.confirmationManager.confirm(validation, options);
      if (!confirmed) {
        console.log('\nDeletion cancelled by user.');
        return {
          success: false,
          featureId,
          filesDeleted: 0,
          errors: ['Cancelled by user']
        };
      }

      // Step 3: Execute transaction
      const transaction = new DeletionTransaction({
        projectRoot: this.projectRoot,
        logger: this.logger
      });

      const result = await transaction.execute(validation, options);

      // Step 4: GitHub cleanup (optional)
      let githubIssuesClosed = 0;
      if (!options.noGithub) {
        githubIssuesClosed = await this.handleGitHubCleanup(validation, options);
        result.githubIssuesClosed = githubIssuesClosed;
      }

      // Step 5: Audit log
      await this.auditLogger.logDeletion({
        featureId,
        mode: validation.mode,
        filesDeleted: result.filesDeleted,
        commitSha: result.commitSha,
        orphanedIncrements: result.orphanedIncrements,
        githubIssuesClosed,
        status: 'success'
      });

      return result;
    } catch (error: any) {
      // Log failure
      await this.auditLogger.logDeletion({
        featureId,
        mode: options.force ? 'force' : 'safe',
        filesDeleted: 0,
        status: 'failed',
        errors: [error.message || error.toString()]
      });

      throw error;
    }
  }

  /**
   * T-012, T-013, T-014, T-015: Handle dry-run mode
   */
  private async handleDryRun(validation: any, options: DeletionOptions): Promise<DeletionResult> {
    console.log('\n[DRY-RUN] Deletion Plan:\n');
    console.log(this.validator.formatValidationReport(validation));
    console.log('\nFiles to delete:');
    validation.files.forEach((f: string) => console.log(`  ${f}`));

    console.log('\nGit operations:');
    console.log(`  - git rm (tracked files)`);
    console.log(`  - rm (untracked files)`);
    console.log(`  - git commit -m "feat: delete feature ${validation.featureId}"`);

    if (!options.noGithub && validation.githubIssues?.length > 0) {
      console.log('\nGitHub operations:');
      validation.githubIssues.forEach((issue: any) => {
        console.log(`  - Close issue #${issue.number}: ${issue.title}`);
      });
    }

    console.log('\n✓ Dry-run complete (no changes made)\n');

    return {
      success: true,
      featureId: validation.featureId,
      filesDeleted: 0,
      warnings: ['Dry-run mode - no changes made']
    };
  }

  /**
   * Handle GitHub issue cleanup
   */
  private async handleGitHubCleanup(validation: any, options: DeletionOptions): Promise<number> {
    try {
      // Extract owner/repo from git remote
      const { owner, repo } = await this.getGitHubOwnerRepo();

      if (!owner || !repo) {
        this.logger.warn('GitHub cleanup skipped: Unable to detect owner/repo from git remote');
        return 0;
      }

      // Find GitHub issues
      const githubService = new FeatureDeletionGitHubService({
        owner,
        repo,
        logger: this.logger
      });

      const issues = await githubService.findFeatureIssues(validation.featureId);

      if (issues.length === 0) {
        return 0;
      }

      // T-026: Confirm GitHub cleanup
      const confirmed = await this.confirmationManager.confirmGitHub(issues.length, options);

      if (!confirmed) {
        console.log('GitHub cleanup skipped.');
        return 0;
      }

      // Close issues
      const { closed } = await githubService.deleteIssues(issues);
      return closed;
    } catch (error) {
      this.logger.warn(`GitHub cleanup failed (non-critical): ${error}`);
      return 0;
    }
  }

  /**
   * Extract GitHub owner and repo from git remote URL
   */
  private async getGitHubOwnerRepo(): Promise<{ owner: string; repo: string }> {
    try {
      const { execFileNoThrow } = await import('../../utils/execFileNoThrow.js');
      const result = await execFileNoThrow('git', ['remote', 'get-url', 'origin'], {
        cwd: this.projectRoot
      });

      if (!result.success) {
        return { owner: '', repo: '' };
      }

      const remoteUrl = result.stdout.trim();

      // Parse GitHub URL patterns:
      // - https://github.com/owner/repo.git
      // - git@github.com:owner/repo.git
      // - https://github.com/owner/repo
      const httpsMatch = remoteUrl.match(/github\.com[/:]([\w-]+)\/([\w-]+?)(\.git)?$/);

      if (httpsMatch) {
        return {
          owner: httpsMatch[1],
          repo: httpsMatch[2]
        };
      }

      return { owner: '', repo: '' };
    } catch (error) {
      this.logger.warn(`Failed to extract GitHub owner/repo: ${error}`);
      return { owner: '', repo: '' };
    }
  }
}
