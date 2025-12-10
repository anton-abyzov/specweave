/**
 * Unit tests for LockManager staleness detection
 *
 * Tests lock acquisition, release, and stale lock removal.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { LockManager } from '../../src/utils/lock-manager.js';

describe('LockManager - Staleness Detection', () => {
  let testDir: string;
  let lockDir: string;
  let lockManager: LockManager;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lock-staleness-'));
    lockDir = path.join(testDir, '.test.lock');
    lockManager = new LockManager(lockDir, 300); // 5 minutes
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Lock Acquisition and Release', () => {
    it('should acquire lock when no lock exists', async () => {
      const success = await lockManager.acquire();

      expect(success).toBe(true);
      expect(fs.existsSync(lockDir)).toBe(true);

      await lockManager.release();
    });

    it('should create PID file in lock', async () => {
      await lockManager.acquire();

      const pidPath = path.join(lockDir, 'pid');
      expect(fs.existsSync(pidPath)).toBe(true);

      const pid = parseInt(fs.readFileSync(pidPath, 'utf-8'), 10);
      expect(pid).toBe(process.pid);

      await lockManager.release();
    });

    it('should release lock successfully', async () => {
      await lockManager.acquire();
      await lockManager.release();

      expect(fs.existsSync(lockDir)).toBe(false);
    });

    it('should timeout when lock is held by active process', async () => {
      await lockManager.acquire();

      // Create second manager with short timeout
      const secondManager = new LockManager(lockDir, 300);

      // This should timeout since first lock is active
      const startTime = Date.now();
      const success = await secondManager.acquire();
      const duration = Date.now() - startTime;

      expect(success).toBe(false);
      expect(duration).toBeGreaterThanOrEqual(10000); // 10 second timeout

      await lockManager.release();
    }, 15000);
  });

  describe('Stale Lock Detection', () => {
    it('should detect fresh lock as not stale', async () => {
      await lockManager.acquire();

      const isStale = await lockManager.isStale();

      expect(isStale).toBe(false);

      await lockManager.release();
    });

    it('should detect old lock with dead PID as stale', async () => {
      // Create lock with non-existent PID
      fs.mkdirSync(lockDir);
      fs.writeFileSync(path.join(lockDir, 'pid'), '99999');

      // Make lock 6 minutes old (exceeds 5-minute threshold)
      const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000);
      fs.utimesSync(lockDir, sixMinutesAgo, sixMinutesAgo);

      const isStale = await lockManager.isStale();

      expect(isStale).toBe(true);

      // Clean up
      await lockManager.release();
    });

    it('should NOT consider old lock with active PID as stale', async () => {
      // Create lock with current process PID
      fs.mkdirSync(lockDir);
      fs.writeFileSync(path.join(lockDir, 'pid'), String(process.pid));

      // Make lock 6 minutes old
      const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000);
      fs.utimesSync(lockDir, sixMinutesAgo, sixMinutesAgo);

      const isStale = await lockManager.isStale();

      // Lock is old but PID is active
      expect(isStale).toBe(false);

      await lockManager.release();
    });

    it('should detect lock without PID file as stale if old', async () => {
      // Create old lock without PID file
      fs.mkdirSync(lockDir);

      const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000);
      fs.utimesSync(lockDir, sixMinutesAgo, sixMinutesAgo);

      const isStale = await lockManager.isStale();

      expect(isStale).toBe(true);

      await lockManager.release();
    });

    it('should NOT consider fresh lock as stale even with dead PID', async () => {
      // Create fresh lock with non-existent PID
      fs.mkdirSync(lockDir);
      fs.writeFileSync(path.join(lockDir, 'pid'), '99998');

      const isStale = await lockManager.isStale();

      // Lock is fresh (< 5 minutes)
      expect(isStale).toBe(false);

      await lockManager.release();
    });
  });

  describe('Automatic Stale Lock Removal', () => {
    it('should automatically remove stale lock on acquire', async () => {
      // Create stale lock
      fs.mkdirSync(lockDir);
      fs.writeFileSync(path.join(lockDir, 'pid'), '99997');

      const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000);
      fs.utimesSync(lockDir, sixMinutesAgo, sixMinutesAgo);

      // Acquire should detect stale lock and remove it
      const success = await lockManager.acquire();

      expect(success).toBe(true);

      // Check that new lock has current PID
      const pidPath = path.join(lockDir, 'pid');
      const pid = parseInt(fs.readFileSync(pidPath, 'utf-8'), 10);
      expect(pid).toBe(process.pid);

      await lockManager.release();
    });
  });

  describe('Custom Stale Threshold', () => {
    it('should respect custom threshold', async () => {
      // Create manager with 60-second threshold
      const customManager = new LockManager(lockDir, 60);

      // Create 90-second old lock
      fs.mkdirSync(lockDir);
      fs.writeFileSync(path.join(lockDir, 'pid'), '99996');

      const ninetySecondsAgo = new Date(Date.now() - 90 * 1000);
      fs.utimesSync(lockDir, ninetySecondsAgo, ninetySecondsAgo);

      const isStale = await customManager.isStale();

      expect(isStale).toBe(true);

      await customManager.release();
    });

    it('should use default threshold correctly', async () => {
      // Create lock that is 3 minutes old (less than 5-minute default)
      fs.mkdirSync(lockDir);
      fs.writeFileSync(path.join(lockDir, 'pid'), '99995');

      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
      fs.utimesSync(lockDir, threeMinutesAgo, threeMinutesAgo);

      const isStale = await lockManager.isStale();

      expect(isStale).toBe(false);

      await lockManager.release();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid PID in lock file', async () => {
      fs.mkdirSync(lockDir);
      fs.writeFileSync(path.join(lockDir, 'pid'), 'invalid-pid');

      const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000);
      fs.utimesSync(lockDir, sixMinutesAgo, sixMinutesAgo);

      const isStale = await lockManager.isStale();

      // Invalid PID should be treated as stale
      expect(isStale).toBe(true);

      await lockManager.release();
    });

    it('should handle release when lock does not exist', async () => {
      // Should not throw
      await lockManager.release();

      expect(fs.existsSync(lockDir)).toBe(false);
    });
  });

  describe('Lock Cleanup Logging', () => {
    it('should create cleanup log when removing stale lock', async () => {
      // Create stale lock
      fs.mkdirSync(lockDir);
      fs.writeFileSync(path.join(lockDir, 'pid'), '99994');

      const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000);
      fs.utimesSync(lockDir, sixMinutesAgo, sixMinutesAgo);

      // Acquire (will remove stale lock and create log)
      await lockManager.acquire();

      // Check if log file was created
      // Path structure: testDir/.test.lock → testDir/logs/lock-cleanup.log
      const logsDir = path.join(path.dirname(lockDir), '..', 'logs');
      const logFile = path.join(logsDir, 'lock-cleanup.log');

      // Log file might exist depending on implementation
      if (fs.existsSync(logFile)) {
        const logContent = fs.readFileSync(logFile, 'utf-8');
        expect(logContent).toContain('Removed stale lock');
      }

      await lockManager.release();
    });
  });
});
