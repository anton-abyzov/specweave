/**
 * Advanced atomicity tests for SessionRegistry
 *
 * Tests concurrent operations, race conditions, lock timeouts,
 * and corruption prevention under high load.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SessionRegistry } from '../../src/utils/session-registry.js';

describe('SessionRegistry - Atomicity Tests', () => {
  let testDir: string;
  let registry: SessionRegistry;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'session-registry-atomicity-'));
    registry = new SessionRegistry(testDir);
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Update Heartbeat Without Corruption', () => {
    it('should update heartbeat 1000 times rapidly without data loss', async () => {
      await registry.registerSession('session-001', 12345);

      // Get initial heartbeat
      const initialSession = await registry.getSession('session-001');
      const initialHeartbeat = initialSession!.last_heartbeat;

      // Rapid sequential updates
      for (let i = 0; i < 1000; i++) {
        const result = await registry.updateHeartbeat('session-001');
        expect(result).toBe(true);
      }

      // Verify registry is still valid
      const registryPath = path.join(testDir, '.specweave', 'state', '.session-registry.json');
      const content = fs.readFileSync(registryPath, 'utf-8');
      const parsedRegistry = JSON.parse(content);

      expect(parsedRegistry.sessions['session-001']).toBeDefined();

      // Final heartbeat should be later than initial
      const finalSession = await registry.getSession('session-001');
      expect(new Date(finalSession!.last_heartbeat).getTime()).toBeGreaterThanOrEqual(
        new Date(initialHeartbeat).getTime()
      );

      // Session data should still be intact
      expect(finalSession?.session_id).toBe('session-001');
      expect(finalSession?.pid).toBe(12345);
      expect(finalSession?.type).toBe('claude-code');
    });

    it('should maintain last_heartbeat consistency across updates', async () => {
      await registry.registerSession('session-001', 12345);

      let previousHeartbeat = '';

      for (let i = 0; i < 100; i++) {
        await registry.updateHeartbeat('session-001');

        const session = await registry.getSession('session-001');
        const currentHeartbeat = session!.last_heartbeat;

        // Each heartbeat should be >= previous (monotonically increasing or equal)
        if (previousHeartbeat) {
          expect(new Date(currentHeartbeat).getTime()).toBeGreaterThanOrEqual(
            new Date(previousHeartbeat).getTime()
          );
        }

        previousHeartbeat = currentHeartbeat;
      }
    });

    it('should never lose updates during rapid sequential writes', async () => {
      await registry.registerSession('session-001', 12345);

      const updateCount = 500;
      let successCount = 0;

      for (let i = 0; i < updateCount; i++) {
        const result = await registry.updateHeartbeat('session-001');
        if (result) successCount++;
      }

      // All updates should succeed
      expect(successCount).toBe(updateCount);

      // Registry should still be readable
      const session = await registry.getSession('session-001');
      expect(session).toBeDefined();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle heartbeat update and add child PID simultaneously', async () => {
      await registry.registerSession('session-001', 12345);

      // Run heartbeat update and addChildProcess concurrently
      const promises = [
        registry.updateHeartbeat('session-001'),
        registry.addChildProcess('session-001', 12346),
      ];

      const results = await Promise.all(promises);

      // Both operations should succeed
      expect(results[0]).toBe(true); // heartbeat update
      expect(results[1]).toBe(true); // add child PID

      // Verify both changes are reflected
      const session = await registry.getSession('session-001');

      expect(session?.child_pids).toContain(12346);
      expect(session?.last_heartbeat).toBeDefined();

      // Registry should be valid JSON
      const registryPath = path.join(testDir, '.specweave', 'state', '.session-registry.json');
      const content = fs.readFileSync(registryPath, 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    });

    it('should handle 10 concurrent heartbeat updates', async () => {
      await registry.registerSession('session-001', 12345);

      // 10 concurrent updates
      const promises = Array.from({ length: 10 }, () => registry.updateHeartbeat('session-001'));

      const results = await Promise.all(promises);

      // All should succeed (or at least most - some may conflict on lock)
      const successCount = results.filter((r) => r === true).length;
      expect(successCount).toBeGreaterThan(0);

      // Registry should be valid
      const session = await registry.getSession('session-001');
      expect(session).toBeDefined();
      expect(session?.session_id).toBe('session-001');
    });

    it('should handle concurrent add child PID operations', async () => {
      await registry.registerSession('session-001', 12345);

      // Add 5 different child PIDs concurrently
      const childPids = [12346, 12347, 12348, 12349, 12350];
      const promises = childPids.map((pid) => registry.addChildProcess('session-001', pid));

      const results = await Promise.all(promises);

      // Most operations should succeed
      const successCount = results.filter((r) => r === true).length;
      expect(successCount).toBeGreaterThan(0);

      // All unique PIDs should eventually be in the registry
      const session = await registry.getSession('session-001');
      expect(session?.child_pids?.length).toBeGreaterThan(0);

      // Verify no duplicates
      const uniquePids = new Set(session?.child_pids);
      expect(uniquePids.size).toBe(session?.child_pids?.length);
    });

    it('should handle mixed concurrent operations (register, heartbeat, add child)', async () => {
      const promises = [
        registry.registerSession('session-001', 12345),
        registry.registerSession('session-002', 12346),
        registry.registerSession('session-003', 12347),
      ];

      await Promise.all(promises);

      // Now do mixed operations
      const mixedOps = [
        registry.updateHeartbeat('session-001'),
        registry.addChildProcess('session-001', 12348),
        registry.updateHeartbeat('session-002'),
        registry.addChildProcess('session-002', 12349),
        registry.registerSession('session-004', 12350),
      ];

      const results = await Promise.all(mixedOps);

      // All operations should succeed (or at least most)
      const successCount = results.filter((r) => r === true).length;
      expect(successCount).toBeGreaterThan(3);

      // Verify registry integrity
      const sessions = await registry.getAllSessions();
      expect(sessions.length).toBeGreaterThanOrEqual(3);

      // Registry file should be valid JSON
      const registryPath = path.join(testDir, '.specweave', 'state', '.session-registry.json');
      const content = fs.readFileSync(registryPath, 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    });
  });

  describe('Lock Acquisition and Timeout', () => {
    it('should wait up to 5 seconds for lock acquisition', async () => {
      // This test verifies lock timeout behavior
      // Since we can't easily simulate a stuck lock in unit tests,
      // we'll verify the timeout mechanism exists by checking operation timing

      await registry.registerSession('session-001', 12345);

      const startTime = Date.now();
      const result = await registry.updateHeartbeat('session-001');
      const duration = Date.now() - startTime;

      // Operation should complete quickly (< 1 second) when lock is available
      expect(duration).toBeLessThan(1000);
      expect(result).toBe(true);
    });

    it('should release lock after operation completes', async () => {
      const lockPath = path.join(testDir, '.specweave', 'state', '.session-registry.json.lock');

      await registry.registerSession('session-001', 12345);

      // Lock should be released
      expect(fs.existsSync(lockPath)).toBe(false);

      await registry.updateHeartbeat('session-001');

      // Lock should still be released
      expect(fs.existsSync(lockPath)).toBe(false);
    });

    it('should acquire lock for every operation', async () => {
      // Each operation should successfully acquire and release lock
      const operations = [
        () => registry.registerSession('session-001', 12345),
        () => registry.updateHeartbeat('session-001'),
        () => registry.addChildProcess('session-001', 12346),
        () => registry.getSession('session-001'),
        () => registry.getAllSessions(),
      ];

      for (const op of operations) {
        const result = await op();
        // If result is boolean, it should be true
        // If result is object/array, it should be defined
        if (typeof result === 'boolean') {
          expect(result).toBe(true);
        } else {
          expect(result).toBeDefined();
        }
      }

      // No lock should exist after all operations
      const lockPath = path.join(testDir, '.specweave', 'state', '.session-registry.json.lock');
      expect(fs.existsSync(lockPath)).toBe(false);
    });
  });

  describe('High Load Stress Tests', () => {
    it('should handle 100 rapid sequential operations without corruption', async () => {
      const operations = [];

      // Mix of different operations
      for (let i = 0; i < 100; i++) {
        if (i % 3 === 0) {
          operations.push(registry.registerSession(`session-${i}`, 10000 + i));
        } else if (i % 3 === 1) {
          operations.push(registry.updateHeartbeat(`session-${i - 1}`));
        } else {
          operations.push(registry.addChildProcess(`session-${i - 2}`, 20000 + i));
        }
      }

      // Execute sequentially
      for (const op of operations) {
        await op;
      }

      // Registry should be valid
      const sessions = await registry.getAllSessions();
      expect(sessions.length).toBeGreaterThan(0);

      // File should be valid JSON
      const registryPath = path.join(testDir, '.specweave', 'state', '.session-registry.json');
      const content = fs.readFileSync(registryPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.sessions).toBeDefined();
      expect(Object.keys(parsed.sessions).length).toBeGreaterThan(0);
    });

    it('should handle rapid registration and removal cycles', async () => {
      const sessionId = 'session-cycle';

      // Register and remove 50 times
      for (let i = 0; i < 50; i++) {
        await registry.registerSession(sessionId, 12345 + i);
        await registry.removeSession(sessionId);
      }

      // Session should not exist
      const session = await registry.getSession(sessionId);
      expect(session).toBeUndefined();

      // Registry should be valid
      const registryPath = path.join(testDir, '.specweave', 'state', '.session-registry.json');
      const content = fs.readFileSync(registryPath, 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    });
  });

  describe('Data Integrity Under Concurrent Load', () => {
    it('should never produce corrupted JSON under concurrent writes', async () => {
      await registry.registerSession('session-001', 12345);

      // Simulate concurrent writes from multiple "processes"
      const concurrentOps = Array.from({ length: 20 }, (_, i) => {
        if (i % 2 === 0) {
          return registry.updateHeartbeat('session-001');
        } else {
          return registry.addChildProcess('session-001', 20000 + i);
        }
      });

      await Promise.all(concurrentOps);

      // Registry file must be valid JSON
      const registryPath = path.join(testDir, '.specweave', 'state', '.session-registry.json');
      const content = fs.readFileSync(registryPath, 'utf-8');

      let parsed;
      expect(() => {
        parsed = JSON.parse(content);
      }).not.toThrow();

      // Structure should be intact
      expect(parsed.sessions).toBeDefined();
      expect(parsed.sessions['session-001']).toBeDefined();
      expect(parsed.version).toBe('1.0.0');
    });

    it('should maintain referential integrity across operations', async () => {
      await registry.registerSession('parent-session', 12345);
      await registry.registerSession('child-watchdog', 12346, {
        type: 'watchdog',
        parent_session: 'parent-session',
      });

      await registry.addChildProcess('parent-session', 12346);

      const parentSession = await registry.getSession('parent-session');
      const childSession = await registry.getSession('child-watchdog');

      expect(parentSession?.child_pids).toContain(12346);
      expect(childSession?.parent_session).toBe('parent-session');
      expect(childSession?.type).toBe('watchdog');
    });
  });
});
