/**
 * Item Converter
 *
 * Converts external items (GitHub/JIRA/ADO) to SpecWeave living docs User Stories.
 * CRITICAL: Does NOT create increments - only creates living docs.
 */

import type { ExternalItem } from './external-importer.js';
import * as fs from '../utils/fs-native.js';
import path from 'path';
import { FSIdAllocator, type ExternalWorkItem } from '../living-docs/fs-id-allocator.js';
import { IDRegistry } from '../living-docs/id-registry.js';
import { createExternalMetadata } from '../core/types/origin-metadata.js';
import { DuplicateDetector } from './duplicate-detector.js';
import type { ExternalContainerContext } from '../core/types/increment-metadata.js';
import { getTwoLevelProjectPath, normalizeToProjectId } from '../utils/project-id-generator.js';

export interface ConvertedUserStory {
  /** User Story ID with E suffix (e.g., US-001E) */
  id: string;

  /** User Story title */
  title: string;

  /** User Story description */
  description: string;

  /** Acceptance criteria */
  acceptanceCriteria: string[];

  /** Priority (P0-P4) */
  priority?: string;

  /** Status (open, in-progress, completed) */
  status: string;

  /** External metadata */
  metadata: {
    externalId: string;
    externalUrl: string;
    externalPlatform: 'github' | 'jira' | 'ado';
    importedAt: string;
    createdAt: string;
    updatedAt: string;
    labels: string[];
    sourceRepo?: string;
  };

  /** Living docs file path */
  filePath: string;

  /** Living docs markdown content */
  markdown: string;

  /** Feature ID this user story belongs to (when feature allocation enabled) */
  featureId?: string;
}

export interface ItemConverterOptions {
  /** Base directory for living docs (e.g., .specweave/docs/internal/specs) */
  specsDir: string;

  /** Starting US-ID number for imported items (default: 1) */
  startingId?: number;

  /** Project root for FS-ID allocator and ID registry */
  projectRoot?: string;

  /** Enable feature-level organization with FS-ID allocation */
  enableFeatureAllocation?: boolean;

  /** Project ID for multi-project mode (default: 'default') */
  projectId?: string;

  /**
   * Enable global FS-ID collision detection across ALL projects (umbrella mode)
   *
   * CRITICAL: Set this to true in umbrella/multi-repo setups to prevent ID
   * collisions like FS-001 in project-a and FS-001E in project-b.
   *
   * Default: false (for backwards compatibility)
   */
  enableGlobalCollisionDetection?: boolean;

  /** Enable duplicate detection (default: true) */
  enableDuplicateDetection?: boolean;

  /** Auto-archive items older than this many days (default: 30, 0 to disable) */
  autoArchiveAfterDays?: number;

  /** Callback for skipped duplicates */
  onDuplicateSkipped?: (externalId: string, existingUsId: string) => void;

  /** Callback for feature folder creation */
  onFeatureCreated?: (featureId: string, featurePath: string) => void;

  /** Callback for archived items */
  onItemArchived?: (usId: string, reason: string) => void;

  // ============================================================================
  // External Container Context (v0.29.0+ - 2-Level Directory Structure Support)
  // ============================================================================

  /**
   * External container context for 2-level directory structure
   *
   * When provided, creates 2-level structure:
   * - JIRA: specs/JIRA-{containerId}/{projectId}/FS-XXX/
   * - ADO: specs/{containerId}/{projectId}/FS-XXX/ (no ADO- prefix)
   *
   * When NOT provided (default), creates 1-level structure:
   * - GitHub: specs/{projectId}/FS-XXX/
   *
   * @example
   * ```typescript
   * // JIRA board-based setup
   * externalContainer: {
   *   type: 'jira-project',
   *   containerId: 'CORE',
   *   containerName: 'Core Project',
   *   boardId: 123,
   *   boardName: 'Frontend Board'
   * }
   *
   * // ADO area path setup
   * externalContainer: {
   *   type: 'ado-project',
   *   containerId: 'MyProduct',
   *   containerName: 'My Product',
   *   areaPath: 'MyProduct\\Frontend'
   * }
   * ```
   */
  externalContainer?: ExternalContainerContext;
}

/**
 * Convert external items to living docs User Stories
 *
 * CRITICAL: This function ONLY creates living docs files.
 * It does NOT create increments or populate .specweave/increments/.
 */
