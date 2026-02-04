/**
 * Tests for SymbolCache
 * TDD Phase: RED - Tests written before implementation
 *
 * @see spec.md US-006: Symbol Caching
 * @satisfies AC-US6-01, AC-US6-02, AC-US6-03
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SymbolCache,
  SymbolLocation,
  FileSystemAdapter,
} from '../../../../../src/core/lsp/cache/symbol-cache.js';

/**
 * Mock filesystem adapter for testing
 */
function createMockFs(): FileSystemAdapter & {
  files: Map<string, { content: string; mtime: number }>;
  setMtime: (path: string, mtime: number) => void;
} {
  const files = new Map<string, { content: string; mtime: number }>();

  return {
    files,
    setMtime(path: string, mtime: number) {
      const file = files.get(path);
      if (file) {
        file.mtime = mtime;
      }
    },
    async exists(path: string): Promise<boolean> {
      return files.has(path);
    },
    async readFile(path: string): Promise<string> {
      const file = files.get(path);
      if (!file) throw new Error(`File not found: ${path}`);
      return file.content;
    },
    async writeFile(path: string, content: string): Promise<void> {
      files.set(path, { content, mtime: Date.now() });
    },
    async getMtime(path: string): Promise<number> {
      const file = files.get(path);
      if (!file) throw new Error(`File not found: ${path}`);
      return file.mtime;
    },
    async mkdir(path: string): Promise<void> {
      // no-op for testing
    },
    async unlink(path: string): Promise<void> {
      files.delete(path);
    },
  };
}

describe('SymbolCache', () => {
  let mockFs: ReturnType<typeof createMockFs>;
  let cache: SymbolCache;

  const testLocations: SymbolLocation[] = [
    { uri: 'file:///project/test.ts', line: 10, column: 5 },
    { uri: 'file:///project/other.ts', line: 20, column: 3 },
  ];

  beforeEach(() => {
    mockFs = createMockFs();
    // Simulate source file exists with known mtime
    mockFs.files.set('/project/test.ts', { content: '', mtime: 1000 });
    cache = new SymbolCache('/cache', mockFs);
  });

  describe('set', () => {
    it('writes symbols to disk', async () => {
      await cache.set('/project/test.ts', 'MyClass', testLocations);

      // Should have written a cache file
      let foundCacheFile = false;
      for (const [path] of mockFs.files) {
        if (path.startsWith('/cache/') && path.endsWith('.json')) {
          foundCacheFile = true;
          break;
        }
      }
      expect(foundCacheFile).toBe(true);
    });

    it('stores symbol locations in cache', async () => {
      await cache.set('/project/test.ts', 'MyClass', testLocations);

      // Retrieve and verify
      const result = await cache.get('/project/test.ts', 'MyClass');
      expect(result).toEqual(testLocations);
    });
  });

  describe('get', () => {
    it('reads cached result', async () => {
      await cache.set('/project/test.ts', 'MyClass', testLocations);

      const result = await cache.get('/project/test.ts', 'MyClass');

      expect(result).toEqual(testLocations);
    });

    it('returns null for non-existent cache entry', async () => {
      const result = await cache.get('/project/nonexistent.ts', 'Unknown');

      expect(result).toBeNull();
    });
  });

  describe('mtime invalidation', () => {
    it('invalidates on mtime change', async () => {
      await cache.set('/project/test.ts', 'MyClass', testLocations);

      // Simulate file modification (increase mtime)
      mockFs.setMtime('/project/test.ts', 2000);

      const result = await cache.get('/project/test.ts', 'MyClass');

      expect(result).toBeNull();
    });

    it('returns cached result when mtime unchanged', async () => {
      await cache.set('/project/test.ts', 'MyClass', testLocations);

      // mtime stays the same
      const result = await cache.get('/project/test.ts', 'MyClass');

      expect(result).toEqual(testLocations);
    });
  });

  describe('cache key generation', () => {
    it('uses different keys for different symbols', async () => {
      await cache.set('/project/test.ts', 'ClassA', testLocations);
      await cache.set('/project/test.ts', 'ClassB', [{ uri: 'file:///x.ts', line: 1, column: 1 }]);

      const resultA = await cache.get('/project/test.ts', 'ClassA');
      const resultB = await cache.get('/project/test.ts', 'ClassB');

      expect(resultA).toEqual(testLocations);
      expect(resultB).toEqual([{ uri: 'file:///x.ts', line: 1, column: 1 }]);
    });

    it('uses different keys for different files', async () => {
      mockFs.files.set('/project/other.ts', { content: '', mtime: 1000 });

      await cache.set('/project/test.ts', 'MyClass', testLocations);
      await cache.set('/project/other.ts', 'MyClass', [{ uri: 'file:///y.ts', line: 5, column: 1 }]);

      const result1 = await cache.get('/project/test.ts', 'MyClass');
      const result2 = await cache.get('/project/other.ts', 'MyClass');

      expect(result1).toEqual(testLocations);
      expect(result2).toEqual([{ uri: 'file:///y.ts', line: 5, column: 1 }]);
    });
  });

  describe('clear', () => {
    it('removes all cache entries', async () => {
      await cache.set('/project/test.ts', 'MyClass', testLocations);
      await cache.clear();

      const result = await cache.get('/project/test.ts', 'MyClass');

      expect(result).toBeNull();
    });
  });
});
