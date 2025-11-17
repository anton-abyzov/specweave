/**
 * Auto-Transition Manager
 *
 * Automatically transitions increment status based on lifecycle events:
 * - spec.md created → BACKLOG → PLANNING
 * - tasks.md created → PLANNING/BACKLOG → ACTIVE
 * - first task started → PLANNING → ACTIVE
 *
 * Part of increment 0039: Ultra-Smart Next Command
 */

import { IncrementStatus, validateTransition } from '../types/increment-metadata.js';
import { MetadataManager } from './metadata-manager.js';
import * as fs from 'fs';
import * as path from 'path';

export interface TransitionEvent {
  incrementId: string;
  from: IncrementStatus;
  to: IncrementStatus;
  trigger: 'spec-created' | 'tasks-created' | 'task-started' | 'auto-correct';
  timestamp: string;
}

export interface AutoTransitionResult {
  transitioned: boolean;
  from?: IncrementStatus;
  to?: IncrementStatus;
  reason: string;
}

/**
 * Manages automatic status transitions based on increment artifacts
 */
export class AutoTransitionManager {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    // Note: MetadataManager uses process.cwd() internally
    // In production, this manager should be instantiated from the project root
    // In tests, we use integration tests with real file system
  }

  /**
   * Handle spec.md creation event
   * BACKLOG → PLANNING
   */
  async handleSpecCreated(incrementId: string): Promise<AutoTransitionResult> {
    try {
      const metadata = MetadataManager.read(incrementId);

      // Only transition from BACKLOG to PLANNING
      if (metadata.status === IncrementStatus.BACKLOG) {
        validateTransition(metadata.status, IncrementStatus.PLANNING);

        MetadataManager.updateStatus(incrementId, IncrementStatus.PLANNING);

        return {
          transitioned: true,
          from: IncrementStatus.BACKLOG,
          to: IncrementStatus.PLANNING,
          reason: 'spec.md created - planning phase started'
        };
      }

      return {
        transitioned: false,
        reason: `Already in ${metadata.status} - no transition needed`
      };
    } catch (error) {
      return {
        transitioned: false,
        reason: `Error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Handle tasks.md creation event
   * PLANNING/BACKLOG → ACTIVE
   */
  async handleTasksCreated(incrementId: string): Promise<AutoTransitionResult> {
    try {
      const metadata = MetadataManager.read(incrementId);

      // Transition to ACTIVE from PLANNING or BACKLOG
      if (metadata.status === IncrementStatus.PLANNING || metadata.status === IncrementStatus.BACKLOG) {
        const from = metadata.status;
        validateTransition(from, IncrementStatus.ACTIVE);

        MetadataManager.updateStatus(incrementId, IncrementStatus.ACTIVE);

        return {
          transitioned: true,
          from,
          to: IncrementStatus.ACTIVE,
          reason: 'tasks.md created - execution phase started'
        };
      }

      return {
        transitioned: false,
        reason: `Already in ${metadata.status} - no transition needed`
      };
    } catch (error) {
      return {
        transitioned: false,
        reason: `Error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Handle first task started event
   * PLANNING → ACTIVE
   */
  async handleTaskStarted(incrementId: string): Promise<AutoTransitionResult> {
    try {
      const metadata = MetadataManager.read(incrementId);

      // Force transition to ACTIVE if still in PLANNING
      if (metadata.status === IncrementStatus.PLANNING) {
        validateTransition(metadata.status, IncrementStatus.ACTIVE);

        MetadataManager.updateStatus(incrementId, IncrementStatus.ACTIVE);

        return {
          transitioned: true,
          from: IncrementStatus.PLANNING,
          to: IncrementStatus.ACTIVE,
          reason: 'task execution started - moved to active'
        };
      }

      return {
        transitioned: false,
        reason: `Already in ${metadata.status} - no transition needed`
      };
    } catch (error) {
      return {
        transitioned: false,
        reason: `Error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Detect increment phase based on artifacts (spec.md, plan.md, tasks.md)
   */
  async detectPhase(incrementId: string): Promise<IncrementStatus> {
    const incrementPath = path.join(this.projectRoot, '.specweave/increments', incrementId);

    const hasSpec = fs.existsSync(path.join(incrementPath, 'spec.md'));
    const hasPlan = fs.existsSync(path.join(incrementPath, 'plan.md'));
    const hasTasks = fs.existsSync(path.join(incrementPath, 'tasks.md'));

    // Artifact-based phase detection
    if (hasTasks) {
      return IncrementStatus.ACTIVE;  // Tasks exist → execution phase
    } else if (hasSpec || hasPlan) {
      return IncrementStatus.PLANNING;  // Spec/plan exist → planning phase
    } else {
      return IncrementStatus.BACKLOG;  // Nothing exists → backlog
    }
  }

  /**
   * Auto-correct status based on artifacts
   * Useful for fixing increments with invalid "planned"/"planning" statuses
   */
  async autoCorrect(incrementId: string, force: boolean = false): Promise<AutoTransitionResult> {
    try {
      const metadata = MetadataManager.read(incrementId);
      const detectedPhase = await this.detectPhase(incrementId);

      // Check for status mismatch
      if (metadata.status !== detectedPhase) {
        // Validate transition is allowed
        try {
          validateTransition(metadata.status, detectedPhase);
        } catch (error) {
          if (!force) {
            return {
              transitioned: false,
              reason: `Cannot auto-correct: ${error instanceof Error ? error.message : String(error)}`
            };
          }
          // Force mode: skip validation
        }

        const from = metadata.status;
        MetadataManager.updateStatus(incrementId, detectedPhase);

        return {
          transitioned: true,
          from,
          to: detectedPhase,
          reason: `Auto-corrected based on artifacts (${force ? 'forced' : 'validated'})`
        };
      }

      return {
        transitioned: false,
        reason: `Status already correct (${metadata.status})`
      };
    } catch (error) {
      return {
        transitioned: false,
        reason: `Error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Get transition event for logging
   */
  createTransitionEvent(
    incrementId: string,
    from: IncrementStatus,
    to: IncrementStatus,
    trigger: TransitionEvent['trigger']
  ): TransitionEvent {
    return {
      incrementId,
      from,
      to,
      trigger,
      timestamp: new Date().toISOString()
    };
  }
}
