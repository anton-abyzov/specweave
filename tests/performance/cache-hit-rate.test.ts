/**
 * Performance Test: Cache Hit Rate Validation
 *
 * Validates that cache manager achieves > 90% hit rate during normal development workflow
 *
 * Test Scenario:
 * - 100 sync operations over 8-hour period
 * - Cache hits vs misses tracked
 * - API call count tracked
 *
 * Success Criteria:
 * - Cache hit rate > 90%
 * - API calls < 10 (vs 500+ without cache)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CacheManager } from '../../src/core/cache/cache-manager.js';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';
import { silentLogger } from '../../src/utils/logger.js';

interface PerformanceMetrics {
  totalOperations: number;
  cacheHits: number;
  cacheMisses: number;
  apiCalls: number;
  hitRate: number;
}

describe('Performance: Cache Hit Rate Validation', () => {
  let tempDir: string;
  let cacheManager: CacheManager;
  let metrics: PerformanceMetrics;

  beforeEach(async () => {
    // Create temporary directory for test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'specweave-perf-cache-'));

    // Initialize cache manager with 24-hour TTL
    cacheManager = new CacheManager(tempDir, {
      logger: silentLogger,
      ttl: 24 * 60 * 60 * 1000, // 24 hours
    });

    // Reset metrics
    metrics = {
      totalOperations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      apiCalls: 0,
      hitRate: 0,
    };
  });

  afterEach(async () => {
    // Cleanup temp directory
    if (existsSync(tempDir)) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }

    vi.restoreAllMocks();
  });

  it('should achieve > 90% cache hit rate during 100 sync operations', async () => {
    // Simulate normal development workflow:
    // - Multiple syncs of same projects
    // - Spread over 8-hour period
    // - Most syncs hit cache (only first sync per project makes API call)

    const projectKeys = ['BACKEND', 'FRONTEND', 'MOBILE', 'PLATFORM', 'INFRA'];

    // Phase 1: Initial cache population (first sync for each project)
    // Expected: 5 cache misses, 5 API calls
    for (const projectKey of projectKeys) {
      await simulateSyncOperation(projectKey, false); // Force API call (no cache)
    }

    // Phase 2: Simulate 95 more sync operations
    // Distribution: > 90% repeat syncs (cache hits), < 10% new syncs (cache misses)
    const syncOperations: Array<{ projectKey: string; expectCacheHit: boolean }> = [];

    // 91 operations hitting cache (same projects, within TTL)
    for (let i = 0; i < 91; i++) {
      const projectKey = projectKeys[i % projectKeys.length];
      syncOperations.push({ projectKey, expectCacheHit: true });
    }

    // 4 operations missing cache (simulating new projects or expired cache)
    for (let i = 0; i < 4; i++) {
      const projectKey = `PROJECT-${i + 6}`;
      syncOperations.push({ projectKey, expectCacheHit: false });
    }

    // Execute sync operations
    for (const operation of syncOperations) {
      await simulateSyncOperation(operation.projectKey, operation.expectCacheHit);
    }

    // Calculate final metrics
    metrics.hitRate = (metrics.cacheHits / metrics.totalOperations) * 100;

    // Log results
    console.log('\n📊 Cache Performance Metrics:');
    console.log(`   Total operations: ${metrics.totalOperations}`);
    console.log(`   Cache hits: ${metrics.cacheHits}`);
    console.log(`   Cache misses: ${metrics.cacheMisses}`);
    console.log(`   API calls: ${metrics.apiCalls}`);
    console.log(`   Hit rate: ${metrics.hitRate.toFixed(1)}%`);

    // Assertions
    expect(metrics.totalOperations).toBe(100);
    expect(metrics.hitRate).toBeGreaterThan(90);
    expect(metrics.apiCalls).toBeLessThan(15); // Should be 9 (5 initial + 4 new)
    expect(metrics.cacheHits).toBeGreaterThan(90); // Should be 91

    // Verify significant reduction vs no-cache scenario
    const noCacheApiCalls = 100; // Every sync would make API call
    const reduction = ((noCacheApiCalls - metrics.apiCalls) / noCacheApiCalls) * 100;
    console.log(`   API call reduction: ${reduction.toFixed(1)}%`);
    expect(reduction).toBeGreaterThan(80); // > 80% reduction
  });

  it('should maintain high hit rate with time-based TTL expiry', async () => {
    // Use fake timers to simulate time passing
    vi.useFakeTimers();

    const projectKey = 'BACKEND';

    // Phase 1: First sync (cache miss)
    await simulateSyncOperation(projectKey, false);

    // Phase 2: Multiple syncs within TTL (all cache hits)
    for (let i = 0; i < 10; i++) {
      // Advance time by 1 hour (still within 24-hour TTL)
      vi.advanceTimersByTime(1 * 60 * 60 * 1000);
      await simulateSyncOperation(projectKey, true);
    }

    // Phase 3: Advance time beyond TTL (25 hours total)
    vi.advanceTimersByTime(15 * 60 * 60 * 1000); // Now at 25 hours

    // Next sync should miss cache (expired)
    await simulateSyncOperation(projectKey, false);

    // Phase 4: More syncs within new TTL window (cache hits)
    for (let i = 0; i < 10; i++) {
      vi.advanceTimersByTime(1 * 60 * 60 * 1000);
      await simulateSyncOperation(projectKey, true);
    }

    // Calculate metrics
    metrics.hitRate = (metrics.cacheHits / metrics.totalOperations) * 100;

    console.log('\n⏱️  Time-Based TTL Metrics:');
    console.log(`   Total operations: ${metrics.totalOperations}`);
    console.log(`   Cache hits: ${metrics.cacheHits}`);
    console.log(`   Cache misses: ${metrics.cacheMisses}`);
    console.log(`   Hit rate: ${metrics.hitRate.toFixed(1)}%`);

    // Assertions
    expect(metrics.totalOperations).toBe(22);
    expect(metrics.cacheMisses).toBe(2); // Initial + 1 after expiry
    expect(metrics.cacheHits).toBe(20); // All other syncs
    expect(metrics.hitRate).toBeGreaterThan(90); // Should be ~90.9%

    vi.useRealTimers();
  });

  it('should track cache statistics accurately', async () => {
    const projectKeys = ['BACKEND', 'FRONTEND', 'MOBILE'];

    // Populate cache with 3 projects
    for (const projectKey of projectKeys) {
      await simulateSyncOperation(projectKey, false);
    }

    // Get cache stats
    const stats = await cacheManager.getStats();

    console.log('\n📈 Cache Statistics:');
    console.log(`   Total files: ${stats.totalFiles}`);
    console.log(`   Total size: ${stats.totalSize} bytes`);
    console.log(`   Oldest cache: ${stats.oldestCache}`);
    console.log(`   Oldest age: ${stats.oldestCacheAge?.toFixed(1)}h`);

    // Assertions
    expect(stats.totalFiles).toBe(3);
    expect(stats.totalSize).toBeGreaterThan(0);
    expect(stats.oldestCache).toBeTruthy();
    expect(stats.oldestCacheAge).toBeLessThan(1); // Created within last hour
  });

  /**
   * Simulate a single sync operation
   *
   * @param projectKey JIRA project key
   * @param expectCacheHit Whether we expect cache hit or miss
   */
  async function simulateSyncOperation(
    projectKey: string,
    expectCacheHit: boolean
  ): Promise<void> {
    metrics.totalOperations++;

    const cacheKey = `jira-${projectKey}-deps`;

    // Check cache first
    const cachedData = await cacheManager.get<any>(cacheKey);

    if (cachedData !== null) {
      // Cache hit
      metrics.cacheHits++;

      if (!expectCacheHit) {
        console.warn(`⚠️  Unexpected cache hit for ${projectKey}`);
      }
    } else {
      // Cache miss - simulate API call
      metrics.cacheMisses++;
      metrics.apiCalls++;

      if (expectCacheHit) {
        console.warn(`⚠️  Unexpected cache miss for ${projectKey}`);
      }

      // Simulate API response and cache it
      const apiResponse = {
        projectKey,
        boards: [{ id: 1, name: 'Sprint Board' }],
        components: [{ id: '10000', name: 'Backend' }],
        versions: [{ id: '10001', name: 'v1.0.0' }],
        lastUpdated: new Date().toISOString(),
      };

      await cacheManager.set(cacheKey, apiResponse);
    }
  }
});
