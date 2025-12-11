/**
 * Feature Consistency Validator
 * v5.0.0 - Unified Project Structure
 *
 * Validates feature folder consistency within project folders:
 * - .specweave/docs/internal/specs/{project}/FS-XXX/FEATURE.md
 *
 * PROBLEM SOLVED:
 * Features in project folders should have proper FEATURE.md files.
 * If sync fails midway or increment is deleted, features can be orphaned.
 *
 * SOLUTION:
 * 1. Detect orphaned features (no FEATURE.md or linked increment deleted)
 * 2. Auto-repair by archiving orphaned features
 * 3. Report issues for manual intervention when auto-repair not possible
 *
 * @see ADR-0142 (if created) for architectural decision
 */

import { existsSync, promises as fs } from 'fs';
import path from 'path';
import yaml from 'yaml';
import { Logger, consoleLogger } from '../../utils/logger.js';

export interface DiscrepancyReport {
  /** Feature ID (e.g., "FS-062") */
  featureId: string;
  /** Type of discrepancy */
  type: 'missing_feature_md' | 'orphaned_feature';
  /** Description of the issue */
  description: string;
  /** Can this be auto-repaired? */
  autoRepairable: boolean;
  /** Path to feature folder in project */
  featurePath?: string;
  /** Project ID */
  projectId?: string;
  /** Linked increment ID (if found in FEATURE.md) */
  linkedIncrementId?: string;
  /** Whether linked increment exists */
  incrementExists?: boolean;
}

export interface ValidationResult {
  /** Total features scanned */
  totalFeatures: number;
  /** Number of consistent features */
  consistentCount: number;
  /** List of discrepancies found */
  discrepancies: DiscrepancyReport[];
  /** Auto-repair results (if repair was attempted) */
  repairs?: RepairResult[];
}

export interface RepairResult {
  featureId: string;
  success: boolean;
  action: string;
  error?: string;
}

export interface ValidatorOptions {
  /** Logger instance */
  logger?: Logger;
  /** Default project name (for creating missing project folders) */
  defaultProject?: string;
  /** Whether to include archived features in validation */
  includeArchived?: boolean;
}

export class FeatureConsistencyValidator {
  private projectRoot: string;
  private specsPath: string;
  private incrementsPath: string;
  private logger: Logger;
  private defaultProject: string;
  private includeArchived: boolean;

  constructor(projectRoot: string, options: ValidatorOptions = {}) {
    this.projectRoot = projectRoot;
    this.specsPath = path.join(projectRoot, '.specweave/docs/internal/specs');
    this.incrementsPath = path.join(projectRoot, '.specweave/increments');
    this.logger = options.logger ?? consoleLogger;
    this.defaultProject = options.defaultProject ?? 'specweave';
    this.includeArchived = options.includeArchived ?? false;
  }

  /**
   * Validate feature folder consistency within project folders
   * v5.0.0: Features now live in {project}/FS-XXX/ (no _features folder)
   *
   * @param autoRepair - If true, attempt to auto-repair discrepancies
   * @returns Validation result with discrepancies and repair results
   */
  async validate(autoRepair: boolean = false): Promise<ValidationResult> {
    const result: ValidationResult = {
      totalFeatures: 0,
      consistentCount: 0,
      discrepancies: [],
      repairs: autoRepair ? [] : undefined
    };

    this.logger.log('🔍 Validating feature folder consistency...');

    // Step 1: Get all project folders
    const projectFolders = await this.getProjectFolders();

    if (projectFolders.length === 0) {
      this.logger.log('   ℹ️  No project folders found, nothing to validate');
      return result;
    }

    // Step 2: Scan all features in each project
    for (const projectId of projectFolders) {
      const projectPath = path.join(this.specsPath, projectId);
      const featureFolders = await this.getFeatureFoldersInProject(projectPath);

      for (const featureId of featureFolders) {
        result.totalFeatures++;
        const discrepancy = await this.checkFeatureConsistency(
          featureId,
          projectId
        );

        if (discrepancy) {
          result.discrepancies.push(discrepancy);

          // Attempt auto-repair if enabled
          if (autoRepair && discrepancy.autoRepairable) {
            const repairResult = await this.repairDiscrepancy(discrepancy);
            result.repairs!.push(repairResult);

            if (repairResult.success) {
              result.consistentCount++; // Count as consistent after repair
            }
          }
        } else {
          result.consistentCount++;
        }
      }
    }

    // Step 3: Log summary
    this.logValidationSummary(result);

    return result;
  }

