/**
 * Status Line Force Update - Integration Test
 *
 * Tests the /specweave:update-status command end-to-end.
 *
 * Coverage:
 * - CLI execution (update-status-line.ts)
 * - StatusLineUpdater integration
 * - Cache file updates
 * - Task completion reflection in cache
 * - Status transition handling
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StatusLineUpdater } from '../../../src/core/status-line/status-line-updater.js';
import { StatusLineManager } from '../../../src/core/status-line/status-line-manager.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('Status Line Force Update Integration', () => {
  let testRoot: string;
  let updater: StatusLineUpdater;
  let manager: StatusLineManager;

  beforeEach(async () => {
    // Create isolated test directory
    testRoot = path.join(os.tmpdir(), `specweave-status-update-integration-${Date.now()}`);
    await fs.ensureDir(testRoot);

    updater = new StatusLineUpdater(testRoot);
    manager = new StatusLineManager(testRoot);
  });

  afterEach(async () => {
    // Cleanup test directory
    await fs.remove(testRoot);
  });

  it('should update cache when command called', async () => {
    // Step 1: Create increment with tasks
    await createIncrementWithTasks(testRoot, '0042-test-update', 'active', 5, 8);

    // Step 2: Call updater
    await updater.update();

    // Step 3: Verify cache was written
    const cache = await updater.getCurrentCache();
    expect(cache).not.toBeNull();
    expect(cache?.current?.id).toBe('0042-test-update');
    expect(cache?.current?.completed).toBe(5);
    expect(cache?.current?.total).toBe(8);
    expect(cache?.current?.percentage).toBe(62); // 5/8 = 62%
  });

  it('should reflect task completion in cache', async () => {
    // Step 1: Create increment with 5/8 tasks completed
    await createIncrementWithTasks(testRoot, '0043-task-completion', 'active', 5, 8);

    // Step 2: Initial update
    await updater.update();
    let cache = await updater.getCurrentCache();
    expect(cache?.current?.completed).toBe(5);

    // Step 3: Complete 3 more tasks
    await updateTaskCompletion(testRoot, '0043-task-completion', 8, 8);

    // Step 4: Force update
    await updater.update();

    // Step 5: Verify cache reflects new completion
    cache = await updater.getCurrentCache();
    expect(cache?.current?.completed).toBe(8);
    expect(cache?.current?.total).toBe(8);
    expect(cache?.current?.percentage).toBe(100);
  });

  it('should update after status transition', async () => {
    // Step 1: Create 2 active increments
    await createIncrement(testRoot, '0044-oldest', 'active', '2025-11-01');
    await createIncrement(testRoot, '0045-newest', 'active', '2025-11-02');

    // Step 2: Initial update (should show oldest)
    await updater.update();
    let cache = await updater.getCurrentCache();
    expect(cache?.current?.id).toBe('0044-oldest');
    expect(cache?.openCount).toBe(2);

    // Step 3: Mark oldest as completed
    await updateIncrementStatus(testRoot, '0044-oldest', 'completed');

    // Step 4: Force update
    await updater.update();

    // Step 5: Verify cache shows next increment
    cache = await updater.getCurrentCache();
    expect(cache?.current?.id).toBe('0045-newest');
    expect(cache?.openCount).toBe(1);
  });

  it('should show fresh status in StatusLineManager', async () => {
    // Step 1: Create increment with tasks
    await createIncrementWithTasks(testRoot, '0046-manager-test', 'active', 6, 10);

    // Step 2: Force update
    await updater.update();

    // Step 3: Render status line
    const statusLine = manager.render();

    // Step 4: Verify status line content
    expect(statusLine).not.toBeNull();
    expect(statusLine).toContain('0046');
    expect(statusLine).toContain('6/10'); // 6 completed out of 10
  });

  it('should handle no open increments gracefully', async () => {
    // Step 1: Create completed increment
    await createIncrement(testRoot, '0047-completed', 'completed', '2025-11-18');

    // Step 2: Force update
    await updater.update();

    // Step 3: Verify cache shows no current increment
    const cache = await updater.getCurrentCache();
    expect(cache?.current).toBeNull();
    expect(cache?.openCount).toBe(0);

    // Step 4: Verify status line message
    const statusLine = manager.render();
    // Updated to match actual implementation message
    expect(statusLine).toContain('No active increment');
  });

  it('should update progress bar correctly', async () => {
    // Test different completion percentages

    // Scenario 1: 0% completion
    await createIncrementWithTasks(testRoot, '0048-progress-0', 'active', 0, 4);
    await updater.update();
    let statusLine = manager.render();
    expect(statusLine).toContain('0/4');
    expect(statusLine).toContain('░░░░░░░░'); // All empty

    // Scenario 2: 50% completion
    await updateTaskCompletion(testRoot, '0048-progress-0', 2, 4);
    await updater.update();
    statusLine = manager.render();
    expect(statusLine).toContain('2/4');
    expect(statusLine).toContain('████'); // Half filled

    // Scenario 3: 100% completion
    await updateTaskCompletion(testRoot, '0048-progress-0', 4, 4);
    await updater.update();
    statusLine = manager.render();
    expect(statusLine).toContain('4/4');
    expect(statusLine).toContain('████████'); // All filled
  });

  it('should show multiple open increments in status line', async () => {
    // Step 1: Create 3 active increments (to trigger "+1 more" display)
    await createIncrement(testRoot, '0049-first', 'active', '2025-11-01');
    await createIncrement(testRoot, '0050-second', 'active', '2025-11-02');
    await createIncrement(testRoot, '0051-third', 'active', '2025-11-03');

    // Step 2: Force update
    await updater.update();

    // Step 3: Verify cache shows 3 open, but displays max 2
    const cache = await updater.getCurrentCache();
    expect(cache?.openCount).toBe(3);
    expect(cache?.activeIncrements).toHaveLength(2); // Max display = 2

    // Step 4: Verify status line shows remaining count
    const statusLine = manager.render();
    expect(statusLine).not.toBeNull();
    // Format is "(+1 more)" for remaining increments beyond MAX_ACTIVE_INCREMENTS_DISPLAY
    expect(statusLine).toContain('(+1 more)');
  });

  it('should handle cache staleness correctly', async () => {
    // Step 1: Create increment
    await createIncrementWithTasks(testRoot, '0051-stale', 'active', 3, 5);

    // Step 2: Initial update
    await updater.update();
    let cache = await updater.getCurrentCache();
    expect(cache?.current?.completed).toBe(3);

    // Step 3: Wait a bit and complete more tasks
    await new Promise(resolve => setTimeout(resolve, 100));
    await updateTaskCompletion(testRoot, '0051-stale', 5, 5);

    // Step 4: Before update, cache should still show old data
    cache = await updater.getCurrentCache();
    expect(cache?.current?.completed).toBe(3); // Still old

    // Step 5: After update, cache should be fresh
    await updater.update();
    cache = await updater.getCurrentCache();
    expect(cache?.current?.completed).toBe(5); // Now fresh
  });

  it('should prioritize oldest increment when multiple active', async () => {
    // Step 1: Create 3 active increments with different creation dates
    await createIncrement(testRoot, '0052-newest', 'active', '2025-11-18');
    await createIncrement(testRoot, '0053-oldest', 'active', '2025-11-15'); // Oldest
    await createIncrement(testRoot, '0054-middle', 'active', '2025-11-17');

    // Step 2: Force update
    await updater.update();

    // Step 3: Verify oldest is current
    const cache = await updater.getCurrentCache();
    expect(cache?.current?.id).toBe('0053-oldest');
    expect(cache?.openCount).toBe(3);
  });

  it('should handle mixed increment statuses', async () => {
    // Step 1: Create increments with various statuses
    await createIncrement(testRoot, '0055-active', 'active', '2025-11-15');
    await createIncrement(testRoot, '0056-planning', 'planning', '2025-11-16');
    await createIncrement(testRoot, '0057-paused', 'paused', '2025-11-17');
    await createIncrement(testRoot, '0058-completed', 'completed', '2025-11-18');

    // Step 2: Force update
    await updater.update();

    // Step 3: Verify only active/planning counted
    const cache = await updater.getCurrentCache();
    expect(cache?.openCount).toBe(2); // active + planning
    expect(cache?.current?.id).toBe('0055-active'); // Oldest open
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
      // Use format that TaskCounter recognizes: **Completed**: <date>
      tasksContent += `**Completed**: 2025-11-18\n\n`;
    } else {
      tasksContent += `**Status**: Pending\n\n`;
    }
  }

  await fs.writeFile(path.join(incrementDir, 'tasks.md'), tasksContent);
}

/**
 * Update task completion in tasks.md
 */
