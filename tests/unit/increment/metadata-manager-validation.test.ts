/**
 * Unit tests for MetadataManager duplicate validation
 *
 * Tests that MetadataManager.validateBeforeCreate() prevents duplicates
 * Part of increment 0033: Duplicate Increment Prevention System
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { MetadataManager, MetadataError } from '../../../src/core/increment/metadata-manager.js';
import { IncrementStatus } from '../../../src/core/types/increment-metadata.js';
import {
  createTestDir,
  cleanupTestDir,
  createTestIncrement
} from '../../helpers/increment-test-helpers.js';

describe('MetadataManager Duplicate Validation', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await createTestDir('metadata-validation-test');
  });

  afterEach(async () => {
    await cleanupTestDir(testDir);
  });

  describe('validateBeforeCreate', () => {
    it('should pass validation when no duplicates exist', async () => {
      // No existing increments with same number
      await expect(
        MetadataManager.validateBeforeCreate('0001-new-feature', testDir)
      ).resolves.toBeUndefined();
    });

    it('should reject when duplicate exists in active folder', async () => {
      // Create existing increment in active
      await createTestIncrement(testDir, 'active', '0001-existing', {
        status: IncrementStatus.ACTIVE
      });

      // Try to create another with same number
      await expect(
        MetadataManager.validateBeforeCreate('0001-duplicate', testDir)
      ).rejects.toThrow(MetadataError);

      await expect(
        MetadataManager.validateBeforeCreate('0001-duplicate', testDir)
      ).rejects.toThrow(/already exists/);
    });

    it('should reject when duplicate exists in archive folder', async () => {
      // Create existing increment in archive
      await createTestIncrement(testDir, '_archive', '0002-archived', {
        status: IncrementStatus.COMPLETED
      });

      // Try to create another with same number
      await expect(
        MetadataManager.validateBeforeCreate('0002-new', testDir)
      ).rejects.toThrow(MetadataError);

      await expect(
        MetadataManager.validateBeforeCreate('0002-new', testDir)
      ).rejects.toThrow(/already exists/);
    });

    it('should reject when duplicate exists in abandoned folder', async () => {
      // Create existing increment in abandoned
      await createTestIncrement(testDir, '_abandoned', '0003-abandoned', {
        status: IncrementStatus.ABANDONED
      });

      // Try to create another with same number
      await expect(
        MetadataManager.validateBeforeCreate('0003-new', testDir)
      ).rejects.toThrow(MetadataError);
    });

    it('should reject when duplicates exist in multiple locations', async () => {
      // Create duplicates in both active and archive
      await createTestIncrement(testDir, 'active', '0004-active', {
        status: IncrementStatus.ACTIVE
      });
      await createTestIncrement(testDir, '_archive', '0004-archived', {
        status: IncrementStatus.COMPLETED
      });

      // Try to create another with same number
      await expect(
        MetadataManager.validateBeforeCreate('0004-new', testDir)
      ).rejects.toThrow(MetadataError);

      // Error message should mention both locations
      try {
        await MetadataManager.validateBeforeCreate('0004-new', testDir);
      } catch (error) {
        expect(error).toBeInstanceOf(MetadataError);
        const message = (error as Error).message;
        expect(message).toContain('already exists');
      }
    });

    it('should provide helpful error message with resolution options', async () => {
      await createTestIncrement(testDir, 'active', '0005-existing');

      try {
        await MetadataManager.validateBeforeCreate('0005-duplicate', testDir);
        fail('Should have thrown MetadataError');
      } catch (error) {
        expect(error).toBeInstanceOf(MetadataError);
        const message = (error as Error).message;

        // Should mention increment number
        expect(message).toContain('0005');

        // Should provide resolution options
        expect(message).toContain('Resolution options');
        expect(message).toContain('Use a different increment number');
        expect(message).toContain('Delete/archive the existing increment');
        expect(message).toContain('/specweave:fix-duplicates');
      }
    });

    it('should reject invalid increment ID format', async () => {
      await expect(
        MetadataManager.validateBeforeCreate('invalid-format')
      ).rejects.toThrow(MetadataError);

      await expect(
        MetadataManager.validateBeforeCreate('invalid-format')
      ).rejects.toThrow(/Invalid increment ID format/);
    });

    it('should handle increment IDs with different padding', async () => {
      // Create increment with 4-digit padding
      await createTestIncrement(testDir, 'active', '0042-existing');

      // Try to create with 2-digit number (should still detect duplicate)
      await expect(
        MetadataManager.validateBeforeCreate('42-duplicate', testDir)
      ).rejects.toThrow(MetadataError);
    });
  });
});