  /**
   * Get all feature folder IDs from a project directory
   * v5.0.0: Features now live in {project}/FS-XXX/
   */
  private async getFeatureFoldersInProject(projectDir: string): Promise<string[]> {
    const entries = await fs.readdir(projectDir, { withFileTypes: true });
    const folders: string[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      // Skip _archive unless includeArchived is true
      if (entry.name === '_archive' && !this.includeArchived) continue;

      // Only include FS-XXX pattern folders
      if (entry.name.startsWith('FS-')) {
        folders.push(entry.name);
      }
    }

    return folders.sort();
  }

  /**
   * Get all project folder names (excluding _features, _epics, _archive)
   */
  private async getProjectFolders(): Promise<string[]> {
    if (!existsSync(this.specsPath)) {
      return [];
    }

    const entries = await fs.readdir(this.specsPath, { withFileTypes: true });
    const projects: string[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      // Skip special folders
      if (entry.name.startsWith('_')) continue;

      projects.push(entry.name);
    }

    return projects;
  }

  /**
   * Check if a feature has proper FEATURE.md and linked increment
   * v5.0.0: Features live in {project}/FS-XXX/
   */
  private async checkFeatureConsistency(
    featureId: string,
    projectId: string
  ): Promise<DiscrepancyReport | null> {
    const featurePath = path.join(this.specsPath, projectId, featureId);
    const featureFilePath = path.join(featurePath, 'FEATURE.md');

    // Check if FEATURE.md exists
    if (!existsSync(featureFilePath)) {
      return {
        featureId,
        type: 'missing_feature_md',
        description: `${projectId}/${featureId}/ exists but has no FEATURE.md`,
        autoRepairable: false,
        featurePath,
        projectId
      };
    }

    // Parse FEATURE.md to find linked increment
    const linkedIncrement = await this.extractLinkedIncrement(featureFilePath);
    const incrementExists = linkedIncrement
      ? this.checkIncrementExists(linkedIncrement)
      : false;

    // Check if this is an orphaned feature (increment deleted, not external)
    const isExternalFeature = await this.isExternalFeature(featureFilePath);

    if (!incrementExists && !isExternalFeature && linkedIncrement) {
      // ORPHANED: Increment was deleted, feature is not external - should be archived
      return {
        featureId,
        type: 'orphaned_feature',
        description: `Feature ${featureId} references deleted increment ${linkedIncrement} - should be archived`,
        autoRepairable: true, // Can auto-repair via archiver
        featurePath,
        projectId,
        linkedIncrementId: linkedIncrement,
        incrementExists: false
      };
    }

    // Feature is consistent
    return null;
  }

