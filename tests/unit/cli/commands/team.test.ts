/**
 * Tests for Team CLI Command
 *
 * Verifies that `specweave team` correctly launches Claude Code
 * with agent teams flags (--teammate-mode, --dangerously-skip-permissions)
 * and CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 env var.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock child_process.spawn before importing the module
const { mockSpawn, mockOn } = vi.hoisted(() => {
  const mockOn = vi.fn();
  const mockSpawn = vi.fn(() => ({
    on: mockOn,
    pid: 12345,
  }));
  return { mockSpawn, mockOn };
});

vi.mock('child_process', () => ({
  spawn: mockSpawn,
}));

// Mock execFileNoThrowSync for CLI detection
const { mockExecFileNoThrowSync } = vi.hoisted(() => ({
  mockExecFileNoThrowSync: vi.fn(),
}));

vi.mock('../../../../src/utils/execFileNoThrow.js', () => ({
  execFileNoThrowSync: mockExecFileNoThrowSync,
}));

import { handleTeamCommand, TeamCommandOptions } from '../../../../src/cli/commands/team.js';

describe('Team Command', () => {
  let tempDir: string;
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let originalCwd: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'team-test-'));

    // Create SpecWeave project structure
    fs.mkdirSync(path.join(tempDir, '.specweave'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, '.specweave', 'config.json'),
      JSON.stringify({ project: { name: 'test-project' } })
    );
    fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, '.claude', 'settings.json'),
      JSON.stringify({ enabledPlugins: {} })
    );

    // Default: claude CLI is available, tmux is available
    mockExecFileNoThrowSync.mockImplementation((cmd: string, args: string[]) => {
      if (cmd === 'which' && args[0] === 'claude') {
        return { success: true, stdout: '/usr/local/bin/claude', stderr: '', exitCode: 0 };
      }
      if (cmd === 'which' && args[0] === 'tmux') {
        return { success: true, stdout: '/usr/bin/tmux', stderr: '', exitCode: 0 };
      }
      if (cmd === 'which' && args[0] === 'it2') {
        return { success: false, stdout: '', stderr: 'not found', exitCode: 1 };
      }
      return { success: false, stdout: '', stderr: 'not found', exitCode: 1 };
    });

    // Mock spawn - don't simulate exit event (avoids async process.exit after test cleanup)
    mockSpawn.mockClear();
    mockOn.mockClear();

    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    exitSpy.mockRestore();
    mockSpawn.mockClear();
    mockOn.mockClear();
    mockExecFileNoThrowSync.mockReset();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('spawning claude with correct flags', () => {
    it('should spawn claude with --teammate-mode tmux and --dangerously-skip-permissions', async () => {
      await handleTeamCommand(undefined, {});

      expect(mockSpawn).toHaveBeenCalledTimes(1);
      const [cmd, args] = mockSpawn.mock.calls[0];
      expect(cmd).toBe('claude');
      expect(args).toContain('--teammate-mode');
      expect(args).toContain('tmux');
      expect(args).toContain('--dangerously-skip-permissions');
    });

    it('should set CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 in spawn env', async () => {
      await handleTeamCommand(undefined, {});

      expect(mockSpawn).toHaveBeenCalledTimes(1);
      const spawnOptions = mockSpawn.mock.calls[0][2];
      expect(spawnOptions.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS).toBe('1');
    });

    it('should use stdio inherit for interactive terminal', async () => {
      await handleTeamCommand(undefined, {});

      const spawnOptions = mockSpawn.mock.calls[0][2];
      expect(spawnOptions.stdio).toBe('inherit');
    });
  });

  describe('description passthrough', () => {
    it('should pass description as initial prompt when provided', async () => {
      await handleTeamCommand('Build auth system', {});

      expect(mockSpawn).toHaveBeenCalledTimes(1);
      const [, args] = mockSpawn.mock.calls[0];
      // Description should appear somewhere in the args
      const argsStr = args.join(' ');
      expect(argsStr).toContain('Build auth system');
    });

    it('should not include prompt arg when no description', async () => {
      await handleTeamCommand(undefined, {});

      const [, args] = mockSpawn.mock.calls[0];
      // Should only have the flags, no extra prompt args
      expect(args).toEqual(['--teammate-mode', 'tmux', '--dangerously-skip-permissions']);
    });
  });

  describe('mode selection', () => {
    it('should use in-process mode when explicitly requested', async () => {
      await handleTeamCommand(undefined, { mode: 'in-process' });

      const [, args] = mockSpawn.mock.calls[0];
      expect(args).toContain('in-process');
    });

    it('should fall back to in-process when tmux is unavailable', async () => {
      mockExecFileNoThrowSync.mockImplementation((cmd: string, args: string[]) => {
        if (cmd === 'which' && args[0] === 'claude') {
          return { success: true, stdout: '/usr/local/bin/claude', stderr: '', exitCode: 0 };
        }
        // tmux and it2 not available
        return { success: false, stdout: '', stderr: 'not found', exitCode: 1 };
      });

      await handleTeamCommand(undefined, {});

      const [, args] = mockSpawn.mock.calls[0];
      expect(args).toContain('in-process');

      // Should warn the user
      const logCalls = consoleSpy.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(logCalls).toMatch(/tmux|iTerm2|in-process/i);
    });
  });

  describe('error handling', () => {
    it('should error when claude CLI is not found', async () => {
      mockExecFileNoThrowSync.mockImplementation(() => ({
        success: false,
        stdout: '',
        stderr: 'not found',
        exitCode: 1,
      }));

      await handleTeamCommand(undefined, {});

      expect(mockSpawn).not.toHaveBeenCalled();
      const errorCalls = consoleErrorSpy.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(errorCalls).toMatch(/claude/i);
    });

    it('should error when project is not initialized', async () => {
      // Remove .specweave dir
      fs.rmSync(path.join(tempDir, '.specweave'), { recursive: true, force: true });

      await handleTeamCommand(undefined, {});

      expect(mockSpawn).not.toHaveBeenCalled();
    });
  });

  describe('settings.json env var auto-fix', () => {
    it('should add env var to settings.json if missing', async () => {
      await handleTeamCommand(undefined, {});

      const settingsPath = path.join(tempDir, '.claude', 'settings.json');
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      expect(settings.env?.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS).toBe('1');
    });
  });
});
