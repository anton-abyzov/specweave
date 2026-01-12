/**
 * Tests for PackageJsonCache - Performance optimization for package.json reads
 *
 * @module tests/unit/utils/package-json-cache.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  PackageJsonCache,
  readPackageJson,
  packageJsonExists,
  getAllDependencies,
  type PackageJsonContent,
} from '../../../src/utils/package-json-cache.js';

describe('PackageJsonCache', () => {
  let tempDir: string;
  let cache: PackageJsonCache;

  beforeEach(() => {
    // Reset singleton
    PackageJsonCache.resetInstance();
    cache = PackageJsonCache.getInstance();

    // Create temp directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pkgjson-cache-test-'));
  });

  afterEach(() => {
    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true });
    PackageJsonCache.resetInstance();
  });

  /**
   * Helper to create a package.json file
   */
  function createPackageJson(projectPath: string, content: Partial<PackageJsonContent>): void {
    fs.mkdirSync(projectPath, { recursive: true });
    fs.writeFileSync(
      path.join(projectPath, 'package.json'),
      JSON.stringify(content, null, 2)
    );
  }

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = PackageJsonCache.getInstance();
      const instance2 = PackageJsonCache.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should reset instance correctly', () => {
      const instance1 = PackageJsonCache.getInstance();
      PackageJsonCache.resetInstance();
      const instance2 = PackageJsonCache.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('get', () => {
    it('should read and cache package.json', () => {
      const projectPath = path.join(tempDir, 'project1');
      createPackageJson(projectPath, {
        name: 'test-package',
        version: '1.0.0',
      });

      const result = cache.get(projectPath);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('test-package');
      expect(result?.version).toBe('1.0.0');
    });

    it('should return null for non-existent package.json', () => {
      const projectPath = path.join(tempDir, 'non-existent');
      fs.mkdirSync(projectPath, { recursive: true });

      const result = cache.get(projectPath);

      expect(result).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      const projectPath = path.join(tempDir, 'invalid-json');
      fs.mkdirSync(projectPath, { recursive: true });
      fs.writeFileSync(path.join(projectPath, 'package.json'), '{ invalid json }');

      const result = cache.get(projectPath);

      expect(result).toBeNull();
    });

    it('should cache results (hit on second call)', () => {
      const projectPath = path.join(tempDir, 'cached-project');
      createPackageJson(projectPath, { name: 'cached' });

      // First call - miss
      cache.get(projectPath);
      const stats1 = cache.getStats();

      // Second call - hit
      cache.get(projectPath);
      const stats2 = cache.getStats();

      expect(stats1.misses).toBe(1);
      expect(stats1.hits).toBe(0);
      expect(stats2.misses).toBe(1);
      expect(stats2.hits).toBe(1);
    });

    it('should invalidate cache when file changes', async () => {
      const projectPath = path.join(tempDir, 'changing-project');
      createPackageJson(projectPath, { name: 'original' });

      // First read
      const result1 = cache.get(projectPath);
      expect(result1?.name).toBe('original');

      // Wait a bit and change file (mtime should change)
      await new Promise((resolve) => setTimeout(resolve, 50));
      createPackageJson(projectPath, { name: 'updated' });

      // Second read should detect mtime change
      const result2 = cache.get(projectPath);
      expect(result2?.name).toBe('updated');
    });

    it('should handle dependencies correctly', () => {
      const projectPath = path.join(tempDir, 'deps-project');
      createPackageJson(projectPath, {
        name: 'deps-test',
        dependencies: { lodash: '^4.0.0' },
        devDependencies: { vitest: '^1.0.0' },
        peerDependencies: { react: '^18.0.0' },
      });

      const result = cache.get(projectPath);

      expect(result?.dependencies).toEqual({ lodash: '^4.0.0' });
      expect(result?.devDependencies).toEqual({ vitest: '^1.0.0' });
      expect(result?.peerDependencies).toEqual({ react: '^18.0.0' });
    });
  });

  describe('exists', () => {
    it('should return true for existing package.json', () => {
      const projectPath = path.join(tempDir, 'exists-project');
      createPackageJson(projectPath, { name: 'exists' });

      expect(cache.exists(projectPath)).toBe(true);
    });

    it('should return false for non-existent package.json', () => {
      const projectPath = path.join(tempDir, 'no-pkg');
      fs.mkdirSync(projectPath, { recursive: true });

      expect(cache.exists(projectPath)).toBe(false);
    });

    it('should use cache for existence checks', () => {
      const projectPath = path.join(tempDir, 'exists-cached');
      createPackageJson(projectPath, { name: 'exists-cached' });

      // Pre-populate cache
      cache.get(projectPath);

      // Delete file
      fs.unlinkSync(path.join(projectPath, 'package.json'));

      // Cache should still report exists (until TTL expires or mtime check)
      // Note: With validateMtime enabled, this should return false
      const exists = cache.exists(projectPath);
      expect(exists).toBe(false); // mtime validation detects deletion
    });
  });

  describe('getAllDependencies', () => {
    it('should merge all dependency types', () => {
      const pkg: PackageJsonContent = {
        dependencies: { a: '1.0.0' },
        devDependencies: { b: '2.0.0' },
        peerDependencies: { c: '3.0.0' },
      };

      const result = cache.getAllDependencies(pkg);

      expect(result).toEqual({
        a: '1.0.0',
        b: '2.0.0',
        c: '3.0.0',
      });
    });

    it('should handle missing dependency types', () => {
      const pkg: PackageJsonContent = {
        dependencies: { a: '1.0.0' },
      };

      const result = cache.getAllDependencies(pkg);

      expect(result).toEqual({ a: '1.0.0' });
    });

    it('should handle empty package.json', () => {
      const pkg: PackageJsonContent = {};

      const result = cache.getAllDependencies(pkg);

      expect(result).toEqual({});
    });
  });

  describe('getProductionDependencies', () => {
    it('should return only production dependencies', () => {
      const pkg: PackageJsonContent = {
        dependencies: { a: '1.0.0' },
        devDependencies: { b: '2.0.0' },
      };

      const result = cache.getProductionDependencies(pkg);

      expect(result).toEqual({ a: '1.0.0' });
    });
  });

  describe('hasDependency', () => {
    it('should find dependency in dependencies', () => {
      const pkg: PackageJsonContent = {
        dependencies: { lodash: '4.0.0' },
      };

      expect(cache.hasDependency(pkg, 'lodash')).toBe(true);
      expect(cache.hasDependency(pkg, 'express')).toBe(false);
    });

    it('should find dependency in devDependencies', () => {
      const pkg: PackageJsonContent = {
        devDependencies: { vitest: '1.0.0' },
      };

      expect(cache.hasDependency(pkg, 'vitest')).toBe(true);
    });

    it('should find dependency in peerDependencies', () => {
      const pkg: PackageJsonContent = {
        peerDependencies: { react: '18.0.0' },
      };

      expect(cache.hasDependency(pkg, 'react')).toBe(true);
    });
  });

  describe('invalidate', () => {
    it('should invalidate specific cache entry', () => {
      const projectPath = path.join(tempDir, 'invalidate-project');
      createPackageJson(projectPath, { name: 'to-invalidate' });

      // Populate cache
      cache.get(projectPath);
      expect(cache.getStats().size).toBe(1);

      // Invalidate
      cache.invalidate(projectPath);

      expect(cache.getStats().size).toBe(0);
      expect(cache.getStats().invalidations).toBe(1);
    });

    it('should not error on invalidating non-cached path', () => {
      cache.invalidate('/non/existent/path');

      expect(cache.getStats().invalidations).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear all cache entries', () => {
      const project1 = path.join(tempDir, 'clear-project1');
      const project2 = path.join(tempDir, 'clear-project2');
      createPackageJson(project1, { name: 'p1' });
      createPackageJson(project2, { name: 'p2' });

      cache.get(project1);
      cache.get(project2);
      expect(cache.getStats().size).toBe(2);

      cache.clear();

      expect(cache.getStats().size).toBe(0);
    });
  });

  describe('preWarm', () => {
    it('should pre-populate cache with multiple paths', () => {
      const project1 = path.join(tempDir, 'prewarm1');
      const project2 = path.join(tempDir, 'prewarm2');
      const project3 = path.join(tempDir, 'prewarm3');
      createPackageJson(project1, { name: 'p1' });
      createPackageJson(project2, { name: 'p2' });
      createPackageJson(project3, { name: 'p3' });

      cache.preWarm([project1, project2, project3]);

      expect(cache.getStats().size).toBe(3);
      expect(cache.getStats().misses).toBe(3);
      expect(cache.getStats().hits).toBe(0);

      // Subsequent reads should be hits
      cache.get(project1);
      cache.get(project2);
      expect(cache.getStats().hits).toBe(2);
    });
  });

  describe('cache eviction', () => {
    it('should evict oldest entries when max size reached', () => {
      // Create cache with small max
      PackageJsonCache.resetInstance();
      cache = PackageJsonCache.getInstance({ maxEntries: 5 });

      // Create 6 projects
      for (let i = 0; i < 6; i++) {
        const projectPath = path.join(tempDir, `evict-project-${i}`);
        createPackageJson(projectPath, { name: `project-${i}` });
        cache.get(projectPath);
      }

      // Should have evicted oldest entries
      expect(cache.getStats().size).toBeLessThanOrEqual(5);
    });
  });

  describe('TTL expiration', () => {
    it('should expire entries after TTL', async () => {
      // Create cache with very short TTL
      PackageJsonCache.resetInstance();
      cache = PackageJsonCache.getInstance({ ttl: 50, validateMtime: false });

      const projectPath = path.join(tempDir, 'ttl-project');
      createPackageJson(projectPath, { name: 'ttl-test' });

      // First read
      cache.get(projectPath);
      expect(cache.getStats().misses).toBe(1);
      expect(cache.getStats().hits).toBe(0);

      // Immediate second read - should hit
      cache.get(projectPath);
      expect(cache.getStats().hits).toBe(1);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Third read - should miss (TTL expired)
      cache.get(projectPath);
      expect(cache.getStats().misses).toBe(2);
    });
  });

  describe('convenience functions', () => {
    describe('readPackageJson', () => {
      it('should read package.json using singleton', () => {
        const projectPath = path.join(tempDir, 'convenience-read');
        createPackageJson(projectPath, { name: 'convenience' });

        const result = readPackageJson(projectPath);

        expect(result?.name).toBe('convenience');
      });
    });

    describe('packageJsonExists', () => {
      it('should check existence using singleton', () => {
        const projectPath = path.join(tempDir, 'convenience-exists');
        createPackageJson(projectPath, { name: 'exists' });

        expect(packageJsonExists(projectPath)).toBe(true);
        expect(packageJsonExists(path.join(tempDir, 'nonexistent'))).toBe(false);
      });
    });

    describe('getAllDependencies', () => {
      it('should get all dependencies using singleton', () => {
        const projectPath = path.join(tempDir, 'convenience-deps');
        createPackageJson(projectPath, {
          dependencies: { a: '1.0.0' },
          devDependencies: { b: '2.0.0' },
        });

        const result = getAllDependencies(projectPath);

        expect(result).toEqual({ a: '1.0.0', b: '2.0.0' });
      });

      it('should return empty object for non-existent package.json', () => {
        const result = getAllDependencies(path.join(tempDir, 'nonexistent'));

        expect(result).toEqual({});
      });
    });
  });

  describe('path normalization', () => {
    it('should normalize paths for consistent caching', () => {
      const projectPath = path.join(tempDir, 'normalize-project');
      createPackageJson(projectPath, { name: 'normalize' });

      // Read with trailing slash
      cache.get(projectPath + '/');

      // Read without trailing slash - should be cache hit
      cache.get(projectPath);

      expect(cache.getStats().misses).toBe(1);
      expect(cache.getStats().hits).toBe(1);
    });

    it('should handle relative paths by normalizing them', () => {
      const projectPath = path.join(tempDir, 'relative-project');
      createPackageJson(projectPath, { name: 'relative' });

      // Use absolute path first
      cache.get(projectPath);
      expect(cache.getStats().misses).toBe(1);

      // Reading same path again should hit
      cache.get(projectPath);
      expect(cache.getStats().hits).toBe(1);

      // Paths are resolved to absolute internally via path.resolve()
      // So the same absolute path will always hit the cache
      const resolved = path.resolve(projectPath);
      cache.get(resolved);
      expect(cache.getStats().hits).toBe(2);
    });
  });

  describe('concurrent access', () => {
    it('should handle concurrent reads safely', async () => {
      const projectPath = path.join(tempDir, 'concurrent-project');
      createPackageJson(projectPath, { name: 'concurrent' });

      // Simulate concurrent reads
      const results = await Promise.all([
        Promise.resolve(cache.get(projectPath)),
        Promise.resolve(cache.get(projectPath)),
        Promise.resolve(cache.get(projectPath)),
        Promise.resolve(cache.get(projectPath)),
      ]);

      // All should succeed
      for (const result of results) {
        expect(result?.name).toBe('concurrent');
      }
    });
  });
});
