/**
 * Tests for CacheManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CacheManager } from '../cache-manager.js';

describe('CacheManager', () => {
  let tempDir: string;
  let cacheManager: CacheManager;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cache-test-'));
    cacheManager = new CacheManager({
      projectRoot: tempDir,
      ttlHours: 24,
    });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('save and load', () => {
    it('should save and load data from cache', async () => {
      const testData = { foo: 'bar', count: 42, items: ['a', 'b', 'c'] };

      await cacheManager.save('test-key', testData);
      const loaded = await cacheManager.load<typeof testData>('test-key');

      expect(loaded).toEqual(testData);
    });

    it('should return null for non-existent cache', async () => {
      const loaded = await cacheManager.load('nonexistent');
      expect(loaded).toBeNull();
    });

    it('should save metadata with cache', async () => {
      const testData = { test: 'data' };
      await cacheManager.save('test-metadata', testData);

      const metadataPath = path.join(tempDir, '.specweave/cache/analysis/test-metadata.meta.json');
      expect(fs.existsSync(metadataPath)).toBe(true);

      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      expect(metadata.key).toBe('test-metadata');
      expect(metadata.timestamp).toBeTruthy();
      expect(metadata.expiresAt).toBeTruthy();
      expect(metadata.size).toBeGreaterThan(0);
    });
  });

  describe('TTL expiration', () => {
    it('should return null for expired cache', async () => {
      // Create cache with 0-hour TTL (immediate expiration)
      const shortTTLCache = new CacheManager({
        projectRoot: tempDir,
        ttlHours: 0,
      });

      await shortTTLCache.save('expired-key', { data: 'test' });

      // Wait a tiny bit to ensure expiration
      await new Promise(resolve => setTimeout(resolve, 10));

      const loaded = await shortTTLCache.load('expired-key');
      expect(loaded).toBeNull();
    });
  });

  describe('invalidate', () => {
    it('should remove cache entry', async () => {
      await cacheManager.save('to-invalidate', { data: 'test' });

      const beforeInvalidate = await cacheManager.load('to-invalidate');
      expect(beforeInvalidate).toBeTruthy();

      cacheManager.invalidate('to-invalidate');

      const afterInvalidate = await cacheManager.load('to-invalidate');
      expect(afterInvalidate).toBeNull();
    });
  });

  describe('clearAll', () => {
    it('should remove all cache entries', async () => {
      await cacheManager.save('key1', { data: 1 });
      await cacheManager.save('key2', { data: 2 });
      await cacheManager.save('key3', { data: 3 });

      const statsBefore = cacheManager.getStats();
      expect(statsBefore.totalEntries).toBe(3);

      cacheManager.clearAll();

      const statsAfter = cacheManager.getStats();
      expect(statsAfter.totalEntries).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      await cacheManager.save('stat-key-1', { large: 'data'.repeat(1000) });
      await cacheManager.save('stat-key-2', { small: 'data' });

      const stats = cacheManager.getStats();

      expect(stats.totalEntries).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.oldestEntry).toBeTruthy();
    });
  });
});
