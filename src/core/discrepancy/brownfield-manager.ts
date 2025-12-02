/**
 * Brownfield Discrepancy Manager
 *
 * Manages persistent storage and lifecycle of brownfield discrepancies.
 * Uses batched folder structure for scalability (supports 10,000+ discrepancies).
 *
 * @module core/discrepancy/brownfield-manager
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Logger, consoleLogger } from '../../utils/logger.js';
import {
  BrownfieldDiscrepancy,
  BrownfieldDiscrepancyCreate,
  BrownfieldDiscrepancyFilter,
  BrownfieldDiscrepancyIndex,
  BrownfieldDiscrepancyResolution,
  BrownfieldDiscrepancyStats,
  BrownfieldDiscrepancyStatus,
  BrownfieldDiscrepancyType,
  BrownfieldDiscrepancyUpdate,
  BrownfieldDiscrepancyPriority,
} from './brownfield-types.js';

/** Batch size for folder organization (100 discrepancies per folder) */
const BATCH_SIZE = 100;

/** Default index structure */
const DEFAULT_INDEX: BrownfieldDiscrepancyIndex = {
  version: '1.0.0',
  stats: {
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
    ignored: 0,
    byType: {
      'missing-docs': 0,
      'stale-docs': 0,
      'code-doc-mismatch': 0,
      'knowledge-gap': 0,
      'orphan-doc': 0,
      'missing-adr': 0,
    },
    byPriority: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    },
  },
  lastUpdated: new Date().toISOString(),
};

/**
 * Manages brownfield discrepancies with persistent storage.
 */
export class BrownfieldDiscrepancyManager {
  private readonly projectPath: string;
  private readonly basePath: string;
  private readonly logger: Logger;
  private index: BrownfieldDiscrepancyIndex | null = null;

  constructor(
    projectPath: string,
    options: { logger?: Logger } = {}
  ) {
    this.projectPath = projectPath;
    this.basePath = path.join(projectPath, '.specweave', 'discrepancies');
    this.logger = options.logger ?? consoleLogger;
  }

  /**
   * Initialize folder structure if needed.
   */
  async ensureFolderStructure(): Promise<void> {
    const folders = [
      this.basePath,
      path.join(this.basePath, 'pending'),
      path.join(this.basePath, 'in-progress'),
      path.join(this.basePath, 'resolved'),
    ];

    for (const folder of folders) {
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
        this.logger.log(`Created discrepancy folder: ${folder}`);
      }
    }

