/**
 * Unit tests for LockManager
 *
 * Tests lock acquisition, release, and stale detection.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { LockManager } from '../../src/utils/lock-manager.js';

describe('LockManager', () => {
  let testDir: string;
  let lockDir: string;
  let lockManager: LockManager;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lock-manager-test-'));
    lockDir = path.join(testDir, '.test.lock');
    lockManager = new LockManager(lockDir, 300); // 5 minutes default
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Lock Acquisition', () => {
    it('should acquire lock successfully when no lock exists', async () => {
      const success = await lockManager.acquire();

      expect(success).toBe(true);
      expect(fs.existsSync(lockDir)).toBe(true);
    });

    it('should create PID file in lock directory', async () => {
      await lockManager.acquire();

      const pidPath = path.join(lockDir, 'pid');
      expect(fs.existsSync(pidPath)).toBe(true);

      const pid = parseInt(fs.readFileSync(pidPath, 'utf-8'), 10);
      expect(pid).toBe(process.pid);
    });

    it('should create session ID file when provided', async () => {
      const sessionId = 'test-session-123';
      await lockManager.acquire(sessionId);

      const sessionPath = path.join(lockDir, 'session_id');
      expect(fs.existsSync(sessionPath)).toBe(true);

      const storedSessionId = fs.readFileSync(sessionPath, 'utf-8').trim();
      expect(storedSessionId).toBe(sessionId);
    });

    it('should fail to acquire if lock already held by active process', async () => {
      // First acquisition
      await lockManager.acquire();

      // Second acquisition (should fail)
      const secondManager = new LockManager(lockDir, { timeoutMs: 500 });
      const success = await secondManager.acquire();

      expect(success).toBe(false);
    });
  });

  describe('Lock Release', () => {
    it('should release lock successfully', async () => {
      await lockManager.acquire();
      const success = await lockManager.release();

      expect(success).toBe(true);
      expect(fs.existsSync(lockDir)).toBe(false);
    });

    it('should remove PID file on release', async () => {
      await lockManager.acquire();

      const pidPath = path.join(lockDir, 'pid');
      expect(fs.existsSync(pidPath)).toBe(true);

      await lockManager.release();

      expect(fs.existsSync(pidPath)).toBe(false);
    });

    it('should remove session ID file on release', async () => {
      await lockManager.acquire('test-session');

      const sessionPath = path.join(lockDir, 'session_id');
      expect(fs.existsSync(sessionPath)).toBe(true);

      await lockManager.release();

      expect(fs.existsSync(sessionPath)).toBe(false);
    });

    it('should handle release when lock does not exist', async () => {
      const success = await lockManager.release();

      expect(success).toBe(false);
    });
  });

  describe('Stale Lock Detection', () => {
    it('should detect fresh lock as not stale', async () => {
      await lockManager.acquire();

      const isStale = await lockManager.isLockStale();

      expect(isStale).toBe(false);
    });

    it('should detect old lock with dead PID as stale', async () => {
      // Create lock with non-existent PID
      fs.mkdirSync(lockDir);
      fs.writeFileSync(path.join(lockDir, 'pid'), '99999'); // Non-existent PID

      // Make lock old by setting mtime to 6 minutes ago
      const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000);
      fs.utimesSync(lockDir, sixMinutesAgo, sixMinutesAgo);

      const isStale = await lockManager.isLockStale();

      expect(isStale).toBe(true);
    });

    it('should NOT consider old lock with active PID as stale', async () => {
      // Create lock with current process PID (guaranteed to exist)
      fs.mkdirSync(lockDir);
      fs.writeFileSync(path.join(lockDir, 'pid'), String(process.pid));

      // Make lock old
      const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000);
      fs.utimesSync(lockDir, sixMinutesAgo, sixMinutesAgo);

      const isStale = await lockManager.isLockStale();

      // Lock is old but PID is active, so NOT stale
      expect(isStale).toBe(false);
    });

    it('should NOT consider fresh lock as stale even with dead PID', async () => {
      // Create fresh lock with non-existent PID
      fs.mkdirSync(lockDir);
      fs.writeFileSync(path.join(lockDir, 'pid'), '99998');

      const isStale = await lockManager.isLockStale();

      // Lock is fresh (< 5 minutes), so NOT stale
      expect(isStale).toBe(false);
    });

    it('should handle lock without PID file', async () => {
      // Create old lock without PID file
      fs.mkdirSync(lockDir);

      const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000);
      fs.utimesSync(lockDir, sixMinutesAgo, sixMinutesAgo);

      const isStale = await lockManager.isLockStale();

      // Lock is old and no PID file, consider stale
      expect(isStale).toBe(true);
    });
  });

  describe('Automatic Stale Lock Removal', () => {
    it('should automatically remove stale lock on acquire', async () => {
      // Create stale lock
      fs.mkdirSync(lockDir);
      fs.writeFileSync(path.join(lockDir, 'pid'), '99997');

      const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000);
      fs.utimesSync(lockDir, sixMinutesAgo, sixMinutesAgo);

      // Try to acquire (should detect and remove stale lock)
      const success = await lockManager.acquire();

      expect(success).toBe(true);

      // New lock should have current PID
      const pidPath = path.join(lockDir, 'pid');
      const pid = parseInt(fs.readFileSync(pidPath, 'utf-8'), 10);
      expect(pid).toBe(process.pid);
    });

    it('should preserve active lock during acquire attempt', async () => {
      // Create active lock with current PID
      await lockManager.acquire();

      // Try to acquire with another manager (should fail, not remove)
      const secondManager = new LockManager(lockDir, { timeoutMs: 500 });
      const success = await secondManager.acquire();

      expect(success).toBe(false);

      // Original lock should still exist
      expect(fs.existsSync(lockDir)).toBe(true);
    });
  });

  describe('Lock Metadata', () => {
    it('should return lock metadata when lock exists', async () => {
      const sessionId = 'meta-test-session';
      await lockManager.acquire(sessionId);

      const metadata = lockManager.getLockMetadata();

      expect(metadata).toBeDefined();
      expect(metadata?.pid).toBe(process.pid);
      expect(metadata?.sessionId).toBe(sessionId);
      expect(metadata?.ageMs).toBeLessThan(1000);
    });

    it('should return null when no lock exists', () => {
      const metadata = lockManager.getLockMetadata();

      expect(metadata).toBeNull();
    });

    it('should handle lock without session ID', async () => {
      await lockManager.acquire();

      const metadata = lockManager.getLockMetadata();

      expect(metadata).toBeDefined();
      expect(metadata?.pid).toBe(process.pid);
      expect(metadata?.sessionId).toBeUndefined();
    });

    it('should calculate lock age correctly', async () => {
      await lockManager.acquire();

      await new Promise((resolve) => setTimeout(resolve, 100));

      const metadata = lockManager.getLockMetadata();

      expect(metadata?.ageMs).toBeGreaterThanOrEqual(100);
      expect(metadata?.ageMs).toBeLessThan(500);
    });
  });

  describe('Custom Stale Threshold', () => {
    it('should respect custom stale threshold', async () => {
      // Create lock manager with 1-minute threshold
      const customManager = new LockManager(lockDir, { staleThresholdMs: 60 * 1000 });

      // Create lock that is 90 seconds old
      fs.mkdirSync(lockDir);
      fs.writeFileSync(path.join(lockDir, 'pid'), '99996');

      const ninetySecondsAgo = new Date(Date.now() - 90 * 1000);
      fs.utimesSync(lockDir, ninetySecondsAgo, ninetySecondsAgo);

      const isStale = await customManager.isLockStale();

      // Lock is older than 1 minute threshold
      expect(isStale).toBe(true);
    });

    it('should use default threshold if not specified', async () => {
      const defaultManager = new LockManager(lockDir);

      // Create lock that is 3 minutes old (less than default 5 minutes)
      fs.mkdirSync(lockDir);
      fs.writeFileSync(path.join(lockDir, 'pid'), '99995');

      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
      fs.utimesSync(lockDir, threeMinutesAgo, threeMinutesAgo);

      const isStale = await defaultManager.isLockStale();

      // Lock is not old enough for default 5-minute threshold
      expect(isStale).toBe(false);
    });
  });

  describe('Concurrent Lock Attempts', () => {
    it('should handle concurrent acquire attempts', async () => {
      const manager1 = new LockManager(lockDir, { timeoutMs: 1000 });
      const manager2 = new LockManager(lockDir, { timeoutMs: 1000 });

      // Try to acquire concurrently
      const results = await Promise.all([manager1.acquire(), manager2.acquire()]);

      // Only one should succeed
      const successCount = results.filter((r) => r === true).length;
      expect(successCount).toBe(1);

      // Lock should exist
      expect(fs.existsSync(lockDir)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid PID in lock file', async () => {
      fs.mkdirSync(lockDir);
      fs.writeFileSync(path.join(lockDir, 'pid'), 'invalid-pid');

      const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000);
      fs.utimesSync(lockDir, sixMinutesAgo, sixMinutesAgo);

      const isStale = await lockManager.isLockStale();

      // Invalid PID should be treated as stale
      expect(isStale).toBe(true);
    });

    it('should handle corrupted lock directory', async () => {
      // Create lock directory with unexpected structure
      fs.mkdirSync(lockDir);
      fs.writeFileSync(path.join(lockDir, 'unexpected-file'), 'data');

      const isStale = await lockManager.isLockStale();

      // Should handle gracefully (not crash)
      expect(typeof isStale).toBe('boolean');
    });
  });
});
