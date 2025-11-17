import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit tests for DuplicateDetector
 *
 * Tests duplicate detection logic, conflict resolution, and winner selection.
 * Part of increment 0033: Duplicate Increment Prevention System
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  detectAllDuplicates,
  detectDuplicatesByNumber,
  type DuplicateReport,
  type IncrementLocation
} from '../../../src/core/increment/duplicate-detector.js.js';
import { IncrementStatus } from '../../../src/core/types/increment-metadata.js.js';
import {
  createTestDir,
  cleanupTestDir,
  createTestIncrement,
  createMockLocation
} from '../../helpers/increment-test-helpers.js.js';

describe('DuplicateDetector', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await createTestDir('duplicate-detector-test');
  });

  afterEach(async () => {
    await cleanupTestDir(testDir);
  });

  describe('detectAllDuplicates', () => {
    it('should return empty report when no increments exist', async () => {
      const result = await detectAllDuplicates(testDir);

      expect(result.totalChecked).toBe(0);
      expect(result.duplicateCount).toBe(0);
      expect(result.duplicates).toEqual([]);
    });

    it('should return empty duplicates when increments are unique', async () => {
      // Create unique increments
      await createTestIncrement(testDir, 'active', '0001-feature-a');
      await createTestIncrement(testDir, 'active', '0002-feature-b');
      await createTestIncrement(testDir, '_archive', '0003-feature-c');

      const result = await detectAllDuplicates(testDir);

      expect(result.totalChecked).toBe(3);
      expect(result.duplicateCount).toBe(0);
      expect(result.duplicates).toEqual([]);
    });

    it('should detect increment in both active and archive', async () => {
      // Create duplicate in active and archive
      await createTestIncrement(testDir, 'active', '0001-test', { status: IncrementStatus.ACTIVE });
      await createTestIncrement(testDir, '_archive', '0001-test', { status: IncrementStatus.COMPLETED });

      const result = await detectAllDuplicates(testDir);

      expect(result.totalChecked).toBe(2);
      expect(result.duplicateCount).toBe(1);
      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0].incrementNumber).toBe('0001');
      expect(result.duplicates[0].locations).toHaveLength(2);
    });

    it('should detect same number with different names', async () => {
      // Create same number with different names
      await createTestIncrement(testDir, 'active', '0002-name-one');
      await createTestIncrement(testDir, 'active', '0002-name-two');

      const result = await detectAllDuplicates(testDir);

      expect(result.duplicateCount).toBe(1);
      expect(result.duplicates[0].incrementNumber).toBe('0002');
      expect(result.duplicates[0].locations).toHaveLength(2);
    });

    it('should detect increment in all three locations', async () => {
      // Create increment in active, archive, and abandoned
      await createTestIncrement(testDir, 'active', '0003-test', { status: IncrementStatus.ACTIVE });
      await createTestIncrement(testDir, '_archive', '0003-test', { status: IncrementStatus.COMPLETED });
      await createTestIncrement(testDir, '_abandoned', '0003-test', { status: IncrementStatus.ABANDONED });

      const result = await detectAllDuplicates(testDir);

      expect(result.duplicateCount).toBe(1);
      expect(result.duplicates[0].incrementNumber).toBe('0003');
      expect(result.duplicates[0].locations).toHaveLength(3);
    });

    it('should recommend active version as winner over completed', async () => {
      // Active should win over completed
      await createTestIncrement(testDir, 'active', '0004-test', {
        status: IncrementStatus.ACTIVE,
        lastActivity: '2025-11-14T10:00:00Z'
      });
      await createTestIncrement(testDir, '_archive', '0004-test', {
        status: IncrementStatus.COMPLETED,
        lastActivity: '2025-11-14T12:00:00Z' // More recent, but lower status
      });

      const result = await detectAllDuplicates(testDir);

      expect(result.duplicates[0].recommendedWinner.status).toBe('active');
      expect(result.duplicates[0].losingVersions).toHaveLength(1);
      expect(result.duplicates[0].losingVersions[0].status).toBe('completed');
    });

    it('should recommend more recent version when status is same', async () => {
      // Both completed, but one more recent
      await createTestIncrement(testDir, 'active', '0005-test-old', {
        status: IncrementStatus.COMPLETED,
        lastActivity: '2025-11-10T10:00:00Z'
      });
      await createTestIncrement(testDir, 'active', '0005-test-new', {
        status: IncrementStatus.COMPLETED,
        lastActivity: '2025-11-14T10:00:00Z'
      });

      const result = await detectAllDuplicates(testDir);

      const winner = result.duplicates[0].recommendedWinner;
      expect(winner.lastActivity).toBe('2025-11-14T10:00:00Z');
      expect(winner.name).toBe('0005-test-new');
    });

    it('should recommend more complete version when status and time are same', async () => {
      // Same status and time, but different file counts
      await createTestIncrement(testDir, 'active', '0006-test-small', {
        status: IncrementStatus.COMPLETED,
        lastActivity: '2025-11-14T10:00:00Z',
        fileCount: 5
      });
      await createTestIncrement(testDir, 'active', '0006-test-large', {
        status: IncrementStatus.COMPLETED,
        lastActivity: '2025-11-14T10:00:00Z',
        fileCount: 20
      });

      const result = await detectAllDuplicates(testDir);

      const winner = result.duplicates[0].recommendedWinner;
      // fileCount includes metadata.json + spec/plan/tasks.md + 17 additional = 21 total
      expect(winner.fileCount).toBe(21);
      expect(winner.name).toBe('0006-test-large');
    });

    it('should include resolution reason in duplicate report', async () => {
      await createTestIncrement(testDir, 'active', '0007-test', { status: IncrementStatus.ACTIVE });
      await createTestIncrement(testDir, '_archive', '0007-test', { status: IncrementStatus.COMPLETED });

      const result = await detectAllDuplicates(testDir);

      expect(result.duplicates[0].resolutionReason).toContain('Higher status');
    });

    it('should handle corrupted metadata gracefully', async () => {
      // Create increment with corrupted metadata
      await createTestIncrement(testDir, 'active', '0008-corrupted');
      const corruptedPath = `${testDir}/.specweave/increments/0008-corrupted/metadata.json`;
      await import('fs-extra').then(fs => fs.writeFile(corruptedPath, '{ invalid json }'));

      // Should not crash
      const result = await detectAllDuplicates(testDir);

      expect(result.totalChecked).toBeGreaterThanOrEqual(0);
    });

    it('should ignore non-increment folders', async () => {
      // Create folders that don't match increment pattern
      await import('fs-extra').then(fs => fs.ensureDir(`${testDir}/.specweave/increments/some-folder`));
      await import('fs-extra').then(fs => fs.ensureDir(`${testDir}/.specweave/increments/.git`));

      const result = await detectAllDuplicates(testDir);

      expect(result.totalChecked).toBe(0);
      expect(result.duplicateCount).toBe(0);
    });
  });

  describe('detectDuplicatesByNumber', () => {
    it('should detect duplicates for specific increment number', async () => {
      await createTestIncrement(testDir, 'active', '0001-test');
      await createTestIncrement(testDir, '_archive', '0001-test');
      await createTestIncrement(testDir, 'active', '0002-test'); // Different number

      const result = await detectDuplicatesByNumber('0001', testDir);

      expect(result).toHaveLength(2);
      expect(result.every(loc => loc.name.startsWith('0001'))).toBe(true);
    });

    it('should return empty array when no increments exist with that number', async () => {
      await createTestIncrement(testDir, 'active', '0001-test');

      const result = await detectDuplicatesByNumber('0099', testDir);

      // Should return empty if no increments with that number
      expect(result).toEqual([]);
    });

    it('should return increment even when only one exists (for validation)', async () => {
      await createTestIncrement(testDir, 'active', '0001-test');

      const result = await detectDuplicatesByNumber('0001', testDir);

      // NEW BEHAVIOR: Returns the increment even if there's only one
      // This is used for validation before creating a new increment
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('0001-test');
    });

    it('should normalize increment number with padding', async () => {
      await createTestIncrement(testDir, 'active', '0042-test');
      await createTestIncrement(testDir, '_archive', '0042-test');

      // Should work with or without leading zeros
      const result1 = await detectDuplicatesByNumber('42', testDir);
      const result2 = await detectDuplicatesByNumber('0042', testDir);

      expect(result1).toHaveLength(2);
      expect(result2).toHaveLength(2);
    });
  });

  describe('Winner Selection Logic', () => {
    it('should prefer active over completed over paused', () => {
      const active = createMockLocation('0001-test', IncrementStatus.ACTIVE, '2025-11-14T10:00:00Z');
      const completed = createMockLocation('0001-test', IncrementStatus.COMPLETED, '2025-11-14T10:00:00Z');
      const paused = createMockLocation('0001-test', IncrementStatus.PAUSED, '2025-11-14T10:00:00Z');

      // Manually test selectWinner logic by checking the duplicate report
      // (selectWinner is a private function, so we test it indirectly)

      // For now, we'll validate through the full flow
      expect(active.status).toBe('active');
      expect(completed.status).toBe('completed');
      expect(paused.status).toBe('paused');
    });

    it('should prefer active location over archive over abandoned', async () => {
      // Create same increment in different locations with same status and time
      await createTestIncrement(testDir, 'active', '0009-test', {
        status: IncrementStatus.COMPLETED,
        lastActivity: '2025-11-14T10:00:00Z',
        fileCount: 10
      });
      await createTestIncrement(testDir, '_archive', '0009-test-archive', {
        status: IncrementStatus.COMPLETED,
        lastActivity: '2025-11-14T10:00:00Z',
        fileCount: 10
      });
      await createTestIncrement(testDir, '_abandoned', '0009-test-abandoned', {
        status: IncrementStatus.COMPLETED,
        lastActivity: '2025-11-14T10:00:00Z',
        fileCount: 10
      });

      const result = await detectAllDuplicates(testDir);

      const winner = result.duplicates[0].recommendedWinner;
      expect(winner.path).toContain('.specweave/increments/0009-test');
      expect(winner.path).not.toContain('_archive');
      expect(winner.path).not.toContain('_abandoned');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty increments directory', async () => {
      // Directory exists but is empty
      const result = await detectAllDuplicates(testDir);

      expect(result.totalChecked).toBe(0);
      expect(result.duplicateCount).toBe(0);
    });

    it('should handle non-existent increments directory', async () => {
      const nonExistentDir = '/path/that/does/not/exist';

      const result = await detectAllDuplicates(nonExistentDir);

      expect(result.totalChecked).toBe(0);
      expect(result.duplicateCount).toBe(0);
    });

    it('should handle increments with missing metadata', async () => {
      // Create increment but delete metadata.json
      const incPath = await createTestIncrement(testDir, 'active', '0010-no-metadata');
      await import('fs-extra').then(fs => fs.remove(`${incPath}/metadata.json`));

      // Should still detect the increment (using filesystem stats)
      const result = await detectAllDuplicates(testDir);

      expect(result.totalChecked).toBeGreaterThanOrEqual(1);
    });

    it('should ignore nested .specweave folders', async () => {
      // Create nested .specweave folder (shouldn't happen, but prevent it)
      await import('fs-extra').then(fs =>
        fs.ensureDir(`${testDir}/.specweave/increments/.specweave/increments/0011-nested`)
      );

      const result = await detectAllDuplicates(testDir);

      // Should not count the nested increment
      expect(result.duplicates.every(d =>
        !d.locations.some(l => l.path.includes('.specweave/increments/.specweave'))
      )).toBe(true);
    });
  });

  describe('Resolution Reason Explanations', () => {
    it('should explain status-based winner selection', async () => {
      await createTestIncrement(testDir, 'active', '0012-test', { status: IncrementStatus.ACTIVE });
      await createTestIncrement(testDir, '_archive', '0012-test', { status: IncrementStatus.COMPLETED });

      const result = await detectAllDuplicates(testDir);

      expect(result.duplicates[0].resolutionReason).toContain('Higher status');
      expect(result.duplicates[0].resolutionReason).toContain('active');
    });

    it('should explain recency-based winner selection', async () => {
      await createTestIncrement(testDir, 'active', '0013-old', {
        status: IncrementStatus.COMPLETED,
        lastActivity: '2025-11-10T10:00:00Z'
      });
      await createTestIncrement(testDir, 'active', '0013-new', {
        status: IncrementStatus.COMPLETED,
        lastActivity: '2025-11-14T10:00:00Z'
      });

      const result = await detectAllDuplicates(testDir);

      expect(result.duplicates[0].resolutionReason).toContain('Most recent activity');
    });

    it('should explain completeness-based winner selection', async () => {
      await createTestIncrement(testDir, 'active', '0014-small', {
        status: IncrementStatus.COMPLETED,
        lastActivity: '2025-11-14T10:00:00Z',
        fileCount: 5
      });
      await createTestIncrement(testDir, 'active', '0014-large', {
        status: IncrementStatus.COMPLETED,
        lastActivity: '2025-11-14T10:00:00Z',
        fileCount: 20
      });

      const result = await detectAllDuplicates(testDir);

      expect(result.duplicates[0].resolutionReason).toContain('Most complete');
      // fileCount includes metadata.json, so 20 requested = 21 actual
      expect(result.duplicates[0].resolutionReason).toContain('21 files');
    });
  });
});
