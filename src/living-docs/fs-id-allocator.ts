/**
 * FS-ID Allocator - Intelligent Feature ID allocation with chronological placement
 *
 * Allocates FS-XXX IDs for external work items based on creation date,
 * attempting chronological insertion while preventing collisions.
 *
 * Features:
 * - Chronological ID allocation based on work item creation date
 * - Gap filling (insert FS-011E between FS-010 and FS-020)
 * - Append mode fallback (max ID + 1)
 * - Collision detection (checks both FS-XXX and FS-XXXE)
 * - Archive-aware (scans both active and archived features)
 */

import * as fs from '../utils/fs-native.js';
import path from 'path';
import matter from 'gray-matter';
import { formatOrigin, type ExternalItemMetadata } from '../core/types/origin-metadata.js';
import type { ExternalContainerContext } from '../core/types/increment-metadata.js';
import { normalizeToProjectId } from '../utils/project-id-generator.js';

/**
 * Feature metadata extracted from living docs
 */
export interface FeatureMetadata {
  /** Feature ID (e.g., "FS-042", "FS-042E") */
  id: string;

  /** Feature creation timestamp (ISO 8601) */
  createdAt: string;

  /** Origin (internal | external) */
  origin: 'internal' | 'external';

  /** External ID if external origin */
  externalId?: string;

  /** Path to feature folder */
  path: string;
}

/**
 * External work item to be allocated an FS-ID
 */
export interface ExternalWorkItem {
  /** External ID (e.g., "GH-#638", "JIRA-SPEC-789") */
  externalId: string;

  /** Work item title */
  title: string;

  /** Creation timestamp (ISO 8601) */
  createdAt: string;

  /** External URL */
  externalUrl: string;
}

/**
 * ID allocation result
 */
export interface AllocationResult {
  /** Allocated FS-ID (e.g., "FS-042E") */
  id: string;

  /** Allocation strategy used */
  strategy: 'chronological-insert' | 'append' | 'first';

  /** Reason for allocation decision */
  reason: string;

  /** Numeric ID value */
  number: number;
}

/**
 * FS-ID Allocator Options
 */
export interface FSIdAllocatorOptions {
  /** Enable global collision detection across ALL projects (umbrella mode) */
  globalCollisionDetection?: boolean;

  /**
   * External container context for 2-level directory structure (v0.29.0+)
   *
   * When provided, creates features in 2-level structure:
   * - JIRA: specs/JIRA-{containerId}/{projectId}/FS-XXX/
   * - ADO: specs/ADO-{containerId}/{projectId}/FS-XXX/
   *
   * When NOT provided (default), creates in 1-level structure:
   * - GitHub: specs/{projectId}/FS-XXX/
   *
   * Collision detection scans both 1-level and 2-level structures when
   * globalCollisionDetection is enabled.
   */
  externalContainer?: ExternalContainerContext;
}

/**
 * FS-ID Allocator
 *
 * Intelligently allocates Feature IDs with chronological placement.
 *
 * CRITICAL: In umbrella/multi-repo setups, enable globalCollisionDetection
 * to prevent ID collisions like FS-001 in project-a and FS-001E in project-b.
 */
export class FSIdAllocator {
  private projectRoot: string;
  private specsPath: string;
  private archivePath: string;
  private projectId: string | undefined;
  private existingFeatures: Map<string, FeatureMetadata> = new Map();
  private scanned: boolean = false;
  private globalCollisionDetection: boolean;
  private externalContainer: ExternalContainerContext | undefined;

  constructor(projectRoot: string, projectId?: string, options?: FSIdAllocatorOptions) {
    this.projectRoot = projectRoot;
    // projectId can be:
    // - undefined: items go directly to specs/ (no project subfolder) - DEPRECATED for umbrella
    // - 'parent': parent project items go to specs/parent/
    // - string: items go to specs/{projectId}/
    this.projectId = projectId;
    this.specsPath = path.join(projectRoot, '.specweave/docs/internal/specs');
    this.archivePath = path.join(projectRoot, '.specweave/docs/_archive/specs');
    this.globalCollisionDetection = options?.globalCollisionDetection ?? false;
    this.externalContainer = options?.externalContainer;
  }

