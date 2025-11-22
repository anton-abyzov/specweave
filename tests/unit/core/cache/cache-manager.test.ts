import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CacheManager } from '../../../../src/core/cache/cache-manager.js';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';
import { silentLogger } from '../../../../src/utils/logger.js';

describe('CacheManager', () => {
  let cacheManager: CacheManager;
  let testRoot: string;
  let cacheDir: string;

  beforeEach(async () => {
    // Create isolated test directory
    testRoot = path.join(os.tmpdir(), `cache-test-${Date.now()}`);
    cacheDir = path.join(testRoot, '.specweave', 'cache');
    await fs.mkdir(testRoot, { recursive: true });

    cacheManager = new CacheManager(testRoot, { logger: silentLogger });
  });

  afterEach(async () => {
    // Cleanup test directory
    if (existsSync(testRoot)) {
      await fs.rm(testRoot, { recursive: true, force: true });
    }
  });

  describe('TC-001: Valid Cache Hit (Within TTL)', () => {
    it('should return cached data when cache is valid', async () => {
      const testData = { projects: ['PROJ1', 'PROJ2'] };

      // Set cache
      await cacheManager.set('jira-projects', testData);

      // Get cache (should hit)
      const result = await cacheManager.get<typeof testData>('jira-projects');

      expect(result).toEqual(testData);
    });

    it('should log cache hit with TTL remaining', async () => {
      const testData = { projects: ['PROJ1'] };
      const logSpy = vi.spyOn(silentLogger, 'log');

      await cacheManager.set('jira-projects', testData);
      await cacheManager.get('jira-projects');

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Cache hit'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('TTL remaining'));
    });
  });

  describe('TC-002: Expired Cache Miss (Beyond TTL)', () => {
    it('should return null for expired cache', async () => {
      const testData = { projects: ['PROJ1'] };

      // Set cache with 1ms TTL
      await cacheManager.set('jira-projects', testData, 1);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 5));

      // Get cache (should miss)
      const result = await cacheManager.get('jira-projects');

      expect(result).toBeNull();
    });

    it('should delete expired cache file automatically', async () => {
      const testData = { projects: ['PROJ1'] };

      // Set cache with 1ms TTL
      await cacheManager.set('jira-projects', testData, 1);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 5));

      // Get cache (triggers deletion)
      await cacheManager.get('jira-projects');

      // Verify file deleted
      const cachePath = path.join(cacheDir, 'jira-projects.json');
      expect(existsSync(cachePath)).toBe(false);
    });

    it('should log cache expiration with age and TTL', async () => {
      const testData = { projects: ['PROJ1'] };
      const logSpy = vi.spyOn(silentLogger, 'log');

      await cacheManager.set('jira-projects', testData, 1);
      await new Promise(resolve => setTimeout(resolve, 5));
      await cacheManager.get('jira-projects');

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Cache expired'));
    });
  });

  describe('TC-003: Cache Corruption Handling', () => {
    it('should handle malformed JSON and delete corrupted file', async () => {
      const cachePath = path.join(cacheDir, 'jira-projects.json');

      // Create corrupted cache
      await fs.mkdir(cacheDir, { recursive: true });
      await fs.writeFile(cachePath, '{"invalid json', 'utf-8');

      // Get cache (should handle corruption)
      const result = await cacheManager.get('jira-projects');

      expect(result).toBeNull();
      expect(existsSync(cachePath)).toBe(false);
    });

    it('should log error to cache-errors.log', async () => {
      const cachePath = path.join(cacheDir, 'jira-projects.json');
      const errorLogPath = path.join(testRoot, '.specweave', 'logs', 'cache-errors.log');

      // Create corrupted cache
      await fs.mkdir(cacheDir, { recursive: true });
      await fs.writeFile(cachePath, '{"invalid json', 'utf-8');

      // Get cache (triggers error logging)
      await cacheManager.get('jira-projects');

      // Check error log created
      expect(existsSync(errorLogPath)).toBe(true);
      const errorLog = await fs.readFile(errorLogPath, 'utf-8');
      expect(errorLog).toContain('Cache error for jira-projects');
    });

    it('should handle missing data field in cache', async () => {
      const cachePath = path.join(cacheDir, 'jira-projects.json');

      // Create cache with missing 'data' field
      await fs.mkdir(cacheDir, { recursive: true });
      await fs.writeFile(
        cachePath,
        JSON.stringify({
          timestamp: Date.now(),
          ttl: 86400000,
          // Missing 'data' field
        }),
        'utf-8'
      );

      const result = await cacheManager.get('jira-projects');

      expect(result).toBeNull();
      expect(existsSync(cachePath)).toBe(false);
    });
  });

  describe('TC-004: Atomic Write (No Corruption)', () => {
    it('should use temp file for atomic writes', async () => {
      const testData = { projects: ['PROJ1'] };

      await cacheManager.set('jira-projects', testData);

      // Verify final file exists
      const cachePath = path.join(cacheDir, 'jira-projects.json');
      expect(existsSync(cachePath)).toBe(true);

      // Verify temp file doesn't exist
      const tempPath = path.join(cacheDir, 'jira-projects.json.tmp');
      expect(existsSync(tempPath)).toBe(false);
    });

    it('should write valid JSON with metadata', async () => {
      const testData = { projects: ['PROJ1'] };

      await cacheManager.set('jira-projects', testData);

      const cachePath = path.join(cacheDir, 'jira-projects.json');
      const content = await fs.readFile(cachePath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed).toHaveProperty('data');
      expect(parsed).toHaveProperty('timestamp');
      expect(parsed).toHaveProperty('ttl');
      expect(parsed.data).toEqual(testData);
      expect(typeof parsed.timestamp).toBe('number');
      expect(typeof parsed.ttl).toBe('number');
    });

    it('should cleanup temp file on write failure', async () => {
      const testData = { projects: ['PROJ1'] };

      // Mock fs.rename to fail
      const originalRename = fs.rename;
      vi.spyOn(fs, 'rename').mockRejectedValueOnce(new Error('Mock rename failure'));

      await expect(cacheManager.set('jira-projects', testData)).rejects.toThrow('Mock rename failure');

      // Restore original
      vi.spyOn(fs, 'rename').mockImplementation(originalRename as any);

      // Verify temp file cleaned up
      const tempPath = path.join(cacheDir, 'jira-projects.json.tmp');
      expect(existsSync(tempPath)).toBe(false);
    });
  });

  describe('TC-005: Per-Project Cache Separation', () => {
    it('should create separate cache files per project', async () => {
      const backendDeps = { dependencies: ['dep1', 'dep2'] };
      const frontendDeps = { dependencies: ['dep3', 'dep4'] };

      await cacheManager.set('jira-BACKEND-deps', backendDeps);
      await cacheManager.set('jira-FRONTEND-deps', frontendDeps);

      // Verify separate files exist
      const backendPath = path.join(cacheDir, 'jira-BACKEND-deps.json');
      const frontendPath = path.join(cacheDir, 'jira-FRONTEND-deps.json');

      expect(existsSync(backendPath)).toBe(true);
      expect(existsSync(frontendPath)).toBe(true);

      // Verify independent data
      const backendResult = await cacheManager.get('jira-BACKEND-deps');
      const frontendResult = await cacheManager.get('jira-FRONTEND-deps');

      expect(backendResult).toEqual(backendDeps);
      expect(frontendResult).toEqual(frontendDeps);
    });

    it('should have independent TTL per cache file', async () => {
      const backendDeps = { dependencies: ['dep1'] };
      const frontendDeps = { dependencies: ['dep2'] };

      // Backend: 1ms TTL (expires quickly)
      await cacheManager.set('jira-BACKEND-deps', backendDeps, 1);

      // Frontend: 1 hour TTL (stays valid)
      await cacheManager.set('jira-FRONTEND-deps', frontendDeps, 3600000);

      // Wait for backend to expire
      await new Promise(resolve => setTimeout(resolve, 5));

      // Backend should be null (expired)
      const backendResult = await cacheManager.get('jira-BACKEND-deps');
      expect(backendResult).toBeNull();

      // Frontend should still be valid
      const frontendResult = await cacheManager.get('jira-FRONTEND-deps');
      expect(frontendResult).toEqual(frontendDeps);
    });
  });

  describe('delete()', () => {
    it('should delete cache file', async () => {
      const testData = { projects: ['PROJ1'] };

      await cacheManager.set('jira-projects', testData);
      await cacheManager.delete('jira-projects');

      const cachePath = path.join(cacheDir, 'jira-projects.json');
      expect(existsSync(cachePath)).toBe(false);
    });

    it('should handle deleting non-existent cache', async () => {
      await expect(cacheManager.delete('non-existent')).resolves.not.toThrow();
    });
  });

  describe('clearAll()', () => {
    it('should delete all cache files', async () => {
      await cacheManager.set('jira-projects', { data: 1 });
      await cacheManager.set('jira-BACKEND-deps', { data: 2 });
      await cacheManager.set('ado-projects', { data: 3 });

      await cacheManager.clearAll();

      const files = await fs.readdir(cacheDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      expect(jsonFiles.length).toBe(0);
    });

    it('should handle empty cache directory', async () => {
      await expect(cacheManager.clearAll()).resolves.not.toThrow();
    });

    it('should handle non-existent cache directory', async () => {
      // Don't create cache dir
      const freshManager = new CacheManager(path.join(testRoot, 'non-existent'), {
        logger: silentLogger,
      });

      await expect(freshManager.clearAll()).resolves.not.toThrow();
    });
  });

  describe('getStats()', () => {
    it('should return cache statistics', async () => {
      await cacheManager.set('jira-projects', { data: 'test1' });
      await cacheManager.set('jira-BACKEND-deps', { data: 'test2' });
      await cacheManager.set('ado-projects', { data: 'test3' });

      const stats = await cacheManager.getStats();

      expect(stats.totalFiles).toBe(3);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.providers).toHaveProperty('jira');
      expect(stats.providers).toHaveProperty('ado');
      expect(stats.providers.jira.files).toBe(2);
      expect(stats.providers.ado.files).toBe(1);
    });

    it('should identify oldest cache', async () => {
      // Create cache with old timestamp
      const oldCachePath = path.join(cacheDir, 'jira-old.json');
      await fs.mkdir(cacheDir, { recursive: true });
      await fs.writeFile(
        oldCachePath,
        JSON.stringify({
          data: 'old',
          timestamp: Date.now() - 10 * 60 * 60 * 1000, // 10 hours ago
          ttl: 86400000,
        }),
        'utf-8'
      );

      // Create fresh cache
      await cacheManager.set('jira-fresh', { data: 'fresh' });

      const stats = await cacheManager.getStats();

      expect(stats.oldestCache).toBe('jira-old.json');
      expect(stats.oldestCacheAge).toBeGreaterThan(9); // ~10 hours
      expect(stats.oldestCacheAge).toBeLessThan(11);
    });

    it('should handle empty cache directory', async () => {
      const stats = await cacheManager.getStats();

      expect(stats.totalFiles).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.oldestCache).toBeNull();
      expect(stats.oldestCacheAge).toBeNull();
    });
  });

  describe('deleteOlderThan()', () => {
    it('should delete caches older than specified age', async () => {
      // Create old cache
      const oldCachePath = path.join(cacheDir, 'jira-old.json');
      await fs.mkdir(cacheDir, { recursive: true });
      await fs.writeFile(
        oldCachePath,
        JSON.stringify({
          data: 'old',
          timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000, // 8 days ago
          ttl: 86400000,
        }),
        'utf-8'
      );

      // Create fresh cache
      await cacheManager.set('jira-fresh', { data: 'fresh' });

      // Delete caches older than 7 days
      const deletedCount = await cacheManager.deleteOlderThan(7 * 24 * 60 * 60 * 1000);

      expect(deletedCount).toBe(1);
      expect(existsSync(oldCachePath)).toBe(false);

      // Fresh cache should remain
      const freshPath = path.join(cacheDir, 'jira-fresh.json');
      expect(existsSync(freshPath)).toBe(true);
    });

    it('should delete corrupted caches during cleanup', async () => {
      const corruptedPath = path.join(cacheDir, 'jira-corrupted.json');
      await fs.mkdir(cacheDir, { recursive: true });
      await fs.writeFile(corruptedPath, '{"invalid json', 'utf-8');

      const deletedCount = await cacheManager.deleteOlderThan(7 * 24 * 60 * 60 * 1000);

      expect(deletedCount).toBe(1);
      expect(existsSync(corruptedPath)).toBe(false);
    });

    it('should return 0 when no caches to delete', async () => {
      await cacheManager.set('jira-fresh', { data: 'fresh' });

      const deletedCount = await cacheManager.deleteOlderThan(7 * 24 * 60 * 60 * 1000);

      expect(deletedCount).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle cache exactly at TTL boundary', async () => {
      const testData = { projects: ['PROJ1'] };

      // Set cache with 100ms TTL
      await cacheManager.set('jira-projects', testData, 100);

      // Wait exactly 100ms
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should be expired
      const result = await cacheManager.get('jira-projects');
      expect(result).toBeNull();
    });

    it('should handle cache just before TTL expiry', async () => {
      const testData = { projects: ['PROJ1'] };

      // Set cache with 100ms TTL
      await cacheManager.set('jira-projects', testData, 100);

      // Wait 50ms (half of TTL)
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should still be valid
      const result = await cacheManager.get('jira-projects');
      expect(result).toEqual(testData);
    });

    it('should handle concurrent reads', async () => {
      const testData = { projects: ['PROJ1'] };
      await cacheManager.set('jira-projects', testData);

      // Concurrent reads
      const results = await Promise.all([
        cacheManager.get('jira-projects'),
        cacheManager.get('jira-projects'),
        cacheManager.get('jira-projects'),
      ]);

      results.forEach(result => {
        expect(result).toEqual(testData);
      });
    });

    it('should handle cache miss for non-existent key', async () => {
      const result = await cacheManager.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should use custom TTL when provided', async () => {
      const testData = { projects: ['PROJ1'] };
      const customTTL = 5 * 60 * 1000; // 5 minutes

      await cacheManager.set('jira-projects', testData, customTTL);

      const cachePath = path.join(cacheDir, 'jira-projects.json');
      const content = await fs.readFile(cachePath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.ttl).toBe(customTTL);
    });

    it('should use default 24-hour TTL when not specified', async () => {
      const testData = { projects: ['PROJ1'] };

      await cacheManager.set('jira-projects', testData);

      const cachePath = path.join(cacheDir, 'jira-projects.json');
      const content = await fs.readFile(cachePath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.ttl).toBe(24 * 60 * 60 * 1000); // 24 hours
    });
  });
});
