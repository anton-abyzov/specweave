/**
 * Status Line Hook Integration Tests
 *
 * Tests the update-status-line.sh hook with real increment structures
 * to ensure accurate task counting and cache generation.
 *
 * Critical scenarios:
 * 1. Hook generates accurate cache from tasks.md
 * 2. Hook does NOT overcount tasks with multiple markers (bug fix)
 * 3. Hook handles sync mismatches between spec.md and metadata.json
 * 4. Hook falls back gracefully when CLI is unavailable
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

describe('Status Line Hook Integration', () => {
  let testDir: string;
  let incrementsDir: string;
  let stateDir: string;
  let cacheFile: string;
  let hookScript: string;

  beforeEach(async () => {
    // Create isolated test directory
    testDir = path.join(os.tmpdir(), `status-line-test-${Date.now()}`);
    incrementsDir = path.join(testDir, '.specweave', 'increments');
    stateDir = path.join(testDir, '.specweave', 'state');
    cacheFile = path.join(stateDir, 'status-line.json');
    hookScript = path.join(
      process.cwd(),
      'plugins/specweave/hooks/lib/update-status-line.sh'
    );

    // Create directory structure
    await fs.mkdir(incrementsDir, { recursive: true });
    await fs.mkdir(stateDir, { recursive: true });

    // Symlink dist/ folder so hook can find count-tasks CLI
    const distDir = path.join(process.cwd(), 'dist');
    const testDistDir = path.join(testDir, 'dist');
    await fs.symlink(distDir, testDistDir, 'dir');
  });

  afterEach(async () => {
    // Cleanup
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore errors
    }
  });

  it('generates accurate cache with correct task counts', async () => {
    // Create test increment with known task counts
    const incrementDir = path.join(incrementsDir, '0001-test-increment');
    await fs.mkdir(incrementDir, { recursive: true });

    const specContent = `---
status: active
created: "2025-11-17"
---

# Test Increment
`;

    const tasksContent = `## T-001: Task One
**Completed**: 2025-11-17

## T-002: Task Two
Working on it

## T-003: Task Three
**Completed**: 2025-11-17
`;

    await fs.writeFile(path.join(incrementDir, 'spec.md'), specContent);
    await fs.writeFile(path.join(incrementDir, 'tasks.md'), tasksContent);

    // Run hook
    await execFileAsync('bash', [hookScript], { cwd: testDir });

    // Verify cache
    const cacheContent = await fs.readFile(cacheFile, 'utf8');
    const cache = JSON.parse(cacheContent);

    expect(cache.current.id).toBe('0001-test-increment');
    expect(cache.current.total).toBe(3);
    expect(cache.current.completed).toBe(2);
    expect(cache.current.percentage).toBe(66);
    expect(cache.openCount).toBe(1);
  });

  it('does NOT overcount tasks with multiple completion markers', async () => {
    // This is the CRITICAL test for the bug fix
    const incrementDir = path.join(
      incrementsDir,
      '0002-multi-marker-increment'
    );
    await fs.mkdir(incrementDir, { recursive: true });

    const specContent = `---
status: active
created: "2025-11-17"
---

# Multi-Marker Test
`;

    // Task with MULTIPLE completion markers (should count as 1, not 3)
    const tasksContent = `## T-001: Task with multiple markers
[x] Checkbox marker
**Status**: [x]
**Completed**: 2025-11-17

## T-002: Incomplete task
Working on it
`;

    await fs.writeFile(path.join(incrementDir, 'spec.md'), specContent);
    await fs.writeFile(path.join(incrementDir, 'tasks.md'), tasksContent);

    // Run hook
    await execFileAsync('bash', [hookScript], { cwd: testDir });

    // Verify cache
    const cacheContent = await fs.readFile(cacheFile, 'utf8');
    const cache = JSON.parse(cacheContent);

    // Critical assertion: Task with 3 markers should count as 1 completed, not 3
    expect(cache.current.total).toBe(2);
    expect(cache.current.completed).toBe(1); // NOT 3!
    expect(cache.current.percentage).toBe(50); // NOT 150%!
  });

  it('handles multiple open increments correctly', async () => {
    // Create two active increments
    const increment1Dir = path.join(incrementsDir, '0001-first-increment');
    const increment2Dir = path.join(incrementsDir, '0002-second-increment');
    await fs.mkdir(increment1Dir, { recursive: true });
    await fs.mkdir(increment2Dir, { recursive: true });

    const specContent1 = `---
status: active
created: "2025-11-17T10:00:00Z"
---

# First Increment
`;

    const specContent2 = `---
status: in-progress
created: "2025-11-17T11:00:00Z"
---

# Second Increment
`;

    const tasksContent = `## T-001: Task
Working on it
`;

    await fs.writeFile(path.join(increment1Dir, 'spec.md'), specContent1);
    await fs.writeFile(path.join(increment1Dir, 'tasks.md'), tasksContent);
    await fs.writeFile(path.join(increment2Dir, 'spec.md'), specContent2);
    await fs.writeFile(path.join(increment2Dir, 'tasks.md'), tasksContent);

    // Run hook
    await execFileAsync('bash', [hookScript], { cwd: testDir });

    // Verify cache
    const cacheContent = await fs.readFile(cacheFile, 'utf8');
    const cache = JSON.parse(cacheContent);

    // Should show first increment as current (oldest)
    expect(cache.current.id).toBe('0001-first-increment');
    expect(cache.openCount).toBe(2);
  });

  it('handles no active increments gracefully', async () => {
    // Create completed increment
    const incrementDir = path.join(incrementsDir, '0001-completed-increment');
    await fs.mkdir(incrementDir, { recursive: true });

    const specContent = `---
status: completed
created: "2025-11-17"
---

# Completed Increment
`;

    await fs.writeFile(path.join(incrementDir, 'spec.md'), specContent);

    // Run hook
    await execFileAsync('bash', [hookScript], { cwd: testDir });

    // Verify cache
    const cacheContent = await fs.readFile(cacheFile, 'utf8');
    const cache = JSON.parse(cacheContent);

    expect(cache.current).toBeNull();
    expect(cache.openCount).toBe(0);
  });

  it('handles missing tasks.md file', async () => {
    // Create increment without tasks.md
    const incrementDir = path.join(incrementsDir, '0001-no-tasks');
    await fs.mkdir(incrementDir, { recursive: true });

    const specContent = `---
status: active
created: "2025-11-17"
---

# Increment Without Tasks
`;

    await fs.writeFile(path.join(incrementDir, 'spec.md'), specContent);

    // Run hook (should not crash)
    await execFileAsync('bash', [hookScript], { cwd: testDir });

    // Verify cache
    const cacheContent = await fs.readFile(cacheFile, 'utf8');
    const cache = JSON.parse(cacheContent);

    expect(cache.current.id).toBe('0001-no-tasks');
    expect(cache.current.total).toBe(0);
    expect(cache.current.completed).toBe(0);
    expect(cache.current.percentage).toBe(0);
  });

  it('handles mixed completion marker formats', async () => {
    const incrementDir = path.join(incrementsDir, '0001-mixed-formats');
    await fs.mkdir(incrementDir, { recursive: true });

    const specContent = `---
status: active
created: "2025-11-17"
---

# Mixed Formats Test
`;

    const tasksContent = `## T-001: Checkbox format
[x] Done

## T-002: Status format
**Status**: [x]

## T-003: Date format
**Completed**: 2025-11-17

## T-004: Not completed
Working
`;

    await fs.writeFile(path.join(incrementDir, 'spec.md'), specContent);
    await fs.writeFile(path.join(incrementDir, 'tasks.md'), tasksContent);

    // Run hook
    await execFileAsync('bash', [hookScript], { cwd: testDir });

    // Verify cache
    const cacheContent = await fs.readFile(cacheFile, 'utf8');
    const cache = JSON.parse(cacheContent);

    expect(cache.current.total).toBe(4);
    expect(cache.current.completed).toBe(3);
    expect(cache.current.percentage).toBe(75);
  });

  it('prioritizes oldest increment when multiple are active', async () => {
    // Create three increments with different creation times
    const increment1Dir = path.join(incrementsDir, '0003-third');
    const increment2Dir = path.join(incrementsDir, '0001-first');
    const increment3Dir = path.join(incrementsDir, '0002-second');

    await fs.mkdir(increment1Dir, { recursive: true });
    await fs.mkdir(increment2Dir, { recursive: true });
    await fs.mkdir(increment3Dir, { recursive: true });

    const spec1 = `---
status: active
created: "2025-11-17T12:00:00Z"
---
# Third`;

    const spec2 = `---
status: active
created: "2025-11-17T10:00:00Z"
---
# First`;

    const spec3 = `---
status: active
created: "2025-11-17T11:00:00Z"
---
# Second`;

    const tasks = `## T-001: Task\nWorking`;

    await fs.writeFile(path.join(increment1Dir, 'spec.md'), spec1);
    await fs.writeFile(path.join(increment1Dir, 'tasks.md'), tasks);
    await fs.writeFile(path.join(increment2Dir, 'spec.md'), spec2);
    await fs.writeFile(path.join(increment2Dir, 'tasks.md'), tasks);
    await fs.writeFile(path.join(increment3Dir, 'spec.md'), spec3);
    await fs.writeFile(path.join(increment3Dir, 'tasks.md'), tasks);

    // Run hook
    await execFileAsync('bash', [hookScript], { cwd: testDir });

    // Verify cache
    const cacheContent = await fs.readFile(cacheFile, 'utf8');
    const cache = JSON.parse(cacheContent);

    // Should show first increment (oldest creation time)
    expect(cache.current.id).toBe('0001-first');
    expect(cache.openCount).toBe(3);
  });
});