export class ItemConverter {
  private options: ItemConverterOptions;
  private duplicateDetector: DuplicateDetector | null = null;
  private fsIdAllocator: FSIdAllocator | null = null;
  /** Cache of created feature folders to avoid duplicates */
  private createdFeatures: Map<string, string> = new Map();

  constructor(options: ItemConverterOptions) {
    this.options = {
      enableDuplicateDetection: true,
      // NOTE: projectId is intentionally NOT defaulted to 'default'
      // - undefined means items go directly to specs/ (no project subfolder)
      // - a string value means items go to specs/{projectId}/
      // For umbrella repos, set enableGlobalCollisionDetection: true
      autoArchiveAfterDays: 30,  // Default: archive items older than 1 month
      enableGlobalCollisionDetection: false, // Default: false for backwards compatibility
      ...options,
    };

    // Initialize duplicate detector if enabled
    if (this.options.enableDuplicateDetection) {
      this.duplicateDetector = new DuplicateDetector({
        specsDir: this.options.specsDir,
      });
    }

    // Initialize FS-ID allocator if feature allocation is enabled
    if (this.options.enableFeatureAllocation && this.options.projectRoot) {
      // Use projectId if provided, otherwise undefined (direct to specs/)
      // Enable global collision detection for umbrella/multi-repo setups
      this.fsIdAllocator = new FSIdAllocator(
        this.options.projectRoot,
        this.options.projectId,
        { globalCollisionDetection: this.options.enableGlobalCollisionDetection }
      );
    }
  }

