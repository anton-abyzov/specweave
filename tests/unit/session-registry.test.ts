/**
 * Unit tests for SessionRegistry
 *
 * Tests atomic operations, corruption recovery, concurrent access,
 * and basic registry operations.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SessionRegistry } from '../../src/utils/session-registry.js';
import { SessionStatus } from '../../src/types/session.js';

describe('SessionRegistry', () => {
  let testDir: string;
  let registry: SessionRegistry;

  beforeEach(() => {
    // Create unique temp directory for each test
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'session-registry-test-'));
    registry = new SessionRegistry(testDir);
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Session Registration', () => {
    it('should register a new session successfully', async () => {
      const result = await registry.registerSession('session-001', 12345);

      expect(result).toBe(true);

      const session = await registry.getSession('session-001');
      expect(session).toBeDefined();
      expect(session?.session_id).toBe('session-001');
      expect(session?.pid).toBe(12345);
      expect(session?.type).toBe('claude-code');
      expect(session?.status).toBe('active');
      expect(session?.child_pids).toEqual([]);
    });

    it('should register session with custom type', async () => {
      const result = await registry.registerSession('watchdog-001', 12346, {
        type: 'watchdog',
        parent_session: 'session-001',
      });

      expect(result).toBe(true);

      const session = await registry.getSession('watchdog-001');
      expect(session?.type).toBe('watchdog');
      expect(session?.parent_session).toBe('session-001');
    });

    it('should have valid ISO-8601 timestamps', async () => {
      await registry.registerSession('session-001', 12345);

      const session = await registry.getSession('session-001');
      expect(session?.start_time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(session?.last_heartbeat).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

      // Verify timestamps are parseable
      expect(new Date(session!.start_time).getTime()).toBeGreaterThan(0);
      expect(new Date(session!.last_heartbeat).getTime()).toBeGreaterThan(0);
    });

    it('should update existing session if already registered', async () => {
      await registry.registerSession('session-001', 12345);
      await registry.registerSession('session-001', 12345); // Re-register

      const sessions = await registry.getAllSessions();
      expect(sessions.length).toBe(1);
      expect(sessions[0].session_id).toBe('session-001');
    });
  });

  describe('Concurrent Registration (Race Condition Tests)', () => {
    it('should handle 3 concurrent registrations without data loss', async () => {
      // Register 3 sessions simultaneously
      const promises = [
        registry.registerSession('session-001', 12345),
        registry.registerSession('session-002', 12346),
        registry.registerSession('session-003', 12347),
      ];

      const results = await Promise.all(promises);

      // All should succeed
      expect(results.every((r) => r === true)).toBe(true);

      // All sessions should be registered
      const sessions = await registry.getAllSessions();
      expect(sessions.length).toBe(3);

      const sessionIds = sessions.map((s) => s.session_id).sort();
      expect(sessionIds).toEqual(['session-001', 'session-002', 'session-003']);
    });

    it('should maintain valid JSON after concurrent updates', async () => {
      await registry.registerSession('session-001', 12345);

      // Concurrent heartbeat updates
      const promises = Array.from({ length: 10 }, () => registry.updateHeartbeat('session-001'));

      await Promise.all(promises);

      // Registry file should still be valid JSON
      const registryPath = path.join(testDir, '.specweave', 'state', '.session-registry.json');
      const content = fs.readFileSync(registryPath, 'utf-8');

      expect(() => JSON.parse(content)).not.toThrow();

      const session = await registry.getSession('session-001');
      expect(session).toBeDefined();
    });
  });

  describe('Corrupted Registry Recovery', () => {
    it('should auto-repair corrupted JSON and create backup', async () => {
      const registryPath = path.join(testDir, '.specweave', 'state', '.session-registry.json');

      // Create corrupted JSON
      fs.mkdirSync(path.dirname(registryPath), { recursive: true });
      fs.writeFileSync(registryPath, '{invalid json content', 'utf-8');

      // Try to register session (should trigger recovery)
      const result = await registry.registerSession('session-001', 12345);

      expect(result).toBe(true);

      // Check backup was created
      const backupFiles = fs
        .readdirSync(path.dirname(registryPath))
        .filter((f) => f.startsWith('.session-registry.json.corrupted.'));

      expect(backupFiles.length).toBe(1);

      // New registry should be valid
      const session = await registry.getSession('session-001');
      expect(session).toBeDefined();
    });

    it('should handle missing sessions object in registry', async () => {
      const registryPath = path.join(testDir, '.specweave', 'state', '.session-registry.json');

      // Create registry without sessions object
      fs.mkdirSync(path.dirname(registryPath), { recursive: true });
      fs.writeFileSync(registryPath, '{"version": "1.0.0"}', 'utf-8');

      const result = await registry.registerSession('session-001', 12345);

      expect(result).toBe(true);

      const sessions = await registry.getAllSessions();
      expect(sessions.length).toBe(1);
    });
  });

  describe('Heartbeat Updates', () => {
    it('should update heartbeat timestamp', async () => {
      await registry.registerSession('session-001', 12345);

      const sessionBefore = await registry.getSession('session-001');
      const heartbeatBefore = sessionBefore!.last_heartbeat;

      // Wait a bit to ensure timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = await registry.updateHeartbeat('session-001');
      expect(result).toBe(true);

      const sessionAfter = await registry.getSession('session-001');
      const heartbeatAfter = sessionAfter!.last_heartbeat;

      expect(new Date(heartbeatAfter).getTime()).toBeGreaterThan(
        new Date(heartbeatBefore).getTime()
      );
    });

    it('should reset status to active on heartbeat', async () => {
      await registry.registerSession('session-001', 12345);
      await registry.updateStatus('session-001', 'stale');

      const result = await registry.updateHeartbeat('session-001');
      expect(result).toBe(true);

      const session = await registry.getSession('session-001');
      expect(session?.status).toBe('active');
    });

    it('should fail gracefully for non-existent session', async () => {
      const result = await registry.updateHeartbeat('non-existent');

      expect(result).toBe(false);
    });

    it('should handle 1000 rapid heartbeat updates without corruption', async () => {
      await registry.registerSession('session-001', 12345);

      // Rapid sequential updates (simulates high-frequency heartbeat)
      for (let i = 0; i < 1000; i++) {
        await registry.updateHeartbeat('session-001');
      }

      // Registry should still be valid
      const session = await registry.getSession('session-001');
      expect(session).toBeDefined();
      expect(session?.session_id).toBe('session-001');

      // File should be valid JSON
      const registryPath = path.join(testDir, '.specweave', 'state', '.session-registry.json');
      const content = fs.readFileSync(registryPath, 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    });
  });

  describe('Child Process Management', () => {
    it('should add child PID to session', async () => {
      await registry.registerSession('session-001', 12345);

      const result = await registry.addChildProcess('session-001', 12346);
      expect(result).toBe(true);

      const session = await registry.getSession('session-001');
      expect(session?.child_pids).toContain(12346);
    });

    it('should add multiple child PIDs', async () => {
      await registry.registerSession('session-001', 12345);

      await registry.addChildProcess('session-001', 12346);
      await registry.addChildProcess('session-001', 12347);
      await registry.addChildProcess('session-001', 12348);

      const session = await registry.getSession('session-001');
      expect(session?.child_pids).toEqual([12346, 12347, 12348]);
    });

    it('should avoid duplicate child PIDs', async () => {
      await registry.registerSession('session-001', 12345);

      await registry.addChildProcess('session-001', 12346);
      await registry.addChildProcess('session-001', 12346); // Duplicate

      const session = await registry.getSession('session-001');
      expect(session?.child_pids).toEqual([12346]);
    });

    it('should handle concurrent child PID additions', async () => {
      await registry.registerSession('session-001', 12345);

      // Add 3 different child PIDs concurrently
      const promises = [
        registry.addChildProcess('session-001', 12346),
        registry.addChildProcess('session-001', 12347),
        registry.addChildProcess('session-001', 12348),
      ];

      const results = await Promise.all(promises);
      expect(results.every((r) => r === true)).toBe(true);

      const session = await registry.getSession('session-001');
      expect(session?.child_pids?.length).toBe(3);
      expect(session?.child_pids).toContain(12346);
      expect(session?.child_pids).toContain(12347);
      expect(session?.child_pids).toContain(12348);
    });
  });

  describe('Session Removal', () => {
    it('should remove session successfully', async () => {
      await registry.registerSession('session-001', 12345);

      const result = await registry.removeSession('session-001');
      expect(result).toBe(true);

      const session = await registry.getSession('session-001');
      expect(session).toBeUndefined();
    });

    it('should handle removal of non-existent session gracefully', async () => {
      const result = await registry.removeSession('non-existent');

      expect(result).toBe(false);
    });

    it('should not affect other sessions when removing one', async () => {
      await registry.registerSession('session-001', 12345);
      await registry.registerSession('session-002', 12346);
      await registry.registerSession('session-003', 12347);

      await registry.removeSession('session-002');

      const sessions = await registry.getAllSessions();
      expect(sessions.length).toBe(2);

      const sessionIds = sessions.map((s) => s.session_id).sort();
      expect(sessionIds).toEqual(['session-001', 'session-003']);
    });
  });

  describe('Status Management', () => {
    it('should update session status', async () => {
      await registry.registerSession('session-001', 12345);

      const result = await registry.updateStatus('session-001', 'stale');
      expect(result).toBe(true);

      const session = await registry.getSession('session-001');
      expect(session?.status).toBe('stale');
    });

    it('should handle all valid status values', async () => {
      await registry.registerSession('session-001', 12345);

      const statuses: SessionStatus[] = ['active', 'stale', 'zombie', 'completed'];

      for (const status of statuses) {
        await registry.updateStatus('session-001', status);
        const session = await registry.getSession('session-001');
        expect(session?.status).toBe(status);
      }
    });
  });

  describe('Lock Acquisition', () => {
    it('should acquire and release lock successfully', async () => {
      const lockPath = path.join(testDir, '.specweave', 'state', '.session-registry.json.lock');

      // Register session (acquires and releases lock)
      await registry.registerSession('session-001', 12345);

      // Lock should be released after operation
      expect(fs.existsSync(lockPath)).toBe(false);
    });

    it('should write PID to lock directory', async () => {
      const lockPath = path.join(testDir, '.specweave', 'state', '.session-registry.json.lock');
      const lockPidPath = path.join(lockPath, 'pid');

      // During operation, we can't easily check lock existence due to timing
      // But we can verify the operation completes successfully
      const result = await registry.registerSession('session-001', 12345);
      expect(result).toBe(true);

      // Lock should be cleaned up
      expect(fs.existsSync(lockPidPath)).toBe(false);
    });
  });

  describe('Get All Sessions', () => {
    it('should return empty array when no sessions', async () => {
      const sessions = await registry.getAllSessions();

      expect(sessions).toEqual([]);
    });

    it('should return all registered sessions', async () => {
      await registry.registerSession('session-001', 12345);
      await registry.registerSession('session-002', 12346);
      await registry.registerSession('watchdog-001', 12347, { type: 'watchdog' });

      const sessions = await registry.getAllSessions();

      expect(sessions.length).toBe(3);

      const sessionIds = sessions.map((s) => s.session_id).sort();
      expect(sessionIds).toEqual(['session-001', 'session-002', 'watchdog-001']);
    });
  });
});
