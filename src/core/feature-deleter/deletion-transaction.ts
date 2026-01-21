/**
 * Deletion Transaction with 3-Phase Commit
 * Increment: 0053-safe-feature-deletion
 * Tasks: T-007, T-008, T-009, T-010, T-011
 */

import { Logger, consoleLogger } from '../../utils/logger.js';
import { DeletionTransactionOptions, DeletionOptions, DeletionResult, ValidationResult } from './types.js';
import { FeatureDeletionGitService } from './git-service.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Deletion Transaction - Atomic deletion with rollback
 * Implements 3-phase commit: Validation → Staging → Commit
 */
export class DeletionTransaction {
  private projectRoot: string;
  private logger: Logger;
  private gitService: FeatureDeletionGitService;
  private backupDir: string;
  private checkpointFile: string;

  constructor(options: DeletionTransactionOptions) {
    this.projectRoot = options.projectRoot;
    this.logger = options.logger || consoleLogger;
    this.gitService = new FeatureDeletionGitService({
      projectRoot: this.projectRoot,
      logger: this.logger
    });

    const timestamp = Date.now();
    this.backupDir = path.join(this.projectRoot, '.specweave/state/deletion-backup', `${timestamp}`);
    this.checkpointFile = path.join(this.projectRoot, '.specweave/state/deletion-checkpoint.json');
  }

  /**
   * T-010: Execute transaction (3-phase commit)
   */
  async execute(validation: ValidationResult, options: DeletionOptions): Promise<DeletionResult> {
    this.logger.log('Starting deletion transaction (3-phase commit)');

    try {
      // Phase 1: Validation (already done, passed in)
      this.logger.log('Phase 1: Validation - PASSED');

      // Phase 2: Staging (reversible)
      await this.stagingPhase(validation, options);

      // Phase 3: Commit (irreversible)
      const result = await this.commitPhase(validation, options);

      // Cleanup
      await this.cleanup();

      return result;
    } catch (error) {
      this.logger.error(`Transaction failed: ${error}`);
      await this.rollback(validation.files);
      throw error;
    }
  }

  /**
   * T-008, T-010: Phase 2 - Staging (reversible)
   */
  private async stagingPhase(validation: ValidationResult, options: DeletionOptions): Promise<void> {
    this.logger.log('Phase 2: Staging - Creating backup and staging deletions');

    await this.createBackup(validation.files);
    await this.createCheckpoint(validation);

    // Stage git deletions or just delete files if --no-git
    if (options.noGit) {
      await Promise.all(validation.files.map(file => fs.unlink(file)));
    } else {
      await this.gitService.stageGitDeletions(validation.files);
    }

    this.logger.log('Phase 2: Staging - COMPLETE');
  }

  /**
   * T-010: Phase 3 - Commit (irreversible)
   */
  private async commitPhase(validation: ValidationResult, options: DeletionOptions): Promise<DeletionResult> {
    this.logger.log('Phase 3: Commit - Finalizing deletion');

    const commitSha = options.noGit ? undefined : await this.gitService.commitDeletion(validation.featureId, validation);

    if (options.force && validation.orphanedIncrements.length > 0) {
      await this.updateOrphanedMetadata(validation.orphanedIncrements);
    }

    this.logger.log('Phase 3: Commit - COMPLETE');

    return {
      success: true,
      featureId: validation.featureId,
      filesDeleted: validation.files.length,
      commitSha,
      orphanedIncrements: validation.orphanedIncrements,
      warnings: validation.warnings
    };
  }

  /**
   * T-011: Rollback (restore from backup)
   */
  private async rollback(files: string[]): Promise<void> {
    this.logger.warn('Rolling back transaction...');

    try {
      // Restore files from backup (continue on individual file failures)
      await Promise.all(files.map(async file => {
        const backupPath = path.join(this.backupDir, path.relative(this.projectRoot, file));
        await fs.copyFile(backupPath, file).catch(err => this.logger.warn(`Failed to restore ${file}: ${err}`));
      }));

      await this.gitService.unstageGitDeletions(files);
      this.logger.log('Rollback complete. Files restored from backup.');
    } catch (error) {
      this.logger.error(`Rollback failed: ${error}`);
      this.logger.error('Backup preserved at: ' + this.backupDir);
      throw error;
    }
  }

  /**
   * T-008: Create backup of files
   */
  private async createBackup(files: string[]): Promise<void> {
    this.logger.log(`Creating backup at ${this.backupDir}`);

    await Promise.all(files.map(async file => {
      const backupPath = path.join(this.backupDir, path.relative(this.projectRoot, file));
      await fs.mkdir(path.dirname(backupPath), { recursive: true });
      await fs.copyFile(file, backupPath);
    }));

    this.logger.log(`Backed up ${files.length} files`);
  }

  /**
   * T-008: Create checkpoint file
   */
  private async createCheckpoint(validation: ValidationResult): Promise<void> {
    const checkpoint = {
      timestamp: new Date().toISOString(),
      featureId: validation.featureId,
      filesCount: validation.files.length,
      backupDir: this.backupDir,
      phase: 'staging'
    };

    const checkpointDir = path.dirname(this.checkpointFile);
    await fs.mkdir(checkpointDir, { recursive: true });
    await fs.writeFile(this.checkpointFile, JSON.stringify(checkpoint, null, 2));

    this.logger.log('Checkpoint created');
  }

  /**
   * T-009: Update orphaned increment metadata (remove feature_id)
   */
  private async updateOrphanedMetadata(orphanedIncrements: string[]): Promise<void> {
    this.logger.log(`Updating ${orphanedIncrements.length} orphaned increment(s) metadata`);

    for (const incrementId of orphanedIncrements) {
      const metadataPath = path.join(this.projectRoot, '.specweave/increments', incrementId, 'metadata.json');

      try {
        const content = await fs.readFile(metadataPath, 'utf-8');
        const metadata = JSON.parse(content);

        // Remove feature_id field
        delete metadata.feature_id;

        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
        this.logger.log(`Updated metadata for ${incrementId}`);
      } catch (error) {
        this.logger.warn(`Failed to update metadata for ${incrementId}: ${error}`);
      }
    }
  }

  /**
   * Cleanup backup and checkpoint after successful commit
   */
  private async cleanup(): Promise<void> {
    try {
      // Remove backup directory
      await fs.rm(this.backupDir, { recursive: true, force: true });

      // Remove checkpoint file
      await fs.unlink(this.checkpointFile);

      this.logger.log('Cleanup complete');
    } catch (error) {
      this.logger.warn(`Cleanup failed: ${error}`);
    }
  }
}
