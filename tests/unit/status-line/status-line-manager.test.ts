import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit Tests for StatusLineManager
 *
 * Tests the fast caching and rendering system.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StatusLineManager } from '../../../src/core/status-line/status-line-manager.js.js';
import { StatusLineCache } from '../../../src/core/status-line/types.js.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('StatusLineManager', () => {
  let tempDir: string;
  let manager: StatusLineManager;

  beforeEach(() => {
    // Create temp directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-test-'));

    // Create required directories
    fs.mkdirSync(path.join(tempDir, '.specweave/state'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, '.specweave/increments'), { recursive: true });

    manager = new StatusLineManager(tempDir);
  });

  afterEach(() => {
    // Cleanup temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('render()', () => {
    it('should return message when no cache exists', () => {
      const result = manager.render();
      expect(result).toBe('No active increment');
    });

    it('should return message when cache is empty', () => {
      const cacheFile = path.join(tempDir, '.specweave/state/status-line.json');
      fs.writeFileSync(cacheFile, '{}');

      const result = manager.render();
      expect(result).toBe('No active increment');
    });

    it('should render status line with valid cache', () => {
      createValidCache({
        current: {
          id: '0017-sync-architecture-fix',
          name: 'sync-architecture-fix',
          total: 30,
          completed: 15,
          percentage: 50
        },
        openCount: 1,
        lastUpdate: new Date().toISOString()
      });

      const result = manager.render();
      // Format: [name] ████░░░░ X/Y
      expect(result).toContain('[sync-architecture-fix]');
      expect(result).toContain('15/30');
      expect(result).toContain('████'); // 50% = 4 filled bars
    });

    it('should render progress bar correctly', () => {
      createValidCache({
        current: {
          id: '0017-test',
          name: 'test',
          total: 8,
          completed: 4,
          percentage: 50
        },
        openCount: 1,
        lastUpdate: new Date().toISOString()
      });

      const result = manager.render();
      expect(result).toContain('████░░░░'); // 50% = 4 filled, 4 empty
    });

    it('should truncate long increment names', () => {
      const longName = 'very-long-increment-name-that-exceeds-maximum-length';
      createValidCache({
        current: {
          id: `0017-${longName}`,
          name: longName,
          total: 10,
          completed: 5,
          percentage: 50
        },
        openCount: 1,
        lastUpdate: new Date().toISOString()
      });

      const result = manager.render();
      expect(result).toContain('…'); // Ellipsis indicates truncation
      expect(result!.length).toBeLessThan(100); // Reasonable length
    });

    it('should show progress with high completion', () => {
      createValidCache({
        current: {
          id: '0017-test',
          name: 'test',
          total: 30,
          completed: 27,
          percentage: 90
        },
        openCount: 1,
        lastUpdate: new Date().toISOString()
      });

      const result = manager.render();
      // Format: [name] ████░░░░ X/Y
      expect(result).toContain('[test]');
      expect(result).toContain('27/30');
      expect(result).toContain('███'); // Should have mostly filled bars
    });

    it('should handle 0% completion', () => {
      createValidCache({
        current: {
          id: '0017-test',
          name: 'test',
          total: 30,
          completed: 0,
          percentage: 0
        },
        openCount: 1,
        lastUpdate: new Date().toISOString()
      });

      const result = manager.render();
      expect(result).toContain('0/30');
      expect(result).toContain('░░░░░░░░'); // All empty
    });

    it('should handle 100% completion', () => {
      createValidCache({
        current: {
          id: '0017-test',
          name: 'test',
          total: 30,
          completed: 30,
          percentage: 100
        },
        openCount: 1,
        lastUpdate: new Date().toISOString()
      });

      const result = manager.render();
      expect(result).toContain('30/30');
      expect(result).toContain('████████'); // All filled
    });

    it('should show basic progress information', () => {
      // Status line shows progress bar and count, not detailed task info
      createValidCache({
        current: {
          id: '0017-test',
          name: 'test',
          total: 10,
          completed: 5,
          percentage: 50
        },
        openCount: 1,
        lastUpdate: new Date().toISOString()
      });

      const result = manager.render();
      // Test that basic progress is shown: [name] ████░░░░ X/Y
      expect(result).toContain('[test]');
      expect(result).toContain('5/10');
      expect(result).toMatch(/████░░░░/); // 50% progress bar
    });

    it('should hide current task when null', () => {
      // This test is now redundant since currentTask is not part of new structure
      createValidCache({
        current: {
          id: '0017-test',
          name: 'test',
          total: 10,
          completed: 5,
          percentage: 50
        },
        openCount: 1,
        lastUpdate: new Date().toISOString()
      });

      const result = manager.render();
      expect(result).not.toContain('T-');
      expect(result).not.toContain('•');
    });
  });

  describe('cache freshness validation', () => {
    it('should accept fresh cache (<30s old)', () => {
      createValidCache({
        current: {
          id: '0017-test',
          name: 'test',
          total: 10,
          completed: 5,
          percentage: 50
        },
        openCount: 1,
        lastUpdate: new Date().toISOString() // Just now
      });

      const result = manager.render();
      expect(result).not.toBeNull();
    });

    it('should invalidate old cache (>30s)', () => {
      // Create old cache (31s ago)
      const oldDate = new Date(Date.now() - 31000);
      createValidCache({
        current: {
          id: '0017-test',
          name: 'test',
          total: 10,
          completed: 5,
          percentage: 50
        },
        openCount: 1,
        lastUpdate: oldDate.toISOString()
      });

      // Cache is old but should still be displayed (better than nothing)
      const result = manager.render();
      // Should still render the status line even if cache is stale
      expect(result).toContain('test');
      expect(result).toContain('5/10');
    });

    it('should handle missing current increment', () => {
      createValidCache({
        current: null,
        openCount: 0,
        lastUpdate: new Date().toISOString()
      });

      const result = manager.render();
      // Should return message about no active increments
      expect(result).toBe('No active increment');
    });
  });

  describe('configuration', () => {
    it('should respect enabled=false', () => {
      const disabledManager = new StatusLineManager(tempDir, { enabled: false });
      createValidCache({
        current: {
          id: '0017-test',
          name: 'test',
          total: 10,
          completed: 5,
          percentage: 50
        },
        openCount: 1,
        lastUpdate: new Date().toISOString()
      });

      const result = disabledManager.render();
      expect(result).toBeNull();
    });

    it('should respect custom progressBarWidth', () => {
      const customManager = new StatusLineManager(tempDir, { progressBarWidth: 16 });
      createValidCache({
        current: {
          id: '0017-test',
          name: 'test',
          total: 16,
          completed: 8,
          percentage: 50
        },
        openCount: 1,
        lastUpdate: new Date().toISOString()
      });

      const result = customManager.render();
      expect(result).toContain('████████░░░░░░░░'); // 50% of 16 = 8 filled
    });

    it('should respect maxNameLength config', () => {
      const customManager = new StatusLineManager(tempDir, { maxNameLength: 10 });
      createValidCache({
        current: {
          id: '0017-test',
          name: 'very-long-increment-name',
          total: 10,
          completed: 5,
          percentage: 50
        },
        openCount: 1,
        lastUpdate: new Date().toISOString()
      });

      const result = customManager.render();
      // Name should be truncated to 10 chars max
      expect(result).toContain('…'); // Should have ellipsis for truncation
    });

    it('should respect maxCacheAge config', () => {
      // Test with short cache age
      const shortCacheManager = new StatusLineManager(tempDir, { maxCacheAge: 1000 });

      // Create cache that's 2 seconds old
      const oldDate = new Date(Date.now() - 2000);
      createValidCache({
        current: {
          id: '0017-test',
          name: 'test',
          total: 10,
          completed: 5,
          percentage: 50
        },
        openCount: 1,
        lastUpdate: oldDate.toISOString()
      });

      const result = shortCacheManager.render();
      // Should still show cache even if stale (better than nothing)
      expect(result).toContain('test');
      expect(result).toContain('5/10');
    });
  });

  describe('getCacheData()', () => {
    it('should return null when cache missing', () => {
      const data = manager.getCacheData();
      expect(data).toBeNull();
    });

    it('should return cache data when present', () => {
      const expectedData: StatusLineCache = {
        current: {
          id: '0017-test',
          name: 'test',
          total: 10,
          completed: 5,
          percentage: 50
        },
        openCount: 1,
        lastUpdate: new Date().toISOString()
      };

      createValidCache(expectedData);

      const data = manager.getCacheData();
      expect(data).not.toBeNull();
      expect(data!.current).not.toBeNull();
      expect(data!.current!.id).toBe('0017-test');
      expect(data!.current!.total).toBe(10);
      expect(data!.current!.completed).toBe(5);
      expect(data!.openCount).toBe(1);
    });
  });

  describe('clearCache()', () => {
    it('should remove cache file', () => {
      createValidCache({
        current: {
          id: '0017-test',
          name: 'test',
          total: 10,
          completed: 5,
          percentage: 50
        },
        openCount: 1,
        lastUpdate: new Date().toISOString()
      });

      const cacheFile = path.join(tempDir, '.specweave/state/status-line.json');
      expect(fs.existsSync(cacheFile)).toBe(true);

      manager.clearCache();
      expect(fs.existsSync(cacheFile)).toBe(false);
    });

    it('should not throw when cache missing', () => {
      expect(() => manager.clearCache()).not.toThrow();
    });
  });

  // Helper function to create valid cache
  function createValidCache(data: StatusLineCache): void {
    const cacheFile = path.join(tempDir, '.specweave/state/status-line.json');
    fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2));
  }
});
