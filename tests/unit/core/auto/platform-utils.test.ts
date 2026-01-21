/**
 * Platform Utils Tests
 *
 * Tests for cross-platform utility functions.
 * Target: 90%+ coverage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as os from 'os';
import * as childProcess from 'child_process';
import { EventEmitter } from 'events';

// Mock modules before importing
vi.mock('os', async () => {
  const actual = await vi.importActual<typeof os>('os');
  return {
    ...actual,
    platform: vi.fn(() => 'darwin'),
  };
});

vi.mock('child_process', async () => {
  const actual = await vi.importActual<typeof childProcess>('child_process');
  return {
    ...actual,
    spawn: vi.fn(),
  };
});

// Import after mocking
import {
  isWindows,
  isMacOS,
  isLinux,
  getPlatform,
  normalizePath,
  handleLongPath,
  toPlatformPath,
  joinPath,
  getShell,
  spawnCommand,
  execCommand,
  playSound,
  getEnv,
  isCI,
  getHomeDir,
  sleep,
  generateId,
  timestamp,
} from '../../../../src/core/auto/parallel/platform-utils.js';

describe('Platform Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // PLATFORM DETECTION TESTS
  // ============================================================================

  describe('Platform Detection', () => {
    describe('isWindows', () => {
      it('should return true on Windows', () => {
        vi.mocked(os.platform).mockReturnValue('win32');
        expect(isWindows()).toBe(true);
      });

      it('should return false on macOS', () => {
        vi.mocked(os.platform).mockReturnValue('darwin');
        expect(isWindows()).toBe(false);
      });

      it('should return false on Linux', () => {
        vi.mocked(os.platform).mockReturnValue('linux');
        expect(isWindows()).toBe(false);
      });
    });

    describe('isMacOS', () => {
      it('should return true on macOS', () => {
        vi.mocked(os.platform).mockReturnValue('darwin');
        expect(isMacOS()).toBe(true);
      });

      it('should return false on Windows', () => {
        vi.mocked(os.platform).mockReturnValue('win32');
        expect(isMacOS()).toBe(false);
      });

      it('should return false on Linux', () => {
        vi.mocked(os.platform).mockReturnValue('linux');
        expect(isMacOS()).toBe(false);
      });
    });

    describe('isLinux', () => {
      it('should return true on Linux', () => {
        vi.mocked(os.platform).mockReturnValue('linux');
        expect(isLinux()).toBe(true);
      });

      it('should return false on Windows', () => {
        vi.mocked(os.platform).mockReturnValue('win32');
        expect(isLinux()).toBe(false);
      });

      it('should return false on macOS', () => {
        vi.mocked(os.platform).mockReturnValue('darwin');
        expect(isLinux()).toBe(false);
      });
    });

    describe('getPlatform', () => {
      it('should return "windows" on win32', () => {
        vi.mocked(os.platform).mockReturnValue('win32');
        expect(getPlatform()).toBe('windows');
      });

      it('should return "macos" on darwin', () => {
        vi.mocked(os.platform).mockReturnValue('darwin');
        expect(getPlatform()).toBe('macos');
      });

      it('should return "linux" on linux', () => {
        vi.mocked(os.platform).mockReturnValue('linux');
        expect(getPlatform()).toBe('linux');
      });

      it('should return "unknown" on other platforms', () => {
        vi.mocked(os.platform).mockReturnValue('freebsd');
        expect(getPlatform()).toBe('unknown');
      });
    });
  });

  // ============================================================================
  // PATH HANDLING TESTS
  // ============================================================================

  describe('Path Handling', () => {
    describe('normalizePath', () => {
      it('should convert backslashes to forward slashes', () => {
        expect(normalizePath('C:\\Users\\test\\file.txt')).toBe('C:/Users/test/file.txt');
      });

      it('should handle mixed separators', () => {
        expect(normalizePath('C:\\Users/test\\file.txt')).toBe('C:/Users/test/file.txt');
      });

      it('should preserve forward slashes', () => {
        expect(normalizePath('/home/user/file.txt')).toBe('/home/user/file.txt');
      });

      it('should handle empty string', () => {
        expect(normalizePath('')).toBe('');
      });

      it('should handle null-like values', () => {
        expect(normalizePath(null as unknown as string)).toBe(null);
        expect(normalizePath(undefined as unknown as string)).toBe(undefined);
      });

      it('should handle multiple consecutive backslashes', () => {
        expect(normalizePath('C:\\\\Users\\\\test')).toBe('C://Users//test');
      });
    });

    describe('handleLongPath', () => {
      it('should return path unchanged on non-Windows', () => {
        vi.mocked(os.platform).mockReturnValue('darwin');
        const longPath = 'a'.repeat(300);
        expect(handleLongPath(longPath)).toBe(longPath);
      });

      it('should add prefix on Windows for long paths', () => {
        vi.mocked(os.platform).mockReturnValue('win32');
        const longPath = 'C:\\Users\\' + 'a'.repeat(260);
        const result = handleLongPath(longPath);
        expect(result.startsWith('\\\\?\\')).toBe(true);
      });

      it('should not add prefix for short paths on Windows', () => {
        vi.mocked(os.platform).mockReturnValue('win32');
        const shortPath = 'C:\\Users\\test';
        const result = handleLongPath(shortPath);
        expect(result.startsWith('\\\\?\\')).toBe(false);
      });

      it('should not double-add prefix', () => {
        vi.mocked(os.platform).mockReturnValue('win32');
        const prefixedPath = '\\\\?\\C:\\Users\\test';
        expect(handleLongPath(prefixedPath)).toBe(prefixedPath);
      });

      it('should handle empty string', () => {
        expect(handleLongPath('')).toBe('');
      });

      it('should handle null-like values', () => {
        expect(handleLongPath(null as unknown as string)).toBe(null);
      });
    });

    describe('toPlatformPath', () => {
      it('should convert to backslashes on Windows', () => {
        vi.mocked(os.platform).mockReturnValue('win32');
        expect(toPlatformPath('/home/user/file.txt')).toBe('\\home\\user\\file.txt');
      });

      it('should convert to forward slashes on Unix', () => {
        vi.mocked(os.platform).mockReturnValue('darwin');
        expect(toPlatformPath('C:\\Users\\file.txt')).toBe('C:/Users/file.txt');
      });

      it('should handle empty string', () => {
        expect(toPlatformPath('')).toBe('');
      });

      it('should handle null-like values', () => {
        expect(toPlatformPath(null as unknown as string)).toBe(null);
      });
    });

    describe('joinPath', () => {
      it('should join path segments', () => {
        const result = joinPath('home', 'user', 'file.txt');
        expect(result).toContain('user');
        expect(result).toContain('file.txt');
      });

      it('should handle single segment', () => {
        expect(joinPath('home')).toBe('home');
      });

      it('should handle empty segments', () => {
        expect(joinPath('')).toBe('.');
      });
    });
  });

  // ============================================================================
  // SHELL & PROCESS TESTS
  // ============================================================================

  describe('Shell & Process', () => {
    describe('getShell', () => {
      it('should return PowerShell on Windows', () => {
        vi.mocked(os.platform).mockReturnValue('win32');
        const result = getShell();
        expect(result.shell).toContain('powershell');
        expect(result.args).toContain('-Command');
      });

      it('should return bash on Unix', () => {
        vi.mocked(os.platform).mockReturnValue('darwin');
        const originalEnv = process.env.SHELL;
        process.env.SHELL = '/bin/bash';
        const result = getShell();
        expect(result.shell).toBe('/bin/bash');
        expect(result.args).toContain('-c');
        process.env.SHELL = originalEnv;
      });

      it('should use SHELL env if set', () => {
        vi.mocked(os.platform).mockReturnValue('linux');
        const originalEnv = process.env.SHELL;
        process.env.SHELL = '/bin/zsh';
        const result = getShell();
        expect(result.shell).toBe('/bin/zsh');
        process.env.SHELL = originalEnv;
      });

      it('should default to /bin/bash if SHELL not set', () => {
        vi.mocked(os.platform).mockReturnValue('linux');
        const originalEnv = process.env.SHELL;
        delete process.env.SHELL;
        const result = getShell();
        expect(result.shell).toBe('/bin/bash');
        process.env.SHELL = originalEnv;
      });
    });

    describe('spawnCommand', () => {
      it('should spawn command on Unix', async () => {
        vi.mocked(os.platform).mockReturnValue('darwin');

        const mockProc = new EventEmitter() as childProcess.ChildProcess;
        const mockStdout = new EventEmitter();
        const mockStderr = new EventEmitter();
        (mockProc as any).stdout = mockStdout;
        (mockProc as any).stderr = mockStderr;

        vi.mocked(childProcess.spawn).mockReturnValue(mockProc);

        const result = spawnCommand('echo hello');
        expect(result.process).toBeDefined();
        expect(result.promise).toBeInstanceOf(Promise);

        // Simulate output
        mockStdout.emit('data', Buffer.from('hello\n'));
        mockProc.emit('close', 0);

        const output = await result.promise;
        expect(output.stdout).toBe('hello\n');
        expect(output.code).toBe(0);
      });

      it('should spawn command on Windows', async () => {
        vi.mocked(os.platform).mockReturnValue('win32');

        const mockProc = new EventEmitter() as childProcess.ChildProcess;
        const mockStdout = new EventEmitter();
        const mockStderr = new EventEmitter();
        (mockProc as any).stdout = mockStdout;
        (mockProc as any).stderr = mockStderr;

        vi.mocked(childProcess.spawn).mockReturnValue(mockProc);

        const result = spawnCommand('echo hello');
        expect(result.process).toBeDefined();

        mockProc.emit('close', 0);
        const output = await result.promise;
        expect(output.code).toBe(0);
      });

      it('should handle errors', async () => {
        vi.mocked(os.platform).mockReturnValue('darwin');

        const mockProc = new EventEmitter() as childProcess.ChildProcess;
        (mockProc as any).stdout = null;
        (mockProc as any).stderr = null;

        vi.mocked(childProcess.spawn).mockReturnValue(mockProc);

        const result = spawnCommand('bad-command');

        mockProc.emit('error', new Error('Command not found'));

        await expect(result.promise).rejects.toThrow('Command not found');
      });

      it('should capture stderr', async () => {
        vi.mocked(os.platform).mockReturnValue('darwin');

        const mockProc = new EventEmitter() as childProcess.ChildProcess;
        const mockStdout = new EventEmitter();
        const mockStderr = new EventEmitter();
        (mockProc as any).stdout = mockStdout;
        (mockProc as any).stderr = mockStderr;

        vi.mocked(childProcess.spawn).mockReturnValue(mockProc);

        const result = spawnCommand('echo hello 1>&2');

        mockStderr.emit('data', Buffer.from('error output\n'));
        mockProc.emit('close', 1);

        const output = await result.promise;
        expect(output.stderr).toBe('error output\n');
        expect(output.code).toBe(1);
      });
    });

    describe('execCommand', () => {
      it('should execute and return result', async () => {
        vi.mocked(os.platform).mockReturnValue('darwin');

        const mockProc = new EventEmitter() as childProcess.ChildProcess;
        const mockStdout = new EventEmitter();
        const mockStderr = new EventEmitter();
        (mockProc as any).stdout = mockStdout;
        (mockProc as any).stderr = mockStderr;

        vi.mocked(childProcess.spawn).mockReturnValue(mockProc);

        const promise = execCommand('echo test');

        mockStdout.emit('data', Buffer.from('test\n'));
        mockProc.emit('close', 0);

        const result = await promise;
        expect(result.stdout).toBe('test\n');
        expect(result.code).toBe(0);
      });
    });
  });

  // ============================================================================
  // NOTIFICATION TESTS
  // ============================================================================

  describe('Notifications', () => {
    describe('playSound', () => {
      it('should play sound on macOS without error', async () => {
        vi.mocked(os.platform).mockReturnValue('darwin');

        const mockProc = new EventEmitter() as childProcess.ChildProcess;
        (mockProc as any).stdout = new EventEmitter();
        (mockProc as any).stderr = new EventEmitter();
        vi.mocked(childProcess.spawn).mockReturnValue(mockProc);

        const promise = playSound('success');
        mockProc.emit('close', 0);

        await expect(promise).resolves.toBeUndefined();
      });

      it('should handle different sound types', async () => {
        vi.mocked(os.platform).mockReturnValue('darwin');

        const mockProc = new EventEmitter() as childProcess.ChildProcess;
        (mockProc as any).stdout = new EventEmitter();
        (mockProc as any).stderr = new EventEmitter();
        vi.mocked(childProcess.spawn).mockReturnValue(mockProc);

        for (const type of ['success', 'failure', 'warning', 'info'] as const) {
          const promise = playSound(type);
          mockProc.emit('close', 0);
          await expect(promise).resolves.toBeUndefined();
        }
      });

      it('should fail gracefully on Linux', async () => {
        vi.mocked(os.platform).mockReturnValue('linux');

        const mockProc = new EventEmitter() as childProcess.ChildProcess;
        (mockProc as any).stdout = new EventEmitter();
        (mockProc as any).stderr = new EventEmitter();
        vi.mocked(childProcess.spawn).mockReturnValue(mockProc);

        const promise = playSound('success');
        mockProc.emit('close', 0);

        await expect(promise).resolves.toBeUndefined();
      });

      it('should fail gracefully on Windows', async () => {
        vi.mocked(os.platform).mockReturnValue('win32');

        const mockProc = new EventEmitter() as childProcess.ChildProcess;
        (mockProc as any).stdout = new EventEmitter();
        (mockProc as any).stderr = new EventEmitter();
        vi.mocked(childProcess.spawn).mockReturnValue(mockProc);

        const promise = playSound('failure');
        mockProc.emit('close', 0);

        await expect(promise).resolves.toBeUndefined();
      });

      it('should not throw on error', async () => {
        vi.mocked(os.platform).mockReturnValue('darwin');

        const mockProc = new EventEmitter() as childProcess.ChildProcess;
        (mockProc as any).stdout = null;
        (mockProc as any).stderr = null;
        vi.mocked(childProcess.spawn).mockReturnValue(mockProc);

        const promise = playSound('success');
        mockProc.emit('error', new Error('Sound not available'));

        // Should not throw, just resolve silently
        await expect(promise).resolves.toBeUndefined();
      });
    });
  });

  // ============================================================================
  // ENVIRONMENT TESTS
  // ============================================================================

  describe('Environment', () => {
    describe('getEnv', () => {
      it('should return environment variable value', () => {
        process.env.TEST_VAR = 'test_value';
        expect(getEnv('TEST_VAR')).toBe('test_value');
        delete process.env.TEST_VAR;
      });

      it('should return default if not set', () => {
        expect(getEnv('NONEXISTENT_VAR', 'default')).toBe('default');
      });

      it('should return undefined if not set and no default', () => {
        expect(getEnv('NONEXISTENT_VAR')).toBeUndefined();
      });
    });

    describe('isCI', () => {
      const ciVars = [
        'CI',
        'CONTINUOUS_INTEGRATION',
        'GITHUB_ACTIONS',
        'GITLAB_CI',
        'CIRCLECI',
        'TRAVIS',
        'JENKINS_URL',
        'BUILDKITE',
        'TF_BUILD',
      ];

      afterEach(() => {
        ciVars.forEach((v) => delete process.env[v]);
      });

      it('should detect CI environment', () => {
        process.env.CI = 'true';
        expect(isCI()).toBe(true);
      });

      it('should detect GitHub Actions', () => {
        process.env.GITHUB_ACTIONS = 'true';
        expect(isCI()).toBe(true);
      });

      it('should detect GitLab CI', () => {
        process.env.GITLAB_CI = 'true';
        expect(isCI()).toBe(true);
      });

      it('should detect Azure DevOps', () => {
        process.env.TF_BUILD = 'True';
        expect(isCI()).toBe(true);
      });

      it('should return false when not in CI', () => {
        ciVars.forEach((v) => delete process.env[v]);
        expect(isCI()).toBe(false);
      });
    });

    describe('getHomeDir', () => {
      it('should return HOME on Unix', () => {
        const originalHome = process.env.HOME;
        process.env.HOME = '/home/testuser';
        expect(getHomeDir()).toBe('/home/testuser');
        process.env.HOME = originalHome;
      });

      it('should return USERPROFILE on Windows', () => {
        const originalHome = process.env.HOME;
        const originalProfile = process.env.USERPROFILE;
        delete process.env.HOME;
        process.env.USERPROFILE = 'C:\\Users\\testuser';
        expect(getHomeDir()).toBe('C:\\Users\\testuser');
        process.env.HOME = originalHome;
        process.env.USERPROFILE = originalProfile;
      });

      it('should return empty string if neither set', () => {
        const originalHome = process.env.HOME;
        const originalProfile = process.env.USERPROFILE;
        delete process.env.HOME;
        delete process.env.USERPROFILE;
        expect(getHomeDir()).toBe('');
        process.env.HOME = originalHome;
        process.env.USERPROFILE = originalProfile;
      });
    });
  });

  // ============================================================================
  // UTILITY TESTS
  // ============================================================================

  describe('Utilities', () => {
    describe('sleep', () => {
      it('should delay execution', async () => {
        const start = Date.now();
        await sleep(50);
        const elapsed = Date.now() - start;
        expect(elapsed).toBeGreaterThanOrEqual(45); // Allow some tolerance
      });

      it('should handle zero delay', async () => {
        await expect(sleep(0)).resolves.toBeUndefined();
      });
    });

    describe('generateId', () => {
      it('should generate unique IDs', () => {
        const id1 = generateId();
        const id2 = generateId();
        expect(id1).not.toBe(id2);
      });

      it('should include prefix when provided', () => {
        const id = generateId('agent');
        expect(id.startsWith('agent-')).toBe(true);
      });

      it('should generate ID without prefix', () => {
        const id = generateId();
        expect(id.includes('-')).toBe(false);
      });

      it('should generate IDs of reasonable length', () => {
        const id = generateId();
        expect(id.length).toBeGreaterThan(8);
        expect(id.length).toBeLessThan(30);
      });
    });

    describe('timestamp', () => {
      it('should return ISO timestamp', () => {
        const ts = timestamp();
        expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
      });

      it('should return current time', () => {
        const before = new Date().toISOString();
        const ts = timestamp();
        const after = new Date().toISOString();
        expect(ts >= before).toBe(true);
        expect(ts <= after).toBe(true);
      });
    });
  });
});
