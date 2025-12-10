/**
 * Lock Manager - File-based locking with staleness detection
 *
 * Provides atomic file locking using directory creation (mkdir)
 * with automatic stale lock detection and removal.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Logger, consoleLogger } from './logger.js';

const DEFAULT_STALE_THRESHOLD_SECONDS = 300; // 5 minutes
const LOCK_RETRY_DELAY_MS = 100;
const LOCK_TIMEOUT_MS = 10000; // 10 seconds

export class LockManager {
  private lockDir: string;
  private staleThresholdSeconds: number;
  private logger: Logger;

  constructor(
    lockDir: string,
    staleThresholdSeconds: number = DEFAULT_STALE_THRESHOLD_SECONDS,
    options: { logger?: Logger } = {}
  ) {
    this.lockDir = lockDir;
    this.staleThresholdSeconds = staleThresholdSeconds;
    this.logger = options.logger ?? consoleLogger;
  }

  /**
   * Acquires the lock with automatic stale lock detection
   *
   * @returns true if lock acquired, false if failed
   */
  async acquire(): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < LOCK_TIMEOUT_MS) {
      // Check if lock exists
      if (fs.existsSync(this.lockDir)) {
        // Check if lock is stale
        if (await this.isStale()) {
          this.logger.warn('Stale lock detected, removing...');
          await this.removeStale();
          continue; // Try to acquire again
        }

        // Lock is active, wait and retry
        await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_DELAY_MS));
        continue;
      }

      // Try to acquire lock
      try {
        fs.mkdirSync(this.lockDir, { recursive: false });

        // Write metadata
        const pidFile = path.join(this.lockDir, 'pid');
        const sessionFile = path.join(this.lockDir, 'session_id');

        fs.writeFileSync(pidFile, String(process.pid));
        fs.writeFileSync(sessionFile, process.env.SESSION_ID || 'unknown');

        return true;
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'EEXIST') {
          // Another process acquired the lock, retry
          continue;
        }

        this.logger.error('Failed to acquire lock:', err);
        return false;
      }
    }

    this.logger.error(`Lock acquisition timeout after ${LOCK_TIMEOUT_MS}ms`);
    return false;
  }

  /**
   * Releases the lock
   */
  async release(): Promise<void> {
    try {
      if (!fs.existsSync(this.lockDir)) {
        return;
      }

      // Remove metadata files
      const pidFile = path.join(this.lockDir, 'pid');
      const sessionFile = path.join(this.lockDir, 'session_id');

      if (fs.existsSync(pidFile)) {
        fs.unlinkSync(pidFile);
      }

      if (fs.existsSync(sessionFile)) {
        fs.unlinkSync(sessionFile);
      }

      // Remove lock directory
      fs.rmdirSync(this.lockDir);
    } catch (err) {
      this.logger.error('Failed to release lock:', err);
    }
  }

  /**
   * Checks if the lock is stale
   *
   * A lock is stale if:
   * 1. It's older than the threshold
   * 2. The PID in the lock file no longer exists
   *
   * @returns true if lock is stale
   */
  async isStale(): Promise<boolean> {
    if (!fs.existsSync(this.lockDir)) {
      return false;
    }

    try {
      // Check lock age
      const lockAge = await this.getLockAge();

      if (lockAge < this.staleThresholdSeconds) {
        return false; // Lock is fresh
      }

      // Check if PID exists
      const pidFile = path.join(this.lockDir, 'pid');

      if (!fs.existsSync(pidFile)) {
        return true; // No PID file, assume stale
      }

      const pidStr = fs.readFileSync(pidFile, 'utf-8').trim();
      const pid = parseInt(pidStr, 10);

      if (isNaN(pid)) {
        return true; // Invalid PID, assume stale
      }

      // Check if process exists
      const pidExists = await this.checkPidExists(pid);

      return !pidExists; // Stale if PID doesn't exist
    } catch (err) {
      this.logger.error('Error checking lock staleness:', err);
      return false; // Assume not stale on error
    }
  }

  /**
   * Removes a stale lock after validation
   */
  async removeStale(): Promise<void> {
    if (!(await this.isStale())) {
      this.logger.warn('Attempted to remove non-stale lock, aborting');
      return;
    }

    try {
      const pidFile = path.join(this.lockDir, 'pid');
      let pid = 'unknown';

      if (fs.existsSync(pidFile)) {
        pid = fs.readFileSync(pidFile, 'utf-8').trim();
      }

      this.logger.info(`Removing stale lock (PID: ${pid}, age: ${await this.getLockAge()}s)`);

      // Remove lock
      await this.release();

      // Log removal
      const logFile = path.join(
        path.dirname(this.lockDir),
        '..',
        'logs',
        'lock-cleanup.log'
      );
      const logDir = path.dirname(logFile);

      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const logEntry = `[${new Date().toISOString()}] Removed stale lock: ${this.lockDir} (PID: ${pid})\n`;
      fs.appendFileSync(logFile, logEntry);
    } catch (err) {
      this.logger.error('Failed to remove stale lock:', err);
    }
  }

  /**
   * Gets the age of the lock in seconds
   */
  private async getLockAge(): Promise<number> {
    if (!fs.existsSync(this.lockDir)) {
      return Infinity;
    }

    try {
      const stats = fs.statSync(this.lockDir);
      const mtimeMs = stats.mtimeMs;
      const now = Date.now();
      const ageMs = now - mtimeMs;

      return ageMs / 1000;
    } catch (err) {
      return Infinity;
    }
  }

  /**
   * Checks if a PID exists (cross-platform)
   */
  private async checkPidExists(pid: number): Promise<boolean> {
    try {
      if (process.platform === 'win32') {
        const { execSync } = await import('child_process');
        const output = execSync(`tasklist /FI "PID eq ${pid}" /NH`, {
          encoding: 'utf-8',
          stdio: ['ignore', 'pipe', 'ignore'],
        });
        return output.includes(String(pid));
      } else {
        const { execSync } = await import('child_process');
        execSync(`kill -0 ${pid}`, { stdio: 'ignore' });
        return true;
      }
    } catch {
      return false;
    }
  }
}
