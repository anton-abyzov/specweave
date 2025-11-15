/**
 * Metadata Manager
 *
 * Handles CRUD operations for increment metadata (status, type, timestamps).
 * Part of increment 0007: Smart Status Management
 */

import fs from 'fs-extra';
import path from 'path';
import {
  IncrementMetadata,
  IncrementMetadataExtended,
  IncrementStatus,
  IncrementType,
  createDefaultMetadata,
  isValidTransition,
  isStale,
  shouldAutoAbandon
} from '../types/increment-metadata.js';
import { ActiveIncrementManager } from './active-increment-manager.js';

/**
 * Error thrown when metadata operations fail
 */
export class MetadataError extends Error {
  constructor(message: string, public incrementId: string, public cause?: Error) {
    super(message);
    this.name = 'MetadataError';
  }
}

/**
 * Metadata Manager
 *
 * Provides CRUD operations and queries for increment metadata
 */
export class MetadataManager {
  /**
   * Get metadata file path for increment
   */
  private static getMetadataPath(incrementId: string): string {
    const specweavePath = path.join(process.cwd(), '.specweave');
    return path.join(specweavePath, 'increments', incrementId, 'metadata.json');
  }

  /**
   * Get increment directory path
   */
  private static getIncrementPath(incrementId: string): string {
    const specweavePath = path.join(process.cwd(), '.specweave');
    return path.join(specweavePath, 'increments', incrementId);
  }

  /**
   * Check if metadata file exists
   */
  static exists(incrementId: string): boolean {
    const metadataPath = this.getMetadataPath(incrementId);
    return fs.existsSync(metadataPath);
  }