  /**
   * Get base directory for features, handling both 1-level and 2-level structures
   *
   * Structure patterns:
   * - 2-level (JIRA): specs/JIRA-{containerId}/{projectId}/
   * - 2-level (ADO): specs/ADO-{containerId}/{projectId}/
   * - 1-level (GitHub): specs/{projectId}/
   * - Legacy: specs/ (no projectId)
   */
  private getBaseDirectory(): string {
    if (this.externalContainer) {
      // 2-level structure for JIRA/ADO
      const containerType = this.externalContainer.type === 'jira-project' ? 'jira' : 'ado';
      const containerDirName = `${containerType.toUpperCase()}-${normalizeToProjectId(this.externalContainer.containerId)}`;
      const projectId = this.projectId || 'default';

      return path.join(
        this.specsPath,
        containerDirName,
        projectId
      );
    }

    // 1-level structure for GitHub or single-project mode
    if (this.projectId) {
      return path.join(this.specsPath, this.projectId);
    }

    // Legacy: direct to specs/
    return this.specsPath;
  }

  /**
   * Scan existing FS-IDs (both active and archived)
   *
   * CRITICAL: Archives are scanned to prevent ID reuse
   *
   * Structure:
   * - With projectId: specs/{projectId}/FS-XXX/
   * - Without projectId: specs/FS-XXX/
   *
   * When globalCollisionDetection is enabled (umbrella mode):
   * - Scans ALL project folders under specs/
   * - Prevents ID collisions like FS-001 in project-a and FS-001E in project-b
   */
  async scanExistingIds(): Promise<void> {
    this.existingFeatures.clear();

    if (this.globalCollisionDetection) {
      // GLOBAL MODE: Scan ALL projects under specs/ to prevent cross-project collisions
      await this.scanAllProjects();
    } else {
      // LEGACY MODE: Scan only the specified projectId folder
      const projectSpecsPath = this.projectId
        ? path.join(this.specsPath, this.projectId)
        : this.specsPath;

      if (await fs.pathExists(projectSpecsPath)) {
        await this.scanDirectory(projectSpecsPath, 'active');
      }

      // Scan archive: {specsPath}/_archive/FS-XXX/
      const projectArchivePath = path.join(projectSpecsPath, '_archive');
      if (await fs.pathExists(projectArchivePath)) {
        await this.scanDirectory(projectArchivePath, 'archived');
      }
    }

    this.scanned = true;
  }

  /**
   * Scan ALL projects under specs/ for global collision detection
   *
   * This scans both 1-level and 2-level structures:
   * - specs/FS-XXX/ (root-level features, legacy)
   * - specs/{project}/FS-XXX/ (1-level: all project folders)
   * - specs/{project}/_archive/FS-XXX/ (1-level archived)
   * - specs/JIRA-{container}/{project}/FS-XXX/ (2-level JIRA)
   * - specs/ADO-{container}/{project}/FS-XXX/ (2-level ADO)
   * - specs/JIRA-{container}/{project}/_archive/FS-XXX/ (2-level archived)
   */
  private async scanAllProjects(): Promise<void> {
    if (!await fs.pathExists(this.specsPath)) {
      return;
    }

    const entries = await fs.readdir(this.specsPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const entryPath = path.join(this.specsPath, entry.name);

      // Check if this is an FS-XXX folder (root-level feature)
      if (/^FS-\d{3}E?$/.test(entry.name)) {
        const metadata = await this.parseFeatureMetadata(entryPath, entry.name);
        if (metadata) {
          this.existingFeatures.set(entry.name, metadata);
        }
        continue;
      }

      // Skip _archive at root (handled per-project)
      if (entry.name === '_archive') continue;

      // Check if this is a 2-level container folder (JIRA-* or ADO-*)
      if (/^(JIRA|ADO)-/.test(entry.name)) {
        // 2-level structure: scan project folders INSIDE the container
        await this.scanContainerFolder(entryPath);
        continue;
      }

      // This is a 1-level project folder - scan it for FS-XXX folders
      await this.scanDirectory(entryPath, 'active');

      // Also scan project's archive
      const projectArchivePath = path.join(entryPath, '_archive');
      if (await fs.pathExists(projectArchivePath)) {
        await this.scanDirectory(projectArchivePath, 'archived');
      }
    }

    // Also scan root-level _archive
    const rootArchivePath = path.join(this.specsPath, '_archive');
    if (await fs.pathExists(rootArchivePath)) {
      await this.scanDirectory(rootArchivePath, 'archived');
    }
  }

