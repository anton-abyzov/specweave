import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit tests for WIP Limit behavior with PLANNING status
 *
 * Tests that PLANNING increments do NOT count toward WIP limits
 * while ACTIVE and PAUSED increments DO count.
 *
 * Part of increment 0039: Ultra-Smart Next Command
 */

import {
  IncrementStatus,
  IncrementType,
  countsTowardWipLimit,
  WIP_COUNTED_STATUSES,
  TYPE_LIMITS
} from '../../../src/core/types/increment-metadata.js';

describe('WIP Limit - PLANNING Exclusion', () => {
  describe('countsTowardWipLimit function', () => {
    it('should return false for PLANNING', () => {
      expect(countsTowardWipLimit(IncrementStatus.PLANNING)).toBe(false);
    });

    it('should return true for ACTIVE', () => {
      expect(countsTowardWipLimit(IncrementStatus.ACTIVE)).toBe(true);
    });

    it('should return true for PAUSED', () => {
      expect(countsTowardWipLimit(IncrementStatus.PAUSED)).toBe(true);
    });

    it('should return false for BACKLOG', () => {
      expect(countsTowardWipLimit(IncrementStatus.BACKLOG)).toBe(false);
    });

    it('should return false for COMPLETED', () => {
      expect(countsTowardWipLimit(IncrementStatus.COMPLETED)).toBe(false);
    });

    it('should return false for ABANDONED', () => {
      expect(countsTowardWipLimit(IncrementStatus.ABANDONED)).toBe(false);
    });
  });

  describe('WIP_COUNTED_STATUSES constant', () => {
    it('should include ACTIVE and PAUSED only', () => {
      expect(WIP_COUNTED_STATUSES).toHaveLength(2);
      expect(WIP_COUNTED_STATUSES).toEqual([
        IncrementStatus.ACTIVE,
        IncrementStatus.PAUSED
      ]);
    });

    it('should NOT include PLANNING', () => {
      expect(WIP_COUNTED_STATUSES).not.toContain(IncrementStatus.PLANNING);
    });

    it('should NOT include BACKLOG', () => {
      expect(WIP_COUNTED_STATUSES).not.toContain(IncrementStatus.BACKLOG);
    });

    it('should NOT include COMPLETED', () => {
      expect(WIP_COUNTED_STATUSES).not.toContain(IncrementStatus.COMPLETED);
    });

    it('should NOT include ABANDONED', () => {
      expect(WIP_COUNTED_STATUSES).not.toContain(IncrementStatus.ABANDONED);
    });
  });

  describe('Multiple PLANNING increments allowed', () => {
    it('should allow unlimited PLANNING increments for FEATURE type', () => {
      // Scenario: 5 PLANNING features + 1 ACTIVE feature
      const planningCount = 5;
      const activeCount = 1;

      // FEATURE limit is 2 ACTIVE, but PLANNING doesn't count
      expect(TYPE_LIMITS[IncrementType.FEATURE]).toBe(2);

      // All PLANNING increments don't count
      for (let i = 0; i < planningCount; i++) {
        expect(countsTowardWipLimit(IncrementStatus.PLANNING)).toBe(false);
      }

      // Only ACTIVE counts (1/2 limit used)
      expect(countsTowardWipLimit(IncrementStatus.ACTIVE)).toBe(true);
      expect(activeCount).toBeLessThan(TYPE_LIMITS[IncrementType.FEATURE]!);
    });

    it('should allow multiple PLANNING increments without hitting WIP limit', () => {
      const increments = [
        { status: IncrementStatus.PLANNING, type: IncrementType.FEATURE },
        { status: IncrementStatus.PLANNING, type: IncrementType.FEATURE },
        { status: IncrementStatus.PLANNING, type: IncrementType.FEATURE },
        { status: IncrementStatus.ACTIVE, type: IncrementType.FEATURE }
      ];

      const wipCount = increments.filter(inc =>
        countsTowardWipLimit(inc.status)
      ).length;

      expect(wipCount).toBe(1);  // Only 1 ACTIVE counts
      expect(wipCount).toBeLessThan(TYPE_LIMITS[IncrementType.FEATURE]!);
    });
  });

  describe('PAUSED counts toward WIP', () => {
    it('should count PAUSED toward WIP limit', () => {
      const increments = [
        { status: IncrementStatus.ACTIVE, type: IncrementType.FEATURE },
        { status: IncrementStatus.PAUSED, type: IncrementType.FEATURE }
      ];

      const wipCount = increments.filter(inc =>
        countsTowardWipLimit(inc.status)
      ).length;

      expect(wipCount).toBe(2);  // Both ACTIVE and PAUSED count
      expect(wipCount).toBe(TYPE_LIMITS[IncrementType.FEATURE]);  // Hit limit
    });

    it('should block new ACTIVE when ACTIVE + PAUSED reach limit', () => {
      const increments = [
        { status: IncrementStatus.ACTIVE, type: IncrementType.FEATURE },
        { status: IncrementStatus.PAUSED, type: IncrementType.FEATURE }
      ];

      const wipCount = increments.filter(inc =>
        countsTowardWipLimit(inc.status)
      ).length;

      const limit = TYPE_LIMITS[IncrementType.FEATURE]!;
      expect(wipCount).toBeGreaterThanOrEqual(limit);
    });
  });

  describe('Real-world scenarios', () => {
    it('Scenario 1: Planning multiple features in parallel', () => {
      // Team planning 3 features, implementing 1
      const increments = [
        { status: IncrementStatus.PLANNING, type: IncrementType.FEATURE },  // Planning A
        { status: IncrementStatus.PLANNING, type: IncrementType.FEATURE },  // Planning B
        { status: IncrementStatus.PLANNING, type: IncrementType.FEATURE },  // Planning C
        { status: IncrementStatus.ACTIVE, type: IncrementType.FEATURE }     // Implementing D
      ];

      const wipCount = increments.filter(inc =>
        countsTowardWipLimit(inc.status)
      ).length;

      expect(wipCount).toBe(1);  // Only D counts, planning doesn't block
      expect(wipCount).toBeLessThan(TYPE_LIMITS[IncrementType.FEATURE]!);
    });

    it('Scenario 2: Planning during active work', () => {
      // Implementing 2 features (at limit), planning next feature
      const increments = [
        { status: IncrementStatus.ACTIVE, type: IncrementType.FEATURE },    // Implementing A
        { status: IncrementStatus.ACTIVE, type: IncrementType.FEATURE },    // Implementing B
        { status: IncrementStatus.PLANNING, type: IncrementType.FEATURE }   // Planning C (next)
      ];

      const wipCount = increments.filter(inc =>
        countsTowardWipLimit(inc.status)
      ).length;

      expect(wipCount).toBe(2);  // Both ACTIVE count
      expect(wipCount).toBe(TYPE_LIMITS[IncrementType.FEATURE]);  // At limit
      // Planning C doesn't block (can plan while at WIP limit)
    });

    it('Scenario 3: PAUSED work blocks new ACTIVE', () => {
      // 1 ACTIVE, 1 PAUSED (at limit), can't start new ACTIVE
      const increments = [
        { status: IncrementStatus.ACTIVE, type: IncrementType.FEATURE },
        { status: IncrementStatus.PAUSED, type: IncrementType.FEATURE }
      ];

      const wipCount = increments.filter(inc =>
        countsTowardWipLimit(inc.status)
      ).length;

      expect(wipCount).toBe(2);  // Both count
      expect(wipCount).toBeGreaterThanOrEqual(TYPE_LIMITS[IncrementType.FEATURE]!);

      // Can't start new ACTIVE without completing/abandoning one
    });

    it('Scenario 4: Refactor type (limit: 1 ACTIVE)', () => {
      // Only 1 ACTIVE refactor allowed, but unlimited PLANNING
      const increments = [
        { status: IncrementStatus.PLANNING, type: IncrementType.REFACTOR },
        { status: IncrementStatus.PLANNING, type: IncrementType.REFACTOR },
        { status: IncrementStatus.ACTIVE, type: IncrementType.REFACTOR }
      ];

      const wipCount = increments.filter(inc =>
        inc.type === IncrementType.REFACTOR && countsTowardWipLimit(inc.status)
      ).length;

      expect(wipCount).toBe(1);  // Only 1 ACTIVE
      expect(wipCount).toBe(TYPE_LIMITS[IncrementType.REFACTOR]);  // At limit
      // 2 PLANNING refactors don't count (can plan next refactors)
    });

    it('Scenario 5: HOTFIX and BUG bypass limits (null = unlimited)', () => {
      // HOTFIX and BUG are unlimited (emergency work)
      expect(TYPE_LIMITS[IncrementType.HOTFIX]).toBeNull();
      expect(TYPE_LIMITS[IncrementType.BUG]).toBeNull();

      // But ACTIVE/PAUSED still count toward overall WIP awareness
      const increments = [
        { status: IncrementStatus.ACTIVE, type: IncrementType.HOTFIX },
        { status: IncrementStatus.ACTIVE, type: IncrementType.HOTFIX },
        { status: IncrementStatus.ACTIVE, type: IncrementType.BUG }
      ];

      const wipCount = increments.filter(inc =>
        countsTowardWipLimit(inc.status)
      ).length;

      expect(wipCount).toBe(3);  // All 3 count (for WIP awareness, not limits)
    });
  });

  describe('Type limits configuration', () => {
    it('should have correct limits for each type', () => {
      expect(TYPE_LIMITS[IncrementType.HOTFIX]).toBeNull();  // Unlimited
      expect(TYPE_LIMITS[IncrementType.FEATURE]).toBe(2);
      expect(TYPE_LIMITS[IncrementType.BUG]).toBeNull();  // Unlimited
      expect(TYPE_LIMITS[IncrementType.CHANGE_REQUEST]).toBe(2);
      expect(TYPE_LIMITS[IncrementType.REFACTOR]).toBe(1);
      expect(TYPE_LIMITS[IncrementType.EXPERIMENT]).toBeNull();  // Unlimited
    });
  });
});
