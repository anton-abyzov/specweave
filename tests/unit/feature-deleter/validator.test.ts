import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ValidationResult, DeletionOptions } from '../../../src/core/feature-deleter/types.js';
import { consoleLogger } from '../../../src/utils/logger.js';
import { vol } from 'memfs';

// Mock fs/promises BEFORE importing FeatureValidator
vi.mock('fs/promises', async () => {
  const memfs = await vi.importActual<typeof import('memfs')>('memfs');
  return {
    default: memfs.vol.promises
  };
});

// Import FeatureValidator AFTER setting up mocks
const { FeatureValidator } = await import('../../../src/core/feature-deleter/validator.js');

describe('FeatureValidator - Active Increment Validation (T-001)', () => {
  let validator: FeatureValidator;
  const projectRoot = '/test-project';

  beforeEach(() => {
    // Reset memfs before each test
    vol.reset();

    // Create basic project structure
    vol.fromJSON({
      [`${projectRoot}/.specweave/increments/0001-test-increment/metadata.json`]: JSON.stringify({
        id: '0001-test-increment',
        status: 'completed',
        feature_id: 'FS-001'
      }),
      [`${projectRoot}/.specweave/increments/0002-another-increment/metadata.json`]: JSON.stringify({
        id: '0002-another-increment',
        status: 'in-progress',
        feature_id: 'FS-002'
      }),
      [`${projectRoot}/.specweave/docs/internal/specs/_features/FS-052/FEATURE.md`]: '# Feature FS-052',
      [`${projectRoot}/.specweave/docs/internal/specs/specweave/FS-052/us-001-test.md`]: '# User Story 001',
    });

    validator = new FeatureValidator({ projectRoot, logger: consoleLogger });
  });

  describe('testValidateNoActiveIncrements', () => {
    it('should pass validation when no active increments reference the feature', async () => {
      // GIVEN: Feature FS-052 with no active increments referencing it
      const featureId = 'FS-052';
      const options: DeletionOptions = { force: false };

      // WHEN: Validation runs
      const result: ValidationResult = await validator.validate(featureId, options);

      // THEN: Validation should pass
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.orphanedIncrements).toHaveLength(0);
      expect(result.mode).toBe('safe');
    });
  });

  describe('testValidateActiveIncrementBlocks', () => {
    it('should fail validation when active increment references the feature', async () => {
      // GIVEN: Feature FS-052 with active increment 0003 referencing it
      vol.fromJSON({
        [`${projectRoot}/.specweave/increments/0003-active-increment/metadata.json`]: JSON.stringify({
          id: '0003-active-increment',
          status: 'in-progress',
          feature_id: 'FS-052'
        }),
      });

      const featureId = 'FS-052';
      const options: DeletionOptions = { force: false };

      // WHEN: Validation runs in safe mode
      const result: ValidationResult = await validator.validate(featureId, options);

      // THEN: Validation should fail
      expect(result.valid).toBe(false);
      // Debug: log actual error
      console.log('Actual errors:', result.errors);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toMatch(/active increment.*0003-active-increment/i);
      expect(result.orphanedIncrements).toContain('0003-active-increment');
      expect(result.mode).toBe('safe');
    });
  });

  describe('testValidateMultipleActiveIncrements', () => {
    it('should list all active increments when multiple found', async () => {
      // GIVEN: Feature FS-052 with multiple active increments (0003, 0004, 0005)
      vol.fromJSON({
        [`${projectRoot}/.specweave/increments/0003-active-increment-1/metadata.json`]: JSON.stringify({
          id: '0003-active-increment-1',
          status: 'in-progress',
          feature_id: 'FS-052'
        }),
        [`${projectRoot}/.specweave/increments/0004-active-increment-2/metadata.json`]: JSON.stringify({
          id: '0004-active-increment-2',
          status: 'planned',
          feature_id: 'FS-052'
        }),
        [`${projectRoot}/.specweave/increments/0005-active-increment-3/metadata.json`]: JSON.stringify({
          id: '0005-active-increment-3',
          status: 'in-progress',
          feature_id: 'FS-052'
        }),
      });

      const featureId = 'FS-052';
      const options: DeletionOptions = { force: false };

      // WHEN: Validation runs
      const result: ValidationResult = await validator.validate(featureId, options);

      // THEN: All 3 active increments should be listed in error
      expect(result.valid).toBe(false);
      expect(result.orphanedIncrements).toHaveLength(3);
      expect(result.orphanedIncrements).toContain('0003-active-increment-1');
      expect(result.orphanedIncrements).toContain('0004-active-increment-2');
      expect(result.orphanedIncrements).toContain('0005-active-increment-3');
      expect(result.errors[0]).toMatch(/3.*active increments/i);
    });
  });

  describe('testValidateFiltersByStatus', () => {
    it('should ignore completed, abandoned, and archived increments', async () => {
      // GIVEN: Feature FS-052 with increments in various states
      vol.fromJSON({
        [`${projectRoot}/.specweave/increments/0003-completed/metadata.json`]: JSON.stringify({
          id: '0003-completed',
          status: 'completed',
          feature_id: 'FS-052'
        }),
        [`${projectRoot}/.specweave/increments/0004-abandoned/metadata.json`]: JSON.stringify({
          id: '0004-abandoned',
          status: 'abandoned',
          feature_id: 'FS-052'
        }),
        [`${projectRoot}/.specweave/increments/0005-archived/metadata.json`]: JSON.stringify({
          id: '0005-archived',
          status: 'archived',
          feature_id: 'FS-052'
        }),
      });

      const featureId = 'FS-052';
      const options: DeletionOptions = { force: false };

      // WHEN: Validation runs
      const result: ValidationResult = await validator.validate(featureId, options);

      // THEN: Validation should pass (completed/abandoned/archived are ignored)
      expect(result.valid).toBe(true);
      expect(result.orphanedIncrements).toHaveLength(0);

      // THEN: Warnings should be logged for completed/abandoned/archived increments
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.length).toBeGreaterThan(0);
      expect(result.warnings?.join(' ')).toMatch(/completed|abandoned|archived/i);
    });
  });

  describe('testValidateMetadataScanning', () => {
    it('should scan all increment metadata.json files correctly', async () => {
      // GIVEN: Multiple increments in .specweave/increments/ directory
      vol.fromJSON({
        [`${projectRoot}/.specweave/increments/0001-increment-a/metadata.json`]: JSON.stringify({
          id: '0001-increment-a',
          status: 'completed',
          feature_id: 'FS-001'
        }),
        [`${projectRoot}/.specweave/increments/0002-increment-b/metadata.json`]: JSON.stringify({
          id: '0002-increment-b',
          status: 'in-progress',
          feature_id: 'FS-052'
        }),
        [`${projectRoot}/.specweave/increments/0003-increment-c/metadata.json`]: JSON.stringify({
          id: '0003-increment-c',
          status: 'planned',
          feature_id: 'FS-052'
        }),
        [`${projectRoot}/.specweave/increments/0004-increment-d/metadata.json`]: JSON.stringify({
          id: '0004-increment-d',
          status: 'completed',
          feature_id: 'FS-052'
        }),
      });

      const featureId = 'FS-052';
      const options: DeletionOptions = { force: false };

      // WHEN: Validation runs
      const result: ValidationResult = await validator.validate(featureId, options);

      // THEN: Should detect 2 active increments (0002, 0003) and 1 completed (0004)
      expect(result.valid).toBe(false);
      expect(result.orphanedIncrements).toHaveLength(2);
      expect(result.orphanedIncrements).toContain('0002-increment-b');
      expect(result.orphanedIncrements).toContain('0003-increment-c');
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.join(' ')).toMatch(/0004-increment-d/);
    });
  });
});
