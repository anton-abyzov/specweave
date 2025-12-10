/**
 * Crash Simulator for E2E Tests
 *
 * Simulates crash scenarios and monitors cleanup behavior
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { sleep, isProcessRunning, findProcessesByPattern } from './test-utils.js';

/**
 * Simulate crash by sending SIGKILL to process
 */
export async function simulateCrash(pid: number): Promise<void> {
  try {
    process.kill(pid, 'SIGKILL');
  } catch (err: any) {
    if (err.code !== 'ESRCH') {
      throw err;
    }
    // Process already dead
  }
}

/**
 * Wait for orphan detection (heartbeat should detect parent death)
 */
export async function waitForOrphanDetection(
  sessionId: string,
  timeoutMs: number = 10000,
  projectRoot: string = process.cwd()
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    // Check if session is still in registry
    const registryPath = path.join(projectRoot, '.specweave', 'state', '.session-registry.json');

    if (!fs.existsSync(registryPath)) {
      return true; // Registry doesn't exist, session definitely removed
    }

    const content = fs.readFileSync(registryPath, 'utf-8');
    const registry = JSON.parse(content);

    if (!registry.sessions[sessionId]) {
      return true; // Session removed (heartbeat cleaned it up)
    }

    await sleep(500);
  }

  return false; // Timeout - session still present
}

/**
 * Wait for cleanup service to run
 * Cleanup service runs every 60s, so wait up to 70s with buffer
 */
export async function waitForCleanupService(
  timeoutMs: number = 75000
): Promise<void> {
  await sleep(timeoutMs);
}

/**
 * Check if cleanup log contains specific action
 */
export async function verifyCleanupLog(
  sessionId: string,
  expectedActions: string[],
  projectRoot: string = process.cwd()
): Promise<boolean> {
  const cleanupLogPath = path.join(projectRoot, '.specweave', 'logs', 'cleanup.log');

  if (!fs.existsSync(cleanupLogPath)) {
    return false;
  }

  const logContent = fs.readFileSync(cleanupLogPath, 'utf-8');

  // Check if all expected actions are in log
  for (const action of expectedActions) {
    const searchPattern = action.replace('{sessionId}', sessionId);
    if (!logContent.includes(searchPattern)) {
      return false;
    }
  }

  return true;
}

/**
 * Check for zombie processes matching patterns
 */
export async function checkZombieProcesses(patterns: string[]): Promise<number[]> {
  const allZombies: number[] = [];

  for (const pattern of patterns) {
    const zombies = await findProcessesByPattern(pattern);
    allZombies.push(...zombies);
  }

  return allZombies;
}

/**
 * Get recent cleanup log entries
 */
export function getRecentCleanupLogs(
  projectRoot: string = process.cwd(),
  lineCount: number = 50
): string[] {
  const cleanupLogPath = path.join(projectRoot, '.specweave', 'logs', 'cleanup.log');

  if (!fs.existsSync(cleanupLogPath)) {
    return [];
  }

  const logContent = fs.readFileSync(cleanupLogPath, 'utf-8');
  const lines = logContent.split('\n').filter(line => line.trim());

  return lines.slice(-lineCount);
}

/**
 * Parse cleanup log entry
 */
export interface CleanupLogEntry {
  timestamp: string;
  level: string;
  action: string;
  details: string;
}

export function parseCleanupLogEntry(line: string): CleanupLogEntry | null {
  // Format: [timestamp] [level] [action] details
  const match = line.match(/^\[([^\]]+)\] \[([^\]]+)\] \[([^\]]+)\] (.+)$/);

  if (!match) {
    return null;
  }

  return {
    timestamp: match[1],
    level: match[2],
    action: match[3],
    details: match[4]
  };
}

/**
 * Find cleanup actions for specific session
 */
export function findCleanupActionsForSession(
  sessionId: string,
  projectRoot: string = process.cwd()
): CleanupLogEntry[] {
  const logs = getRecentCleanupLogs(projectRoot, 200);
  const entries: CleanupLogEntry[] = [];

  for (const line of logs) {
    const entry = parseCleanupLogEntry(line);
    if (entry && entry.details.includes(sessionId)) {
      entries.push(entry);
    }
  }

  return entries;
}

/**
 * Verify heartbeat self-termination
 * Check that heartbeat process exits when parent dies
 */
export async function verifyHeartbeatSelfTermination(
  heartbeatPid: number,
  timeoutMs: number = 10000
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const isRunning = await isProcessRunning(heartbeatPid);
    if (!isRunning) {
      return true; // Heartbeat terminated
    }
    await sleep(500);
  }

  return false; // Timeout - heartbeat still running
}
