/**
 * State Manager - Workflow state tracking and checkpointing
 *
 * Manages workflow state, checkpoints, and recovery for autonomous execution.
 *
 * Part of increment 0039: Ultra-Smart Next Command
 *
 * @module core/workflow/state-manager
 * @since v0.22.0
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { WorkflowPhase } from './types.js';

/**
 * Checkpoint - Saved workflow state
 */
export interface Checkpoint {
  /** Unique checkpoint ID */
  id: string;
  /** Timestamp */
  timestamp: number;
  /** Increment ID */
  incrementId: string;
  /** Current workflow phase */
  phase: WorkflowPhase;
  /** Iteration count */
  iteration: number;
  /** Actions taken */
  actions: string[];
  /** Last successful action */
  lastAction?: string;
  /** Custom metadata */
  metadata?: Record<string, any>;
}

/**
 * State transition record
 */
export interface StateTransition {
  /** From phase */
  from: WorkflowPhase;
  /** To phase */
  to: WorkflowPhase;
  /** Timestamp */
  timestamp: number;
  /** Action that caused transition */
  action: string;
  /** Success flag */
  success: boolean;
}

/**
 * State Manager - Track workflow state and checkpoints
 */
export class StateManager {
  private checkpointDir: string;
  private maxCheckpoints: number;

  constructor(checkpointDir?: string, maxCheckpoints: number = 10) {
    this.checkpointDir = checkpointDir || '.specweave/checkpoints';
    this.maxCheckpoints = maxCheckpoints;
  }

  /**
   * Save checkpoint
   *
   * @param checkpoint - Checkpoint data
   */
  async saveCheckpoint(checkpoint: Checkpoint): Promise<void> {
    await fs.ensureDir(this.checkpointDir);

    const checkpointPath = path.join(
      this.checkpointDir,
      `${checkpoint.incrementId}-${checkpoint.id}.json`
    );

    await fs.writeJson(checkpointPath, checkpoint, { spaces: 2 });

    // Cleanup old checkpoints
    await this.cleanupOldCheckpoints(checkpoint.incrementId);
  }

  /**
   * Load checkpoints for increment
   *
   * @param incrementId - Increment ID
   * @returns Array of checkpoints (sorted by timestamp, newest first)
   */
  async loadCheckpoints(incrementId: string): Promise<Checkpoint[]> {
    if (!await fs.pathExists(this.checkpointDir)) {
      return [];
    }

    const files = await fs.readdir(this.checkpointDir);
    const checkpointFiles = files.filter(f =>
      f.startsWith(`${incrementId}-`) && f.endsWith('.json')
    );

    const checkpoints: Checkpoint[] = [];
    for (const file of checkpointFiles) {
      try {
        const checkpoint = await fs.readJson(path.join(this.checkpointDir, file));
        checkpoints.push(checkpoint);
      } catch (error) {
        // Skip corrupted checkpoints
        console.warn(`Failed to load checkpoint ${file}:`, error);
      }
    }

    // Sort by timestamp (newest first)
    return checkpoints.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get latest checkpoint for increment
   *
   * @param incrementId - Increment ID
   * @returns Latest checkpoint or null
   */
  async getLatestCheckpoint(incrementId: string): Promise<Checkpoint | null> {
    const checkpoints = await this.loadCheckpoints(incrementId);
    return checkpoints[0] || null;
  }

  /**
   * Delete checkpoint
   *
   * @param incrementId - Increment ID
   * @param checkpointId - Checkpoint ID
   */
  async deleteCheckpoint(incrementId: string, checkpointId: string): Promise<void> {
    const checkpointPath = path.join(
      this.checkpointDir,
      `${incrementId}-${checkpointId}.json`
    );

    if (await fs.pathExists(checkpointPath)) {
      await fs.remove(checkpointPath);
    }
  }

  /**
   * Cleanup old checkpoints (keep only N most recent)
   *
   * @param incrementId - Increment ID
   */
  private async cleanupOldCheckpoints(incrementId: string): Promise<void> {
    const checkpoints = await this.loadCheckpoints(incrementId);

    if (checkpoints.length > this.maxCheckpoints) {
      const toDelete = checkpoints.slice(this.maxCheckpoints);

      for (const checkpoint of toDelete) {
        await this.deleteCheckpoint(incrementId, checkpoint.id);
      }
    }
  }

  /**
   * Detect infinite loop in phase history
   *
   * Checks if the same phase has been visited too many times in a row.
   *
   * @param phaseHistory - Recent phase history
   * @param threshold - Max same-phase repetitions (default: 3)
   * @returns True if loop detected
   */
  detectLoop(phaseHistory: WorkflowPhase[], threshold: number = 3): boolean {
    if (phaseHistory.length < threshold) {
      return false;
    }

    // Check if last N phases are all the same
    const recentPhases = phaseHistory.slice(-threshold);
    const uniquePhases = new Set(recentPhases);

    return uniquePhases.size === 1;
  }

  /**
   * Record state transition
   *
   * (For now, this is a no-op - will be used for analytics/debugging)
   *
   * @param transition - State transition record
   */
  recordTransition(transition: StateTransition): void {
    // TODO: Implement transition logging
    // For now, just log to console
    console.log(`State transition: ${transition.from} → ${transition.to} (${transition.action})`);
  }
}
