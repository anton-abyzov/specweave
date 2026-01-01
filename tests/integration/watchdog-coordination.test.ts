/**
 * Integration tests for watchdog coordination
 *
 * Tests watchdog registration, coordination logic, and prevention of
 * multiple daemon instances.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SessionRegistry } from '../../src/utils/session-registry.js';

describe('Watchdog Coordination - Integration', () => {
  let testDir: string;
  let registry: SessionRegistry;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'watchdog-coord-'));
    // Create .specweave directory - required for SessionRegistry to be valid
    fs.mkdirSync(path.join(testDir, '.specweave'), { recursive: true });
    registry = new SessionRegistry(testDir);
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('First Watchdog Startup', () => {
    it('should register first watchdog successfully', async () => {
      const watchdogId = 'watchdog-001';
      const pid = 12345;

      const success = await registry.registerSession(watchdogId, pid, { type: 'watchdog' });

      expect(success).toBe(true);

      const session = await registry.getSession(watchdogId);
      expect(session).toBeDefined();
      expect(session?.type).toBe('watchdog');
      expect(session?.pid).toBe(pid);
      expect(session?.status).toBe('active');
    });

    it('should have recent heartbeat on registration', async () => {
      const watchdogId = 'watchdog-002';

      await registry.registerSession(watchdogId, 12345, { type: 'watchdog' });

      const session = await registry.getSession(watchdogId);
      const heartbeatAge = Date.now() - new Date(session!.last_heartbeat).getTime();

      // Heartbeat should be very recent (< 1 second)
      expect(heartbeatAge).toBeLessThan(1000);
    });

    it('should mark watchdog as active status', async () => {
      const watchdogId = 'watchdog-003';

      await registry.registerSession(watchdogId, 12345, { type: 'watchdog' });

      const session = await registry.getSession(watchdogId);
      expect(session?.status).toBe('active');
    });
  });

  describe('Active Watchdog Detection', () => {
    it('should detect active watchdog when heartbeat is recent', async () => {
      const watchdogId = 'watchdog-004';
      await registry.registerSession(watchdogId, 12345, { type: 'watchdog' });

      // Get all sessions and filter for watchdogs
      const sessions = await registry.getAllSessions();
      const watchdogs = sessions.filter((s) => s.type === 'watchdog');

      expect(watchdogs.length).toBe(1);

      // Check if watchdog is active (heartbeat < 30s)
      const now = Date.now();
      const lastHeartbeat = new Date(watchdogs[0].last_heartbeat).getTime();
      const age = (now - lastHeartbeat) / 1000;

      expect(age).toBeLessThan(30);
    });

    it('should return no active watchdog if registry is empty', async () => {
      const sessions = await registry.getAllSessions();
      const watchdogs = sessions.filter((s) => s.type === 'watchdog');

      expect(watchdogs.length).toBe(0);
    });

    it('should distinguish between watchdog and other session types', async () => {
      await registry.registerSession('session-001', 12345, { type: 'claude-code' });
      await registry.registerSession('watchdog-001', 12346, { type: 'watchdog' });
      await registry.registerSession('heartbeat-001', 12347, { type: 'heartbeat' });

      const sessions = await registry.getAllSessions();
      const watchdogs = sessions.filter((s) => s.type === 'watchdog');

      expect(sessions.length).toBe(3);
      expect(watchdogs.length).toBe(1);
      expect(watchdogs[0].session_id).toBe('watchdog-001');
    });
  });

  describe('Stale Watchdog Detection', () => {
    it('should detect stale watchdog when heartbeat is old', async () => {
      const watchdogId = 'watchdog-005';
      await registry.registerSession(watchdogId, 12345, { type: 'watchdog' });

      // Manually make heartbeat stale (90 seconds old)
      const registryPath = path.join(testDir, '.specweave', 'state', '.session-registry.json');
      const content = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      const ninetySecondsAgo = new Date(Date.now() - 90 * 1000).toISOString();
      content.sessions[watchdogId].last_heartbeat = ninetySecondsAgo;
      fs.writeFileSync(registryPath, JSON.stringify(content, null, 2));

      // Check if watchdog is stale
      const session = await registry.getSession(watchdogId);
      const now = Date.now();
      const lastHeartbeat = new Date(session!.last_heartbeat).getTime();
      const age = (now - lastHeartbeat) / 1000;

      expect(age).toBeGreaterThan(60);
    });

    it('should mark stale watchdog for cleanup', async () => {
      const watchdogId = 'watchdog-006';
      await registry.registerSession(watchdogId, 99999, { type: 'watchdog' });

      // Make heartbeat 90 seconds old
      const registryPath = path.join(testDir, '.specweave', 'state', '.session-registry.json');
      const content = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      content.sessions[watchdogId].last_heartbeat = new Date(
        Date.now() - 90 * 1000
      ).toISOString();
      fs.writeFileSync(registryPath, JSON.stringify(content, null, 2));

      // Detect stale sessions
      const staleSessions = await registry.getStaleSessions(60);

      expect(staleSessions.length).toBe(1);
      expect(staleSessions[0].session.session_id).toBe(watchdogId);
      expect(staleSessions[0].stale_duration_seconds).toBeGreaterThan(60);
    });
  });

  describe('Watchdog Takeover Logic', () => {
    it('should allow new watchdog when old one is stale', async () => {
      // Register old stale watchdog
      const oldWatchdogId = 'watchdog-old';
      await registry.registerSession(oldWatchdogId, 99998, { type: 'watchdog' });

      // Make it stale
      const registryPath = path.join(testDir, '.specweave', 'state', '.session-registry.json');
      const content = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      content.sessions[oldWatchdogId].last_heartbeat = new Date(
        Date.now() - 90 * 1000
      ).toISOString();
      fs.writeFileSync(registryPath, JSON.stringify(content, null, 2));

      // Register new watchdog (simulates takeover)
      const newWatchdogId = 'watchdog-new';
      const success = await registry.registerSession(newWatchdogId, 12349, { type: 'watchdog' });

      expect(success).toBe(true);

      // Both watchdogs should exist (old one will be cleaned up separately)
      const sessions = await registry.getAllSessions();
      const watchdogs = sessions.filter((s) => s.type === 'watchdog');

      expect(watchdogs.length).toBe(2);

      // New watchdog should have recent heartbeat
      const newWatchdog = watchdogs.find((w) => w.session_id === newWatchdogId);
      const heartbeatAge = Date.now() - new Date(newWatchdog!.last_heartbeat).getTime();

      expect(heartbeatAge).toBeLessThan(1000);
    });

    it('should remove stale watchdog before registering new one', async () => {
      // Register old stale watchdog
      const oldWatchdogId = 'watchdog-stale';
      await registry.registerSession(oldWatchdogId, 99997, { type: 'watchdog' });

      // Make it stale
      const registryPath = path.join(testDir, '.specweave', 'state', '.session-registry.json');
      const content = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      content.sessions[oldWatchdogId].last_heartbeat = new Date(
        Date.now() - 90 * 1000
      ).toISOString();
      fs.writeFileSync(registryPath, JSON.stringify(content, null, 2));

      // Remove stale watchdog
      await registry.removeSession(oldWatchdogId);

      // Register new watchdog
      const newWatchdogId = 'watchdog-fresh';
      await registry.registerSession(newWatchdogId, 12350, { type: 'watchdog' });

      // Only new watchdog should exist
      const sessions = await registry.getAllSessions();
      const watchdogs = sessions.filter((s) => s.type === 'watchdog');

      expect(watchdogs.length).toBe(1);
      expect(watchdogs[0].session_id).toBe(newWatchdogId);
    });
  });

  describe('Heartbeat Updates', () => {
    it('should update watchdog heartbeat successfully', async () => {
      const watchdogId = 'watchdog-007';
      await registry.registerSession(watchdogId, 12351, { type: 'watchdog' });

      const sessionBefore = await registry.getSession(watchdogId);
      const heartbeatBefore = sessionBefore!.last_heartbeat;

      // Wait a bit and update heartbeat
      await new Promise((resolve) => setTimeout(resolve, 100));
      await registry.updateHeartbeat(watchdogId);

      const sessionAfter = await registry.getSession(watchdogId);
      const heartbeatAfter = sessionAfter!.last_heartbeat;

      expect(new Date(heartbeatAfter).getTime()).toBeGreaterThan(
        new Date(heartbeatBefore).getTime()
      );
    });

    it('should keep watchdog status as active after heartbeat update', async () => {
      const watchdogId = 'watchdog-008';
      await registry.registerSession(watchdogId, 12352, { type: 'watchdog' });

      await registry.updateHeartbeat(watchdogId);

      const session = await registry.getSession(watchdogId);
      expect(session?.status).toBe('active');
    });

    it('should handle multiple heartbeat updates', async () => {
      const watchdogId = 'watchdog-009';
      await registry.registerSession(watchdogId, 12353, { type: 'watchdog' });

      // Update heartbeat 10 times
      for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 10));
        const success = await registry.updateHeartbeat(watchdogId);
        expect(success).toBe(true);
      }

      const session = await registry.getSession(watchdogId);
      expect(session).toBeDefined();
      expect(session?.status).toBe('active');
    });
  });

  describe('Watchdog Removal', () => {
    it('should remove watchdog cleanly', async () => {
      const watchdogId = 'watchdog-010';
      await registry.registerSession(watchdogId, 12354, { type: 'watchdog' });

      const success = await registry.removeSession(watchdogId);
      expect(success).toBe(true);

      const session = await registry.getSession(watchdogId);
      expect(session).toBeUndefined();
    });

    it('should not affect other sessions when removing watchdog', async () => {
      await registry.registerSession('session-002', 12355, { type: 'claude-code' });
      await registry.registerSession('watchdog-011', 12356, { type: 'watchdog' });

      await registry.removeSession('watchdog-011');

      const sessions = await registry.getAllSessions();
      expect(sessions.length).toBe(1);
      expect(sessions[0].session_id).toBe('session-002');
    });
  });

  describe('Multiple Watchdog Prevention', () => {
    it('should detect when another watchdog is already active', async () => {
      // Register first watchdog
      await registry.registerSession('watchdog-first', 12357, { type: 'watchdog' });

      // Check for active watchdog
      const sessions = await registry.getAllSessions();
      const watchdogs = sessions.filter((s) => s.type === 'watchdog');

      expect(watchdogs.length).toBe(1);

      // Check if watchdog is active (heartbeat < 30s)
      const now = Date.now();
      const lastHeartbeat = new Date(watchdogs[0].last_heartbeat).getTime();
      const age = (now - lastHeartbeat) / 1000;

      // If age < 30s, another watchdog should NOT start
      const shouldStart = age >= 30;
      expect(shouldStart).toBe(false);
    });
  });
});
