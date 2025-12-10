/**
 * Test Utilities for Process Lifecycle E2E Tests
 *
 * Provides common utilities for reading registry, checking processes, etc.
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface SessionEntry {
  session_id: string;
  pid: number;
  start_time: string;
  last_heartbeat: string;
  child_pids: number[];
  type: string;
  status?: string;
}

export interface SessionRegistry {
  sessions: Record<string, SessionEntry>;
  last_cleanup?: string;
}

/**
 * Read session registry from file
 */
export async function readRegistry(projectRoot: string = process.cwd()): Promise<SessionRegistry> {
  const registryPath = path.join(projectRoot, '.specweave', 'state', '.session-registry.json');

  if (!fs.existsSync(registryPath)) {
    return { sessions: {} };
  }

  const content = fs.readFileSync(registryPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Wait for session to appear in registry
 */
export async function waitForSessionInRegistry(
  sessionId: string,
  timeoutMs: number = 5000,
  projectRoot: string = process.cwd()
): Promise<SessionEntry> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const registry = await readRegistry(projectRoot);
    const session = registry.sessions[sessionId];

    if (session) {
      return session;
    }

    // Poll every 100ms
    await sleep(100);
  }

  throw new Error(`Session ${sessionId} not found in registry after ${timeoutMs}ms`);
}

/**
 * Wait for session to be removed from registry
 */
export async function waitForSessionRemoved(
  sessionId: string,
  timeoutMs: number = 10000,
  projectRoot: string = process.cwd()
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const registry = await readRegistry(projectRoot);

    if (!registry.sessions[sessionId]) {
      return; // Session removed successfully
    }

    // Poll every 100ms
    await sleep(100);
  }

  throw new Error(`Session ${sessionId} still in registry after ${timeoutMs}ms`);
}

/**
 * Check if process is running (cross-platform)
 */
export async function isProcessRunning(pid: number): Promise<boolean> {
  try {
    const platform = process.platform;

    if (platform === 'win32') {
      const { stdout } = await execAsync(`tasklist /FI "PID eq ${pid}" /NH`);
      return stdout.includes(`${pid}`);
    } else {
      // Unix-like systems (macOS, Linux)
      try {
        process.kill(pid, 0); // Signal 0 checks existence without killing
        return true;
      } catch (err: any) {
        if (err.code === 'ESRCH') {
          return false; // Process doesn't exist
        }
        throw err;
      }
    }
  } catch (error) {
    return false;
  }
}

/**
 * Find processes matching a pattern
 */
export async function findProcessesByPattern(pattern: string): Promise<number[]> {
  try {
    const platform = process.platform;

    if (platform === 'win32') {
      const { stdout } = await execAsync(`wmic process where "CommandLine like '%${pattern}%'" get ProcessId`);
      const lines = stdout.split('\n').slice(1); // Skip header
      return lines
        .map(line => parseInt(line.trim()))
        .filter(pid => !isNaN(pid));
    } else {
      // Unix-like systems
      const { stdout } = await execAsync(`ps aux | grep "${pattern}" | grep -v grep | awk '{print $2}'`);
      return stdout
        .split('\n')
        .filter(line => line.trim())
        .map(pid => parseInt(pid.trim()))
        .filter(pid => !isNaN(pid));
    }
  } catch (error) {
    return [];
  }
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Poll a condition until it's true or timeout
 */
export async function pollUntil(
  condition: () => Promise<boolean> | boolean,
  timeoutMs: number = 5000,
  intervalMs: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const result = await condition();
    if (result) {
      return;
    }
    await sleep(intervalMs);
  }

  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

/**
 * Get heartbeat count for a session over time
 */
export async function countHeartbeats(
  sessionId: string,
  durationMs: number,
  projectRoot: string = process.cwd()
): Promise<number> {
  const registry = await readRegistry(projectRoot);
  const session = registry.sessions[sessionId];

  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  let lastHeartbeat = new Date(session.last_heartbeat).getTime();
  let count = 0;
  const startTime = Date.now();

  while (Date.now() - startTime < durationMs) {
    await sleep(1000); // Check every second

    const updatedRegistry = await readRegistry(projectRoot);
    const updatedSession = updatedRegistry.sessions[sessionId];

    if (updatedSession) {
      const currentHeartbeat = new Date(updatedSession.last_heartbeat).getTime();
      if (currentHeartbeat > lastHeartbeat) {
        count++;
        lastHeartbeat = currentHeartbeat;
      }
    }
  }

  return count;
}

/**
 * Clean up test artifacts
 */
export async function cleanupTestArtifacts(projectRoot: string = process.cwd()): Promise<void> {
  const statePath = path.join(projectRoot, '.specweave', 'state');
  const logsPath = path.join(projectRoot, '.specweave', 'logs');

  // Remove test session registry
  const registryPath = path.join(statePath, '.session-registry.json');
  if (fs.existsSync(registryPath)) {
    fs.unlinkSync(registryPath);
  }

  // Clean test locks
  const lockFiles = fs.readdirSync(statePath).filter(f => f.endsWith('.lock'));
  for (const lockFile of lockFiles) {
    fs.rmSync(path.join(statePath, lockFile), { recursive: true, force: true });
  }

  // Clean test logs
  if (fs.existsSync(logsPath)) {
    const testLogs = fs.readdirSync(logsPath).filter(f => f.includes('test-') || f.includes('e2e-'));
    for (const logFile of testLogs) {
      fs.unlinkSync(path.join(logsPath, logFile));
    }
  }
}