  /**
   * Scan a 2-level container folder (JIRA-* or ADO-*)
   *
   * Container structure:
   * - specs/JIRA-CORE/
   * -   fe/
   * -     FS-001/
   * -     _archive/
   * -   be/
   * -     FS-002/
   */
  private async scanContainerFolder(containerPath: string): Promise<void> {
    const projectEntries = await fs.readdir(containerPath, { withFileTypes: true });

    for (const projectEntry of projectEntries) {
      if (!projectEntry.isDirectory()) continue;

      // Skip _archive at container level (shouldn't exist, but just in case)
      if (projectEntry.name === '_archive') continue;

      // This is a project folder inside the container
      const projectPath = path.join(containerPath, projectEntry.name);
      await this.scanDirectory(projectPath, 'active');

      // Also scan project's archive
      const projectArchivePath = path.join(projectPath, '_archive');
      if (await fs.pathExists(projectArchivePath)) {
        await this.scanDirectory(projectArchivePath, 'archived');
      }
    }
  }

  /**
   * Scan directory for FS-XXX folders
   */
  private async scanDirectory(dirPath: string, source: 'active' | 'archived'): Promise<void> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      // Match FS-XXX or FS-XXXE pattern
      const match = entry.name.match(/^(FS-\d{3}E?)$/);
      if (!match) continue;

      const fsId = match[1];
      const featurePath = path.join(dirPath, entry.name);

