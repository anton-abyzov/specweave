/**
 * SymbolCache - On-disk cache for LSP symbol locations
 *
 * Uses mtime-based invalidation to ensure cache freshness.
 *
 * @see spec.md US-006: Symbol Caching
 * @satisfies AC-US6-01, AC-US6-02, AC-US6-03
 */

import { createHash } from 'crypto';

/**
 * Symbol location from LSP
 */
export interface SymbolLocation {
  uri: string;
  line: number;
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
  /** Source file mtime when cache was created */
  sourceMtime: number;
  /** Cached symbol locations */
  locations: SymbolLocation[];
  /** Timestamp when cache was created */
  createdAt: number;
}

/**
 * On-disk symbol cache with mtime-based invalidation
 */
export class SymbolCache {
  private readonly cacheDir: string;
  private readonly fs: FileSystemAdapter;
  /** In-memory index of cache keys to file paths */
  private cacheIndex: Map<string, string> = new Map();

  constructor(cacheDir: string, fs: FileSystemAdapter) {
    this.cacheDir = cacheDir;
    this.fs = fs;
  }

  /**
   * Store symbols in cache
   *
   * @param sourceFile - Path to the source file
   * @param symbolName - Name of the symbol
   * @param locations - Symbol locations to cache
   */
  async set(
    sourceFile: string,
    symbolName: string,
    locations: SymbolLocation[]
  ): Promise<void> {
    const key = this.getCacheKey(sourceFile, symbolName);
    const cachePath = this.getCachePath(key);

    // Get source file mtime for invalidation check
    const sourceMtime = await this.fs.getMtime(sourceFile);

    const entry: CacheEntry = {
      sourceMtime,
      locations,
      createdAt: Date.now(),
    };

    await this.fs.mkdir(this.cacheDir);
    await this.fs.writeFile(cachePath, JSON.stringify(entry));
    this.cacheIndex.set(key, cachePath);
  }

  /**
   * Get cached symbols
   *
   * @param sourceFile - Path to the source file
   * @param symbolName - Name of the symbol
   * @returns Cached locations or null if not cached/invalidated
   */
  async get(
    sourceFile: string,
    symbolName: string
  ): Promise<SymbolLocation[] | null> {
    const key = this.getCacheKey(sourceFile, symbolName);
    const cachePath = this.cacheIndex.get(key) ?? this.getCachePath(key);

    try {
      // Check if cache file exists
      const exists = await this.fs.exists(cachePath);
      if (!exists) {
        return null;
      }

      // Read cache entry
      const content = await this.fs.readFile(cachePath);
      const entry: CacheEntry = JSON.parse(content);

      // Check mtime invalidation
      const currentMtime = await this.fs.getMtime(sourceFile);
      if (currentMtime !== entry.sourceMtime) {
        // Source file has changed, invalidate cache
        await this.fs.unlink(cachePath);
        this.cacheIndex.delete(key);
        return null;
      }

      return entry.locations;
    } catch {
      return null;
    }
  }

  /**
   * Clear all cached entries
   */
  async clear(): Promise<void> {
    for (const [key, path] of this.cacheIndex) {
      try {
        await this.fs.unlink(path);
      } catch {
        // Ignore errors during cleanup
      }
    }
    this.cacheIndex.clear();
  }

  private getCacheKey(sourceFile: string, symbolName: string): string {
    return `${sourceFile}:${symbolName}`;
  }

  private getCachePath(key: string): string {
    const hash = createHash('sha256').update(key).digest('hex').slice(0, 16);
    return `${this.cacheDir}/${hash}.json`;
  }
}
