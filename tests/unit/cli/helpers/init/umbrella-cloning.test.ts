/**
 * Umbrella Cloning Tests
 *
 * Tests for cloneUmbrellaIntoCurrentDir:
 * - Successful clone into fresh directory (no .git)
 * - Successful clone replacing git init .git (no remotes → replace)
 * - Guards against pre-existing real repo (has remotes → skip)
 * - Handles clone failure
 * - Handles checkout failure
 * - URL format: SSH vs HTTPS
 * - Cleans up temp dir on failure
 * - Sanitizes PAT from error messages
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';

const mockExecFileNoThrow = vi.hoisted(() => vi.fn());
const mockFsExistsSync = vi.hoisted(() => vi.fn());
const mockFsMove = vi.hoisted(() => vi.fn());
const mockFsRemove = vi.hoisted(() => vi.fn());

vi.mock('../../../../../src/utils/execFileNoThrow.js', () => ({
  execFileNoThrow: mockExecFileNoThrow,
}));

vi.mock('fs', () => ({
  existsSync: mockFsExistsSync,
}));

vi.mock('../../../../../src/utils/fs-native.js', () => ({
  move: mockFsMove,
  remove: mockFsRemove,
}));

vi.mock('chalk', () => ({
  default: {
    gray: (s: string) => s,
    green: (s: string) => s,
    blue: (s: string) => s,
    yellow: (s: string) => s,
    red: (s: string) => s,
  },
}));

import { cloneUmbrellaIntoCurrentDir } from '../../../../../src/cli/helpers/init/umbrella-cloning.js';

/** Helper: mock execFileNoThrow for a successful sequence */
function mockSuccess() {
  return { success: true, stdout: '', stderr: '', exitCode: 0 };
}

function mockFailure(stderr: string, exitCode = 1) {
  return { success: false, stdout: '', stderr, exitCode };
}

