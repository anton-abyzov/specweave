import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncCircuitBreaker } from '../../../../src/core/increment/sync-circuit-breaker.js';

describe('ADO Circuit Breaker Integration', () => {
  let breaker: SyncCircuitBreaker;

  beforeEach(() => {
    breaker = new SyncCircuitBreaker();
  });

  it('opens after 3 consecutive failures', () => {
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.canSync()).toBe(true); // Still closed after 2

    breaker.recordFailure();
    expect(breaker.canSync()).toBe(false); // Open after 3
    expect(breaker.getState().state).toBe('open');
  });

  it('4th call blocked without HTTP request when open', () => {
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();

    // Circuit is open — canSync returns false, no HTTP call needed
    expect(breaker.canSync()).toBe(false);
    expect(breaker.getState().failures).toBe(3);
  });

  it('transitions to half-open after cooldown', () => {
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();

    expect(breaker.canSync()).toBe(false);

    // Advance time past the 5-minute cooldown
    vi.useFakeTimers();
    vi.advanceTimersByTime(5 * 60 * 1000 + 1);
    expect(breaker.canSync()).toBe(true);
    expect(breaker.getState().state).toBe('half-open');
    vi.useRealTimers();
  });

  it('closes on success in half-open state', () => {
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();

    vi.useFakeTimers();
    vi.advanceTimersByTime(5 * 60 * 1000 + 1);
    breaker.canSync(); // transitions to half-open

    breaker.recordSuccess();
    expect(breaker.getState().state).toBe('closed');
    expect(breaker.getState().failures).toBe(0);
    vi.useRealTimers();
  });

  it('resets via reset()', () => {
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.canSync()).toBe(false);

    breaker.reset();
    expect(breaker.canSync()).toBe(true);
    expect(breaker.getState().state).toBe('closed');
  });
});
