/**
 * Unit Tests for StatusLineManager
 *
 * Tests the fast caching and rendering system.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { StatusLineManager } from '../../../src/core/status-line/status-line-manager.js';
import { StatusLineCache } from '../../../src/core/status-line/types.js';
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
    it('should return null when no cache exists', () => {
      const result = manager.render();
      expect(result).toBeNull();
    });

    it('should return null when cache is empty', () => {
      const cacheFile = path.join(tempDir, '.specweave/state/status-line.json');
      fs.writeFileSync(cacheFile, '{}');

      const result = manager.render();
      expect(result).toBeNull();
    });

    it('should render status line with valid cache', () => {
      createValidCache({
        incrementId: '0017-sync-architecture-fix',
        incrementName: 'sync-architecture-fix',
        totalTasks: 30,
        completedTasks: 15,
        percentage: 50,
        currentTask: {
          id: 'T-016',
          title: 'Update documentation'
        },
        lastUpdate: new Date().toISOString(),
        lastModified: Math.floor(Date.now() / 1000)
      });

      const result = manager.render();
      // Name gets truncated at 20 chars (sync-architecture-fix is 21 chars)
      expect(result).toMatch(/\[sync-architecture-f[…\]]/);
      expect(result).toContain('15/30');
      expect(result).toContain('50%');
      expect(result).toContain('T-016');
    });

    it('should render progress bar correctly', () => {
      createValidCache({
        incrementId: '0017-test',
        incrementName: 'test',
        totalTasks: 8,
        completedTasks: 4,
        percentage: 50,
        currentTask: null,
        lastUpdate: new Date().toISOString(),
        lastModified: Math.floor(Date.now() / 1000)
      });

      const result = manager.render();
      expect(result).toContain('████░░░░'); // 50% = 4 filled, 4 empty
    });

    it('should truncate long increment names', () => {
      const longName = 'very-long-increment-name-that-exceeds-maximum-length';
      createValidCache({
        incrementId: `0017-${longName}`,
        incrementName: longName,
        totalTasks: 10,
        completedTasks: 5,
        percentage: 50,
        currentTask: null,
        lastUpdate: new Date().toISOString(),
        lastModified: Math.floor(Date.now() / 1000)
      });

      const result = manager.render();
      expect(result).toContain('…'); // Ellipsis indicates truncation
      expect(result!.length).toBeLessThan(100); // Reasonable length
    });

    it('should show completion percentage', () => {
      createValidCache({
        incrementId: '0017-test',
        incrementName: 'test',
        totalTasks: 30,
        completedTasks: 27,
        percentage: 90,
        currentTask: null,
        lastUpdate: new Date().toISOString(),
        lastModified: Math.floor(Date.now() / 1000)
      });

      const result = manager.render();
      expect(result).toContain('(90%)');
    });

    it('should handle 0% completion', () => {
      createValidCache({
        incrementId: '0017-test',
        incrementName: 'test',
        totalTasks: 30,
        completedTasks: 0,
        percentage: 0,
        currentTask: { id: 'T-001', title: 'First task' },
        lastUpdate: new Date().toISOString(),
        lastModified: Math.floor(Date.now() / 1000)
      });

      const result = manager.render();
      expect(result).toContain('0/30');
      expect(result).toContain('(0%)');
      expect(result).toContain('░░░░░░░░'); // All empty
    });

    it('should handle 100% completion', () => {
      createValidCache({
        incrementId: '0017-test',
        incrementName: 'test',
        totalTasks: 30,
        completedTasks: 30,
        percentage: 100,
        currentTask: null,
        lastUpdate: new Date().toISOString(),
        lastModified: Math.floor(Date.now() / 1000)
      });

      const result = manager.render();
      expect(result).toContain('30/30');
      expect(result).toContain('(100%)');
      expect(result).toContain('████████'); // All filled
    });

    it('should show current task when present', () => {
      createValidCache({
        incrementId: '0017-test',
        incrementName: 'test',
        totalTasks: 10,
        completedTasks: 5,
        percentage: 50,
        currentTask: {
          id: 'T-006',
          title: 'Implement feature X'
        },
        lastUpdate: new Date().toISOString(),
        lastModified: Math.floor(Date.now() / 1000)
      });

      const result = manager.render();
      expect(result).toContain('T-006');
      expect(result).toContain('Implement feature X');
    });

    it('should hide current task when null', () => {
      createValidCache({
        incrementId: '0017-test',
        incrementName: 'test',
        totalTasks: 10,
        completedTasks: 5,
        percentage: 50,
        currentTask: null,
        lastUpdate: new Date().toISOString(),
        lastModified: Math.floor(Date.now() / 1000)
      });

      const result = manager.render();
      expect(result).not.toContain('T-');
      expect(result).not.toContain('•');
    });
  });

  describe('cache freshness validation', () => {
    it('should accept fresh cache (<5s old)', () => {
      createValidCache({
        incrementId: '0017-test',
        incrementName: 'test',
        totalTasks: 10,
        completedTasks: 5,
        percentage: 50,
        currentTask: null,
        lastUpdate: new Date().toISOString(), // Just now
        lastModified: Math.floor(Date.now() / 1000)
      });

      const result = manager.render();
      expect(result).not.toBeNull();
    });

    it('should invalidate old cache (>5s) if tasks.md unchanged', () => {
      const incrementId = '0017-test';
      const tasksFile = path.join(tempDir, '.specweave/increments', incrementId, 'tasks.md');

      // Create tasks.md
      fs.mkdirSync(path.dirname(tasksFile), { recursive: true });
      fs.writeFileSync(tasksFile, '## T-001: Test task');

      const tasksMtime = Math.floor(fs.statSync(tasksFile).mtimeMs / 1000);

      // Create old cache (6s ago) with matching mtime
      const oldDate = new Date(Date.now() - 6000);
      createValidCache({
        incrementId,
        incrementName: 'test',
        totalTasks: 10,
        completedTasks: 5,
        percentage: 50,
        currentTask: null,
        lastUpdate: oldDate.toISOString(),
        lastModified: tasksMtime // Matches tasks.md mtime
      });

      // Should still be valid (mtime unchanged)
      const result = manager.render();
      expect(result).not.toBeNull();
    });

    it('should invalidate cache if tasks.md modified', () => {
      const incrementId = '0017-test';
      const tasksFile = path.join(tempDir, '.specweave/increments', incrementId, 'tasks.md');

      // Create tasks.md
      fs.mkdirSync(path.dirname(tasksFile), { recursive: true });
      fs.writeFileSync(tasksFile, '## T-001: Test task');

      // Create cache with old mtime
      createValidCache({
        incrementId,
        incrementName: 'test',
        totalTasks: 10,
        completedTasks: 5,
        percentage: 50,
        currentTask: null,
        lastUpdate: new Date(Date.now() - 6000).toISOString(),
        lastModified: Math.floor((Date.now() - 10000) / 1000) // 10s ago
      });

      // Cache should be invalid (mtime mismatch)
      const result = manager.render();
      expect(result).toBeNull();
    });

    it('should invalidate cache if tasks.md missing', () => {
      createValidCache({
        incrementId: '0017-nonexistent',
        incrementName: 'nonexistent',
        totalTasks: 10,
        completedTasks: 5,
        percentage: 50,
        currentTask: null,
        lastUpdate: new Date(Date.now() - 6000).toISOString(),
        lastModified: Math.floor(Date.now() / 1000)
      });

      const result = manager.render();
      expect(result).toBeNull();
    });
  });

  describe('configuration', () => {
    it('should respect enabled=false', () => {
      const disabledManager = new StatusLineManager(tempDir, { enabled: false });
      createValidCache({
        incrementId: '0017-test',
        incrementName: 'test',
        totalTasks: 10,
        completedTasks: 5,
        percentage: 50,
        currentTask: null,
        lastUpdate: new Date().toISOString(),
        lastModified: Math.floor(Date.now() / 1000)
      });

      const result = disabledManager.render();
      expect(result).toBeNull();
    });

    it('should respect custom progressBarWidth', () => {
      const customManager = new StatusLineManager(tempDir, { progressBarWidth: 16 });
      createValidCache({
        incrementId: '0017-test',
        incrementName: 'test',
        totalTasks: 16,
        completedTasks: 8,
        percentage: 50,
        currentTask: null,
        lastUpdate: new Date().toISOString(),
        lastModified: Math.floor(Date.now() / 1000)
      });

      const result = customManager.render();
      expect(result).toContain('████████░░░░░░░░'); // 50% of 16 = 8 filled
    });

    it('should respect showProgressBar=false', () => {
      const noBarManager = new StatusLineManager(tempDir, { showProgressBar: false });
      createValidCache({
        incrementId: '0017-test',
        incrementName: 'test',
        totalTasks: 10,
        completedTasks: 5,
        percentage: 50,
        currentTask: null,
        lastUpdate: new Date().toISOString(),
        lastModified: Math.floor(Date.now() / 1000)
      });

      const result = noBarManager.render();
      expect(result).not.toContain('█');
      expect(result).not.toContain('░');
    });

    it('should respect showPercentage=false', () => {
      const noPercentManager = new StatusLineManager(tempDir, { showPercentage: false });
      createValidCache({
        incrementId: '0017-test',
        incrementName: 'test',
        totalTasks: 10,
        completedTasks: 5,
        percentage: 50,
        currentTask: null,
        lastUpdate: new Date().toISOString(),
        lastModified: Math.floor(Date.now() / 1000)
      });

      const result = noPercentManager.render();
      expect(result).not.toContain('(50%)');
      expect(result).toContain('5/10'); // Still shows count
    });

    it('should respect showCurrentTask=false', () => {
      const noTaskManager = new StatusLineManager(tempDir, { showCurrentTask: false });
      createValidCache({
        incrementId: '0017-test',
        incrementName: 'test',
        totalTasks: 10,
        completedTasks: 5,
        percentage: 50,
        currentTask: { id: 'T-006', title: 'Test task' },
        lastUpdate: new Date().toISOString(),
        lastModified: Math.floor(Date.now() / 1000)
      });

      const result = noTaskManager.render();
      expect(result).not.toContain('T-006');
      expect(result).not.toContain('Test task');
    });
  });

  describe('getCacheData()', () => {
    it('should return null when cache missing', () => {
      const data = manager.getCacheData();
      expect(data).toBeNull();
    });

    it('should return cache data when present', () => {
      const expectedData: StatusLineCache = {
        incrementId: '0017-test',
        incrementName: 'test',
        totalTasks: 10,
        completedTasks: 5,
        percentage: 50,
        currentTask: { id: 'T-006', title: 'Test' },
        lastUpdate: new Date().toISOString(),
        lastModified: Math.floor(Date.now() / 1000)
      };

      createValidCache(expectedData);

      const data = manager.getCacheData();
      expect(data).not.toBeNull();
      expect(data!.incrementId).toBe('0017-test');
      expect(data!.totalTasks).toBe(10);
      expect(data!.completedTasks).toBe(5);
    });
  });

  describe('clearCache()', () => {
    it('should remove cache file', () => {
      createValidCache({
        incrementId: '0017-test',
        incrementName: 'test',
        totalTasks: 10,
        completedTasks: 5,
        percentage: 50,
        currentTask: null,
        lastUpdate: new Date().toISOString(),
        lastModified: Math.floor(Date.now() / 1000)
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
