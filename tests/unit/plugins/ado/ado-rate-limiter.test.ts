import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdoRateLimiter } from '../../../../plugins/specweave-ado/lib/ado-rate-limiter.js';

describe('AdoRateLimiter', () => {
  let limiter: AdoRateLimiter;

  beforeEach(() => {
    limiter = new AdoRateLimiter({ capacity: 200, windowMs: 60_000 });
  });

  it('allows consumption up to capacity', () => {
    for (let i = 0; i < 200; i++) {
      expect(limiter.consume()).toBe(true);
    }
  });

  it('blocks consumption beyond capacity', () => {
    for (let i = 0; i < 200; i++) {
      limiter.consume();
    }
    expect(limiter.consume()).toBe(false);
  });

  it('refills after the window expires', () => {
    for (let i = 0; i < 200; i++) {
      limiter.consume();
    }
    expect(limiter.consume()).toBe(false);

    // Advance time past the window
    vi.useFakeTimers();
    vi.advanceTimersByTime(60_001);
    expect(limiter.consume()).toBe(true);
    vi.useRealTimers();
  });

  it('returns remaining tokens', () => {
    expect(limiter.remaining()).toBe(200);
    limiter.consume();
    expect(limiter.remaining()).toBe(199);
  });

  it('reports whether bucket is exhausted', () => {
    expect(limiter.isExhausted()).toBe(false);
    for (let i = 0; i < 200; i++) {
      limiter.consume();
    }
    expect(limiter.isExhausted()).toBe(true);
  });

  it('handles Retry-After delay', async () => {
    vi.useFakeTimers();
    limiter.applyRetryAfter(2);
    expect(limiter.consume()).toBe(false);

    vi.advanceTimersByTime(2001);
    expect(limiter.consume()).toBe(true);
    vi.useRealTimers();
  });

  it('uses default capacity of 200 and window of 60s', () => {
    const defaultLimiter = new AdoRateLimiter();
    expect(defaultLimiter.remaining()).toBe(200);
  });
});
