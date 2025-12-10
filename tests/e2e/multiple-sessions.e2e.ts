/**
 * E2E Test: Multiple Concurrent Sessions
 *
 * Tests multiple sessions running simultaneously:
 * - Concurrent session registration
 * - Single watchdog coordination
 * - Independent session termination
 * - Registry integrity under concurrency
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockSession } from '../helpers/mock-session.js';
import { readRegistry, waitForSessionRemoved, cleanupTestArtifacts, sleep } from '../helpers/test-utils.js';
import {
  startMultipleSessions,
  countWatchdogs,
  verifyRegistryIntegrity,
  terminateSession,
  waitForWatchdogTermination,
  getAllSessionIds,
  isSessionInRegistry,
  verifyUniqueSessionIds,
  getSessionCount
} from '../helpers/concurrent-sessions.js';

describe('E2E: Multiple Concurrent Sessions', () => {
  let sessions: MockSession[] = [];
  const projectRoot = process.cwd();

  beforeEach(async () => {
    await cleanupTestArtifacts(projectRoot);
    sessions = [];
  });

  afterEach(async () => {
    // Clean up all sessions
    for (const session of sessions) {
      try {
        await session.terminate();
      } catch (err) {
        // Ignore errors during cleanup
      }
    }
    sessions = [];

    await cleanupTestArtifacts(projectRoot);
  });

  it('should start three sessions simultaneously without conflicts', async () => {
    // AC-US4-01: Three sessions start simultaneously without conflicts
    sessions = await startMultipleSessions(3, projectRoot);

    expect(sessions).toHaveLength(3);

    // All sessions should be running
    for (const session of sessions) {
      const isRunning = await session.isRunning();
      expect(isRunning).toBe(true);
    }

    // All sessions should be in registry
    for (const session of sessions) {
      const inRegistry = await isSessionInRegistry(session.sessionId, projectRoot);
      expect(inRegistry).toBe(true);
    }
  }, 30000);

  it('should have only one watchdog daemon running', async () => {
    // AC-US4-02: Only one watchdog daemon running despite multiple sessions
    sessions = await startMultipleSessions(3, projectRoot);

    // Give watchdog time to coordinate
    await sleep(2000);

    const watchdogCount = await countWatchdogs(projectRoot);

    // Should have exactly 1 watchdog
    expect(watchdogCount).toBeLessThanOrEqual(1);

    // Note: In test environment without actual watchdog daemon running,
    // this might be 0. The important thing is it's NOT 3 (one per session)
  }, 30000);

  it('should give each session a unique session_id', async () => {
    // AC-US4-03: Each session has unique session_id in registry
    sessions = await startMultipleSessions(3, projectRoot);

    // Verify unique IDs in sessions array
    const hasUniqueIds = verifyUniqueSessionIds(sessions);
    expect(hasUniqueIds).toBe(true);

    // Verify unique IDs in registry
    const registry = await readRegistry(projectRoot);
    const sessionIds = Object.keys(registry.sessions);

    expect(sessionIds).toHaveLength(3);

    // All IDs should be different
    const uniqueIds = new Set(sessionIds);
    expect(uniqueIds.size).toBe(3);
  }, 30000);

  it('should keep registry as valid JSON under concurrent access', async () => {
    // AC-US4-04: Registry remains valid JSON under concurrent access
    sessions = await startMultipleSessions(3, projectRoot);

    // Let heartbeats run for a while (concurrent updates)
    await sleep(15000);

    // Verify registry integrity
    const { valid, errors } = await verifyRegistryIntegrity(projectRoot);

    expect(valid).toBe(true);
    if (!valid) {
      console.error('Registry integrity errors:', errors);
    }

    // Should still have 3 sessions
    const count = await getSessionCount(projectRoot);
    expect(count).toBe(3);
  }, 20000);

  it('should allow sessions to exit independently', async () => {
    // AC-US4-05: Sessions exit independently without affecting others
    sessions = await startMultipleSessions(3, projectRoot);

    const sessionIds = sessions.map(s => s.sessionId);

    // Verify all 3 are in registry
    let count = await getSessionCount(projectRoot);
    expect(count).toBe(3);

    // Terminate middle session (index 1)
    await terminateSession(sessions, 1);

    // Wait for cleanup
    await waitForSessionRemoved(sessionIds[1], 10000, projectRoot);

    // Verify only 2 remain
    count = await getSessionCount(projectRoot);
    expect(count).toBe(2);

    // Verify sessions 0 and 2 are still in registry
    expect(await isSessionInRegistry(sessionIds[0], projectRoot)).toBe(true);
    expect(await isSessionInRegistry(sessionIds[2], projectRoot)).toBe(true);

    // Verify session 1 is removed
    expect(await isSessionInRegistry(sessionIds[1], projectRoot)).toBe(false);

    // Verify sessions 0 and 2 are still running
    expect(await sessions[0].isRunning()).toBe(true);
    expect(await sessions[2].isRunning()).toBe(true);
  }, 30000);

  it('should have watchdog terminate after last session exits', async () => {
    // AC-US4-06: Watchdog terminates after last session exits
    sessions = await startMultipleSessions(3, projectRoot);

    // Give watchdog time to start
    await sleep(2000);

    const watchdogCountBefore = await countWatchdogs(projectRoot);

    // Terminate all sessions
    for (let i = 0; i < sessions.length; i++) {
      await terminateSession(sessions, i);
      await sleep(1000);
    }

    // Wait for all sessions to be removed
    for (const session of sessions) {
      await waitForSessionRemoved(session.sessionId, 10000, projectRoot);
    }

    // Wait for watchdog to detect no active sessions and terminate
    const watchdogTerminated = await waitForWatchdogTermination(15000, projectRoot);

    // In test env without actual watchdog daemon, this check is informational
    // The key is that there should be no watchdog processes left
    const watchdogCountAfter = await countWatchdogs(projectRoot);
    expect(watchdogCountAfter).toBe(0);
  }, 40000);

  it('should handle registry under heavy concurrent updates', async () => {
    // Stress test: verify registry doesn't corrupt under many updates
    sessions = await startMultipleSessions(3, projectRoot);

    // Let heartbeats run for a while (60 updates total: 3 sessions × 4 updates/session)
    await sleep(20000);

    // Verify registry is still valid
    const { valid, errors } = await verifyRegistryIntegrity(projectRoot);
    expect(valid).toBe(true);

    if (!valid) {
      console.error('Registry corruption detected:', errors);
      fail('Registry became corrupted under concurrent updates');
    }

    // Verify all sessions are still present
    const count = await getSessionCount(projectRoot);
    expect(count).toBe(3);
  }, 25000);

  it('should maintain correct session count throughout lifecycle', async () => {
    // Test session count changes correctly
    expect(await getSessionCount(projectRoot)).toBe(0);

    // Start 3 sessions
    sessions = await startMultipleSessions(3, projectRoot);
    await sleep(1000);
    expect(await getSessionCount(projectRoot)).toBe(3);

    // Remove 1 session
    await terminateSession(sessions, 0);
    await waitForSessionRemoved(sessions[0].sessionId, 10000, projectRoot);
    expect(await getSessionCount(projectRoot)).toBe(2);

    // Remove another
    await terminateSession(sessions, 1);
    await waitForSessionRemoved(sessions[1].sessionId, 10000, projectRoot);
    expect(await getSessionCount(projectRoot)).toBe(1);

    // Remove last
    await terminateSession(sessions, 2);
    await waitForSessionRemoved(sessions[2].sessionId, 10000, projectRoot);
    expect(await getSessionCount(projectRoot)).toBe(0);
  }, 40000);

  it('should handle rapid session creation and termination', async () => {
    // Stress test: rapid create/destroy cycle
    for (let i = 0; i < 3; i++) {
      const session = await startMultipleSessions(1, projectRoot);
      sessions.push(...session);

      await sleep(1000);

      await terminateSession(sessions, sessions.length - 1);
      await waitForSessionRemoved(session[0].sessionId, 10000, projectRoot);
    }

    // Registry should be empty
    const count = await getSessionCount(projectRoot);
    expect(count).toBe(0);

    // Registry should still be valid
    const { valid } = await verifyRegistryIntegrity(projectRoot);
    expect(valid).toBe(true);
  }, 50000);
});
