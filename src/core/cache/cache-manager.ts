import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import path from 'path';
import { Logger, consoleLogger } from '../../utils/logger.js';

/**
 * Cached data wrapper with TTL metadata
 */
export interface CachedData<T> {
  data: T;
  timestamp: number; // Unix timestamp in milliseconds
  ttl: number; // TTL in milliseconds (default: 24 hours)
}

/**
 * Cache statistics for monitoring and debugging
 */
export interface CacheStats {
  totalFiles: number;
  totalSize: number; // in bytes
  oldestCache: string | null;
  oldestCacheAge: number | null; // in hours
  providers: {
    [provider: string]: {
      files: number;
      size: number;
    };
  };
}

/**
 * CacheManager - Manages file-based caching with TTL validation
 *
 * Features:
 * - 24-hour TTL by default (configurable)
 * - Atomic writes (temp file + rename)
 * - Corruption detection and auto-recovery
 * - Per-project cache separation
 * - Thread-safe operations
 *
 * Cache file format:
 * {
 *   "data": <T>,
 *   "timestamp": 1700000000000,
 *   "ttl": 86400000
 * }
 */
export class CacheManager {
  private cacheDir: string;
  private logger: Logger;
  private defaultTTL: number = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  constructor(
    projectRoot: string,
    options: {
      logger?: Logger;
      ttl?: number; // Custom TTL in milliseconds
    } = {}
  ) {
    this.cacheDir = path.join(projectRoot, '.specweave', 'cache');
    this.logger = options.logger ?? consoleLogger;
    if (options.ttl) {
      this.defaultTTL = options.ttl;
    }
  }

  /**
   * Get cached data if valid (within TTL)
   *
   * @param key Cache key (e.g., "jira-projects", "jira-BACKEND-deps")
   * @returns Cached data or null if cache miss/expired/corrupted
   */
  async get<T>(key: string): Promise<T | null> {
    const filePath = this.getCachePath(key);

    if (!existsSync(filePath)) {
      this.logger.log(`Cache miss: ${key}`);
      return null;
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const cached: CachedData<T> = JSON.parse(content);

      // Validate cache structure
      if (!this.isValidCacheStructure(cached)) {
        this.logger.error(`Invalid cache structure for ${key}, deleting...`);
        await this.delete(key);
        return null;
      }

      // Check TTL
      if (!this.isValid(cached)) {
        const age = Date.now() - cached.timestamp;
        const ageHours = (age / (1000 * 60 * 60)).toFixed(1);
        this.logger.log(`Cache expired: ${key} (age: ${ageHours}h, TTL: ${cached.ttl / (1000 * 60 * 60)}h)`);
        // Don't delete expired cache immediately - might be used as stale fallback
        return null;
      }

      const remaining = cached.timestamp + cached.ttl - Date.now();
      const remainingHours = (remaining / (1000 * 60 * 60)).toFixed(1);
      this.logger.log(`Cache hit: ${key} (TTL remaining: ${remainingHours}h)`);

      return cached.data;
    } catch (error: any) {
      // Corruption detected
      this.logger.error(`Cache corruption detected for ${key}: ${error.message}`);
      await this.logCacheError(key, error);
      await this.delete(key);
      return null;
    }
  }

  /**
   * Get cached data even if expired (stale cache fallback)
   *
   * Used for rate limit fallback: when API rate limit hit,
   * use stale cache instead of failing
   *
   * @param key Cache key
   * @returns Cached data or null if missing/corrupted (ignores TTL)
   */
  async getStale<T>(key: string): Promise<T | null> {
    const filePath = this.getCachePath(key);

    if (!existsSync(filePath)) {
      this.logger.log(`No stale cache available: ${key}`);
      return null;
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const cached: CachedData<T> = JSON.parse(content);

      // Validate structure only (ignore TTL)
      if (!this.isValidCacheStructure(cached)) {
        this.logger.error(`Invalid cache structure for ${key}, deleting...`);
        await this.delete(key);
        return null;
      }

      const age = Date.now() - cached.timestamp;
      const ageHours = (age / (1000 * 60 * 60)).toFixed(1);
      const ttlHours = cached.ttl / (1000 * 60 * 60);
      const expiredHoursAgo = (parseFloat(ageHours) - ttlHours).toFixed(1);
      this.logger.warn(
        `Using stale cache: ${key} (age: ${ageHours}h, expired ${expiredHoursAgo}h ago)`
      );

      return cached.data;
    } catch (error: any) {
      this.logger.error(`Failed to read stale cache for ${key}: ${error.message}`);
      return null;
    }
  }

