/**
 * Unit tests for milestone cache in GitHubFeatureSync (T-002)
 *
 * Verifies session-level milestone caching to avoid redundant API calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockExecFileNoThrow } = vi.hoisted(() => {
  const mockExecFileNoThrow = vi.fn();
  return { mockExecFileNoThrow };
});

vi.mock('../../../../plugins/specweave/lib/vendor/utils/execFileNoThrow.js', () => ({
  execFileNoThrow: mockExecFileNoThrow,
}));

vi.mock('../../../../plugins/specweave/lib/vendor/utils/auth-helpers.js', () => ({
  getGitHubAuthFromProject: () => ({ token: 'test-token' }),
}));

vi.mock('../../../../src/utils/lock-manager.js', () => ({
  LockManager: class {
    acquire = vi.fn().mockResolvedValue(true);
    release = vi.fn().mockResolvedValue(undefined);
  },
}));

import { MilestoneCache, clearMilestoneCache } from '../../../../plugins/specweave/lib/integrations/github/milestone-cache.js';

describe('MilestoneCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearMilestoneCache();
  });

  it('should make API call on first lookup for a title', async () => {
    mockExecFileNoThrow.mockResolvedValue({
      exitCode: 0,
      stdout: JSON.stringify({ number: 5, html_url: 'https://github.com/o/r/milestone/5' }),
      stderr: '',
    });

    const result = await MilestoneCache.getOrCreate(
      'owner', 'repo', 'FS-001: Feature Title', 'Feature FS-001\nStatus: active',
      { GH_TOKEN: 'test' }
    );

    expect(result).toEqual({ number: 5, url: 'https://github.com/o/r/milestone/5' });
    expect(mockExecFileNoThrow).toHaveBeenCalled();
  });

  it('should return cached value on second call for same owner/repo/title', async () => {
    mockExecFileNoThrow.mockResolvedValue({
      exitCode: 0,
      stdout: JSON.stringify({ number: 5, html_url: 'https://github.com/o/r/milestone/5' }),
      stderr: '',
    });

    await MilestoneCache.getOrCreate(
      'owner', 'repo', 'FS-001: Feature Title', 'desc',
      { GH_TOKEN: 'test' }
    );
    const callCount = mockExecFileNoThrow.mock.calls.length;

    const result2 = await MilestoneCache.getOrCreate(
      'owner', 'repo', 'FS-001: Feature Title', 'desc',
      { GH_TOKEN: 'test' }
    );

    expect(result2).toEqual({ number: 5, url: 'https://github.com/o/r/milestone/5' });
    // No additional API calls
    expect(mockExecFileNoThrow).toHaveBeenCalledTimes(callCount);
  });

  it('should make API call for different title (cache miss)', async () => {
    mockExecFileNoThrow.mockResolvedValueOnce({
      exitCode: 0,
      stdout: JSON.stringify({ number: 5, html_url: 'https://github.com/o/r/milestone/5' }),
      stderr: '',
    });

    await MilestoneCache.getOrCreate('owner', 'repo', 'FS-001: Title A', 'desc', { GH_TOKEN: 'test' });
    const callsAfterFirst = mockExecFileNoThrow.mock.calls.length;

    // Different title should make a new API call
    mockExecFileNoThrow.mockResolvedValueOnce({
      exitCode: 0,
      stdout: '',
      stderr: '',
    });
    mockExecFileNoThrow.mockResolvedValueOnce({
      exitCode: 0,
      stdout: JSON.stringify({ number: 6, html_url: 'https://github.com/o/r/milestone/6' }),
      stderr: '',
    });

    const result2 = await MilestoneCache.getOrCreate('owner', 'repo', 'FS-002: Title B', 'desc', { GH_TOKEN: 'test' });
    expect(result2.number).toBe(6);
    expect(mockExecFileNoThrow.mock.calls.length).toBeGreaterThan(callsAfterFirst);
  });

  it('should not leak cache across repos', async () => {
    mockExecFileNoThrow.mockResolvedValue({
      exitCode: 0,
      stdout: JSON.stringify({ number: 10, html_url: 'https://github.com/o/repoA/milestone/10' }),
      stderr: '',
    });

    await MilestoneCache.getOrCreate('owner', 'repoA', 'FS-001: Title', 'desc', { GH_TOKEN: 'test' });
    const callsAfterFirst = mockExecFileNoThrow.mock.calls.length;

    mockExecFileNoThrow.mockResolvedValueOnce({
      exitCode: 0,
      stdout: JSON.stringify({ number: 20, html_url: 'https://github.com/o/repoB/milestone/20' }),
      stderr: '',
    });

    const result = await MilestoneCache.getOrCreate('owner', 'repoB', 'FS-001: Title', 'desc', { GH_TOKEN: 'test' });
    expect(result.number).toBe(20);
    expect(mockExecFileNoThrow.mock.calls.length).toBeGreaterThan(callsAfterFirst);
  });

  it('should create milestone when lookup returns empty', async () => {
    // First call: lookup returns empty (no existing milestone)
    mockExecFileNoThrow.mockResolvedValueOnce({
      exitCode: 0,
      stdout: '',
      stderr: '',
    });
    // Second call: creation returns new milestone
    mockExecFileNoThrow.mockResolvedValueOnce({
      exitCode: 0,
      stdout: JSON.stringify({ number: 99, html_url: 'https://github.com/o/r/milestone/99' }),
      stderr: '',
    });

    const result = await MilestoneCache.getOrCreate('owner', 'repo', 'FS-099: New', 'desc', { GH_TOKEN: 'test' });
    expect(result).toEqual({ number: 99, url: 'https://github.com/o/r/milestone/99' });
    expect(mockExecFileNoThrow).toHaveBeenCalledTimes(2);
  });
});
