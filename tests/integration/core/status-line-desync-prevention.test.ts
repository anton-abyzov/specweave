/**
 * Status Line Desync Prevention Tests
 *
 * CRITICAL: These tests prevent status line cache from becoming stale
 * when increment status changes via various paths.
 *
 * Background: On 2025-11-18, status line cache showed 0 active increments
 * despite increment 0043 having status: active in spec.md. Root cause:
 * Cache not refreshed after manual spec.md edits or status changes.
 *
 * These tests ensure cache is ALWAYS fresh regardless of how status changes.
 *
 * Related:
 * - ULTRATHINK: .specweave/increments/0043/reports/ULTRATHINK-STATUS-LINE-DESYNC-ROOT-CAUSE-2025-11-18.md
 * - Fix: plugins/specweave/hooks/user-prompt-submit.sh (added status line refresh)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { StatusLineUpdater } from '../../../src/core/status-line/status-line-updater.js';
import { StatusLineCache } from '../../../src/core/status-line/types.js';

describe('Status Line Desync Prevention', () => {
  let testRoot: string;
  let updater: StatusLineUpdater;

  beforeEach(async () => {
    // Create isolated test directory (NEVER use process.cwd()!)
    testRoot = path.join(os.tmpdir(), `status-line-desync-test-${Date.now()}`);
    await fs.ensureDir(testRoot);

    // Create .specweave structure
    await fs.ensureDir(path.join(testRoot, '.specweave/increments'));
    await fs.ensureDir(path.join(testRoot, '.specweave/state'));

    // Initialize updater
    updater = new StatusLineUpdater(testRoot);
  });

  afterEach(async () => {
    // Cleanup
    await fs.remove(testRoot);
  });

  /**
   * Helper: Create increment with spec.md and tasks.md
   */
  async function createIncrement(
    id: string,
    status: 'planning' | 'active' | 'in-progress' | 'completed' | 'paused',
    options: {
      created?: string;
      totalTasks?: number;
      completedTasks?: number;
    } = {}
  ): Promise<void> {
    const incrementDir = path.join(testRoot, '.specweave/increments', id);
    await fs.ensureDir(incrementDir);

    // Create spec.md with YAML frontmatter
    const specContent = `---
increment: ${id}
title: "Test Increment ${id}"
priority: P1
status: ${status}
type: feature
created: ${options.created || '2025-11-18'}
---

# Test Increment ${id}

This is a test increment for status line desync prevention.
`;

    await fs.writeFile(path.join(incrementDir, 'spec.md'), specContent, 'utf-8');

    // Create tasks.md
    const totalTasks = options.totalTasks || 5;
    const completedTasks = options.completedTasks || 0;

    let tasksContent = `# Tasks\n\n`;
    for (let i = 1; i <= totalTasks; i++) {
      const taskId = String(i).padStart(3, '0');
      const isCompleted = i <= completedTasks;

      tasksContent += `## T-${taskId}: Task ${i}\n\n`;
      if (isCompleted) {
        // Use format that TaskCounter recognizes: **Completed**: <date>
        tasksContent += `**Completed**: 2025-11-18\n\n`;
      } else {
        // Pending tasks have no completion marker
        tasksContent += `**Status**: Pending\n\n`;
      }
    }

    await fs.writeFile(path.join(incrementDir, 'tasks.md'), tasksContent, 'utf-8');
  }

  /**
   * Helper: Read cache
   */
  async function readCache(): Promise<StatusLineCache | null> {
    const cacheFile = path.join(testRoot, '.specweave/state/status-line.json');

    if (!await fs.pathExists(cacheFile)) {
      return null;
    }

    const content = await fs.readFile(cacheFile, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Helper: Update spec.md status directly (simulates manual edit)
   */
  async function updateSpecStatus(
    id: string,
    newStatus: 'planning' | 'active' | 'in-progress' | 'completed' | 'paused'
  ): Promise<void> {
    const specPath = path.join(testRoot, '.specweave/increments', id, 'spec.md');
    let content = await fs.readFile(specPath, 'utf-8');

    // Replace status in YAML frontmatter
    content = content.replace(/^status:\s*\w+$/m, `status: ${newStatus}`);

    await fs.writeFile(specPath, content, 'utf-8');
  }

  // ==========================================================================
  // Test 1: Cache Refreshes After spec.md Status Change
  // ==========================================================================
  it('should refresh cache after manual spec.md status change (planning → active)', async () => {
    // Step 1: Create increment with status: planning
    await createIncrement('0001-test-increment', 'planning', {
      totalTasks: 5,
      completedTasks: 0
    });

    // Step 2: Update cache (should show 1 planning increment)
    await updater.update();
    let cache = await readCache();

    expect(cache).not.toBeNull();
    expect(cache!.openCount).toBe(1);
    expect(cache!.activeIncrements).toHaveLength(1);
    expect(cache!.activeIncrements[0].id).toBe('0001-test-increment');

    // Step 3: Manually change status to active (simulates direct edit)
    await updateSpecStatus('0001-test-increment', 'active');

    // Step 4: Update cache again (should still show 1 active increment)
    await updater.update();
    cache = await readCache();

    expect(cache).not.toBeNull();
    expect(cache!.openCount).toBe(1);
    expect(cache!.activeIncrements).toHaveLength(1);
    expect(cache!.activeIncrements[0].id).toBe('0001-test-increment');

    // Cache should be fresh (within last 5 seconds)
    const cacheAge = Date.now() - new Date(cache!.lastUpdate).getTime();
    expect(cacheAge).toBeLessThan(5000);
  });

  // ==========================================================================
  // Test 2: Cache Refreshes After Task Completion
  // ==========================================================================
  it('should refresh cache after tasks completed (progress changes)', async () => {
    // Step 1: Create increment with 5 tasks, 2 completed
    await createIncrement('0002-test-increment', 'active', {
      totalTasks: 5,
      completedTasks: 2
    });

    // Step 2: Update cache (should show 2/5 tasks)
    await updater.update();
    let cache = await readCache();

    expect(cache).not.toBeNull();
    expect(cache!.activeIncrements[0].completed).toBe(2);
    expect(cache!.activeIncrements[0].total).toBe(5);
    expect(cache!.activeIncrements[0].percentage).toBe(40);

    // Step 3: Complete 2 more tasks (simulates /specweave:do progress)
    await createIncrement('0002-test-increment', 'active', {
      totalTasks: 5,
      completedTasks: 4 // 2 → 4
    });

    // Step 4: Update cache (should show 4/5 tasks)
    await updater.update();
    cache = await readCache();

    expect(cache).not.toBeNull();
    expect(cache!.activeIncrements[0].completed).toBe(4);
    expect(cache!.activeIncrements[0].total).toBe(5);
    expect(cache!.activeIncrements[0].percentage).toBe(80);
  });

  // ==========================================================================
  // Test 3: Cache Shows Correct Increment After Multiple Status Changes
  // ==========================================================================
  it('should show correct active increment after multiple status changes', async () => {
    // Step 1: Create 3 increments with different statuses
    await createIncrement('0001-planning', 'planning', { created: '2025-11-15' });
    await createIncrement('0002-active', 'active', { created: '2025-11-16' });
    await createIncrement('0003-completed', 'completed', { created: '2025-11-17' });

    // Step 2: Update cache (should show 2 open increments: 0001, 0002)
    await updater.update();
    let cache = await readCache();

    expect(cache).not.toBeNull();
    expect(cache!.openCount).toBe(2); // planning + active
    expect(cache!.activeIncrements).toHaveLength(2);
    expect(cache!.activeIncrements[0].id).toBe('0001-planning'); // Oldest first
    expect(cache!.activeIncrements[1].id).toBe('0002-active');

    // Step 3: Complete 0001 (planning → completed)
    await updateSpecStatus('0001-planning', 'completed');

    // Step 4: Update cache (should show 1 open increment: 0002)
    await updater.update();
    cache = await readCache();

    expect(cache).not.toBeNull();
    expect(cache!.openCount).toBe(1); // Only 0002 active
    expect(cache!.activeIncrements).toHaveLength(1);
    expect(cache!.activeIncrements[0].id).toBe('0002-active');

    // Step 5: Activate 0003 (completed → active)
    await updateSpecStatus('0003-completed', 'active');

    // Step 6: Update cache (should show 2 open increments: 0002, 0003)
    await updater.update();
    cache = await readCache();

    expect(cache).not.toBeNull();
    expect(cache!.openCount).toBe(2); // 0002 + 0003
    expect(cache!.activeIncrements).toHaveLength(2);
    expect(cache!.activeIncrements[0].id).toBe('0002-active'); // Created first
    expect(cache!.activeIncrements[1].id).toBe('0003-completed'); // Created second
  });

  // ==========================================================================
  // Test 4: Cache Handles Resume (paused → active)
  // ==========================================================================
  it('should refresh cache when increment resumed (paused → active)', async () => {
    // Step 1: Create paused increment
    await createIncrement('0004-paused', 'paused', {
      totalTasks: 10,
      completedTasks: 5
    });

    // Step 2: Update cache (should show 0 active - paused is not open)
    await updater.update();
    let cache = await readCache();

    expect(cache).not.toBeNull();
    expect(cache!.openCount).toBe(0); // Paused is NOT open
    expect(cache!.activeIncrements).toHaveLength(0);
    expect(cache!.message).toBe('No active increments. Start with /specweave:increment "feature name"');

    // Step 3: Resume increment (paused → active)
    await updateSpecStatus('0004-paused', 'active');

    // Step 4: Update cache (should show 1 active increment)
    await updater.update();
    cache = await readCache();

    expect(cache).not.toBeNull();
    expect(cache!.openCount).toBe(1);
    expect(cache!.activeIncrements).toHaveLength(1);
    expect(cache!.activeIncrements[0].id).toBe('0004-paused');
    expect(cache!.activeIncrements[0].completed).toBe(5);
    expect(cache!.activeIncrements[0].total).toBe(10);
  });

  // ==========================================================================
  // Test 5: Cache Shows Default Message When No Active Increments
  // ==========================================================================
  it('should show helpful message when no active increments exist', async () => {
    // Step 1: Create only completed/paused increments
    await createIncrement('0001-completed', 'completed');
    await createIncrement('0002-paused', 'paused');

    // Step 2: Update cache (should show 0 active)
    await updater.update();
    const cache = await readCache();

    expect(cache).not.toBeNull();
    expect(cache!.openCount).toBe(0);
    expect(cache!.activeIncrements).toHaveLength(0);
    expect(cache!.message).toBe('No active increments. Start with /specweave:increment "feature name"');
    expect(cache!.current).toBeNull();
  });

  // ==========================================================================
  // Test 6: Cache Handles Multiple Active Increments (MAX = 2)
  // ==========================================================================
  it('should display up to 2 active increments (aligned with WIP limit)', async () => {
    // Step 1: Create 3 active increments
    await createIncrement('0001-first', 'active', { created: '2025-11-15', completedTasks: 2, totalTasks: 5 });
    await createIncrement('0002-second', 'active', { created: '2025-11-16', completedTasks: 3, totalTasks: 8 });
    await createIncrement('0003-third', 'active', { created: '2025-11-17', completedTasks: 1, totalTasks: 3 });

    // Step 2: Update cache (should show oldest 2: 0001, 0002)
    await updater.update();
    const cache = await readCache();

    expect(cache).not.toBeNull();
    expect(cache!.openCount).toBe(3); // Total open = 3
    expect(cache!.activeIncrements).toHaveLength(2); // Display only 2 (MAX)

    // Should show oldest 2 (by creation date)
    expect(cache!.activeIncrements[0].id).toBe('0001-first');
    expect(cache!.activeIncrements[0].completed).toBe(2);
    expect(cache!.activeIncrements[0].total).toBe(5);

    expect(cache!.activeIncrements[1].id).toBe('0002-second');
    expect(cache!.activeIncrements[1].completed).toBe(3);
    expect(cache!.activeIncrements[1].total).toBe(8);

    // Backward compatibility: 'current' should be first active
    expect(cache!.current).not.toBeNull();
    expect(cache!.current!.id).toBe('0001-first');
  });

  // ==========================================================================
  // Test 7: Cache Ignores _archive Directory
  // ==========================================================================
  it('should ignore increments in _archive directory', async () => {
    // Step 1: Create active increment
    await createIncrement('0001-active', 'active');

    // Step 2: Create archived increment (in _archive/)
    const archiveDir = path.join(testRoot, '.specweave/increments/_archive');
    await fs.ensureDir(archiveDir);
    await createIncrement('_archive/0002-archived', 'active'); // Even if status=active!

    // Step 3: Update cache (should show only 0001)
    await updater.update();
    const cache = await readCache();

    expect(cache).not.toBeNull();
    expect(cache!.openCount).toBe(1); // Only 0001
    expect(cache!.activeIncrements).toHaveLength(1);
    expect(cache!.activeIncrements[0].id).toBe('0001-active');
  });

  // ==========================================================================
  // Test 8: Cache Handles Missing tasks.md (Graceful Degradation)
  // ==========================================================================
  it('should handle missing tasks.md gracefully (shows 0/0 tasks)', async () => {
    // Step 1: Create increment with NO tasks.md
    const incrementDir = path.join(testRoot, '.specweave/increments/0001-no-tasks');
    await fs.ensureDir(incrementDir);

    const specContent = `---
increment: 0001-no-tasks
status: active
created: 2025-11-18
---

# Increment Without Tasks
`;

    await fs.writeFile(path.join(incrementDir, 'spec.md'), specContent, 'utf-8');
    // NOTE: No tasks.md created!

    // Step 2: Update cache (should not crash, show 0/0)
    await updater.update();
    const cache = await readCache();

    expect(cache).not.toBeNull();
    expect(cache!.activeIncrements).toHaveLength(1);
    expect(cache!.activeIncrements[0].id).toBe('0001-no-tasks');
    expect(cache!.activeIncrements[0].completed).toBe(0);
    expect(cache!.activeIncrements[0].total).toBe(0);
    expect(cache!.activeIncrements[0].percentage).toBe(0);
  });

  // ==========================================================================
  // Test 9: Performance - Update Completes Within 200ms
  // ==========================================================================
  it('should complete status line update within 200ms (UX requirement)', async () => {
    // Step 1: Create realistic scenario (2 active increments)
    await createIncrement('0001-first', 'active', { totalTasks: 20, completedTasks: 10 });
    await createIncrement('0002-second', 'active', { totalTasks: 15, completedTasks: 5 });

    // Step 2: Measure update time
    const startTime = Date.now();
    await updater.update();
    const duration = Date.now() - startTime;

    // Should complete within 200ms (acceptable for user-facing hook)
    expect(duration).toBeLessThan(200);

    // Verify cache was updated
    const cache = await readCache();
    expect(cache).not.toBeNull();
    expect(cache!.activeIncrements).toHaveLength(2);
  });

  // ==========================================================================
  // Test 10: Integration - Simulates user-prompt-submit.sh Hook Flow
  // ==========================================================================
  it('should prevent desync when user-prompt-submit.sh calls updater', async () => {
    // Scenario: User manually edits spec.md, then runs any command
    // The user-prompt-submit.sh hook should refresh cache BEFORE showing context

    // Step 1: Create increment with status: planning
    await createIncrement('0043-desync-fix', 'planning', {
      totalTasks: 24,
      completedTasks: 11
    });

    // Step 2: Initial cache update (shows planning)
    await updater.update();
    let cache = await readCache();
    expect(cache!.openCount).toBe(1);

    // Step 3: User manually edits spec.md (planning → active)
    await updateSpecStatus('0043-desync-fix', 'active');

    // Step 4: User runs ANY command (e.g., /specweave:progress)
    // user-prompt-submit.sh hook fires BEFORE command executes
    // Hook calls: bash "$HOOK_DIR/lib/update-status-line.sh"
    await updater.update(); // Simulates hook execution

    // Step 5: Cache should now show active status
    cache = await readCache();
    expect(cache).not.toBeNull();
    expect(cache!.openCount).toBe(1);
    expect(cache!.activeIncrements[0].id).toBe('0043-desync-fix');

    // Step 6: Verify context would show correct data
    // (In real hook, this is formatted as: "✓ Active: 0043-desync-fix (11/24 tasks, 45%)")
    expect(cache!.activeIncrements[0].completed).toBe(11);
    expect(cache!.activeIncrements[0].total).toBe(24);
    expect(cache!.activeIncrements[0].percentage).toBe(45);
  });
});
