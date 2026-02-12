/**
 * Unit tests for claude-cli-detector.ts
 *
 * Tests the multi-strategy Claude CLI detection system including:
 * - getCleanEnv: environment variable filtering
 * - detectClaudeCli: multi-strategy detection with mocked child_process
 * - isClaudeCliAvailable: boolean wrapper
 * - getClaudeCliDiagnostic: human-readable diagnostics
 * - getClaudeCliSuggestions: actionable fix suggestions
 *
 * Mocks execFileNoThrowSync and spawnSync to simulate various detection scenarios
 * without running actual system commands.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Hoisted mocks ──────────────────────────────────────────────────────

const { mockExecFileNoThrowSync, mockSpawnSync, mockExistsSync, mockReaddirSync } = vi.hoisted(
  () => ({
    mockExecFileNoThrowSync: vi.fn(),
    mockSpawnSync: vi.fn(),
    mockExistsSync: vi.fn(),
    mockReaddirSync: vi.fn(),
  })
);

vi.mock('../../../src/utils/execFileNoThrow.js', () => ({
  execFileNoThrowSync: mockExecFileNoThrowSync,
  execFileNoThrow: vi.fn(),
}));

vi.mock('child_process', () => ({
  spawnSync: mockSpawnSync,
  execFileSync: vi.fn(),
  execFile: vi.fn(),
}));

vi.mock('../../../src/utils/fs-native.js', () => ({
  existsSync: mockExistsSync,
  readdirSync: mockReaddirSync,
}));

// ── Imports (after mocks) ──────────────────────────────────────────────

import {
  detectClaudeCli,
  isClaudeCliAvailable,
  getClaudeCliDiagnostic,
  getClaudeCliSuggestions,
  getCleanEnv,
} from '../../../src/utils/claude-cli-detector.js';
import type { ClaudeCliStatus } from '../../../src/utils/claude-cli-detector.js';

// ── Helpers ────────────────────────────────────────────────────────────

/** Creates a successful ExecResult */
function successResult(stdout = '', stderr = ''): {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
} {
  return { success: true, stdout, stderr, exitCode: 0 };
}

/** Creates a failed ExecResult */
function failResult(
  exitCode = 1,
  stderr = '',
  stdout = ''
): { success: boolean; stdout: string; stderr: string; exitCode: number } {
  return { success: false, stdout, stderr, exitCode };
}

/** Creates a base ClaudeCliStatus for building test fixtures */
function makeStatus(overrides: Partial<ClaudeCliStatus> = {}): ClaudeCliStatus {
  return {
    available: false,
    commandExists: false,
    pluginCommandsWork: false,
    platform: 'darwin' as NodeJS.Platform,
    ...overrides,
  };
}

// ── Test Suites ────────────────────────────────────────────────────────

