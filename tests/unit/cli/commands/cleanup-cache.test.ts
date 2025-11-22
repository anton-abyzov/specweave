/**
 * Unit tests for cleanup-cache command
 *
 * Tests cache cleanup functionality including:
 * - Delete all caches
 * - Delete caches older than specified age
 * - Display cache statistics
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanupCache } from '../../../../src/cli/commands/cleanup-cache.js';
import { CacheManager } from '../../../../src/core/cache/cache-manager.js';
import { mkdirSync, existsSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

describe('cleanupCache', () => {
  let testDir: string;
  let originalCwd: string;
  let consoleLogSpy: any;

  beforeEach(() => {
    // Create isolated test directory
    testDir = path.join(tmpdir(), `cleanup-cache-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Change to test directory
    originalCwd = process.cwd();
    process.chdir(testDir);

    // Spy on console.log
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original working directory
    process.chdir(originalCwd);

    // Cleanup test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }

    // Restore console.log
    consoleLogSpy.mockRestore();
  });

  describe('--all flag', () => {
    it('should delete all cache files', async () => {
      // Setup: Create cache files
      const cacheManager = new CacheManager(testDir);
      await cacheManager.set('jira-projects', { test: 'data' });
      await cacheManager.set('ado-projects', { test: 'data' });

      // Verify caches exist
      const statsBefore = await cacheManager.getStats();
      expect(statsBefore.totalFiles).toBe(2);

      // Execute: Delete all caches
      await cleanupCache({ all: true });

      // Verify: All caches deleted
      const statsAfter = await cacheManager.getStats();
      expect(statsAfter.totalFiles).toBe(0);
    });

    it('should log success message', async () => {
      // Setup
      const cacheManager = new CacheManager(testDir);
      await cacheManager.set('test-cache', { test: 'data' });

      // Execute
      await cleanupCache({ all: true });

      // Verify
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('All caches deleted'));
    });
  });

  describe('--older-than flag', () => {
    it('should delete caches older than specified age', async () => {
      const cacheManager = new CacheManager(testDir);

      // Create old cache (8 days old)
      const oldTimestamp = Date.now() - 8 * 24 * 60 * 60 * 1000;
      await cacheManager.set('old-cache', { test: 'old' });
      // Manually update timestamp to make it old
      const cachePath = path.join(testDir, '.specweave', 'cache', 'old-cache.json');
      const { promises: fs } = await import('fs');
      const content = JSON.parse(await fs.readFile(cachePath, 'utf-8'));
      content.timestamp = oldTimestamp;
      await fs.writeFile(cachePath, JSON.stringify(content, null, 2));

      // Create new cache (1 hour old)
      await cacheManager.set('new-cache', { test: 'new' });

      // Verify both caches exist
      const statsBefore = await cacheManager.getStats();
      expect(statsBefore.totalFiles).toBe(2);

      // Execute: Delete caches older than 7 days
      await cleanupCache({ olderThan: '7d' });

      // Verify: Only old cache deleted
      const statsAfter = await cacheManager.getStats();
      expect(statsAfter.totalFiles).toBe(1);

      // Verify new cache still exists
      const newCacheData = await cacheManager.get('new-cache');
      expect(newCacheData).toEqual({ test: 'new' });
    });

    it('should parse age formats correctly (7d, 14d, 30d)', async () => {
      const cacheManager = new CacheManager(testDir);

      // Create caches of different ages
      const createOldCache = async (name: string, daysOld: number) => {
        await cacheManager.set(name, { test: name });
        const cachePath = path.join(testDir, '.specweave', 'cache', `${name}.json`);
        const { promises: fs } = await import('fs');
        const content = JSON.parse(await fs.readFile(cachePath, 'utf-8'));
        content.timestamp = Date.now() - daysOld * 24 * 60 * 60 * 1000;
        await fs.writeFile(cachePath, JSON.stringify(content, null, 2));
      };

      await createOldCache('cache-6d', 6);
      await createOldCache('cache-8d', 8);
      await createOldCache('cache-15d', 15);
      await createOldCache('cache-31d', 31);

      // Test 7d threshold
      await cleanupCache({ olderThan: '7d' });
      let stats = await cacheManager.getStats();
      expect(stats.totalFiles).toBe(1); // Only cache-6d remains

      // Reset
      await cacheManager.clearAll();
      await createOldCache('cache-6d', 6);
      await createOldCache('cache-8d', 8);
      await createOldCache('cache-15d', 15);
      await createOldCache('cache-31d', 31);

      // Test 14d threshold
      await cleanupCache({ olderThan: '14d' });
      stats = await cacheManager.getStats();
      expect(stats.totalFiles).toBe(2); // cache-6d and cache-8d remain
    });

    it('should log deleted count', async () => {
      const cacheManager = new CacheManager(testDir);

      // Create old cache
      await cacheManager.set('old-cache', { test: 'old' });
      const cachePath = path.join(testDir, '.specweave', 'cache', 'old-cache.json');
      const { promises: fs } = await import('fs');
      const content = JSON.parse(await fs.readFile(cachePath, 'utf-8'));
      content.timestamp = Date.now() - 8 * 24 * 60 * 60 * 1000;
      await fs.writeFile(cachePath, JSON.stringify(content, null, 2));

      // Execute
      await cleanupCache({ olderThan: '7d' });

      // Verify
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Deleted 1 old cache files'));
    });
  });

  describe('stats display (default)', () => {
    it('should display cache statistics', async () => {
      // Setup
      const cacheManager = new CacheManager(testDir);
      await cacheManager.set('jira-projects', { test: 'jira' });
      await cacheManager.set('ado-projects', { test: 'ado' });

      // Execute
      await cleanupCache({});

      // Verify
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Cache Statistics'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Total files: 2'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('By provider'));
    });

    it('should show per-provider breakdown', async () => {
      // Setup
      const cacheManager = new CacheManager(testDir);
      await cacheManager.set('jira-projects', { test: 'jira1' });
      await cacheManager.set('jira-BACKEND-deps', { test: 'jira2' });
      await cacheManager.set('ado-projects', { test: 'ado' });

      // Execute
      await cleanupCache({});

      // Verify
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('jira: 2 files'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('ado: 1 files'));
    });

    it('should display helpful tips', async () => {
      // Execute
      await cleanupCache({});

      // Verify
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Use --older-than 7d'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Use --all'));
    });
  });

  describe('error handling', () => {
    it('should handle invalid age format', async () => {
      await expect(cleanupCache({ olderThan: 'invalid' })).rejects.toThrow('Invalid age format');
    });

    it('should handle missing cache directory gracefully', async () => {
      // Execute without creating any caches
      await expect(cleanupCache({})).resolves.not.toThrow();
    });
  });
});
