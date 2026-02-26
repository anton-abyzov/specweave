/**
 * Status Change Sync Trigger Tests
 *
 * Verifies that completion triggers living docs sync
 *
 * NOTE: This test uses a testable implementation to verify the sync logic
 * independently. While this duplicates some logic, it's intentional for
 * unit test isolation. The actual StatusChangeSyncTrigger class uses a
 * private static method that cannot be easily tested without this approach.
 *
 * Alternative approaches considered:
 * 1. Make isSyncWorthy() public - would expose internal implementation
 * 2. Use reflection/type casting - fragile, TypeScript-specific
 * 3. Integration test only - slower, harder to debug edge cases
 *
 * This approach provides fast, focused unit tests for the sync logic while
 * integration tests (crash-resistance.test.ts) verify the full flow.
 */

import { describe, it, expect } from 'vitest';
import { IncrementStatus } from '../../src/core/types/increment-metadata.js';

// Testable implementation of sync-worthy logic
// IMPORTANT: Keep in sync with StatusChangeSyncTrigger.isSyncWorthy()
class StatusChangeSyncTriggerTestable {
  static isSyncWorthy(oldStatus: IncrementStatus, newStatus: IncrementStatus): boolean {
    const transition = `${oldStatus} → ${newStatus}`;

    const SYNC_WORTHY = [
      'planning → active',            // Work started
      'active → completed',           // Work finished (legacy direct completion)
      'ready_for_review → completed', // Work approved (v0.28.63+ user confirmation)
      'completed → active',           // Work reopened
      'backlog → active',             // Backlog item started
      'paused → active',              // Work resumed
      'planning → completed',         // Direct completion (bypassed CLI)
      'backlog → completed',          // Direct completion (bypassed CLI)
      'paused → completed',           // Direct completion (bypassed CLI)
      'paused → ready_for_review'     // Paused -> review (valid transition)
    ];

    return SYNC_WORTHY.includes(transition);
  }
}

describe('StatusChangeSyncTrigger', () => {
  describe('isSyncWorthy', () => {
    it('should trigger sync for ready_for_review → completed (user approval)', () => {
      const result = StatusChangeSyncTriggerTestable.isSyncWorthy(
        IncrementStatus.READY_FOR_REVIEW,
        IncrementStatus.COMPLETED
      );
      expect(result).toBe(true);
    });

    it('should trigger sync for planning → active (work started)', () => {
      const result = StatusChangeSyncTriggerTestable.isSyncWorthy(
        IncrementStatus.PLANNING,
        IncrementStatus.ACTIVE
      );
      expect(result).toBe(true);
    });

    it('should trigger sync for active → completed (legacy direct completion)', () => {
      const result = StatusChangeSyncTriggerTestable.isSyncWorthy(
        IncrementStatus.ACTIVE,
        IncrementStatus.COMPLETED
      );
      expect(result).toBe(true);
    });

    it('should trigger sync for completed → active (work reopened)', () => {
      const result = StatusChangeSyncTriggerTestable.isSyncWorthy(
        IncrementStatus.COMPLETED,
        IncrementStatus.ACTIVE
      );
      expect(result).toBe(true);
    });

    it('should trigger sync for backlog → active (work started)', () => {
      const result = StatusChangeSyncTriggerTestable.isSyncWorthy(
        IncrementStatus.BACKLOG,
        IncrementStatus.ACTIVE
      );
      expect(result).toBe(true);
    });

    it('should trigger sync for paused → active (work resumed)', () => {
      const result = StatusChangeSyncTriggerTestable.isSyncWorthy(
        IncrementStatus.PAUSED,
        IncrementStatus.ACTIVE
      );
      expect(result).toBe(true);
    });

    it('should trigger sync for planning → completed (defense-in-depth)', () => {
      const result = StatusChangeSyncTriggerTestable.isSyncWorthy(
        IncrementStatus.PLANNING,
        IncrementStatus.COMPLETED
      );
      expect(result).toBe(true);
    });

    it('should trigger sync for backlog → completed (defense-in-depth)', () => {
      const result = StatusChangeSyncTriggerTestable.isSyncWorthy(
        IncrementStatus.BACKLOG,
        IncrementStatus.COMPLETED
      );
      expect(result).toBe(true);
    });

    it('should trigger sync for paused → completed (defense-in-depth)', () => {
      const result = StatusChangeSyncTriggerTestable.isSyncWorthy(
        IncrementStatus.PAUSED,
        IncrementStatus.COMPLETED
      );
      expect(result).toBe(true);
    });

    it('should trigger sync for paused → ready_for_review', () => {
      const result = StatusChangeSyncTriggerTestable.isSyncWorthy(
        IncrementStatus.PAUSED,
        IncrementStatus.READY_FOR_REVIEW
      );
      expect(result).toBe(true);
    });

    it('should NOT trigger sync for active → ready_for_review (internal state)', () => {
      const result = StatusChangeSyncTriggerTestable.isSyncWorthy(
        IncrementStatus.ACTIVE,
        IncrementStatus.READY_FOR_REVIEW
      );
      expect(result).toBe(false);
    });

    it('should NOT trigger sync for active → paused (temporary pause)', () => {
      const result = StatusChangeSyncTriggerTestable.isSyncWorthy(
        IncrementStatus.ACTIVE,
        IncrementStatus.PAUSED
      );
      expect(result).toBe(false);
    });

    it('should NOT trigger sync for active → backlog (deprioritized)', () => {
      const result = StatusChangeSyncTriggerTestable.isSyncWorthy(
        IncrementStatus.ACTIVE,
        IncrementStatus.BACKLOG
      );
      expect(result).toBe(false);
    });

    it('should NOT trigger sync for active → abandoned (cancelled)', () => {
      const result = StatusChangeSyncTriggerTestable.isSyncWorthy(
        IncrementStatus.ACTIVE,
        IncrementStatus.ABANDONED
      );
      expect(result).toBe(false);
    });
  });
});
