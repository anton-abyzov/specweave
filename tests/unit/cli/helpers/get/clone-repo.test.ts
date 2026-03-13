import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as path from 'path';

// Must be hoisted for ESM mocking
const mockExecFileNoThrow = vi.hoisted(() => vi.fn());
const mockFs = vi.hoisted(() => ({
  existsSync: vi.fn(),
  promises: { mkdir: vi.fn() },
}));

vi.mock('../../../../../src/utils/execFileNoThrow.js', () => ({
  execFileNoThrow: mockExecFileNoThrow,
}));

vi.mock('fs', () => mockFs);

import { cloneRepo } from '../../../../../src/cli/helpers/get/clone-repo.js';
import type { ParsedSource } from '../../../../../src/cli/helpers/get/source-parser.js';

const githubSource: ParsedSource = {
  type: 'github',
  owner: 'owner',
  repo: 'repo',
  cloneUrl: 'https://github.com/owner/repo.git',
};

describe('cloneRepo', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockFs.promises.mkdir.mockResolvedValue(undefined);
    mockExecFileNoThrow.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '', success: true });
  });

  describe('idempotency', () => {
    it('AC-US2-04: skips clone when .git already exists', async () => {
      mockFs.existsSync.mockImplementation((p: string) => p.endsWith('.git'));

      const result = await cloneRepo(githubSource, '/workspace/repositories/owner/repo');

      expect(result.cloned).toBe(false);
      expect(result.skippedReason).toBe('already exists');
      expect(mockExecFileNoThrow).not.toHaveBeenCalled();
    });

    it('reports correct repoPath when skipping', async () => {
      mockFs.existsSync.mockImplementation((p: string) => p.endsWith('.git'));
      const targetDir = '/workspace/repositories/owner/repo';

      const result = await cloneRepo(githubSource, targetDir);

      expect(result.repoPath).toBe(targetDir);
    });
  });

  describe('non-git dir check', () => {
    it('throws if targetDir exists without .git', async () => {
      mockFs.existsSync.mockImplementation((p: string) => {
        if (p.endsWith('.git')) return false;
        if (p === '/workspace/repositories/owner/repo') return true;
        return false;
      });

      await expect(cloneRepo(githubSource, '/workspace/repositories/owner/repo'))
        .rejects.toThrow('not a git repository');
    });
  });

  describe('successful clone', () => {
    beforeEach(() => {
      mockFs.existsSync.mockReturnValue(false);
    });

    it('AC-US2-01: clones to targetDir', async () => {
      const result = await cloneRepo(githubSource, '/workspace/repositories/owner/repo');

      expect(result.cloned).toBe(true);
      expect(result.repoPath).toBe('/workspace/repositories/owner/repo');
    });

    it('AC-US2-03: passes --branch when specified', async () => {
      await cloneRepo(githubSource, '/workspace/repositories/owner/repo', { branch: 'feature-x' });

      const [, args] = mockExecFileNoThrow.mock.calls[0];
      expect(args).toContain('--branch');
      expect(args).toContain('feature-x');
    });

    it('omits --branch when not specified', async () => {
      await cloneRepo(githubSource, '/workspace/repositories/owner/repo');

      const [, args] = mockExecFileNoThrow.mock.calls[0];
      expect(args).not.toContain('--branch');
    });

    it('creates parent directory before cloning', async () => {
      await cloneRepo(githubSource, '/workspace/repositories/owner/repo');

      expect(mockFs.promises.mkdir).toHaveBeenCalledWith(
        '/workspace/repositories/owner',
        { recursive: true }
      );
    });
  });

  describe('auth errors', () => {
    beforeEach(() => {
      mockFs.existsSync.mockReturnValue(false);
    });

    it('AC-US2-05: throws with SSH key hint on publickey error', async () => {
      mockExecFileNoThrow.mockResolvedValue({
        exitCode: 128, success: false,
        stdout: '', stderr: 'Permission denied (publickey)',
      });

      await expect(cloneRepo(githubSource, '/workspace/repositories/owner/repo'))
        .rejects.toThrow('Authentication failed');
    });

    it('suggests gh auth login on HTTPS auth failure', async () => {
      mockExecFileNoThrow.mockResolvedValue({
        exitCode: 128, success: false,
        stdout: '', stderr: 'Authentication failed for https://...',
      });

      await expect(cloneRepo(githubSource, '/workspace/repositories/owner/repo'))
        .rejects.toThrow('gh auth login');
    });

    it('throws generic error for non-auth failures', async () => {
      mockExecFileNoThrow.mockResolvedValue({
        exitCode: 1, success: false,
        stdout: '', stderr: 'fatal: some other error',
      });

      await expect(cloneRepo(githubSource, '/workspace/repositories/owner/repo'))
        .rejects.toThrow('Failed to clone');
    });
  });

  describe('mkdir errors', () => {
    it('wraps mkdir failure with clear message', async () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.promises.mkdir.mockRejectedValue(new Error('EACCES: permission denied'));

      await expect(cloneRepo(githubSource, '/readonly/owner/repo'))
        .rejects.toThrow('Cannot create directory');
    });
  });
});