describe('claude-cli-detector', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let originalPlatform: NodeJS.Platform;

  beforeEach(() => {
    vi.clearAllMocks();
    originalEnv = { ...process.env };
    originalPlatform = process.platform;

    // Default: no debug mode
    delete process.env.DEBUG;
    delete process.env.SPECWEAVE_DEBUG;

    // Default: fs mocks return false/empty
    mockExistsSync.mockReturnValue(false);
    mockReaddirSync.mockReturnValue([]);
  });

  afterEach(() => {
    process.env = originalEnv;
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  // ─── getCleanEnv ──────────────────────────────────────────────────

  describe('getCleanEnv', () => {
    it('should return an object (not undefined)', () => {
      const env = getCleanEnv();
      expect(env).toBeDefined();
      expect(typeof env).toBe('object');
    });

    it('should remove NODE_OPTIONS from env', () => {
      process.env.NODE_OPTIONS = '--inspect-brk=9229';
      const env = getCleanEnv();
      expect(env.NODE_OPTIONS).toBeUndefined();
    });

    it('should remove NODE_INSPECT from env', () => {
      process.env.NODE_INSPECT = 'true';
      const env = getCleanEnv();
      expect(env.NODE_INSPECT).toBeUndefined();
    });

    it('should remove NODE_INSPECT_RESUME_ON_START from env', () => {
      process.env.NODE_INSPECT_RESUME_ON_START = '1';
      const env = getCleanEnv();
      expect(env.NODE_INSPECT_RESUME_ON_START).toBeUndefined();
    });

    it('should remove NODE_V8_COVERAGE from env', () => {
      process.env.NODE_V8_COVERAGE = '/tmp/coverage';
      const env = getCleanEnv();
      expect(env.NODE_V8_COVERAGE).toBeUndefined();
    });

    it('should remove VSCODE_INSPECTOR_OPTIONS from env', () => {
      process.env.VSCODE_INSPECTOR_OPTIONS = '{"port":9229}';
      const env = getCleanEnv();
      expect(env.VSCODE_INSPECTOR_OPTIONS).toBeUndefined();
    });

    it('should preserve standard env vars like PATH', () => {
      process.env.PATH = '/usr/local/bin:/usr/bin';
      const env = getCleanEnv();
      expect(env.PATH).toBe('/usr/local/bin:/usr/bin');
    });

    it('should preserve HOME env var', () => {
      process.env.HOME = '/home/testuser';
      const env = getCleanEnv();
      expect(env.HOME).toBe('/home/testuser');
    });

    it('should preserve custom env vars', () => {
      process.env.MY_CUSTOM_VAR = 'custom_value';
      const env = getCleanEnv();
      expect(env.MY_CUSTOM_VAR).toBe('custom_value');
    });

    it('should return a copy, not modify process.env', () => {
      process.env.NODE_OPTIONS = '--inspect';
      const env = getCleanEnv();
      // The original should still have NODE_OPTIONS
      expect(process.env.NODE_OPTIONS).toBe('--inspect');
      // The clean env should not
      expect(env.NODE_OPTIONS).toBeUndefined();
    });

    it('should handle env with no debugger vars set', () => {
      delete process.env.NODE_OPTIONS;
      delete process.env.NODE_INSPECT;
      delete process.env.NODE_V8_COVERAGE;
      delete process.env.VSCODE_INSPECTOR_OPTIONS;
      const env = getCleanEnv();
      expect(env).toBeDefined();
      expect(env.NODE_OPTIONS).toBeUndefined();
    });
  });

  // ─── detectClaudeCli ──────────────────────────────────────────────

  describe('detectClaudeCli', () => {
    it('should return command_not_found when which fails and no fallbacks work', () => {
      // which fails
      mockExecFileNoThrowSync.mockReturnValue(failResult(1, 'not found'));
      // fs checks fail
      mockExistsSync.mockReturnValue(false);

      const result = detectClaudeCli();
      expect(result.available).toBe(false);
      expect(result.commandExists).toBe(false);
      expect(result.error).toBe('command_not_found');
    });

    it('should detect CLI via which (Strategy 1)', () => {
      // which succeeds
      mockExecFileNoThrowSync
        .mockReturnValueOnce(successResult('/usr/local/bin/claude\n'))
        // version check succeeds
        .mockReturnValueOnce(successResult('claude 2.1.0'))
        // plugin check succeeds (tryPluginCheck -> Method 1)
        .mockReturnValueOnce(successResult('Usage: claude plugin ...'));

      const result = detectClaudeCli();
      expect(result.commandExists).toBe(true);
      expect(result.commandPath).toBe('/usr/local/bin/claude');
      expect(result.detectionMethod).toBe('binary');
    });

    it('should detect CLI via npm global paths (Strategy 2) when which fails', () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });

      // which fails
      mockExecFileNoThrowSync
        .mockReturnValueOnce(failResult(1, 'not found'));

      // fs.existsSync returns true for a global path
      mockExistsSync.mockImplementation((p: string) => {
        return typeof p === 'string' && p.endsWith('/usr/local/bin/claude');
      });

      // interactive shell fails (Strategy 3 not needed since Strategy 2 found it)
      // version check succeeds
      mockExecFileNoThrowSync
        .mockReturnValueOnce(successResult('claude 2.1.0'))
        // plugin check succeeds
        .mockReturnValueOnce(successResult('Usage: claude plugin ...'));

      const result = detectClaudeCli();
      expect(result.commandExists).toBe(true);
      expect(result.detectionMethod).toBe('npm-global');
    });

    it('should detect CLI via interactive shell (Strategy 3) when other strategies fail', () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      process.env.SHELL = '/bin/zsh';

      // which fails
      mockExecFileNoThrowSync
        .mockReturnValueOnce(failResult(1, 'not found'));

      // fs.existsSync always false (Strategy 2 fails)
      mockExistsSync.mockReturnValue(false);

      // interactive shell: zsh -ic 'claude --version' succeeds
      mockExecFileNoThrowSync
        .mockReturnValueOnce(successResult('claude 2.1.0'))
        // type check
        .mockReturnValueOnce(successResult('claude is a shell function'))
        // plugin check via interactive shell (Method 4 in tryPluginCheck)
        .mockReturnValueOnce(successResult('Usage: claude plugin ...'));

      // spawnSync for tryPluginCheck Method 3 (shell: true) - might fail
      mockSpawnSync.mockReturnValue({
        status: 1,
        stdout: '',
        stderr: 'not found',
      });

      const result = detectClaudeCli();
      expect(result.commandExists).toBe(true);
      expect(result.detectionMethod).toBe('function');
      expect(result.shellWorkaround).toBe(true);
    });

    it('should detect CLI as alias via interactive shell', () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      process.env.SHELL = '/bin/bash';

      // which fails
      mockExecFileNoThrowSync
        .mockReturnValueOnce(failResult(1, 'not found'));

      // fs.existsSync false
      mockExistsSync.mockReturnValue(false);

      // bash -ic 'claude --version' succeeds
      mockExecFileNoThrowSync
        .mockReturnValueOnce(successResult('claude 2.1.0'))
        // type check returns alias
        .mockReturnValueOnce(successResult('claude is aliased to `/usr/local/bin/claude`'))
        // plugin check
        .mockReturnValueOnce(successResult('Usage: claude plugin ...'));

      mockSpawnSync.mockReturnValue({ status: 1, stdout: '', stderr: '' });

      const result = detectClaudeCli();
      expect(result.detectionMethod).toBe('alias');
      expect(result.shellWorkaround).toBe(true);
    });

    it('should return fully available status when all checks pass', () => {
      mockExecFileNoThrowSync
        .mockReturnValueOnce(successResult('/usr/local/bin/claude\n'))
        .mockReturnValueOnce(successResult('claude 2.1.0'))
        .mockReturnValueOnce(successResult('Usage: claude plugin ...'));

      const result = detectClaudeCli();
      expect(result.available).toBe(true);
      expect(result.commandExists).toBe(true);
      expect(result.pluginCommandsWork).toBe(true);
      expect(result.version).toBe('claude 2.1.0');
    });

    it('should report version_check_failed when version command fails', () => {
      // which succeeds
      mockExecFileNoThrowSync
        .mockReturnValueOnce(successResult('/usr/local/bin/claude\n'))
        // version check fails
        .mockReturnValueOnce(failResult(2, 'unknown error'));

      const result = detectClaudeCli();
      expect(result.available).toBe(false);
      expect(result.commandExists).toBe(true);
      expect(result.error).toBe('version_check_failed');
      expect(result.exitCode).toBe(2);
    });

    it('should report permission_denied when version check has EACCES', () => {
      mockExecFileNoThrowSync
        .mockReturnValueOnce(successResult('/usr/local/bin/claude\n'))
        .mockReturnValueOnce(failResult(1, 'EACCES: permission denied'));

      const result = detectClaudeCli();
      expect(result.error).toBe('permission_denied');
      expect(result.errorMessage).toContain('Permission denied');
    });

    it('should report command_not_found when version check has ENOENT', () => {
      mockExecFileNoThrowSync
        .mockReturnValueOnce(successResult('/usr/local/bin/claude\n'))
        .mockReturnValueOnce(failResult(1, 'ENOENT: no such file or directory'));

      const result = detectClaudeCli();
      expect(result.error).toBe('command_not_found');
    });

    it('should report command_not_found for exit code 127', () => {
      mockExecFileNoThrowSync
        .mockReturnValueOnce(successResult('/usr/local/bin/claude\n'))
        .mockReturnValueOnce(failResult(127, ''));

      const result = detectClaudeCli();
      expect(result.error).toBe('command_not_found');
      expect(result.exitCode).toBe(127);
    });

    it('should report plugin_commands_not_supported when plugin check fails', () => {
      // which succeeds, version succeeds, plugin fails
      mockExecFileNoThrowSync
        .mockReturnValueOnce(successResult('/usr/local/bin/claude\n'))
        .mockReturnValueOnce(successResult('claude 2.1.0'))
        // plugin check Method 1 fails
        .mockReturnValueOnce(failResult(1, 'unknown command'));

      // spawnSync for Method 2 and 3 also fail
      mockSpawnSync.mockReturnValue({
        status: 1,
        stdout: '',
        stderr: 'unknown command',
      });

      // Method 4 interactive shell also fails (if not win32)
      // The mock will return fail for remaining calls
      mockExecFileNoThrowSync.mockReturnValue(failResult(1, 'unknown command'));

      const result = detectClaudeCli();
      expect(result.available).toBe(false);
      expect(result.commandExists).toBe(true);
      expect(result.error).toBe('plugin_commands_not_supported');
    });

    it('should set platform to current process platform', () => {
      mockExecFileNoThrowSync.mockReturnValue(failResult(1, 'not found'));
      mockExistsSync.mockReturnValue(false);

      const result = detectClaudeCli();
      expect(result.platform).toBe(process.platform);
    });

    it('should handle plugin check success via spawnSync Method 2 fallback', () => {
      // which succeeds, version succeeds
      mockExecFileNoThrowSync
        .mockReturnValueOnce(successResult('/usr/local/bin/claude\n'))
        .mockReturnValueOnce(successResult('claude 2.1.0'))
        // Method 1 (execFileNoThrowSync) fails
        .mockReturnValueOnce(failResult(1, 'timeout'));

      // Method 2 (spawnSync) succeeds
      mockSpawnSync.mockReturnValueOnce({
        status: 0,
        stdout: 'Usage: claude plugin ...',
        stderr: '',
      });

      const result = detectClaudeCli();
      expect(result.available).toBe(true);
      expect(result.pluginCommandsWork).toBe(true);
    });

    it('should handle plugin check success via spawnSync Method 3 shell fallback', () => {
      mockExecFileNoThrowSync
        .mockReturnValueOnce(successResult('/usr/local/bin/claude\n'))
        .mockReturnValueOnce(successResult('claude 2.1.0'))
        // Method 1 fails
        .mockReturnValueOnce(failResult(1, 'err'));

      // Method 2 fails, Method 3 succeeds
      mockSpawnSync
        .mockReturnValueOnce({ status: 1, stdout: '', stderr: 'err' })
        .mockReturnValueOnce({ status: 0, stdout: 'Usage: claude plugin ...', stderr: '' });

      const result = detectClaudeCli();
      expect(result.available).toBe(true);
      expect(result.pluginCommandsWork).toBe(true);
    });

    it('should skip Strategy 2 and 3 on win32', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });

      // which (where on win32) fails
      mockExecFileNoThrowSync.mockReturnValue(failResult(1, 'not found'));

      const result = detectClaudeCli();
      expect(result.error).toBe('command_not_found');
      // existsSync should not have been called for npm paths
      expect(mockExistsSync).not.toHaveBeenCalled();
    });

    it('should use where instead of which on win32', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });

      mockExecFileNoThrowSync.mockReturnValue(failResult(1, 'not found'));

      detectClaudeCli();
      // First call should be 'where' not 'which'
      expect(mockExecFileNoThrowSync.mock.calls[0][0]).toBe('where');
      expect(mockExecFileNoThrowSync.mock.calls[0][1]).toEqual(['claude']);
    });

    it('should use which on non-win32 platforms', () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });

      mockExecFileNoThrowSync.mockReturnValue(failResult(1, 'not found'));
      mockExistsSync.mockReturnValue(false);

      detectClaudeCli();
      expect(mockExecFileNoThrowSync.mock.calls[0][0]).toBe('which');
    });

    it('should include debug stdout/stderr when command not found', () => {
      mockExecFileNoThrowSync.mockReturnValue(
        failResult(1, 'which: no claude in PATH', 'some stdout')
      );
      mockExistsSync.mockReturnValue(false);

      const result = detectClaudeCli();
      expect(result.debugStderr).toBe('which: no claude in PATH');
      expect(result.debugStdout).toBe('some stdout');
    });

    it('should take first path line from which output', () => {
      mockExecFileNoThrowSync
        .mockReturnValueOnce(
          successResult('/usr/local/bin/claude\n/opt/homebrew/bin/claude\n')
        )
        .mockReturnValueOnce(successResult('claude 2.1.0'))
        .mockReturnValueOnce(successResult('Usage: claude plugin ...'));

      const result = detectClaudeCli();
      expect(result.commandPath).toBe('/usr/local/bin/claude');
    });

    it('should handle version via shell workaround and skip version recheck', () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      process.env.SHELL = '/bin/zsh';

      // Strategy 1: which fails
      mockExecFileNoThrowSync.mockReturnValueOnce(failResult(1, 'not found'));
      mockExistsSync.mockReturnValue(false);

      // Strategy 3: interactive shell succeeds with version
      mockExecFileNoThrowSync
        .mockReturnValueOnce(successResult('claude 2.1.0'))
        .mockReturnValueOnce(successResult('claude is a shell function'));

      // Plugin check via interactive shell (Method 4, since shellWorkaround=true skips 1,2)
      mockSpawnSync.mockReturnValue({ status: 0, stdout: 'Usage: claude plugin ...', stderr: '' });

      const result = detectClaudeCli();
      expect(result.version).toBe('claude 2.1.0');
      expect(result.shellWorkaround).toBe(true);
    });

    it('should use windows shell fallback for version check when no commandPath on win32', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });

      // where succeeds
      mockExecFileNoThrowSync
        .mockReturnValueOnce(successResult('C:\\Users\\test\\claude.cmd\n'))
        // version check
        .mockReturnValueOnce(successResult('claude 2.1.0'))
        // plugin check
        .mockReturnValueOnce(successResult('Usage: claude plugin ...'));

      const result = detectClaudeCli();
      expect(result.commandExists).toBe(true);
    });
  });

  // ─── isClaudeCliAvailable ─────────────────────────────────────────

  describe('isClaudeCliAvailable', () => {
    it('should return true when CLI is fully available', () => {
      mockExecFileNoThrowSync
        .mockReturnValueOnce(successResult('/usr/local/bin/claude\n'))
        .mockReturnValueOnce(successResult('claude 2.1.0'))
        .mockReturnValueOnce(successResult('Usage: claude plugin ...'));

      expect(isClaudeCliAvailable()).toBe(true);
    });

    it('should return false when CLI is not found', () => {
      mockExecFileNoThrowSync.mockReturnValue(failResult(1, 'not found'));
      mockExistsSync.mockReturnValue(false);

      expect(isClaudeCliAvailable()).toBe(false);
    });

    it('should return false when version check fails', () => {
      mockExecFileNoThrowSync
        .mockReturnValueOnce(successResult('/usr/local/bin/claude\n'))
        .mockReturnValueOnce(failResult(2, 'error'));

      expect(isClaudeCliAvailable()).toBe(false);
    });

    it('should return false when plugin check fails', () => {
      mockExecFileNoThrowSync
        .mockReturnValueOnce(successResult('/usr/local/bin/claude\n'))
        .mockReturnValueOnce(successResult('claude 2.1.0'))
        .mockReturnValueOnce(failResult(1, 'unknown command'));

      mockSpawnSync.mockReturnValue({ status: 1, stdout: '', stderr: 'error' });
      mockExecFileNoThrowSync.mockReturnValue(failResult(1, 'err'));

      expect(isClaudeCliAvailable()).toBe(false);
    });
  });

  // ─── getClaudeCliDiagnostic ───────────────────────────────────────

  describe('getClaudeCliDiagnostic', () => {
    it('should report working status with version when available', () => {
      const status = makeStatus({
        available: true,
        version: 'claude 2.1.0',
      });
      const msg = getClaudeCliDiagnostic(status);
      expect(msg).toContain('working');
      expect(msg).toContain('claude 2.1.0');
    });

    it('should report command not found', () => {
      const status = makeStatus({
        error: 'command_not_found',
      });
      const msg = getClaudeCliDiagnostic(status);
      expect(msg).toContain('not found');
    });

    it('should report permission denied with path', () => {
      const status = makeStatus({
        error: 'permission_denied',
        commandPath: '/usr/local/bin/claude',
      });
      const msg = getClaudeCliDiagnostic(status);
      expect(msg).toContain('Permission denied');
      expect(msg).toContain('/usr/local/bin/claude');
    });

    it('should report permission denied without path', () => {
      const status = makeStatus({
        error: 'permission_denied',
      });
      const msg = getClaudeCliDiagnostic(status);
      expect(msg).toContain('Permission denied');
      expect(msg).not.toContain('(at ');
    });

    it('should report version check failed with exit code', () => {
      const status = makeStatus({
        error: 'version_check_failed',
        exitCode: 2,
        debugStdout: 'some output',
      });
      const msg = getClaudeCliDiagnostic(status);
      expect(msg).toContain('version check failed');
      expect(msg).toContain('exit code: 2');
    });

    it('should report version check with no output hint', () => {
      const status = makeStatus({
        error: 'version_check_failed',
        exitCode: 1,
        debugStdout: '',
        debugStderr: '',
      });
      const msg = getClaudeCliDiagnostic(status);
      expect(msg).toContain('no output');
    });

    it('should report plugin commands not supported with version', () => {
      const status = makeStatus({
        error: 'plugin_commands_not_supported',
        version: 'claude 1.0.0',
      });
      const msg = getClaudeCliDiagnostic(status);
      expect(msg).toContain('plugin commands not working');
      expect(msg).toContain('claude 1.0.0');
    });

    it('should report plugin commands not supported without version', () => {
      const status = makeStatus({
        error: 'plugin_commands_not_supported',
      });
      const msg = getClaudeCliDiagnostic(status);
      expect(msg).toContain('plugin commands not working');
      expect(msg).not.toContain('version:');
    });

    it('should report unknown error with message', () => {
      const status = makeStatus({
        error: 'unknown',
        errorMessage: 'something unexpected',
      });
      const msg = getClaudeCliDiagnostic(status);
      expect(msg).toContain('something unexpected');
    });

    it('should include debug info when DEBUG is true', () => {
      process.env.DEBUG = 'true';
      const status = makeStatus({
        error: 'version_check_failed',
        commandPath: '/usr/local/bin/claude',
        exitCode: 1,
        debugStdout: 'stdout data',
        debugStderr: 'stderr data',
      });
      const msg = getClaudeCliDiagnostic(status);
      expect(msg).toContain('Path: /usr/local/bin/claude');
      expect(msg).toContain('Exit code: 1');
      expect(msg).toContain('Stdout: "stdout data"');
      expect(msg).toContain('Stderr: "stderr data"');
    });

    it('should include debug info when SPECWEAVE_DEBUG is true', () => {
      process.env.SPECWEAVE_DEBUG = 'true';
      const status = makeStatus({
        error: 'command_not_found',
        commandPath: '/some/path',
      });
      const msg = getClaudeCliDiagnostic(status);
      expect(msg).toContain('Path: /some/path');
    });

    it('should not include debug info when DEBUG is not set', () => {
      delete process.env.DEBUG;
      delete process.env.SPECWEAVE_DEBUG;
      const status = makeStatus({
        error: 'version_check_failed',
        commandPath: '/usr/local/bin/claude',
        exitCode: 1,
      });
      const msg = getClaudeCliDiagnostic(status);
      expect(msg).not.toContain('Path:');
    });

    it('should handle default/undefined error as unknown', () => {
      const status = makeStatus({
        errorMessage: 'weird error',
      });
      // error is undefined, which hits the default case
      const msg = getClaudeCliDiagnostic(status);
      expect(msg).toContain('weird error');
    });
  });

  // ─── getClaudeCliSuggestions ──────────────────────────────────────

  describe('getClaudeCliSuggestions', () => {
    it('should return empty array when CLI is available', () => {
      const status = makeStatus({ available: true });
      expect(getClaudeCliSuggestions(status)).toEqual([]);
    });

    it('should suggest install for command_not_found', () => {
      const status = makeStatus({ error: 'command_not_found' });
      const suggestions = getClaudeCliSuggestions(status);
      expect(suggestions.length).toBeGreaterThan(0);
      const text = suggestions.join('\n');
      expect(text).toContain('npm install -g @anthropic-ai/claude-code');
      expect(text).toContain('https://claude.com/code');
    });

    it('should mention shell functions in command_not_found suggestions', () => {
      const status = makeStatus({ error: 'command_not_found' });
      const text = getClaudeCliSuggestions(status).join('\n');
      expect(text).toContain('shell function');
    });

    it('should suggest fix permissions for permission_denied on unix', () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      const status = makeStatus({
        error: 'permission_denied',
        commandPath: '/usr/local/bin/claude',
        platform: 'darwin',
      });
      const text = getClaudeCliSuggestions(status).join('\n');
      expect(text).toContain('permissions');
      expect(text).toContain('ls -la');
    });

    it('should suggest Administrator for permission_denied on win32', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      const status = makeStatus({
        error: 'permission_denied',
        platform: 'win32',
      });
      const text = getClaudeCliSuggestions(status).join('\n');
      expect(text).toContain('Administrator');
    });

    it('should suggest reinstall for permission_denied', () => {
      const status = makeStatus({ error: 'permission_denied' });
      const text = getClaudeCliSuggestions(status).join('\n');
      expect(text).toContain('reinstall');
    });

    it('should suggest troubleshooting for version_check_failed', () => {
      const status = makeStatus({
        error: 'version_check_failed',
        commandPath: '/usr/local/bin/claude',
      });
      const suggestions = getClaudeCliSuggestions(status);
      const text = suggestions.join('\n');
      expect(text).toContain('troubleshooting');
      expect(text).toContain('claude --version');
      expect(text).toContain('DEBUG=true');
    });

    it('should include file command suggestion when commandPath is set for version_check_failed', () => {
      const status = makeStatus({
        error: 'version_check_failed',
        commandPath: '/opt/bin/claude',
      });
      const text = getClaudeCliSuggestions(status).join('\n');
      expect(text).toContain('file "/opt/bin/claude"');
    });

    it('should suggest update for plugin_commands_not_supported', () => {
      const status = makeStatus({ error: 'plugin_commands_not_supported' });
      const text = getClaudeCliSuggestions(status).join('\n');
      expect(text).toContain('npm update -g @anthropic-ai/claude-code');
      expect(text).toContain('npm uninstall -g');
    });

    it('should mention possible causes for plugin_commands_not_supported', () => {
      const status = makeStatus({ error: 'plugin_commands_not_supported' });
      const text = getClaudeCliSuggestions(status).join('\n');
      expect(text).toContain('Outdated version');
      expect(text).toContain('Corrupted installation');
    });

    it('should provide generic troubleshooting for unknown error', () => {
      const status = makeStatus({ error: 'unknown' });
      const suggestions = getClaudeCliSuggestions(status);
      const text = suggestions.join('\n');
      expect(text).toContain('Unexpected error');
      expect(text).toContain('DEBUG=true');
    });

    it('should include path and exit code in unknown error when available', () => {
      const status = makeStatus({
        error: 'unknown',
        commandPath: '/usr/local/bin/claude',
        exitCode: 42,
      });
      const text = getClaudeCliSuggestions(status).join('\n');
      expect(text).toContain('/usr/local/bin/claude');
      expect(text).toContain('42');
    });

    it('should handle undefined error as default case', () => {
      const status = makeStatus({});
      const suggestions = getClaudeCliSuggestions(status);
      expect(suggestions.length).toBeGreaterThan(0);
      const text = suggestions.join('\n');
      expect(text).toContain('Unexpected error');
    });
  });
});
