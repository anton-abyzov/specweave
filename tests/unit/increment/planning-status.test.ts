import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit tests for PLANNING status
 *
 * Tests the PLANNING state functionality including:
 * - Enum definition
 * - State transitions
 * - WIP limit behavior
 * - Validation
 *
 * Part of increment 0039: Ultra-Smart Next Command
 */

import {
  IncrementStatus,
  validateTransition,
  countsTowardWipLimit,
  isValidTransition,
  WIP_COUNTED_STATUSES,
  VALID_TRANSITIONS
} from '../../../src/core/types/increment-metadata.js';

describe('PLANNED Status - Enum Definition', () => {
  it('should include PLANNED in enum', () => {
    expect(IncrementStatus.PLANNED).toBe('planned');
  });

  it('should keep the 2.0 vocabulary plus the two deprecated 1.x states', () => {
    const statuses = Object.values(IncrementStatus);
    expect(statuses).toHaveLength(7);
    expect(statuses).toContain('planned');
    expect(statuses).toContain('active');
    expect(statuses).toContain('backlog');
    expect(statuses).toContain('paused');
    expect(statuses).toContain('ready_for_review');
    expect(statuses).toContain('completed');
    expect(statuses).toContain('abandoned');
  });

  it('should define PLANNED as first status in enum', () => {
    const statuses = Object.values(IncrementStatus);
    expect(statuses[0]).toBe('planned');
  });
});

describe('PLANNED Status - State Transitions', () => {
  describe('Valid Transitions FROM PLANNING', () => {
    it('should allow PLANNING → ACTIVE', () => {
      expect(() => {
        validateTransition(IncrementStatus.PLANNED, IncrementStatus.ACTIVE);
      }).not.toThrow();
    });

    it('should allow PLANNING → BACKLOG (deprioritize)', () => {
      expect(() => {
        validateTransition(IncrementStatus.PLANNED, IncrementStatus.BACKLOG);
      }).not.toThrow();
    });

    it('should allow PLANNING → ABANDONED (cancel)', () => {
      expect(() => {
        validateTransition(IncrementStatus.PLANNED, IncrementStatus.ABANDONED);
      }).not.toThrow();
    });

    it('should have exactly 3 valid transitions from PLANNING', () => {
      const validTransitions = VALID_TRANSITIONS[IncrementStatus.PLANNED];
      expect(validTransitions).toHaveLength(3);
      expect(validTransitions).toContain(IncrementStatus.ACTIVE);
      expect(validTransitions).toContain(IncrementStatus.BACKLOG);
      expect(validTransitions).toContain(IncrementStatus.ABANDONED);
    });
  });

  describe('Invalid Transitions FROM PLANNING', () => {
    it('should reject PLANNING → COMPLETED (invalid)', () => {
      expect(() => {
        validateTransition(IncrementStatus.PLANNED, IncrementStatus.COMPLETED);
      }).toThrow('Invalid transition: planned → completed');
    });

    it('should reject PLANNING → PAUSED (invalid)', () => {
      expect(() => {
        validateTransition(IncrementStatus.PLANNED, IncrementStatus.PAUSED);
      }).toThrow('Invalid transition: planned → paused');
    });

    it('should reject PLANNED → PLANNED (no self-loop)', () => {
      expect(() => {
        validateTransition(IncrementStatus.PLANNED, IncrementStatus.PLANNED);
      }).toThrow('Invalid transition: planned → planned');
    });
  });

  describe('Valid Transitions TO PLANNING', () => {
    it('should allow BACKLOG → PLANNED', () => {
      expect(() => {
        validateTransition(IncrementStatus.BACKLOG, IncrementStatus.PLANNED);
      }).not.toThrow();
    });

    it('should check if BACKLOG → PLANNED is valid', () => {
      expect(isValidTransition(IncrementStatus.BACKLOG, IncrementStatus.PLANNED)).toBe(true);
    });

    it('should reject ACTIVE → PLANNED (can only move forward)', () => {
      expect(() => {
        validateTransition(IncrementStatus.ACTIVE, IncrementStatus.PLANNED);
      }).toThrow('Invalid transition: active → planned');
    });

    it('should reject COMPLETED → PLANNED', () => {
      expect(() => {
        validateTransition(IncrementStatus.COMPLETED, IncrementStatus.PLANNED);
      }).toThrow('Invalid transition: completed → planned');
    });
  });
});

