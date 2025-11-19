import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { HookTestHarness } from '../test-utils/hook-test-harness.js';
import { IncrementFactory } from '../test-utils/increment-factory.js';
import { SpecValidator } from '../test-utils/spec-validator.js';
import { MetadataManager } from '../../../src/core/increment/metadata-manager.js';
import { SpecFrontmatterUpdater } from '../../../src/core/increment/spec-frontmatter-updater.js';
import { IncrementStatus } from '../../../src/core/types/increment-metadata.js';

describe('Status Line Hook Integration', () => {
  let testRoot: string;
  let harness: HookTestHarness;
  let testCounter = 0;
  let originalCwd: string;

  beforeEach(async () => {
    testCounter++;
    testRoot = path.join(
      os.tmpdir(),
      `status-line-test-${Date.now()}-${testCounter}-${Math.random().toString(36).substring(7)}`
    );

    await fs.ensureDir(testRoot);
    await fs.ensureDir(path.join(testRoot, '.specweave/state'));

    const hookPath = path.join(
      process.cwd(),
      'plugins/specweave/hooks/lib/update-status-line.sh'
    );

    harness = new HookTestHarness(testRoot, hookPath);

    // Mock process.cwd() to return testRoot
    originalCwd = process.cwd();
    vi.spyOn(process, 'cwd').mockReturnValue(testRoot);
  });

  afterEach(async () => {
    await fs.remove(testRoot);
    vi.restoreAllMocks();
  });

  it('reads status from spec.md after updateStatus()', async () => {
    // GIVEN: Active increment
    await IncrementFactory.create(testRoot, '0001-test', {
      status: 'active',
      title: 'Test Increment'
    });

    // WHEN: Close increment via MetadataManager
    MetadataManager.updateStatus('0001-test', IncrementStatus.COMPLETED);

    // AND: Execute status line hook
    const result = await harness.execute();

    // THEN: Hook reads "completed" from spec.md
    expect(result.exitCode).toBe(0);

    // AND: Status line cache shows no active increments
    const statusLine = await harness.readStatusLine();
    expect(statusLine).toEqual({
      current: null,
      openCount: 0,
      lastUpdate: expect.any(String)
    });

    // AND: Verify spec.md actually updated
    const specStatus = await SpecFrontmatterUpdater.readStatus('0001-test');
    expect(specStatus).toBe(IncrementStatus.COMPLETED);
  });

  it('excludes completed increments from status line', async () => {
    // GIVEN: Two increments (one active, one will be completed)
    await IncrementFactory.create(testRoot, '0001-test', {
      status: 'active',
      title: 'First Increment'
    });
    await IncrementFactory.create(testRoot, '0002-active', {
      status: 'active',
      title: 'Second Increment'
    });

    // WHEN: Close first increment
    MetadataManager.updateStatus('0001-test', IncrementStatus.COMPLETED);

    // AND: Execute hook
    await harness.execute();

    // THEN: Only second increment shown
    const statusLine = await harness.readStatusLine();
    expect(statusLine?.current).toMatchObject({ id: '0002-active' });
    expect(statusLine?.openCount).toBe(1);
  });

  it('handles missing spec.md gracefully', async () => {
    // GIVEN: Increment with missing spec.md
    await IncrementFactory.create(testRoot, '0001-test', {
      status: 'active',
      title: 'Test'
    });
    await fs.remove(
      path.join(testRoot, '.specweave/increments/0001-test/spec.md')
    );

    // WHEN: Execute hook
    const result = await harness.execute();

    // THEN: Hook doesn't crash
    expect(result.exitCode).toBe(0);

    // AND: Status line shows no increments
    const statusLine = await harness.readStatusLine();
    expect(statusLine?.current).toBeNull();
  });

  it('hook execution completes in < 500ms with 10 increments', async () => {
    // GIVEN: 10 active increments (stress test)
    for (let i = 1; i <= 10; i++) {
      const id = `000${i}-test`.slice(-9); // Ensure proper formatting
      await IncrementFactory.create(
        testRoot,
        id,
        {
          status: 'active',
          title: `Test ${i}`
        }
      );
    }

    // WHEN: Execute hook
    const result = await harness.execute();

    // THEN: Performance target met
    expect(result.exitCode).toBe(0);
    expect(result.duration).toBeLessThan(500);
  });
});
