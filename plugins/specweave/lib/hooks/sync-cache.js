#!/usr/bin/env node
/**
 * Sync Performance Cache Module
 *
 * Provides caching layer for living docs sync to meet <500ms target.
 * Caches:
 * - Parsed tasks.md content
 * - File modification timestamps
 * - US-Task mappings
 *
 * Part of increment 0047-us-task-linkage (T-012).
 */

import { readFileSync, statSync, existsSync, promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { mkdirpSync } from '../utils/fs-native.js';

/**
 * In-memory cache with TTL
 */
class SyncCache {
  constructor() {
    this.cache = new Map();
    this.ttl = 60000; // 60 seconds default TTL
  }

  /**
   * Get cached value
   *
   * @param {string} key - Cache key
   * @returns {any|null} Cached value or null if expired/missing
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Set cached value
   *
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds (optional)
   */
  set(key, value, ttl = this.ttl) {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl
    });
  }

  /**
   * Invalidate cache entry
   *
   * @param {string} key - Cache key
   */
  invalidate(key) {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache size
   *
   * @returns {number} Number of cached entries
   */
  size() {
    return this.cache.size;
  }
}

// Global cache instance
const globalCache = new SyncCache();

/**
 * Get file hash for change detection
 *
 * @param {string} filePath - Path to file
 * @returns {string} SHA256 hash of file content
 */
export function getFileHash(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch (error) {
    return null;
  }
}

/**
 * Get cached parsed tasks.md
 *
 * @param {string} tasksPath - Path to tasks.md
 * @param {Function} parser - Parser function to call if cache miss
 * @returns {any} Parsed tasks (from cache or fresh)
 */
export function getCachedTasks(tasksPath, parser) {
  // Generate cache key from file path + hash
  const fileHash = getFileHash(tasksPath);

  if (!fileHash) {
    // File doesn't exist, call parser directly
    return parser(tasksPath);
  }

  const cacheKey = `tasks:${tasksPath}:${fileHash}`;

  // Try to get from cache
  const cached = globalCache.get(cacheKey);

  if (cached) {
    // Cache hit
    return cached;
  }

  // Cache miss - parse and cache
  const parsed = parser(tasksPath);
  globalCache.set(cacheKey, parsed);

  return parsed;
}

/**
 * Get cached US file metadata
 *
 * @param {string} usFilePath - Path to US file
 * @returns {object|null} Metadata object or null if file doesn't exist
 */
export function getCachedUSMetadata(usFilePath) {
  try {
    const stats = statSync(usFilePath);
    const cacheKey = `us-metadata:${usFilePath}`;

    const cached = globalCache.get(cacheKey);

    if (cached && cached.mtime === stats.mtimeMs) {
      // File hasn't changed, return cached metadata
      return cached.metadata;
    }

    // File changed or not in cache - read and cache
    const content = readFileSync(usFilePath, 'utf-8');
    const metadata = {
      mtime: stats.mtimeMs,
      metadata: {
        path: usFilePath,
        size: content.length,
        tasksSectionExists: content.includes('## Tasks'),
        acCount: (content.match(/- \[[x ]\] \*\*AC-US\d+-\d{2}\*\*/g) || []).length
      }
    };

    globalCache.set(cacheKey, metadata);

    return metadata.metadata;
  } catch (error) {
    return null;
  }
}

/**
 * Batch file operations to reduce I/O
 *
 * @param {Array<{path: string, content: string}>} updates - Files to update
 * @returns {Promise<void>}
 */
export async function batchFileUpdates(updates) {
  // Group updates by directory to optimize disk I/O
  const updatesByDir = new Map();

  updates.forEach(({ path: filePath, content }) => {
    const dir = path.dirname(filePath);

    if (!updatesByDir.has(dir)) {
      updatesByDir.set(dir, []);
    }

    updatesByDir.get(dir).push({ path: filePath, content });
  });

  // Write files sequentially within same directory (better disk I/O)
  for (const [dir, fileUpdates] of updatesByDir.entries()) {
    // Ensure directory exists once per directory
    await fs.mkdir(dir, { recursive: true });

    // Write all files in this directory
    await Promise.all(
      fileUpdates.map(({ path: filePath, content }) =>
        fs.writeFile(filePath, content, 'utf-8')
      )
    );
  }
}

/**
 * Check if sync is needed for a US file
 *
 * @param {string} usFilePath - Path to US file
 * @param {Array} tasks - Tasks for this US
 * @param {string} tasksPath - Path to tasks.md
 * @returns {boolean} True if sync is needed
 */
export function needsSync(usFilePath, tasks, tasksPath) {
  try {
    // Check if US file exists
    if (!existsSync(usFilePath)) {
      return false; // File doesn't exist, can't sync
    }

    // Get file modification times
    const usStats = statSync(usFilePath);
    const tasksStats = statSync(tasksPath);

    // If tasks.md is newer than US file, sync is needed
    if (tasksStats.mtimeMs > usStats.mtimeMs) {
      return true;
    }

    // Check cache for last sync result
    const cacheKey = `sync-result:${usFilePath}`;
    const cached = globalCache.get(cacheKey);

    if (cached) {
      // Compare task list with cached
      const currentTaskIds = tasks.map(t => t.id).sort().join(',');
      const cachedTaskIds = cached.taskIds;

      if (currentTaskIds === cachedTaskIds) {
        // Task list unchanged, no sync needed
        return false;
      }
    }

    // Default: sync is needed
    return true;
  } catch (error) {
    // If error checking, assume sync is needed
    return true;
  }
}

/**
 * Record sync result for incremental sync
 *
 * @param {string} usFilePath - Path to US file
 * @param {Array} tasks - Tasks that were synced
 */
export function recordSync(usFilePath, tasks) {
  const cacheKey = `sync-result:${usFilePath}`;
  const taskIds = tasks.map(t => t.id).sort().join(',');

  globalCache.set(cacheKey, {
    taskIds,
    timestamp: Date.now()
  });
}

/**
 * Get cache statistics
 *
 * @returns {object} Cache stats
 */
export function getCacheStats() {
  return {
    size: globalCache.size(),
    entries: Array.from(globalCache.cache.keys())
  };
}

/**
 * Clear cache (for testing)
 */
export function clearCache() {
  globalCache.clear();
}

export default globalCache;
