/**
 * Session State Manager
 * Manages auto session state persistence and recovery
 */

import * as fs from 'fs';
import * as path from 'path';
import { AutoSession, AutoSessionStatus, CircuitBreakerStatus } from './types.js';
import { consoleLogger as logger } from '../../utils/logger.js';

const STATE_DIR = '.specweave/state';
const SESSION_FILE = 'auto-session.json';
const LOCK_FILE = 'active-session.lock';

export class SessionStateManager {
  private projectRoot: string;
  private stateDir: string;
  private sessionPath: string;
  private lockPath: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.stateDir = path.join(projectRoot, STATE_DIR);
    this.sessionPath = path.join(this.stateDir, SESSION_FILE);
    this.lockPath = path.join(this.stateDir, LOCK_FILE);
  }

  /**
   * Generate unique session ID
   */
  static generateSessionId(): string {
    const date = new Date().toISOString().split('T')[0];
    const random = Math.random().toString(36).substring(2, 8);
    return `auto-${date}-${random}`;
  }

  /**
   * Create a new auto session
   */
  createSession(options: {
    incrementQueue: string[];
    maxIterations?: number;
    maxHours?: number;
    simple?: boolean;
  }): AutoSession {
    const session: AutoSession = {
      sessionId: SessionStateManager.generateSessionId(),
      status: 'running',
      startTime: new Date().toISOString(),
      iteration: 0,
      maxIterations: options.maxIterations ?? 100,
      maxHours: options.maxHours,
      incrementQueue: options.incrementQueue,
      currentIncrement: options.incrementQueue[0] ?? null,
      completedIncrements: [],
      failedIncrements: [],
      humanGates: {
        pending: null,
        approved: [],
        blocked: [],
      },
      circuitBreakers: {
        github: { state: 'closed', failures: 0 },
        jira: { state: 'closed', failures: 0 },
        ado: { state: 'closed', failures: 0 },
      },
      lastActivity: new Date().toISOString(),
      simple: options.simple,
    };

    return session;
  }

  /**
   * Ensure state directory exists
   */
  private ensureStateDir(): void {
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
  }

  /**
   * Save session state to disk
   */
  save(session: AutoSession): boolean {
    try {
      this.ensureStateDir();
      const json = JSON.stringify(session, null, 2);
      fs.writeFileSync(this.sessionPath, json, 'utf-8');
      logger.debug(`Saved auto session: ${session.sessionId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to save auto session: ${error}`);
      return false;
    }
  }

  /**
   * Load session state from disk
   */
  load(): AutoSession | null {
    try {
      if (!fs.existsSync(this.sessionPath)) {
        return null;
      }
      const json = fs.readFileSync(this.sessionPath, 'utf-8');
      const session = JSON.parse(json) as AutoSession;
      return session;
    } catch (error) {
      logger.error(`Failed to load auto session: ${error}`);
      return null;
    }
  }

  /**
   * Check if there's an active session
   */
  hasActiveSession(): boolean {
    const session = this.load();
    return session !== null && session.status === 'running';
  }

  /**
   * Get active session or null
   */
  getActiveSession(): AutoSession | null {
    const session = this.load();
    if (session && session.status === 'running') {
      return session;
    }
    return null;
  }

  /**
   * Update session status
   */
  updateStatus(status: AutoSessionStatus, reason?: string): boolean {
    const session = this.load();
    if (!session) {
      return false;
    }

    session.status = status;
    session.lastActivity = new Date().toISOString();

    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      session.endTime = new Date().toISOString();
      session.endReason = reason;
    }

    return this.save(session);
  }

  /**
   * Increment iteration counter
   */
  incrementIteration(): number {
    const session = this.load();
    if (!session) {
      return -1;
    }

    session.iteration += 1;
    session.lastActivity = new Date().toISOString();
    this.save(session);

    return session.iteration;
  }

  /**
   * Check if max iterations reached
   */
  isMaxIterationsReached(): boolean {
    const session = this.load();
    if (!session) {
      return false;
    }
    return session.iteration >= session.maxIterations;
  }

  /**
   * Check if max hours exceeded
   */
  isMaxHoursExceeded(): boolean {
    const session = this.load();
    if (!session || !session.maxHours) {
      return false;
    }

    const startTime = new Date(session.startTime);
    const now = new Date();
    const hoursElapsed = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);

    return hoursElapsed >= session.maxHours;
  }

  /**
   * Move to next increment in queue
   */
  moveToNextIncrement(): string | null {
    const session = this.load();
    if (!session) {
      return null;
    }

    // Mark current as completed
    if (session.currentIncrement) {
      session.completedIncrements.push(session.currentIncrement);
      session.incrementQueue = session.incrementQueue.filter(
        (id) => id !== session.currentIncrement
      );
    }

    // Get next increment
    session.currentIncrement = session.incrementQueue[0] ?? null;
    session.lastActivity = new Date().toISOString();

    this.save(session);
    return session.currentIncrement;
  }

  /**
   * Mark current increment as failed
   */
  markIncrementFailed(reason?: string): void {
    const session = this.load();
    if (!session || !session.currentIncrement) {
      return;
    }

    session.failedIncrements.push(session.currentIncrement);
    session.incrementQueue = session.incrementQueue.filter(
      (id) => id !== session.currentIncrement
    );
    session.currentIncrement = session.incrementQueue[0] ?? null;
    session.lastActivity = new Date().toISOString();

    this.save(session);
  }

  /**
   * Update circuit breaker status
   */
  updateCircuitBreaker(service: string, status: CircuitBreakerStatus): void {
    const session = this.load();
    if (!session) {
      return;
    }

    session.circuitBreakers[service] = status;
    session.lastActivity = new Date().toISOString();
    this.save(session);
  }

  /**
   * Acquire session lock
   */
  acquireLock(): boolean {
    try {
      this.ensureStateDir();

      // Check for existing lock
      if (fs.existsSync(this.lockPath)) {
        const lockData = fs.readFileSync(this.lockPath, 'utf-8');
        const lockInfo = JSON.parse(lockData);

        // Check if lock is stale (> 30 minutes old)
        const lockTime = new Date(lockInfo.timestamp);
        const now = new Date();
        const minutesElapsed = (now.getTime() - lockTime.getTime()) / (1000 * 60);

        if (minutesElapsed < 30) {
          logger.warn(`Session lock held by ${lockInfo.sessionId} (${Math.round(minutesElapsed)} min ago)`);
          return false;
        }

        // Stale lock - remove it
        logger.info(`Removing stale session lock from ${lockInfo.sessionId}`);
      }

      // Create new lock
      const session = this.load();
      const lockData = {
        sessionId: session?.sessionId ?? 'unknown',
        timestamp: new Date().toISOString(),
        pid: process.pid,
      };
      fs.writeFileSync(this.lockPath, JSON.stringify(lockData, null, 2), 'utf-8');
      return true;
    } catch (error) {
      logger.error(`Failed to acquire session lock: ${error}`);
      return false;
    }
  }

  /**
   * Release session lock
   */
  releaseLock(): void {
    try {
      if (fs.existsSync(this.lockPath)) {
        fs.unlinkSync(this.lockPath);
      }
    } catch (error) {
      logger.error(`Failed to release session lock: ${error}`);
    }
  }

  /**
   * Check if session lock exists
   */
  isLocked(): boolean {
    return fs.existsSync(this.lockPath);
  }

  /**
   * Get lock info
   */
  getLockInfo(): { sessionId: string; timestamp: string; pid: number } | null {
    try {
      if (!fs.existsSync(this.lockPath)) {
        return null;
      }
      const lockData = fs.readFileSync(this.lockPath, 'utf-8');
      return JSON.parse(lockData);
    } catch {
      return null;
    }
  }

  /**
   * Delete session state (cleanup)
   */
  delete(): void {
    try {
      if (fs.existsSync(this.sessionPath)) {
        fs.unlinkSync(this.sessionPath);
      }
      this.releaseLock();
    } catch (error) {
      logger.error(`Failed to delete session state: ${error}`);
    }
  }
}