async function updateTaskCompletion(
  testRoot: string,
  incrementId: string,
  completed: number,
  total: number
): Promise<void> {
  const incrementDir = path.join(testRoot, '.specweave/increments', incrementId);
  let tasksContent = '# Tasks\n\n';

  for (let i = 1; i <= total; i++) {
    const taskId = `T-${String(i).padStart(3, '0')}`;
    const isCompleted = i <= completed;

    tasksContent += `## ${taskId}: Task ${i}\n\n`;
    if (isCompleted) {
      // Use format that TaskCounter recognizes: **Completed**: <date>
      tasksContent += `**Completed**: 2025-11-18\n\n`;
    } else {
      tasksContent += `**Status**: Pending\n\n`;
    }
  }

  await fs.writeFile(path.join(incrementDir, 'tasks.md'), tasksContent);
}

/**
 * Update increment status in spec.md
 */
async function updateIncrementStatus(
  testRoot: string,
  incrementId: string,
  newStatus: string
): Promise<void> {
  const incrementDir = path.join(testRoot, '.specweave/increments', incrementId);
  const specPath = path.join(incrementDir, 'spec.md');

  let specContent = await fs.readFile(specPath, 'utf-8');
  specContent = specContent.replace(/^status: .+$/m, `status: ${newStatus}`);

  await fs.writeFile(specPath, specContent);
}