      // Try to parse feature metadata from README.md
      const metadata = await this.parseFeatureMetadata(featurePath, fsId);
      if (metadata) {
        this.existingFeatures.set(fsId, metadata);
      }
    }
  }

  /**
   * Parse feature metadata from README.md frontmatter
   */
  private async parseFeatureMetadata(
    featurePath: string,
    fsId: string
  ): Promise<FeatureMetadata | null> {
    // Try FEATURE.md first, then README.md
    const possibleFiles = ['FEATURE.md', 'README.md', 'feature.md', 'readme.md'];

    for (const filename of possibleFiles) {
      const filePath = path.join(featurePath, filename);
      if (await fs.pathExists(filePath)) {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const parsed = matter(content);
          const frontmatter = parsed.data;

          // Normalize timestamp (remove milliseconds for consistency)
          // gray-matter parses ISO 8601 timestamps as Date objects, not strings
          const rawTimestamp = frontmatter.created || frontmatter.createdAt || new Date(0);
          const timestamp = rawTimestamp instanceof Date ? rawTimestamp.toISOString() : rawTimestamp;
          const normalizedTimestamp = timestamp.replace(/\.\d{3}Z$/, 'Z');

          return {
            id: fsId,
            createdAt: normalizedTimestamp,
            origin: fsId.endsWith('E') ? 'external' : 'internal',
            externalId: frontmatter.external_id || frontmatter.externalId,
            path: featurePath
          };
        } catch (error) {
          // Continue to next file
          continue;
        }
      }
    }

    // Fallback: create minimal metadata if no file found
    return {
      id: fsId,
      createdAt: new Date(0).toISOString(), // Epoch (will sort to beginning)
      origin: fsId.endsWith('E') ? 'external' : 'internal',
      path: featurePath
    };
  }

  /**
   * Allocate FS-ID for external work item with chronological placement
   *
   * Algorithm:
   * 1. Sort existing IDs by creation date
   * 2. Find chronological insertion point based on work item creation date
   * 3. Check for ID gaps between consecutive features
   * 4. If gap exists, allocate next ID in gap (e.g., FS-011E between FS-010 and FS-020)
   * 5. If no gap, append to end (max ID + 1 with E suffix)
   *
   * CRITICAL (2025-11-26): Unified numeric sequence - FS-XXX and FS-XXXE never share same index
   * - If FS-001 exists (internal), external must use FS-002E
   * - If FS-001E exists (external), internal must use FS-002
   *
   * @param workItem - External work item to allocate ID for
   * @returns Allocation result with ID and strategy
   */
  async allocateId(workItem: ExternalWorkItem): Promise<AllocationResult> {
    if (!this.scanned) {
      await this.scanExistingIds();
    }

    // Handle empty case (first feature)
    if (this.existingFeatures.size === 0) {
      return {
        id: 'FS-001E',
        strategy: 'first',
        reason: 'First external feature in project',
        number: 1
      };
    }

    // Sort features by creation date
    const sortedFeatures = Array.from(this.existingFeatures.values()).sort((a, b) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    // Find chronological insertion point
    const workItemDate = new Date(workItem.createdAt).getTime();
    let insertionIndex = sortedFeatures.findIndex(
      f => new Date(f.createdAt).getTime() > workItemDate
    );

    // If work item is after all existing features, append
    if (insertionIndex === -1) {
      const maxId = this.getMaxId();
      const nextNumber = maxId + 1;
      const nextId = `FS-${String(nextNumber).padStart(3, '0')}E`;

      // Check for collision
      if (this.hasCollision(nextId)) {
        throw new Error(`ID collision: ${nextId} already exists`);
      }

      return {
        id: nextId,
        strategy: 'append',
        reason: `Work item created after all existing features (${new Date(workItem.createdAt).toISOString()})`,
        number: nextNumber
      };
    }

    // Try chronological insertion into gap
    const beforeFeature = insertionIndex > 0 ? sortedFeatures[insertionIndex - 1] : null;
    const afterFeature = sortedFeatures[insertionIndex];

    if (beforeFeature && afterFeature) {
      const beforeNumber = this.extractNumber(beforeFeature.id);
      const afterNumber = this.extractNumber(afterFeature.id);

      // Check if there's a gap (at least 2 numbers apart)
      if (afterNumber - beforeNumber > 1) {
        // Allocate next ID after beforeFeature
        const nextNumber = beforeNumber + 1;
        const nextId = `FS-${String(nextNumber).padStart(3, '0')}E`;

        // Check for collision
        if (!this.hasCollision(nextId)) {
          return {
            id: nextId,
            strategy: 'chronological-insert',
            reason: `Inserted chronologically between ${beforeFeature.id} (${beforeFeature.createdAt}) and ${afterFeature.id} (${afterFeature.createdAt})`,
            number: nextNumber
          };
        }
      }
    }

    // Fallback: append to end if gap insertion failed
    const maxId = this.getMaxId();
    const nextNumber = maxId + 1;
    const nextId = `FS-${String(nextNumber).padStart(3, '0')}E`;

    // Check for collision
    if (this.hasCollision(nextId)) {
      throw new Error(`ID collision: ${nextId} already exists`);
    }

    return {
      id: nextId,
      strategy: 'append',
      reason: 'Gap insertion not possible, appended to end',
      number: nextNumber
    };
  }

  /**
   * Check if ID has collision (exact match or variant)
   *
   * @param id - FS-ID to check (e.g., "FS-042" or "FS-042E")
   * @returns True if collision exists
   *
   * @example
   * // Given existing IDs: FS-010, FS-011E, FS-020
   * hasCollision('FS-011')  // true (FS-011E exists)
   * hasCollision('FS-011E') // true (exact match)
   * hasCollision('FS-012')  // false
   */
  hasCollision(id: string): boolean {
    // Exact match
    if (this.existingFeatures.has(id)) {
      return true;
    }

    // Variant match (check both FS-XXX and FS-XXXE)
    const number = this.extractNumber(id);
    const internalId = `FS-${String(number).padStart(3, '0')}`;
    const externalId = `FS-${String(number).padStart(3, '0')}E`;

    return this.existingFeatures.has(internalId) || this.existingFeatures.has(externalId);
  }

  /**
   * Get maximum numeric ID value (ignoring E suffix)
   *
   * @returns Maximum ID number
   */
  getMaxId(): number {
    if (this.existingFeatures.size === 0) {
      return 0;
    }

    const numbers = Array.from(this.existingFeatures.keys()).map(id => this.extractNumber(id));
    return Math.max(...numbers);
  }

  /**
   * Extract numeric part from FS-ID
   *
   * @param id - FS-ID (e.g., "FS-042" or "FS-042E")
   * @returns Numeric part (e.g., 42)
   */
  private extractNumber(id: string): number {
    const match = id.match(/^FS-(\d{3,})E?$/);
    if (!match) {
      throw new Error(`Invalid FS-ID format: ${id}`);
    }
    return parseInt(match[1], 10);
  }

  /**
   * Get all existing feature IDs (sorted by creation date)
   *
   * @returns Array of feature metadata sorted chronologically
   */
  getExistingFeatures(): FeatureMetadata[] {
    return Array.from(this.existingFeatures.values()).sort((a, b) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  /**
   * Get allocation statistics
   */
  getStats(): {
    total: number;
    active: number;
    archived: number;
    internal: number;
    external: number;
    maxId: number;
  } {
    const features = Array.from(this.existingFeatures.values());

    return {
      total: features.length,
      active: features.filter(f => !f.path.includes('/_archive/')).length,
      archived: features.filter(f => f.path.includes('/_archive/')).length,
      internal: features.filter(f => f.origin === 'internal').length,
      external: features.filter(f => f.origin === 'external').length,
      maxId: this.getMaxId()
    };
  }

  /**
   * Find first available numeric index for external feature (unified sequence)
   *
   * CRITICAL: Ensures FS-XXX and FS-XXXE never share the same numeric index
   * - Scans from 1 upward to find first unused numeric index
   * - Checks both FS-XXX (internal) and FS-XXXE (external) for each index
   *
   * @returns Allocation result if gap found, null if should use append strategy
   */
  private findFirstAvailableIndex(): AllocationResult | null {
    // Get all used numeric indices (from both internal and external features)
    const usedIndices = new Set<number>();
    for (const id of this.existingFeatures.keys()) {
      usedIndices.add(this.extractNumber(id));
    }

    // Find first gap starting from 1
    for (let index = 1; index <= usedIndices.size + 1; index++) {
      if (!usedIndices.has(index)) {
        const nextId = `FS-${String(index).padStart(3, '0')}E`;
        return {
          id: nextId,
          strategy: 'chronological-insert',
          reason: `Allocated first available numeric index (unified sequence, index ${index} was free)`,
          number: index
        };
      }
    }

    // No gap found in sequence - will use append strategy
    return null;
  }

  /**
   * Check if a numeric index is used by ANY feature (internal or external)
   *
   * @param index - Numeric index to check
   * @returns True if either FS-XXX or FS-XXXE exists for this index
   */
  isNumericIndexUsed(index: number): boolean {
    const internalId = `FS-${String(index).padStart(3, '0')}`;
    const externalId = `FS-${String(index).padStart(3, '0')}E`;
    return this.existingFeatures.has(internalId) || this.existingFeatures.has(externalId);
  }

  /**
   * Create feature folder with FEATURE.md and metadata
   *
   * Structure patterns:
   * - 2-level (JIRA): specs/JIRA-{containerId}/{projectId}/FS-XXX/FEATURE.md
   * - 2-level (ADO): specs/ADO-{containerId}/{projectId}/FS-XXX/FEATURE.md
   * - 1-level (GitHub): specs/{projectId}/FS-XXX/FEATURE.md
   * - Legacy: specs/FS-XXX/FEATURE.md (not recommended for umbrella)
   *
   * @param fsId - Feature ID (e.g., "FS-042E")
   * @param workItem - External work item metadata
   * @param metadata - External item metadata for origin tracking
   * @returns Path to created feature folder
   */
  async createFeatureFolder(
    fsId: string,
    workItem: ExternalWorkItem,
    metadata: ExternalItemMetadata
  ): Promise<string> {
    // Create folder path using 2-level or 1-level structure based on externalContainer
    const baseDir = this.getBaseDirectory();
    const featurePath = path.join(baseDir, fsId);
    await fs.ensureDir(featurePath);

    // Generate README.md with frontmatter
    const originBadge = formatOrigin(metadata);

    // Build frontmatter lines (only include defined optional fields)
    const frontmatterLines = [
      `id: ${fsId}`,
      `title: ${workItem.title}`,
      `created: ${workItem.createdAt}`,
      `origin: external`,
      `source: ${metadata.source}`,
      `external_id: ${metadata.external_id}`,
      `external_url: ${metadata.external_url}`,
      `imported_at: ${metadata.imported_at}`
    ];

    // Only add optional fields if explicitly defined
    if (metadata.external_title !== undefined) {
      frontmatterLines.push(`external_title: ${metadata.external_title}`);
    }
    if (metadata.format_preservation !== undefined) {
      frontmatterLines.push(`format_preservation: ${metadata.format_preservation}`);
    }

    const readmeContent = `---
${frontmatterLines.join('\n')}
---

# ${workItem.title}

**Origin**: ${originBadge}

## Description

Imported from external work item.

## User Stories

User stories will be added here during import.

## Status

- **Created**: ${workItem.createdAt}
- **Imported**: ${metadata.imported_at}
`;

    const readmePath = path.join(featurePath, 'README.md');
    await fs.writeFile(readmePath, readmeContent);

    return featurePath;
  }
}
