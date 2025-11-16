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
        throw new Error('Should have thrown MetadataError');
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

      // Try to create with 2-digit padding (should still detect duplicate)
      await expect(
        MetadataManager.validateBeforeCreate('0042-duplicate', testDir)
      ).rejects.toThrow(MetadataError);

      await expect(
        MetadataManager.validateBeforeCreate('0042-duplicate', testDir)
      ).rejects.toThrow(/already exists/);
    });
  });

  describe('Reserved Name Validation', () => {
    it('should reject status value names', async () => {
      const statusNames = ['active', 'backlog', 'paused', 'completed', 'abandoned'];

      for (const name of statusNames) {
        await expect(
          MetadataManager.validateBeforeCreate(name, testDir)
        ).rejects.toThrow(MetadataError);

        await expect(
          MetadataManager.validateBeforeCreate(name, testDir)
        ).rejects.toThrow(/reserved name/);
      }
    });

    it('should reject special folder names', async () => {
      const specialNames = ['_archive', '_templates', '_config'];

      for (const name of specialNames) {
        await expect(
          MetadataManager.validateBeforeCreate(name, testDir)
        ).rejects.toThrow(MetadataError);

        await expect(
          MetadataManager.validateBeforeCreate(name, testDir)
        ).rejects.toThrow(/reserved name/);
      }
    });

    it('should reject state file names', async () => {
      const stateNames = ['active-increment', 'state', 'config'];

      for (const name of stateNames) {
        await expect(
          MetadataManager.validateBeforeCreate(name, testDir)
        ).rejects.toThrow(MetadataError);

        await expect(
          MetadataManager.validateBeforeCreate(name, testDir)
        ).rejects.toThrow(/reserved name/);
      }
    });

    it('should reject common reserved terms', async () => {
      const commonTerms = ['current', 'latest', 'new', 'temp', 'test'];

      for (const term of commonTerms) {
        await expect(
          MetadataManager.validateBeforeCreate(term, testDir)
        ).rejects.toThrow(MetadataError);

        await expect(
          MetadataManager.validateBeforeCreate(term, testDir)
        ).rejects.toThrow(/reserved name/);
      }
    });

    it('should reject IDs starting with underscore', async () => {
      const underscoreNames = ['_myfeature', '_test', '_anything'];

      for (const name of underscoreNames) {
        await expect(
          MetadataManager.validateBeforeCreate(name, testDir)
        ).rejects.toThrow(MetadataError);

        await expect(
          MetadataManager.validateBeforeCreate(name, testDir)
        ).rejects.toThrow(/cannot start with underscore/);
      }
    });

    it('should provide helpful error message for reserved names', async () => {
      try {
        await MetadataManager.validateBeforeCreate('active', testDir);
        throw new Error('Should have thrown MetadataError');
      } catch (error) {
        expect(error).toBeInstanceOf(MetadataError);
        const message = (error as Error).message;

        // Should explain it's reserved
        expect(message).toContain('reserved name');

        // Should list types of reserved names
        expect(message).toContain('Status values');
        expect(message).toContain('Special folders');
        expect(message).toContain('State files');

        // Should suggest proper format
        expect(message).toContain('0035-my-feature');
      }
    });

    it('should allow valid increment IDs with numbers', async () => {
      const validIds = [
        '0001-feature',
        '0042-bugfix',
        '9999-refactor',
        '0100-active-directory-integration' // "active" in name is OK if properly prefixed
      ];

      for (const id of validIds) {
        await expect(
          MetadataManager.validateBeforeCreate(id, testDir)
        ).resolves.toBeUndefined();
      }
    });

    it('should reject reserved base names even with valid number prefix', async () => {
      // "active-something" should be rejected because base name is "active"
      await expect(
        MetadataManager.validateBeforeCreate('active-feature', testDir)
      ).rejects.toThrow(MetadataError);

      await expect(
        MetadataManager.validateBeforeCreate('active-feature', testDir)
      ).rejects.toThrow(/Base name "active" is reserved/);
    });
  });
});
