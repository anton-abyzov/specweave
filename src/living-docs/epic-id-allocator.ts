/**
 * Epic ID Allocator - Intelligent Epic ID allocation with chronological placement
 *
 * Allocates EP-XXX IDs for external work items (ADO Capabilities, Strategic Themes)
 * based on creation date, attempting chronological insertion while preventing collisions.
 *
 * CRITICAL (v0.30.3): Epics are stored PER-PROJECT in {project}/_epics/ folders,
 * NOT at the root level. Each project has its own epic namespace.
 *
 * Features:
 * - Per-project epic storage: {project}/_epics/EP-XXX/
 * - Chronological ID allocation based on work item creation date
 * - Gap filling (insert EP-011E between EP-010 and EP-020)
 * - Append mode fallback (max ID + 1)
 * - Collision detection (checks both EP-XXX and EP-XXXE)
 * - Archive-aware (scans both active and archived epics)
 *
 * @module living-docs/epic-id-allocator
 * @version 0.30.3
 */

import * as fs from '../utils/fs-native.js';
import path from 'path';
import matter from 'gray-matter';
import { formatOrigin, type ExternalItemMetadata } from '../core/types/origin-metadata.js';
import type { ExternalContainerContext } from '../core/types/increment-metadata.js';
import { normalizeToProjectId } from '../utils/project-id-generator.js';
import { Logger, consoleLogger } from '../utils/logger.js';

/**
 * Epic metadata extracted from living docs
 */
export interface EpicMetadata {
  /** Epic ID (e.g., "EP-042", "EP-042E") */
  id: string;

  /** Epic creation timestamp (ISO 8601) */
  createdAt: string;

  /** Origin (internal | external) */
  origin: 'internal' | 'external';

  /** External ID if external origin */
  externalId?: string;

  /** Path to epic folder */
  path: string;
}

/**
 * External work item to be allocated an EP-ID (Capability, Strategic Theme, etc.)
 */
export interface ExternalEpicItem {
  /** External ID (e.g., "ADO-123", "JIRA-THEME-456") */
  externalId: string;

  /** Epic title */
  title: string;

  /** Creation timestamp (ISO 8601) */
  createdAt: string;

  /** External URL */
  externalUrl: string;

  /** Original work item type (Capability, Strategic Theme, etc.) */
  workItemType?: string;
}

/**
 * Epic ID allocation result
 */
export interface EpicAllocationResult {
  /** Allocated EP-ID (e.g., "EP-042E") */
  id: string;

  /** Allocation strategy used */
  strategy: 'chronological-insert' | 'append' | 'first';

  /** Reason for allocation decision */
  reason: string;

  /** Numeric ID value */
  number: number;
}

/**
 * Epic ID Allocator Options
 */
export interface EpicIdAllocatorOptions {
  /** Enable global collision detection across ALL projects (umbrella mode) */
  globalCollisionDetection?: boolean;

  /**
   * External container context for 2-level directory structure (v0.29.0+)
   */
  externalContainer?: ExternalContainerContext;

  /** Logger instance (defaults to consoleLogger) */
  logger?: Logger;
}

/**
 * Epic ID Allocator
 *
 * Intelligently allocates Epic IDs with chronological placement.
 *
 * CRITICAL (v0.30.3): Epics are stored PER-PROJECT in {project}/_epics/ folders.
 * Structure: specs/{projectId}/_epics/EP-XXX/EPIC.md
 *
 * In umbrella/multi-repo setups, enable globalCollisionDetection
 * to prevent ID collisions like EP-001 in one repo and EP-001E in another.
 */
export class EpicIdAllocator {
  private projectRoot: string;
  private specsPath: string;
  private projectId: string;
  private epicsPath: string;
  private existingEpics: Map<string, EpicMetadata> = new Map();
  private scanned: boolean = false;
  private globalCollisionDetection: boolean;
  private externalContainer: ExternalContainerContext | undefined;
  private logger: Logger;

