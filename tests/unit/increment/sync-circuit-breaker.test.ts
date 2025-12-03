/**
 * Unit tests for SyncCircuitBreaker
 *
 * Tests circuit breaker pattern implementation:
 * - State transitions (closed → open → half-open → closed)
 * - Failure counting and thresholds
 * - Auto-reset after timeout
 * - Manual reset functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncCircuitBreaker } from '../../../src/core/increment/sync-circuit-breaker.js';

describe('SyncCircuitBreaker', () => {
  let breaker: SyncCircuitBreaker;

  beforeEach(() => {
    breaker = new SyncCircuitBreaker();
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should start in closed state', () => {
      const state = breaker.getState();
      expect(state.state).toBe('closed');
      expect(state.failures).toBe(0);
      expect(state.lastFailure).toBeUndefined();
    });

    it('should allow syncs in closed state', () => {
      expect(breaker.canSync()).toBe(true);
    });
  });

  describe('Failure Handling', () => {
    it('should remain closed after 1-2 failures', () => {
      breaker.recordFailure();
      expect(breaker.canSync()).toBe(true);
      expect(breaker.getState().failures).toBe(1);

      breaker.recordFailure();
      expect(breaker.canSync()).toBe(true);
      expect(breaker.getState().failures).toBe(2);
    });

    it('should open after 3 consecutive failures', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();

      const state = breaker.getState();
      expect(state.state).toBe('open');
      expect(state.failures).toBe(3);
      expect(state.lastFailure).toBeDefined();
      expect(breaker.canSync()).toBe(false);
    });

    it('should record last failure timestamp', () => {
      const beforeTime = Date.now();
      breaker.recordFailure();
      const afterTime = Date.now();

      const state = breaker.getState();
      expect(state.lastFailure).toBeDefined();
      const failureTime = state.lastFailure!.getTime();
      expect(failureTime).toBeGreaterThanOrEqual(beforeTime);
      expect(failureTime).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('Success Handling', () => {
    it('should reset failures on success', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getState().failures).toBe(2);

      breaker.recordSuccess();
      expect(breaker.getState().failures).toBe(0);
      expect(breaker.getState().state).toBe('closed');
    });

    it('should close circuit on success after opening', () => {
      // Open circuit
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getState().state).toBe('open');

      // Wait for timeout (mock time)
      vi.useFakeTimers();
      vi.advanceTimersByTime(5 * 60 * 1000 + 1000); // 5 minutes + 1 second

      // Should be half-open
      expect(breaker.canSync()).toBe(true);
      expect(breaker.getState().state).toBe('half-open');

      // Success closes it
      breaker.recordSuccess();
      expect(breaker.getState().state).toBe('closed');
      expect(breaker.getState().failures).toBe(0);

      vi.useRealTimers();
    });
  });

  describe('Auto-Reset After Timeout', () => {
    it('should move to half-open after 5 minutes', () => {
      // Open circuit
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.canSync()).toBe(false);

      // Fast-forward time
      vi.useFakeTimers();
      vi.advanceTimersByTime(5 * 60 * 1000 + 1000); // 5 minutes + 1 second

      // Should allow sync (half-open)
      expect(breaker.canSync()).toBe(true);
      expect(breaker.getState().state).toBe('half-open');

      vi.useRealTimers();
    });

    it('should NOT reset before timeout', () => {
      // Open circuit
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();

      // Fast-forward less than 5 minutes
      vi.useFakeTimers();
      vi.advanceTimersByTime(3 * 60 * 1000); // 3 minutes

      // Should still be open
      expect(breaker.canSync()).toBe(false);
      expect(breaker.getState().state).toBe('open');

      vi.useRealTimers();
    });
  });

  describe('Half-Open State', () => {
    it('should allow sync in half-open state', () => {
      // Open circuit and wait for timeout
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();

      vi.useFakeTimers();
      vi.advanceTimersByTime(5 * 60 * 1000 + 1000);

      expect(breaker.canSync()).toBe(true);
      expect(breaker.getState().state).toBe('half-open');

      vi.useRealTimers();
    });

    it('should close on success in half-open state', () => {
      // Use fake timers before recording failures
      vi.useFakeTimers();

      // Get to half-open
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();

      vi.advanceTimersByTime(5 * 60 * 1000 + 1000);

      // canSync() triggers the transition to half-open
      expect(breaker.canSync()).toBe(true);
      expect(breaker.getState().state).toBe('half-open');

      // Success should close
      breaker.recordSuccess();
      expect(breaker.getState().state).toBe('closed');

      vi.useRealTimers();
    });

    it('should reopen on failure in half-open state', () => {
      // Use fake timers before recording failures
      vi.useFakeTimers();

      // Get to half-open
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();

      vi.advanceTimersByTime(5 * 60 * 1000 + 1000);

      // canSync() triggers the transition to half-open
      expect(breaker.canSync()).toBe(true);
      expect(breaker.getState().state).toBe('half-open');

      // Another failure should reopen
      breaker.recordFailure();
      expect(breaker.getState().state).toBe('open');
      expect(breaker.canSync()).toBe(false);

      vi.useRealTimers();
    });
  });

  describe('Manual Reset', () => {
    it('should reset to initial state', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();

      breaker.reset();

      const state = breaker.getState();
      expect(state.state).toBe('closed');
      expect(state.failures).toBe(0);
      expect(state.lastFailure).toBeUndefined();
      expect(breaker.canSync()).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple resets', () => {
      breaker.recordFailure();
      breaker.reset();
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.reset();

      const state = breaker.getState();
      expect(state.state).toBe('closed');
      expect(state.failures).toBe(0);
    });

    it('should handle rapid failures', () => {
      for (let i = 0; i < 10; i++) {
        breaker.recordFailure();
      }

      const state = breaker.getState();
      expect(state.state).toBe('open');
      expect(state.failures).toBeGreaterThanOrEqual(3);
      expect(breaker.canSync()).toBe(false);
    });

    it('should handle success without prior failure', () => {
      breaker.recordSuccess();
      expect(breaker.getState().state).toBe('closed');
      expect(breaker.getState().failures).toBe(0);
    });
  });
});
