import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { IncrementFactory } from '../test-utils/increment-factory.js';
import { HookTestHarness } from '../test-utils/hook-test-harness.js';
import { MetadataManager } from '../../../src/core/increment/metadata-manager.js';
import { SpecFrontmatterUpdater } from '../../../src/core/increment/spec-frontmatter-updater.js';
import { IncrementStatus } from '../../../src/core/types/increment-metadata.js';

describe('Full Increment Lifecycle Integration', () => {
  let testRoot: string;
  let testCounter = 0;

  beforeEach(async () => {
    testCounter++;
    testRoot = path.join(
      os.tmpdir(),
      `lifecycle-test-${Date.now()}-${testCounter}-${Math.random().toString(36).substring(7)}`
    );

    await fs.ensureDir(testRoot);
    await fs.ensureDir(path.join(testRoot, '.specweave/state'));

    vi.spyOn(process, 'cwd').mockReturnValue(testRoot);
  });

  afterEach(async () => {
    await fs.remove(testRoot);
    vi.restoreAllMocks();
  });

  it('completes full workflow: create → work → close → verify', async () => {
    // PHASE 1: Create increment (planning state)
    await IncrementFactory.create(testRoot, '0001-test', {
      status: 'planning',
      title: 'Test Feature'
    });

    let specStatus = await SpecFrontmatterUpdater.readStatus('0001-test');
    expect(specStatus).toBe(IncrementStatus.PLANNING);

    let metadata = MetadataManager.read('0001-test');
    expect(metadata.status).toBe(IncrementStatus.PLANNING);

    // PHASE 2: Start work (activate)
    MetadataManager.updateStatus('0001-test', IncrementStatus.ACTIVE);

    specStatus = await SpecFrontmatterUpdater.readStatus('0001-test');
    expect(specStatus).toBe(IncrementStatus.ACTIVE);

    metadata = MetadataManager.read('0001-test');
    expect(metadata.status).toBe(IncrementStatus.ACTIVE);

    // PHASE 3: Complete work
    MetadataManager.updateStatus('0001-test', IncrementStatus.COMPLETED);

    specStatus = await SpecFrontmatterUpdater.readStatus('0001-test');
    expect(specStatus).toBe(IncrementStatus.COMPLETED);

    metadata = MetadataManager.read('0001-test');
    expect(metadata.status).toBe(IncrementStatus.COMPLETED);

    // PHASE 4: Verify both files in sync
    expect(specStatus).toBe(metadata.status);
  });

  it('handles multi-increment workflow correctly', async () => {
    // GIVEN: Create 3 increments
    await IncrementFactory.create(testRoot, '0001-first', {
      status: 'active',
      title: 'First Feature'
    });
    await IncrementFactory.create(testRoot, '0002-second', {
      status: 'active',
      title: 'Second Feature'
    });
    await IncrementFactory.create(testRoot, '0003-third', {
      status: 'active',
      title: 'Third Feature'
    });

    // Verify all start in sync
    for (const id of ['0001-first', '0002-second', '0003-third']) {
      const specStatus = await SpecFrontmatterUpdater.readStatus(id);
      const metadata = MetadataManager.read(id);
      expect(specStatus).toBe(metadata.status);
      expect(specStatus).toBe(IncrementStatus.ACTIVE);
    }

    // WHEN: Complete first increment
    MetadataManager.updateStatus('0001-first', IncrementStatus.COMPLETED);

    let specStatus = await SpecFrontmatterUpdater.readStatus('0001-first');
    let metadata = MetadataManager.read('0001-first');
    expect(specStatus).toBe(IncrementStatus.COMPLETED);
    expect(metadata.status).toBe(IncrementStatus.COMPLETED);

    // WHEN: Complete second increment
    MetadataManager.updateStatus('0002-second', IncrementStatus.COMPLETED);

    specStatus = await SpecFrontmatterUpdater.readStatus('0002-second');
    metadata = MetadataManager.read('0002-second');
    expect(specStatus).toBe(IncrementStatus.COMPLETED);
    expect(metadata.status).toBe(IncrementStatus.COMPLETED);

    // WHEN: Complete third increment
    MetadataManager.updateStatus('0003-third', IncrementStatus.COMPLETED);

    specStatus = await SpecFrontmatterUpdater.readStatus('0003-third');
    metadata = MetadataManager.read('0003-third');
    expect(specStatus).toBe(IncrementStatus.COMPLETED);
    expect(metadata.status).toBe(IncrementStatus.COMPLETED);
  });

  it('handles pause workflow', async () => {
    // GIVEN: Active increment
    await IncrementFactory.create(testRoot, '0001-pausable', {
      status: 'active',
      title: 'Pausable Feature'
    });

    // WHEN: Pause increment
    MetadataManager.updateStatus('0001-pausable', IncrementStatus.PAUSED, 'Blocked by dependency');

    // THEN: Status updated in both files
    const metadata = MetadataManager.read('0001-pausable');
    expect(metadata.status).toBe(IncrementStatus.PAUSED);
    expect(metadata.pausedReason).toBe('Blocked by dependency');

    const specStatus = await SpecFrontmatterUpdater.readStatus('0001-pausable');
    expect(specStatus).toBe(IncrementStatus.PAUSED);

    // Verify both files in sync
    expect(specStatus).toBe(metadata.status);
  });
});