  /**
   * Create an Epic ID Allocator for a specific project
   *
   * @param projectRoot - Root directory of the SpecWeave project
   * @param projectId - Project ID (e.g., "olysense", "parent"). Required for per-project epics.
   * @param options - Optional configuration
   */
  constructor(projectRoot: string, projectId: string, options?: EpicIdAllocatorOptions) {
    this.projectRoot = projectRoot;
    this.projectId = projectId;
    this.specsPath = path.join(projectRoot, '.specweave/docs/internal/specs');
    this.globalCollisionDetection = options?.globalCollisionDetection ?? false;
    this.externalContainer = options?.externalContainer;
    this.logger = options?.logger ?? consoleLogger;

    // CRITICAL (v0.30.4): Epics path uses 2-level structure with externalContainer
    // - ADO/JIRA 2-level: specs/{containerId}/{projectId}/_epics/
    // - GitHub 1-level: specs/{projectId}/_epics/
    this.epicsPath = path.join(this.getBaseDirectory(), '_epics');
  }

  /**
   * Get base directory for epics, handling both 1-level and 2-level structures
   *
   * Mirrors FSIdAllocator.getBaseDirectory() for consistency:
   * - 2-level (JIRA): specs/JIRA-{containerId}/{projectId}/
   * - 2-level (ADO): specs/{containerId}/{projectId}/ (no ADO- prefix)
   * - 1-level (GitHub): specs/{projectId}/
   */
  private getBaseDirectory(): string {
    if (this.externalContainer) {
      // 2-level structure for JIRA/ADO
      const isJira = this.externalContainer.type === 'jira-project';
      const containerDirName = isJira
        ? `JIRA-${normalizeToProjectId(this.externalContainer.containerId)}`
        : normalizeToProjectId(this.externalContainer.containerId);

      return path.join(
        this.specsPath,
        containerDirName,
        this.projectId
      );
    }

    // 1-level structure for GitHub or single-project mode
    return path.join(this.specsPath, this.projectId);
  }

  /**
   * Get the project ID this allocator is configured for
   */
  getProjectId(): string {
    return this.projectId;
  }

  /**
   * Get the epics path for this project
   */
  getEpicsPath(): string {
    return this.epicsPath;
  }

  /**
   * Scan existing EP-IDs (both active and archived)
   *
   * CRITICAL: Archives are scanned to prevent ID reuse
   *
   * Structure (per-project):
   * - {project}/_epics/EP-XXX/
   * - {project}/_epics/_archive/EP-XXX/
   */
  async scanExistingIds(): Promise<void> {
    this.existingEpics.clear();

    // Scan active epics
    if (await fs.pathExists(this.epicsPath)) {
      await this.scanDirectory(this.epicsPath, 'active');
    }

    // Scan archived epics
    const archivePath = path.join(this.epicsPath, '_archive');
    if (await fs.pathExists(archivePath)) {
      await this.scanDirectory(archivePath, 'archived');
    }

    this.scanned = true;
    this.logger.log(`📊 Scanned ${this.existingEpics.size} existing Epic IDs`);
  }

  /**
   * Scan directory for EP-XXX folders
   */
  private async scanDirectory(dirPath: string, source: 'active' | 'archived'): Promise<void> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      // Match EP-XXX or EP-XXXE pattern (3+ digits)
      const match = entry.name.match(/^(EP-\d{3,}E?)$/);
      if (!match) continue;

      const epId = match[1];
      const epicPath = path.join(dirPath, entry.name);

