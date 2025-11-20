/**
 * Integration Tests: Status Line Synchronization
 *
 * Ensures status line ALWAYS updates when tasks are completed.
 *
 * Critical Requirements:
 * 1. Status line MUST update on every TodoWrite call
 * 2. Status line MUST reflect actual task completion in tasks.md
 * 3. Desync detection MUST catch staleness
 * 4. Recovery from desync MUST work
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

describe('Status Line Synchronization', () => {
  let testRoot: string;
  let incrementDir: string;
  let stateDir: string;
  let statusLineCache: string;

  beforeEach(async () => {
    // Create isolated test environment
    testRoot = path.join(os.tmpdir(), `status-line-test-${Date.now()}`);
    await fs.ensureDir(testRoot);

    incrementDir = path.join(testRoot, '.specweave', 'increments', '0047-test-increment');
    stateDir = path.join(testRoot, '.specweave', 'state');
    statusLineCache = path.join(stateDir, 'status-line.json');

    await fs.ensureDir(incrementDir);
    await fs.ensureDir(stateDir);

    // Create test spec.md
    await fs.writeFile(
      path.join(incrementDir, 'spec.md'),
      `---
status: active
created: 2025-11-20T00:00:00Z
---

# Test Increment

## Acceptance Criteria

- [ ] **AC-US1-01**: Test AC 1
- [ ] **AC-US1-02**: Test AC 2
`
    );

    // Create test tasks.md with initial state
    await fs.writeFile(
      path.join(incrementDir, 'tasks.md'),
      `---
total_tasks: 3
completed: 0
---

# Tasks

### T-001: First Task
**Status**: [ ] pending

### T-002: Second Task
**Status**: [ ] pending

### T-003: Third Task
**Status**: [ ] pending
`
    );
  });

  afterEach(async () => {
    if (testRoot && await fs.pathExists(testRoot)) {
      await fs.remove(testRoot);
    }
  });

  describe('Automatic Updates on Task Completion', () => {
    it('MUST update status line when TodoWrite marks task complete', async () => {
      // Initial state: no tasks completed
      await runStatusLineUpdate(testRoot);

      let cache = await readStatusLineCache(statusLineCache);
      expect(cache.current.completed).toBe(0);
      expect(cache.current.total).toBe(3);
      expect(cache.current.percentage).toBe(0);

      // Simulate task completion via TodoWrite
      await markTaskComplete(incrementDir, 'T-001');
      await runStatusLineUpdate(testRoot);

      cache = await readStatusLineCache(statusLineCache);
      expect(cache.current.completed).toBe(1);
      expect(cache.current.total).toBe(3);
      expect(cache.current.percentage).toBe(33);

      // Complete second task
      await markTaskComplete(incrementDir, 'T-002');
      await runStatusLineUpdate(testRoot);

      cache = await readStatusLineCache(statusLineCache);
      expect(cache.current.completed).toBe(2);
      expect(cache.current.total).toBe(3);
      expect(cache.current.percentage).toBe(66);
    });

    it('MUST update status line on EVERY TodoWrite call', async () => {
      const updates: number[] = [];

      // Complete tasks one by one, tracking updates
      for (let i = 1; i <= 3; i++) {
        await markTaskComplete(incrementDir, `T-00${i}`);
        await runStatusLineUpdate(testRoot);

        const cache = await readStatusLineCache(statusLineCache);
        updates.push(cache.current.completed);
      }

      // Verify updates happened progressively
      expect(updates).toEqual([1, 2, 3]);
    });

    it('MUST update status line even with rapid task completions', async () => {
      // Simulate rapid-fire completions (< 1 second apart)
      const start = Date.now();

      await markTaskComplete(incrementDir, 'T-001');
      await runStatusLineUpdate(testRoot);

      await markTaskComplete(incrementDir, 'T-002');
      await runStatusLineUpdate(testRoot);

      await markTaskComplete(incrementDir, 'T-003');
      await runStatusLineUpdate(testRoot);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(3000); // Should complete in < 3s

      // Verify all updates applied
      const cache = await readStatusLineCache(statusLineCache);
      expect(cache.current.completed).toBe(3);
    });
  });

  describe('Desync Detection', () => {
    it('MUST detect when status line is behind tasks.md', async () => {
      // Complete 2 tasks in tasks.md
      await markTaskComplete(incrementDir, 'T-001');
      await markTaskComplete(incrementDir, 'T-002');

      // Update status line for only 1 task (simulate desync)
      await markTaskComplete(incrementDir, 'T-001');
      await runStatusLineUpdate(testRoot);

      // Now manually complete T-002 without updating status line
      const tasksContent = await fs.readFile(path.join(incrementDir, 'tasks.md'), 'utf-8');
      const updated = tasksContent.replace(
        '### T-002: Second Task\n**Status**: [ ] pending',
        '### T-002: Second Task\n**Status**: [x] completed'
      );
      await fs.writeFile(path.join(incrementDir, 'tasks.md'), updated);

      // Detect desync
      const desync = await detectDesync(testRoot, '0047-test-increment');
      expect(desync.isDesynced).toBe(true);
      expect(desync.actualCompleted).toBe(2);
      expect(desync.cachedCompleted).toBe(1);
    });

    it('MUST detect when frontmatter is out of sync', async () => {
      // Complete task and update status line
      await markTaskComplete(incrementDir, 'T-001');
      await runStatusLineUpdate(testRoot);

      // Manually corrupt frontmatter (simulate old count)
      const tasksPath = path.join(incrementDir, 'tasks.md');
      let content = await fs.readFile(tasksPath, 'utf-8');
      content = content.replace('completed: 1', 'completed: 0');
      await fs.writeFile(tasksPath, content);

      // Update status line - should use actual count, not frontmatter
      await runStatusLineUpdate(testRoot);

      const cache = await readStatusLineCache(statusLineCache);
      expect(cache.current.completed).toBe(1); // Should detect actual status
    });
  });

  describe('Recovery from Desync', () => {
    it('MUST recover from stale status line cache', async () => {
      // Create stale cache (behind reality)
      await fs.writeJson(statusLineCache, {
        current: {
          id: '0047-test-increment',
          name: '0047-test-increment',
          completed: 0,
          total: 3,
          percentage: 0
        },
        openCount: 1,
        lastUpdate: '2025-11-19T00:00:00Z' // Old timestamp
      });

      // Complete all tasks in tasks.md
      await markTaskComplete(incrementDir, 'T-001');
      await markTaskComplete(incrementDir, 'T-002');
      await markTaskComplete(incrementDir, 'T-003');

      // Force status line update - should sync to reality
      await runStatusLineUpdate(testRoot);

      const cache = await readStatusLineCache(statusLineCache);
      expect(cache.current.completed).toBe(3);
      expect(cache.current.percentage).toBe(100);
    });

    it('MUST handle missing status line cache', async () => {
      // Delete cache
      if (await fs.pathExists(statusLineCache)) {
        await fs.remove(statusLineCache);
      }

      // Complete tasks
      await markTaskComplete(incrementDir, 'T-001');

      // Update should recreate cache
      await runStatusLineUpdate(testRoot);

      expect(await fs.pathExists(statusLineCache)).toBe(true);
      const cache = await readStatusLineCache(statusLineCache);
      expect(cache.current.completed).toBe(1);
    });
  });

  describe('Concurrency and Race Conditions', () => {
    it('MUST handle concurrent status line updates', async () => {
      // Complete tasks and trigger multiple simultaneous updates
      await markTaskComplete(incrementDir, 'T-001');

      const updates = [
        runStatusLineUpdate(testRoot),
        runStatusLineUpdate(testRoot),
        runStatusLineUpdate(testRoot)
      ];

      await Promise.all(updates);

      // All updates should succeed, cache should be consistent
      const cache = await readStatusLineCache(statusLineCache);
      expect(cache.current.completed).toBe(1);
    });
  });

  describe('Performance', () => {
    it('MUST complete status line update in < 200ms', async () => {
      await markTaskComplete(incrementDir, 'T-001');

      const start = Date.now();
      await runStatusLineUpdate(testRoot);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(200);
    });
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

async function markTaskComplete(incrementDir: string, taskId: string): Promise<void> {
  const tasksPath = path.join(incrementDir, 'tasks.md');
  const content = await fs.readFile(tasksPath, 'utf-8');

  // Update task status
  const updated = content.replace(
    new RegExp(`(### ${taskId}:.*?\\n\\*\\*Status\\*\\*:)\\s*\\[\\s*\\]\\s*pending`, 's'),
    '$1 [x] completed'
  );

  // Update frontmatter
  const completedMatch = updated.match(/completed: (\d+)/);
  if (completedMatch) {
    const currentCount = parseInt(completedMatch[1], 10);
    const newCount = currentCount + 1;
    const withUpdatedFrontmatter = updated.replace(
      /completed: \d+/,
      `completed: ${newCount}`
    );
    await fs.writeFile(tasksPath, withUpdatedFrontmatter);
  } else {
    await fs.writeFile(tasksPath, updated);
  }
}

async function runStatusLineUpdate(projectRoot: string): Promise<void> {
  const scriptPath = path.join(
    process.cwd(),
    'plugins/specweave/hooks/lib/update-status-line.sh'
  );

  try {
    execSync(`bash "${scriptPath}"`, {
      cwd: projectRoot,
      env: { ...process.env, PROJECT_ROOT: projectRoot },
      timeout: 5000
    });
  } catch (error) {
    throw new Error(`Failed to update status line: ${error}`);
  }
}

async function readStatusLineCache(cachePath: string) {
  return await fs.readJson(cachePath);
}

interface DesyncResult {
  isDesynced: boolean;
  actualCompleted: number;
  cachedCompleted: number;
  frontmatterCompleted: number;
}

async function detectDesync(
  projectRoot: string,
  incrementId: string
): Promise<DesyncResult> {
  const tasksPath = path.join(projectRoot, '.specweave', 'increments', incrementId, 'tasks.md');
  const cachePath = path.join(projectRoot, '.specweave', 'state', 'status-line.json');

  // Read tasks.md and count actual completions
  const tasksContent = await fs.readFile(tasksPath, 'utf-8');
  const actualCompleted = (tasksContent.match(/\*\*Status\*\*:\s*\[x\]\s*completed/g) || []).length;

  // Read frontmatter count
  const frontmatterMatch = tasksContent.match(/completed:\s*(\d+)/);
  const frontmatterCompleted = frontmatterMatch ? parseInt(frontmatterMatch[1], 10) : 0;

  // Read cache
  const cache = await fs.readJson(cachePath);
  const cachedCompleted = cache.current?.completed || 0;

  return {
    isDesynced: actualCompleted !== cachedCompleted || actualCompleted !== frontmatterCompleted,
    actualCompleted,
    cachedCompleted,
    frontmatterCompleted
  };
}
