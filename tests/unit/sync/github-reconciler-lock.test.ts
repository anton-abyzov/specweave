import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

import {
  acquireLock,
  releaseLock,
  isLockHeld,
  LOCK_MAX_AGE_MS,
} from '../../../src/sync/reconciler-lock.js';

describe('reconciler-lock', () => {
  let tmpDir: string;
  let stateDir: string;
  let lockFile: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sw-lock-'));
    stateDir = path.join(tmpDir, '.specweave', 'state');
    await fs.mkdir(stateDir, { recursive: true });
    lockFile = path.join(stateDir, 'reconciler.lock');
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('acquireLock()', () => {
    it('TC-006: creates lock file with PID when no lock exists', async () => {
      // Given: no lock file exists
      // When: acquireLock is called
      const acquired = await acquireLock(tmpDir);

      // Then: lock file created with current PID
      expect(acquired).toBe(true);
      const lock = JSON.parse(await fs.readFile(lockFile, 'utf-8'));
      expect(lock.pid).toBe(process.pid);
      expect(lock.startedAt).toBeDefined();
    });

    it('TC-007: returns false when fresh lock exists (< 5min, PID running)', async () => {
      // Given: fresh lock from current process (PID is running)
      await fs.writeFile(lockFile, JSON.stringify({
        pid: process.pid,
        startedAt: new Date().toISOString(),
      }));

      // When: acquireLock is called
      const acquired = await acquireLock(tmpDir);

      // Then: returns false (skip — lock is active)
      expect(acquired).toBe(false);
    });

    it('TC-008: cleans up stale lock (> 5min) and acquires', async () => {
      // Given: stale lock (started 10 minutes ago, PID is current process so it's "running")
      // But timestamp is older than 5 min — stale by age
      await fs.writeFile(lockFile, JSON.stringify({
        pid: process.pid,
        startedAt: new Date(Date.now() - 10 * 60_000).toISOString(),
      }));

      // When: acquireLock is called
      const acquired = await acquireLock(tmpDir);

      // Then: stale lock cleaned up, new lock acquired
      expect(acquired).toBe(true);
      const lock = JSON.parse(await fs.readFile(lockFile, 'utf-8'));
      expect(lock.pid).toBe(process.pid);
      // startedAt should be recent (within last second)
      const age = Date.now() - new Date(lock.startedAt).getTime();
      expect(age).toBeLessThan(2000);
    });

    it('cleans up lock with dead PID and acquires', async () => {
      // Given: lock from a non-existent PID (99999999)
      await fs.writeFile(lockFile, JSON.stringify({
        pid: 99999999,
        startedAt: new Date().toISOString(),
      }));

      // When: acquireLock is called
      const acquired = await acquireLock(tmpDir);

      // Then: dead PID lock cleaned up, new lock acquired
      expect(acquired).toBe(true);
      const lock = JSON.parse(await fs.readFile(lockFile, 'utf-8'));
      expect(lock.pid).toBe(process.pid);
    });

    it('creates state directory if it does not exist', async () => {
      // Given: state directory does not exist
      const freshDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sw-lock-nostate-'));
      // .specweave/state does NOT exist

      // When: acquireLock is called
      const acquired = await acquireLock(freshDir);

      // Then: lock acquired, directory created
      expect(acquired).toBe(true);
      const lockPath = path.join(freshDir, '.specweave', 'state', 'reconciler.lock');
      const lock = JSON.parse(await fs.readFile(lockPath, 'utf-8'));
      expect(lock.pid).toBe(process.pid);

      await fs.rm(freshDir, { recursive: true, force: true });
    });
  });

  describe('releaseLock()', () => {
    it('deletes lock file', async () => {
      // Given: lock file exists
      await fs.writeFile(lockFile, JSON.stringify({
        pid: process.pid,
        startedAt: new Date().toISOString(),
      }));

      // When: releaseLock is called
      await releaseLock(tmpDir);

      // Then: lock file no longer exists
      const exists = await fs.access(lockFile).then(() => true).catch(() => false);
      expect(exists).toBe(false);
    });

    it('does not throw if lock file does not exist', async () => {
      // Given: no lock file
      // When/Then: releaseLock does not throw
      await expect(releaseLock(tmpDir)).resolves.not.toThrow();
    });
  });

  describe('isLockHeld()', () => {
    it('returns false when no lock file', async () => {
      expect(await isLockHeld(tmpDir)).toBe(false);
    });

    it('returns true for fresh lock with running PID', async () => {
      await fs.writeFile(lockFile, JSON.stringify({
        pid: process.pid,
        startedAt: new Date().toISOString(),
      }));
      expect(await isLockHeld(tmpDir)).toBe(true);
    });

    it('returns false for stale lock', async () => {
      await fs.writeFile(lockFile, JSON.stringify({
        pid: process.pid,
        startedAt: new Date(Date.now() - 10 * 60_000).toISOString(),
      }));
      expect(await isLockHeld(tmpDir)).toBe(false);
    });
  });

  describe('LOCK_MAX_AGE_MS constant', () => {
    it('is 5 minutes', () => {
      expect(LOCK_MAX_AGE_MS).toBe(5 * 60 * 1000);
    });
  });
});
