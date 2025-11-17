/**
 * Unit tests for IncrementDetector
 *
 * Tests auto-detection and validation of increments for /specweave:plan command.
 *
 * Part of increment 0039: Ultra-Smart Next Command
 */

import { IncrementDetector } from '../../../src/cli/commands/plan/increment-detector';
import { MetadataManager } from '../../../src/core/increment/metadata-manager';
import { IncrementStatus } from '../../../src/core/types/increment-metadata';
import * as fs from 'fs';
import * as path from 'path';

// Mock dependencies
jest.mock('fs');
jest.mock('../../../src/core/increment/metadata-manager');

describe('IncrementDetector', () => {
  let detector: IncrementDetector;
  const projectRoot = '/test/project';

  beforeEach(() => {
    jest.clearAllMocks();
    detector = new IncrementDetector(projectRoot);
  });

  describe('detect', () => {
    it('should return error when .specweave/increments directory does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = await detector.detect();

      expect(result.success).toBe(false);
      expect(result.reason).toContain('No .specweave/increments directory found');
      expect(result.candidates).toEqual([]);
    });

    it('should return error when no increments exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([]);

      const result = await detector.detect();

      expect(result.success).toBe(false);
      expect(result.reason).toContain('No increments found');
    });

    it('should detect single PLANNING increment', async () => {
      setupMockFileSystem(['0039-ultra-smart-next-command']);
      setupMockMetadata({
        '0039-ultra-smart-next-command': IncrementStatus.PLANNING
      });

      const result = await detector.detect();

      expect(result.success).toBe(true);
      expect(result.incrementId).toBe('0039-ultra-smart-next-command');
      expect(result.reason).toContain('Auto-detected increment in PLANNING status');
      expect(result.candidates).toEqual(['0039-ultra-smart-next-command']);
    });

    it('should detect single ACTIVE increment when no PLANNING increments', async () => {
      setupMockFileSystem(['0037-project-specific-tasks']);
      setupMockMetadata({
        '0037-project-specific-tasks': IncrementStatus.ACTIVE
      });

      const result = await detector.detect();

      expect(result.success).toBe(true);
      expect(result.incrementId).toBe('0037-project-specific-tasks');
      expect(result.reason).toContain('Auto-detected single ACTIVE increment');
    });

    it('should prioritize PLANNING over ACTIVE', async () => {
      setupMockFileSystem([
        '0037-project-specific-tasks',
        '0039-ultra-smart-next-command'
      ]);
      setupMockMetadata({
        '0037-project-specific-tasks': IncrementStatus.ACTIVE,
        '0039-ultra-smart-next-command': IncrementStatus.PLANNING
      });

      const result = await detector.detect();

      expect(result.success).toBe(true);
      expect(result.incrementId).toBe('0039-ultra-smart-next-command');
      expect(result.reason).toContain('PLANNING status');
    });

    it('should return error when multiple PLANNING increments exist', async () => {
      setupMockFileSystem([
        '0040-feature-a',
        '0041-feature-b'
      ]);
      setupMockMetadata({
        '0040-feature-a': IncrementStatus.PLANNING,
        '0041-feature-b': IncrementStatus.PLANNING
      });

      const result = await detector.detect();

      expect(result.success).toBe(false);
      expect(result.reason).toContain('Multiple increments in PLANNING status');
      expect(result.candidates).toEqual(['0040-feature-a', '0041-feature-b']);
    });

    it('should return error when multiple ACTIVE increments exist', async () => {
      setupMockFileSystem([
        '0037-project-specific-tasks',
        '0038-another-feature'
      ]);
      setupMockMetadata({
        '0037-project-specific-tasks': IncrementStatus.ACTIVE,
        '0038-another-feature': IncrementStatus.ACTIVE
      });

      const result = await detector.detect();

      expect(result.success).toBe(false);
      expect(result.reason).toContain('Multiple ACTIVE increments found');
      expect(result.candidates).toEqual([
        '0037-project-specific-tasks',
        '0038-another-feature'
      ]);
    });

    it('should skip increments with invalid metadata', async () => {
      setupMockFileSystem([
        '0039-ultra-smart-next-command',
        '0040-invalid-increment'
      ]);

      (MetadataManager.read as jest.Mock).mockImplementation((incrementId: string) => {
        if (incrementId === '0040-invalid-increment') {
          throw new Error('Invalid metadata');
        }
        return { status: IncrementStatus.PLANNING };
      });

      const result = await detector.detect();

      expect(result.success).toBe(true);
      expect(result.incrementId).toBe('0039-ultra-smart-next-command');
    });

    it('should ignore COMPLETED increments', async () => {
      setupMockFileSystem([
        '0035-old-feature',
        '0039-ultra-smart-next-command'
      ]);
      setupMockMetadata({
        '0035-old-feature': IncrementStatus.COMPLETED,
        '0039-ultra-smart-next-command': IncrementStatus.PLANNING
      });

      const result = await detector.detect();

      expect(result.success).toBe(true);
      expect(result.incrementId).toBe('0039-ultra-smart-next-command');
    });

    it('should ignore ABANDONED increments', async () => {
      setupMockFileSystem([
        '0036-abandoned',
        '0039-ultra-smart-next-command'
      ]);
      setupMockMetadata({
        '0036-abandoned': IncrementStatus.ABANDONED,
        '0039-ultra-smart-next-command': IncrementStatus.PLANNING
      });

      const result = await detector.detect();

      expect(result.success).toBe(true);
      expect(result.incrementId).toBe('0039-ultra-smart-next-command');
    });

    it('should ignore BACKLOG increments', async () => {
      setupMockFileSystem([
        '0042-future-feature',
        '0039-ultra-smart-next-command'
      ]);
      setupMockMetadata({
        '0042-future-feature': IncrementStatus.BACKLOG,
        '0039-ultra-smart-next-command': IncrementStatus.PLANNING
      });

      const result = await detector.detect();

      expect(result.success).toBe(true);
      expect(result.incrementId).toBe('0039-ultra-smart-next-command');
    });
  });

  describe('validate', () => {
    it('should validate existing increment', async () => {
      const incrementId = '0039-ultra-smart-next-command';
      setupMockFileSystem([incrementId]);
      setupMockMetadata({
        [incrementId]: IncrementStatus.PLANNING
      });

      const result = await detector.validate(incrementId);

      expect(result.success).toBe(true);
      expect(result.incrementId).toBe(incrementId);
      expect(result.reason).toContain('Validated increment');
    });

    it('should return error when increment does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = await detector.validate('9999-non-existent');

      expect(result.success).toBe(false);
      expect(result.reason).toContain('not found');
    });

    it('should reject COMPLETED increments', async () => {
      const incrementId = '0035-old-feature';
      setupMockFileSystem([incrementId]);
      setupMockMetadata({
        [incrementId]: IncrementStatus.COMPLETED
      });

      const result = await detector.validate(incrementId);

      expect(result.success).toBe(false);
      expect(result.reason).toContain('completed');
      expect(result.reason).toContain('Cannot generate plan for closed increments');
    });

    it('should reject ABANDONED increments', async () => {
      const incrementId = '0036-abandoned';
      setupMockFileSystem([incrementId]);
      setupMockMetadata({
        [incrementId]: IncrementStatus.ABANDONED
      });

      const result = await detector.validate(incrementId);

      expect(result.success).toBe(false);
      expect(result.reason).toContain('abandoned');
    });

    it('should accept PLANNING increments', async () => {
      const incrementId = '0039-ultra-smart-next-command';
      setupMockFileSystem([incrementId]);
      setupMockMetadata({
        [incrementId]: IncrementStatus.PLANNING
      });

      const result = await detector.validate(incrementId);

      expect(result.success).toBe(true);
    });

    it('should accept ACTIVE increments', async () => {
      const incrementId = '0037-project-specific-tasks';
      setupMockFileSystem([incrementId]);
      setupMockMetadata({
        [incrementId]: IncrementStatus.ACTIVE
      });

      const result = await detector.validate(incrementId);

      expect(result.success).toBe(true);
    });

    it('should accept BACKLOG increments', async () => {
      const incrementId = '0042-future-feature';
      setupMockFileSystem([incrementId]);
      setupMockMetadata({
        [incrementId]: IncrementStatus.BACKLOG
      });

      const result = await detector.validate(incrementId);

      expect(result.success).toBe(true);
    });

    it('should accept PAUSED increments', async () => {
      const incrementId = '0038-paused-work';
      setupMockFileSystem([incrementId]);
      setupMockMetadata({
        [incrementId]: IncrementStatus.PAUSED
      });

      const result = await detector.validate(incrementId);

      expect(result.success).toBe(true);
    });

    it('should handle metadata read errors', async () => {
      const incrementId = '0040-invalid';
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (MetadataManager.read as jest.Mock).mockImplementation(() => {
        throw new Error('Corrupted metadata.json');
      });

      const result = await detector.validate(incrementId);

      expect(result.success).toBe(false);
      expect(result.reason).toContain('Failed to read metadata');
      expect(result.reason).toContain('Corrupted metadata.json');
    });
  });
});

/**
 * Helper: Setup mock file system
 */
function setupMockFileSystem(incrementIds: string[]): void {
  (fs.existsSync as jest.Mock).mockReturnValue(true);
  (fs.readdirSync as jest.Mock).mockReturnValue(incrementIds);
  (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true });
}

/**
 * Helper: Setup mock metadata for increments
 */
function setupMockMetadata(statuses: Record<string, IncrementStatus>): void {
  (MetadataManager.read as jest.Mock).mockImplementation((incrementId: string) => {
    const status = statuses[incrementId];
    if (!status) {
      throw new Error(`No metadata for ${incrementId}`);
    }
    return { status };
  });
}
