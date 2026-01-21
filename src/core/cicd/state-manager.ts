/**
 * CI/CD Monitor State Manager
 *
 * Manages persistent state for workflow monitoring, failure detection,
 * and deduplication. Uses file-based storage with locking to prevent
 * concurrent write corruption.
 */

import * as fs from '../../utils/fs-native.js';
import * as path from 'path';
import {
  CICDMonitorState,
  DEFAULT_STATE,
  FailureRecord,
  IStateManager
} from './types.js';

/**
 * State file path (relative to project root)
 */
const STATE_FILE = '.specweave/state/cicd-monitor.json';

/**
 * Lock file path (prevents concurrent writes)
 */
const LOCK_FILE = '.specweave/state/cicd-monitor.lock';

/**
 * Lock timeout (milliseconds)
 */
const LOCK_TIMEOUT = 5000;

/**
 * StateManager - Manages CI/CD monitor persistent state
 *
 * Features:
 * - File-based JSON storage
 * - File locking to prevent corruption
 * - Automatic directory creation
 * - State migration support
 * - Deduplication tracking
 */
export class StateManager implements IStateManager {
  private statePath: string;
  private lockPath: string;

  /**
   * Create state manager
   *
   * @param rootDir - Project root directory (defaults to cwd)
   */
  constructor(rootDir: string = process.cwd()) {
    this.statePath = path.join(rootDir, STATE_FILE);
    this.lockPath = path.join(rootDir, LOCK_FILE);
  }

  /**
   * Load state from disk (read-only, no locking)
   *
   * @returns Current state (or default if file doesn't exist/invalid)
   */
  async loadState(): Promise<CICDMonitorState> {
    try {
      await fs.ensureDir(path.dirname(this.statePath));

      if (!(await fs.pathExists(this.statePath))) {
        return { ...DEFAULT_STATE };
      }

      const content = await fs.readFile(this.statePath, 'utf-8');
      const state = JSON.parse(content) as CICDMonitorState;

      if (!state.failures || !state.version) {
        console.warn('Invalid state file, resetting to default');
        return { ...DEFAULT_STATE };
      }

      return state;
    } catch (error) {
      console.error('Error loading state:', error);
      return { ...DEFAULT_STATE };
    }
  }

  /**
   * Save state to disk with file locking
   *
   * @param state - State to save
   */
  async saveState(state: CICDMonitorState): Promise<void> {
    await this.acquireLock();
    try {
      await this.writeState(state);
    } finally {
      await this.releaseLock();
    }
  }

  /**
   * Write state to disk (internal, assumes lock is held)
   */
  private async writeState(state: CICDMonitorState): Promise<void> {
    await fs.ensureDir(path.dirname(this.statePath));
    const tempPath = `${this.statePath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(state, null, 2), 'utf-8');
    await fs.rename(tempPath, this.statePath);
  }

  /**
   * Mark failure as processed (deduplication)
   *
   * @param runId - Workflow run ID
   */
  async markProcessed(runId: number): Promise<void> {
    const state = await this.loadState();

    if (state.failures[runId]) {
      state.failures[runId].processed = true;
      state.totalProcessed++;
      await this.saveState(state);
    }
  }

  /**
   * Get last poll timestamp
   *
   * @returns ISO 8601 timestamp or null
   */
  async getLastPoll(): Promise<string | null> {
    const state = await this.loadState();
    return state.lastPoll;
  }

  /**
   * Update last poll timestamp to now
   */
  async updateLastPoll(): Promise<void> {
    const state = await this.loadState();
    state.lastPoll = new Date().toISOString();
    await this.saveState(state);
  }

  /**
   * Add failure record
   *
   * @param failure - Failure record to add
   */
  async addFailure(failure: FailureRecord): Promise<void> {
    await this.acquireLock();
    try {
      const state = await this.loadState();

      if (state.failures[failure.runId]) {
        console.log(`Failure ${failure.runId} already tracked, skipping`);
        return;
      }

      state.failures[failure.runId] = failure;
      state.totalFailures++;
      await this.writeState(state);
    } finally {
      await this.releaseLock();
    }
  }

  /**
   * Get all unprocessed failures
   *
   * @returns Array of unprocessed failure records
   */
  async getUnprocessedFailures(): Promise<FailureRecord[]> {
    const state = await this.loadState();

    return Object.values(state.failures).filter(
      (failure) => !failure.processed
    );
  }

  /**
   * Acquire file lock (with timeout)
   *
   * Prevents concurrent writes from corrupting state file.
   */
  private async acquireLock(): Promise<void> {
    const startTime = Date.now();

    // Ensure directory exists before acquiring lock
    await fs.ensureDir(path.dirname(this.lockPath));

    while (true) {
      try {
        // Try to create lock file (exclusive)
        await fs.writeFile(this.lockPath, process.pid.toString(), {
          flag: 'wx'
        });

        // Lock acquired!
        return;
      } catch (error: any) {
        // Lock file already exists
        if (error.code === 'EEXIST') {
          // Check for timeout
          if (Date.now() - startTime > LOCK_TIMEOUT) {
            // Force release stale lock
            console.warn('Lock timeout, forcing release');
            await this.releaseLock();
            continue;
          }

          // Wait and retry
          await new Promise((resolve) => setTimeout(resolve, 50));
          continue;
        }

        // Other error
        throw error;
      }
    }
  }

  /**
   * Release file lock
   */
  private async releaseLock(): Promise<void> {
    try {
      await fs.remove(this.lockPath);
    } catch (error) {
      // Ignore errors (lock file might not exist)
    }
  }
}