describe('umbrella-cloning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    // Default: no .git dir exists
    mockFsExistsSync.mockReturnValue(false);
    // Default: fs operations succeed
    mockFsMove.mockResolvedValue(undefined);
    mockFsRemove.mockResolvedValue(undefined);
  });

  describe('cloneUmbrellaIntoCurrentDir', () => {
    it('successfully clones into fresh directory (no .git)', async () => {
      mockFsExistsSync.mockReturnValue(false);
      mockExecFileNoThrow
        .mockResolvedValueOnce(mockSuccess())  // git clone --no-checkout
        .mockResolvedValueOnce(mockSuccess()); // git checkout .

      const result = await cloneUmbrellaIntoCurrentDir(
        '/project',
        'my-org',
        'my-umbrella',
        'ghp_secret123',
        'https'
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      // Verify clone command uses --no-checkout
      const cloneCall = mockExecFileNoThrow.mock.calls[0];
      expect(cloneCall[0]).toBe('git');
      expect(cloneCall[1]).toContain('clone');
      expect(cloneCall[1]).toContain('--no-checkout');

      // URL should include PAT for HTTPS
      const cloneUrl = cloneCall[1].find((a: string) => a.includes('github.com'));
      expect(cloneUrl).toContain('ghp_secret123@github.com');
      expect(cloneUrl).toContain('my-org');
      expect(cloneUrl).toContain('my-umbrella');

      // Verify checkout runs in project dir
      const checkoutCall = mockExecFileNoThrow.mock.calls[1];
      expect(checkoutCall[0]).toBe('git');
      expect(checkoutCall[1]).toEqual(['checkout', '.']);
      expect(checkoutCall[2]).toEqual({ cwd: '/project' });

      // Verify .git was moved from temp to project root
      expect(mockFsMove).toHaveBeenCalledWith(
        expect.stringContaining('.git'),
        path.join('/project', '.git')
      );

      // Temp dir cleaned up
      expect(mockFsRemove).toHaveBeenCalled();
    });

    it('replaces git init .git (no remotes) with umbrella repo', async () => {
      // .git exists (from git init during specweave init)
      mockFsExistsSync.mockReturnValue(true);
      mockExecFileNoThrow
        .mockResolvedValueOnce({ success: true, stdout: '', stderr: '', exitCode: 0 }) // git remote (empty = no remotes)
        .mockResolvedValueOnce(mockSuccess())  // git clone --no-checkout
        .mockResolvedValueOnce(mockSuccess()); // git checkout .

      const result = await cloneUmbrellaIntoCurrentDir(
        '/project',
        'my-org',
        'my-umbrella',
        'ghp_test',
        'https'
      );

      expect(result.success).toBe(true);

      // Should have checked for remotes
      expect(mockExecFileNoThrow.mock.calls[0][1]).toEqual(['remote']);

      // Should have removed the old .git
      expect(mockFsRemove).toHaveBeenCalledWith(path.join('/project', '.git'));

      // Then cloned the umbrella
      const cloneCall = mockExecFileNoThrow.mock.calls[1];
      expect(cloneCall[1]).toContain('clone');
    });

    it('skips clone when .git has remotes (pre-existing real repo)', async () => {
      mockFsExistsSync.mockReturnValue(true);
      mockExecFileNoThrow.mockResolvedValueOnce({
        success: true,
        stdout: 'origin\n', // has a remote
        stderr: '',
        exitCode: 0,
      });

      const result = await cloneUmbrellaIntoCurrentDir(
        '/project',
        'my-org',
        'my-umbrella',
        'ghp_test',
        'https'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('remotes');
      // Should NOT attempt clone
      expect(mockExecFileNoThrow).toHaveBeenCalledTimes(1); // only git remote
      expect(mockFsRemove).not.toHaveBeenCalledWith(path.join('/project', '.git'));
    });

    it('successfully clones with SSH URL (no PAT in URL)', async () => {
      mockFsExistsSync.mockReturnValue(false);
      mockExecFileNoThrow
        .mockResolvedValueOnce(mockSuccess())
        .mockResolvedValueOnce(mockSuccess());

      const result = await cloneUmbrellaIntoCurrentDir(
        '/project',
        'my-org',
        'my-umbrella',
        'ghp_secret123',
        'ssh'
      );

      expect(result.success).toBe(true);

      const cloneUrl = mockExecFileNoThrow.mock.calls[0][1].find((a: string) => a.includes('github.com'));
      expect(cloneUrl).toBe('git@github.com:my-org/my-umbrella.git');
      expect(cloneUrl).not.toContain('ghp_secret123');
    });

    it('returns error when git clone fails', async () => {
      mockFsExistsSync.mockReturnValue(false);
      mockExecFileNoThrow.mockResolvedValueOnce(mockFailure('fatal: repository not found', 128));

      const result = await cloneUmbrellaIntoCurrentDir(
        '/project',
        'my-org',
        'bad-repo',
        'ghp_test',
        'https'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Clone failed');
      expect(result.error).toContain('repository not found');
      // Should not attempt checkout
      expect(mockExecFileNoThrow).toHaveBeenCalledTimes(1);
      // Should clean up temp dir
      expect(mockFsRemove).toHaveBeenCalled();
    });

    it('returns error when git checkout fails', async () => {
      mockFsExistsSync.mockReturnValue(false);
      mockExecFileNoThrow
        .mockResolvedValueOnce(mockSuccess())
        .mockResolvedValueOnce(mockFailure('error: pathspec did not match'));

      const result = await cloneUmbrellaIntoCurrentDir(
        '/project',
        'my-org',
        'my-umbrella',
        'ghp_test',
        'https'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Checkout failed');
      expect(mockFsRemove).toHaveBeenCalled();
    });

    it('sanitizes PAT from error messages', async () => {
      const secretPat = 'ghp_SuperSecret123';
      mockFsExistsSync.mockReturnValue(false);
      mockExecFileNoThrow.mockResolvedValueOnce(
        mockFailure(`fatal: unable to access 'https://${secretPat}@github.com/org/repo.git/': timeout`, 128)
      );

      const result = await cloneUmbrellaIntoCurrentDir('/project', 'org', 'repo', secretPat, 'https');

      expect(result.success).toBe(false);
      expect(result.error).not.toContain(secretPat);
      expect(result.error).toContain('***');
    });

    it('cleans up temp dir even when fs.move fails', async () => {
      mockFsExistsSync.mockReturnValue(false);
      mockExecFileNoThrow.mockResolvedValueOnce(mockSuccess());
      mockFsMove.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(cloneUmbrellaIntoCurrentDir(
        '/project', 'my-org', 'my-umbrella', 'ghp_test', 'https'
      )).rejects.toThrow('Permission denied');

      // Temp dir still cleaned up via finally
      expect(mockFsRemove).toHaveBeenCalled();
    });

    it('defaults to https when gitUrlFormat not specified', async () => {
      mockFsExistsSync.mockReturnValue(false);
      mockExecFileNoThrow
        .mockResolvedValueOnce(mockSuccess())
        .mockResolvedValueOnce(mockSuccess());

      await cloneUmbrellaIntoCurrentDir('/project', 'org', 'repo', 'ghp_test');

      const cloneUrl = mockExecFileNoThrow.mock.calls[0][1].find((a: string) => a.includes('github.com'));
      expect(cloneUrl).toMatch(/^https:\/\//);
    });
  });
});
