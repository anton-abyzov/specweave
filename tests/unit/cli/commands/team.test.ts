/**
 * Tests for Team CLI Command
 *
 * Verifies that `specweave team` correctly launches Claude Code
 * with agent teams flags and auto-launches tmux when needed.
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

// Mock enableAgentTeamsEnvVar to track call args
const { mockEnableAgentTeamsEnvVar } = vi.hoisted(() => ({
  mockEnableAgentTeamsEnvVar: vi.fn(),
}));

vi.mock('../../../../src/cli/helpers/init/claude-settings-env.js', () => ({
  enableAgentTeamsEnvVar: mockEnableAgentTeamsEnvVar,
}));

import { handleTeamCommand } from '../../../../src/cli/commands/team.js';

describe('Team Command', () => {
  let tempDir: string;
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let originalCwd: string;
  let originalTmux: string | undefined;

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

    // Default: claude + tmux available, it2 not available
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

    mockSpawn.mockClear();
    mockOn.mockClear();

    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    // Save and clear TMUX env — tests control it explicitly
    originalTmux = process.env.TMUX;
    delete process.env.TMUX;

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
    mockEnableAgentTeamsEnvVar.mockClear();

    // Restore original TMUX env
    if (originalTmux !== undefined) {
      process.env.TMUX = originalTmux;
    } else {
      delete process.env.TMUX;
    }

    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('when inside a tmux session', () => {
    beforeEach(() => {
      process.env.TMUX = '/tmp/tmux-501/default,12345,0';
    });

    it('should spawn claude with --teammate-mode tmux', async () => {
      await handleTeamCommand(undefined, {});

      expect(mockSpawn).toHaveBeenCalledTimes(1);
      const [cmd, args] = mockSpawn.mock.calls[0];
      expect(cmd).toBe('claude');
      expect(args).toContain('--dangerously-skip-permissions');
      expect(args).toContain('--teammate-mode');
      expect(args).toContain('tmux');
    });

    it('should set CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 in spawn env', async () => {
      await handleTeamCommand(undefined, {});

      const spawnOptions = mockSpawn.mock.calls[0][2];
      expect(spawnOptions.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS).toBe('1');
    });

    it('should use stdio inherit for interactive terminal', async () => {
      await handleTeamCommand(undefined, {});

      const spawnOptions = mockSpawn.mock.calls[0][2];
      expect(spawnOptions.stdio).toBe('inherit');
    });

    it('should pass description as positional arg', async () => {
      await handleTeamCommand('Build auth system', {});

      const [, args] = mockSpawn.mock.calls[0];
      expect(args).toContain('Build auth system');
      expect(args).not.toContain('-p');
    });

    it('should not include prompt arg when no description', async () => {
      await handleTeamCommand(undefined, {});

      const [, args] = mockSpawn.mock.calls[0];
      expect(args).toContain('--dangerously-skip-permissions');
      expect(args).toContain('--teammate-mode');
      expect(args).not.toContain('-p');
    });
  });

  describe('when NOT inside a tmux session (auto-launch)', () => {
    it('should spawn tmux (not claude) to auto-launch a tmux session', async () => {
      await handleTeamCommand(undefined, {});

      expect(mockSpawn).toHaveBeenCalledTimes(1);
      const [cmd, args] = mockSpawn.mock.calls[0];
      expect(cmd).toBe('tmux');
      expect(args[0]).toBe('new-session');
      // Should re-launch specweave team inside tmux with --mode tmux
      expect(args).toContain('specweave');
      expect(args).toContain('team');
      expect(args).toContain('--mode');
      expect(args).toContain('tmux');
    });

    it('should pass description through to the re-launched command', async () => {
      await handleTeamCommand('Build auth system', {});

      const [cmd, args] = mockSpawn.mock.calls[0];
      expect(cmd).toBe('tmux');
      expect(args).toContain('Build auth system');
    });

    it('should pass --no-increment through to the re-launched command', async () => {
      await handleTeamCommand(undefined, { noIncrement: true });

      const [cmd, args] = mockSpawn.mock.calls[0];
      expect(cmd).toBe('tmux');
      expect(args).toContain('--no-increment');
    });

    it('should set CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 in tmux spawn env', async () => {
      await handleTeamCommand(undefined, {});

      const spawnOptions = mockSpawn.mock.calls[0][2];
      expect(spawnOptions.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS).toBe('1');
    });

    it('should use a unique tmux session name', async () => {
      await handleTeamCommand(undefined, {});

      const [, args] = mockSpawn.mock.calls[0];
      const sessionNameIdx = args.indexOf('-s') + 1;
      expect(args[sessionNameIdx]).toMatch(/^sw-team-\d+$/);
    });
  });

  describe('explicit --mode flag', () => {
    it('should use in-process when --mode in-process, even with tmux available', async () => {
      await handleTeamCommand(undefined, { mode: 'in-process' });

      expect(mockSpawn).toHaveBeenCalledTimes(1);
      const [cmd, args] = mockSpawn.mock.calls[0];
      expect(cmd).toBe('claude');
      expect(args).toContain('--teammate-mode');
      expect(args).toContain('in-process');
    });

    it('should use tmux when --mode tmux and inside tmux', async () => {
      process.env.TMUX = '/tmp/tmux-501/default,12345,0';
      await handleTeamCommand(undefined, { mode: 'tmux' });

      const [cmd, args] = mockSpawn.mock.calls[0];
      expect(cmd).toBe('claude');
      expect(args).toContain('tmux');
    });
  });

  describe('no tmux installed', () => {
    it('should fall back to in-process with helpful message', async () => {
      mockExecFileNoThrowSync.mockImplementation((cmd: string, args: string[]) => {
        if (cmd === 'which' && args[0] === 'claude') {
          return { success: true, stdout: '/usr/local/bin/claude', stderr: '', exitCode: 0 };
        }
        return { success: false, stdout: '', stderr: 'not found', exitCode: 1 };
      });

      await handleTeamCommand(undefined, {});

      expect(mockSpawn).toHaveBeenCalledTimes(1);
      const [cmd, args] = mockSpawn.mock.calls[0];
      expect(cmd).toBe('claude');
      expect(args).toContain('in-process');

      const logCalls = consoleSpy.mock.calls.map((c: unknown[]) => c.join(' ')).join('\n');
      expect(logCalls).toMatch(/tmux not found/i);
      expect(logCalls).toMatch(/brew install tmux/i);
    });
  });

  describe('iTerm2 detection', () => {
    it('should use tmux mode when it2 CLI is available', async () => {
      mockExecFileNoThrowSync.mockImplementation((cmd: string, args: string[]) => {
        if (cmd === 'which' && args[0] === 'claude') {
          return { success: true, stdout: '/usr/local/bin/claude', stderr: '', exitCode: 0 };
        }
        if (cmd === 'which' && args[0] === 'it2') {
          return { success: true, stdout: '/usr/local/bin/it2', stderr: '', exitCode: 0 };
        }
        return { success: false, stdout: '', stderr: 'not found', exitCode: 1 };
      });

      await handleTeamCommand(undefined, {});

      const [cmd, args] = mockSpawn.mock.calls[0];
      expect(cmd).toBe('claude');
      expect(args).toContain('tmux');
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
      fs.rmSync(path.join(tempDir, '.specweave'), { recursive: true, force: true });

      await handleTeamCommand(undefined, {});

      expect(mockSpawn).not.toHaveBeenCalled();
    });
  });

  describe('settings.json env var auto-fix', () => {
    beforeEach(() => {
      process.env.TMUX = '/tmp/tmux-501/default,12345,0';
    });

    it('should call enableAgentTeamsEnvVar with project directory', async () => {
      await handleTeamCommand(undefined, {});

      const calls = mockEnableAgentTeamsEnvVar.mock.calls.map((c: unknown[]) => c[0]);
      expect(calls).toContainEqual(process.cwd());
    });

    it('should also call enableAgentTeamsEnvVar with os.homedir() for global settings', async () => {
      await handleTeamCommand(undefined, {});

      const calls = mockEnableAgentTeamsEnvVar.mock.calls.map((c: unknown[]) => c[0]);
      expect(calls).toContainEqual(os.homedir());
    });
  });
});