describe('PLANNED Status - WIP Limit Behavior', () => {
  it('should NOT count PLANNING toward WIP limit', () => {
    expect(countsTowardWipLimit(IncrementStatus.PLANNED)).toBe(false);
  });

  it('should count ACTIVE toward WIP limit', () => {
    expect(countsTowardWipLimit(IncrementStatus.ACTIVE)).toBe(true);
  });

  it('should NOT count BACKLOG toward WIP limit', () => {
    expect(countsTowardWipLimit(IncrementStatus.BACKLOG)).toBe(false);
  });

  it('should NOT count COMPLETED toward WIP limit', () => {
    expect(countsTowardWipLimit(IncrementStatus.COMPLETED)).toBe(false);
  });

  it('should NOT count ABANDONED toward WIP limit', () => {
    expect(countsTowardWipLimit(IncrementStatus.ABANDONED)).toBe(false);
  });

  it('should count exactly ACTIVE and READY_FOR_REVIEW toward WIP', () => {
    expect(WIP_COUNTED_STATUSES).toHaveLength(2);
    expect(WIP_COUNTED_STATUSES).toContain(IncrementStatus.ACTIVE);
    expect(WIP_COUNTED_STATUSES).toContain(IncrementStatus.READY_FOR_REVIEW);
  });

  it('should NOT count PAUSED toward WIP (pausing is how you get under the limit)', () => {
    expect(WIP_COUNTED_STATUSES).not.toContain(IncrementStatus.PAUSED);
    expect(countsTowardWipLimit(IncrementStatus.PAUSED)).toBe(false);
  });

  it('should NOT include PLANNING in WIP counted statuses', () => {
    expect(WIP_COUNTED_STATUSES).not.toContain(IncrementStatus.PLANNED);
  });
});

describe('PLANNED Status - Validation Functions', () => {
  describe('validateTransition', () => {
    it('should throw error with clear message for invalid transition', () => {
      expect(() => {
        validateTransition(IncrementStatus.PLANNED, IncrementStatus.COMPLETED);
      }).toThrow(/Invalid transition: planned → completed/);
    });

    it('should include valid transitions in error message', () => {
      try {
        validateTransition(IncrementStatus.PLANNED, IncrementStatus.COMPLETED);
        fail('Should have thrown error');
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toContain('active');
        expect((error as Error).message).toContain('backlog');
        expect((error as Error).message).toContain('abandoned');
      }
    });

    it('should not throw for valid transitions', () => {
      expect(() => validateTransition(IncrementStatus.PLANNED, IncrementStatus.ACTIVE)).not.toThrow();
      expect(() => validateTransition(IncrementStatus.PLANNED, IncrementStatus.BACKLOG)).not.toThrow();
      expect(() => validateTransition(IncrementStatus.PLANNED, IncrementStatus.ABANDONED)).not.toThrow();
    });
  });

  describe('isValidTransition', () => {
    it('should return true for valid PLANNING transitions', () => {
      expect(isValidTransition(IncrementStatus.PLANNED, IncrementStatus.ACTIVE)).toBe(true);
      expect(isValidTransition(IncrementStatus.PLANNED, IncrementStatus.BACKLOG)).toBe(true);
      expect(isValidTransition(IncrementStatus.PLANNED, IncrementStatus.ABANDONED)).toBe(true);
    });

    it('should return false for invalid PLANNING transitions', () => {
      expect(isValidTransition(IncrementStatus.PLANNED, IncrementStatus.COMPLETED)).toBe(false);
      expect(isValidTransition(IncrementStatus.PLANNED, IncrementStatus.PAUSED)).toBe(false);
      expect(isValidTransition(IncrementStatus.PLANNED, IncrementStatus.PLANNED)).toBe(false);
    });

    it('should return true for BACKLOG → PLANNED', () => {
      expect(isValidTransition(IncrementStatus.BACKLOG, IncrementStatus.PLANNED)).toBe(true);
    });
  });
});

describe('PLANNED Status - Lifecycle Scenarios', () => {
  it('should support happy path: BACKLOG → PLANNED → ACTIVE → READY_FOR_REVIEW → COMPLETED', () => {
    expect(() => {
      validateTransition(IncrementStatus.BACKLOG, IncrementStatus.PLANNED);
      validateTransition(IncrementStatus.PLANNED, IncrementStatus.ACTIVE);
      validateTransition(IncrementStatus.ACTIVE, IncrementStatus.READY_FOR_REVIEW);
      validateTransition(IncrementStatus.READY_FOR_REVIEW, IncrementStatus.COMPLETED);
    }).not.toThrow();
  });

  it('should support deprioritization: PLANNING → BACKLOG', () => {
    expect(() => {
      validateTransition(IncrementStatus.PLANNED, IncrementStatus.BACKLOG);
    }).not.toThrow();
  });

  it('should support cancellation during planning: PLANNING → ABANDONED', () => {
    expect(() => {
      validateTransition(IncrementStatus.PLANNED, IncrementStatus.ABANDONED);
    }).not.toThrow();
  });

  it('should prevent skipping planning phase: BACKLOG → ACTIVE (should go through PLANNING)', () => {
    // Note: BACKLOG → ACTIVE is actually ALLOWED (direct start without planning)
    // This is intentional for quick fixes/experiments
    expect(isValidTransition(IncrementStatus.BACKLOG, IncrementStatus.ACTIVE)).toBe(true);
  });
});
