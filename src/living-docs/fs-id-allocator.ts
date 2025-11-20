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

import fs from 'fs-extra';
import path from 'path';
import matter from 'gray-matter';
import { formatOrigin, type ExternalItemMetadata } from '../core/types/origin-metadata.js';

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
 * FS-ID Allocator
 *
 * Intelligently allocates Feature IDs with chronological placement
 */
export class FSIdAllocator {
  private projectRoot: string;
  private specsPath: string;
  private archivePath: string;
  private existingFeatures: Map<string, FeatureMetadata> = new Map();
  private scanned: boolean = false;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.specsPath = path.join(projectRoot, '.specweave/docs/internal/specs');
    this.archivePath = path.join(projectRoot, '.specweave/docs/_archive/specs');
  }

  /**
   * Scan existing FS-IDs (both active and archived)
   *
   * CRITICAL: Archives are scanned to prevent ID reuse
   */
  async scanExistingIds(): Promise<void> {
    this.existingFeatures.clear();

    // Scan active features
    if (await fs.pathExists(this.specsPath)) {
      await this.scanDirectory(this.specsPath, 'active');
    }

    // Scan archived features (CRITICAL - prevents ID reuse)
    if (await fs.pathExists(this.archivePath)) {
      await this.scanDirectory(this.archivePath, 'archived');
    }

    this.scanned = true;
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
   * Create feature folder with README.md and metadata
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
    // Create folder path
    const featurePath = path.join(this.specsPath, fsId);
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
