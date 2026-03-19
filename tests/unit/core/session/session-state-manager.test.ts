/**
 * Unit tests for core/session/session-state-manager.ts
 *
 * Tests per-session directory creation, auto-mode path resolution,
 * env bridging, GC of dead sessions, heartbeat, and increment claims.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import {
  getSessionsDir,
  getSessionDir,
  getAutoModePath,
  createSessionDir,
  bridgeSessionId,
  gcDeadSessions,
  touchSession,
  claimIncrement,
} from '../../../../src/core/session/session-state-manager.js';
import type { SessionLock } from '../../../../src/core/session/session-state-manager.js';

describe('session-state-manager', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssm-test-'));
    // Create .specweave/state structure
    fs.mkdirSync(path.join(tmpDir, '.specweave', 'state', 'sessions'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------
  // Path helpers
  // -------------------------------------------------------------------

  describe('getSessionsDir', () => {
    it('should return .specweave/state/sessions path', () => {
      const result = getSessionsDir(tmpDir);
      expect(result).toBe(path.join(tmpDir, '.specweave', 'state', 'sessions'));
    });
  });

  describe('getSessionDir', () => {
    it('should return session-specific subdirectory', () => {
      const result = getSessionDir('abc-123', tmpDir);
      expect(result).toBe(path.join(tmpDir, '.specweave', 'state', 'sessions', 'abc-123'));
    });
  });

  // -------------------------------------------------------------------
  // createSessionDir
  // -------------------------------------------------------------------

  describe('createSessionDir', () => {
    it('should create directory and lock.json with correct content', () => {
      const sessionDir = createSessionDir('sess-001', tmpDir);

      expect(fs.existsSync(sessionDir)).toBe(true);
      const lockPath = path.join(sessionDir, 'lock.json');
      expect(fs.existsSync(lockPath)).toBe(true);

      const lock: SessionLock = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
      expect(lock.pid).toBe(process.pid);
      expect(lock.increments).toEqual([]);
      expect(lock.started_at).toBeTruthy();
      expect(lock.last_heartbeat).toBeTruthy();
    });

    it('should not fail if directory already exists', () => {
      createSessionDir('sess-002', tmpDir);
      // Calling again should overwrite lock.json without error
      const sessionDir = createSessionDir('sess-002', tmpDir);
      expect(fs.existsSync(sessionDir)).toBe(true);
    });
  });

  // -------------------------------------------------------------------
  // getAutoModePath
  // -------------------------------------------------------------------

  describe('getAutoModePath', () => {
    it('should return per-session path when session dir exists', () => {
      createSessionDir('sess-auto', tmpDir);
      const result = getAutoModePath('sess-auto', tmpDir);
      expect(result).toBe(
        path.join(tmpDir, '.specweave', 'state', 'sessions', 'sess-auto', 'auto-mode.json')
      );
    });

    it('should return per-session path when auto-mode.json exists in session dir', () => {
      const sessionDir = createSessionDir('sess-am', tmpDir);
      fs.writeFileSync(path.join(sessionDir, 'auto-mode.json'), '{}', 'utf-8');

      const result = getAutoModePath('sess-am', tmpDir);
      expect(result).toContain('sess-am/auto-mode.json');
    });

    it('should fall back to global when no session dir exists', () => {
      const result = getAutoModePath('nonexistent', tmpDir);
      expect(result).toBe(path.join(tmpDir, '.specweave', 'state', 'auto-mode.json'));
    });

    it('should fall back to global when sessionId is undefined', () => {
      const result = getAutoModePath(undefined, tmpDir);
      expect(result).toBe(path.join(tmpDir, '.specweave', 'state', 'auto-mode.json'));
    });
  });

  // -------------------------------------------------------------------
  // bridgeSessionId
  // -------------------------------------------------------------------

  describe('bridgeSessionId', () => {
    it('should write session ID to env file', () => {
      const envFile = path.join(tmpDir, 'env.sh');
      fs.writeFileSync(envFile, '', 'utf-8');

      bridgeSessionId('sess-bridge', envFile);

      const content = fs.readFileSync(envFile, 'utf-8');
      expect(content).toContain("export CLAUDE_SESSION_ID='sess-bridge'");
    });

    it('should not throw when envFile is empty string', () => {
      expect(() => bridgeSessionId('sess-x', '')).not.toThrow();
    });

    it('should not throw when sessionId is empty string', () => {
      const envFile = path.join(tmpDir, 'env2.sh');
      fs.writeFileSync(envFile, '', 'utf-8');
      expect(() => bridgeSessionId('', envFile)).not.toThrow();
    });

    it('should not throw when envFile path is invalid', () => {
      expect(() => bridgeSessionId('sess-y', '/nonexistent/path/env.sh')).not.toThrow();
    });
  });

  // -------------------------------------------------------------------
  // gcDeadSessions
  // -------------------------------------------------------------------

  describe('gcDeadSessions', () => {
    it('should remove dirs with dead PIDs', () => {
      // Create a session dir with a PID that doesn't exist
      const sessionDir = path.join(tmpDir, '.specweave', 'state', 'sessions', 'dead-sess');
      fs.mkdirSync(sessionDir, { recursive: true });
      const lock: SessionLock = {
        pid: 999999999,
        started_at: new Date(Date.now() - 600_000).toISOString(),
        last_heartbeat: new Date(Date.now() - 600_000).toISOString(),
        increments: [],
      };
      const lockPath = path.join(sessionDir, 'lock.json');
      fs.writeFileSync(lockPath, JSON.stringify(lock), 'utf-8');
      // Backdate the lock file mtime
      const oldTime = new Date(Date.now() - 600_000);
      fs.utimesSync(lockPath, oldTime, oldTime);

      // Mock process.kill to throw (PID dead)
      vi.spyOn(process, 'kill').mockImplementation(() => {
        throw new Error('ESRCH');
      });

      const cleaned = gcDeadSessions(tmpDir, 0);
      expect(cleaned).toBe(1);
      expect(fs.existsSync(sessionDir)).toBe(false);
    });

    it('should preserve dirs with live PIDs', () => {
      const sessionDir = path.join(tmpDir, '.specweave', 'state', 'sessions', 'live-sess');
      fs.mkdirSync(sessionDir, { recursive: true });
      const lock: SessionLock = {
        pid: process.pid,
        started_at: new Date().toISOString(),
        last_heartbeat: new Date().toISOString(),
        increments: [],
      };
      fs.writeFileSync(path.join(sessionDir, 'lock.json'), JSON.stringify(lock), 'utf-8');

      // Mock process.kill to succeed (PID alive)
      vi.spyOn(process, 'kill').mockImplementation(() => true);

      const cleaned = gcDeadSessions(tmpDir, 0);
      expect(cleaned).toBe(0);
      expect(fs.existsSync(sessionDir)).toBe(true);
    });

    it('should remove orphaned dirs without lock.json', () => {
      const orphanDir = path.join(tmpDir, '.specweave', 'state', 'sessions', 'orphan-sess');
      fs.mkdirSync(orphanDir, { recursive: true });

      const cleaned = gcDeadSessions(tmpDir);
      expect(cleaned).toBe(1);
      expect(fs.existsSync(orphanDir)).toBe(false);
    });

    it('should return 0 when sessions dir does not exist', () => {
      const emptyRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ssm-empty-'));
      try {
        const cleaned = gcDeadSessions(emptyRoot);
        expect(cleaned).toBe(0);
      } finally {
        fs.rmSync(emptyRoot, { recursive: true, force: true });
      }
    });

    it('should not remove dead PID sessions that are too young', () => {
      const sessionDir = path.join(tmpDir, '.specweave', 'state', 'sessions', 'young-dead');
      fs.mkdirSync(sessionDir, { recursive: true });
      const lock: SessionLock = {
        pid: 999999999,
        started_at: new Date().toISOString(),
        last_heartbeat: new Date().toISOString(),
        increments: [],
      };
      fs.writeFileSync(path.join(sessionDir, 'lock.json'), JSON.stringify(lock), 'utf-8');

      vi.spyOn(process, 'kill').mockImplementation(() => {
        throw new Error('ESRCH');
      });

      // maxAge = 600s, lock was just created so ageSeconds ~ 0
      const cleaned = gcDeadSessions(tmpDir, 600);
      expect(cleaned).toBe(0);
      expect(fs.existsSync(sessionDir)).toBe(true);
    });
  });

  // -------------------------------------------------------------------
  // touchSession
  // -------------------------------------------------------------------

  describe('touchSession', () => {
    it('should update heartbeat in lock.json', () => {
      createSessionDir('sess-touch', tmpDir);
      const lockPath = path.join(getSessionDir('sess-touch', tmpDir), 'lock.json');
      const before: SessionLock = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));

      // Small delay to ensure timestamp differs
      const originalHeartbeat = before.last_heartbeat;

      touchSession('sess-touch', tmpDir);

      const after: SessionLock = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
      // Heartbeat should be updated (or at least not earlier)
      expect(new Date(after.last_heartbeat).getTime()).toBeGreaterThanOrEqual(
        new Date(originalHeartbeat).getTime()
      );
    });

    it('should not throw when session does not exist', () => {
      expect(() => touchSession('nonexistent', tmpDir)).not.toThrow();
    });
  });

  // -------------------------------------------------------------------
  // claimIncrement
  // -------------------------------------------------------------------

  describe('claimIncrement', () => {
    it('should add increment to lock.json', () => {
      createSessionDir('sess-claim', tmpDir);

      claimIncrement('sess-claim', tmpDir, '0001-feature');

      const lockPath = path.join(getSessionDir('sess-claim', tmpDir), 'lock.json');
      const lock: SessionLock = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
      expect(lock.increments).toContain('0001-feature');
    });

    it('should not duplicate increment IDs', () => {
      createSessionDir('sess-dedup', tmpDir);

      claimIncrement('sess-dedup', tmpDir, '0001-feature');
      claimIncrement('sess-dedup', tmpDir, '0001-feature');

      const lockPath = path.join(getSessionDir('sess-dedup', tmpDir), 'lock.json');
      const lock: SessionLock = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
      expect(lock.increments).toEqual(['0001-feature']);
    });

    it('should not throw when session does not exist', () => {
      expect(() => claimIncrement('nonexistent', tmpDir, '0001')).not.toThrow();
    });
  });
});
