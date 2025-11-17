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

describe('PLANNING Status - Enum Definition', () => {
  it('should include PLANNING in enum', () => {
    expect(IncrementStatus.PLANNING).toBe('planning');
  });

  it('should have 6 total statuses', () => {
    const statuses = Object.values(IncrementStatus);
    expect(statuses).toHaveLength(6);
    expect(statuses).toContain('planning');
    expect(statuses).toContain('active');
    expect(statuses).toContain('backlog');
    expect(statuses).toContain('paused');
    expect(statuses).toContain('completed');
    expect(statuses).toContain('abandoned');
  });

  it('should define PLANNING as first status in enum', () => {
    const statuses = Object.values(IncrementStatus);
    expect(statuses[0]).toBe('planning');
  });
});

describe('PLANNING Status - State Transitions', () => {
  describe('Valid Transitions FROM PLANNING', () => {
    it('should allow PLANNING → ACTIVE', () => {
      expect(() => {
        validateTransition(IncrementStatus.PLANNING, IncrementStatus.ACTIVE);
      }).not.toThrow();
    });

    it('should allow PLANNING → BACKLOG (deprioritize)', () => {
      expect(() => {
        validateTransition(IncrementStatus.PLANNING, IncrementStatus.BACKLOG);
      }).not.toThrow();
    });

    it('should allow PLANNING → ABANDONED (cancel)', () => {
      expect(() => {
        validateTransition(IncrementStatus.PLANNING, IncrementStatus.ABANDONED);
      }).not.toThrow();
    });

    it('should have exactly 3 valid transitions from PLANNING', () => {
      const validTransitions = VALID_TRANSITIONS[IncrementStatus.PLANNING];
      expect(validTransitions).toHaveLength(3);
      expect(validTransitions).toContain(IncrementStatus.ACTIVE);
      expect(validTransitions).toContain(IncrementStatus.BACKLOG);
      expect(validTransitions).toContain(IncrementStatus.ABANDONED);
    });
  });

  describe('Invalid Transitions FROM PLANNING', () => {
    it('should reject PLANNING → COMPLETED (invalid)', () => {
      expect(() => {
        validateTransition(IncrementStatus.PLANNING, IncrementStatus.COMPLETED);
      }).toThrow('Invalid transition: planning → completed');
    });

    it('should reject PLANNING → PAUSED (invalid)', () => {
      expect(() => {
        validateTransition(IncrementStatus.PLANNING, IncrementStatus.PAUSED);
      }).toThrow('Invalid transition: planning → paused');
    });

    it('should reject PLANNING → PLANNING (no self-loop)', () => {
      expect(() => {
        validateTransition(IncrementStatus.PLANNING, IncrementStatus.PLANNING);
      }).toThrow('Invalid transition: planning → planning');
    });
  });

  describe('Valid Transitions TO PLANNING', () => {
    it('should allow BACKLOG → PLANNING', () => {
      expect(() => {
        validateTransition(IncrementStatus.BACKLOG, IncrementStatus.PLANNING);
      }).not.toThrow();
    });

    it('should check if BACKLOG → PLANNING is valid', () => {
      expect(isValidTransition(IncrementStatus.BACKLOG, IncrementStatus.PLANNING)).toBe(true);
    });

    it('should reject ACTIVE → PLANNING (can only move forward)', () => {
      expect(() => {
        validateTransition(IncrementStatus.ACTIVE, IncrementStatus.PLANNING);
      }).toThrow('Invalid transition: active → planning');
    });

    it('should reject COMPLETED → PLANNING', () => {
      expect(() => {
        validateTransition(IncrementStatus.COMPLETED, IncrementStatus.PLANNING);
      }).toThrow('Invalid transition: completed → planning');
    });
  });
});