  /**
   * Convert a single external item to a User Story with E suffix
   *
   * @param item - External item to convert
   * @param usId - User Story ID number
   * @param featureId - Optional feature ID for folder organization
   */
  convertItem(item: ExternalItem, usId: number, featureId?: string): ConvertedUserStory {
    // Generate US-ID with E suffix
    const id = `US-${String(usId).padStart(3, '0')}E`;

    // Map external status to SpecWeave status
    const status = this.mapStatus(item.status);

    // Extract acceptance criteria
    const acceptanceCriteria = item.acceptanceCriteria || [];

    // Generate origin badge
    const originBadge = this.generateOriginBadge(item);

    // Generate markdown content for living docs
    const markdown = this.generateMarkdown({
      id,
      title: item.title,
      description: item.description,
      acceptanceCriteria,
      priority: item.priority,
      status,
      originBadge,
      metadata: {
        externalId: item.id,
        externalUrl: item.url,
        externalPlatform: item.platform,
        importedAt: new Date().toISOString(),
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        labels: item.labels,
        sourceRepo: item.sourceRepo
      }
    });

    // Generate file path (with feature folder if allocated)
    const fileName = this.generateFileName(id, item.title);
    let filePath: string;

    // Check if item should be auto-archived (older than threshold)
    const shouldArchive = this.shouldAutoArchive(item.createdAt);

    if (featureId && this.options.enableFeatureAllocation) {
      // Feature folder structure:
      // - 2-level (JIRA/ADO): specs/{CONTAINER-type}/{projectId}/{featureId}/us-xxxe-title.md
      // - 1-level (GitHub): specs/{projectId}/{featureId}/us-xxxe-title.md
      // - No project: specs/{featureId}/us-xxxe-title.md (legacy)
      const baseDir = this.getBaseDirectory();
      const targetDir = shouldArchive
        ? path.join(baseDir, '_archive', featureId)
        : path.join(baseDir, featureId);
      filePath = path.join(targetDir, fileName);
    } else {
      // Legacy: direct in specs or archive folder
      const baseDir = this.getBaseDirectory();
      const targetDir = shouldArchive
        ? path.join(baseDir, '_archive')
        : baseDir;
      filePath = path.join(targetDir, fileName);
    }

    // Notify callback if item was archived
    if (shouldArchive && this.options.onItemArchived) {
      const age = Math.floor((Date.now() - item.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      this.options.onItemArchived(id, `Item is ${age} days old (threshold: ${this.options.autoArchiveAfterDays} days)`);
    }

    return {
      id,
      title: item.title,
      description: item.description,
      acceptanceCriteria,
      priority: item.priority,
      status,
      metadata: {
        externalId: item.id,
        externalUrl: item.url,
        externalPlatform: item.platform,
        importedAt: new Date().toISOString(),
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        labels: item.labels,
        sourceRepo: item.sourceRepo
      },
      filePath,
      markdown,
      featureId
    };
  }

  /**
   * Convert multiple external items to User Stories
   *
   * CRITICAL: This method ONLY creates living docs files.
   * It does NOT create increments.
   */
  async convertItems(items: ExternalItem[]): Promise<ConvertedUserStory[]> {
    const startingId = this.options.startingId || 1;
    const converted: ConvertedUserStory[] = [];
    let skippedCount = 0;

    // DIAGNOSTIC: Log input items count
    console.log(`   📥 ItemConverter received: ${items.length} items for project: ${this.options.projectId || 'default'}`);

    // Ensure specs directory exists
    fs.mkdirSync(this.options.specsDir, { recursive: true });

    // If feature allocation is enabled, scan existing IDs first
    if (this.fsIdAllocator) {
      await this.fsIdAllocator.scanExistingIds();
    }

    // Group items by source (for multi-repo) or treat as single group
    const itemGroups = this.groupItemsByFeature(items);

    // DIAGNOSTIC: Log grouping results
    console.log(`   📁 Grouped into ${itemGroups.size} groups:`);
    for (const [groupKey, groupItems] of itemGroups) {
      console.log(`      → ${groupKey}: ${groupItems.length} items`);
    }

    // Process each group
    for (const [groupKey, groupItems] of itemGroups.entries()) {
      // Allocate feature ID for this group if feature allocation is enabled
      let featureId: string | undefined;

      if (this.fsIdAllocator && this.options.enableFeatureAllocation && groupItems.length > 0) {
        const firstItem = groupItems[0];
        featureId = await this.allocateFeatureForGroup(firstItem, groupKey);
      }

      // Convert each item in the group
      for (let i = 0; i < groupItems.length; i++) {
        const item = groupItems[i];

        // Check for duplicates if duplicate detection is enabled
        if (this.duplicateDetector) {
          const existingReference = await this.duplicateDetector.findExternalIdReference(item.id);
          if (existingReference) {
            skippedCount++;

            // Notify callback if provided
            if (this.options.onDuplicateSkipped) {
              this.options.onDuplicateSkipped(item.id, existingReference.usId);
            }

            // Skip this item (duplicate)
            continue;
          }
        }

        const usId = startingId + (converted.length);

        const userStory = this.convertItem(item, usId, featureId);
        converted.push(userStory);

        // Ensure directory exists for feature folders
        const fileDir = path.dirname(userStory.filePath);
        fs.mkdirSync(fileDir, { recursive: true });

        // Write living docs file
        fs.writeFileSync(userStory.filePath, userStory.markdown, 'utf-8');
      }
    }

    return converted;
  }

  /**
   * Group items by feature (based on source repo or labels)
   * Items without clear grouping go into a default group
   */
  private groupItemsByFeature(items: ExternalItem[]): Map<string, ExternalItem[]> {
    const groups = new Map<string, ExternalItem[]>();

    for (const item of items) {
      // Group by source repo if available
      const groupKey = item.sourceRepo || 'default';

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(item);
    }

    return groups;
  }

  /**
   * Allocate a feature ID for a group of items
   */
  private async allocateFeatureForGroup(firstItem: ExternalItem, groupKey: string): Promise<string> {
    // Check if we already created a feature for this group
    if (this.createdFeatures.has(groupKey)) {
      return this.createdFeatures.get(groupKey)!;
    }

    if (!this.fsIdAllocator) {
      throw new Error('FSIdAllocator not initialized');
    }

    // Create external work item for allocation
    const workItem: ExternalWorkItem = {
      externalId: firstItem.id,
      title: firstItem.sourceRepo || firstItem.title,
      createdAt: firstItem.createdAt.toISOString(),
      externalUrl: firstItem.url
    };

    // Allocate feature ID
    const allocation = await this.fsIdAllocator.allocateId(workItem);
    const featureId = allocation.id;

    // Create feature folder with FEATURE.md
    const featurePath = await this.createFeatureFolder(featureId, firstItem, groupKey);

    // Cache for reuse
    this.createdFeatures.set(groupKey, featureId);

    // Notify callback
    if (this.options.onFeatureCreated) {
      this.options.onFeatureCreated(featureId, featurePath);
    }

    return featureId;
  }

  /**
   * Get base directory for specs, handling both 1-level and 2-level structures
   *
   * Structure patterns:
   * - 2-level (JIRA): specs/JIRA-{containerId}/{projectId}/
   * - 2-level (ADO): specs/{containerId}/{projectId}/
   * - 1-level (GitHub): specs/{projectId}/
   * - Legacy: specs/ (no projectId)
   */
  private getBaseDirectory(): string {
    const container = this.options.externalContainer;

    if (container) {
      // 2-level structure for JIRA/ADO
      // JIRA: specs/JIRA-{projectKey}/{boardName}/
      // ADO: specs/{projectName}/{areaPath}/ (no ADO- prefix per user request)
      let containerDirName: string;
      if (container.type === 'jira-project') {
        containerDirName = `JIRA-${normalizeToProjectId(container.containerId)}`;
      } else {
        // ADO: Use project name directly without prefix
        containerDirName = normalizeToProjectId(container.containerId);
      }
      const projectId = this.options.projectId || 'default';

      return path.join(
        this.options.specsDir,
        containerDirName,
        projectId
      );
    }

    // 1-level structure for GitHub or single-project mode
    if (this.options.projectId) {
      return path.join(this.options.specsDir, this.options.projectId);
    }

    // Legacy: direct to specs/
    return this.options.specsDir;
  }

  /**
   * Create feature folder with FEATURE.md
   */
  private async createFeatureFolder(featureId: string, firstItem: ExternalItem, groupKey: string): Promise<string> {
    // Use 2-level or 1-level structure based on externalContainer
    const baseDir = this.getBaseDirectory();
    const featurePath = path.join(baseDir, featureId);

    // Create directory
    fs.mkdirSync(featurePath, { recursive: true });

    // Generate FEATURE.md content
    const featureTitle = firstItem.sourceRepo
      ? `Feature: ${firstItem.sourceRepo} External Items`
      : `Feature: Imported from ${firstItem.platform}`;

    const featureContent = `---
id: ${featureId}
title: ${featureTitle}
origin: external
source: ${firstItem.platform}
source_repo: ${firstItem.sourceRepo || 'unknown'}
created: ${new Date().toISOString()}
---

# ${featureTitle}

**Origin**: 🔗 Imported from ${firstItem.platform}

## Description

This feature folder contains User Stories imported from external tools.

${firstItem.sourceRepo ? `**Source Repository**: ${firstItem.sourceRepo}` : ''}

## User Stories

User stories in this feature will be listed here.

## Status

- **Created**: ${new Date().toISOString()}
- **Source**: ${firstItem.platform}
`;

    // Write FEATURE.md
    const featureFile = path.join(featurePath, 'FEATURE.md');
    fs.writeFileSync(featureFile, featureContent, 'utf-8');

    return featurePath;
  }

  /**
   * Map external status to SpecWeave status
   */
  private mapStatus(externalStatus: ExternalItem['status']): string {
    const statusMap: Record<string, string> = {
      'open': 'Open',
      'in-progress': 'In Progress',
      'completed': 'Completed',
      'closed': 'Completed'
    };

    return statusMap[externalStatus] || 'Open';
  }

  /**
   * Check if an item should be auto-archived based on creation date
   *
   * @param createdAt - Item creation date
   * @returns True if item is older than autoArchiveAfterDays threshold
   */
  private shouldAutoArchive(createdAt: Date): boolean {
    const threshold = this.options.autoArchiveAfterDays;

    // Disabled if threshold is 0 or undefined
    if (!threshold || threshold <= 0) {
      return false;
    }

    const ageMs = Date.now() - createdAt.getTime();
    const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

    return ageDays >= threshold;
  }

  /**
   * Generate origin badge for living docs
   */
  private generateOriginBadge(item: ExternalItem): string {
    const platformEmoji: Record<string, string> = {
      'github': '🔗',
      'jira': '🔗',
      'ado': '🔗'
    };

    const platformName: Record<string, string> = {
      'github': 'GitHub',
      'jira': 'JIRA',
      'ado': 'Azure DevOps'
    };

    const emoji = platformEmoji[item.platform] || '🔗';
    const name = platformName[item.platform] || item.platform;

    // Extract issue/ticket number from external ID
    // v0.29+ format: github#owner/repo#123 → extract "123"
    // Legacy format: github#123 → extract "123"
    let issueNumber = item.id;
    const newFormatMatch = item.id.match(/#(\d+)$/);
    if (newFormatMatch) {
      issueNumber = newFormatMatch[1];
    } else {
      issueNumber = item.id.replace(/^(GITHUB|JIRA|ADO)-/, '');
    }

    return `${emoji} [${name} #${issueNumber}](${item.url})`;
  }

  /**
   * Generate markdown content for living docs User Story
   */
  private generateMarkdown(data: {
    id: string;
    title: string;
    description: string;
    acceptanceCriteria: string[];
    priority?: string;
    status: string;
    originBadge: string;
    metadata: {
      externalId: string;
      externalUrl: string;
      externalPlatform: string;
      importedAt: string;
      createdAt: string;
      updatedAt: string;
      labels: string[];
      sourceRepo?: string;
    };
  }): string {
    const parts: string[] = [];

    // Title
    parts.push(`# ${data.id}: ${data.title}`);
    parts.push('');

    // Origin badge
    parts.push(`**Origin**: ${data.originBadge}`);
    parts.push('');

    // Status and Priority
    parts.push(`**Status**: ${data.status}`);
    if (data.priority) {
      parts.push(`**Priority**: ${data.priority}`);
    }
    parts.push('');

    // Description
    parts.push('## Description');
    parts.push('');
    parts.push(data.description || 'No description provided.');
    parts.push('');

    // Acceptance Criteria
    if (data.acceptanceCriteria.length > 0) {
      parts.push('## Acceptance Criteria');
      parts.push('');
      data.acceptanceCriteria.forEach((ac, index) => {
        const acId = `AC-${data.id.replace('E', '')}-${String(index + 1).padStart(2, '0')}`;
        parts.push(`- [ ] **${acId}**: ${ac}`);
      });
      parts.push('');
    }

    // Tasks
    parts.push('## Tasks');
    parts.push('');
    parts.push('> **Note**: This User Story was imported from an external tool.');
    parts.push('> Create tasks manually when ready to implement.');
    parts.push('');

    // Metadata (frontmatter-style at bottom)
    parts.push('---');
    parts.push('');
    parts.push('## External Metadata');
    parts.push('');
    parts.push(`- **External ID**: ${data.metadata.externalId}`);
    parts.push(`- **External URL**: ${data.metadata.externalUrl}`);
    parts.push(`- **Platform**: ${data.metadata.externalPlatform}`);
    parts.push(`- **Imported At**: ${data.metadata.importedAt}`);
    parts.push(`- **Created At**: ${data.metadata.createdAt}`);
    parts.push(`- **Updated At**: ${data.metadata.updatedAt}`);
    if (data.metadata.labels.length > 0) {
      parts.push(`- **Labels**: ${data.metadata.labels.join(', ')}`);
    }
    if (data.metadata.sourceRepo) {
      parts.push(`- **Source Repository**: ${data.metadata.sourceRepo}`);
    }

    return parts.join('\n');
  }

  /**
   * Generate file name for living docs User Story
   *
   * Format: us-001e-title-here.md
   */
  private generateFileName(usId: string, title: string): string {
    // Convert US-001E to us-001e
    const idPart = usId.toLowerCase();

    // Convert title to kebab-case
    const titlePart = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '-')          // Replace spaces with hyphens
      .replace(/-+/g, '-')           // Remove duplicate hyphens
      .slice(0, 50);                 // Limit to 50 chars

    return `${idPart}-${titlePart}.md`;
  }

  /**
   * Validate that no increments were created
   *
   * CRITICAL: This validation ensures we're not auto-creating increments.
   */
  static validateNoIncrementsCreated(projectRoot: string): void {
    const incrementsDir = path.join(projectRoot, '.specweave', 'increments');

    if (!fs.existsSync(incrementsDir)) {
      return; // No increments directory - that's fine
    }

    // Check for any numbered increment directories
    const items = fs.readdirSync(incrementsDir);
    const incrementDirs = items.filter(item => {
      const fullPath = path.join(incrementsDir, item);
      return fs.statSync(fullPath).isDirectory() && /^\d{4}-/.test(item);
    });

    if (incrementDirs.length > 0) {
      throw new Error(
        `VALIDATION FAILED: Increments were auto-created during import. ` +
        `Found: ${incrementDirs.join(', ')}. ` +
        `Import should ONLY create living docs, not increments.`
      );
    }
  }
}
