/**
 * Path Resolver Tests
 *
 * Tests path resolution for living docs directory structure,
 * auto-archive logic, and empty feature folder cleanup.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Hoisted mocks for fs-native (sync methods used by cleanupEmptyFeatureFolder)
const {
  mockReaddirSync,
  mockExistsSync,
  mockUnlinkSync,
  mockRemoveSync,
} = vi.hoisted(() => ({
  mockReaddirSync: vi.fn(),
  mockExistsSync: vi.fn(),
  mockUnlinkSync: vi.fn(),
  mockRemoveSync: vi.fn(),
}));

vi.mock('../../../src/utils/fs-native.js', () => ({
  readdirSync: mockReaddirSync,
  existsSync: mockExistsSync,
  unlinkSync: mockUnlinkSync,
  removeSync: mockRemoveSync,
}));

import {
  getBaseDirectory,
  shouldAutoArchive,
  shouldArchiveEntireGroup,
  cleanupEmptyFeatureFolder,
} from '../../../src/importers/item-converter/path-resolver.js';

import type { ItemConverterOptions } from '../../../src/importers/item-converter/types.js';
import type { ExternalItem } from '../../../src/importers/external-importer.js';

// ─── Helper: create minimal ExternalItem ─────────────────────

function makeItem(overrides: Partial<ExternalItem> = {}): ExternalItem {
  return {
    id: 'TEST-1',
    type: 'user-story',
    title: 'Test item',
    description: '',
    status: 'open',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    url: 'https://example.com/1',
    labels: [],
    platform: 'github',
    ...overrides,
  };
}

describe('path-resolver', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // ─── getBaseDirectory() ────────────────────────────────────

  describe('getBaseDirectory()', () => {
    it('should return 2-level path with container and projectId', () => {
      const options: ItemConverterOptions = {
        specsDir: '/project/.specweave/docs/internal/specs',
        projectId: 'my-board',
        externalContainer: {
          type: 'jira-project',
          containerId: 'CORE',
          containerName: 'Core Project',
        },
      };

      const result = getBaseDirectory(options);
      expect(result).toBe('/project/.specweave/docs/internal/specs/CORE/my-board');
    });

    it('should use "default" projectId when container present but no projectId', () => {
      const options: ItemConverterOptions = {
        specsDir: '/specs',
        externalContainer: {
          type: 'ado-project',
          containerId: 'MyProduct',
          containerName: 'My Product',
        },
      };

      const result = getBaseDirectory(options);
      expect(result).toBe('/specs/MyProduct/default');
    });

    it('should return 1-level path with projectId (no container)', () => {
      const options: ItemConverterOptions = {
        specsDir: '/specs',
        projectId: 'my-repo',
      };

      const result = getBaseDirectory(options);
      expect(result).toBe('/specs/my-repo');
    });

    it('should return specsDir directly for legacy mode (no container, no projectId)', () => {
      const options: ItemConverterOptions = {
        specsDir: '/project/.specweave/docs/internal/specs',
      };

      const result = getBaseDirectory(options);
      expect(result).toBe('/project/.specweave/docs/internal/specs');
    });

    it('should handle JIRA 2-level structure pattern', () => {
      const options: ItemConverterOptions = {
        specsDir: '/specs',
        projectId: 'aac',
        externalContainer: {
          type: 'jira-project',
          containerId: 'AAC',
          containerName: 'AAC Project',
        },
      };

      const result = getBaseDirectory(options);
      expect(result).toBe('/specs/AAC/aac');
    });

    it('should handle ADO 2-level structure pattern', () => {
      const options: ItemConverterOptions = {
        specsDir: '/specs',
        projectId: 'area-web',
        externalContainer: {
          type: 'ado-project',
          containerId: 'WebApp',
          containerName: 'Web Application',
        },
      };

      const result = getBaseDirectory(options);
      expect(result).toBe('/specs/WebApp/area-web');
    });

    it('should handle GitHub 1-level structure pattern', () => {
      const options: ItemConverterOptions = {
        specsDir: '/specs',
        projectId: 'owner-repo',
      };

      const result = getBaseDirectory(options);
      expect(result).toBe('/specs/owner-repo');
    });

    it('should handle empty specsDir string', () => {
      const options: ItemConverterOptions = {
        specsDir: '',
        projectId: 'test',
      };

      const result = getBaseDirectory(options);
      expect(result).toBe('test');
    });
  });

  // ─── shouldAutoArchive() ───────────────────────────────────

  describe('shouldAutoArchive()', () => {
    it('should return false when autoArchiveAfterDays is undefined', () => {
      const result = shouldAutoArchive(new Date('2020-01-01'), undefined);
      expect(result).toBe(false);
    });

    it('should return false when autoArchiveAfterDays is 0', () => {
      const result = shouldAutoArchive(new Date('2020-01-01'), 0);
      expect(result).toBe(false);
    });

    it('should return false when autoArchiveAfterDays is negative', () => {
      const result = shouldAutoArchive(new Date('2020-01-01'), -10);
      expect(result).toBe(false);
    });

    it('should return true when item is older than threshold', () => {
      // Item created 100 days ago, threshold is 30 days
      const hundredDaysAgo = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
      const result = shouldAutoArchive(hundredDaysAgo, 30);
      expect(result).toBe(true);
    });

    it('should return false when item is newer than threshold', () => {
      // Item created 5 days ago, threshold is 30 days
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const result = shouldAutoArchive(fiveDaysAgo, 30);
      expect(result).toBe(false);
    });

    it('should return true when item age exactly equals threshold', () => {
      // Item created exactly 30 days ago, threshold is 30 days
      const exactlyThirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const result = shouldAutoArchive(exactlyThirtyDaysAgo, 30);
      expect(result).toBe(true);
    });

    it('should return false for item created today with threshold of 1', () => {
      const result = shouldAutoArchive(new Date(), 1);
      expect(result).toBe(false);
    });

    it('should handle very old dates', () => {
      const veryOld = new Date('2000-01-01');
      const result = shouldAutoArchive(veryOld, 365);
      expect(result).toBe(true);
    });

    it('should handle threshold of 1 day', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const result = shouldAutoArchive(twoDaysAgo, 1);
      expect(result).toBe(true);
    });
  });

  // ─── shouldArchiveEntireGroup() ────────────────────────────

  describe('shouldArchiveEntireGroup()', () => {
    it('should return false for empty items array', () => {
      const result = shouldArchiveEntireGroup([], 30);
      expect(result).toBe(false);
    });

    it('should return false when threshold is undefined', () => {
      const items = [makeItem({ createdAt: new Date('2020-01-01') })];
      const result = shouldArchiveEntireGroup(items, undefined);
      expect(result).toBe(false);
    });

    it('should return false when threshold is 0', () => {
      const items = [makeItem({ createdAt: new Date('2020-01-01') })];
      const result = shouldArchiveEntireGroup(items, 0);
      expect(result).toBe(false);
    });

    it('should return false when threshold is negative', () => {
      const items = [makeItem({ createdAt: new Date('2020-01-01') })];
      const result = shouldArchiveEntireGroup(items, -5);
      expect(result).toBe(false);
    });

    it('should return true when ALL items are older than threshold', () => {
      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
      const items = [
        makeItem({ createdAt: oldDate }),
        makeItem({ createdAt: oldDate }),
        makeItem({ createdAt: oldDate }),
      ];
      const result = shouldArchiveEntireGroup(items, 30);
      expect(result).toBe(true);
    });

    it('should return false when ANY item is newer than threshold', () => {
      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
      const newDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const items = [
        makeItem({ createdAt: oldDate }),
        makeItem({ createdAt: newDate }), // This one is too new
        makeItem({ createdAt: oldDate }),
      ];
      const result = shouldArchiveEntireGroup(items, 30);
      expect(result).toBe(false);
    });

    it('should return true for single old item', () => {
      const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      const items = [makeItem({ createdAt: oldDate })];
      const result = shouldArchiveEntireGroup(items, 30);
      expect(result).toBe(true);
    });

    it('should return false for single new item', () => {
      const newDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const items = [makeItem({ createdAt: newDate })];
      const result = shouldArchiveEntireGroup(items, 30);
      expect(result).toBe(false);
    });
  });

  // ─── cleanupEmptyFeatureFolder() ───────────────────────────

  describe('cleanupEmptyFeatureFolder()', () => {
    it('should remove FEATURE.md and folder when folder only has FEATURE.md', async () => {
      mockReaddirSync.mockReturnValue(['FEATURE.md']);
      mockExistsSync.mockReturnValue(true);

      await cleanupEmptyFeatureFolder('/specs/FS-001E', 'FS-001E');

      expect(mockUnlinkSync).toHaveBeenCalledWith('/specs/FS-001E/FEATURE.md');
      expect(mockRemoveSync).toHaveBeenCalledWith('/specs/FS-001E');
    });

    it('should remove folder when completely empty', async () => {
      mockReaddirSync.mockReturnValue([]);

      await cleanupEmptyFeatureFolder('/specs/FS-002E', 'FS-002E');

      // No FEATURE.md to delete (existsSync not called for this case)
      expect(mockRemoveSync).toHaveBeenCalledWith('/specs/FS-002E');
    });

    it('should NOT remove folder when non-template files exist', async () => {
      mockReaddirSync.mockReturnValue(['FEATURE.md', 'US-001E.md']);

      await cleanupEmptyFeatureFolder('/specs/FS-003E', 'FS-003E');

      expect(mockUnlinkSync).not.toHaveBeenCalled();
      expect(mockRemoveSync).not.toHaveBeenCalled();
    });

    it('should handle case-insensitive FEATURE.md check', async () => {
      mockReaddirSync.mockReturnValue(['feature.md']);
      mockExistsSync.mockReturnValue(true);

      await cleanupEmptyFeatureFolder('/specs/FS-004E', 'FS-004E');

      // feature.md (lowercase) should be filtered out as non-template
      expect(mockRemoveSync).toHaveBeenCalledWith('/specs/FS-004E');
    });

    it('should log debug message when logger provided', async () => {
      mockReaddirSync.mockReturnValue([]);
      const logger = { debug: vi.fn() };

      await cleanupEmptyFeatureFolder('/specs/FS-005E', 'FS-005E', logger);

      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('FS-005E'));
    });

    it('should not log when logger is undefined', async () => {
      mockReaddirSync.mockReturnValue([]);

      // Should not throw
      await cleanupEmptyFeatureFolder('/specs/FS-006E', 'FS-006E');

      expect(mockRemoveSync).toHaveBeenCalled();
    });

    it('should not throw when readdirSync fails', async () => {
      mockReaddirSync.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      // Should not throw - cleanup is best-effort
      await expect(
        cleanupEmptyFeatureFolder('/nonexistent', 'FS-007E')
      ).resolves.not.toThrow();
    });

    it('should not throw when unlinkSync fails', async () => {
      mockReaddirSync.mockReturnValue(['FEATURE.md']);
      mockExistsSync.mockReturnValue(true);
      mockUnlinkSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      // Should not throw - cleanup is best-effort
      await expect(
        cleanupEmptyFeatureFolder('/specs/FS-008E', 'FS-008E')
      ).resolves.not.toThrow();
    });

    it('should not throw when removeSync fails', async () => {
      mockReaddirSync.mockReturnValue([]);
      mockRemoveSync.mockImplementation(() => {
        throw new Error('Directory not empty');
      });

      await expect(
        cleanupEmptyFeatureFolder('/specs/FS-009E', 'FS-009E')
      ).resolves.not.toThrow();
    });

    it('should skip FEATURE.md deletion if file does not exist', async () => {
      mockReaddirSync.mockReturnValue(['FEATURE.md']);
      mockExistsSync.mockReturnValue(false);

      await cleanupEmptyFeatureFolder('/specs/FS-010E', 'FS-010E');

      expect(mockUnlinkSync).not.toHaveBeenCalled();
      expect(mockRemoveSync).toHaveBeenCalledWith('/specs/FS-010E');
    });

    it('should handle folder with mixed case FEATURE.md variants', async () => {
      // Only exact 'feature.md' (case-insensitive) should be treated as template
      mockReaddirSync.mockReturnValue(['Feature.md']);
      mockExistsSync.mockReturnValue(true);

      await cleanupEmptyFeatureFolder('/specs/FS-011E', 'FS-011E');

      // 'Feature.md'.toLowerCase() === 'feature.md', so it's treated as template
      expect(mockRemoveSync).toHaveBeenCalledWith('/specs/FS-011E');
    });

    it('should not remove folder when it has subdirectories', async () => {
      mockReaddirSync.mockReturnValue(['FEATURE.md', 'subfolder']);

      await cleanupEmptyFeatureFolder('/specs/FS-012E', 'FS-012E');

      // 'subfolder' is not FEATURE.md, so nonTemplateFiles.length > 0
      expect(mockRemoveSync).not.toHaveBeenCalled();
    });
  });
});