  /**
   * Read metadata from file
   * Creates default metadata if file doesn't exist (lazy initialization)
   */
  static read(incrementId: string): IncrementMetadata {
    const metadataPath = this.getMetadataPath(incrementId);

    // Lazy initialization: Create metadata if doesn't exist
    if (!fs.existsSync(metadataPath)) {
      // Check if increment folder exists
      const incrementPath = this.getIncrementPath(incrementId);
      if (!fs.existsSync(incrementPath)) {
        throw new MetadataError(
          `Increment not found: ${incrementId}`,
          incrementId
        );
      }

      // Create default metadata
      const defaultMetadata = createDefaultMetadata(incrementId);
      this.write(incrementId, defaultMetadata);

      // **CRITICAL**: Update active increment state if default status is ACTIVE
      // This ensures that newly created increments are immediately tracked for status line
      if (defaultMetadata.status === IncrementStatus.ACTIVE) {
        const activeManager = new ActiveIncrementManager();
        activeManager.setActive(incrementId);
      }

      return defaultMetadata;
    }

    try {
      const content = fs.readFileSync(metadataPath, 'utf-8');
      const metadata: IncrementMetadata = JSON.parse(content);

      // Validate schema
      this.validate(metadata);

      return metadata;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new MetadataError(
        `Failed to read metadata for ${incrementId}: ${errorMessage}`,
        incrementId,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Write metadata to file
   * Uses atomic write (temp file → rename)
   */
  static write(incrementId: string, metadata: IncrementMetadata): void {
    const metadataPath = this.getMetadataPath(incrementId);
    const incrementPath = this.getIncrementPath(incrementId);

    // Ensure increment directory exists
    if (!fs.existsSync(incrementPath)) {
      throw new MetadataError(
        `Increment directory not found: ${incrementId}`,
        incrementId
      );
    }

    try {
      // Validate before writing
      this.validate(metadata);

      // Atomic write: temp file → rename
      const tempPath = `${metadataPath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(metadata, null, 2), 'utf-8');
      fs.renameSync(tempPath, metadataPath);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new MetadataError(
        `Failed to write metadata for ${incrementId}: ${errorMessage}`,
        incrementId,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Delete metadata file
   */
  static delete(incrementId: string): void {
    const metadataPath = this.getMetadataPath(incrementId);

    if (!fs.existsSync(metadataPath)) {
      return; // Already deleted
    }

    try {
      fs.unlinkSync(metadataPath);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new MetadataError(
        `Failed to delete metadata for ${incrementId}: ${errorMessage}`,
        incrementId,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Update increment status
   * Validates transition and updates timestamps
   *
   * **CRITICAL**: Also updates active increment state automatically!
   */
  static updateStatus(
    incrementId: string,
    newStatus: IncrementStatus,
    reason?: string
  ): IncrementMetadata {
    const metadata = this.read(incrementId);

    // Validate transition
    if (!isValidTransition(metadata.status, newStatus)) {
      throw new MetadataError(
        `Invalid status transition: ${metadata.status} → ${newStatus}`,
        incrementId
      );
    }

    // Update status
    metadata.status = newStatus;
    metadata.lastActivity = new Date().toISOString();

    // Update status-specific fields
    if (newStatus === IncrementStatus.BACKLOG) {
      metadata.backlogReason = reason || 'Planned for future work';
      metadata.backlogAt = new Date().toISOString();
    } else if (newStatus === IncrementStatus.PAUSED) {
      metadata.pausedReason = reason || 'No reason provided';
      metadata.pausedAt = new Date().toISOString();
    } else if (newStatus === IncrementStatus.ACTIVE) {
      // Clear backlog/paused fields when activating
      metadata.backlogReason = undefined;
      metadata.backlogAt = undefined;
      metadata.pausedReason = undefined;
      metadata.pausedAt = undefined;
    } else if (newStatus === IncrementStatus.ABANDONED) {
      metadata.abandonedReason = reason || 'No reason provided';
      metadata.abandonedAt = new Date().toISOString();
    }

    this.write(incrementId, metadata);

    // **CRITICAL**: Update active increment state
    const activeManager = new ActiveIncrementManager();

    if (newStatus === IncrementStatus.ACTIVE) {
      // Increment became active → set as active
      activeManager.setActive(incrementId);
    } else if (
      newStatus === IncrementStatus.COMPLETED ||
      newStatus === IncrementStatus.BACKLOG ||
      newStatus === IncrementStatus.PAUSED ||
      newStatus === IncrementStatus.ABANDONED
    ) {
      // Increment no longer active → smart update (find next active or clear)
      activeManager.smartUpdate();
    }

    return metadata;
  }

  /**
   * Update increment type
   */
  static updateType(incrementId: string, type: IncrementType): IncrementMetadata {
    const metadata = this.read(incrementId);
    metadata.type = type;
    metadata.lastActivity = new Date().toISOString();
    this.write(incrementId, metadata);
    return metadata;
  }

  /**
   * Touch increment (update lastActivity)
   */
  static touch(incrementId: string): IncrementMetadata {
    const metadata = this.read(incrementId);
    metadata.lastActivity = new Date().toISOString();
    this.write(incrementId, metadata);
    return metadata;
  }

  /**
   * Get all increments
   */
  static getAll(): IncrementMetadata[] {
    const incrementsPath = path.join(process.cwd(), '.specweave', 'increments');

    if (!fs.existsSync(incrementsPath)) {
      return [];
    }

    const incrementFolders = fs.readdirSync(incrementsPath)
      .filter(name => {
        const folderPath = path.join(incrementsPath, name);
        return fs.statSync(folderPath).isDirectory() && !name.startsWith('_');
      });

    return incrementFolders
      .map(folder => {
        try {
          return this.read(folder);
        } catch (error) {
          // Skip increments with invalid/missing metadata
          return null;
        }
      })
      .filter((m): m is IncrementMetadata => m !== null);
  }

  /**
   * Get increments by status
   */
  static getByStatus(status: IncrementStatus): IncrementMetadata[] {
    return this.getAll().filter(m => m.status === status);
  }

  /**
   * Get active increments (FAST: cache-first strategy)
   *
   * **PERFORMANCE UPGRADE**: Uses ActiveIncrementManager cache instead of scanning all increments
   * - Old: Scan 31 metadata files (~50ms)
   * - New: Read 1 cache file + 1-2 metadata files (~5ms) = **10x faster**
   *
   * Fallback to full scan if cache is stale or missing
   */
  static getActive(): IncrementMetadata[] {
    const activeManager = new ActiveIncrementManager();

    // FAST PATH: Read from cache
    const cachedIds = activeManager.getActive();

    if (cachedIds.length > 0) {
      // Validate cache is correct
      const isValid = activeManager.validate();

      if (isValid) {
        // Cache is good! Read only the cached increments
        return cachedIds
          .map(id => {
            try {
              return this.read(id);
            } catch (error) {
              // Stale cache entry, trigger rebuild
              activeManager.smartUpdate();
              return null;
            }
          })
          .filter((m): m is IncrementMetadata => m !== null);
      }
    }

    // SLOW PATH: Cache miss or invalid, scan all increments
    const allActive = this.getByStatus(IncrementStatus.ACTIVE);

    // Rebuild cache from scan results
    if (allActive.length > 0) {
      activeManager.smartUpdate();
    }

    return allActive;
  }

  /**
   * Get backlog increments
   */
  static getBacklog(): IncrementMetadata[] {
    return this.getByStatus(IncrementStatus.BACKLOG);
  }

  /**
   * Get paused increments
   */
  static getPaused(): IncrementMetadata[] {
    return this.getByStatus(IncrementStatus.PAUSED);
  }

  /**
   * Get completed increments
   */
  static getCompleted(): IncrementMetadata[] {
    return this.getByStatus(IncrementStatus.COMPLETED);
  }

  /**
   * Get abandoned increments
   */
  static getAbandoned(): IncrementMetadata[] {
    return this.getByStatus(IncrementStatus.ABANDONED);
  }

  /**
   * Get increments by type
   */
  static getByType(type: IncrementType): IncrementMetadata[] {
    return this.getAll().filter(m => m.type === type);
  }

  /**
   * Get stale increments (paused >7 days or active >30 days)
   */
  static getStale(): IncrementMetadata[] {
    return this.getAll().filter(m => isStale(m));
  }

  /**
   * Get increments that should be auto-abandoned (experiments inactive >14 days)
   */
  static getShouldAutoAbandon(): IncrementMetadata[] {
    return this.getAll().filter(m => shouldAutoAbandon(m));
  }

  /**
   * Get extended metadata with computed fields (progress, age, etc.)
   */
  static getExtended(incrementId: string): IncrementMetadataExtended {
    const metadata = this.read(incrementId);
    const extended: IncrementMetadataExtended = { ...metadata };

    // Calculate progress from tasks.md
    try {
      const tasksPath = path.join(this.getIncrementPath(incrementId), 'tasks.md');
      if (fs.existsSync(tasksPath)) {
        const tasksContent = fs.readFileSync(tasksPath, 'utf-8');

        // Count completed tasks: [x] or [X]
        const completedMatches = tasksContent.match(/\[x\]/gi);
        extended.completedTasks = completedMatches ? completedMatches.length : 0;

        // Count total tasks: [ ] or [x]
        const totalMatches = tasksContent.match(/\[ \]|\[x\]/gi);
        extended.totalTasks = totalMatches ? totalMatches.length : 0;

        // Calculate progress percentage
        if (extended.totalTasks > 0) {
          extended.progress = Math.round((extended.completedTasks / extended.totalTasks) * 100);
        }
      }
    } catch (error) {
      // Ignore errors reading tasks.md
    }

    // Calculate age in days
    const now = new Date();
    const createdDate = new Date(metadata.created);
    extended.ageInDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate days paused
    if (metadata.status === IncrementStatus.PAUSED && metadata.pausedAt) {
      const pausedDate = new Date(metadata.pausedAt);
      extended.daysPaused = Math.floor((now.getTime() - pausedDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    return extended;
  }

  /**
   * Validate metadata schema
   */
  static validate(metadata: IncrementMetadata): boolean {
    if (!metadata.id) {
      throw new Error('Metadata missing required field: id');
    }

    if (!metadata.status || !Object.values(IncrementStatus).includes(metadata.status)) {
      throw new Error(`Invalid status: ${metadata.status}`);
    }

    if (!metadata.type || !Object.values(IncrementType).includes(metadata.type)) {
      throw new Error(`Invalid type: ${metadata.type}`);
    }

    if (!metadata.created) {
      throw new Error('Metadata missing required field: created');
    }

    if (!metadata.lastActivity) {
      throw new Error('Metadata missing required field: lastActivity');
    }

    return true;
  }

  /**
   * Check if status transition is allowed
   */
  static canTransition(from: IncrementStatus, to: IncrementStatus): boolean {
    return isValidTransition(from, to);
  }

  /**
   * Get human-readable status transition error message
   */
  static getTransitionError(from: IncrementStatus, to: IncrementStatus): string {
    if (from === IncrementStatus.COMPLETED) {
      return `Cannot transition from completed state. Increment is already complete.`;
    }

    if (to === IncrementStatus.PAUSED && from === IncrementStatus.ABANDONED) {
      return `Cannot pause an abandoned increment. Resume it first with /resume.`;
    }

    if (to === IncrementStatus.COMPLETED && from === IncrementStatus.ABANDONED) {
      return `Cannot complete an abandoned increment. Resume it first with /resume.`;
    }

    return `Invalid transition: ${from} → ${to}`;
  }
}
