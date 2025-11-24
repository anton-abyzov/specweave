import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FeatureDeleter } from '../../../src/core/feature-deleter/index.js';
import { DeletionOptions, DeletionResult } from '../../../src/core/feature-deleter/types.js';
import { consoleLogger } from '../../../src/utils/logger.js';
import os from 'os';
import fs from 'fs/promises';
import path from 'path';

describe('FeatureDeleter - End-to-End Integration Tests (T-001)', () => {
  let testDir: string;
  let deleter: FeatureDeleter;

  beforeEach(async () => {
    // Create isolated test directory in OS temp
    testDir = path.join(os.tmpdir(), `feature-deleter-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Create project structure
    await fs.mkdir(path.join(testDir, '.specweave/increments'), { recursive: true });
    await fs.mkdir(path.join(testDir, '.specweave/docs/internal/specs/_features/FS-052'), { recursive: true });
    await fs.mkdir(path.join(testDir, '.specweave/docs/internal/specs/specweave/FS-052'), { recursive: true });

    // Create feature files
    await fs.writeFile(
      path.join(testDir, '.specweave/docs/internal/specs/_features/FS-052/FEATURE.md'),
      '# Feature FS-052'
    );
    await fs.writeFile(
      path.join(testDir, '.specweave/docs/internal/specs/specweave/FS-052/us-001-test.md'),
      '# User Story 001'
    );

    deleter = new FeatureDeleter({ projectRoot: testDir, logger: consoleLogger });
  });

  afterEach(async () => {
    // Cleanup test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('testSafeDeletionBlockedByActiveIncrement', () => {
    it('should block deletion when active increment references feature', async () => {
      // GIVEN: Feature FS-052 with active increment 0003 referencing it
      const incrementDir = path.join(testDir, '.specweave/increments/0003-active-increment');
      await fs.mkdir(incrementDir, { recursive: true });
      await fs.writeFile(
        path.join(incrementDir, 'metadata.json'),
        JSON.stringify({
          id: '0003-active-increment',
          status: 'in-progress',
          feature_id: 'FS-052'
        })
      );

      const featureId = 'FS-052';
      const options: DeletionOptions = { force: false, dryRun: true };

      // WHEN: Deletion executes in safe mode (dry-run to avoid actual deletion)
      const result: DeletionResult = await deleter.execute(featureId, options);

      // THEN: Deletion should be blocked
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
      expect(result.errors?.[0]).toMatch(/active increment/i);
      expect(result.orphanedIncrements).toContain('0003-active-increment');
    });
  });

  describe('testSafeDeletionSucceedsWithNoActiveIncrements', () => {
    it('should allow deletion when no active increments reference feature', async () => {
      // GIVEN: Feature FS-052 with completed increment (safe to delete)
      const incrementDir = path.join(testDir, '.specweave/increments/0003-completed-increment');
      await fs.mkdir(incrementDir, { recursive: true });
      await fs.writeFile(
        path.join(incrementDir, 'metadata.json'),
        JSON.stringify({
          id: '0003-completed-increment',
          status: 'completed',
          feature_id: 'FS-052'
        })
      );

      const featureId = 'FS-052';
      const options: DeletionOptions = { force: false, dryRun: true };

      // WHEN: Deletion executes in safe mode (dry-run)
      const result: DeletionResult = await deleter.execute(featureId, options);

      // THEN: Validation should pass (dry-run shows success without actual deletion)
      expect(result.success).toBe(true);
      expect(result.featureId).toBe('FS-052');
      expect(result.filesDeleted).toBe(0); // Dry-run doesn't delete files
    });
  });
});
