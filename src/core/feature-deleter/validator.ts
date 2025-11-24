/**
 * Feature Validator for Safe Feature Deletion
 * Increment: 0053-safe-feature-deletion
 * Task: T-001 - Implement Active Increment Validation
 *
 * GREEN PHASE: Real implementation to make tests pass
 */

import { Logger, consoleLogger } from '../../utils/logger.js';
import {
  FeatureValidatorOptions,
  ValidationResult,
  DeletionOptions,
  IncrementMetadata
} from './types.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * FeatureValidator - Validates feature deletion pre-conditions
 *
 * GREEN PHASE: Implements active increment validation logic
 */
export class FeatureValidator {
  private projectRoot: string;
  private logger: Logger;

  constructor(options: FeatureValidatorOptions = {}) {
    this.projectRoot = options.projectRoot || process.cwd();
    this.logger = options.logger || consoleLogger;
  }

  /**
   * Validate feature deletion pre-conditions
   *
   * GREEN PHASE: Full implementation with increment scanning
   */
  async validate(featureId: string, options: DeletionOptions): Promise<ValidationResult> {
    this.logger.log(`Validating feature ${featureId} (force: ${options.force})`);

    const errors: string[] = [];
    const warnings: string[] = [];
    const mode = options.force ? 'force' : 'safe';

    // Scan for increment references
    const { activeIncrements, completedIncrements } = await this.scanIncrementReferences(featureId);

    // Check active increments (blocking in safe mode)
    if (activeIncrements.length > 0 && !options.force) {
      const incrementList = activeIncrements.join(', ');
      const count = activeIncrements.length;
      const plural = count > 1 ? 's' : '';
      errors.push(
        `Cannot delete feature ${featureId}: ${count} active increment${plural} reference${count > 1 ? '' : 's'} this feature (${incrementList}). Use --force to override.`
      );
    }

    // Log warnings for completed/abandoned/archived increments
    if (completedIncrements.length > 0) {
      warnings.push(
        `Note: ${completedIncrements.length} completed/abandoned/archived increment(s) reference this feature: ${completedIncrements.join(', ')}`
      );
    }

    const valid = errors.length === 0;

    return {
      valid,
      errors,
      warnings,
      featureId,
      files: [],
      livingDocsFiles: [],
      userStoryFiles: [],
      orphanedIncrements: activeIncrements,
      githubIssues: [],
      mode
    };
  }

  /**
   * Scan increment metadata.json files for feature_id references
   *
   * GREEN PHASE: Full implementation with file system scanning
   */
  private async scanIncrementReferences(featureId: string): Promise<{
    activeIncrements: string[];
    completedIncrements: string[];
  }> {
    this.logger.log(`Scanning increments for feature ${featureId}`);

    const incrementsDir = path.join(this.projectRoot, '.specweave/increments');
    const activeIncrements: string[] = [];
    const completedIncrements: string[] = [];

    try {
      // Read all directories in .specweave/increments/
      const entries = await fs.readdir(incrementsDir, { withFileTypes: true });

      // Filter to directories only (increment folders)
      const incrementDirs = entries
        .filter(entry => entry.isDirectory())
        .filter(entry => !entry.name.startsWith('_')); // Skip _archive, _working, etc.

      // Scan each increment's metadata.json
      for (const dir of incrementDirs) {
        const metadataPath = path.join(incrementsDir, dir.name, 'metadata.json');

        try {
          const metadataContent = await fs.readFile(metadataPath, 'utf-8');
          const metadata: IncrementMetadata = JSON.parse(metadataContent);

          // Check if this increment references the feature
          if (metadata.feature_id === featureId) {
            const status = metadata.status?.toLowerCase() || '';

            // Categorize by status
            if (status === 'completed' || status === 'abandoned' || status === 'archived') {
              completedIncrements.push(metadata.id);
            } else {
              // Active statuses: in-progress, planned, paused, backlog, etc.
              activeIncrements.push(metadata.id);
            }
          }
        } catch (error) {
          // Skip increments with missing or invalid metadata.json
          this.logger.warn(`Failed to read metadata for ${dir.name}: ${error}`);
        }
      }

      this.logger.log(`Found ${activeIncrements.length} active increments, ${completedIncrements.length} completed increments`);
    } catch (error) {
      // If .specweave/increments/ doesn't exist, no increments to scan
      this.logger.warn(`Failed to scan increments directory: ${error}`);
    }

    return { activeIncrements, completedIncrements };
  }
}
