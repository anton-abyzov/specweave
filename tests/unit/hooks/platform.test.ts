/**
 * Unit tests for hooks/platform.ts
 *
 * Tests cross-platform hook utilities including platform detection,
 * file locking, JSON read/write, process spawning, and hook result output.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Hoist mocks for ESM compatibility
const { mockSpawn, mockGetCleanEnv } = vi.hoisted(() => {
  const mockChild = {
    unref: vi.fn(),
    pid: 12345,
    on: vi.fn(),
    kill: vi.fn(),
  };
  return {
    mockSpawn: vi.fn().mockReturnValue(mockChild),
    mockGetCleanEnv: vi.fn().mockReturnValue({ PATH: '/usr/bin', HOME: '/home/test' }),
  };
});

vi.mock('child_process', () => ({
  spawn: mockSpawn,
}));

vi.mock('../../../src/utils/clean-env.js', () => ({
  getCleanEnv: mockGetCleanEnv,
}));

// Must import AFTER mocks
import {
  getPlatform,
  isWindows,
  isPosix,
  checkWslStatus,
  findProjectRoot,
  spawnDetached,
  spawnNodeBackground,
  readJsonSafe,
  writeJsonSafe,
  appendLog,
  FileLock,
  outputHookResult,
  consumeStdin,
} from '../../../src/hooks/platform.js';

describe('hooks/platform', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platform-test-'));
    mockSpawn.mockClear();
    mockGetCleanEnv.mockClear();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // -------------------------------------------------------------------
  // getPlatform / isWindows / isPosix
  // -------------------------------------------------------------------

  describe('getPlatform()', () => {
    it('should return a valid platform string', () => {
      const platform = getPlatform();
      expect(['windows', 'macos', 'linux', 'unknown']).toContain(platform);
    });

    it('should return macos on darwin', () => {
      // Current test environment is darwin
      if (process.platform === 'darwin') {
        expect(getPlatform()).toBe('macos');
      }
    });

    it('should return linux on linux', () => {
      if (process.platform === 'linux') {
        expect(getPlatform()).toBe('linux');
      }
    });
  });

  describe('isWindows()', () => {
    it('should return a boolean', () => {
      expect(typeof isWindows()).toBe('boolean');
    });

    it('should match process.platform check', () => {
      expect(isWindows()).toBe(process.platform === 'win32');
    });
  });

  describe('isPosix()', () => {
    it('should return a boolean', () => {
      expect(typeof isPosix()).toBe('boolean');
    });

    it('should be the inverse of isWindows', () => {
      expect(isPosix()).toBe(!isWindows());
    });
  });

  // -------------------------------------------------------------------
  // checkWslStatus
  // -------------------------------------------------------------------

  describe('checkWslStatus()', () => {
    it('should return an object with available property', () => {
      const status = checkWslStatus();
      expect(status).toHaveProperty('available');
      expect(typeof status.available).toBe('boolean');
    });

    it('should return available=false on non-Windows', () => {
      if (process.platform !== 'win32') {
        expect(checkWslStatus().available).toBe(false);
      }
    });

    it('should return cached result on second call', () => {
      const first = checkWslStatus();
      const second = checkWslStatus();
      // Exact same object reference from cache
      expect(first).toBe(second);
    });
  });

  // -------------------------------------------------------------------
  // findProjectRoot
  // -------------------------------------------------------------------

  describe('findProjectRoot()', () => {
    it('should find project root when .specweave exists', () => {
      const specweaveDir = path.join(tmpDir, '.specweave');
      fs.mkdirSync(specweaveDir, { recursive: true });

      const result = findProjectRoot(tmpDir);
      expect(result).toBe(tmpDir);
    });

    it('should find project root from a child directory', () => {
      const specweaveDir = path.join(tmpDir, '.specweave');
      fs.mkdirSync(specweaveDir, { recursive: true });
      const childDir = path.join(tmpDir, 'src', 'hooks');
      fs.mkdirSync(childDir, { recursive: true });

      const result = findProjectRoot(childDir);
      expect(result).toBe(tmpDir);
    });

    it('should return null when no .specweave directory exists', () => {
      const emptyDir = path.join(tmpDir, 'empty');
      fs.mkdirSync(emptyDir, { recursive: true });

      const result = findProjectRoot(emptyDir);
      expect(result).toBeNull();
    });

    it('should not match a .specweave file (only directories)', () => {
      // Create a regular file instead of directory
      fs.writeFileSync(path.join(tmpDir, '.specweave'), 'not a directory');

      const result = findProjectRoot(tmpDir);
      expect(result).toBeNull();
    });

    it('should use cwd when no startDir given', () => {
      // Just verify it does not throw
      const result = findProjectRoot();
      // Result depends on test environment, could be null or a real project
      expect(result === null || typeof result === 'string').toBe(true);
    });
  });

  // -------------------------------------------------------------------
  // spawnDetached
  // -------------------------------------------------------------------

  describe('spawnDetached()', () => {
    it('should spawn a detached process with correct options', () => {
      const child = spawnDetached('echo', ['hello']);

      expect(mockSpawn).toHaveBeenCalledWith('echo', ['hello'], expect.objectContaining({
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      }));
      expect(child).not.toBeNull();
      expect(child!.unref).toHaveBeenCalled();
    });

    it('should merge provided options', () => {
      spawnDetached('node', ['script.js'], { cwd: '/tmp' });

      expect(mockSpawn).toHaveBeenCalledWith('node', ['script.js'], expect.objectContaining({
        cwd: '/tmp',
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      }));
    });

    it('should return null when spawn throws', () => {
      mockSpawn.mockImplementationOnce(() => {
        throw new Error('spawn failed');
      });

      const result = spawnDetached('bad-command');
      expect(result).toBeNull();
    });

    it('should use empty args array by default', () => {
      spawnDetached('echo');

      expect(mockSpawn).toHaveBeenCalledWith('echo', [], expect.any(Object));
    });
  });

  // -------------------------------------------------------------------
  // spawnNodeBackground
  // -------------------------------------------------------------------

  describe('spawnNodeBackground()', () => {
    it('should spawn node with the given script path', () => {
      const child = spawnNodeBackground('/path/to/script.js', ['--daemon']);

      expect(mockSpawn).toHaveBeenCalledWith(
        process.execPath,
        ['/path/to/script.js', '--daemon'],
        expect.objectContaining({
          detached: true,
          stdio: 'ignore',
          windowsHide: true,
        })
      );
      expect(child).not.toBeNull();
    });

    it('should use getCleanEnv to set environment', () => {
      spawnNodeBackground('/path/to/script.js');

      expect(mockGetCleanEnv).toHaveBeenCalled();
      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          env: expect.objectContaining({
            SPECWEAVE_BACKGROUND_PROCESS: '1',
          }),
        })
      );
    });

    it('should use provided cwd', () => {
      spawnNodeBackground('/script.js', [], '/my/project');

      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          cwd: '/my/project',
        })
      );
    });

    it('should fall back to process.cwd() when cwd not provided', () => {
      spawnNodeBackground('/script.js');

      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          cwd: process.cwd(),
        })
      );
    });

    it('should return null when spawn throws', () => {
      mockSpawn.mockImplementationOnce(() => {
        throw new Error('spawn failed');
      });

      const result = spawnNodeBackground('/script.js');
      expect(result).toBeNull();
    });

    it('should call unref on child process', () => {
      const child = spawnNodeBackground('/script.js');
      expect(child!.unref).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------
  // readJsonSafe
  // -------------------------------------------------------------------

  describe('readJsonSafe()', () => {
    it('should read and parse a valid JSON file', () => {
      const filePath = path.join(tmpDir, 'test.json');
      fs.writeFileSync(filePath, JSON.stringify({ key: 'value', num: 42 }));

      const result = readJsonSafe<{ key: string; num: number }>(filePath);
      expect(result).toEqual({ key: 'value', num: 42 });
    });

    it('should return null for non-existent file', () => {
      const result = readJsonSafe(path.join(tmpDir, 'nonexistent.json'));
      expect(result).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      const filePath = path.join(tmpDir, 'invalid.json');
      fs.writeFileSync(filePath, 'not valid json {{{');

      const result = readJsonSafe(filePath);
      expect(result).toBeNull();
    });

    it('should handle empty file', () => {
      const filePath = path.join(tmpDir, 'empty.json');
      fs.writeFileSync(filePath, '');

      const result = readJsonSafe(filePath);
      expect(result).toBeNull();
    });

    it('should handle complex nested objects', () => {
      const data = { a: { b: { c: [1, 2, 3] } }, d: null, e: true };
      const filePath = path.join(tmpDir, 'nested.json');
      fs.writeFileSync(filePath, JSON.stringify(data));

      const result = readJsonSafe(filePath);
      expect(result).toEqual(data);
    });
  });

  // -------------------------------------------------------------------
  // writeJsonSafe
  // -------------------------------------------------------------------

  describe('writeJsonSafe()', () => {
    it('should write JSON data to file', () => {
      const filePath = path.join(tmpDir, 'output.json');
      const data = { key: 'value', num: 42 };

      const result = writeJsonSafe(filePath, data);
      expect(result).toBe(true);

      const content = fs.readFileSync(filePath, 'utf-8');
      expect(JSON.parse(content)).toEqual(data);
    });

    it('should create parent directories if they do not exist', () => {
      const filePath = path.join(tmpDir, 'nested', 'dir', 'output.json');
      const data = { hello: 'world' };

      const result = writeJsonSafe(filePath, data);
      expect(result).toBe(true);
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should write formatted JSON with 2-space indent', () => {
      const filePath = path.join(tmpDir, 'formatted.json');
      const data = { a: 1 };

      writeJsonSafe(filePath, data);
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toBe(JSON.stringify(data, null, 2));
    });

    it('should overwrite existing file', () => {
      const filePath = path.join(tmpDir, 'overwrite.json');
      fs.writeFileSync(filePath, JSON.stringify({ old: true }));

      const result = writeJsonSafe(filePath, { new: true });
      expect(result).toBe(true);

      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      expect(content).toEqual({ new: true });
    });

    it('should handle arrays and null values', () => {
      const filePath = path.join(tmpDir, 'array.json');
      const data = [1, null, 'three'];

      writeJsonSafe(filePath, data);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      expect(content).toEqual(data);
    });

    it('should return false on write failure', () => {
      // Write to an impossible path (the directory is actually a file)
      const blockingFile = path.join(tmpDir, 'blocker');
      fs.writeFileSync(blockingFile, 'I am a file');
      const filePath = path.join(blockingFile, 'sub', 'output.json');

      const result = writeJsonSafe(filePath, { data: true });
      expect(result).toBe(false);
    });
  });

  // -------------------------------------------------------------------
  // appendLog
  // -------------------------------------------------------------------

  describe('appendLog()', () => {
    it('should append a timestamped log message', () => {
      const logPath = path.join(tmpDir, 'test.log');

      appendLog(logPath, 'Hello world');

      const content = fs.readFileSync(logPath, 'utf-8');
      // Format: [HH:MM:SS] message
      expect(content).toMatch(/^\[\d{2}:\d{2}:\d{2}\] Hello world\n$/);
    });

    it('should append multiple messages', () => {
      const logPath = path.join(tmpDir, 'multi.log');

      appendLog(logPath, 'First');
      appendLog(logPath, 'Second');

      const content = fs.readFileSync(logPath, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines).toHaveLength(2);
      expect(lines[0]).toContain('First');
      expect(lines[1]).toContain('Second');
    });

    it('should create parent directories if needed', () => {
      const logPath = path.join(tmpDir, 'nested', 'logs', 'test.log');

      appendLog(logPath, 'Deep log');

      expect(fs.existsSync(logPath)).toBe(true);
    });

    it('should not throw on write failure', () => {
      // Write to an impossible path
      const logPath = path.join(tmpDir, '\0invalid', 'log');

      // Should not throw
      expect(() => appendLog(logPath, 'test')).not.toThrow();
    });
  });

  // -------------------------------------------------------------------
  // FileLock
  // -------------------------------------------------------------------

  describe('FileLock', () => {
    let lockPath: string;

    beforeEach(() => {
      lockPath = path.join(tmpDir, '.processor');
    });

    it('should acquire lock successfully', () => {
      const lock = new FileLock(lockPath);
      const acquired = lock.acquire();

      expect(acquired).toBe(true);

      // Lock directory should exist
      expect(fs.existsSync(lockPath + '.lock.d')).toBe(true);

      lock.release();
    });

    it('should create pid file inside lock directory', () => {
      const lock = new FileLock(lockPath);
      lock.acquire();

      const pidFile = path.join(lockPath + '.lock.d', 'pid');
      expect(fs.existsSync(pidFile)).toBe(true);
      const pid = fs.readFileSync(pidFile, 'utf-8');
      expect(parseInt(pid, 10)).toBe(process.pid);

      lock.release();
    });

    it('should release lock and remove directory', () => {
      const lock = new FileLock(lockPath);
      lock.acquire();
      lock.release();

      expect(fs.existsSync(lockPath + '.lock.d')).toBe(false);
    });

    it('should not remove directory if not acquired', () => {
      const lock = new FileLock(lockPath);
      // Create the lock dir manually (simulates another process holding it)
      const lockDir = lockPath + '.lock.d';
      fs.mkdirSync(lockDir, { recursive: true });
      fs.writeFileSync(path.join(lockDir, 'pid'), '999999', 'utf-8');

      // Release without acquiring should be a no-op
      lock.release();

      // Directory should still exist (we didn't acquire)
      expect(fs.existsSync(lockDir)).toBe(true);

      // Cleanup
      fs.rmSync(lockDir, { recursive: true, force: true });
    });

    it('should fail to acquire when another lock is held by running process', () => {
      const lock1 = new FileLock(lockPath);
      const lock2 = new FileLock(lockPath);

      expect(lock1.acquire()).toBe(true);

      // Second lock should fail because current process is still running
      expect(lock2.acquire()).toBe(false);

      lock1.release();
    });

    it('should acquire stale lock from dead process', () => {
      const lockDir = lockPath + '.lock.d';
      fs.mkdirSync(lockDir, { recursive: true });

      // Write a PID that doesn't exist (99999999)
      const pidFile = path.join(lockDir, 'pid');
      fs.writeFileSync(pidFile, '99999999', 'utf-8');

      // Backdate the file to make it stale
      const pastTime = new Date(Date.now() - 400 * 1000); // 400 seconds ago
      fs.utimesSync(pidFile, pastTime, pastTime);

      const lock = new FileLock(lockPath);
      const acquired = lock.acquire(300); // 300 second stale threshold

      expect(acquired).toBe(true);
      lock.release();
    });

    it('should not acquire lock from dead process within stale threshold', () => {
      const lockDir = lockPath + '.lock.d';
      fs.mkdirSync(lockDir, { recursive: true });

      // Write a PID that doesn't exist
      const pidFile = path.join(lockDir, 'pid');
      fs.writeFileSync(pidFile, '99999999', 'utf-8');

      // File is recent (within stale threshold) but process is dead
      // The code checks if process is running first; if not running, it checks age
      // Since the process isn't running AND the lock is not stale, it should still fail
      const recentTime = new Date(Date.now() - 10 * 1000); // 10 seconds ago
      fs.utimesSync(pidFile, recentTime, recentTime);

      const lock = new FileLock(lockPath);
      const acquired = lock.acquire(300);

      expect(acquired).toBe(false);
      // Cleanup
      fs.rmSync(lockDir, { recursive: true, force: true });
    });

    it('should handle non-EEXIST errors in acquire', () => {
      // Create a lock path inside a non-existent deeply nested structure
      // that causes a non-EEXIST error
      const badLockPath = path.join(tmpDir, 'file-not-dir');
      fs.writeFileSync(badLockPath, 'blocker');

      // lockDir will be file-not-dir.lock.d, which should still work
      // unless the parent path has issues
      const lock = new FileLock(path.join(badLockPath, 'nested', 'deep'));
      const acquired = lock.acquire();
      // This should fail because the parent path (a file) can't contain dirs
      expect(acquired).toBe(false);
    });

    it('should be safe to call release multiple times', () => {
      const lock = new FileLock(lockPath);
      lock.acquire();
      lock.release();
      // Second release should be no-op, not throw
      expect(() => lock.release()).not.toThrow();
    });
  });

  // -------------------------------------------------------------------
  // outputHookResult
  // -------------------------------------------------------------------

  describe('outputHookResult()', () => {
    it('should output JSON to stdout with continue=true', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      outputHookResult({ continue: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify({ continue: true }));
      consoleSpy.mockRestore();
    });

    it('should output JSON with systemMessage', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      outputHookResult({ continue: true, systemMessage: 'Hello!' });

      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({ continue: true, systemMessage: 'Hello!' })
      );
      consoleSpy.mockRestore();
    });

    it('should output JSON with error', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      outputHookResult({ continue: false, error: 'Something went wrong' });

      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({ continue: false, error: 'Something went wrong' })
      );
      consoleSpy.mockRestore();
    });
  });

  // -------------------------------------------------------------------
  // consumeStdin
  // -------------------------------------------------------------------

  describe('consumeStdin()', () => {
    it('should resolve with empty string when stdin isTTY', async () => {
      // In test environment, stdin.isTTY may be true or undefined
      // If it's a TTY, it should resolve immediately
      if (process.stdin.isTTY) {
        const result = await consumeStdin();
        expect(result).toBe('');
      }
    });
  });
});