    // Initialize index if not exists
    const indexPath = path.join(this.basePath, 'index.json');
    if (!fs.existsSync(indexPath)) {
      // Clear cache to ensure fresh index
      this.index = null;
      await this.saveIndex({ ...DEFAULT_INDEX, lastUpdated: new Date().toISOString() });
    }
  }

  /**
   * Create a new discrepancy with auto-generated ID.
   */
  async createDiscrepancy(data: BrownfieldDiscrepancyCreate): Promise<BrownfieldDiscrepancy> {
    await this.ensureFolderStructure();

    const id = await this.getNextId();
    const discrepancy: BrownfieldDiscrepancy = {
      ...data,
      id,
    };

    await this.saveDiscrepancy(discrepancy);
    await this.updateIndex();

    this.logger.log(`Created discrepancy: ${id}`);
    return discrepancy;
  }

  /**
   * Get a discrepancy by ID.
   */
  async getDiscrepancy(id: string): Promise<BrownfieldDiscrepancy | null> {
    const filePath = await this.findDiscrepancyPath(id);
    if (!filePath || !fs.existsSync(filePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as BrownfieldDiscrepancy;
    } catch (error) {
      this.logger.error(`Failed to read discrepancy ${id}:`, error);
      return null;
    }
  }

  /**
   * Update a discrepancy.
   */
  async updateDiscrepancy(
    id: string,
    updates: BrownfieldDiscrepancyUpdate
  ): Promise<BrownfieldDiscrepancy | null> {
    const discrepancy = await this.getDiscrepancy(id);
    if (!discrepancy) {
      this.logger.warn(`Discrepancy not found: ${id}`);
      return null;
    }

    const oldStatus = discrepancy.status;
    const updated: BrownfieldDiscrepancy = {
      ...discrepancy,
      ...updates,
      lastChecked: new Date().toISOString(),
    };

    // Handle status change (move between folders)
    if (updates.status && updates.status !== oldStatus) {
      await this.moveDiscrepancy(updated, updates.status);
    } else {
      await this.saveDiscrepancy(updated);
    }

    await this.updateIndex();
    this.logger.log(`Updated discrepancy: ${id}`);
    return updated;
  }

  /**
   * Delete a discrepancy.
   */
  async deleteDiscrepancy(id: string): Promise<boolean> {
    const filePath = await this.findDiscrepancyPath(id);
    if (!filePath || !fs.existsSync(filePath)) {
      return false;
    }

    try {
      fs.unlinkSync(filePath);
      await this.updateIndex();
      this.logger.log(`Deleted discrepancy: ${id}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete discrepancy ${id}:`, error);
      return false;
    }
  }

  /**
   * List discrepancies with optional filtering.
   */
  async listDiscrepancies(filter?: BrownfieldDiscrepancyFilter): Promise<BrownfieldDiscrepancy[]> {
    await this.ensureFolderStructure();

    const discrepancies: BrownfieldDiscrepancy[] = [];

    // Determine which status folders to search
    // Note: 'ignored' discrepancies are stored in 'pending' folder with status='ignored'
    // So we only scan unique folders and filter by status at read time
    const statuses: BrownfieldDiscrepancyStatus[] = filter?.statuses
      || (filter?.status ? [filter.status] : ['pending', 'in-progress', 'resolved']);

    for (const status of statuses) {
      const statusFolder = this.getStatusFolder(status);
      if (!fs.existsSync(statusFolder)) continue;

      // For resolved, we need to scan YYYY-MM subfolders
      if (status === 'resolved') {
        const monthFolders = fs.readdirSync(statusFolder, { withFileTypes: true })
          .filter(d => d.isDirectory())
          .map(d => path.join(statusFolder, d.name));

        for (const monthFolder of monthFolders) {
          const files = fs.readdirSync(monthFolder).filter(f => f.endsWith('.json'));
          for (const file of files) {
            const disc = this.readDiscrepancyFile(path.join(monthFolder, file));
            if (disc && this.matchesFilter(disc, filter)) {
              discrepancies.push(disc);
            }
          }
        }
      } else {
        // Scan batch folders (0001-0100, 0101-0200, etc.)
        const batchFolders = fs.readdirSync(statusFolder, { withFileTypes: true })
          .filter(d => d.isDirectory())
          .map(d => path.join(statusFolder, d.name));

        for (const batchFolder of batchFolders) {
          const files = fs.readdirSync(batchFolder).filter(f => f.endsWith('.json'));
          for (const file of files) {
            const disc = this.readDiscrepancyFile(path.join(batchFolder, file));
            if (disc && this.matchesFilter(disc, filter)) {
              discrepancies.push(disc);
            }
          }
        }
      }
    }

    // Sort by priority (critical first), then by detected date (newest first)
    const priorityOrder: Record<BrownfieldDiscrepancyPriority, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    discrepancies.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
    });

    // Apply pagination
    const offset = filter?.offset ?? 0;
    const limit = filter?.limit ?? discrepancies.length;
    return discrepancies.slice(offset, offset + limit);
  }

  /**
   * Get summary statistics.
   */
  async getStats(): Promise<BrownfieldDiscrepancyStats> {
    const index = await this.loadIndex();
    return index.stats;
  }

  /**
   * Link discrepancy to an increment.
   * Returns true if successfully linked, false if discrepancy not found.
   */
  async linkToIncrement(discrepancyId: string, incrementId: string): Promise<boolean> {
    const result = await this.updateDiscrepancy(discrepancyId, {
      status: 'in-progress',
      incrementId,
    });
    return result !== null;
  }

  /**
   * Resolve a discrepancy.
   */
  async resolveDiscrepancy(
    id: string,
    resolution: BrownfieldDiscrepancyResolution
  ): Promise<void> {
    await this.updateDiscrepancy(id, {
      status: 'resolved',
      resolution,
    });
  }

  /**
   * Ignore a discrepancy.
   */
  async ignoreDiscrepancy(id: string, reason: string): Promise<void> {
    await this.updateDiscrepancy(id, {
      status: 'ignored',
      resolution: {
        type: 'false-positive',
        resolvedAt: new Date().toISOString(),
        resolvedBy: 'user',
        notes: reason,
      },
    });
  }

  /**
   * Create multiple discrepancies in batch.
   */
  async createBatch(
    discrepancies: BrownfieldDiscrepancyCreate[]
  ): Promise<BrownfieldDiscrepancy[]> {
    const created: BrownfieldDiscrepancy[] = [];

    for (const data of discrepancies) {
      const disc = await this.createDiscrepancy(data);
      created.push(disc);
    }

    return created;
  }

  /**
   * Archive resolved discrepancies to YYYY-MM folders.
   */
  async archiveResolved(): Promise<number> {
    const inProgressFolder = path.join(this.basePath, 'in-progress');
    const resolvedFolder = path.join(this.basePath, 'resolved');

    if (!fs.existsSync(resolvedFolder)) {
      fs.mkdirSync(resolvedFolder, { recursive: true });
    }

    let archivedCount = 0;

    // Find all resolved discrepancies in in-progress folder
    if (fs.existsSync(inProgressFolder)) {
      const files = this.getAllJsonFiles(inProgressFolder);
      for (const file of files) {
        const disc = this.readDiscrepancyFile(file);
        if (disc && disc.status === 'resolved') {
          // Move to resolved/YYYY-MM/
          const resolvedDate = disc.resolution?.resolvedAt
            ? new Date(disc.resolution.resolvedAt)
            : new Date();
          const monthFolder = path.join(
            resolvedFolder,
            `${resolvedDate.getFullYear()}-${String(resolvedDate.getMonth() + 1).padStart(2, '0')}`
          );

          if (!fs.existsSync(monthFolder)) {
            fs.mkdirSync(monthFolder, { recursive: true });
          }

          const destPath = path.join(monthFolder, `${disc.id}.json`);
          fs.renameSync(file, destPath);
          archivedCount++;
        }
      }
    }

    if (archivedCount > 0) {
      await this.updateIndex();
      this.logger.log(`Archived ${archivedCount} resolved discrepancies`);
    }

    return archivedCount;
  }

  /**
   * Get the batch folder name for a numeric ID.
   * Example: 1-100 → "0001-0100", 101-200 → "0101-0200"
   */
  getBatchFolder(numericId: number): string {
    const batchStart = Math.floor((numericId - 1) / BATCH_SIZE) * BATCH_SIZE + 1;
    const batchEnd = batchStart + BATCH_SIZE - 1;
    return `${String(batchStart).padStart(4, '0')}-${String(batchEnd).padStart(4, '0')}`;
  }

  // ─────────────────────────────────────────────────────────────
  // Private methods
  // ─────────────────────────────────────────────────────────────

  private async getNextId(): Promise<string> {
    const index = await this.loadIndex();
    const nextNum = index.stats.total + 1;
    return `DISC-${String(nextNum).padStart(4, '0')}`;
  }

  private getStatusFolder(status: BrownfieldDiscrepancyStatus): string {
    const folderMap: Record<BrownfieldDiscrepancyStatus, string> = {
      pending: 'pending',
      'in-progress': 'in-progress',
      resolved: 'resolved',
      ignored: 'pending', // Ignored stays in pending folder with status flag
    };
    return path.join(this.basePath, folderMap[status]);
  }

  private async saveDiscrepancy(discrepancy: BrownfieldDiscrepancy): Promise<void> {
    const numericId = parseInt(discrepancy.id.replace('DISC-', ''), 10);
    const statusFolder = this.getStatusFolder(discrepancy.status);
    const batchFolder = path.join(statusFolder, this.getBatchFolder(numericId));

    if (!fs.existsSync(batchFolder)) {
      fs.mkdirSync(batchFolder, { recursive: true });
    }

    const filePath = path.join(batchFolder, `${discrepancy.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(discrepancy, null, 2));
  }

  private async moveDiscrepancy(
    discrepancy: BrownfieldDiscrepancy,
    newStatus: BrownfieldDiscrepancyStatus
  ): Promise<void> {
    const oldPath = await this.findDiscrepancyPath(discrepancy.id);

    // Update the discrepancy object
    discrepancy.status = newStatus;
    discrepancy.lastChecked = new Date().toISOString();

    // Delete from old location
    if (oldPath && fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    }

    // Save to new location
    if (newStatus === 'resolved') {
      // Resolved goes to YYYY-MM folder
      const resolvedDate = discrepancy.resolution?.resolvedAt
        ? new Date(discrepancy.resolution.resolvedAt)
        : new Date();
      const monthFolder = path.join(
        this.basePath,
        'resolved',
        `${resolvedDate.getFullYear()}-${String(resolvedDate.getMonth() + 1).padStart(2, '0')}`
      );

      if (!fs.existsSync(monthFolder)) {
        fs.mkdirSync(monthFolder, { recursive: true });
      }

      const filePath = path.join(monthFolder, `${discrepancy.id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(discrepancy, null, 2));
    } else {
      // Other statuses use batched folders
      await this.saveDiscrepancy(discrepancy);
    }
  }

  private async findDiscrepancyPath(id: string): Promise<string | null> {
    const numericId = parseInt(id.replace('DISC-', ''), 10);
    const batchFolder = this.getBatchFolder(numericId);
    const fileName = `${id}.json`;

    // Check all status folders
    const checkPaths = [
      path.join(this.basePath, 'pending', batchFolder, fileName),
      path.join(this.basePath, 'in-progress', batchFolder, fileName),
    ];

    for (const checkPath of checkPaths) {
      if (fs.existsSync(checkPath)) {
        return checkPath;
      }
    }

    // Check resolved (scan all YYYY-MM folders)
    const resolvedFolder = path.join(this.basePath, 'resolved');
    if (fs.existsSync(resolvedFolder)) {
      const monthFolders = fs.readdirSync(resolvedFolder, { withFileTypes: true })
        .filter(d => d.isDirectory());

      for (const monthFolder of monthFolders) {
        const checkPath = path.join(resolvedFolder, monthFolder.name, fileName);
        if (fs.existsSync(checkPath)) {
          return checkPath;
        }
      }
    }

    return null;
  }

  private readDiscrepancyFile(filePath: string): BrownfieldDiscrepancy | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as BrownfieldDiscrepancy;
    } catch {
      return null;
    }
  }

  private getAllJsonFiles(folder: string): string[] {
    const files: string[] = [];

    const entries = fs.readdirSync(folder, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(folder, entry.name);
      if (entry.isDirectory()) {
        files.push(...this.getAllJsonFiles(fullPath));
      } else if (entry.name.endsWith('.json')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  private matchesFilter(
    disc: BrownfieldDiscrepancy,
    filter?: BrownfieldDiscrepancyFilter
  ): boolean {
    if (!filter) return true;

    if (filter.module && disc.module !== filter.module) return false;
    if (filter.type && disc.type !== filter.type) return false;
    if (filter.types && !filter.types.includes(disc.type)) return false;
    if (filter.priority && disc.priority !== filter.priority) return false;
    if (filter.priorities && !filter.priorities.includes(disc.priority)) return false;
    if (filter.minConfidence !== undefined && disc.confidence < filter.minConfidence) return false;
    if (filter.incrementId && disc.incrementId !== filter.incrementId) return false;

    return true;
  }

  private async loadIndex(): Promise<BrownfieldDiscrepancyIndex> {
    if (this.index) return this.index;

    const indexPath = path.join(this.basePath, 'index.json');
    if (!fs.existsSync(indexPath)) {
      return { ...DEFAULT_INDEX };
    }

    try {
      const content = fs.readFileSync(indexPath, 'utf-8');
      this.index = JSON.parse(content) as BrownfieldDiscrepancyIndex;
      return this.index;
    } catch {
      return { ...DEFAULT_INDEX };
    }
  }

  private async saveIndex(index: BrownfieldDiscrepancyIndex): Promise<void> {
    // Note: Don't call ensureFolderStructure here to avoid circular dependency
    // Folder structure is ensured before any operation that calls saveIndex
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
    const indexPath = path.join(this.basePath, 'index.json');
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
    this.index = index;
  }

  private async updateIndex(): Promise<void> {
    const stats: BrownfieldDiscrepancyStats = {
      total: 0,
      pending: 0,
      inProgress: 0,
      resolved: 0,
      ignored: 0,
      byType: {
        'missing-docs': 0,
        'stale-docs': 0,
        'code-doc-mismatch': 0,
        'knowledge-gap': 0,
        'orphan-doc': 0,
        'missing-adr': 0,
      },
      byPriority: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
    };

    // Count all discrepancies
    const statusFolders: BrownfieldDiscrepancyStatus[] = ['pending', 'in-progress', 'resolved'];
    for (const status of statusFolders) {
      const folder = this.getStatusFolder(status);
      if (!fs.existsSync(folder)) continue;

      const files = this.getAllJsonFiles(folder);
      for (const file of files) {
        const disc = this.readDiscrepancyFile(file);
        if (!disc) continue;

        stats.total++;
        stats.byType[disc.type]++;
        stats.byPriority[disc.priority]++;

        switch (disc.status) {
          case 'pending':
            stats.pending++;
            break;
          case 'in-progress':
            stats.inProgress++;
            break;
          case 'resolved':
            stats.resolved++;
            break;
          case 'ignored':
            stats.ignored++;
            break;
        }
      }
    }

    const index = await this.loadIndex();
    index.stats = stats;
    index.lastUpdated = new Date().toISOString();
    await this.saveIndex(index);
  }
}
