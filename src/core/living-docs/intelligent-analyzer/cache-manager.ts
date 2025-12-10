/**
 * Cache Manager
 *
 * Manages caching of analysis results with Git-based invalidation and TTL.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { Logger, consoleLogger } from '../../../utils/logger.js';

export interface CacheOptions {
  ttlHours?: number;      // Time-to-live in hours (default: 24)
  projectRoot: string;
  logger?: Logger;
}

export interface CacheMetadata {
  key: string;
  timestamp: string;
  commit: string;
  expiresAt: string;
  size: number;
}

/**
 * Cache manager with Git-based invalidation and TTL.
 */
export class CacheManager {
  private cacheDir: string;
  private ttlHours: number;
  private projectRoot: string;
  private logger: Logger;

  constructor(options: CacheOptions) {
    this.projectRoot = options.projectRoot;
    this.cacheDir = path.join(this.projectRoot, '.specweave/cache/analysis');
    this.ttlHours = options.ttlHours ?? 24;
    this.logger = options.logger ?? consoleLogger;

    // Ensure cache directory exists
    fs.mkdirSync(this.cacheDir, { recursive: true });
  }

  /**
   * Load data from cache.
   * Returns null if cache miss, expired, or invalid.
   */
  async load<T>(key: string): Promise<T | null> {
    const cachePath = this.getCachePath(key);
    const metadataPath = this.getMetadataPath(key);

    // Check if cache file exists
    if (!fs.existsSync(cachePath) || !fs.existsSync(metadataPath)) {
      return null;
    }

    try {
      // Load metadata
      const metadata: CacheMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

      // Check TTL
      const now = new Date();
      const expiresAt = new Date(metadata.expiresAt);
      if (now > expiresAt) {
        this.logger.debug(`Cache expired: ${key}`);
        this.invalidate(key);
        return null;
      }

      // Check Git commit (if available)
      const currentCommit = this.getCurrentCommit();
      if (currentCommit && metadata.commit !== currentCommit) {
        this.logger.debug(`Cache invalid (commit changed): ${key}`);
        this.invalidate(key);
        return null;
      }

      // Load cached data
      const content = fs.readFileSync(cachePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch (error) {
      this.logger.warn(`Failed to load cache ${key}: ${error}`);
      this.invalidate(key);
      return null;
    }
  }

  /**
   * Save data to cache with metadata.
   */
  async save(key: string, data: any): Promise<void> {
    const cachePath = this.getCachePath(key);
    const metadataPath = this.getMetadataPath(key);

    try {
      // Serialize data
      const content = JSON.stringify(data, null, 2);

      // Create metadata
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.ttlHours * 60 * 60 * 1000);
      const metadata: CacheMetadata = {
        key,
        timestamp: now.toISOString(),
        commit: this.getCurrentCommit() || 'unknown',
        expiresAt: expiresAt.toISOString(),
        size: content.length,
      };

      // Write atomically (temp + rename)
      const tempPath = `${cachePath}.tmp`;
      const tempMetadataPath = `${metadataPath}.tmp`;

      fs.writeFileSync(tempPath, content);
      fs.writeFileSync(tempMetadataPath, JSON.stringify(metadata, null, 2));

      fs.renameSync(tempPath, cachePath);
      fs.renameSync(tempMetadataPath, metadataPath);

      this.logger.debug(`Cache saved: ${key} (${this.formatBytes(metadata.size)})`);
    } catch (error) {
      this.logger.warn(`Failed to save cache ${key}: ${error}`);
    }
  }

  /**
   * Invalidate (delete) cache entry.
   */
  invalidate(key: string): void {
    const cachePath = this.getCachePath(key);
    const metadataPath = this.getMetadataPath(key);

    try {
      if (fs.existsSync(cachePath)) {
        fs.unlinkSync(cachePath);
      }
      if (fs.existsSync(metadataPath)) {
        fs.unlinkSync(metadataPath);
      }
      this.logger.debug(`Cache invalidated: ${key}`);
    } catch (error) {
      this.logger.warn(`Failed to invalidate cache ${key}: ${error}`);
    }
  }

  /**
   * Clear all cache entries.
   */
  clearAll(): void {
    try {
      const files = fs.readdirSync(this.cacheDir);
      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        fs.unlinkSync(filePath);
      }
      this.logger.info('Cache cleared');
    } catch (error) {
      this.logger.warn(`Failed to clear cache: ${error}`);
    }
  }

  /**
   * Get cache statistics.
   */
  getStats(): { totalEntries: number; totalSize: number; oldestEntry: string | null } {
    const files = fs.readdirSync(this.cacheDir).filter(f => f.endsWith('.json') && !f.endsWith('.meta.json'));

    let totalSize = 0;
    let oldestEntry: string | null = null;
    let oldestTime = Infinity;

    for (const file of files) {
      const filePath = path.join(this.cacheDir, file);
      const stats = fs.statSync(filePath);
      totalSize += stats.size;

      if (stats.mtimeMs < oldestTime) {
        oldestTime = stats.mtimeMs;
        oldestEntry = file;
      }
    }

    return {
      totalEntries: files.length,
      totalSize,
      oldestEntry,
    };
  }

  /**
   * Get current Git commit hash.
   */
  private getCurrentCommit(): string | null {
    try {
      return execSync('git rev-parse HEAD', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
      }).trim();
    } catch {
      return null;
    }
  }

  /**
   * Get cache file path.
   */
  private getCachePath(key: string): string {
    return path.join(this.cacheDir, `${key}.json`);
  }

  /**
   * Get metadata file path.
   */
  private getMetadataPath(key: string): string {
    return path.join(this.cacheDir, `${key}.meta.json`);
  }

  /**
   * Format bytes to human-readable string.
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }
}
