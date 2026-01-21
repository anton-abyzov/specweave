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
   * Tasks: T-001, T-002, T-003, T-005, T-006
   */
  async validate(featureId: string, options: DeletionOptions): Promise<ValidationResult> {
    this.logger.log(`Validating feature ${featureId} (force: ${options.force})`);

    const errors: string[] = [];
    const warnings: string[] = [];
    const mode = options.force ? 'force' : 'safe';

    // T-005: Detect feature files (living docs + user stories)
    const { livingDocsFiles, userStoryFiles, allFiles } = await this.detectFeatureFiles(featureId);

    // T-006: Validate git working directory (clean)
    if (!options.noGit) {
      const gitClean = await this.validateGitStatus();
      if (!gitClean) {
        errors.push('Git working directory has uncommitted changes. Commit or stash changes before deletion.');
      }
    }

    // T-001: Scan for increment references
    const { activeIncrements, completedIncrements } = await this.scanIncrementReferences(featureId);

    // T-001: Check active increments (blocking in safe mode)
    if (activeIncrements.length > 0 && !options.force) {
      const count = activeIncrements.length;
      const s = count > 1 ? 's' : '';
      errors.push(
        `Cannot delete feature ${featureId}: ${count} active increment${s} reference${s} this feature (${activeIncrements.join(', ')}). Use --force to override.`
      );
    }

    // T-002: Log warnings for completed/abandoned/archived increments
    if (completedIncrements.length > 0) {
      warnings.push(
        `Note: ${completedIncrements.length} completed/abandoned/archived increment(s) reference this feature: ${completedIncrements.join(', ')}`
      );
    }

    // Check if feature exists
    if (allFiles.length === 0) {
      errors.push(`Feature ${featureId} not found (no living docs or user stories)`);
    }

    const valid = errors.length === 0;

    return {
      valid,
      errors,
      warnings,
      featureId,
      files: allFiles,
      livingDocsFiles,
      userStoryFiles,
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

  /**
   * T-005: Detect all feature files (living docs + user stories)
   * v5.0.0: Features now live in {project}/FS-XXX/ (no _features folder)
   */
  private async detectFeatureFiles(featureId: string): Promise<{
    livingDocsFiles: string[];
    userStoryFiles: string[];
    allFiles: string[];
  }> {
    const livingDocsFiles: string[] = [];
    const userStoryFiles: string[] = [];

    // v5.0.0: Features live in project folders {project}/FS-XXX/
    // Scan all project folders for this feature
    const specsPath = path.join(this.projectRoot, '.specweave/docs/internal/specs');
    try {
      const projects = await fs.readdir(specsPath, { withFileTypes: true });
      for (const project of projects) {
        if (project.isDirectory() && !project.name.startsWith('_')) {
          const featurePath = path.join(specsPath, project.name, featureId);
          try {
            const files = await fs.readdir(featurePath);

            // FEATURE.md goes to livingDocsFiles
            if (files.includes('FEATURE.md')) {
              livingDocsFiles.push(path.join(featurePath, 'FEATURE.md'));
            }

            // User stories go to userStoryFiles
            const userStoryPaths = files
              .filter(f => f.startsWith('us-') && f.endsWith('.md'))
              .map(f => path.join(featurePath, f));
            userStoryFiles.push(...userStoryPaths);
          } catch (error) {
            // Feature folder doesn't exist in this project - not an error
          }
        }
      }
    } catch (error) {
      // Specs folder doesn't exist - not an error
    }

    const allFiles = [...livingDocsFiles, ...userStoryFiles];
    this.logger.log(`Detected ${allFiles.length} files: ${livingDocsFiles.length} living docs, ${userStoryFiles.length} user stories`);
    return { livingDocsFiles, userStoryFiles, allFiles };
  }

  /**
   * T-006: Validate git working directory is clean
   */
  private async validateGitStatus(): Promise<boolean> {
    try {
      const { execFileNoThrow } = await import('../../utils/execFileNoThrow.js');
      const result = await execFileNoThrow('git', ['status', '--porcelain'], {
        cwd: this.projectRoot
      });

      // Clean if no output (empty means no changes)
      return result.stdout.trim() === '';
    } catch (error) {
      // Git not available or not a git repo - allow deletion
      this.logger.warn(`Git status check failed: ${error}`);
      return true;
    }
  }

  /**
   * T-003: Format validation report for display
   */
  formatValidationReport(validation: ValidationResult): string {
    const lines = [
      'Validation Complete:',
      `  Feature ID: ${validation.featureId}`,
      `  Files to delete: ${validation.files.length}`,
      `    - Living docs: ${validation.livingDocsFiles.length}`,
      `    - User stories: ${validation.userStoryFiles.length}`
    ];

    if (validation.orphanedIncrements.length > 0) {
      const label = validation.mode === 'force' ? 'will be orphaned' : 'blocking';
      const icon = validation.mode === 'force' ? '⚠️' : '❌';
      lines.push(`  ${icon} Active increments (${label}): ${validation.orphanedIncrements.length}`);
      lines.push(...validation.orphanedIncrements.map(id => `    - ${id}`));
    } else {
      lines.push('  ✓ No active increments (safe to delete)');
    }

    if (validation.warnings?.length) {
      lines.push('  Warnings:', ...validation.warnings.map(w => `    ⚠️  ${w}`));
    }

    if (validation.errors.length > 0) {
      lines.push('  Errors:', ...validation.errors.map(e => `    ❌ ${e}`));
    }

    return lines.join('\n');
  }
}
