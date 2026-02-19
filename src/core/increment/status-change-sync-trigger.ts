/**
 * Status Change Sync Trigger
 *
 * Automatically triggers living docs and GitHub sync when increment status changes.
 *
 * WHY THIS EXISTS:
 * - Users expect GitHub issues to update automatically when work starts/completes
 * - Manual `/sw:sync-progress` is friction
 * - Task completion hook only fires on task changes, not status changes
 *
 * SAFETY GUARDS:
 * - Non-blocking: Uses setTimeout to prevent blocking updateStatus()
 * - Circuit breaker: Prevents sync storms when GitHub is down
 * - Error isolation: Sync failures don't crash status updates
 * - Selective: Only syncs for meaningful transitions
 *
 * ARCHITECTURE:
 * ```
 * MetadataManager.updateStatus()
 *   └─> StatusChangeSyncTrigger.triggerIfNeeded()
 *         ├─ Is transition sync-worthy?
 *         ├─ Circuit breaker open?
 *         ├─> Auto-create issues if missing (v1.0.19+)
 *         ├─> LivingDocsSync.syncIncrement()
 *         └─> Auto-close issues on completion (v1.0.19+)
 * ```
 *
 * v1.0.19 ADDITIONS:
 * - Auto-create external issues if config.sync.autoCreateOnIncrement = true
 * - Auto-close external issues when status → completed
 */

import { IncrementStatus } from '../types/increment-metadata.js';
import { SyncCircuitBreaker } from './sync-circuit-breaker.js';
import { Logger, consoleLogger } from '../../utils/logger.js';

export class StatusChangeSyncTrigger {
  private static circuitBreaker = new SyncCircuitBreaker();
  private static logger: Logger = consoleLogger;

  /**
   * Trigger sync if status transition warrants it
   *
   * NON-BLOCKING: Spawns async sync, doesn't wait for result
   * SAFE: Errors are caught and logged, never thrown
   *
   * @param incrementId - Increment ID
   * @param oldStatus - Previous status
   * @param newStatus - New status
   */
  static async triggerIfNeeded(
    incrementId: string,
    oldStatus: IncrementStatus,
    newStatus: IncrementStatus
  ): Promise<void> {
    // Skip sync in test environment to prevent real API calls and unhandled rejections
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
      return;
    }
    // CRITICAL FIX (2025-11-24): Check if feature_id is null for ACTIVE increments
    // This handles the case where increment was created directly with "active" status
    // but living docs sync never ran (no FS-XXX folder created)
    let forceSync = false;
    if (newStatus === IncrementStatus.ACTIVE) {
      forceSync = await this.hasMissingFeatureId(incrementId);
      if (forceSync) {
        this.logger.log(`📚 Increment ${incrementId} missing feature_id - forcing living docs sync...`);
      }
    }

    // Check if this transition needs sync (or force sync for missing feature_id)
    if (!forceSync && !this.isSyncWorthy(oldStatus, newStatus)) {
      return;
    }

    // Check circuit breaker
    if (!this.circuitBreaker.canSync()) {
      this.logger.warn('⚠️  Sync circuit breaker open - skipping auto-sync');
      this.logger.warn('💡 Run /sw:sync-progress manually to retry');
      return;
    }

