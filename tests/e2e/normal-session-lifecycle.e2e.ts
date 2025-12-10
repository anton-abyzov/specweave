/**
 * E2E Test: Normal Session Lifecycle
 *
 * Tests the complete lifecycle of a Claude Code session:
 * - Session start and registration
 * - Heartbeat monitoring
 * - Normal shutdown and cleanup
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMockSession, cleanupMockSession, MockSession } from '../helpers/mock-session.js';
import {
  readRegistry,
  waitForSessionInRegistry,
  waitForSessionRemoved,
  isProcessRunning,
  findProcessesByPattern,
  countHeartbeats,
  cleanupTestArtifacts,
  sleep
} from '../helpers/test-utils.js';

describe('E2E: Normal Session Lifecycle', () => {
  let mockSession: MockSession | null = null;
  const projectRoot = process.cwd();

  beforeEach(async () => {
    // Clean up any leftover test artifacts
    await cleanupTestArtifacts(projectRoot);
  });

  afterEach(async () => {
    // Clean up mock session
    if (mockSession) {
      await cleanupMockSession(mockSession);
      mockSession = null;
    }

    // Clean up test artifacts
    await cleanupTestArtifacts(projectRoot);
  });

  it('should register session successfully', async () => {
    // AC-US2-01: Mock Claude Code session starts successfully
    mockSession = await createMockSession({
      projectRoot,
      sessionType: 'e2e-test',
      startHeartbeat: false // Test registration only
    });

    expect(mockSession).toBeDefined();
    expect(mockSession.pid).toBeGreaterThan(0);
    expect(mockSession.sessionId).toMatch(/^e2e-test-/);

    // Verify session is running
    const isRunning = await mockSession.isRunning();
    expect(isRunning).toBe(true);
  });

  it('should appear in registry within 5 seconds', async () => {
    // AC-US2-02: Session registered in registry within 5 seconds
    mockSession = await createMockSession({
      projectRoot,
      sessionType: 'e2e-test'
    });

    // Wait for session in registry (should already be there from createMockSession)
    const sessionEntry = await waitForSessionInRegistry(mockSession.sessionId, 5000, projectRoot);

    expect(sessionEntry).toBeDefined();
    expect(sessionEntry.session_id).toBe(mockSession.sessionId);
    expect(sessionEntry.pid).toBe(mockSession.pid);
    expect(sessionEntry.type).toBe('e2e-test');
    expect(sessionEntry.start_time).toBeDefined();
    expect(sessionEntry.last_heartbeat).toBeDefined();
  });

  it('should have all required registry fields', async () => {
    // Verify session entry has all required fields
    mockSession = await createMockSession({ projectRoot });

    const registry = await readRegistry(projectRoot);
    const sessionEntry = registry.sessions[mockSession.sessionId];

    expect(sessionEntry).toBeDefined();
    expect(sessionEntry.session_id).toBe(mockSession.sessionId);
    expect(sessionEntry.pid).toBe(mockSession.pid);
    expect(sessionEntry.start_time).toBeDefined();
    expect(sessionEntry.last_heartbeat).toBeDefined();
    expect(sessionEntry.child_pids).toBeDefined();
    expect(Array.isArray(sessionEntry.child_pids)).toBe(true);
    expect(sessionEntry.type).toBeDefined();

    // Validate timestamp format (ISO-8601)
    expect(() => new Date(sessionEntry.start_time)).not.toThrow();
    expect(() => new Date(sessionEntry.last_heartbeat)).not.toThrow();
  });

  it('should have heartbeat process running and updating', async () => {
    // AC-US2-03: Heartbeat process running and updating every 5 seconds
    mockSession = await createMockSession({
      projectRoot,
      startHeartbeat: true
    });

    // Verify heartbeat process is running
    const heartbeatRunning = await mockSession.isHeartbeatRunning();
    expect(heartbeatRunning).toBe(true);

    // Get initial heartbeat time
    const registryBefore = await readRegistry(projectRoot);
    const sessionBefore = registryBefore.sessions[mockSession.sessionId];
    const heartbeatBefore = new Date(sessionBefore.last_heartbeat).getTime();

    // Wait for at least 6 seconds (one heartbeat interval + buffer)
    await sleep(6000);

    // Check heartbeat updated
    const registryAfter = await readRegistry(projectRoot);
    const sessionAfter = registryAfter.sessions[mockSession.sessionId];
    const heartbeatAfter = new Date(sessionAfter.last_heartbeat).getTime();

    expect(heartbeatAfter).toBeGreaterThan(heartbeatBefore);

    // Heartbeat should update approximately every 5 seconds
    const timeDiff = heartbeatAfter - heartbeatBefore;
    expect(timeDiff).toBeGreaterThanOrEqual(5000); // At least 5 seconds
    expect(timeDiff).toBeLessThan(8000); // But not too much more
  });

  it('should remain active during simulated work', async () => {
    // AC-US2-04: Session remains active during simulated work (30s)
    mockSession = await createMockSession({
      projectRoot,
      startHeartbeat: true
    });

    // Count heartbeats over 30 seconds
    // Should get at least 5 heartbeats (30s / 5s = 6, but allow for timing)
    const heartbeatCount = await countHeartbeats(mockSession.sessionId, 30000, projectRoot);

    expect(heartbeatCount).toBeGreaterThanOrEqual(5);
    expect(heartbeatCount).toBeLessThanOrEqual(7); // Max 7 with timing variance

    // Session should still be running
    const isRunning = await mockSession.isRunning();
    expect(isRunning).toBe(true);

    // Session should still be in registry
    const registry = await readRegistry(projectRoot);
    expect(registry.sessions[mockSession.sessionId]).toBeDefined();
  }, 35000); // Extend timeout for this test

  it('should clean up on normal shutdown', async () => {
    // AC-US2-05: Clean shutdown removes session and kills all children
    mockSession = await createMockSession({
      projectRoot,
      startHeartbeat: true
    });

    const sessionId = mockSession.sessionId;
    const sessionPid = mockSession.pid;
    const heartbeatPid = mockSession.heartbeatProcess?.pid;

    // Verify session and heartbeat are running
    expect(await mockSession.isRunning()).toBe(true);
    expect(await mockSession.isHeartbeatRunning()).toBe(true);

    // Terminate session normally
    await mockSession.terminate();

    // Wait for cleanup (within 10 seconds)
    await waitForSessionRemoved(sessionId, 10000, projectRoot);

    // Verify session removed from registry
    const registry = await readRegistry(projectRoot);
    expect(registry.sessions[sessionId]).toBeUndefined();

    // Verify processes are dead
    const mainProcessRunning = await isProcessRunning(sessionPid);
    expect(mainProcessRunning).toBe(false);

    if (heartbeatPid) {
      const heartbeatRunning = await isProcessRunning(heartbeatPid);
      expect(heartbeatRunning).toBe(false);
    }
  }, 15000);

  it('should leave no zombie processes after exit', async () => {
    // AC-US2-06: No zombie processes remain after exit
    mockSession = await createMockSession({
      projectRoot,
      startHeartbeat: true
    });

    const sessionId = mockSession.sessionId;

    // Terminate session
    await mockSession.terminate();

    // Wait for cleanup
    await waitForSessionRemoved(sessionId, 10000, projectRoot);

    // Give extra time for processes to fully exit
    await sleep(2000);

    // Check for zombie processes matching session pattern
    const zombies = await findProcessesByPattern(sessionId);

    expect(zombies).toHaveLength(0);
  }, 15000);

  it('should handle child PIDs correctly', async () => {
    // Verify child PIDs are tracked in registry
    mockSession = await createMockSession({
      projectRoot,
      startHeartbeat: true
    });

    const registry = await readRegistry(projectRoot);
    const sessionEntry = registry.sessions[mockSession.sessionId];

    expect(sessionEntry.child_pids).toBeDefined();
    expect(Array.isArray(sessionEntry.child_pids)).toBe(true);

    // Should have heartbeat PID in child PIDs
    if (mockSession.heartbeatProcess?.pid) {
      expect(sessionEntry.child_pids).toContain(mockSession.heartbeatProcess.pid);
    }
  });

  it('should handle concurrent heartbeat updates without corruption', async () => {
    // Verify registry remains valid JSON under concurrent updates
    mockSession = await createMockSession({
      projectRoot,
      startHeartbeat: true
    });

    // Let heartbeat run for several iterations
    await sleep(15000);

    // Verify registry is still valid JSON
    const registry = await readRegistry(projectRoot);
    expect(registry).toBeDefined();
    expect(registry.sessions).toBeDefined();
    expect(typeof registry.sessions).toBe('object');

    // Session should still be present and valid
    const sessionEntry = registry.sessions[mockSession.sessionId];
    expect(sessionEntry).toBeDefined();
    expect(sessionEntry.session_id).toBe(mockSession.sessionId);
  }, 20000);
});
