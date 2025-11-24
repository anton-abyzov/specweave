/**
 * Status Change Sync Trigger
 *
 * Automatically triggers living docs and GitHub sync when increment status changes.
 *
 * WHY THIS EXISTS:
 * - Users expect GitHub issues to update automatically when work starts/completes
 * - Manual `/specweave:sync-progress` is friction
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
 *         └─> LivingDocsSync.syncIncrement()
 *               └─> GitHub/JIRA/ADO sync
 * ```
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
    // Check if this transition needs sync
    if (!this.isSyncWorthy(oldStatus, newStatus)) {
      return;
    }

    // Check circuit breaker
    if (!this.circuitBreaker.canSync()) {
      this.logger.warn('⚠️  Sync circuit breaker open - skipping auto-sync');
      this.logger.warn('💡 Run /specweave:sync-progress manually to retry');
      return;
    }

    // Spawn non-blocking sync
    this.spawnAsyncSync(incrementId)
      .catch(error => {
        this.circuitBreaker.recordFailure();
        this.logger.error(`❌ Auto-sync failed for ${incrementId}:`, error.message);
        this.logger.log('💡 Run /specweave:sync-progress to retry');
      });
  }

  /**
   * Check if status transition needs sync
   *
   * SYNC-WORTHY TRANSITIONS:
   * - planning → active (work started)
   * - active → completed (work finished)
   * - completed → active (work reopened)
   * - backlog → active (backlog item started)
   * - paused → active (work resumed)
   *
   * NOT SYNC-WORTHY:
   * - active → paused (temporary pause)
   * - active → backlog (deprioritized)
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
      'planning → active',       // Work started
      'active → completed',      // Work finished
      'completed → active',      // Work reopened
      'backlog → active',        // Backlog item started
      'paused → active'          // Work resumed
    ];

    return SYNC_WORTHY.includes(transition);
  }

  /**
   * Spawn async sync (non-blocking)
   *
   * Uses setTimeout(..., 0) to ensure updateStatus() returns immediately.
   * LivingDocsSync will handle GitHub/JIRA/ADO sync based on config.
   *
   * @param incrementId - Increment ID
   */
  private static async spawnAsyncSync(incrementId: string): Promise<void> {
    // Dynamic import to avoid circular dependency
    const { LivingDocsSync } = await import('../living-docs/living-docs-sync.js');

    // Non-blocking: Don't await
    setTimeout(async () => {
      try {
        const sync = new LivingDocsSync(process.cwd(), {
          logger: this.logger
        });

        await sync.syncIncrement(incrementId);

        this.circuitBreaker.recordSuccess();
        this.logger.log(`✅ Auto-synced increment ${incrementId} to external tools`);
      } catch (error) {
        // Error will be caught by triggerIfNeeded()
        throw error;
      }
    }, 0);
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
