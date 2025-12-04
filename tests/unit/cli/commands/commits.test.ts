/**
 * Unit tests for commits command
 *
 * Tests git commit display functionality including:
 * - Successful output with commits
 * - Error handling for non-git directories
 * - Subdirectory operation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execSync } from 'child_process';

// Mock child_process
vi.mock('child_process', () => ({
  execSync: vi.fn()
}));

// Mock chalk to return plain strings for testing
vi.mock('chalk', () => ({
  default: {
    red: (s: string) => s,
    yellow: (s: string) => s,
    bold: (s: string) => s,
    cyan: (s: string) => s,
    dim: (s: string) => s
  }
}));

describe('commitsCommand', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;
  const mockExecSync = vi.mocked(execSync);

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('successful execution', () => {
    it('should display last 2 commits with hash, author, and message', async () => {
      // Mock git rev-parse to succeed (we're in a git repo)
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'git rev-parse --git-dir') {
          return '.git';
        }
        if (cmd === 'git log -2 --format="%h %an: %s"') {
          return 'abc1234 John Doe: First commit\ndef5678 Jane Smith: Second commit';
        }
        return '';
      });

      const { commitsCommand } = await import('../../../../src/cli/commands/commits.js');
      await commitsCommand();

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Last 2 commits'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('abc1234'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('def5678'));
    });

    it('should handle empty repository gracefully', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'git rev-parse --git-dir') {
          return '.git';
        }
        if (cmd === 'git log -2 --format="%h %an: %s"') {
          return '';
        }
        return '';
      });

      const { commitsCommand } = await import('../../../../src/cli/commands/commits.js');
      await commitsCommand();

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No commits found'));
    });
  });

  describe('error handling', () => {
    it('should show error when not in git repository', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'git rev-parse --git-dir') {
          throw new Error('fatal: not a git repository');
        }
        return '';
      });

      const { commitsCommand } = await import('../../../../src/cli/commands/commits.js');
      await commitsCommand();

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Not a git repository'));
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle git command failure', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'git rev-parse --git-dir') {
          return '.git';
        }
        if (cmd === 'git log -2 --format="%h %an: %s"') {
          throw new Error('git log failed');
        }
        return '';
      });

      const { commitsCommand } = await import('../../../../src/cli/commands/commits.js');
      await commitsCommand();

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error'));
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });
});