  /**
   * Set cached data with current timestamp and TTL
   *
   * Uses atomic write pattern (temp file + rename) to prevent corruption
   *
   * @param key Cache key
   * @param data Data to cache
   * @param ttl Optional custom TTL (overrides default)
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    await this.ensureCacheDir();

    const filePath = this.getCachePath(key);
    const tempPath = `${filePath}.tmp`;

    const cached: CachedData<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL,
    };

    try {
      // Write to temp file first (atomic write pattern)
      await fs.writeFile(tempPath, JSON.stringify(cached, null, 2), 'utf-8');

      // Rename temp file to final name (atomic operation)
      await fs.rename(tempPath, filePath);

      this.logger.log(`Cache set: ${key} (TTL: ${cached.ttl / (1000 * 60 * 60)}h)`);
    } catch (error: any) {
      this.logger.error(`Failed to write cache for ${key}: ${error.message}`);

      // Cleanup temp file if exists
      if (existsSync(tempPath)) {
        await fs.unlink(tempPath).catch(() => {});
      }

      throw error;
    }
  }

  /**
   * Delete cached data
   *
   * @param key Cache key
   */
  async delete(key: string): Promise<void> {
    const filePath = this.getCachePath(key);

    if (existsSync(filePath)) {
      await fs.unlink(filePath);
      this.logger.log(`Cache deleted: ${key}`);
    }
  }

  /**
   * Clear all cached data
   */
  async clearAll(): Promise<void> {
    if (!existsSync(this.cacheDir)) {
      return;
    }

    const files = await fs.readdir(this.cacheDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    for (const file of jsonFiles) {
      const filePath = path.join(this.cacheDir, file);
      await fs.unlink(filePath);
    }

    this.logger.log(`Cleared ${jsonFiles.length} cache files`);
  }

  /**
   * Get cache statistics for monitoring
   */
  async getStats(): Promise<CacheStats> {
    const stats: CacheStats = {
      totalFiles: 0,
      totalSize: 0,
      oldestCache: null,
      oldestCacheAge: null,
      providers: {},
    };

    if (!existsSync(this.cacheDir)) {
      return stats;
    }

    const files = await fs.readdir(this.cacheDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    let oldestTimestamp = Date.now();
    let oldestFile: string | null = null;

    for (const file of jsonFiles) {
      const filePath = path.join(this.cacheDir, file);
      const fileStats = await fs.stat(filePath);

      stats.totalFiles++;
      stats.totalSize += fileStats.size;

      // Determine provider from filename (e.g., "jira-projects.json" → "jira")
      const provider = file.split('-')[0];
      if (!stats.providers[provider]) {
        stats.providers[provider] = { files: 0, size: 0 };
      }
      stats.providers[provider].files++;
      stats.providers[provider].size += fileStats.size;

      // Find oldest cache
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const cached: CachedData<any> = JSON.parse(content);

        if (cached.timestamp < oldestTimestamp) {
          oldestTimestamp = cached.timestamp;
          oldestFile = file;
        }
      } catch {
        // Ignore corrupted files
      }
    }

    if (oldestFile) {
      stats.oldestCache = oldestFile;
      stats.oldestCacheAge = (Date.now() - oldestTimestamp) / (1000 * 60 * 60); // hours
    }

    return stats;
  }

  /**
   * Delete caches older than specified age
   *
   * @param maxAgeMs Maximum age in milliseconds
   * @returns Count of deleted caches
   */
  async deleteOlderThan(maxAgeMs: number): Promise<number> {
    if (!existsSync(this.cacheDir)) {
      return 0;
    }

    const files = await fs.readdir(this.cacheDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    let deletedCount = 0;
    const cutoffTime = Date.now() - maxAgeMs;

    for (const file of jsonFiles) {
      const filePath = path.join(this.cacheDir, file);

      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const cached: CachedData<any> = JSON.parse(content);

        if (cached.timestamp < cutoffTime) {
          await fs.unlink(filePath);
          deletedCount++;
          this.logger.log(`Deleted old cache: ${file}`);
        }
      } catch {
        // Delete corrupted files too
        await fs.unlink(filePath);
        deletedCount++;
        this.logger.log(`Deleted corrupted cache: ${file}`);
      }
    }

    return deletedCount;
  }

  /**
   * Check if cached data is still valid (within TTL)
   */
  private isValid(cached: CachedData<any>): boolean {
    const now = Date.now();
    const age = now - cached.timestamp;
    return age < cached.ttl;
  }

  /**
   * Validate cache structure has required fields
   */
  private isValidCacheStructure(cached: any): cached is CachedData<any> {
    return (
      cached &&
      typeof cached === 'object' &&
      'data' in cached &&
      'timestamp' in cached &&
      'ttl' in cached &&
      typeof cached.timestamp === 'number' &&
      typeof cached.ttl === 'number'
    );
  }

  /**
   * Get full cache file path for a key
   */
  private getCachePath(key: string): string {
    return path.join(this.cacheDir, `${key}.json`);
  }

  /**
   * Ensure cache directory exists
   */
  private async ensureCacheDir(): Promise<void> {
    if (!existsSync(this.cacheDir)) {
      await fs.mkdir(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Log cache errors to dedicated error log
   */
  private async logCacheError(key: string, error: Error): Promise<void> {
    const logDir = path.join(path.dirname(this.cacheDir), 'logs');
    const logPath = path.join(logDir, 'cache-errors.log');

    try {
      await fs.mkdir(logDir, { recursive: true });
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] Cache error for ${key}: ${error.message}\n`;
      await fs.appendFile(logPath, logEntry, 'utf-8');
    } catch {
      // Ignore logging errors
    }
  }
}
