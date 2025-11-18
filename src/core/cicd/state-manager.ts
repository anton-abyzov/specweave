/**
 * CI/CD Monitor State Manager
 *
 * Manages persistent state for workflow monitoring, failure detection,
 * and deduplication. Uses file-based storage with locking to prevent
 * concurrent write corruption.
 */

import * as fs from 'fs-extra';
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
   * Load state from disk
   *
   * @returns Current state (or default if file doesn't exist)
   */
  async loadState(): Promise<CICDMonitorState> {
    try {
      // Ensure directory exists
      await fs.ensureDir(path.dirname(this.statePath));

      // Check if state file exists
      if (!(await fs.pathExists(this.statePath))) {
        // Initialize with default state
        await this.saveState(DEFAULT_STATE);
        return { ...DEFAULT_STATE };
      }

      // Read and parse state
      const content = await fs.readFile(this.statePath, 'utf-8');
      const state = JSON.parse(content) as CICDMonitorState;

      // Validate state structure
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
    // Acquire lock
    await this.acquireLock();

    try {
      await this.saveStateWithoutLock(state);
    } finally {
      // Always release lock
      await this.releaseLock();
    }
  }

  /**
   * Load state without acquiring lock (for internal use when lock already held)
   */
  private async loadStateWithoutLock(): Promise<CICDMonitorState> {
    try {
      // Ensure directory exists
      await fs.ensureDir(path.dirname(this.statePath));

      // Check if state file exists
      if (!(await fs.pathExists(this.statePath))) {
        // Return default state (don't save yet)
        return { ...DEFAULT_STATE };
      }

      // Read and parse state
      const content = await fs.readFile(this.statePath, 'utf-8');
      const state = JSON.parse(content) as CICDMonitorState;

      // Validate state structure
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
   * Save state without acquiring lock (for internal use when lock already held)
   */
  private async saveStateWithoutLock(state: CICDMonitorState): Promise<void> {
    // Ensure directory exists
    await fs.ensureDir(path.dirname(this.statePath));

    // Write state atomically (write to temp, then rename)
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
    // Acquire lock for entire read-modify-write operation
    await this.acquireLock();

    try {
      // Load state (without acquiring lock again since we already have it)
      const state = await this.loadStateWithoutLock();

      // Check for duplicate
      if (state.failures[failure.runId]) {
        console.log(`Failure ${failure.runId} already tracked, skipping`);
        return;
      }

      // Add failure
      state.failures[failure.runId] = failure;
      state.totalFailures++;

      // Save state (without acquiring lock again since we already have it)
      await this.saveStateWithoutLock(state);
    } finally {
      // Always release lock
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
