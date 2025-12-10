/**
 * Unit tests for staleness detection logic in SessionRegistry
 *
 * Tests detection of stale sessions, cleanup of old sessions,
 * and PID existence checking across platforms.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SessionRegistry } from '../../src/utils/session-registry.js';

describe('SessionRegistry - Staleness Detection', () => {
  let testDir: string;
  let registry: SessionRegistry;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'staleness-test-'));
    registry = new SessionRegistry(testDir);
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('getStaleSessions()', () => {
    it('should detect stale session with old heartbeat', async () => {
      // Register session
      await registry.registerSession('session-001', 12345);

      // Manually update heartbeat to 90 seconds ago
      const registryPath = path.join(testDir, '.specweave', 'state', '.session-registry.json');
      const content = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      const ninetySecondsAgo = new Date(Date.now() - 90 * 1000).toISOString();
      content.sessions['session-001'].last_heartbeat = ninetySecondsAgo;
      fs.writeFileSync(registryPath, JSON.stringify(content, null, 2));

      // Get stale sessions (threshold: 60 seconds)
      const staleSessions = await registry.getStaleSessions(60);

      expect(staleSessions.length).toBe(1);
      expect(staleSessions[0].session.session_id).toBe('session-001');
      expect(staleSessions[0].stale_duration_seconds).toBeGreaterThan(60);
      expect(staleSessions[0].stale_duration_seconds).toBeLessThan(100);
    });

    it('should mark stale session status as "stale"', async () => {
      await registry.registerSession('session-001', 12345);

      // Make heartbeat old
      const registryPath = path.join(testDir, '.specweave', 'state', '.session-registry.json');
      const content = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      const oldHeartbeat = new Date(Date.now() - 90 * 1000).toISOString();
      content.sessions['session-001'].last_heartbeat = oldHeartbeat;
      fs.writeFileSync(registryPath, JSON.stringify(content, null, 2));

      await registry.getStaleSessions(60);

      // Check session status was updated
      const session = await registry.getSession('session-001');
      expect(session?.status).toBe('stale');
    });

    it('should NOT flag active session as stale', async () => {
      await registry.registerSession('session-001', 12345);

      // Heartbeat is recent (just registered)
      const staleSessions = await registry.getStaleSessions(60);

      expect(staleSessions.length).toBe(0);
    });

    it('should detect multiple stale sessions', async () => {
      await registry.registerSession('session-001', 12345);
      await registry.registerSession('session-002', 12346);
      await registry.registerSession('session-003', 12347);

      // Make session-001 and session-003 stale
      const registryPath = path.join(testDir, '.specweave', 'state', '.session-registry.json');
      const content = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      const oldHeartbeat = new Date(Date.now() - 90 * 1000).toISOString();
      content.sessions['session-001'].last_heartbeat = oldHeartbeat;
      content.sessions['session-003'].last_heartbeat = oldHeartbeat;
      fs.writeFileSync(registryPath, JSON.stringify(content, null, 2));

      const staleSessions = await registry.getStaleSessions(60);

      expect(staleSessions.length).toBe(2);
      const staleIds = staleSessions.map((s) => s.session.session_id).sort();
      expect(staleIds).toEqual(['session-001', 'session-003']);
    });

    it('should include PID existence check in results', async () => {
      // Use current process PID (guaranteed to exist)
      const currentPid = process.pid;
      await registry.registerSession('session-001', currentPid);

      // Make heartbeat old
      const registryPath = path.join(testDir, '.specweave', 'state', '.session-registry.json');
      const content = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      const oldHeartbeat = new Date(Date.now() - 90 * 1000).toISOString();
      content.sessions['session-001'].last_heartbeat = oldHeartbeat;
      fs.writeFileSync(registryPath, JSON.stringify(content, null, 2));

      const staleSessions = await registry.getStaleSessions(60);

      expect(staleSessions.length).toBe(1);
      expect(staleSessions[0].pid_exists).toBe(true); // Our current process exists
    });

    it('should handle non-existent PID gracefully', async () => {
      // Use a PID that definitely doesn't exist (99999)
      await registry.registerSession('session-001', 99999);

      // Make heartbeat old
      const registryPath = path.join(testDir, '.specweave', 'state', '.session-registry.json');
      const content = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      const oldHeartbeat = new Date(Date.now() - 90 * 1000).toISOString();
      content.sessions['session-001'].last_heartbeat = oldHeartbeat;
      fs.writeFileSync(registryPath, JSON.stringify(content, null, 2));

      const staleSessions = await registry.getStaleSessions(60);

      expect(staleSessions.length).toBe(1);
      expect(staleSessions[0].pid_exists).toBe(false);
    });

    it('should return empty array if no stale sessions', async () => {
      await registry.registerSession('session-001', 12345);
      await registry.registerSession('session-002', 12346);

      // All sessions are recent
      const staleSessions = await registry.getStaleSessions(60);

      expect(staleSessions).toEqual([]);
    });

    it('should respect different threshold values', async () => {
      await registry.registerSession('session-001', 12345);

      // Make heartbeat 45 seconds old
      const registryPath = path.join(testDir, '.specweave', 'state', '.session-registry.json');
      const content = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      const fortyFiveSecondsAgo = new Date(Date.now() - 45 * 1000).toISOString();
      content.sessions['session-001'].last_heartbeat = fortyFiveSecondsAgo;
      fs.writeFileSync(registryPath, JSON.stringify(content, null, 2));

      // Threshold 60s: not stale
      const stale60 = await registry.getStaleSessions(60);
      expect(stale60.length).toBe(0);

      // Threshold 30s: is stale
      const stale30 = await registry.getStaleSessions(30);
      expect(stale30.length).toBe(1);
    });
  });

  describe('cleanupOldSessions()', () => {
    it('should remove completed sessions older than retention period', async () => {
      await registry.registerSession('session-001', 12345);
      await registry.registerSession('session-002', 12346);
      await registry.registerSession('session-003', 12347);

      // Mark session-001 and session-002 as completed
      await registry.updateStatus('session-001', 'completed');
      await registry.updateStatus('session-002', 'completed');

      // Make their heartbeats 25 hours old
      const registryPath = path.join(testDir, '.specweave', 'state', '.session-registry.json');
      const content = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      content.sessions['session-001'].last_heartbeat = twentyFiveHoursAgo;
      content.sessions['session-002'].last_heartbeat = twentyFiveHoursAgo;
      fs.writeFileSync(registryPath, JSON.stringify(content, null, 2));

      // Cleanup with 24-hour retention
      const removedCount = await registry.cleanupOldSessions(24);

      expect(removedCount).toBe(2);

      // Verify sessions were removed
      const session1 = await registry.getSession('session-001');
      const session2 = await registry.getSession('session-002');
      const session3 = await registry.getSession('session-003');

      expect(session1).toBeUndefined();
      expect(session2).toBeUndefined();
      expect(session3).toBeDefined(); // Active session retained
    });

    it('should keep active sessions regardless of age', async () => {
      await registry.registerSession('session-001', 12345);

      // Make heartbeat 25 hours old but keep status as "active"
      const registryPath = path.join(testDir, '.specweave', 'state', '.session-registry.json');
      const content = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      content.sessions['session-001'].last_heartbeat = twentyFiveHoursAgo;
      content.sessions['session-001'].status = 'active';
      fs.writeFileSync(registryPath, JSON.stringify(content, null, 2));

      const removedCount = await registry.cleanupOldSessions(24);

      expect(removedCount).toBe(0);

      const session = await registry.getSession('session-001');
      expect(session).toBeDefined();
    });

    it('should remove stale sessions older than retention period', async () => {
      await registry.registerSession('session-001', 12345);
      await registry.updateStatus('session-001', 'stale');

      // Make heartbeat 25 hours old
      const registryPath = path.join(testDir, '.specweave', 'state', '.session-registry.json');
      const content = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      content.sessions['session-001'].last_heartbeat = twentyFiveHoursAgo;
      fs.writeFileSync(registryPath, JSON.stringify(content, null, 2));

      const removedCount = await registry.cleanupOldSessions(24);

      expect(removedCount).toBe(1);

      const session = await registry.getSession('session-001');
      expect(session).toBeUndefined();
    });

    it('should return 0 when no sessions need cleanup', async () => {
      await registry.registerSession('session-001', 12345);

      const removedCount = await registry.cleanupOldSessions(24);

      expect(removedCount).toBe(0);
    });

    it('should update last_cleanup timestamp', async () => {
      await registry.registerSession('session-001', 12345);
      await registry.updateStatus('session-001', 'completed');

      // Make session old enough to clean up
      const registryPath = path.join(testDir, '.specweave', 'state', '.session-registry.json');
      const content = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      const oldHeartbeat = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      content.sessions['session-001'].last_heartbeat = oldHeartbeat;
      const oldCleanup = content.last_cleanup;
      fs.writeFileSync(registryPath, JSON.stringify(content, null, 2));

      await registry.cleanupOldSessions(24);

      // Read registry to check last_cleanup
      const updatedContent = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      expect(new Date(updatedContent.last_cleanup).getTime()).toBeGreaterThan(
        new Date(oldCleanup).getTime()
      );
    });

    it('should handle different retention periods correctly', async () => {
      await registry.registerSession('session-001', 12345);
      await registry.registerSession('session-002', 12346);
      await registry.updateStatus('session-001', 'completed');
      await registry.updateStatus('session-002', 'completed');

      // Make session-001 26 hours old, session-002 13 hours old
      const registryPath = path.join(testDir, '.specweave', 'state', '.session-registry.json');
      const content = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      content.sessions['session-001'].last_heartbeat = new Date(
        Date.now() - 26 * 60 * 60 * 1000
      ).toISOString();
      content.sessions['session-002'].last_heartbeat = new Date(
        Date.now() - 13 * 60 * 60 * 1000
      ).toISOString();
      fs.writeFileSync(registryPath, JSON.stringify(content, null, 2));

      // Cleanup with 24-hour retention
      const removed24h = await registry.cleanupOldSessions(24);
      expect(removed24h).toBe(1); // Only session-001

      // Cleanup with 12-hour retention
      const removed12h = await registry.cleanupOldSessions(12);
      expect(removed12h).toBe(1); // session-002
    });
  });

  describe('PID Existence Check', () => {
    it('should detect that current process PID exists', async () => {
      const currentPid = process.pid;
      await registry.registerSession('session-001', currentPid);

      // Make stale to trigger PID check
      const registryPath = path.join(testDir, '.specweave', 'state', '.session-registry.json');
      const content = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      content.sessions['session-001'].last_heartbeat = new Date(
        Date.now() - 90 * 1000
      ).toISOString();
      fs.writeFileSync(registryPath, JSON.stringify(content, null, 2));

      const staleSessions = await registry.getStaleSessions(60);

      expect(staleSessions[0].pid_exists).toBe(true);
    });

    it('should detect that non-existent PID does not exist', async () => {
      // PID 99999 almost certainly doesn't exist
      await registry.registerSession('session-001', 99999);

      const registryPath = path.join(testDir, '.specweave', 'state', '.session-registry.json');
      const content = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      content.sessions['session-001'].last_heartbeat = new Date(
        Date.now() - 90 * 1000
      ).toISOString();
      fs.writeFileSync(registryPath, JSON.stringify(content, null, 2));

      const staleSessions = await registry.getStaleSessions(60);

      expect(staleSessions[0].pid_exists).toBe(false);
    });
  });
});
