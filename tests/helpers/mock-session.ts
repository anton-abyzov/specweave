/**
 * Mock Session Helper for E2E Tests
 *
 * Creates mock Claude Code sessions for testing process lifecycle
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { sleep, isProcessRunning, waitForSessionInRegistry } from './test-utils.js';

export interface MockSessionOptions {
  projectRoot?: string;
  sessionType?: string;
  startHeartbeat?: boolean;
  heartbeatInterval?: number;
}

export class MockSession {
  public sessionId: string;
  public pid: number;
  public process: ChildProcess | null = null;
  public heartbeatProcess: ChildProcess | null = null;
  private projectRoot: string;
  private cleanedUp: boolean = false;

  constructor(
    sessionId: string,
    pid: number,
    projectRoot: string = process.cwd()
  ) {
    this.sessionId = sessionId;
    this.pid = pid;
    this.projectRoot = projectRoot;
  }

  /**
   * Check if session process is still running
   */
  async isRunning(): Promise<boolean> {
    if (!this.process) {
      return false;
    }
    return await isProcessRunning(this.pid);
  }

  /**
   * Check if heartbeat process is running
   */
  async isHeartbeatRunning(): Promise<boolean> {
    if (!this.heartbeatProcess || !this.heartbeatProcess.pid) {
      return false;
    }
    return await isProcessRunning(this.heartbeatProcess.pid);
  }

  /**
   * Terminate session normally (SIGTERM)
   */
  async terminate(): Promise<void> {
    if (this.cleanedUp) {
      return;
    }

    this.cleanedUp = true;

    // Kill heartbeat first
    if (this.heartbeatProcess && this.heartbeatProcess.pid) {
      try {
        process.kill(this.heartbeatProcess.pid, 'SIGTERM');
        await sleep(500);
      } catch (err) {
        // Already dead
      }
    }

    // Kill main process
    if (this.process && this.pid) {
      try {
        process.kill(this.pid, 'SIGTERM');
        await sleep(500);
      } catch (err) {
        // Already dead
      }
    }

    // Force kill if still alive
    if (await this.isRunning()) {
      try {
        process.kill(this.pid, 'SIGKILL');
      } catch (err) {
        // Ignore
      }
    }
  }

  /**
   * Crash session (SIGKILL)
   */
  async crash(): Promise<void> {
    if (this.cleanedUp) {
      return;
    }

    this.cleanedUp = true;

    if (this.process && this.pid) {
      try {
        process.kill(this.pid, 'SIGKILL');
      } catch (err) {
        // Already dead
      }
    }
  }

  /**
   * Wait for heartbeat to update N times
   */
  async waitForHeartbeats(count: number, timeoutMs: number = 30000): Promise<void> {
    // This would read registry and check heartbeat updates
    // Simplified for now - just wait for time
    const waitTime = count * 5000; // 5s per heartbeat
    await sleep(Math.min(waitTime, timeoutMs));
  }
}

/**
 * Create a mock Claude Code session
 */
export async function createMockSession(
  options: MockSessionOptions = {}
): Promise<MockSession> {
  const {
    projectRoot = process.cwd(),
    sessionType = 'test-session',
    startHeartbeat = true,
    heartbeatInterval = 5000
  } = options;

  // Generate unique session ID
  const sessionId = `e2e-test-${Date.now()}-${process.pid}`;

  // Spawn a long-running process (Node.js REPL) to simulate Claude Code
  const mockProcess = spawn('node', ['-e', 'setInterval(() => {}, 1000)'], {
    detached: false,
    stdio: 'ignore'
  });

  const pid = mockProcess.pid!;

  // Wait a bit for process to start
  await sleep(200);

  // Register session in registry
  const { execSync } = require('child_process');
  execSync(
    `node dist/src/cli/register-session.js "${sessionId}" ${pid} "${sessionType}"`,
    { cwd: projectRoot, stdio: 'pipe' }
  );

  // Create mock session object
  const session = new MockSession(sessionId, pid, projectRoot);
  session.process = mockProcess;

  // Wait for session to appear in registry
  await waitForSessionInRegistry(sessionId, 5000, projectRoot);

  // Start heartbeat if requested
  if (startHeartbeat) {
    const heartbeatScript = path.join(projectRoot, 'plugins/specweave/scripts/heartbeat.sh');
    const heartbeatLog = path.join(projectRoot, '.specweave/logs', `heartbeat-${sessionId}.log`);

    const heartbeatProcess = spawn('bash', [heartbeatScript, sessionId], {
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // Redirect output to log file
    const fs = require('fs');
    const logStream = fs.createWriteStream(heartbeatLog, { flags: 'a' });
    heartbeatProcess.stdout?.pipe(logStream);
    heartbeatProcess.stderr?.pipe(logStream);

    session.heartbeatProcess = heartbeatProcess;

    // Add heartbeat PID to session
    if (heartbeatProcess.pid) {
      execSync(
        `node dist/src/cli/add-child-pid.js "${sessionId}" ${heartbeatProcess.pid}`,
        { cwd: projectRoot, stdio: 'pipe' }
      );
    }

    // Wait for heartbeat to start
    await sleep(1000);
  }

  return session;
}

/**
 * Clean up mock session
 */
export async function cleanupMockSession(session: MockSession): Promise<void> {
  await session.terminate();

  // Remove session from registry
  const { execSync } = require('child_process');
  try {
    execSync(
      `node dist/src/cli/remove-session.js "${session.sessionId}"`,
      { cwd: session['projectRoot'], stdio: 'pipe' }
    );
  } catch (err) {
    // Session may already be removed
  }
}
