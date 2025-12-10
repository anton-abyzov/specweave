/**
 * Concurrent Sessions Helper
 *
 * Utilities for testing multiple sessions running simultaneously
 */

import { createMockSession, cleanupMockSession, MockSession } from './mock-session.js';
import { readRegistry, findProcessesByPattern, isProcessRunning, sleep } from './test-utils.js';

/**
 * Start multiple sessions simultaneously
 */
export async function startMultipleSessions(
  count: number,
  projectRoot: string = process.cwd()
): Promise<MockSession[]> {
  const sessions: MockSession[] = [];

  // Start all sessions in parallel
  const promises = [];
  for (let i = 0; i < count; i++) {
    promises.push(
      createMockSession({
        projectRoot,
        sessionType: `concurrent-test-${i}`,
        startHeartbeat: true
      })
    );
  }

  const results = await Promise.all(promises);
  sessions.push(...results);

  return sessions;
}

/**
 * Count active watchdog processes
 */
export async function countWatchdogs(projectRoot: string = process.cwd()): Promise<number> {
  // Look for session-watchdog processes
  const watchdogPattern = 'session-watchdog.*--daemon';
  const pids = await findProcessesByPattern(watchdogPattern);

  // Also check registry for watchdog entries
  const registry = await readRegistry(projectRoot);
  const watchdogSessions = Object.values(registry.sessions).filter(
    s => s.type === 'watchdog'
  );

  // Return max of process count and registry count
  return Math.max(pids.length, watchdogSessions.length);
}

/**
 * Verify registry integrity (valid JSON, no duplicates)
 */
export async function verifyRegistryIntegrity(
  projectRoot: string = process.cwd()
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  try {
    const registry = await readRegistry(projectRoot);

    // Check if it's an object
    if (typeof registry !== 'object' || registry === null) {
      errors.push('Registry is not an object');
      return { valid: false, errors };
    }

    // Check if sessions is an object
    if (typeof registry.sessions !== 'object' || registry.sessions === null) {
      errors.push('Registry.sessions is not an object');
      return { valid: false, errors };
    }

    // Check for duplicate session IDs (shouldn't happen with object keys, but check anyway)
    const sessionIds = Object.keys(registry.sessions);
    const uniqueIds = new Set(sessionIds);
    if (sessionIds.length !== uniqueIds.size) {
      errors.push('Duplicate session IDs found');
    }

    // Validate each session entry
    for (const [sessionId, session] of Object.entries(registry.sessions)) {
      if (!session.session_id) {
        errors.push(`Session ${sessionId} missing session_id field`);
      }
      if (!session.pid || typeof session.pid !== 'number') {
        errors.push(`Session ${sessionId} has invalid pid`);
      }
      if (!session.start_time) {
        errors.push(`Session ${sessionId} missing start_time`);
      }
      if (!session.last_heartbeat) {
        errors.push(`Session ${sessionId} missing last_heartbeat`);
      }
      if (!Array.isArray(session.child_pids)) {
        errors.push(`Session ${sessionId} has invalid child_pids`);
      }
    }

    return { valid: errors.length === 0, errors };
  } catch (error: any) {
    errors.push(`Failed to read registry: ${error.message}`);
    return { valid: false, errors };
  }
}

/**
 * Terminate a specific session by index
 */
export async function terminateSession(
  sessions: MockSession[],
  index: number
): Promise<void> {
  if (index < 0 || index >= sessions.length) {
    throw new Error(`Invalid index: ${index}`);
  }

  await sessions[index].terminate();
}

/**
 * Wait for watchdog to terminate
 */
export async function waitForWatchdogTermination(
  timeoutMs: number = 15000,
  projectRoot: string = process.cwd()
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const count = await countWatchdogs(projectRoot);
    if (count === 0) {
      return true;
    }
    await sleep(500);
  }

  return false;
}

/**
 * Get all session IDs from registry
 */
export async function getAllSessionIds(projectRoot: string = process.cwd()): Promise<string[]> {
  const registry = await readRegistry(projectRoot);
  return Object.keys(registry.sessions);
}

/**
 * Check if specific session is in registry
 */
export async function isSessionInRegistry(
  sessionId: string,
  projectRoot: string = process.cwd()
): Promise<boolean> {
  const registry = await readRegistry(projectRoot);
  return sessionId in registry.sessions;
}

/**
 * Verify all sessions have unique IDs
 */
export function verifyUniqueSessionIds(sessions: MockSession[]): boolean {
  const ids = sessions.map(s => s.sessionId);
  const uniqueIds = new Set(ids);
  return ids.length === uniqueIds.size;
}

/**
 * Get session count from registry
 */
export async function getSessionCount(projectRoot: string = process.cwd()): Promise<number> {
  const registry = await readRegistry(projectRoot);
  return Object.keys(registry.sessions).length;
}
