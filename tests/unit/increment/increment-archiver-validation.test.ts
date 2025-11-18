import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit tests for IncrementArchiver duplicate validation
 *
 * Tests that archiving and restoring prevent duplicates
 * Part of increment 0033: Duplicate Increment Prevention System
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IncrementArchiver } from '../../../src/core/increment/increment-archiver.js';
import { IncrementStatus } from '../../../src/core/types/increment-metadata.js';
import {
  createTestDir,
  cleanupTestDir,
  createTestIncrement
} from '../../helpers/increment-test-helpers.js';

describe('IncrementArchiver Duplicate Validation', () => {
  let testDir: string;
  let archiver: IncrementArchiver;

  beforeEach(async () => {
    testDir = await createTestDir('archiver-validation-test');
    archiver = new IncrementArchiver(testDir);
  });

  afterEach(async () => {
    await cleanupTestDir(testDir);
  });

  describe('archive with duplicate detection', () => {
    it('should reject archiving when duplicate exists in archive', async () => {
      // Create increment in active
      await createTestIncrement(testDir, 'active', '0001-to-archive', {
        status: IncrementStatus.COMPLETED
      });

      // Create duplicate in archive
      await createTestIncrement(testDir, '_archive', '0001-already-archived', {
        status: IncrementStatus.COMPLETED
      });

      // Try to archive (should fail)
      const result = await archiver.archive({
        increments: ['0001-to-archive'],
        preserveActive: false
      });

      expect(result.errors).toContain('0001-to-archive');
      expect(result.archived).not.toContain('0001-to-archive');
    });

    it('should reject archiving when duplicate exists in abandoned', async () => {
      // Create increment in active
      await createTestIncrement(testDir, 'active', '0002-to-archive', {
        status: IncrementStatus.COMPLETED
      });

      // Create duplicate in abandoned
      await createTestIncrement(testDir, '_abandoned', '0002-abandoned', {
        status: IncrementStatus.ABANDONED
      });

      // Try to archive (should fail)
      const result = await archiver.archive({
        increments: ['0002-to-archive'],
        preserveActive: false
      });

      expect(result.errors).toContain('0002-to-archive');
    });

    it('should allow archiving when no duplicates exist', async () => {
      // Create increment in active (no duplicates)
      await createTestIncrement(testDir, 'active', '0003-unique', {
        status: IncrementStatus.COMPLETED
      });

      // Archive should succeed
      const result = await archiver.archive({
        increments: ['0003-unique'],
        preserveActive: false
      });

      expect(result.archived).toContain('0003-unique');
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('restore with duplicate detection', () => {
    it('should reject restoring when duplicate exists in active', async () => {
      // Create increment in archive
      await createTestIncrement(testDir, '_archive', '0004-archived', {
        status: IncrementStatus.COMPLETED
      });

      // Create duplicate in active
      await createTestIncrement(testDir, 'active', '0004-active', {
        status: IncrementStatus.ACTIVE
      });

      // Try to restore (should fail)
      await expect(
        archiver.restore('0004-archived')
      ).rejects.toThrow(/already exists in active folder/);
    });

    it('should allow restoring when no duplicates exist', async () => {
      // Create increment in archive (no duplicates)
      await createTestIncrement(testDir, '_archive', '0005-archived', {
        status: IncrementStatus.COMPLETED
      });

      // Restore should succeed
      await expect(
        archiver.restore('0005-archived')
      ).resolves.toBeUndefined();
    });

    it('should provide helpful error message with resolution options', async () => {
      // Create increment in archive
      await createTestIncrement(testDir, '_archive', '0006-archived');

      // Create duplicate in active
      await createTestIncrement(testDir, 'active', '0006-active');

      // Try to restore
      try {
        await archiver.restore('0006-archived');
        fail('Should have thrown error');
      } catch (error) {
        const message = (error as Error).message;

        // Should mention increment number
        expect(message).toContain('0006');
        expect(message).toContain('already exists in active folder');

        // Should provide resolution options
        expect(message).toContain('Resolution options');
        expect(message).toContain('Delete/archive the existing active version');
        expect(message).toContain('/specweave:fix-duplicates');
      }
    });
  });

  describe('edge cases', () => {
    it('should handle increments with different names but same number', async () => {
      // Create increment in active
      await createTestIncrement(testDir, 'active', '0007-name-one', {
        status: IncrementStatus.COMPLETED
      });

      // Create duplicate in archive with different name
      await createTestIncrement(testDir, '_archive', '0007-name-two', {
        status: IncrementStatus.COMPLETED
      });

      // Try to archive (should fail due to number collision)
      const result = await archiver.archive({
        increments: ['0007-name-one'],
        preserveActive: false
      });

      expect(result.errors).toContain('0007-name-one');
    });

    it('should handle restore when increment not found', async () => {
      // Try to restore non-existent increment
      await expect(
        archiver.restore('9999-does-not-exist')
      ).rejects.toThrow(/not found in archive/);
    });
  });
});
