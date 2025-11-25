/**
 * Feature Consistency Validator
 *
 * Validates and repairs consistency between:
 * - .specweave/docs/internal/specs/_features/FS-XXX/
 * - .specweave/docs/internal/specs/{project}/FS-XXX/
 *
 * PROBLEM SOLVED:
 * Living docs sync creates _features/ and {project}/ folders sequentially.
 * If sync fails midway or increment is deleted, folders can get out of sync.
 *
 * SOLUTION:
 * 1. Detect discrepancies (orphaned _features without project folders)
 * 2. Auto-repair by creating missing project folders
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
  type: 'missing_project_folder' | 'missing_features_folder' | 'orphaned_feature';
  /** Description of the issue */
  description: string;
  /** Can this be auto-repaired? */
  autoRepairable: boolean;
  /** Path to _features folder (if exists) */
  featuresPath?: string;
  /** Path to project folder (if exists) */
  projectPath?: string;
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
   * Validate consistency between _features and project folders
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

    // Step 1: Get all features from _features folder
    const featuresDir = path.join(this.specsPath, '_features');
    if (!existsSync(featuresDir)) {
      this.logger.log('   ℹ️  No _features folder found, nothing to validate');
      return result;
    }

    const featureFolders = await this.getFeatureFolders(featuresDir);
    result.totalFeatures = featureFolders.length;

    // Step 2: Get all project folders
    const projectFolders = await this.getProjectFolders();

    // Step 3: Check each feature for consistency
    for (const featureId of featureFolders) {
      const discrepancy = await this.checkFeatureConsistency(
        featureId,
        projectFolders
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

    // Step 4: Log summary
    this.logValidationSummary(result);

    return result;
  }

  /**
   * Get all feature folder IDs from _features directory
   */
  private async getFeatureFolders(featuresDir: string): Promise<string[]> {
    const entries = await fs.readdir(featuresDir, { withFileTypes: true });
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
   * Check if a feature has consistent folders across _features and projects
   */
  private async checkFeatureConsistency(
    featureId: string,
    projectFolders: string[]
  ): Promise<DiscrepancyReport | null> {
    const featuresPath = path.join(this.specsPath, '_features', featureId);
    const featureFilePath = path.join(featuresPath, 'FEATURE.md');

    // Check if FEATURE.md exists
    if (!existsSync(featureFilePath)) {
      return {
        featureId,
        type: 'orphaned_feature',
        description: `_features/${featureId}/ exists but has no FEATURE.md`,
        autoRepairable: false,
        featuresPath
      };
    }

    // Parse FEATURE.md to find linked increment
    const linkedIncrement = await this.extractLinkedIncrement(featureFilePath);
    const incrementExists = linkedIncrement
      ? this.checkIncrementExists(linkedIncrement)
      : false;

    // Check if feature exists in any project folder
    let foundInProjects: string[] = [];
    for (const project of projectFolders) {
      const projectFeaturePath = path.join(this.specsPath, project, featureId);
      if (existsSync(projectFeaturePath)) {
        foundInProjects.push(project);
      }
    }

    if (foundInProjects.length === 0) {
      // Check if this is an orphaned feature (increment deleted, not external)
      const isExternalFeature = await this.isExternalFeature(featureFilePath);

      if (!incrementExists && !isExternalFeature && linkedIncrement) {
        // ORPHANED: Increment was deleted, feature is not external - should be archived
        // This prevents creating project folders for features whose increments no longer exist
        return {
          featureId,
          type: 'orphaned_feature',
          description: `Feature ${featureId} references deleted increment ${linkedIncrement} - should be archived`,
          autoRepairable: true, // Can auto-repair via archiver
          featuresPath,
          linkedIncrementId: linkedIncrement,
          incrementExists: false
        };
      }

      // Normal case: increment exists OR external feature OR no linked increment
      // Create missing project folder
      return {
        featureId,
        type: 'missing_project_folder',
        description: `Feature ${featureId} exists in _features/ but not in any project folder`,
        autoRepairable: true, // We can create the missing folder
        featuresPath,
        projectPath: path.join(this.specsPath, this.defaultProject, featureId),
        linkedIncrementId: linkedIncrement,
        incrementExists
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
   */
  private async repairDiscrepancy(discrepancy: DiscrepancyReport): Promise<RepairResult> {
    const result: RepairResult = {
      featureId: discrepancy.featureId,
      success: false,
      action: ''
    };

    try {
      switch (discrepancy.type) {
        case 'missing_project_folder':
          result.action = await this.repairMissingProjectFolder(discrepancy);
          result.success = true;
          break;

        case 'orphaned_feature':
          // Auto-archive orphaned features (increment was deleted)
          if (discrepancy.autoRepairable) {
            result.action = await this.archiveOrphanedFeature(discrepancy);
            result.success = true;
          } else {
            // No FEATURE.md or other issue - needs manual intervention
            result.action = 'Skipped - requires manual intervention (no FEATURE.md)';
            result.success = false;
          }
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
   * Delegates to FeatureArchiver for consistent archiving behavior
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
      this.logger.log(`   ✅ Archived ${discrepancy.featureId} to _archive/`);
      return `Archived orphaned feature ${discrepancy.featureId} (increment ${discrepancy.linkedIncrementId} deleted)`;
    } else if (archiveResult.errors.length > 0) {
      throw new Error(archiveResult.errors.join(', '));
    } else {
      // Feature might have been archived by another process or already in archive
      return `Feature ${discrepancy.featureId} already archived or cleaned up`;
    }
  }

  /**
   * Create missing project folder for a feature
   */
  private async repairMissingProjectFolder(discrepancy: DiscrepancyReport): Promise<string> {
    const projectPath = discrepancy.projectPath!;
    const featuresPath = discrepancy.featuresPath!;

    // Create project folder
    await fs.mkdir(projectPath, { recursive: true });

    // Extract info from FEATURE.md to create README.md
    const featureFilePath = path.join(featuresPath, 'FEATURE.md');
    const featureContent = await fs.readFile(featureFilePath, 'utf-8');

    // Extract title from FEATURE.md
    let title = discrepancy.featureId;
    const titleMatch = featureContent.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      title = titleMatch[1];
    }

    // Extract frontmatter
    let status = 'in-progress';
    const frontmatterMatch = featureContent.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      try {
        const frontmatter = yaml.parse(frontmatterMatch[1]);
        status = frontmatter.status || status;
      } catch {
        // Ignore YAML parse errors
      }
    }

    // Create README.md in project folder
    const readmeContent = `---
id: ${discrepancy.featureId}-${this.defaultProject}
title: "${title} - ${this.defaultProject.charAt(0).toUpperCase() + this.defaultProject.slice(1)} Implementation"
feature: ${discrepancy.featureId}
project: ${this.defaultProject}
type: feature-context
status: ${status}
auto_repaired: true
repaired_at: ${new Date().toISOString()}
---

# ${title}

**Feature**: [${discrepancy.featureId}](../../_features/${discrepancy.featureId}/FEATURE.md)

## Overview

This project context was auto-created by consistency validator.

## User Stories

See user story files in this directory.

## Note

This folder was auto-created because _features/${discrepancy.featureId}/ existed
but ${this.defaultProject}/${discrepancy.featureId}/ was missing.

${discrepancy.linkedIncrementId
  ? `**Linked Increment**: ${discrepancy.linkedIncrementId} (${discrepancy.incrementExists ? 'exists' : 'not found'})`
  : '**Linked Increment**: Not found in FEATURE.md'}
`;

    const readmePath = path.join(projectPath, 'README.md');
    await fs.writeFile(readmePath, readmeContent, 'utf-8');

    this.logger.log(`   ✅ Created ${this.defaultProject}/${discrepancy.featureId}/README.md`);

    return `Created ${projectPath}/README.md`;
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
   * Get list of orphaned features (features in _features without corresponding project folder)
   */
  async getOrphanedFeatures(): Promise<string[]> {
    const result = await this.validate(false);
    return result.discrepancies
      .filter(d => d.type === 'missing_project_folder')
      .map(d => d.featureId);
  }
}
