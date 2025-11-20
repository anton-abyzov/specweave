/**
 * ID Registry - Atomic Feature ID registration with collision detection
 *
 * Provides thread-safe ID registration using file-based locking to prevent
 * race conditions during concurrent imports.
 *
 * Features:
 * - File-based locking for atomic updates
 * - Collision detection (checks both FS-XXX and FS-XXXE)
 * - JSON-based persistent storage
 * - Automatic lock cleanup with timeout
 */

import fs from 'fs-extra';
import path from 'path';

/**
 * Registry entry metadata
 */
export interface RegistryEntry {
  /** Feature ID (e.g., "FS-042E") */
  id: string;

  /** Registration timestamp (ISO 8601) */
  registeredAt: string;

  /** External ID if external origin */
  externalId?: string;

  /** External URL */
  externalUrl?: string;

  /** Origin type */
  origin: 'internal' | 'external';
}

/**
 * Registry data structure
 */
export interface RegistryData {
  /** Map of FS-ID to metadata */
  entries: Record<string, RegistryEntry>;

  /** Last updated timestamp */
  lastUpdated: string;

  /** Registry version */
  version: number;
}

/**
 * ID Registry with atomic file-based locking
 */
export class IDRegistry {
  private registryPath: string;
  private lockPath: string;
  private lockTimeout: number = 30000; // 30 seconds
  private retryDelay: number = 100; // 100ms

  constructor(projectRoot: string) {
    this.registryPath = path.join(projectRoot, '.specweave/.id-registry.json');
    this.lockPath = path.join(projectRoot, '.specweave/.id-registry.lock');
  }

  /**
   * Register a new Feature ID atomically
   *
   * @param fsId - Feature ID to register (e.g., "FS-042E")
   * @param entry - Registry entry metadata
   * @throws Error if collision detected or lock acquisition fails
   */
  async registerID(fsId: string, entry: Omit<RegistryEntry, 'id'>): Promise<void> {
    // Acquire lock with timeout
    await this.acquireLock();

    try {
      // Read current registry
      const registry = await this.readRegistry();

      // Check for collision (exact match or variant)
      const collision = this.detectCollision(fsId, registry);
      if (collision) {
        throw new Error(`ID collision: ${fsId} conflicts with ${collision}`);
      }

      // Add new entry
      registry.entries[fsId] = {
        id: fsId,
        ...entry
      };
      registry.lastUpdated = new Date().toISOString();
      registry.version++;

      // Write atomically
      await this.writeRegistry(registry);
    } finally {
      // Always release lock
      await this.releaseLock();
    }
  }

  /**
   * Check if ID exists in registry
   *
   * @param fsId - Feature ID to check
   * @returns True if ID is registered
   */
  async hasID(fsId: string): Promise<boolean> {
    const registry = await this.readRegistry();
    return fsId in registry.entries;
  }

  /**
   * Get registry entry
   *
   * @param fsId - Feature ID to retrieve
   * @returns Registry entry or null if not found
   */
  async getEntry(fsId: string): Promise<RegistryEntry | null> {
    const registry = await this.readRegistry();
    return registry.entries[fsId] || null;
  }

  /**
   * Get all registered IDs
   *
   * @returns Array of all registered Feature IDs
   */
  async getAllIDs(): Promise<string[]> {
    const registry = await this.readRegistry();
    return Object.keys(registry.entries);
  }

  /**
   * Acquire lock file with timeout and retry
   *
   * @throws Error if lock cannot be acquired within timeout
   */
  private async acquireLock(): Promise<void> {
    const startTime = Date.now();

    // Ensure lock directory exists
    await fs.ensureDir(path.dirname(this.lockPath));

    while (true) {
      try {
        // Try to create lock file exclusively
        await fs.writeFile(this.lockPath, Date.now().toString(), { flag: 'wx' });
        return; // Lock acquired
      } catch (error: any) {
        if (error.code !== 'EEXIST') {
          throw error; // Unexpected error
        }

        // Lock exists, check timeout
        const elapsed = Date.now() - startTime;
        if (elapsed > this.lockTimeout) {
          // Check if lock is stale
          const lockAge = await this.getLockAge();
          if (lockAge > this.lockTimeout) {
            // Stale lock, force remove
            await fs.remove(this.lockPath);
            continue; // Retry
          }

          throw new Error(`Lock acquisition timeout after ${elapsed}ms`);
        }

        // Wait and retry
        await this.sleep(this.retryDelay);
      }
    }
  }

  /**
   * Release lock file
   */
  private async releaseLock(): Promise<void> {
    try {
      await fs.remove(this.lockPath);
    } catch (error: any) {
      // Ignore if lock doesn't exist (already released)
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Get lock file age in milliseconds
   *
   * @returns Lock age or Infinity if lock doesn't exist
   */
  private async getLockAge(): Promise<number> {
    try {
      const lockContent = await fs.readFile(this.lockPath, 'utf-8');
      const lockTime = parseInt(lockContent, 10);
      return Date.now() - lockTime;
    } catch (error) {
      return Infinity; // Lock doesn't exist
    }
  }

  /**
   * Read registry from disk
   *
   * @returns Registry data
   */
  private async readRegistry(): Promise<RegistryData> {
    try {
      const content = await fs.readFile(this.registryPath, 'utf-8');
      return JSON.parse(content);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // Registry doesn't exist, return empty
        return {
          entries: {},
          lastUpdated: new Date().toISOString(),
          version: 1
        };
      }
      throw error;
    }
  }

  /**
   * Write registry to disk atomically
   *
   * @param registry - Registry data to write
   */
  private async writeRegistry(registry: RegistryData): Promise<void> {
    await fs.ensureDir(path.dirname(this.registryPath));

    // Write to temp file first
    const tempPath = `${this.registryPath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(registry, null, 2));

    // Atomic rename
    await fs.rename(tempPath, this.registryPath);
  }

  /**
   * Detect ID collision (exact match or variant)
   *
   * @param fsId - ID to check (e.g., "FS-042E")
   * @param registry - Current registry
   * @returns Conflicting ID or null if no collision
   *
   * @example
   * // Given registry: {FS-042: {...}}
   * detectCollision('FS-042E', registry) // Returns: 'FS-042'
   * detectCollision('FS-043', registry)  // Returns: null
   */
  private detectCollision(fsId: string, registry: RegistryData): string | null {
    // Exact match
    if (fsId in registry.entries) {
      return fsId;
    }

    // Extract numeric part
    const match = fsId.match(/^FS-(\d{3,})E?$/);
    if (!match) {
      throw new Error(`Invalid FS-ID format: ${fsId}`);
    }

    const number = parseInt(match[1], 10);
    const internalId = `FS-${String(number).padStart(3, '0')}`;
    const externalId = `FS-${String(number).padStart(3, '0')}E`;

    // Check variant
    if (internalId !== fsId && internalId in registry.entries) {
      return internalId;
    }

    if (externalId !== fsId && externalId in registry.entries) {
      return externalId;
    }

    return null; // No collision
  }

  /**
   * Sleep for specified milliseconds
   *
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