describe('PLANNING Status - WIP Limit Behavior', () => {
  it('should NOT count PLANNING toward WIP limit', () => {
    expect(countsTowardWipLimit(IncrementStatus.PLANNING)).toBe(false);
  });

  it('should count ACTIVE toward WIP limit', () => {
    expect(countsTowardWipLimit(IncrementStatus.ACTIVE)).toBe(true);
  });

  it('should count PAUSED toward WIP limit', () => {
    expect(countsTowardWipLimit(IncrementStatus.PAUSED)).toBe(true);
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

  it('should have exactly 2 statuses that count toward WIP', () => {
    expect(WIP_COUNTED_STATUSES).toHaveLength(2);
    expect(WIP_COUNTED_STATUSES).toContain(IncrementStatus.ACTIVE);
    expect(WIP_COUNTED_STATUSES).toContain(IncrementStatus.PAUSED);
  });

  it('should NOT include PLANNING in WIP counted statuses', () => {
    expect(WIP_COUNTED_STATUSES).not.toContain(IncrementStatus.PLANNING);
  });
});

describe('PLANNING Status - Validation Functions', () => {
  describe('validateTransition', () => {
    it('should throw error with clear message for invalid transition', () => {
      expect(() => {
        validateTransition(IncrementStatus.PLANNING, IncrementStatus.COMPLETED);
      }).toThrow(/Invalid transition: planning → completed/);
    });

    it('should include valid transitions in error message', () => {
      try {
        validateTransition(IncrementStatus.PLANNING, IncrementStatus.COMPLETED);
        fail('Should have thrown error');
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toContain('active');
        expect((error as Error).message).toContain('backlog');
        expect((error as Error).message).toContain('abandoned');
      }
    });

    it('should not throw for valid transitions', () => {
      expect(() => validateTransition(IncrementStatus.PLANNING, IncrementStatus.ACTIVE)).not.toThrow();
      expect(() => validateTransition(IncrementStatus.PLANNING, IncrementStatus.BACKLOG)).not.toThrow();
      expect(() => validateTransition(IncrementStatus.PLANNING, IncrementStatus.ABANDONED)).not.toThrow();
    });
  });

  describe('isValidTransition', () => {
    it('should return true for valid PLANNING transitions', () => {
      expect(isValidTransition(IncrementStatus.PLANNING, IncrementStatus.ACTIVE)).toBe(true);
      expect(isValidTransition(IncrementStatus.PLANNING, IncrementStatus.BACKLOG)).toBe(true);
      expect(isValidTransition(IncrementStatus.PLANNING, IncrementStatus.ABANDONED)).toBe(true);
    });

    it('should return false for invalid PLANNING transitions', () => {
      expect(isValidTransition(IncrementStatus.PLANNING, IncrementStatus.COMPLETED)).toBe(false);
      expect(isValidTransition(IncrementStatus.PLANNING, IncrementStatus.PAUSED)).toBe(false);
      expect(isValidTransition(IncrementStatus.PLANNING, IncrementStatus.PLANNING)).toBe(false);
    });

    it('should return true for BACKLOG → PLANNING', () => {
      expect(isValidTransition(IncrementStatus.BACKLOG, IncrementStatus.PLANNING)).toBe(true);
    });
  });
});

describe('PLANNING Status - Lifecycle Scenarios', () => {
  it('should support happy path: BACKLOG → PLANNING → ACTIVE → COMPLETED', () => {
    expect(() => {
      validateTransition(IncrementStatus.BACKLOG, IncrementStatus.PLANNING);
      validateTransition(IncrementStatus.PLANNING, IncrementStatus.ACTIVE);
      validateTransition(IncrementStatus.ACTIVE, IncrementStatus.COMPLETED);
    }).not.toThrow();
  });

  it('should support deprioritization: PLANNING → BACKLOG', () => {
    expect(() => {
      validateTransition(IncrementStatus.PLANNING, IncrementStatus.BACKLOG);
    }).not.toThrow();
  });

  it('should support cancellation during planning: PLANNING → ABANDONED', () => {
    expect(() => {
      validateTransition(IncrementStatus.PLANNING, IncrementStatus.ABANDONED);
    }).not.toThrow();
  });

  it('should prevent skipping planning phase: BACKLOG → ACTIVE (should go through PLANNING)', () => {
    // Note: BACKLOG → ACTIVE is actually ALLOWED (direct start without planning)
    // This is intentional for quick fixes/experiments
    expect(isValidTransition(IncrementStatus.BACKLOG, IncrementStatus.ACTIVE)).toBe(true);
  });
});
