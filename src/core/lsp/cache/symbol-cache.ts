/**
 * SymbolCache - Disk-based symbol location cache with mtime invalidation
 *
 * Caches LSP symbol lookup results to disk, invalidated when source
 * files are modified (based on mtime comparison).
 *
 * @see spec.md US-006: Symbol Caching
 * @satisfies AC-US6-01, AC-US6-02, AC-US6-03
 */

import * as crypto from 'crypto';

/**
 * Symbol location information
 */
export interface SymbolLocation {
  /** File URI (file://...) */
  uri: string;
  /** Line number (0-indexed) */
  line: number;
  /** Column number (0-indexed) */
  column: number;
}

/**
 * Filesystem abstraction for testing
 */
export interface FileSystemAdapter {
  exists(path: string): Promise<boolean>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  getMtime(path: string): Promise<number>;
  mkdir(path: string): Promise<void>;
  unlink(path: string): Promise<void>;
}

/**
 * Cache entry stored on disk
 */
interface CacheEntry {
  /** Source file mtime when cached */
  mtime: number;
  /** Cached symbol locations */
  locations: SymbolLocation[];
}

/**
 * Disk-based symbol cache with mtime invalidation
 */
export class SymbolCache {
  private readonly cacheDir: string;
  private readonly fs: FileSystemAdapter;
  /** Track cache file paths for clear() */
  private readonly cachedPaths: Set<string> = new Set();

  constructor(cacheDir: string, fs: FileSystemAdapter) {
    this.cacheDir = cacheDir;
    this.fs = fs;
  }

  /**
   * Cache symbol locations for a file/symbol combination
   *
   * @param filePath - Source file path
   * @param symbol - Symbol name
   * @param locations - Symbol locations to cache
   */
  async set(filePath: string, symbol: string, locations: SymbolLocation[]): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(filePath, symbol);
      const cachePath = this.getCachePath(cacheKey);

      // Get current mtime of source file
      let mtime: number;
      try {
        mtime = await this.fs.getMtime(filePath);
      } catch {
        // If source file doesn't exist, use current time
        mtime = Date.now();
      }

      const entry: CacheEntry = {
        mtime,
        locations,
      };

      // Ensure cache directory exists
      try {
        await this.fs.mkdir(this.cacheDir);
      } catch {
        // Directory may already exist
      }

      await this.fs.writeFile(cachePath, JSON.stringify(entry));
      this.cachedPaths.add(cachePath);
    } catch {
      // Silently fail on cache write errors - cache is optional
    }
  }

  /**
   * Get cached symbol locations if still valid
   *
   * @param filePath - Source file path
   * @param symbol - Symbol name
   * @returns Cached locations or null if not found/invalid
   */
  async get(filePath: string, symbol: string): Promise<SymbolLocation[] | null> {
    try {
      const cacheKey = this.getCacheKey(filePath, symbol);
      const cachePath = this.getCachePath(cacheKey);

      // Check if cache file exists
      const cacheExists = await this.fs.exists(cachePath);
      if (!cacheExists) {
        return null;
      }

      // Read cache entry
      const content = await this.fs.readFile(cachePath);
      const entry: CacheEntry = JSON.parse(content);

      // Validate mtime - cache is invalid if source file changed
      try {
        const currentMtime = await this.fs.getMtime(filePath);
        if (currentMtime !== entry.mtime) {
          // Source file modified, cache invalid
          return null;
        }
      } catch {
        // Source file doesn't exist anymore, cache invalid
        return null;
      }

      return entry.locations;
    } catch {
      // Any error reading cache - return null (cache miss)
      return null;
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    const pathsToDelete = Array.from(this.cachedPaths);
    this.cachedPaths.clear();

    for (const cachePath of pathsToDelete) {
      try {
        await this.fs.unlink(cachePath);
      } catch {
        // Silently fail on delete errors - file may already be gone
      }
    }
  }

  /**
   * Generate unique cache key from file path and symbol
   */
  private getCacheKey(filePath: string, symbol: string): string {
    const input = `${filePath}:${symbol}`;
    return crypto.createHash('sha256').update(input).digest('hex').slice(0, 16);
  }

  /**
   * Get cache file path for a cache key
   */
  private getCachePath(cacheKey: string): string {
    // Use forward slash for path joining (cross-platform via Node's normalization)
    return `${this.cacheDir}/${cacheKey}.json`;
  }
}
