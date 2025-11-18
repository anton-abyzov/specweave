import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit Tests: Performance Optimizer
 *
 * Tests caching, batching, and performance measurement utilities.
 */

import { PerformanceOptimizer, PerformanceMetrics } from '../../../src/core/sync/performance-optimizer.js';

describe('PerformanceOptimizer', () => {
  let optimizer: PerformanceOptimizer;

  beforeEach(() => {
    optimizer = new PerformanceOptimizer();
  });

  describe('Caching', () => {
    it('should cache and retrieve values', () => {
      optimizer.set('test-key', { data: 'test-value' });

      const result = optimizer.get('test-key');
      expect(result).toEqual({ data: 'test-value' });
    });

    it('should return null for non-existent keys', () => {
      const result = optimizer.get('non-existent');
      expect(result).toBeNull();
    });

    it('should expire cached values after TTL', async () => {
      optimizer.set('short-lived', 'value', 100); // 100ms TTL

      // Should exist immediately
      expect(optimizer.get('short-lived')).toBe('value');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be null after expiration
      expect(optimizer.get('short-lived')).toBeNull();
    });

    it('should clear specific cache entry', () => {
      optimizer.set('key1', 'value1');
      optimizer.set('key2', 'value2');

      optimizer.clear('key1');

      expect(optimizer.get('key1')).toBeNull();
      expect(optimizer.get('key2')).toBe('value2');
    });

    it('should clear all cache entries', () => {
      optimizer.set('key1', 'value1');
      optimizer.set('key2', 'value2');

      optimizer.clearAll();

      expect(optimizer.get('key1')).toBeNull();
      expect(optimizer.get('key2')).toBeNull();
    });

    it('should clear only expired entries', async () => {
      optimizer.set('short', 'value1', 50);
      optimizer.set('long', 'value2', 1000);

      await new Promise(resolve => setTimeout(resolve, 100));

      optimizer.clearExpired();

      expect(optimizer.get('short')).toBeNull();
      expect(optimizer.get('long')).toBe('value2');
    });

    it('should return cache statistics', () => {
      optimizer.set('key1', 'value1');
      optimizer.set('key2', 'value2');

      const stats = optimizer.getCacheStats();

      expect(stats.size).toBe(2);
      expect(stats.keys).toContain('key1');
      expect(stats.keys).toContain('key2');
    });
  });

  describe('Performance Metrics', () => {
    it('should record performance metrics', () => {
      const metric: PerformanceMetrics = {
        operationType: 'status-sync',
        duration: 1500,
        itemCount: 1,
        cacheHits: 0,
        cacheMisses: 1,
        timestamp: new Date().toISOString()
      };

      optimizer.recordMetric(metric);

      const metrics = optimizer.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toEqual(metric);
    });

    it('should filter metrics by operation type', () => {
      optimizer.recordMetric({
        operationType: 'status-sync',
        duration: 1000,
        itemCount: 1,
        cacheHits: 0,
        cacheMisses: 1,
        timestamp: new Date().toISOString()
      });

      optimizer.recordMetric({
        operationType: 'bulk-sync',
        duration: 4000,
        itemCount: 10,
        cacheHits: 5,
        cacheMisses: 5,
        timestamp: new Date().toISOString()
      });

      const statusSyncMetrics = optimizer.getMetrics('status-sync');
      expect(statusSyncMetrics).toHaveLength(1);
      expect(statusSyncMetrics[0].operationType).toBe('status-sync');
    });

    it('should calculate average duration', () => {
      optimizer.recordMetric({
        operationType: 'status-sync',
        duration: 1000,
        itemCount: 1,
        cacheHits: 0,
        cacheMisses: 1,
        timestamp: new Date().toISOString()
      });

      optimizer.recordMetric({
        operationType: 'status-sync',
        duration: 2000,
        itemCount: 1,
        cacheHits: 0,
        cacheMisses: 1,
        timestamp: new Date().toISOString()
      });

      const avg = optimizer.getAverageDuration('status-sync');
      expect(avg).toBe(1500);
    });

    it('should check performance targets', () => {
      // Add metrics that meet targets
      optimizer.recordMetric({
        operationType: 'status-sync',
        duration: 1500, // <2000ms target
        itemCount: 1,
        cacheHits: 1,
        cacheMisses: 0,
        timestamp: new Date().toISOString()
      });

      optimizer.recordMetric({
        operationType: 'conflict-detection',
        duration: 500, // <1000ms target
        itemCount: 1,
        cacheHits: 1,
        cacheMisses: 0,
        timestamp: new Date().toISOString()
      });

      const targets = optimizer.checkPerformanceTargets();

      expect(targets.statusSync.met).toBe(true);
      expect(targets.conflictDetection.met).toBe(true);
    });

    it('should detect when performance targets are not met', () => {
      // Add metrics that miss targets
      optimizer.recordMetric({
        operationType: 'status-sync',
        duration: 3000, // >2000ms target (miss!)
        itemCount: 1,
        cacheHits: 0,
        cacheMisses: 1,
        timestamp: new Date().toISOString()
      });

      const targets = optimizer.checkPerformanceTargets();

      expect(targets.statusSync.met).toBe(false);
      expect(targets.statusSync.actual).toBe(3000);
    });
  });

  describe('Static Utilities', () => {
    it('should generate status cache key', () => {
      const key = PerformanceOptimizer.generateStatusCacheKey('github', '123');
      expect(key).toBe('status:github:123');
    });

    it('should generate workflow cache key', () => {
      const key = PerformanceOptimizer.generateWorkflowCacheKey('jira', 'PROJECT');
      expect(key).toBe('workflow:jira:PROJECT');
    });

    it('should batch process items with delay', async () => {
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const processed: number[] = [];

      const results = await PerformanceOptimizer.batchProcess(
        items,
        async (item) => {
          processed.push(item);
          return item * 2;
        },
        3, // batch size
        50 // delay
      );

      expect(results).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
      expect(processed).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });

    it('should measure execution time', async () => {
      const [result, duration] = await PerformanceOptimizer.measureTime(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'done';
      });

      expect(result).toBe('done');
      expect(duration).toBeGreaterThanOrEqual(100);
      expect(duration).toBeLessThan(200); // Allow some margin
    });
  });

  describe('Cache Hit Rate', () => {
    it('should calculate cache hit rate', () => {
      // Simulate cache hits and misses
      optimizer.recordMetric({
        operationType: 'status-sync',
        duration: 100,
        itemCount: 1,
        cacheHits: 1,
        cacheMisses: 0,
        timestamp: new Date().toISOString()
      });

      optimizer.recordMetric({
        operationType: 'status-sync',
        duration: 200,
        itemCount: 1,
        cacheHits: 0,
        cacheMisses: 1,
        timestamp: new Date().toISOString()
      });

      const stats = optimizer.getCacheStats();
      expect(stats.hitRate).toBe(0.5); // 50% hit rate
    });
  });
});
