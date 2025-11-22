import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CacheManager } from '../../../src/core/cache/cache-manager.js';
import { promises as fs } from 'fs';
import { existsSync, rmSync } from 'fs';
import path from 'path';
import os from 'os';
import { Logger } from '../../../src/utils/logger.js';

/**
 * Integration Test: Full Cache Workflow
 *
 * Tests the complete cache lifecycle:
 * - Cache miss → API call → cache set
 * - Cache hit → no API call
 * - TTL expiry → refresh
 * - Manual refresh
 * - Rate limit fallback (stale cache)
 * - Corruption recovery
 *
 * Coverage Target: 100% (integration test)
 * Framework: Vitest + Real filesystem
 */
describe('Integration: Full Cache Workflow', () => {
  let cacheManager: CacheManager;
  let testDir: string;
  let mockLogger: Logger;
  let logMessages: string[];

  beforeEach(async () => {
    // Create isolated test directory
    testDir = path.join(os.tmpdir(), `specweave-cache-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Mock logger to capture messages
    logMessages = [];
    mockLogger = {
      log: (msg: string) => logMessages.push(`LOG: ${msg}`),
      error: (msg: string) => logMessages.push(`ERROR: ${msg}`),
      warn: (msg: string) => logMessages.push(`WARN: ${msg}`),
    };

    // Create cache manager with test directory
    cacheManager = new CacheManager(testDir, { logger: mockLogger });
  });

  afterEach(async () => {
    // Cleanup test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }

    // Restore real timers
    vi.useRealTimers();
  });

  /**
   * TC-019: Full Cache Lifecycle
   *
   * Given: Clean cache directory (no caches)
   * When: Executing full workflow:
   *   1. Load projects (cache miss, API call)
   *   2. Load projects again (cache hit, no API call)
   *   3. Wait 25 hours (simulate TTL expiry)
   *   4. Load projects again (cache miss, refresh)
   * Then: Verify correct behavior at each step
   * And: Verify API call counts: 2 calls total (miss + refresh)
   */
  it('should handle full cache lifecycle: miss → hit → expiry → refresh', async () => {
    const testKey = 'jira-projects';
    const testData = {
      projects: [
        { key: 'BACKEND', name: 'Backend Services' },
        { key: 'FRONTEND', name: 'Frontend' },
      ],
    };

    // Track API calls
    let apiCallCount = 0;

    const fetchFromAPI = async () => {
      apiCallCount++;
      return testData;
    };

    // Step 1: Cache miss (initial load)
    let cachedData = await cacheManager.get<typeof testData>(testKey);
    expect(cachedData).toBeNull();
    expect(logMessages).toContainEqual(expect.stringContaining('Cache miss'));

    // Simulate API call and cache set
    const freshData = await fetchFromAPI();
    await cacheManager.set(testKey, freshData);
    expect(apiCallCount).toBe(1);
    expect(logMessages).toContainEqual(expect.stringContaining('Cache set'));

    // Reset log messages
    logMessages = [];

    // Step 2: Cache hit (no API call)
    cachedData = await cacheManager.get<typeof testData>(testKey);
    expect(cachedData).not.toBeNull();
    expect(cachedData).toEqual(testData);
    expect(apiCallCount).toBe(1); // No additional API call
    expect(logMessages).toContainEqual(expect.stringContaining('Cache hit'));
    expect(logMessages).toContainEqual(expect.stringContaining('TTL remaining'));

    // Step 3: Simulate TTL expiry (25 hours)
    vi.useFakeTimers();
    const initialTime = Date.now();
    vi.setSystemTime(initialTime);

    // Re-create cache manager with fake timers
    await cacheManager.set(testKey, testData);

    // Advance time by 25 hours (beyond 24-hour TTL)
    const hoursToAdvance = 25;
    vi.advanceTimersByTime(hoursToAdvance * 60 * 60 * 1000);

    // Reset log messages
    logMessages = [];

    // Step 4: Cache miss due to expiry
    cachedData = await cacheManager.get<typeof testData>(testKey);
    expect(cachedData).toBeNull();
    expect(logMessages).toContainEqual(expect.stringContaining('Cache expired'));
    expect(logMessages).toContainEqual(expect.stringContaining('age: 25.0h'));

    // Refresh cache with new API call
    const refreshedData = await fetchFromAPI();
    await cacheManager.set(testKey, refreshedData);
    expect(apiCallCount).toBe(2); // Initial + refresh

    // Verify new cache works
    cachedData = await cacheManager.get<typeof testData>(testKey);
    expect(cachedData).not.toBeNull();
    expect(cachedData).toEqual(testData);

    // Restore real timers for cleanup
    vi.useRealTimers();
  });

  /**
   * TC-020: Manual Refresh Bypasses TTL
   *
   * Given: Valid cached data (within TTL)
   * When: Manual refresh triggered
   * Then: Old cache deleted, new cache set
   * And: Cache timestamp updated
   */
  it('should allow manual refresh to bypass TTL', async () => {
    const testKey = 'jira-BACKEND-deps';
    const oldData = { boards: [{ id: 1, name: 'Sprint Board' }] };
    const newData = { boards: [{ id: 1, name: 'Sprint Board' }, { id: 2, name: 'Kanban Board' }] };

    // Set initial cache
    await cacheManager.set(testKey, oldData);

    // Verify cache hit
    let cachedData = await cacheManager.get<typeof oldData>(testKey);
    expect(cachedData).toEqual(oldData);

    // Manual refresh: delete old cache, set new cache
    await cacheManager.delete(testKey);
    await cacheManager.set(testKey, newData);

    // Verify updated cache
    cachedData = await cacheManager.get<typeof newData>(testKey);
    expect(cachedData).toEqual(newData);
    expect(cachedData?.boards).toHaveLength(2);
  });

  /**
   * TC-021: Rate Limit Fallback (Stale Cache)
   *
   * Given: Expired cache (> 24 hours old)
   * When: API rate limit hit (429 error)
   * Then: Use stale cache instead of failing
   * And: Log warning about stale cache usage
   */
  it('should use stale cache when rate limit hit', async () => {
    const testKey = 'jira-projects';
    const testData = { projects: [{ key: 'BACKEND', name: 'Backend' }] };

    // Set cache
    await cacheManager.set(testKey, testData);

    // Advance time by 25 hours (expire cache)
    vi.useFakeTimers();
    const initialTime = Date.now();
    vi.setSystemTime(initialTime);

    await cacheManager.set(testKey, testData);
    vi.advanceTimersByTime(25 * 60 * 60 * 1000);

    // Normal get() returns null (expired)
    let cachedData = await cacheManager.get<typeof testData>(testKey);
    expect(cachedData).toBeNull();

    // Reset log messages
    logMessages = [];

    // getStale() returns expired data (rate limit fallback)
    const staleData = await cacheManager.getStale<typeof testData>(testKey);
    expect(staleData).not.toBeNull();
    expect(staleData).toEqual(testData);
    expect(logMessages).toContainEqual(expect.stringContaining('Using stale cache'));
    expect(logMessages).toContainEqual(expect.stringContaining('expired'));

    vi.useRealTimers();
  });

  /**
   * TC-022: Corruption Recovery
   *
   * Given: Corrupted cache file (malformed JSON)
   * When: Attempting to read cache
   * Then: Catch parse error, delete corrupted file
   * And: Return null (fallback to API)
   * And: Log error to cache-errors.log
   */
  it('should recover from corrupted cache files', async () => {
    const testKey = 'jira-projects';
    const cacheDir = path.join(testDir, '.specweave', 'cache');
    const cacheFilePath = path.join(cacheDir, `${testKey}.json`);

    // Create cache directory
    await fs.mkdir(cacheDir, { recursive: true });

    // Write corrupted JSON
    await fs.writeFile(cacheFilePath, '{ "data": { "invalid JSON', 'utf-8');

    // Attempt to read cache
    const cachedData = await cacheManager.get<any>(testKey);

    // Should return null (corruption detected)
    expect(cachedData).toBeNull();

    // Should delete corrupted file
    expect(existsSync(cacheFilePath)).toBe(false);

    // Should log error
    expect(logMessages).toContainEqual(expect.stringContaining('Cache corruption detected'));

    // Verify error logged to cache-errors.log
    const errorLogPath = path.join(testDir, '.specweave', 'logs', 'cache-errors.log');
    if (existsSync(errorLogPath)) {
      const errorLog = await fs.readFile(errorLogPath, 'utf-8');
      expect(errorLog).toContain('Cache error for jira-projects');
      // Error message can be either "Unexpected token" or "Unterminated string" depending on Node version
      expect(errorLog).toMatch(/Unexpected token|Unterminated string/);
    }
  });

  /**
   * TC-023: Invalid Cache Structure
   *
   * Given: Cache file missing required fields (timestamp, ttl)
   * When: Attempting to read cache
   * Then: Delete invalid cache
   * And: Return null (fallback to API)
   */
  it('should handle invalid cache structure', async () => {
    const testKey = 'ado-projects';
    const cacheDir = path.join(testDir, '.specweave', 'cache');
    const cacheFilePath = path.join(cacheDir, `${testKey}.json`);

    // Create cache directory
    await fs.mkdir(cacheDir, { recursive: true });

    // Write invalid cache structure (missing timestamp and ttl)
    const invalidCache = {
      data: { projects: [] },
      // Missing timestamp and ttl fields
    };
    await fs.writeFile(cacheFilePath, JSON.stringify(invalidCache), 'utf-8');

    // Attempt to read cache
    const cachedData = await cacheManager.get<any>(testKey);

    // Should return null (invalid structure)
    expect(cachedData).toBeNull();

    // Should delete invalid cache
    expect(existsSync(cacheFilePath)).toBe(false);

    // Should log error
    expect(logMessages).toContainEqual(expect.stringContaining('Invalid cache structure'));
  });

  /**
   * TC-024: Atomic Write (No Corruption on Interruption)
   *
   * Given: Cache write in progress
   * When: Process interrupted mid-write (simulated)
   * Then: Temp file remains, final file unchanged
   * And: No corrupted cache file exists
   */
  it('should use atomic writes to prevent corruption', async () => {
    const testKey = 'jira-BACKEND-deps';
    const testData = { boards: [{ id: 1, name: 'Test Board' }] };

    // Set initial cache
    await cacheManager.set(testKey, testData);

    const cacheDir = path.join(testDir, '.specweave', 'cache');
    const finalPath = path.join(cacheDir, `${testKey}.json`);
    const tempPath = `${finalPath}.tmp`;

    // Verify final file exists
    expect(existsSync(finalPath)).toBe(true);

    // Simulate interrupted write by creating temp file
    await fs.writeFile(tempPath, '{ "incomplete": true', 'utf-8');

    // Verify temp file exists but final file is still valid
    expect(existsSync(tempPath)).toBe(true);
    const cachedData = await cacheManager.get<typeof testData>(testKey);
    expect(cachedData).toEqual(testData); // Final file still valid

    // Complete the write (cleanup temp file)
    if (existsSync(tempPath)) {
      await fs.unlink(tempPath);
    }
  });

  /**
   * TC-025: Per-Project Cache Separation
   *
   * Given: Multiple projects (BACKEND, FRONTEND)
   * When: Caching dependencies for each
   * Then: Create separate files (jira-BACKEND-deps.json, jira-FRONTEND-deps.json)
   * And: Each file has independent TTL
   */
  it('should maintain separate cache files per project', async () => {
    const backendData = { boards: [{ id: 1, name: 'Backend Sprint' }] };
    const frontendData = { boards: [{ id: 2, name: 'Frontend Sprint' }] };

    // Cache different data for each project
    await cacheManager.set('jira-BACKEND-deps', backendData);
    await cacheManager.set('jira-FRONTEND-deps', frontendData);

    const cacheDir = path.join(testDir, '.specweave', 'cache');

    // Verify separate files exist
    expect(existsSync(path.join(cacheDir, 'jira-BACKEND-deps.json'))).toBe(true);
    expect(existsSync(path.join(cacheDir, 'jira-FRONTEND-deps.json'))).toBe(true);

    // Verify data is correctly separated
    const cachedBackend = await cacheManager.get<typeof backendData>('jira-BACKEND-deps');
    const cachedFrontend = await cacheManager.get<typeof frontendData>('jira-FRONTEND-deps');

    expect(cachedBackend).toEqual(backendData);
    expect(cachedFrontend).toEqual(frontendData);
    expect(cachedBackend).not.toEqual(cachedFrontend);
  });

  /**
   * TC-026: Cache Statistics
   *
   * Given: Multiple cache files of different ages
   * When: Getting cache statistics
   * Then: Return accurate file count, size, oldest cache
   */
  it('should provide accurate cache statistics', async () => {
    // Create multiple cache files
    await cacheManager.set('jira-projects', { count: 10 });
    await cacheManager.set('jira-BACKEND-deps', { boards: [] });
    await cacheManager.set('ado-projects', { count: 5 });

    // Wait a bit to create age difference
    await new Promise(resolve => setTimeout(resolve, 100));

    const stats = await cacheManager.getStats();

    // Verify statistics
    expect(stats.totalFiles).toBe(3);
    expect(stats.totalSize).toBeGreaterThan(0);
    expect(stats.providers.jira).toBeDefined();
    expect(stats.providers.jira.files).toBe(2);
    expect(stats.providers.ado).toBeDefined();
    expect(stats.providers.ado.files).toBe(1);
    expect(stats.oldestCache).toBeTruthy();
    expect(stats.oldestCacheAge).toBeGreaterThanOrEqual(0);
  });

  /**
   * TC-027: Cleanup Old Caches
   *
   * Given: Cache files of various ages
   * When: Deleting caches older than 7 days
   * Then: Old caches deleted, recent caches preserved
   */
  it('should delete caches older than specified age', async () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);

    // Create recent cache
    await cacheManager.set('recent-cache', { data: 'recent' });

    // Create old cache (8 days ago)
    vi.setSystemTime(now - 8 * 24 * 60 * 60 * 1000);
    await cacheManager.set('old-cache', { data: 'old' });

    // Return to present
    vi.setSystemTime(now);

    // Delete caches older than 7 days
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const deletedCount = await cacheManager.deleteOlderThan(sevenDaysMs);

    expect(deletedCount).toBe(1);

    // Verify recent cache still exists
    const recentData = await cacheManager.get<any>('recent-cache');
    expect(recentData).not.toBeNull();

    // Verify old cache deleted
    const oldData = await cacheManager.get<any>('old-cache');
    expect(oldData).toBeNull();

    vi.useRealTimers();
  });

  /**
   * TC-028: Clear All Caches
   *
   * Given: Multiple cache files exist
   * When: Calling clearAll()
   * Then: All cache files deleted
   */
  it('should clear all cache files', async () => {
    // Create multiple caches
    await cacheManager.set('cache-1', { data: 1 });
    await cacheManager.set('cache-2', { data: 2 });
    await cacheManager.set('cache-3', { data: 3 });

    // Verify caches exist
    const stats1 = await cacheManager.getStats();
    expect(stats1.totalFiles).toBe(3);

    // Clear all
    await cacheManager.clearAll();

    // Verify all deleted
    const stats2 = await cacheManager.getStats();
    expect(stats2.totalFiles).toBe(0);
  });

  /**
   * TC-029: TTL Edge Case (Exactly 24 Hours)
   *
   * Given: Cache exactly 24 hours old
   * When: Reading cache
   * Then: Cache should be considered expired (edge case)
   */
  it('should expire cache at exactly 24 hours', async () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);

    const testKey = 'ttl-edge-case';
    const testData = { test: 'data' };

    await cacheManager.set(testKey, testData);

    // Advance exactly 24 hours
    vi.advanceTimersByTime(24 * 60 * 60 * 1000);

    // Cache should be expired (>= TTL, not strictly >)
    const cachedData = await cacheManager.get<typeof testData>(testKey);
    expect(cachedData).toBeNull();

    vi.useRealTimers();
  });

  /**
   * TC-030: Custom TTL
   *
   * Given: Cache with custom TTL (12 hours instead of 24)
   * When: Cache age reaches 13 hours
   * Then: Cache should be expired
   */
  it('should respect custom TTL values', async () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);

    const testKey = 'custom-ttl';
    const testData = { custom: true };
    const customTTL = 12 * 60 * 60 * 1000; // 12 hours

    await cacheManager.set(testKey, testData, customTTL);

    // Advance 11 hours (within TTL)
    vi.advanceTimersByTime(11 * 60 * 60 * 1000);
    let cachedData = await cacheManager.get<typeof testData>(testKey);
    expect(cachedData).not.toBeNull();

    // Advance 2 more hours (total 13 hours, beyond 12-hour TTL)
    vi.advanceTimersByTime(2 * 60 * 60 * 1000);
    cachedData = await cacheManager.get<typeof testData>(testKey);
    expect(cachedData).toBeNull();

    vi.useRealTimers();
  });
});
