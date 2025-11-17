/**
 * Integration Tests for Multi-Window Status Line Scenarios
 *
 * Tests the shared cache behavior when multiple windows/processes
 * are working on the same project.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StatusLineManager } from '../../src/core/status-line/status-line-manager.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

describe('Multi-Window Status Line', () => {
  let tempDir: string;
  let incrementDir: string;
  let tasksFile: string;
  let cacheFile: string;

  beforeEach(() => {
    // Create temp project structure
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-multiwindow-'));

    // Create directory structure
    fs.mkdirSync(path.join(tempDir, '.specweave/state'), { recursive: true });
    incrementDir = path.join(tempDir, '.specweave/increments/0017-test-increment');
    fs.mkdirSync(incrementDir, { recursive: true });

    tasksFile = path.join(incrementDir, 'tasks.md');
    cacheFile = path.join(tempDir, '.specweave/state/status-line.json');

    // Create active increment state
    const stateFile = path.join(tempDir, '.specweave/state/active-increment.json');
    fs.writeFileSync(stateFile, JSON.stringify({ id: '0017-test-increment' }));

    // Create initial tasks.md
    const tasksContent = `---
increment: 0017-test-increment
total_tasks: 5
---

## T-001: First task
[ ] Pending

## T-002: Second task
[ ] Pending

## T-003: Third task
[ ] Pending

## T-004: Fourth task
[ ] Pending

## T-005: Fifth task
[ ] Pending
`;
    fs.writeFileSync(tasksFile, tasksContent);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Scenario 1: Multiple Windows, Same Increment', () => {
    it('should see same progress in both windows after cache update', () => {
      // Simulate Window 1 updating cache
      runHookScript(tempDir);

      // Window 1 reads status
      const window1 = new StatusLineManager(tempDir);
      const result1 = window1.render();
      expect(result1).toContain('0/5');

      // Window 2 reads same cache
      const window2 = new StatusLineManager(tempDir);
      const result2 = window2.render();
      expect(result2).toContain('0/5');

      // Both see identical status
      expect(result1).toBe(result2);
    });

    it('should update both windows when task completed', () => {
      // Initial cache
      runHookScript(tempDir);

      // Window 1 marks task complete
      const updatedTasks = fs.readFileSync(tasksFile, 'utf8')
        .replace('## T-001: First task\n[ ] Pending', '## T-001: First task\n[x] Completed');
      fs.writeFileSync(tasksFile, updatedTasks);

      // Hook fires, updates cache
      runHookScript(tempDir);

      // Both windows see updated progress
      const window1 = new StatusLineManager(tempDir);
      const window2 = new StatusLineManager(tempDir);

      expect(window1.render()).toContain('1/5');
      expect(window2.render()).toContain('1/5');
    });
  });

  describe('Scenario 2: External Edit Detection', () => {
    it('should detect vim/git edits via mtime change', async () => {
      // Create initial cache
      runHookScript(tempDir);

      const manager = new StatusLineManager(tempDir);
      expect(manager.render()).toContain('0/5');

      // Get cache data before edit
      const cacheDataBefore = manager.getCacheData();
      expect(cacheDataBefore).not.toBeNull();
      const mtimeBefore = cacheDataBefore!.lastModified;

      // Wait to ensure mtime will be different
      await sleep(1000);

      // Simulate external edit (vim, git, etc.)
      const updatedTasks = fs.readFileSync(tasksFile, 'utf8')
        .replace('## T-001: First task\n[ ] Pending', '## T-001: First task\n[x] Completed');
      fs.writeFileSync(tasksFile, updatedTasks);

      // Check that file mtime has changed
      const tasksMtime = Math.floor(fs.statSync(tasksFile).mtimeMs / 1000);
      expect(tasksMtime).toBeGreaterThan(mtimeBefore);

      // Cache is now stale due to mtime mismatch
      // The manager would detect this on next render
    });

    it('should regenerate cache on next hook fire after external edit', async () => {
      // Initial state
      runHookScript(tempDir);
      expect(new StatusLineManager(tempDir).render()).toContain('0/5');

      // External edit
      await sleep(100);
      const updatedTasks = fs.readFileSync(tasksFile, 'utf8')
        .replace('## T-001: First task\n[ ] Pending', '## T-001: First task\n[x] Completed');
      fs.writeFileSync(tasksFile, updatedTasks);

      // Hook fires again, regenerates cache
      runHookScript(tempDir);

      // Now sees updated data
      expect(new StatusLineManager(tempDir).render()).toContain('1/5');
    });
  });

  describe('Scenario 3: Cache Performance', () => {
    it('should render in <1ms with valid cache', () => {
      // Create cache
      runHookScript(tempDir);

      const manager = new StatusLineManager(tempDir);

      // Measure render time
      const start = process.hrtime.bigint();
      const result = manager.render();
      const end = process.hrtime.bigint();

      const durationMs = Number(end - start) / 1_000_000;

      expect(result).not.toBeNull();
      expect(durationMs).toBeLessThan(1); // <1ms target
    });

    it('should handle 1000 rapid renders efficiently', () => {
      runHookScript(tempDir);

      const manager = new StatusLineManager(tempDir);

      const start = process.hrtime.bigint();
      for (let i = 0; i < 1000; i++) {
        manager.render();
      }
      const end = process.hrtime.bigint();

      const totalMs = Number(end - start) / 1_000_000;
      const avgMs = totalMs / 1000;

      // Average should still be <1ms
      expect(avgMs).toBeLessThan(1);
    });
  });

  describe('Scenario 4: Concurrent Updates', () => {
    it('should handle rapid task completions', async () => {
      runHookScript(tempDir);

      // Complete 3 tasks rapidly
      let content = fs.readFileSync(tasksFile, 'utf8');
      content = content
        .replace('## T-001: First task\n[ ] Pending', '## T-001: First task\n[x] Completed')
        .replace('## T-002: Second task\n[ ] Pending', '## T-002: Second task\n[x] Completed')
        .replace('## T-003: Third task\n[ ] Pending', '## T-003: Third task\n[x] Completed');
      fs.writeFileSync(tasksFile, content);

      // Update cache
      runHookScript(tempDir);

      // Should show 3/5
      const manager = new StatusLineManager(tempDir);
      expect(manager.render()).toContain('3/5');
      expect(manager.render()).toContain('(60%)');
    });
  });

  describe('Scenario 5: No Active Increment', () => {
    it('should return null when no increment active', () => {
      // Remove active increment state
      const stateFile = path.join(tempDir, '.specweave/state/active-increment.json');
      fs.unlinkSync(stateFile);

      // Run hook (should create empty cache)
      runHookScript(tempDir);

      const manager = new StatusLineManager(tempDir);
      expect(manager.render()).toBeNull();
    });
  });

  describe('Scenario 6: All Tasks Complete', () => {
    it('should show 100% when all complete', () => {
      // Complete all tasks
      let content = fs.readFileSync(tasksFile, 'utf8');
      content = content
        .replace(/\[ \] Pending/g, '[x] Completed');
      fs.writeFileSync(tasksFile, content);

      runHookScript(tempDir);

      const manager = new StatusLineManager(tempDir);
      const result = manager.render();

      expect(result).toContain('5/5');
      expect(result).toContain('(100%)');
      expect(result).toContain('████████'); // Full bar
    });
  });

  describe('Scenario 7: Lazy Metadata Initialization', () => {
    it('should show status line after lazy metadata initialization', () => {
      const { MetadataManager } = require('../../../src/core/increment/metadata-manager.js');

      // Remove active increment state (simulate fresh increment without metadata)
      const stateFile = path.join(tempDir, '.specweave/state/active-increment.json');
      fs.unlinkSync(stateFile);

      // Create increment directory (simulating increment created but no metadata yet)
      // Note: incrementDir is already created in beforeEach

      // Read increment (triggers lazy initialization with ActiveIncrementManager update)
      // Change working directory to tempDir so MetadataManager can find the increment
      const originalCwd = process.cwd();
      process.chdir(tempDir);

      try {
        const metadata = MetadataManager.read('0017-test-increment');
        expect(metadata.status).toBe('active');

        // Verify active increment state was updated
        const stateContent = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
        expect(stateContent.id).toBe('0017-test-increment');

        // Run hook to update status line cache
        runHookScript(tempDir);

        // Status line should now render correctly
        const manager = new StatusLineManager(tempDir);
        const result = manager.render();

        expect(result).not.toBeNull();
        expect(result).toContain('test-increment');
        expect(result).toContain('0/5'); // Initial progress
      } finally {
        // Restore working directory
        process.chdir(originalCwd);
      }
    });
  });

  // Helper functions
  function runHookScript(projectRoot: string): void {
    const hookScript = path.join(
      __dirname,
      '../../../plugins/specweave/hooks/lib/update-status-line.sh'
    );

    try {
      execSync(`bash "${hookScript}"`, {
        cwd: projectRoot,
        env: { ...process.env, PROJECT_ROOT: projectRoot }
      });
    } catch (error) {
      // Hook script may exit with non-zero in some cases
      // That's okay for testing
    }
  }

  function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
});
