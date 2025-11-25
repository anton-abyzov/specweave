/**
 * Feature Consistency Validator Tests
 *
 * Tests for detecting and repairing discrepancies between
 * _features/ and project folders.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { FeatureConsistencyValidator } from '../../../src/core/living-docs/feature-consistency-validator.js';

describe('FeatureConsistencyValidator', () => {
  let testDir: string;
  let specsDir: string;
  let featuresDir: string;
  let projectDir: string;

  beforeEach(async () => {
    // Create temp directory for tests
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fcv-test-'));
    specsDir = path.join(testDir, '.specweave/docs/internal/specs');
    featuresDir = path.join(specsDir, '_features');
    projectDir = path.join(specsDir, 'specweave');

    // Create directory structure
    await fs.mkdir(featuresDir, { recursive: true });
    await fs.mkdir(projectDir, { recursive: true });
  });

  afterEach(async () => {
    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('validate()', () => {
    it('should return empty discrepancies when folders are consistent', async () => {
      // Setup: Create consistent folders
      const featureId = 'FS-001';

      // Create _features/FS-001/FEATURE.md
      await fs.mkdir(path.join(featuresDir, featureId), { recursive: true });
      await fs.writeFile(
        path.join(featuresDir, featureId, 'FEATURE.md'),
        `---
id: ${featureId}
title: "Test Feature"
status: completed
---

# Test Feature
`
      );

      // Create specweave/FS-001/README.md
      await fs.mkdir(path.join(projectDir, featureId), { recursive: true });
      await fs.writeFile(
        path.join(projectDir, featureId, 'README.md'),
        `# Test Feature`
      );

      // Test
      const validator = new FeatureConsistencyValidator(testDir, {
        logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
      });
      const result = await validator.validate();

      expect(result.discrepancies.length).toBe(0);
      expect(result.consistentCount).toBe(1);
      expect(result.totalFeatures).toBe(1);
    });

    it('should detect missing project folder discrepancy', async () => {
      // Setup: Create _features folder without project folder
      const featureId = 'FS-002';

      // Create _features/FS-002/FEATURE.md (but NO specweave/FS-002/)
      await fs.mkdir(path.join(featuresDir, featureId), { recursive: true });
      await fs.writeFile(
        path.join(featuresDir, featureId, 'FEATURE.md'),
        `---
id: ${featureId}
title: "Orphaned Feature"
status: in-progress
---

# Orphaned Feature

## Implementation History

| Increment | Status | Completion Date |
|-----------|--------|----------------|
| [0002-test](../../../../increments/0002-test/spec.md) | ⏳ in-progress | 2025-11-24 |
`
      );

      // Test
      const validator = new FeatureConsistencyValidator(testDir, {
        logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
      });
      const result = await validator.validate();

      expect(result.discrepancies.length).toBe(1);
      expect(result.discrepancies[0].featureId).toBe(featureId);
      expect(result.discrepancies[0].type).toBe('missing_project_folder');
      expect(result.discrepancies[0].autoRepairable).toBe(true);
      expect(result.discrepancies[0].linkedIncrementId).toBe('0002-test');
    });

    it('should detect orphaned feature (no FEATURE.md)', async () => {
      // Setup: Create _features folder without FEATURE.md
      const featureId = 'FS-003';

      // Create empty _features/FS-003/ folder (no FEATURE.md)
      await fs.mkdir(path.join(featuresDir, featureId), { recursive: true });

      // Test
      const validator = new FeatureConsistencyValidator(testDir, {
        logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
      });
      const result = await validator.validate();

      expect(result.discrepancies.length).toBe(1);
      expect(result.discrepancies[0].type).toBe('orphaned_feature');
      expect(result.discrepancies[0].autoRepairable).toBe(false);
    });
  });

  describe('validate() with auto-repair', () => {
    it('should auto-repair missing project folder', async () => {
      // Setup: Create _features folder without project folder
      const featureId = 'FS-004';

      await fs.mkdir(path.join(featuresDir, featureId), { recursive: true });
      await fs.writeFile(
        path.join(featuresDir, featureId, 'FEATURE.md'),
        `---
id: ${featureId}
title: "Feature to Repair"
status: in-progress
---

# Feature to Repair
`
      );

      // Verify project folder doesn't exist
      const projectFeatureDir = path.join(projectDir, featureId);
      await expect(fs.access(projectFeatureDir)).rejects.toThrow();

      // Test: Validate with auto-repair
      const validator = new FeatureConsistencyValidator(testDir, {
        logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
        defaultProject: 'specweave'
      });
      const result = await validator.validate(true);

      // Verify repair was attempted
      expect(result.repairs).toBeDefined();
      expect(result.repairs!.length).toBe(1);
      expect(result.repairs![0].success).toBe(true);
      expect(result.repairs![0].featureId).toBe(featureId);

      // Verify project folder was created
      await expect(fs.access(projectFeatureDir)).resolves.toBeUndefined();

      // Verify README.md was created
      const readmePath = path.join(projectFeatureDir, 'README.md');
      const readme = await fs.readFile(readmePath, 'utf-8');
      expect(readme).toContain('Feature to Repair');
      expect(readme).toContain('auto_repaired: true');
    });

    it('should not repair orphaned features (requires manual intervention)', async () => {
      // Setup: Create orphaned feature (no FEATURE.md)
      const featureId = 'FS-005';
      await fs.mkdir(path.join(featuresDir, featureId), { recursive: true });

      // Test: Validate with auto-repair
      const validator = new FeatureConsistencyValidator(testDir, {
        logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
      });
      const result = await validator.validate(true);

      // Verify discrepancy was detected
      expect(result.discrepancies.length).toBe(1);
      expect(result.discrepancies[0].type).toBe('orphaned_feature');
      expect(result.discrepancies[0].autoRepairable).toBe(false);

      // Since orphaned features are NOT auto-repairable, no repair entry should be added
      // The repair array only contains entries for auto-repairable discrepancies
      expect(result.repairs).toBeDefined();
      // Orphaned features are not auto-repairable, so repairs array should be empty
      // (only auto-repairable discrepancies get repair entries)
      expect(result.repairs!.every(r => r.featureId !== featureId)).toBe(true);
    });
  });

  describe('hasDiscrepancies()', () => {
    it('should return false when no discrepancies', async () => {
      // Setup: Consistent folders
      const featureId = 'FS-010';
      await fs.mkdir(path.join(featuresDir, featureId), { recursive: true });
      await fs.writeFile(
        path.join(featuresDir, featureId, 'FEATURE.md'),
        '# Test'
      );
      await fs.mkdir(path.join(projectDir, featureId), { recursive: true });

      const validator = new FeatureConsistencyValidator(testDir, {
        logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
      });

      expect(await validator.hasDiscrepancies()).toBe(false);
    });

    it('should return true when discrepancies exist', async () => {
      // Setup: Orphaned _features folder
      const featureId = 'FS-011';
      await fs.mkdir(path.join(featuresDir, featureId), { recursive: true });
      await fs.writeFile(
        path.join(featuresDir, featureId, 'FEATURE.md'),
        '# Test'
      );
      // No project folder created

      const validator = new FeatureConsistencyValidator(testDir, {
        logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
      });

      expect(await validator.hasDiscrepancies()).toBe(true);
    });
  });

  describe('getOrphanedFeatures()', () => {
    it('should return list of orphaned feature IDs', async () => {
      // Setup: Two orphaned features
      await fs.mkdir(path.join(featuresDir, 'FS-020'), { recursive: true });
      await fs.writeFile(path.join(featuresDir, 'FS-020', 'FEATURE.md'), '#');

      await fs.mkdir(path.join(featuresDir, 'FS-021'), { recursive: true });
      await fs.writeFile(path.join(featuresDir, 'FS-021', 'FEATURE.md'), '#');

      // One consistent feature
      await fs.mkdir(path.join(featuresDir, 'FS-022'), { recursive: true });
      await fs.writeFile(path.join(featuresDir, 'FS-022', 'FEATURE.md'), '#');
      await fs.mkdir(path.join(projectDir, 'FS-022'), { recursive: true });

      const validator = new FeatureConsistencyValidator(testDir, {
        logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
      });

      const orphaned = await validator.getOrphanedFeatures();

      expect(orphaned).toContain('FS-020');
      expect(orphaned).toContain('FS-021');
      expect(orphaned).not.toContain('FS-022');
    });
  });
});
