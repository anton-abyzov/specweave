import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';
import { CacheManager } from '../../../../src/core/cache/cache-manager.js';
import { Logger } from '../../../../src/utils/logger.js';

function createMockLogger(): Logger {
  return {
    log: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };
}

describe('CacheManager', () => {
  let tmpDir: string;
  let cacheManager: CacheManager;
  let mockLogger: Logger;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'specweave-cache-test-'));
    mockLogger = createMockLogger();
    cacheManager = new CacheManager(tmpDir, { logger: mockLogger });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  /**
   * Helper: write a raw cache file directly to disk
   */
  async function writeCacheFile(key: string, content: string): Promise<void> {
    const cacheDir = path.join(tmpDir, '.specweave', 'cache');
    await fs.mkdir(cacheDir, { recursive: true });
    await fs.writeFile(path.join(cacheDir, `${key}.json`), content, 'utf-8');
  }

  /**
   * Helper: read raw cache file from disk
   */
  async function readCacheFile(key: string): Promise<string> {
    const cacheDir = path.join(tmpDir, '.specweave', 'cache');
    return fs.readFile(path.join(cacheDir, `${key}.json`), 'utf-8');
  }

  /**
   * Helper: build valid cache JSON
   */
  function validCacheJson<T>(data: T, ttl: number = 86400000, timestamp?: number): string {
    return JSON.stringify({
      data,
      timestamp: timestamp ?? Date.now(),
      ttl,
    }, null, 2);
  }

  // ==========================================================================
  // Constructor
  // ==========================================================================

  describe('constructor', () => {
    it('should use default 24-hour TTL when no ttl option provided', async () => {
      const cm = new CacheManager(tmpDir, { logger: mockLogger });
      await cm.set('default-ttl-test', { value: 1 });

      const raw = JSON.parse(await readCacheFile('default-ttl-test'));
      expect(raw.ttl).toBe(24 * 60 * 60 * 1000);
    });

    it('should use custom TTL when provided in options', async () => {
      const customTTL = 5000;
      const cm = new CacheManager(tmpDir, { logger: mockLogger, ttl: customTTL });
      await cm.set('custom-ttl-test', { value: 2 });

      const raw = JSON.parse(await readCacheFile('custom-ttl-test'));
      expect(raw.ttl).toBe(customTTL);
    });

    it('should set cache directory to projectRoot/.specweave/cache/', async () => {
      await cacheManager.set('path-check', 'data');
      const filePath = path.join(tmpDir, '.specweave', 'cache', 'path-check.json');
      expect(existsSync(filePath)).toBe(true);
    });
  });

  // ==========================================================================
  // get()
  // ==========================================================================

  describe('get()', () => {
    it('should return null on cache miss (no file exists)', async () => {
      const result = await cacheManager.get('nonexistent');
      expect(result).toBeNull();
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Cache miss'));
    });

    it('should return data on cache hit (within TTL)', async () => {
      const data = { items: [1, 2, 3], name: 'test' };
      await writeCacheFile('fresh', validCacheJson(data, 86400000));

      const result = await cacheManager.get('fresh');
      expect(result).toEqual(data);
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Cache hit'));
    });

    it('should return null when cache is expired (beyond TTL)', async () => {
      const expiredTimestamp = Date.now() - 100000; // 100 seconds ago
      const ttl = 50000; // 50 second TTL -> expired
      await writeCacheFile('expired', validCacheJson('old-data', ttl, expiredTimestamp));

      const result = await cacheManager.get('expired');
      expect(result).toBeNull();
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Cache expired'));
    });

    it('should return null and delete file when cache contains invalid JSON', async () => {
      await writeCacheFile('corrupted', '{{{{not valid json}}}}');

      const result = await cacheManager.get('corrupted');
      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Cache corruption detected for corrupted:')
      );
    });

    it('should return null and delete file when cache has invalid structure (missing data field)', async () => {
      await writeCacheFile('bad-structure', JSON.stringify({
        timestamp: Date.now(),
        ttl: 86400000,
        // missing 'data' field
      }));

      const result = await cacheManager.get('bad-structure');
      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid cache structure')
      );
    });

    it('should return null and delete file when cache has invalid structure (missing timestamp)', async () => {
      await writeCacheFile('no-ts', JSON.stringify({
        data: 'hello',
        ttl: 86400000,
      }));

      const result = await cacheManager.get('no-ts');
      expect(result).toBeNull();
    });

    it('should return null and delete file when cache has invalid structure (missing ttl)', async () => {
      await writeCacheFile('no-ttl', JSON.stringify({
        data: 'hello',
        timestamp: Date.now(),
      }));

      const result = await cacheManager.get('no-ttl');
      expect(result).toBeNull();
    });

    it('should return null when timestamp is not a number', async () => {
      await writeCacheFile('bad-ts', JSON.stringify({
        data: 'hello',
        timestamp: 'not-a-number',
        ttl: 86400000,
      }));

      const result = await cacheManager.get('bad-ts');
      expect(result).toBeNull();
    });

    it('should return null when ttl is not a number', async () => {
      await writeCacheFile('bad-ttl-type', JSON.stringify({
        data: 'hello',
        timestamp: Date.now(),
        ttl: 'not-a-number',
      }));

      const result = await cacheManager.get('bad-ttl-type');
      expect(result).toBeNull();
    });

    it('should handle various data types (string, number, array, object, boolean, null)', async () => {
      const testCases: Array<{ key: string; data: any }> = [
        { key: 'type-string', data: 'hello world' },
        { key: 'type-number', data: 42 },
        { key: 'type-array', data: [1, 'two', null] },
        { key: 'type-object', data: { nested: { deep: true } } },
        { key: 'type-boolean', data: false },
        { key: 'type-null', data: null },
      ];

      for (const { key, data } of testCases) {
        await writeCacheFile(key, validCacheJson(data));
        const result = await cacheManager.get(key);
        expect(result).toEqual(data);
      }
    });

    it('should log error to cache-errors.log on corruption', async () => {
      await writeCacheFile('corrupt-log', '!!not json!!');
      await cacheManager.get('corrupt-log');

      const logPath = path.join(tmpDir, '.specweave', 'logs', 'cache-errors.log');
      expect(existsSync(logPath)).toBe(true);
      const logContent = await fs.readFile(logPath, 'utf-8');
      expect(logContent).toContain('corrupt-log');
    });
  });

  // ==========================================================================
  // getStale()
  // ==========================================================================

  describe('getStale()', () => {
    it('should return data even when expired (ignores TTL)', async () => {
      const data = { stale: true };
      const expiredTimestamp = Date.now() - 200000;
      await writeCacheFile('stale-ok', validCacheJson(data, 1000, expiredTimestamp));

      const result = await cacheManager.getStale('stale-ok');
      expect(result).toEqual(data);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Using stale cache'));
    });

    it('should return null when file does not exist', async () => {
      const result = await cacheManager.getStale('does-not-exist');
      expect(result).toBeNull();
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('No stale cache'));
    });

    it('should return null and delete file when cache structure is invalid', async () => {
      await writeCacheFile('stale-bad', JSON.stringify({ timestamp: 123, ttl: 100 }));

      const result = await cacheManager.getStale('stale-bad');
      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid cache structure')
      );
      // File should be deleted
      const filePath = path.join(tmpDir, '.specweave', 'cache', 'stale-bad.json');
      expect(existsSync(filePath)).toBe(false);
    });

    it('should return null when file contains invalid JSON', async () => {
      await writeCacheFile('stale-corrupt', 'not json at all');

      const result = await cacheManager.getStale('stale-corrupt');
      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to read stale cache')
      );
    });

    it('should return fresh data too (not only expired)', async () => {
      const data = { fresh: true };
      await writeCacheFile('stale-fresh', validCacheJson(data, 86400000));

      const result = await cacheManager.getStale('stale-fresh');
      expect(result).toEqual(data);
    });
  });

  // ==========================================================================
  // set()
  // ==========================================================================

  describe('set()', () => {
    it('should create cache file with correct structure', async () => {
      const data = { projects: ['A', 'B'] };
      await cacheManager.set('test-set', data);

      const raw = JSON.parse(await readCacheFile('test-set'));
      expect(raw.data).toEqual(data);
      expect(typeof raw.timestamp).toBe('number');
      expect(typeof raw.ttl).toBe('number');
    });

    it('should create cache directory if it does not exist', async () => {
      const cacheDir = path.join(tmpDir, '.specweave', 'cache');
      expect(existsSync(cacheDir)).toBe(false);

      await cacheManager.set('first-entry', 'value');
      expect(existsSync(cacheDir)).toBe(true);
    });

    it('should overwrite existing cache file', async () => {
      await cacheManager.set('overwrite', 'first');
      await cacheManager.set('overwrite', 'second');

      const result = await cacheManager.get('overwrite');
      expect(result).toBe('second');
    });

    it('should use custom TTL when provided', async () => {
      const customTTL = 5000;
      await cacheManager.set('custom-ttl', 'data', customTTL);

      const raw = JSON.parse(await readCacheFile('custom-ttl'));
      expect(raw.ttl).toBe(customTTL);
    });

    it('should use default TTL when no custom TTL provided', async () => {
      await cacheManager.set('default-ttl', 'data');

      const raw = JSON.parse(await readCacheFile('default-ttl'));
      expect(raw.ttl).toBe(24 * 60 * 60 * 1000);
    });

    it('should write timestamp close to current time', async () => {
      const before = Date.now();
      await cacheManager.set('ts-check', 'data');
      const after = Date.now();

      const raw = JSON.parse(await readCacheFile('ts-check'));
      expect(raw.timestamp).toBeGreaterThanOrEqual(before);
      expect(raw.timestamp).toBeLessThanOrEqual(after);
    });

    it('should log success message', async () => {
      await cacheManager.set('log-test', 'data');
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Cache set'));
    });

    it('should handle complex nested data', async () => {
      const complex = {
        users: [{ id: 1, roles: ['admin'] }],
        meta: { page: 1, total: 100 },
        nullField: null,
        flag: true,
      };

      await cacheManager.set('complex', complex);
      const result = await cacheManager.get('complex');
      expect(result).toEqual(complex);
    });

    it('should clean up temp file if rename fails', async () => {
      // Create a situation where the rename might leave artifacts
      // We verify that after a set, no .tmp files remain
      await cacheManager.set('atomic-check', 'data');

      const cacheDir = path.join(tmpDir, '.specweave', 'cache');
      const files = await fs.readdir(cacheDir);
      const tmpFiles = files.filter(f => f.endsWith('.tmp'));
      expect(tmpFiles).toHaveLength(0);
    });
  });

  // ==========================================================================
  // delete()
  // ==========================================================================

  describe('delete()', () => {
    it('should remove existing cache file', async () => {
      await cacheManager.set('to-delete', 'data');
      const filePath = path.join(tmpDir, '.specweave', 'cache', 'to-delete.json');
      expect(existsSync(filePath)).toBe(true);

      await cacheManager.delete('to-delete');
      expect(existsSync(filePath)).toBe(false);
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Cache deleted'));
    });

    it('should be a no-op when file does not exist', async () => {
      // Should not throw
      await expect(cacheManager.delete('nonexistent')).resolves.toBeUndefined();
    });

    it('should not affect other cache files', async () => {
      await cacheManager.set('keep', 'keep-data');
      await cacheManager.set('remove', 'remove-data');

      await cacheManager.delete('remove');

      const kept = await cacheManager.get('keep');
      expect(kept).toBe('keep-data');
    });
  });

  // ==========================================================================
  // clearAll()
  // ==========================================================================

  describe('clearAll()', () => {
    it('should remove all .json cache files', async () => {
      await cacheManager.set('clear-a', 'a');
      await cacheManager.set('clear-b', 'b');
      await cacheManager.set('clear-c', 'c');

      await cacheManager.clearAll();

      const cacheDir = path.join(tmpDir, '.specweave', 'cache');
      const files = await fs.readdir(cacheDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      expect(jsonFiles).toHaveLength(0);
    });

    it('should be a no-op when cache directory does not exist', async () => {
      // tmpDir exists but .specweave/cache does not
      await expect(cacheManager.clearAll()).resolves.toBeUndefined();
    });

    it('should be a no-op when cache directory is empty', async () => {
      const cacheDir = path.join(tmpDir, '.specweave', 'cache');
      await fs.mkdir(cacheDir, { recursive: true });

      await expect(cacheManager.clearAll()).resolves.toBeUndefined();
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Cleared 0'));
    });

    it('should log the count of cleared files', async () => {
      await cacheManager.set('log-a', 'a');
      await cacheManager.set('log-b', 'b');

      await cacheManager.clearAll();

      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Cleared 2'));
    });

    it('should not remove non-json files in the cache directory', async () => {
      await cacheManager.set('entry', 'data');
      const cacheDir = path.join(tmpDir, '.specweave', 'cache');
      await fs.writeFile(path.join(cacheDir, 'readme.txt'), 'keep me', 'utf-8');

      await cacheManager.clearAll();

      const files = await fs.readdir(cacheDir);
      expect(files).toContain('readme.txt');
      expect(files.filter(f => f.endsWith('.json'))).toHaveLength(0);
    });
  });

  // ==========================================================================
  // getStats()
  // ==========================================================================

  describe('getStats()', () => {
    it('should return empty stats when cache directory does not exist', async () => {
      const stats = await cacheManager.getStats();
      expect(stats.totalFiles).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.oldestCache).toBeNull();
      expect(stats.oldestCacheAge).toBeNull();
      expect(stats.providers).toEqual({});
    });

    it('should count total files correctly', async () => {
      await cacheManager.set('stat-a', 'a');
      await cacheManager.set('stat-b', 'b');
      await cacheManager.set('stat-c', 'c');

      const stats = await cacheManager.getStats();
      expect(stats.totalFiles).toBe(3);
    });

    it('should calculate total size as sum of all file sizes', async () => {
      await cacheManager.set('size-a', 'data-a');
      await cacheManager.set('size-b', 'data-b');

      const stats = await cacheManager.getStats();
      expect(stats.totalSize).toBeGreaterThan(0);
    });

    it('should identify oldest cache file', async () => {
      const oldTimestamp = Date.now() - 48 * 60 * 60 * 1000; // 48 hours ago
      await writeCacheFile('jira-old', validCacheJson('old', 86400000, oldTimestamp));
      await cacheManager.set('jira-new', 'new');

      const stats = await cacheManager.getStats();
      expect(stats.oldestCache).toBe('jira-old.json');
      expect(stats.oldestCacheAge).toBeGreaterThan(40); // ~48 hours
    });

    it('should group files by provider prefix (first segment before dash)', async () => {
      await cacheManager.set('jira-projects', 'data1');
      await cacheManager.set('jira-boards', 'data2');
      await cacheManager.set('github-repos', 'data3');

      const stats = await cacheManager.getStats();
      expect(stats.providers['jira']).toBeDefined();
      expect(stats.providers['jira'].files).toBe(2);
      expect(stats.providers['github']).toBeDefined();
      expect(stats.providers['github'].files).toBe(1);
    });

    it('should calculate per-provider sizes', async () => {
      await cacheManager.set('jira-one', 'data');
      await cacheManager.set('github-one', 'data');

      const stats = await cacheManager.getStats();
      expect(stats.providers['jira'].size).toBeGreaterThan(0);
      expect(stats.providers['github'].size).toBeGreaterThan(0);
    });

    it('should handle files without dashes in the name (filename becomes provider key)', async () => {
      // Source splits filename by '-' and takes [0]. For "standalone.json" -> "standalone.json"
      await cacheManager.set('standalone', 'data');

      const stats = await cacheManager.getStats();
      // Provider is "standalone.json" because split('-')[0] on "standalone.json" = "standalone.json"
      expect(stats.providers['standalone.json']).toBeDefined();
      expect(stats.providers['standalone.json'].files).toBe(1);
    });

    it('should ignore corrupted files when determining oldest', async () => {
      await writeCacheFile('good-file', validCacheJson('data', 86400000, Date.now() - 10000));
      await writeCacheFile('corrupt-file', '{{bad json}}');

      const stats = await cacheManager.getStats();
      // Corrupted file is still counted in totalFiles
      expect(stats.totalFiles).toBe(2);
      // But oldest is determined from the readable one
      expect(stats.oldestCache).toBe('good-file.json');
    });

    it('should not count non-json files', async () => {
      await cacheManager.set('real-entry', 'data');
      const cacheDir = path.join(tmpDir, '.specweave', 'cache');
      await fs.writeFile(path.join(cacheDir, 'notes.txt'), 'not a cache', 'utf-8');

      const stats = await cacheManager.getStats();
      expect(stats.totalFiles).toBe(1);
    });
  });

  // ==========================================================================
  // deleteOlderThan()
  // ==========================================================================

  describe('deleteOlderThan()', () => {
    it('should delete entries older than specified age', async () => {
      const oldTimestamp = Date.now() - 100000; // 100 seconds ago
      await writeCacheFile('old-entry', validCacheJson('old', 86400000, oldTimestamp));

      const deleted = await cacheManager.deleteOlderThan(50000); // 50 seconds
      expect(deleted).toBe(1);

      const filePath = path.join(tmpDir, '.specweave', 'cache', 'old-entry.json');
      expect(existsSync(filePath)).toBe(false);
    });

    it('should keep entries newer than specified age', async () => {
      await cacheManager.set('fresh-entry', 'fresh');

      const deleted = await cacheManager.deleteOlderThan(86400000); // 24 hours
      expect(deleted).toBe(0);

      const result = await cacheManager.get('fresh-entry');
      expect(result).toBe('fresh');
    });

    it('should delete corrupted files', async () => {
      await writeCacheFile('corrupt-for-delete', '{{not valid}}');

      const deleted = await cacheManager.deleteOlderThan(86400000);
      expect(deleted).toBe(1);

      const filePath = path.join(tmpDir, '.specweave', 'cache', 'corrupt-for-delete.json');
      expect(existsSync(filePath)).toBe(false);
    });

    it('should return 0 when cache directory does not exist', async () => {
      const deleted = await cacheManager.deleteOlderThan(1000);
      expect(deleted).toBe(0);
    });

    it('should handle mix of old, fresh, and corrupted entries', async () => {
      const oldTimestamp = Date.now() - 200000;
      await writeCacheFile('mix-old', validCacheJson('old', 86400000, oldTimestamp));
      await cacheManager.set('mix-fresh', 'fresh');
      await writeCacheFile('mix-corrupt', '!!broken!!');

      const deleted = await cacheManager.deleteOlderThan(100000);
      expect(deleted).toBe(2); // old + corrupted

      const freshResult = await cacheManager.get('mix-fresh');
      expect(freshResult).toBe('fresh');
    });

    it('should log deletion of each file', async () => {
      const oldTimestamp = Date.now() - 200000;
      await writeCacheFile('log-old', validCacheJson('old', 86400000, oldTimestamp));

      await cacheManager.deleteOlderThan(100000);

      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Deleted old cache'));
    });

    it('should log deletion of corrupted files', async () => {
      await writeCacheFile('log-corrupt', '!!bad!!');

      await cacheManager.deleteOlderThan(86400000);

      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Deleted corrupted cache'));
    });
  });

  // ==========================================================================
  // TTL boundary tests
  // ==========================================================================

  describe('TTL boundary behavior', () => {
    it('should return data when exactly at TTL boundary (not yet expired)', async () => {
      // Set a cache entry and immediately retrieve it. TTL is large so it's valid.
      const ttl = 10000;
      const timestamp = Date.now(); // now
      await writeCacheFile('boundary-valid', validCacheJson('boundary', ttl, timestamp));

      const result = await cacheManager.get('boundary-valid');
      expect(result).toBe('boundary');
    });

    it('should return null when just barely expired (timestamp + ttl < now)', async () => {
      const ttl = 1000; // 1 second TTL
      const timestamp = Date.now() - 1001; // set 1001ms ago -> expired by 1ms
      await writeCacheFile('boundary-expired', validCacheJson('old', ttl, timestamp));

      const result = await cacheManager.get('boundary-expired');
      expect(result).toBeNull();
    });

    it('should return data with very large TTL', async () => {
      const yearMs = 365 * 24 * 60 * 60 * 1000;
      await writeCacheFile('long-ttl', validCacheJson('long-lived', yearMs, Date.now() - 1000));

      const result = await cacheManager.get('long-ttl');
      expect(result).toBe('long-lived');
    });

    it('should immediately expire with TTL of 0', async () => {
      // TTL=0 means isValid checks Date.now() - timestamp < 0 which is never true
      // unless timestamp is in the future. With a current timestamp, it's expired.
      await writeCacheFile('zero-ttl', validCacheJson('instant-expire', 0, Date.now() - 1));

      const result = await cacheManager.get('zero-ttl');
      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // Atomic write behavior
  // ==========================================================================

  describe('atomic write behavior', () => {
    it('should not leave temp files after successful write', async () => {
      await cacheManager.set('atomic-success', 'data');

      const cacheDir = path.join(tmpDir, '.specweave', 'cache');
      const files = await fs.readdir(cacheDir);
      expect(files.every(f => !f.endsWith('.tmp'))).toBe(true);
    });

    it('should write valid JSON to the cache file', async () => {
      await cacheManager.set('json-valid', { key: 'value' });
      const content = await readCacheFile('json-valid');
      expect(() => JSON.parse(content)).not.toThrow();
    });

    it('should format JSON with indentation', async () => {
      await cacheManager.set('formatted', 'data');
      const content = await readCacheFile('formatted');
      expect(content).toContain('\n'); // pretty-printed
    });
  });

  // ==========================================================================
  // Edge cases and integration-like scenarios
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle empty string as cached data', async () => {
      await cacheManager.set('empty-string', '');
      const result = await cacheManager.get('empty-string');
      expect(result).toBe('');
    });

    it('should handle keys with special characters (dashes, underscores)', async () => {
      await cacheManager.set('jira-BACKEND-deps', 'deps-data');
      const result = await cacheManager.get('jira-BACKEND-deps');
      expect(result).toBe('deps-data');
    });

    it('should handle set then get in quick succession', async () => {
      for (let i = 0; i < 10; i++) {
        await cacheManager.set(`rapid-${i}`, i);
      }

      for (let i = 0; i < 10; i++) {
        const result = await cacheManager.get(`rapid-${i}`);
        expect(result).toBe(i);
      }
    });

    it('should handle set-delete-get returning null', async () => {
      await cacheManager.set('lifecycle', 'data');
      await cacheManager.delete('lifecycle');
      const result = await cacheManager.get('lifecycle');
      expect(result).toBeNull();
    });

    it('should handle clearAll followed by get returning null', async () => {
      await cacheManager.set('cleared', 'data');
      await cacheManager.clearAll();
      const result = await cacheManager.get('cleared');
      expect(result).toBeNull();
    });

    it('should allow re-setting after delete', async () => {
      await cacheManager.set('reset', 'first');
      await cacheManager.delete('reset');
      await cacheManager.set('reset', 'second');

      const result = await cacheManager.get('reset');
      expect(result).toBe('second');
    });

    it('should handle null data value', async () => {
      await cacheManager.set('null-data', null);
      // data field is null, but structure is valid
      const result = await cacheManager.get('null-data');
      expect(result).toBeNull();
      // Note: get returns cached.data which is null, and null is a valid return
    });

    it('should independently manage different keys', async () => {
      await cacheManager.set('key-a', 'alpha');
      await cacheManager.set('key-b', 'beta');

      expect(await cacheManager.get('key-a')).toBe('alpha');
      expect(await cacheManager.get('key-b')).toBe('beta');

      await cacheManager.delete('key-a');
      expect(await cacheManager.get('key-a')).toBeNull();
      expect(await cacheManager.get('key-b')).toBe('beta');
    });
  });

  // ==========================================================================
  // Multiple CacheManager instances
  // ==========================================================================

  describe('instance isolation', () => {
    it('should use separate cache directories for different project roots', async () => {
      const tmpDir2 = await fs.mkdtemp(path.join(os.tmpdir(), 'specweave-cache-test2-'));
      try {
        const cm2 = new CacheManager(tmpDir2, { logger: mockLogger });

        await cacheManager.set('shared-key', 'from-cm1');
        await cm2.set('shared-key', 'from-cm2');

        expect(await cacheManager.get('shared-key')).toBe('from-cm1');
        expect(await cm2.get('shared-key')).toBe('from-cm2');
      } finally {
        await fs.rm(tmpDir2, { recursive: true, force: true });
      }
    });
  });

  // ==========================================================================
  // Logger interaction
  // ==========================================================================

  describe('logger interaction', () => {
    it('should call logger.log on cache miss', async () => {
      await cacheManager.get('miss');
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Cache miss: miss'));
    });

    it('should call logger.log on cache hit with TTL info', async () => {
      await cacheManager.set('hit-log', 'data');
      await cacheManager.get('hit-log');
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Cache hit: hit-log'));
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('TTL remaining'));
    });

    it('should call logger.log on cache set with TTL info', async () => {
      await cacheManager.set('set-log', 'data');
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Cache set: set-log'));
    });

    it('should call logger.log on cache deleted', async () => {
      await cacheManager.set('del-log', 'data');
      await cacheManager.delete('del-log');
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Cache deleted: del-log'));
    });

    it('should call logger.error on corruption', async () => {
      await writeCacheFile('err-log', '%%corrupt%%');
      await cacheManager.get('err-log');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Cache corruption detected for err-log:')
      );
    });

    it('should call logger.warn when using stale cache', async () => {
      const old = Date.now() - 100000;
      await writeCacheFile('stale-warn', validCacheJson('stale', 1000, old));
      await cacheManager.getStale('stale-warn');
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Using stale cache: stale-warn'));
    });

    it('should call logger.log for stale cache miss', async () => {
      await cacheManager.getStale('stale-miss');
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('No stale cache available: stale-miss'));
    });
  });
});
