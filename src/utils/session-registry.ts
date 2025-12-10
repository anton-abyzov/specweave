/**
 * Session Registry - Central tracking for all Claude Code sessions and child processes
 *
 * Provides atomic file-based operations for tracking active sessions, detecting
 * stale/zombie processes, and coordinating cleanup across multiple sessions.
 *
 * Key Features:
 * - Atomic operations using temp file + rename pattern
 * - File locking via mkdir (cross-platform atomic operation)
 * - Automatic corruption recovery with JSON validation
 * - Concurrent-safe updates from multiple processes
 *
 * Registry Location: `.specweave/state/.session-registry.json`
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  SessionInfo,
  SessionRegistry as ISessionRegistry,
  RegisterSessionOptions,
  StaleSessionInfo,
  SessionStatus,
} from '../types/session.js';
import { Logger, consoleLogger } from './logger.js';

const REGISTRY_FILENAME = '.session-registry.json';
const LOCK_TIMEOUT_MS = 5000; // 5 seconds max wait for lock
const LOCK_CHECK_INTERVAL_MS = 50; // Check lock every 50ms
const REGISTRY_VERSION = '1.0.0';

export class SessionRegistry {
  private registryPath: string;
  private lockPath: string;
  private logger: Logger;

  constructor(projectRoot: string, options: { logger?: Logger } = {}) {
    this.logger = options.logger ?? consoleLogger;

    const stateDir = path.join(projectRoot, '.specweave', 'state');

    // Ensure state directory exists
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }

    this.registryPath = path.join(stateDir, REGISTRY_FILENAME);
    this.lockPath = path.join(stateDir, `${REGISTRY_FILENAME}.lock`);
  }

  /**
   * Acquires an exclusive lock on the registry file
   *
   * Uses mkdir as an atomic operation (works cross-platform)
   * Waits up to LOCK_TIMEOUT_MS before failing
   *
   * @returns true if lock acquired, false if timeout
   */
  private async acquireLock(): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < LOCK_TIMEOUT_MS) {
      try {
        // mkdir is atomic on all platforms
        fs.mkdirSync(this.lockPath, { recursive: false });

        // Write our PID to lock directory for debugging
        const lockPidFile = path.join(this.lockPath, 'pid');
        fs.writeFileSync(lockPidFile, String(process.pid));

        return true;
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'EEXIST') {
          this.logger.error('Failed to acquire lock:', err);
          return false;
        }

        // Lock exists, wait and retry
        await new Promise((resolve) => setTimeout(resolve, LOCK_CHECK_INTERVAL_MS));
      }
    }

    this.logger.error(`Lock acquisition timeout after ${LOCK_TIMEOUT_MS}ms`);
    return false;
  }

  /**
   * Releases the lock on the registry file
   */
  private releaseLock(): void {
    try {
      // Remove PID file first
      const lockPidFile = path.join(this.lockPath, 'pid');
      if (fs.existsSync(lockPidFile)) {
        fs.unlinkSync(lockPidFile);
      }

      // Remove lock directory
      fs.rmdirSync(this.lockPath);
    } catch (err) {
      this.logger.error('Failed to release lock:', err);
    }
  }

  /**
   * Reads the registry file with corruption recovery
   *
   * If registry doesn't exist, creates a new empty one
   * If registry is corrupted (invalid JSON), creates backup and reinitializes
   *
   * @returns The current registry state
   */
  private readRegistry(): ISessionRegistry {
    // If registry doesn't exist, create empty one
    if (!fs.existsSync(this.registryPath)) {
      return this.createEmptyRegistry();
    }

    try {
      const content = fs.readFileSync(this.registryPath, 'utf-8');
      const registry = JSON.parse(content) as ISessionRegistry;

      // Validate basic structure
      if (!registry.sessions || typeof registry.sessions !== 'object') {
        throw new Error('Invalid registry structure: missing sessions object');
      }

      if (!registry.version) {
        // Migrate old registry without version
        registry.version = REGISTRY_VERSION;
      }

      return registry;
    } catch (err) {
      this.logger.error('Registry corrupted, creating backup and reinitializing:', err);

      // Backup corrupted registry
      const backupPath = `${this.registryPath}.corrupted.${Date.now()}`;
      try {
        fs.copyFileSync(this.registryPath, backupPath);
        this.logger.info(`Corrupted registry backed up to: ${backupPath}`);
      } catch (backupErr) {
        this.logger.error('Failed to backup corrupted registry:', backupErr);
      }

      // Create new empty registry
      return this.createEmptyRegistry();
    }
  }

  /**
   * Writes registry to disk atomically
   *
   * Uses temp file + rename pattern for atomic write
   * This ensures registry is never left in a corrupted state
   *
   * @param registry - The registry state to write
   */
  private writeRegistry(registry: ISessionRegistry): void {
    const tempPath = `${this.registryPath}.tmp.${process.pid}`;

    try {
      // Write to temp file with pretty formatting
      fs.writeFileSync(tempPath, JSON.stringify(registry, null, 2), 'utf-8');

      // Atomic rename (overwrites existing file)
      fs.renameSync(tempPath, this.registryPath);
    } catch (err) {
      this.logger.error('Failed to write registry:', err);

      // Clean up temp file if it exists
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch (cleanupErr) {
          // Ignore cleanup errors
        }
      }

      throw err;
    }
  }

  /**
   * Creates a new empty registry
   */
  private createEmptyRegistry(): ISessionRegistry {
    return {
      sessions: {},
      last_cleanup: new Date().toISOString(),
      version: REGISTRY_VERSION,
    };
  }

  /**
   * Registers a new session in the registry
   *
   * @param sessionId - Unique session identifier
   * @param pid - Process ID of the session
   * @param options - Optional configuration
   * @returns true if registration successful
   */
  async registerSession(
    sessionId: string,
    pid: number,
    options: RegisterSessionOptions = {}
  ): Promise<boolean> {
    const lockAcquired = await this.acquireLock();
    if (!lockAcquired) {
      this.logger.error('Failed to acquire lock for session registration');
      return false;
    }

    try {
      const registry = this.readRegistry();
      const now = new Date().toISOString();

      // Check if session already exists
      if (registry.sessions[sessionId]) {
        this.logger.warn(`Session ${sessionId} already registered, updating...`);
      }

      // Create session entry
      const sessionInfo: SessionInfo = {
        session_id: sessionId,
        pid,
        type: options.type ?? 'claude-code',
        start_time: now,
        last_heartbeat: now,
        status: 'active',
        child_pids: [],
        parent_session: options.parent_session,
        metadata: options.metadata,
      };

      registry.sessions[sessionId] = sessionInfo;
      this.writeRegistry(registry);

      this.logger.info(`Registered session: ${sessionId} (PID: ${pid})`);
      return true;
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Updates the heartbeat timestamp for a session
   *
   * @param sessionId - Session to update
   * @returns true if update successful
   */
  async updateHeartbeat(sessionId: string): Promise<boolean> {
    const lockAcquired = await this.acquireLock();
    if (!lockAcquired) {
      return false;
    }

    try {
      const registry = this.readRegistry();
      const session = registry.sessions[sessionId];

      if (!session) {
        this.logger.error(`Session not found: ${sessionId}`);
        return false;
      }

      session.last_heartbeat = new Date().toISOString();
      session.status = 'active'; // Reset to active on heartbeat

      this.writeRegistry(registry);
      return true;
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Adds a child process PID to a session
   *
   * @param sessionId - Parent session ID
   * @param childPid - Child process PID to add
   * @returns true if successful
   */
  async addChildProcess(sessionId: string, childPid: number): Promise<boolean> {
    const lockAcquired = await this.acquireLock();
    if (!lockAcquired) {
      return false;
    }

    try {
      const registry = this.readRegistry();
      const session = registry.sessions[sessionId];

      if (!session) {
        this.logger.error(`Session not found: ${sessionId}`);
        return false;
      }

      if (!session.child_pids) {
        session.child_pids = [];
      }

      // Avoid duplicates
      if (!session.child_pids.includes(childPid)) {
        session.child_pids.push(childPid);
        this.writeRegistry(registry);
        this.logger.info(`Added child PID ${childPid} to session ${sessionId}`);
      }

      return true;
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Removes a session from the registry
   *
   * @param sessionId - Session to remove
   * @returns true if successful
   */
  async removeSession(sessionId: string): Promise<boolean> {
    const lockAcquired = await this.acquireLock();
    if (!lockAcquired) {
      return false;
    }

    try {
      const registry = this.readRegistry();

      if (!registry.sessions[sessionId]) {
        this.logger.warn(`Session not found for removal: ${sessionId}`);
        return false;
      }

      delete registry.sessions[sessionId];
      this.writeRegistry(registry);

      this.logger.info(`Removed session: ${sessionId}`);
      return true;
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Gets a session by ID
   *
   * @param sessionId - Session to retrieve
   * @returns Session info or undefined
   */
  async getSession(sessionId: string): Promise<SessionInfo | undefined> {
    const lockAcquired = await this.acquireLock();
    if (!lockAcquired) {
      return undefined;
    }

    try {
      const registry = this.readRegistry();
      return registry.sessions[sessionId];
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Gets all sessions
   *
   * @returns Array of all session info
   */
  async getAllSessions(): Promise<SessionInfo[]> {
    const lockAcquired = await this.acquireLock();
    if (!lockAcquired) {
      return [];
    }

    try {
      const registry = this.readRegistry();
      return Object.values(registry.sessions);
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Updates the status of a session
   *
   * @param sessionId - Session to update
   * @param status - New status
   * @returns true if successful
   */
  async updateStatus(sessionId: string, status: SessionStatus): Promise<boolean> {
    const lockAcquired = await this.acquireLock();
    if (!lockAcquired) {
      return false;
    }

    try {
      const registry = this.readRegistry();
      const session = registry.sessions[sessionId];

      if (!session) {
        this.logger.error(`Session not found: ${sessionId}`);
        return false;
      }

      session.status = status;
      this.writeRegistry(registry);

      return true;
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Gets all stale sessions based on heartbeat threshold
   *
   * A session is considered stale if its last_heartbeat is older than
   * the specified threshold.
   *
   * @param thresholdSeconds - Max age of last heartbeat before considered stale
   * @returns Array of stale session info with staleness details
   */
  async getStaleSessions(thresholdSeconds: number): Promise<StaleSessionInfo[]> {
    const lockAcquired = await this.acquireLock();
    if (!lockAcquired) {
      return [];
    }

    try {
      const registry = this.readRegistry();
      const now = Date.now();
      const staleSessions: StaleSessionInfo[] = [];

      for (const session of Object.values(registry.sessions)) {
        const lastHeartbeat = new Date(session.last_heartbeat).getTime();
        const ageSec = (now - lastHeartbeat) / 1000;

        if (ageSec > thresholdSeconds) {
          // Check if PID still exists (cross-platform)
          const pidExists = await this.checkPidExists(session.pid);

          staleSessions.push({
            session,
            stale_duration_seconds: ageSec,
            pid_exists: pidExists,
          });

          // Mark session as stale
          session.status = 'stale';
        }
      }

      // Update registry with stale statuses
      if (staleSessions.length > 0) {
        this.writeRegistry(registry);
      }

      return staleSessions;
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Cleans up old sessions based on retention period
   *
   * Removes sessions that have been completed or stale for longer
   * than the retention period.
   *
   * @param retentionHours - How long to keep old sessions (in hours)
   * @returns Number of sessions removed
   */
  async cleanupOldSessions(retentionHours: number): Promise<number> {
    const lockAcquired = await this.acquireLock();
    if (!lockAcquired) {
      return 0;
    }

    try {
      const registry = this.readRegistry();
      const now = Date.now();
      const retentionMs = retentionHours * 60 * 60 * 1000;
      const sessionsToRemove: string[] = [];

      for (const [sessionId, session] of Object.entries(registry.sessions)) {
        // Only clean up completed or stale sessions
        if (session.status !== 'completed' && session.status !== 'stale') {
          continue;
        }

        // Check age based on last_heartbeat
        const lastActivity = new Date(session.last_heartbeat).getTime();
        const ageMs = now - lastActivity;

        if (ageMs > retentionMs) {
          sessionsToRemove.push(sessionId);
        }
      }

      // Remove old sessions
      for (const sessionId of sessionsToRemove) {
        delete registry.sessions[sessionId];
        this.logger.info(
          `Cleaned up old session: ${sessionId} (age: ${Math.floor((now - new Date(registry.sessions[sessionId]?.last_heartbeat || now).getTime()) / 3600000)}h)`
        );
      }

      // Update last_cleanup timestamp
      registry.last_cleanup = new Date().toISOString();

      if (sessionsToRemove.length > 0) {
        this.writeRegistry(registry);
      }

      return sessionsToRemove.length;
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Checks if a PID exists (cross-platform)
   *
   * Uses kill -0 on Unix-like systems, which doesn't actually send a signal
   * but checks if the process exists.
   *
   * @param pid - Process ID to check
   * @returns true if process exists
   */
  private async checkPidExists(pid: number): Promise<boolean> {
    try {
      // On Unix-like systems (macOS, Linux), kill -0 checks process existence
      // without actually sending a signal
      if (process.platform === 'win32') {
        // Windows: use tasklist
        const { execSync } = await import('child_process');
        const output = execSync(`tasklist /FI "PID eq ${pid}" /NH`, {
          encoding: 'utf-8',
          stdio: ['ignore', 'pipe', 'ignore'],
        });
        return output.includes(String(pid));
      } else {
        // Unix-like (macOS, Linux)
        const { execSync } = await import('child_process');
        execSync(`kill -0 ${pid}`, { stdio: 'ignore' });
        return true;
      }
    } catch {
      // Process doesn't exist or we don't have permission
      return false;
    }
  }
}
