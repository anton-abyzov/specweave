/**
 * Status Cache
 *
 * Caches external tool statuses to reduce API calls.
 * Uses in-memory cache with TTL (default: 5 minutes).
 *
 * Performance Optimization:
 * - Reduces redundant API calls
 * - Improves sync speed
 * - Respects rate limits
 *
 * @module status-cache
 */

export interface CacheEntry<T> {
  value: T;
  timestamp: number; // Unix timestamp (ms)
  ttl: number; // Time to live (ms)
}

export interface CacheOptions {
  ttl?: number; // Default: 5 minutes (300000ms)
}

/**
 * Status Cache
 *
 * Generic cache for external tool statuses.
 */
export class StatusCache<T = any> {
  private cache: Map<string, CacheEntry<T>>;
  private defaultTtl: number;

  constructor(options?: CacheOptions) {
    this.cache = new Map();
    this.defaultTtl = options?.ttl || 5 * 60 * 1000; // 5 minutes default
  }

  /**
   * Get value from cache
   *
   * @param key - Cache key
   * @returns Cached value or undefined if not found/expired
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if expired
    const now = Date.now();
    const age = now - entry.timestamp;

    if (age > entry.ttl) {
      // Expired - remove and return undefined
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Set value in cache
   *
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Optional TTL override (ms)
   */
  set(key: string, value: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTtl
    };

    this.cache.set(key, entry);
  }

  /**
   * Check if key exists and is not expired
   *
   * @param key - Cache key
   * @returns True if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Delete key from cache
   *
   * @param key - Cache key
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   *
   * @returns Number of entries in cache
   */
  size(): number {
    // Clean up expired entries first
    this.cleanup();
    return this.cache.size;
  }

  /**
   * Clean up expired entries
   *
   * Removes all expired entries from cache.
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * Get cache statistics
   *
   * @returns Cache statistics (size, oldest entry age)
   */
  getStats(): { size: number; oldestEntryAge: number | null } {
    this.cleanup();

    if (this.cache.size === 0) {
      return { size: 0, oldestEntryAge: null };
    }

    const now = Date.now();
    let oldestTimestamp = now;

    for (const entry of this.cache.values()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
      }
    }

    return {
      size: this.cache.size,
      oldestEntryAge: now - oldestTimestamp
    };
  }
}

/**
 * Global status cache instance
 *
 * Used across all sync operations for maximum efficiency.
 */
export const globalStatusCache = new StatusCache();
