/**
 * Umbrella Cloning Tests
 *
 * Tests for cloneUmbrellaIntoCurrentDir:
 * - Successful clone (happy path)
 * - Guards against existing .git directory
 * - Handles clone failure
 * - Handles checkout failure
 * - URL format: SSH vs HTTPS
 * - Cleans up temp dir on failure
 * - Sanitizes PAT from error messages
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';
import os from 'os';

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
    it('successfully clones umbrella repo with HTTPS', async () => {
      mockExecFileNoThrow
        // git clone --no-checkout
        .mockResolvedValueOnce({ success: true, stdout: '', stderr: '', exitCode: 0 })
        // git checkout .
        .mockResolvedValueOnce({ success: true, stdout: '', stderr: '', exitCode: 0 });

      const result = await cloneUmbrellaIntoCurrentDir(
        '/project',
        'my-org',
        'my-umbrella',
        'ghp_secret123',
        'https'
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      // Verify clone command
      const cloneCall = mockExecFileNoThrow.mock.calls[0];
      expect(cloneCall[0]).toBe('git');
      expect(cloneCall[1]).toContain('clone');
      expect(cloneCall[1]).toContain('--no-checkout');
      // URL should include PAT
      const cloneUrl = cloneCall[1].find((a: string) => a.includes('github.com'));
      expect(cloneUrl).toContain('ghp_secret123@github.com');
      expect(cloneUrl).toContain('my-org');
      expect(cloneUrl).toContain('my-umbrella');

      // Verify checkout in project dir
      const checkoutCall = mockExecFileNoThrow.mock.calls[1];
      expect(checkoutCall[0]).toBe('git');
      expect(checkoutCall[1]).toEqual(['checkout', '.']);
      expect(checkoutCall[2]).toEqual({ cwd: '/project' });

      // Verify .git was moved
      expect(mockFsMove).toHaveBeenCalledWith(
        expect.stringContaining('.git'),
        path.join('/project', '.git')
      );

      // Verify temp dir cleaned up
      expect(mockFsRemove).toHaveBeenCalled();
    });

    it('successfully clones umbrella repo with SSH', async () => {
      mockExecFileNoThrow
        .mockResolvedValueOnce({ success: true, stdout: '', stderr: '', exitCode: 0 })
        .mockResolvedValueOnce({ success: true, stdout: '', stderr: '', exitCode: 0 });

      const result = await cloneUmbrellaIntoCurrentDir(
        '/project',
        'my-org',
        'my-umbrella',
        'ghp_secret123',
        'ssh'
      );

      expect(result.success).toBe(true);

      // Verify SSH URL (no PAT)
      const cloneUrl = mockExecFileNoThrow.mock.calls[0][1].find((a: string) => a.includes('github.com'));
      expect(cloneUrl).toBe('git@github.com:my-org/my-umbrella.git');
      expect(cloneUrl).not.toContain('ghp_secret123');
    });

    it('returns error when .git already exists', async () => {
      mockFsExistsSync.mockReturnValue(true);

      const result = await cloneUmbrellaIntoCurrentDir(
        '/project',
        'my-org',
        'my-umbrella',
        'ghp_test',
        'https'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('already contains a git repository');
      // Should not attempt clone
      expect(mockExecFileNoThrow).not.toHaveBeenCalled();
    });

    it('returns error when git clone fails', async () => {
      mockExecFileNoThrow.mockResolvedValueOnce({
        success: false,
        stdout: '',
        stderr: 'fatal: repository not found',
        exitCode: 128,
      });

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
      // Should still clean up temp dir
      expect(mockFsRemove).toHaveBeenCalled();
    });

    it('returns error when git checkout fails', async () => {
      mockExecFileNoThrow
        .mockResolvedValueOnce({ success: true, stdout: '', stderr: '', exitCode: 0 })
        .mockResolvedValueOnce({
          success: false,
          stdout: '',
          stderr: 'error: pathspec did not match',
          exitCode: 1,
        });

      const result = await cloneUmbrellaIntoCurrentDir(
        '/project',
        'my-org',
        'my-umbrella',
        'ghp_test',
        'https'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Checkout failed');
      // Should clean up temp dir
      expect(mockFsRemove).toHaveBeenCalled();
    });

    it('sanitizes PAT from error messages', async () => {
      const secretPat = 'ghp_SuperSecret123';
      mockExecFileNoThrow.mockResolvedValueOnce({
        success: false,
        stdout: '',
        stderr: `fatal: unable to access 'https://${secretPat}@github.com/org/repo.git/': timeout`,
        exitCode: 128,
      });

      const result = await cloneUmbrellaIntoCurrentDir(
        '/project',
        'org',
        'repo',
        secretPat,
        'https'
      );

      expect(result.success).toBe(false);
      // PAT should be replaced with ***
      expect(result.error).not.toContain(secretPat);
      expect(result.error).toContain('***');
    });

    it('cleans up temp dir even when fs.move fails', async () => {
      mockExecFileNoThrow.mockResolvedValueOnce({ success: true, stdout: '', stderr: '', exitCode: 0 });
      mockFsMove.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(cloneUmbrellaIntoCurrentDir(
        '/project',
        'my-org',
        'my-umbrella',
        'ghp_test',
        'https'
      )).rejects.toThrow('Permission denied');

      // Temp dir should still be cleaned up via finally block
      expect(mockFsRemove).toHaveBeenCalled();
    });

    it('defaults to https when gitUrlFormat not specified', async () => {
      mockExecFileNoThrow
        .mockResolvedValueOnce({ success: true, stdout: '', stderr: '', exitCode: 0 })
        .mockResolvedValueOnce({ success: true, stdout: '', stderr: '', exitCode: 0 });

      await cloneUmbrellaIntoCurrentDir('/project', 'org', 'repo', 'ghp_test');

      const cloneUrl = mockExecFileNoThrow.mock.calls[0][1].find((a: string) => a.includes('github.com'));
      expect(cloneUrl).toMatch(/^https:\/\//);
    });
  });
});