      // Try to parse epic metadata from EPIC.md
      const metadata = await this.parseEpicMetadata(epicPath, epId);
      if (metadata) {
        this.existingEpics.set(epId, metadata);
      }
    }
  }

  /**
   * Parse epic metadata from EPIC.md frontmatter
   */
  private async parseEpicMetadata(
    epicPath: string,
    epId: string
  ): Promise<EpicMetadata | null> {
    // Try EPIC.md first, then README.md
    const possibleFiles = ['EPIC.md', 'README.md', 'epic.md', 'readme.md'];

    for (const filename of possibleFiles) {
      const filePath = path.join(epicPath, filename);
      if (await fs.pathExists(filePath)) {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const parsed = matter(content);
          const frontmatter = parsed.data;

          // Normalize timestamp
          const rawTimestamp = frontmatter.created || frontmatter.createdAt || new Date(0);
          const timestamp = rawTimestamp instanceof Date ? rawTimestamp.toISOString() : rawTimestamp;
          const normalizedTimestamp = timestamp.replace(/\.\d{3}Z$/, 'Z');

          return {
            id: epId,
            createdAt: normalizedTimestamp,
            origin: epId.endsWith('E') ? 'external' : 'internal',
            externalId: frontmatter.external_id || frontmatter.externalId,
            path: epicPath
          };
        } catch (error) {
          // Continue to next file
          continue;
        }
      }
    }

    // Fallback: create minimal metadata if no file found
    return {
      id: epId,
      createdAt: new Date(0).toISOString(), // Epoch (will sort to beginning)
      origin: epId.endsWith('E') ? 'external' : 'internal',
      path: epicPath
    };
  }

  /**
   * Allocate EP-ID for external work item with chronological placement
   *
   * Algorithm:
   * 1. Sort existing IDs by creation date
   * 2. Find chronological insertion point based on work item creation date
   * 3. Check for ID gaps between consecutive epics
   * 4. If gap exists, allocate next ID in gap (e.g., EP-011E between EP-010 and EP-020)
   * 5. If no gap, append to end (max ID + 1 with E suffix)
   *
   * CRITICAL: Unified numeric sequence - EP-XXX and EP-XXXE never share same index
   *
   * @param workItem - External epic item to allocate ID for
   * @returns Allocation result with ID and strategy
   */
  async allocateId(workItem: ExternalEpicItem): Promise<EpicAllocationResult> {
    if (!this.scanned) {
      await this.scanExistingIds();
    }

    // Handle empty case (first epic)
    if (this.existingEpics.size === 0) {
      const result: EpicAllocationResult = {
        id: 'EP-001E',
        strategy: 'first',
        reason: 'First external epic in project',
        number: 1
      };
      // Track allocated IDs to prevent duplicates in same session
      this.trackAllocatedId(result.id, workItem.createdAt);
      return result;
    }

    // Sort epics by creation date
    const sortedEpics = Array.from(this.existingEpics.values()).sort((a, b) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    // Find chronological insertion point
    const workItemDate = new Date(workItem.createdAt).getTime();
    let insertionIndex = sortedEpics.findIndex(
      e => new Date(e.createdAt).getTime() > workItemDate
    );

    // If work item is after all existing epics, append
    if (insertionIndex === -1) {
      const maxId = this.getMaxId();
      const nextNumber = maxId + 1;
      const nextId = `EP-${String(nextNumber).padStart(3, '0')}E`;

      // Check for collision
      if (this.hasCollision(nextId)) {
        throw new Error(`ID collision: ${nextId} already exists`);
      }

      const result: EpicAllocationResult = {
        id: nextId,
        strategy: 'append',
        reason: `Work item created after all existing epics (${new Date(workItem.createdAt).toISOString()})`,
        number: nextNumber
      };
      this.trackAllocatedId(result.id, workItem.createdAt);
      return result;
    }

    // Try chronological insertion into gap
    const beforeEpic = insertionIndex > 0 ? sortedEpics[insertionIndex - 1] : null;
    const afterEpic = sortedEpics[insertionIndex];

    if (beforeEpic && afterEpic) {
      const beforeNumber = this.extractNumber(beforeEpic.id);
      const afterNumber = this.extractNumber(afterEpic.id);

      // Check if there's a gap (at least 2 numbers apart)
      if (afterNumber - beforeNumber > 1) {
        // Allocate next ID after beforeEpic
        const nextNumber = beforeNumber + 1;
        const nextId = `EP-${String(nextNumber).padStart(3, '0')}E`;

        // Check for collision
        if (!this.hasCollision(nextId)) {
          const result: EpicAllocationResult = {
            id: nextId,
            strategy: 'chronological-insert',
            reason: `Inserted chronologically between ${beforeEpic.id} and ${afterEpic.id}`,
            number: nextNumber
          };
          this.trackAllocatedId(result.id, workItem.createdAt);
          return result;
        } else {
          const collidingId = this.findCollidingId(nextNumber);
          this.logger.warn(
            `⚠️ Numeric collision prevented: ${collidingId} exists, skipping index ${nextNumber}`
          );
        }
      }
    }

    // Fallback: append to end if gap insertion failed
    const maxId = this.getMaxId();
    const nextNumber = maxId + 1;
    const nextId = `EP-${String(nextNumber).padStart(3, '0')}E`;

    // Check for collision
    if (this.hasCollision(nextId)) {
      throw new Error(`ID collision: ${nextId} already exists`);
    }

    const result: EpicAllocationResult = {
      id: nextId,
      strategy: 'append',
      reason: 'Gap insertion not possible, appended to end',
      number: nextNumber
    };
    this.trackAllocatedId(result.id, workItem.createdAt);
    return result;
  }

  /**
   * Track a newly allocated ID to prevent duplicates in the same session
   */
  private trackAllocatedId(id: string, createdAt: string): void {
    this.existingEpics.set(id, {
      id,
      createdAt,
      origin: 'external',
      path: ''
    });
  }

  /**
   * Check if ID has collision (exact match or variant)
   */
  hasCollision(id: string): boolean {
    // Exact match
    if (this.existingEpics.has(id)) {
      return true;
    }

    // Variant match (check both EP-XXX and EP-XXXE)
    const number = this.extractNumber(id);
    const internalId = `EP-${String(number).padStart(3, '0')}`;
    const externalId = `EP-${String(number).padStart(3, '0')}E`;

    return this.existingEpics.has(internalId) || this.existingEpics.has(externalId);
  }

  /**
   * Get maximum numeric ID value (ignoring E suffix)
   */
  getMaxId(): number {
    if (this.existingEpics.size === 0) {
      return 0;
    }

    const numbers = Array.from(this.existingEpics.keys()).map(id => this.extractNumber(id));
    return Math.max(...numbers);
  }

  /**
   * Extract numeric part from EP-ID
   */
  private extractNumber(id: string): number {
    const match = id.match(/^EP-(\d{3,})E?$/);
    if (!match) {
      throw new Error(`Invalid EP-ID format: ${id}`);
    }
    return parseInt(match[1], 10);
  }

  /**
   * Find which epic ID is using a numeric index
   */
  private findCollidingId(index: number): string {
    const internalId = `EP-${String(index).padStart(3, '0')}`;
    const externalId = `EP-${String(index).padStart(3, '0')}E`;

    if (this.existingEpics.has(internalId)) {
      return internalId;
    }
    if (this.existingEpics.has(externalId)) {
      return externalId;
    }
    return `index ${index}`;
  }

  /**
   * Get all existing epic IDs (sorted by creation date)
   */
  getExistingEpics(): EpicMetadata[] {
    return Array.from(this.existingEpics.values()).sort((a, b) => {
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
    const epics = Array.from(this.existingEpics.values());

    return {
      total: epics.length,
      active: epics.filter(e => !e.path.includes('/_archive/')).length,
      archived: epics.filter(e => e.path.includes('/_archive/')).length,
      internal: epics.filter(e => e.origin === 'internal').length,
      external: epics.filter(e => e.origin === 'external').length,
      maxId: this.getMaxId()
    };
  }

  /**
   * Create epic folder with EPIC.md and metadata
   *
   * Structure (per-project):
   * - {project}/_epics/EP-XXX/EPIC.md
   *
   * @param epId - Epic ID (e.g., "EP-042E")
   * @param workItem - External epic item metadata
   * @param metadata - External item metadata for origin tracking
   * @returns Path to created epic folder
   */
  async createEpicFolder(
    epId: string,
    workItem: ExternalEpicItem,
    metadata: ExternalItemMetadata
  ): Promise<string> {
    // CRITICAL (v0.30.3): Epics are PER-PROJECT: {project}/_epics/EP-XXX/
    const epicPath = path.join(this.epicsPath, epId);
    await fs.ensureDir(epicPath);

    // Generate EPIC.md with frontmatter
    const originBadge = formatOrigin(metadata);
    const workItemTypeLabel = workItem.workItemType || 'Capability';

    const epicContent = `---
id: ${epId}
title: "${workItem.title}"
type: epic
origin: external
source: ${metadata.source}
external_id: ${metadata.external_id}
external_url: ${metadata.external_url}
work_item_type: ${workItemTypeLabel}
created: ${workItem.createdAt}
imported_at: ${metadata.imported_at}
---

# ${workItemTypeLabel}: ${workItem.title}

**Origin**: ${originBadge}

## Description

This ${workItemTypeLabel.toLowerCase()} was imported from an external tool.

## Features in This Epic

Features belonging to this ${workItemTypeLabel.toLowerCase()} will be listed here.

## Status

- **Created**: ${workItem.createdAt}
- **Imported**: ${metadata.imported_at}
- **External ID**: ${metadata.external_id}
`;

    const epicFilePath = path.join(epicPath, 'EPIC.md');
    await fs.writeFile(epicFilePath, epicContent);

    this.logger.log(`📁 Created Epic folder: ${epId}`);
    return epicPath;
  }
}
