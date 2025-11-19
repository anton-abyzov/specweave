import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { IncrementFactory } from '../test-utils/increment-factory.js';
import { MetadataManager } from '../../../src/core/increment/metadata-manager.js';
import { SpecFrontmatterUpdater } from '../../../src/core/increment/spec-frontmatter-updater.js';
import { IncrementStatus } from '../../../src/core/types/increment-metadata.js';

describe('Validation and Repair Workflow Integration', () => {
  let testRoot: string;
  let testCounter = 0;

  beforeEach(async () => {
    testCounter++;
    testRoot = path.join(
      os.tmpdir(),
      `repair-test-${Date.now()}-${testCounter}-${Math.random().toString(36).substring(7)}`
    );

    await fs.ensureDir(testRoot);

    vi.spyOn(process, 'cwd').mockReturnValue(testRoot);
  });

  afterEach(async () => {
    await fs.remove(testRoot);
    vi.restoreAllMocks();
  });

  it('detects and repairs existing desync', async () => {
    // PHASE 1: Create increment
    await IncrementFactory.create(testRoot, '0001-desynced', {
      status: 'active',
      title: 'Repair Test'
    });

    // PHASE 2: Manually create desync (update only metadata.json)
    const metadataPath = path.join(
      testRoot,
      '.specweave/increments/0001-desynced/metadata.json'
    );
    const metadata = await fs.readJSON(metadataPath);
    metadata.status = IncrementStatus.COMPLETED;
    await fs.writeJSON(metadataPath, metadata, { spaces: 2 });

    // PHASE 3: Verify desync exists
    const metadataStatus = MetadataManager.read('0001-desynced').status;
    const specStatus = await SpecFrontmatterUpdater.readStatus('0001-desynced');

    expect(metadataStatus).toBe(IncrementStatus.COMPLETED);
    expect(specStatus).toBe(IncrementStatus.ACTIVE);

    // PHASE 4: Repair desync
    await SpecFrontmatterUpdater.updateStatus(
      '0001-desynced',
      metadataStatus as IncrementStatus
    );

    // PHASE 5: Verify desync fixed
    const repairedSpecStatus = await SpecFrontmatterUpdater.readStatus('0001-desynced');
    expect(repairedSpecStatus).toBe(IncrementStatus.COMPLETED);

    // Verify both files now in sync
    const finalMetadata = MetadataManager.read('0001-desynced');
    expect(repairedSpecStatus).toBe(finalMetadata.status);
  });

  it('handles multiple desyncs in batch', async () => {
    // GIVEN: Create 5 desynced increments
    const incrementIds = ['0001', '0002', '0003', '0004', '0005'].map(
      id => `${id}-desynced`
    );

    for (const id of incrementIds) {
      await IncrementFactory.create(testRoot, id, {
        status: 'active',
        title: `Desync Test ${id}`
      });

      // Create desync
      const metadataPath = path.join(
        testRoot,
        `.specweave/increments/${id}/metadata.json`
      );
      const metadata = await fs.readJSON(metadataPath);
      metadata.status = IncrementStatus.COMPLETED;
      await fs.writeJSON(metadataPath, metadata, { spaces: 2 });
    }

    // Verify all are desynced
    for (const id of incrementIds) {
      const metadataStatus = MetadataManager.read(id).status;
      const specStatus = await SpecFrontmatterUpdater.readStatus(id);
      expect(metadataStatus).toBe(IncrementStatus.COMPLETED);
      expect(specStatus).toBe(IncrementStatus.ACTIVE);
    }

    // WHEN: Repair all
    for (const id of incrementIds) {
      const metadataStatus = MetadataManager.read(id).status;
      await SpecFrontmatterUpdater.updateStatus(
        id,
        metadataStatus as IncrementStatus
      );
    }

    // THEN: All repaired
    for (const id of incrementIds) {
      const specStatus = await SpecFrontmatterUpdater.readStatus(id);
      const metadata = MetadataManager.read(id);
      expect(specStatus).toBe(IncrementStatus.COMPLETED);
      expect(specStatus).toBe(metadata.status);
    }
  });

  it('handles validation of in-sync increments', async () => {
    // GIVEN: Increments that are already in sync
    await IncrementFactory.create(testRoot, '0001-synced', {
      status: 'active',
      title: 'Synced Increment'
    });

    // Use MetadataManager to ensure both files updated
    MetadataManager.updateStatus('0001-synced', IncrementStatus.COMPLETED);

    // WHEN: Validate (both files should be in sync)
    const metadataStatus = MetadataManager.read('0001-synced').status;
    const specStatus = await SpecFrontmatterUpdater.readStatus('0001-synced');

    // THEN: No desync detected
    expect(specStatus).toBe(metadataStatus);
    expect(specStatus).toBe(IncrementStatus.COMPLETED);
  });
});