    // Spawn non-blocking sync (pass newStatus for completion handling)
    this.spawnAsyncSync(incrementId, newStatus)
      .catch(error => {
        this.circuitBreaker.recordFailure();
        this.logger.error(`❌ Auto-sync failed for ${incrementId}:`, error.message);
        this.logger.log('💡 Run /sw:sync-progress to retry');
      });
  }

  /**
   * Check if increment has missing feature_id (living docs not synced)
   * AND spec.md exists (required for sync to work)
   *
   * CRITICAL FIX (2025-11-24): Also check spec.md exists
   * In single-prompt scenarios, feature_id may be null because spec.md
   * doesn't exist yet. We should only force sync if spec.md is ready.
   *
   * @param incrementId - Increment ID
   * @returns true if feature_id is null/undefined AND spec.md exists
   */
  private static async hasMissingFeatureId(incrementId: string): Promise<boolean> {
    try {
      const { promises: fs, existsSync } = await import('fs');
      const path = await import('path');

      const incrementPath = path.join(
        process.cwd(),
        '.specweave/increments',
        incrementId
      );

      // First check if spec.md exists - if not, sync would fail anyway
      const specPath = path.join(incrementPath, 'spec.md');
      if (!existsSync(specPath)) {
        // spec.md doesn't exist yet - don't force sync
        // Sync will trigger when spec.md is created
        return false;
      }

      // Now check if feature_id is missing
      const metadataPath = path.join(incrementPath, 'metadata.json');
      const content = await fs.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(content);

      // Check if feature_id is null, undefined, or empty string
      return !metadata.feature_id;
    } catch {
      // File doesn't exist or can't be read - don't force sync
      return false;
    }
  }

  /**
   * Check if status transition needs sync
   *
   * SYNC-WORTHY TRANSITIONS:
   * - planning → active (work started)
   * - active → completed (work finished - legacy direct completion)
   * - ready_for_review → completed (work approved - v0.28.63+ user confirmation)
   * - completed → active (work reopened)
   * - backlog → active (backlog item started)
   * - paused → active (work resumed)
   *
   * NOT SYNC-WORTHY:
   * - active → paused (temporary pause)
   * - active → backlog (deprioritized)
   * - active → ready_for_review (internal state - sync when actually completed)
   * - Any → abandoned (cancelled)
   *
   * @param oldStatus - Previous status
   * @param newStatus - New status
   * @returns true if sync should be triggered
   */
  private static isSyncWorthy(
    oldStatus: IncrementStatus,
    newStatus: IncrementStatus
  ): boolean {
    const transition = `${oldStatus} → ${newStatus}`;

    const SYNC_WORTHY = [
      'planning → active',            // Work started
      'active → completed',           // Work finished (legacy direct completion)
      'ready_for_review → completed', // Work approved (v0.28.63+ user confirmation)
      'completed → active',           // Work reopened
      'backlog → active',             // Backlog item started
      'paused → active'               // Work resumed
    ];

    return SYNC_WORTHY.includes(transition);
  }

  /**
   * Spawn async sync (non-blocking)
   *
   * Uses setTimeout(..., 0) to ensure updateStatus() returns immediately.
   * LivingDocsSync will handle GitHub/JIRA/ADO sync based on config.
   *
   * v1.0.19: Also handles auto-create if issues don't exist
   *
   * @param incrementId - Increment ID
   * @param newStatus - Optional new status (for completion handling)
   */
  private static async spawnAsyncSync(
    incrementId: string,
    newStatus?: IncrementStatus
  ): Promise<void> {
    // Dynamic import to avoid circular dependency
    const { LivingDocsSync } = await import('../living-docs/living-docs-sync.js');

    const syncFn = async () => {
      const projectRoot = process.cwd();

      // v1.0.19: Check if we need to auto-create external issues
      await this.autoCreateIfNeeded(projectRoot, incrementId);

      // Run living docs sync
      const sync = new LivingDocsSync(projectRoot, {
        logger: this.logger
      });

      await sync.syncIncrement(incrementId);

      // v1.0.19: Auto-close issues on completion
      if (newStatus === IncrementStatus.COMPLETED) {
        await this.autoCloseExternalIssues(projectRoot, incrementId);
      }

      this.circuitBreaker.recordSuccess();
      this.logger.log(`✅ Auto-synced increment ${incrementId} to external tools`);
    };

    // Completion transitions run synchronously to ensure issue closure
    // completes before the process exits. Other transitions stay non-blocking.
    if (newStatus === IncrementStatus.COMPLETED) {
      await syncFn();
    } else {
      setTimeout(async () => {
        try {
          await syncFn();
        } catch (error) {
          throw error;
        }
      }, 0);
    }
  }

  /**
   * Auto-create external issues if:
   * 1. config.sync.autoCreateOnIncrement = true
   * 2. No external issue linked to this increment
   *
   * @since v1.0.19
   */
  private static async autoCreateIfNeeded(
    projectRoot: string,
    incrementId: string
  ): Promise<void> {
    try {
      // Dynamic import to avoid circular dependency
      const { autoCreateExternalIssue } = await import(
        '../../sync/external-issue-auto-creator.js'
      );

      const result = await autoCreateExternalIssue(projectRoot, incrementId, this.logger);

      if (result.success && !result.skipped) {
        this.logger.log(
          `📝 Auto-created ${result.provider} issue for ${incrementId}: ${result.issueNumber}`
        );
      }
    } catch (error) {
      // Non-blocking - log and continue
      this.logger.warn(`⚠️  Auto-create check failed (non-blocking): ${error}`);
    }
  }

  /**
   * Auto-close external issues when increment status becomes COMPLETED
   *
   * Uses SyncCoordinator for safe closure with proper comments and labels.
   *
   * @since v1.0.19
   */
  private static async autoCloseExternalIssues(
    projectRoot: string,
    incrementId: string
  ): Promise<void> {
    try {
      // Dynamic import to avoid circular dependency
      const { SyncCoordinator } = await import('../../sync/sync-coordinator.js');

      const coordinator = new SyncCoordinator({
        projectRoot,
        incrementId,
        logger: this.logger,
      });

      // Close GitHub/JIRA/ADO issues with proper completion comments
      const result = await coordinator.syncIncrementClosure();

      if (result.success) {
        this.logger.log(
          `🎉 Auto-closed external issues for ${incrementId} (${result.closedIssues.length} closed)`
        );
      }
    } catch (error) {
      // Non-blocking - log and continue
      this.logger.warn(`⚠️  Auto-close failed (non-blocking): ${error}`);
    }
  }

  /**
   * Get circuit breaker state (for diagnostics)
   */
  static getCircuitBreakerState() {
    return this.circuitBreaker.getState();
  }

  /**
   * Reset circuit breaker (for testing/admin)
   */
  static resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }

  /**
   * Set custom logger (for testing)
   */
  static setLogger(logger: Logger): void {
    this.logger = logger;
  }
}
