/**
 * Status Line Updater - Unit Tests
 *
 * Tests synchronous status line cache updates.
 *
 * Coverage:
 * - Scanning spec.md files for open increments
 * - Selecting oldest increment as current
 * - Parsing tasks.md for progress
 * - Writing cache atomically
 * - Handling edge cases (no increments, corrupt files, etc.)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StatusLineUpdater } from '../../../src/core/status-line/status-line-updater.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

describe('StatusLineUpdater', () => {
  let testRoot: string;
  let updater: StatusLineUpdater;

  beforeEach(async () => {
    // Create isolated test directory
    testRoot = path.join(os.tmpdir(), `specweave-status-updater-test-${Date.now()}`);
    await fs.ensureDir(testRoot);

    updater = new StatusLineUpdater(testRoot);
  });

  afterEach(async () => {
    // Cleanup test directory
    await fs.remove(testRoot);
  });

  describe('findOpenIncrements', () => {
    it('should find active increments by scanning spec.md', async () => {
      // Setup: 2 active increments
      await createIncrement(testRoot, '0001-first', 'active', '2025-11-01');
      await createIncrement(testRoot, '0002-second', 'active', '2025-11-02');

      // Execute
      await updater.update();

      // Verify: Cache shows 2 open increments
      const cache = await updater.getCurrentCache();
      expect(cache).not.toBeNull();
      expect(cache?.openCount).toBe(2);
    });

    it('should find planning increments', async () => {
      // Setup: 1 planning increment
      await createIncrement(testRoot, '0003-planning', 'planning', '2025-11-03');

      // Execute
      await updater.update();

      // Verify: Cache shows 1 open increment
      const cache = await updater.getCurrentCache();
      expect(cache?.openCount).toBe(1);
      expect(cache?.current?.id).toBe('0003-planning');
    });

    it('should find in-progress increments', async () => {
      // Setup: 1 in-progress increment
      await createIncrement(testRoot, '0004-in-progress', 'in-progress', '2025-11-04');

      // Execute
      await updater.update();

      // Verify: Cache shows 1 open increment
      const cache = await updater.getCurrentCache();
      expect(cache?.openCount).toBe(1);
      expect(cache?.current?.id).toBe('0004-in-progress');
    });

    it('should ignore completed increments', async () => {
      // Setup: 1 active, 1 completed
      await createIncrement(testRoot, '0005-active', 'active', '2025-11-05');
      await createIncrement(testRoot, '0006-completed', 'completed', '2025-11-06');

      // Execute
      await updater.update();

      // Verify: Cache shows only 1 open increment
      const cache = await updater.getCurrentCache();
      expect(cache?.openCount).toBe(1);
      expect(cache?.current?.id).toBe('0005-active');
    });

    it('should ignore paused increments', async () => {
      // Setup: 1 active, 1 paused
      await createIncrement(testRoot, '0007-active', 'active', '2025-11-07');
      await createIncrement(testRoot, '0008-paused', 'paused', '2025-11-08');

      // Execute
      await updater.update();

      // Verify: Cache shows only 1 open increment
      const cache = await updater.getCurrentCache();
      expect(cache?.openCount).toBe(1);
      expect(cache?.current?.id).toBe('0007-active');
    });

    it('should ignore abandoned increments', async () => {
      // Setup: 1 active, 1 abandoned
      await createIncrement(testRoot, '0009-active', 'active', '2025-11-09');
      await createIncrement(testRoot, '0010-abandoned', 'abandoned', '2025-11-10');

      // Execute
      await updater.update();

      // Verify: Cache shows only 1 open increment
      const cache = await updater.getCurrentCache();
      expect(cache?.openCount).toBe(1);
      expect(cache?.current?.id).toBe('0009-active');
    });

    it('should skip _archive directories', async () => {
      // Setup: 1 active increment + 1 archived
      await createIncrement(testRoot, '0011-active', 'active', '2025-11-11');
      await createIncrement(testRoot, '_archive/0012-archived', 'active', '2025-11-12');

      // Execute
      await updater.update();

      // Verify: Cache shows only 1 open increment (ignores _archive)
      const cache = await updater.getCurrentCache();
      expect(cache?.openCount).toBe(1);
      expect(cache?.current?.id).toBe('0011-active');
    });
  });

  describe('selectCurrentIncrement', () => {
    it('should select oldest increment as current', async () => {
      // Setup: 3 active increments (different creation dates)
      await createIncrement(testRoot, '0013-newest', 'active', '2025-11-13');
      await createIncrement(testRoot, '0014-oldest', 'active', '2025-11-11'); // Oldest
      await createIncrement(testRoot, '0015-middle', 'active', '2025-11-12');

      // Execute
      await updater.update();

      // Verify: Cache shows oldest as current
      const cache = await updater.getCurrentCache();
      expect(cache?.current?.id).toBe('0014-oldest');
    });

    it('should handle missing created date gracefully', async () => {
      // Setup: Increment with no created date (defaults to 1970-01-01)
      await createIncrementWithoutDate(testRoot, '0016-no-date', 'active');

      // Execute
      await updater.update();

      // Verify: Cache shows increment (defaults to oldest)
      const cache = await updater.getCurrentCache();
      expect(cache?.current?.id).toBe('0016-no-date');
    });
  });

  describe('parseTaskProgress', () => {
    it('should parse tasks.md for progress', async () => {
      // Setup: Increment with tasks (5 completed out of 8 total)
      await createIncrementWithTasks(testRoot, '0017-tasks', 'active', 5, 8);

      // Execute
      await updater.update();

      // Verify: Cache shows correct progress
      const cache = await updater.getCurrentCache();
      expect(cache?.current?.completed).toBe(5);
      expect(cache?.current?.total).toBe(8);
      expect(cache?.current?.percentage).toBe(62); // 5/8 = 62%
    });

    it('should handle no tasks.md gracefully', async () => {
      // Setup: Increment without tasks.md
      await createIncrement(testRoot, '0018-no-tasks', 'active', '2025-11-18');

      // Execute
      await updater.update();

      // Verify: Cache shows 0/0 progress
      const cache = await updater.getCurrentCache();
      expect(cache?.current?.completed).toBe(0);
      expect(cache?.current?.total).toBe(0);
      expect(cache?.current?.percentage).toBe(0);
    });

    it('should handle 100% completion', async () => {
      // Setup: All tasks completed
      await createIncrementWithTasks(testRoot, '0019-complete', 'active', 8, 8);

      // Execute
      await updater.update();

      // Verify: Cache shows 100%
      const cache = await updater.getCurrentCache();
      expect(cache?.current?.completed).toBe(8);
      expect(cache?.current?.total).toBe(8);
      expect(cache?.current?.percentage).toBe(100);
    });

    it('should handle 0% completion', async () => {
      // Setup: No tasks completed
      await createIncrementWithTasks(testRoot, '0020-zero', 'active', 0, 8);

      // Execute
      await updater.update();

      // Verify: Cache shows 0%
      const cache = await updater.getCurrentCache();
      expect(cache?.current?.completed).toBe(0);
      expect(cache?.current?.total).toBe(8);
      expect(cache?.current?.percentage).toBe(0);
    });
  });

  describe('writeCache', () => {
    it('should write cache atomically', async () => {
      // Setup: Increment
      await createIncrement(testRoot, '0021-atomic', 'active', '2025-11-21');

      // Execute
      await updater.update();

      // Verify: Cache file exists and is valid JSON
      const cacheFile = path.join(testRoot, '.specweave/state/status-line.json');
      expect(await fs.pathExists(cacheFile)).toBe(true);

      const content = await fs.readFile(cacheFile, 'utf-8');
      const cache = JSON.parse(content);
      expect(cache.current).not.toBeNull();
      expect(cache.openCount).toBe(1);
    });

    it('should include lastUpdate timestamp', async () => {
      // Setup: Increment
      await createIncrement(testRoot, '0022-timestamp', 'active', '2025-11-22');

      // Execute
      const beforeUpdate = new Date();
      await updater.update();
      const afterUpdate = new Date();

      // Verify: lastUpdate is recent
      const cache = await updater.getCurrentCache();
      const lastUpdate = new Date(cache!.lastUpdate);
      expect(lastUpdate.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
      expect(lastUpdate.getTime()).toBeLessThanOrEqual(afterUpdate.getTime());
    });

    it('should create state directory if missing', async () => {
      // Setup: No state directory
      const stateDir = path.join(testRoot, '.specweave/state');
      await fs.remove(stateDir);

      await createIncrement(testRoot, '0023-create-dir', 'active', '2025-11-23');

      // Execute
      await updater.update();

      // Verify: State directory created
      expect(await fs.pathExists(stateDir)).toBe(true);
    });
  });

  describe('edgeCases', () => {
    it('should handle no open increments gracefully', async () => {
      // Setup: No increments
      await fs.ensureDir(path.join(testRoot, '.specweave/increments'));

      // Execute
      await updater.update();

      // Verify: Cache shows no current increment
      const cache = await updater.getCurrentCache();
      expect(cache?.current).toBeNull();
      expect(cache?.openCount).toBe(0);
    });

    it('should handle missing increments directory', async () => {
      // Setup: No .specweave/increments directory
      // (testRoot is empty)

      // Execute
      await updater.update();

      // Verify: Cache shows no current increment
      const cache = await updater.getCurrentCache();
      expect(cache?.current).toBeNull();
      expect(cache?.openCount).toBe(0);
    });

    it('should handle corrupt spec.md gracefully', async () => {
      // Setup: Increment with invalid YAML
      const incrementDir = path.join(testRoot, '.specweave/increments/0024-corrupt');
      await fs.ensureDir(incrementDir);
      await fs.writeFile(
        path.join(incrementDir, 'spec.md'),
        'INVALID YAML CONTENT!!!'
      );

      // Execute (should not throw)
      await updater.update();

      // Verify: Cache shows no open increments (corrupt file ignored)
      const cache = await updater.getCurrentCache();
      expect(cache?.openCount).toBe(0);
    });
  });
});

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create test increment with spec.md
 */
