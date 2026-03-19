/**
 * Unit tests for label-cache.ts (T-001)
 *
 * Verifies session-level label caching to avoid redundant `gh label create` calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockExecFileNoThrow } = vi.hoisted(() => {
  const mockExecFileNoThrow = vi.fn();
  return { mockExecFileNoThrow };
});

vi.mock('../../../../plugins/specweave/lib/vendor/utils/execFileNoThrow.js', () => ({
  execFileNoThrow: mockExecFileNoThrow,
}));

import { ensureLabels, clearLabelCache } from '../../../../plugins/specweave/lib/integrations/github/label-cache.js';

describe('label-cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearLabelCache();
    mockExecFileNoThrow.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
  });

  it('should call gh label create for each label on first call', async () => {
    await ensureLabels('owner/repo', ['specweave', 'bug'], { GH_TOKEN: 'test' });

    expect(mockExecFileNoThrow).toHaveBeenCalledTimes(2);
    expect(mockExecFileNoThrow).toHaveBeenCalledWith(
      'gh',
      expect.arrayContaining(['label', 'create', 'specweave']),
      expect.anything()
    );
    expect(mockExecFileNoThrow).toHaveBeenCalledWith(
      'gh',
      expect.arrayContaining(['label', 'create', 'bug']),
      expect.anything()
    );
  });

  it('should skip gh label create on second call for same repo+label', async () => {
    await ensureLabels('owner/repo', ['specweave'], { GH_TOKEN: 'test' });
    expect(mockExecFileNoThrow).toHaveBeenCalledTimes(1);

    mockExecFileNoThrow.mockClear();
    await ensureLabels('owner/repo', ['specweave'], { GH_TOKEN: 'test' });
    expect(mockExecFileNoThrow).not.toHaveBeenCalled();
  });

  it('should not leak cache across repos', async () => {
    await ensureLabels('owner/repoA', ['specweave'], { GH_TOKEN: 'test' });
    expect(mockExecFileNoThrow).toHaveBeenCalledTimes(1);

    mockExecFileNoThrow.mockClear();
    await ensureLabels('owner/repoB', ['specweave'], { GH_TOKEN: 'test' });
    expect(mockExecFileNoThrow).toHaveBeenCalledTimes(1);
  });

  it('should handle mixed cached and uncached labels', async () => {
    await ensureLabels('owner/repo', ['specweave'], { GH_TOKEN: 'test' });
    expect(mockExecFileNoThrow).toHaveBeenCalledTimes(1);

    mockExecFileNoThrow.mockClear();
    await ensureLabels('owner/repo', ['specweave', 'feature'], { GH_TOKEN: 'test' });
    // Only 'feature' should trigger a call
    expect(mockExecFileNoThrow).toHaveBeenCalledTimes(1);
    expect(mockExecFileNoThrow).toHaveBeenCalledWith(
      'gh',
      expect.arrayContaining(['label', 'create', 'feature']),
      expect.anything()
    );
  });

  it('should cache labels even when gh label create fails', async () => {
    mockExecFileNoThrow.mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'error' });

    await ensureLabels('owner/repo', ['specweave'], { GH_TOKEN: 'test' });
    expect(mockExecFileNoThrow).toHaveBeenCalledTimes(1);

    mockExecFileNoThrow.mockClear();
    await ensureLabels('owner/repo', ['specweave'], { GH_TOKEN: 'test' });
    // Still cached — we cache on attempt, not on success
    expect(mockExecFileNoThrow).not.toHaveBeenCalled();
  });

  it('should handle empty label array without error', async () => {
    await ensureLabels('owner/repo', [], { GH_TOKEN: 'test' });
    expect(mockExecFileNoThrow).not.toHaveBeenCalled();
  });

  it('should pass --repo and --force flags to gh', async () => {
    await ensureLabels('owner/repo', ['specweave'], { GH_TOKEN: 'test' });

    expect(mockExecFileNoThrow).toHaveBeenCalledWith(
      'gh',
      expect.arrayContaining(['--repo', 'owner/repo', '--force']),
      expect.anything()
    );
  });

  it('should pass env to execFileNoThrow', async () => {
    const env = { GH_TOKEN: 'secret-token' };
    await ensureLabels('owner/repo', ['specweave'], env);

    expect(mockExecFileNoThrow).toHaveBeenCalledWith(
      'gh',
      expect.anything(),
      expect.objectContaining({ env })
    );
  });
});