  /**
   * Check if a feature is from an external source (GitHub, JIRA, ADO)
   * External features should NOT be considered orphaned even if local increment is missing
   */
  private async isExternalFeature(featureFilePath: string): Promise<boolean> {
    try {
      const content = await fs.readFile(featureFilePath, 'utf-8');

      // Check frontmatter for external indicators
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (frontmatterMatch) {
        try {
          const frontmatter = yaml.parse(frontmatterMatch[1]);
          if (frontmatter.origin === 'external' ||
              frontmatter.external_source ||
              frontmatter.external_id) {
            return true;
          }
        } catch {
          // Ignore YAML parse errors
        }
      }

      // Check for external badges/markers in content
      // 🔗 = GitHub, 🎫 = JIRA, 📋 = ADO
      if (content.includes('origin: external') ||
          content.includes('external_source:') ||
          content.includes('external_id:')) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Extract linked increment ID from FEATURE.md
   */
  private async extractLinkedIncrement(featureFilePath: string): Promise<string | null> {
    try {
      const content = await fs.readFile(featureFilePath, 'utf-8');

      // Look for increment link pattern: [0062-test-living-docs-auto-sync](...)
      const incrementMatch = content.match(/\[(\d{4}-[^\]]+)\]\([^)]+\)/);
      if (incrementMatch) {
        return incrementMatch[1];
      }

      // Also check frontmatter
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (frontmatterMatch) {
        try {
          const frontmatter = yaml.parse(frontmatterMatch[1]);
          if (frontmatter.increment) {
            return frontmatter.increment;
          }
        } catch {
          // Ignore YAML parse errors
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Check if an increment exists (in active or archive folder)
   */
  private checkIncrementExists(incrementId: string): boolean {
    const activePath = path.join(this.incrementsPath, incrementId);
    const archivePath = path.join(this.incrementsPath, '_archive', incrementId);
    return existsSync(activePath) || existsSync(archivePath);
  }

  /**
   * Attempt to repair a discrepancy
   * v5.0.0: Only orphaned_feature repairs supported (archiving)
   */
  private async repairDiscrepancy(discrepancy: DiscrepancyReport): Promise<RepairResult> {
    const result: RepairResult = {
      featureId: discrepancy.featureId,
      success: false,
      action: ''
    };

    try {
      switch (discrepancy.type) {
        case 'orphaned_feature':
          // Auto-archive orphaned features (increment was deleted)
          if (discrepancy.autoRepairable) {
            result.action = await this.archiveOrphanedFeature(discrepancy);
            result.success = true;
          } else {
            result.action = 'Skipped - requires manual intervention';
            result.success = false;
          }
          break;

        case 'missing_feature_md':
          // Cannot auto-repair missing FEATURE.md
          result.action = 'Cannot auto-repair - FEATURE.md must be created manually or via /sw:sync-specs';
          result.success = false;
          break;

        default:
          result.action = 'Unknown discrepancy type';
          result.success = false;
      }
    } catch (error) {
      result.error = String(error);
      result.action = `Failed: ${error}`;
    }

    return result;
  }

  /**
   * Archive an orphaned feature (increment was deleted)
   * v5.0.0: Delegates to FeatureArchiver for consistent archiving behavior
   */
  private async archiveOrphanedFeature(discrepancy: DiscrepancyReport): Promise<string> {
    // Dynamic import to avoid circular dependency
    const { FeatureArchiver } = await import('./feature-archiver.js');
    const archiver = new FeatureArchiver(this.projectRoot);

    this.logger.log(`   🗂️  Archiving orphaned feature ${discrepancy.featureId} (increment deleted)...`);

    const archiveResult = await archiver.archiveFeatures({
      archiveOrphanedFeatures: true,
      archiveOrphanedEpics: false, // Be conservative - only archive features
      dryRun: false,
      updateLinks: true,
      customReason: `Increment ${discrepancy.linkedIncrementId || 'unknown'} was deleted`
    });

    if (archiveResult.archivedFeatures.includes(discrepancy.featureId)) {
      this.logger.log(`   ✅ Archived ${discrepancy.featureId} to ${discrepancy.projectId}/_archive/`);
      return `Archived orphaned feature ${discrepancy.featureId} (increment ${discrepancy.linkedIncrementId} deleted)`;
    } else if (archiveResult.errors.length > 0) {
      throw new Error(archiveResult.errors.join(', '));
    } else {
      // Feature might have been archived by another process or already in archive
      return `Feature ${discrepancy.featureId} already archived or cleaned up`;
    }
  }

  /**
   * Log validation summary
   */
  private logValidationSummary(result: ValidationResult): void {
    this.logger.log('');
    this.logger.log('═══════════════════════════════════════════════════════');
    this.logger.log('📊 FEATURE CONSISTENCY VALIDATION REPORT');
    this.logger.log('═══════════════════════════════════════════════════════');
    this.logger.log('');
    this.logger.log(`Total features scanned: ${result.totalFeatures}`);
    this.logger.log(`Consistent: ${result.consistentCount}`);
    this.logger.log(`Discrepancies found: ${result.discrepancies.length}`);
    this.logger.log('');

    if (result.discrepancies.length > 0) {
      this.logger.log('───────────────────────────────────────────────────────');
      this.logger.log('⚠️  DISCREPANCIES');
      this.logger.log('───────────────────────────────────────────────────────');

      for (const disc of result.discrepancies) {
        this.logger.log('');
        this.logger.log(`Feature: ${disc.featureId}`);
        this.logger.log(`Type: ${disc.type}`);
        this.logger.log(`Description: ${disc.description}`);
        this.logger.log(`Auto-repairable: ${disc.autoRepairable ? 'Yes' : 'No'}`);
        if (disc.linkedIncrementId) {
          this.logger.log(`Linked increment: ${disc.linkedIncrementId} (${disc.incrementExists ? '✅ exists' : '❌ not found'})`);
        }
      }
    }

    if (result.repairs && result.repairs.length > 0) {
      this.logger.log('');
      this.logger.log('───────────────────────────────────────────────────────');
      this.logger.log('🔧 REPAIR RESULTS');
      this.logger.log('───────────────────────────────────────────────────────');

      for (const repair of result.repairs) {
        const icon = repair.success ? '✅' : '❌';
        this.logger.log(`${icon} ${repair.featureId}: ${repair.action}`);
        if (repair.error) {
          this.logger.log(`   Error: ${repair.error}`);
        }
      }
    }

    this.logger.log('');
    this.logger.log('═══════════════════════════════════════════════════════');
  }

  /**
   * Quick check: Are there any discrepancies?
   * Use this for fast validation without full report
   */
  async hasDiscrepancies(): Promise<boolean> {
    const result = await this.validate(false);
    return result.discrepancies.length > 0;
  }

  /**
   * Get list of orphaned features (features with deleted increments)
   * v5.0.0: Now checks features in project folders, not _features
   */
  async getOrphanedFeatures(): Promise<string[]> {
    const result = await this.validate(false);
    return result.discrepancies
      .filter(d => d.type === 'orphaned_feature')
      .map(d => d.featureId);
  }
}
