/**
 * Performance Optimizer for Status Sync
 *
 * Implements caching, batching, and optimization strategies to ensure
 * status sync operations complete within performance targets:
 * - Status sync: <2 seconds
 * - Conflict detection: <1 second
 * - Bulk sync (10 items): <5 seconds
 *
 * @module performance-optimizer
 */

/**
 * Cache entry for external status
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  operationType: 'status-sync' | 'conflict-detection' | 'bulk-sync';
  duration: number; // milliseconds
  itemCount: number;
  cacheHits: number;
  cacheMisses: number;
  timestamp: string;
}

/**
 * Performance Optimizer
 *
 * Provides caching and optimization for status sync operations.
 */
export class PerformanceOptimizer {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private metrics: PerformanceMetrics[] = [];

  /**
   * Get cached value if available and not expired
   *
   * @param key - Cache key
   * @returns Cached value or null if not found/expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Set cache value with TTL
   *
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttlMs - Time to live in milliseconds (default: 5 minutes)
   */
  set<T>(key: string, value: T, ttlMs: number = this.DEFAULT_TTL_MS): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs
    });
  }

  /**
   * Clear specific cache entry
   *
   * @param key - Cache key
   */
  clear(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Clear expired cache entries
   */
  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    keys: string[];
    hitRate: number;
  } {
    const totalRequests = this.metrics.reduce(
      (sum, m) => sum + m.cacheHits + m.cacheMisses,
      0
    );
    const totalHits = this.metrics.reduce((sum, m) => sum + m.cacheHits, 0);

    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0
    };
  }

  /**
   * Record performance metric
   *
   * @param metric - Performance metric
   */
  recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);

    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }
  }

  /**
   * Get performance metrics
   *
   * @param operationType - Filter by operation type
   * @returns Performance metrics
   */
  getMetrics(operationType?: PerformanceMetrics['operationType']): PerformanceMetrics[] {
    if (!operationType) {
      return [...this.metrics];
    }

    return this.metrics.filter(m => m.operationType === operationType);
  }

  /**
   * Get average duration for operation type
   *
   * @param operationType - Operation type
   * @returns Average duration in milliseconds
   */
  getAverageDuration(operationType: PerformanceMetrics['operationType']): number {
    const metrics = this.getMetrics(operationType);

    if (metrics.length === 0) {
      return 0;
    }

    const sum = metrics.reduce((total, m) => total + m.duration, 0);
    return sum / metrics.length;
  }

  /**
   * Check if performance targets are met
   *
   * Performance targets:
   * - status-sync: <2000ms
   * - conflict-detection: <1000ms
   * - bulk-sync (10 items): <5000ms
   *
   * @returns Performance target status
   */
  checkPerformanceTargets(): {
    statusSync: { target: number; actual: number; met: boolean };
    conflictDetection: { target: number; actual: number; met: boolean };
    bulkSync: { target: number; actual: number; met: boolean };
  } {
    const statusSyncAvg = this.getAverageDuration('status-sync');
    const conflictAvg = this.getAverageDuration('conflict-detection');
    const bulkSyncAvg = this.getAverageDuration('bulk-sync');

    return {
      statusSync: {
        target: 2000,
        actual: statusSyncAvg,
        met: statusSyncAvg < 2000 || statusSyncAvg === 0
      },
      conflictDetection: {
        target: 1000,
        actual: conflictAvg,
        met: conflictAvg < 1000 || conflictAvg === 0
      },
      bulkSync: {
        target: 5000,
        actual: bulkSyncAvg,
        met: bulkSyncAvg < 5000 || bulkSyncAvg === 0
      }
    };
  }

  /**
   * Generate cache key for external status
   *
   * @param tool - External tool
   * @param identifier - Issue/item identifier
   * @returns Cache key
   */
  static generateStatusCacheKey(tool: string, identifier: string): string {
    return `status:${tool}:${identifier}`;
  }

  /**
   * Generate cache key for workflow
   *
   * @param tool - External tool
   * @param project - Project identifier
   * @returns Cache key
   */
  static generateWorkflowCacheKey(tool: string, project: string): string {
    return `workflow:${tool}:${project}`;
  }

  /**
   * Batch process with delay
   *
   * Processes items in batches with configurable delay between batches
   * to avoid rate limiting and improve throughput.
   *
   * @param items - Items to process
   * @param processor - Async function to process each item
   * @param batchSize - Batch size (default: 5)
   * @param delayMs - Delay between batches in milliseconds (default: 1000)
   * @returns Array of results
   */
  static async batchProcess<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    batchSize: number = 5,
    delayMs: number = 1000
  ): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map(item => processor(item))
      );

      results.push(...batchResults);

      // Add delay between batches (except for last batch)
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return results;
  }

  /**
   * Measure execution time of an async function
   *
   * @param operation - Async operation to measure
   * @returns Tuple of [result, duration in ms]
   */
  static async measureTime<T>(operation: () => Promise<T>): Promise<[T, number]> {
    const startTime = Date.now();
    const result = await operation();
    const duration = Date.now() - startTime;

    return [result, duration];
  }
}
