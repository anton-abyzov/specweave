/**
 * Unit tests for platform-utils
 *
 * Tests pure/standalone functions directly.
 * Tests PlatformUtils class with real OS operations (temp files, current PID).
 * Tests escape functions via sendNotification side effects.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import { mkdirSync, writeFileSync, existsSync, rmdirSync } from 'fs';
import path from 'path';
import os from 'os';
import {
  getCurrentPlatform,
  checkProcessExists,
  getFileMtime,
  killProcess,
  acquireFileLock,
  PlatformUtils,
} from '../../../src/utils/platform-utils.js';
import type { Platform } from '../../../src/utils/platform-utils.js';
import type { Logger } from '../../../src/utils/logger.js';

/** Silent logger that captures output */
function createTestLogger() {
  const output: string[] = [];
  const logger: Logger = {
    log: (msg: string) => output.push(msg),
    error: (...args: unknown[]) => output.push(`ERROR: ${args.map(String).join(' ')}`),
    warn: (msg: string) => output.push(`WARN: ${msg}`),
    debug: (msg: string) => output.push(`DEBUG: ${msg}`),
    verbose: (msg: string) => output.push(`VERBOSE: ${msg}`),
  };
  return { logger, output };
}

describe('platform-utils', () => {
  // ─── getCurrentPlatform ─────────────────────────────────────────

  describe('getCurrentPlatform', () => {
    it('should return a valid platform string', () => {
      const platform = getCurrentPlatform();
      expect(['darwin', 'linux', 'win32']).toContain(platform);
    });

    it('should match process.platform', () => {
      expect(getCurrentPlatform()).toBe(process.platform);
    });
  });

  // ─── checkProcessExists ────────────────────────────────────────

  describe('checkProcessExists', () => {
    it('should return true for current process PID', () => {
      expect(checkProcessExists(process.pid)).toBe(true);
    });

    it('should return false for PID 999999 (very unlikely to exist)', () => {
      expect(checkProcessExists(999999)).toBe(false);
    });

    it('should throw for negative PID', () => {
      expect(() => checkProcessExists(-1)).toThrow('Invalid PID');
    });

    it('should throw for zero PID', () => {
      expect(() => checkProcessExists(0)).toThrow('Invalid PID');
    });

    it('should throw for non-integer PID', () => {
      expect(() => checkProcessExists(3.14)).toThrow('Invalid PID');
    });

    it('should throw for NaN PID', () => {
      expect(() => checkProcessExists(NaN)).toThrow('Invalid PID');
    });
  });

  // ─── getFileMtime ──────────────────────────────────────────────

  describe('getFileMtime', () => {
    let tmpFile: string;

    beforeEach(() => {
      const suffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
      tmpFile = path.join(os.tmpdir(), `sw-mtime-test-${suffix}.txt`);
      writeFileSync(tmpFile, 'test content');
    });

    afterEach(async () => {
      await fs.rm(tmpFile, { force: true }).catch(() => {});
    });

    it('should return mtime in seconds for existing file', () => {
      const mtime = getFileMtime(tmpFile);
      expect(mtime).toBeGreaterThan(0);
      // Should be within last 10 seconds
      const now = Math.floor(Date.now() / 1000);
      expect(now - mtime).toBeLessThan(10);
    });

    it('should return 0 for non-existent file', () => {
      expect(getFileMtime('/nonexistent/file/path.txt')).toBe(0);
    });
  });

  // ─── killProcess ───────────────────────────────────────────────

  describe('killProcess', () => {
    it('should throw for invalid PID', () => {
      expect(() => killProcess(-1)).toThrow('Invalid PID');
    });

    it('should not throw for non-existent process', () => {
      // Should silently ignore non-existent PID
      expect(() => killProcess(999999)).not.toThrow();
    });
  });

  // ─── acquireFileLock ───────────────────────────────────────────

  describe('acquireFileLock', () => {
    let lockPath: string;

    beforeEach(() => {
      const suffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
      lockPath = path.join(os.tmpdir(), `sw-lock-test-${suffix}.lock`);
    });

    afterEach(async () => {
      try {
        rmdirSync(lockPath);
      } catch {
        // Ignore if doesn't exist
      }
    });

    it('should acquire lock on first attempt', () => {
      expect(acquireFileLock(lockPath)).toBe(true);
      expect(existsSync(lockPath)).toBe(true);
    });

    it('should fail to acquire lock when already held', () => {
      expect(acquireFileLock(lockPath)).toBe(true);
      expect(acquireFileLock(lockPath)).toBe(false);
    });

    it('should allow re-acquisition after release', () => {
      expect(acquireFileLock(lockPath)).toBe(true);
      rmdirSync(lockPath);
      expect(acquireFileLock(lockPath)).toBe(true);
    });
  });

  // ─── PlatformUtils class ───────────────────────────────────────

  describe('PlatformUtils', () => {
    let utils: PlatformUtils;
    const { logger } = createTestLogger();

    beforeEach(() => {
      utils = new PlatformUtils({ logger });
    });

    describe('getPlatform', () => {
      it('should return current platform', () => {
        expect(utils.getPlatform()).toBe(process.platform);
      });
    });

    describe('isWindows / isPosix', () => {
      it('should be consistent', () => {
        const platform = utils.getPlatform();
        if (platform === 'win32') {
          expect(utils.isWindows()).toBe(true);
          expect(utils.isPosix()).toBe(false);
        } else {
          expect(utils.isWindows()).toBe(false);
          expect(utils.isPosix()).toBe(true);
        }
      });
    });

    describe('checkProcessExistsAsync', () => {
      it('should return true for current process PID', async () => {
        expect(await utils.checkProcessExistsAsync(process.pid)).toBe(true);
      });

      it('should return false for non-existent PID', async () => {
        expect(await utils.checkProcessExistsAsync(999999)).toBe(false);
      });
    });

    describe('getFileMtimeAsync', () => {
      let tmpFile: string;

      beforeEach(async () => {
        const suffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
        tmpFile = path.join(os.tmpdir(), `sw-mtime-async-${suffix}.txt`);
        await fs.writeFile(tmpFile, 'async test');
      });

      afterEach(async () => {
        await fs.rm(tmpFile, { force: true }).catch(() => {});
      });

      it('should return mtime in seconds', async () => {
        const mtime = await utils.getFileMtimeAsync(tmpFile);
        expect(mtime).toBeGreaterThan(0);
        const now = Math.floor(Date.now() / 1000);
        expect(now - mtime).toBeLessThan(10);
      });

      it('should throw for non-existent file', async () => {
        await expect(utils.getFileMtimeAsync('/nonexistent/file.txt')).rejects.toThrow();
      });
    });

    describe('acquireFileLockAsync / releaseFileLockAsync', () => {
      let lockPath: string;

      beforeEach(() => {
        const suffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
        lockPath = path.join(os.tmpdir(), `sw-async-lock-${suffix}.lock`);
      });

      afterEach(async () => {
        await fs.rm(lockPath, { recursive: true, force: true }).catch(() => {});
      });

      it('should acquire and release lock', async () => {
        const acquired = await utils.acquireFileLockAsync(lockPath, 1000);
        expect(acquired).toBe(true);
        await utils.releaseFileLockAsync(lockPath);
        expect(existsSync(lockPath)).toBe(false);
      });

      it('should time out when lock is held', async () => {
        mkdirSync(lockPath);
        const acquired = await utils.acquireFileLockAsync(lockPath, 300);
        expect(acquired).toBe(false);
      });

      it('should not throw when releasing non-existent lock', async () => {
        await expect(utils.releaseFileLockAsync(lockPath)).resolves.not.toThrow();
      });
    });

    describe('sendNotification', () => {
      it('should not throw regardless of platform', async () => {
        // Fire-and-forget, should always succeed gracefully
        await expect(
          utils.sendNotification('SpecWeave: Test', 'Test body', 'Pop')
        ).resolves.not.toThrow();
      });
    });
  });
});