async function createIncrement(
  testRoot: string,
  incrementId: string,
  status: string,
  created: string
): Promise<void> {
  const incrementDir = path.join(testRoot, '.specweave/increments', incrementId);
  await fs.ensureDir(incrementDir);

  const specContent = `---
increment: ${incrementId}
title: "Test Increment"
status: ${status}
created: ${created}
---

# Test Feature
`;

  await fs.writeFile(path.join(incrementDir, 'spec.md'), specContent);
}

/**
 * Create increment without created date
 */
async function createIncrementWithoutDate(
  testRoot: string,
  incrementId: string,
  status: string
): Promise<void> {
  const incrementDir = path.join(testRoot, '.specweave/increments', incrementId);
  await fs.ensureDir(incrementDir);

  const specContent = `---
increment: ${incrementId}
title: "Test Increment"
status: ${status}
---

# Test Feature
`;

  await fs.writeFile(path.join(incrementDir, 'spec.md'), specContent);
}

/**
 * Create increment with tasks.md
 */
async function createIncrementWithTasks(
  testRoot: string,
  incrementId: string,
  status: string,
  completed: number,
  total: number
): Promise<void> {
  // Create spec.md
  await createIncrement(testRoot, incrementId, status, '2025-11-18');

  // Create tasks.md
  const incrementDir = path.join(testRoot, '.specweave/increments', incrementId);
  let tasksContent = '# Tasks\n\n';

  for (let i = 1; i <= total; i++) {
    const taskId = `T-${String(i).padStart(3, '0')}`;
    const isCompleted = i <= completed;

    tasksContent += `## ${taskId}: Task ${i}\n\n`;
    if (isCompleted) {
      tasksContent += `**Status**: [x] Completed **Completed**: 2025-11-18\n\n`;
    } else {
      tasksContent += `**Status**: [ ] Pending\n\n`;
    }
  }

  await fs.writeFile(path.join(incrementDir, 'tasks.md'), tasksContent);
}
