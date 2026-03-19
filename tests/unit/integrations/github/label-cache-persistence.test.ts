/**
 * Unit tests for label-cache.ts disk persistence (T-003, US-003)
 *
 * Validates:
 * - TC-009: Disk cache with labels → ensureLabels() → 0 API calls
 * - TC-010: No disk cache → ensureLabels() → creates + persists to disk
 * - Stale disk cache (>24h) → labels re-fetched
 * - Corrupted cache file → gracefully ignored
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockExecFileNoThrow, mockReadFileSync, mockWriteFileSync, mockExistsSync, mockMkdirSync } = vi.hoisted(() => {
  return {
    mockExecFileNoThrow: vi.fn(),
    mockReadFileSync: vi.fn(),
    mockWriteFileSync: vi.fn(),
    mockExistsSync: vi.fn(),
    mockMkdirSync: vi.fn(),
  };
});

vi.mock('../../../../plugins/specweave/lib/vendor/utils/execFileNoThrow.js', () => ({
  execFileNoThrow: mockExecFileNoThrow,
}));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
    existsSync: mockExistsSync,
    mkdirSync: mockMkdirSync,
  };
});

import {
  ensureLabels,
  clearLabelCache,
  setLabelCacheDir,
} from '../../../../plugins/specweave/lib/integrations/github/label-cache.js';

describe('label-cache disk persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearLabelCache();
    mockExecFileNoThrow.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
    mockExistsSync.mockReturnValue(false);
  });

  describe('TC-009: Disk cache with labels → 0 API calls', () => {
    it('should load labels from disk and skip API calls', async () => {
      // Given: disk cache exists with labels for owner/repo
      setLabelCacheDir('/tmp/.specweave/state');
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        'owner/repo': {
          labels: ['specweave', 'bug', 'feature'],
          cachedAt: new Date().toISOString(),
        },
      }));

      // When: ensureLabels is called for cached labels
      await ensureLabels('owner/repo', ['specweave', 'bug'], { GH_TOKEN: 'test' });

      // Then: 0 API calls (all labels found in disk cache)
      expect(mockExecFileNoThrow).not.toHaveBeenCalled();
    });

    it('should only call API for labels NOT in disk cache', async () => {
      setLabelCacheDir('/tmp/.specweave/state');
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        'owner/repo': {
          labels: ['specweave'],
          cachedAt: new Date().toISOString(),
        },
      }));

      await ensureLabels('owner/repo', ['specweave', 'new-label'], { GH_TOKEN: 'test' });

      // Only 'new-label' should trigger an API call
      expect(mockExecFileNoThrow).toHaveBeenCalledTimes(1);
      expect(mockExecFileNoThrow).toHaveBeenCalledWith(
        'gh',
        expect.arrayContaining(['label', 'create', 'new-label']),
        expect.anything(),
      );
    });
  });

  describe('TC-010: No disk cache → creates + persists to disk', () => {
    it('should create labels via API and persist to disk', async () => {
      setLabelCacheDir('/tmp/.specweave/state');
      mockExistsSync.mockImplementation((p: string) => {
        // State dir exists, but cache file doesn't
        return p === '/tmp/.specweave/state';
      });

      await ensureLabels('owner/repo', ['specweave', 'bug'], { GH_TOKEN: 'test' });

      // API calls made for both labels
      expect(mockExecFileNoThrow).toHaveBeenCalledTimes(2);

      // Disk cache written
      expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
      const writtenPath = mockWriteFileSync.mock.calls[0][0];
      const writtenData = JSON.parse(mockWriteFileSync.mock.calls[0][1] as string);

      expect(writtenPath).toBe('/tmp/.specweave/state/github-label-cache.json');
      expect(writtenData['owner/repo'].labels).toContain('specweave');
      expect(writtenData['owner/repo'].labels).toContain('bug');
      expect(writtenData['owner/repo'].cachedAt).toBeDefined();
    });

    it('should create state directory if it does not exist', async () => {
      setLabelCacheDir('/tmp/.specweave/state');
      mockExistsSync.mockReturnValue(false);

      await ensureLabels('owner/repo', ['specweave'], { GH_TOKEN: 'test' });

      expect(mockMkdirSync).toHaveBeenCalledWith(
        '/tmp/.specweave/state',
        { recursive: true },
      );
    });
  });

  describe('Stale disk cache (>24h)', () => {
    it('should ignore disk cache entries older than 24 hours', async () => {
      setLabelCacheDir('/tmp/.specweave/state');
      mockExistsSync.mockReturnValue(true);

      const staleDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      mockReadFileSync.mockReturnValue(JSON.stringify({
        'owner/repo': {
          labels: ['specweave'],
          cachedAt: staleDate,
        },
      }));

      await ensureLabels('owner/repo', ['specweave'], { GH_TOKEN: 'test' });

      // Should call API because disk cache is stale
      expect(mockExecFileNoThrow).toHaveBeenCalledTimes(1);
    });

    it('should keep fresh entries from other repos when one is stale', async () => {
      setLabelCacheDir('/tmp/.specweave/state');
      mockExistsSync.mockReturnValue(true);

      const staleDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      const freshDate = new Date().toISOString();
      mockReadFileSync.mockReturnValue(JSON.stringify({
        'owner/repoA': { labels: ['specweave'], cachedAt: staleDate },
        'owner/repoB': { labels: ['specweave'], cachedAt: freshDate },
      }));

      // Stale repo should hit API
      await ensureLabels('owner/repoA', ['specweave'], { GH_TOKEN: 'test' });
      expect(mockExecFileNoThrow).toHaveBeenCalledTimes(1);

      mockExecFileNoThrow.mockClear();

      // Fresh repo should skip API
      await ensureLabels('owner/repoB', ['specweave'], { GH_TOKEN: 'test' });
      expect(mockExecFileNoThrow).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should gracefully handle corrupted cache file', async () => {
      setLabelCacheDir('/tmp/.specweave/state');
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('not valid json{{{');

      // Should not throw, should fall back to API calls
      await ensureLabels('owner/repo', ['specweave'], { GH_TOKEN: 'test' });
      expect(mockExecFileNoThrow).toHaveBeenCalledTimes(1);
    });

    it('should work without disk persistence (no setLabelCacheDir)', async () => {
      // No setLabelCacheDir called — pure in-memory mode
      clearLabelCache();

      await ensureLabels('owner/repo', ['specweave'], { GH_TOKEN: 'test' });

      expect(mockExecFileNoThrow).toHaveBeenCalledTimes(1);
      expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    it('should not crash when disk write fails', async () => {
      setLabelCacheDir('/tmp/.specweave/state');
      mockExistsSync.mockReturnValue(false);
      mockWriteFileSync.mockImplementation(() => { throw new Error('EPERM'); });

      // Should not throw
      await ensureLabels('owner/repo', ['specweave'], { GH_TOKEN: 'test' });
      expect(mockExecFileNoThrow).toHaveBeenCalledTimes(1);
    });
  });
});
