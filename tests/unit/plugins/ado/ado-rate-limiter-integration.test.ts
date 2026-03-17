import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdoRateLimiter } from '../../../../plugins/specweave/lib/integrations/ado/ado-rate-limiter.js';

describe('AdoRateLimiter — client integration', () => {
  it('1 token left → consumed → next consume returns false', () => {
    const limiter = new AdoRateLimiter({ capacity: 1, windowMs: 60_000 });

    // First call consumes the last token
    expect(limiter.consume()).toBe(true);
    expect(limiter.remaining()).toBe(0);

    // Next call blocked — simulates what AdoClient.request() checks
    expect(limiter.consume()).toBe(false);
  });

  it('429 with Retry-After blocks for specified duration then allows', () => {
    vi.useFakeTimers();

    const limiter = new AdoRateLimiter({ capacity: 10, windowMs: 60_000 });

    // Simulate ADO 429 with Retry-After: 2
    limiter.applyRetryAfter(2);
    expect(limiter.consume()).toBe(false);

    // After ~2 seconds, should unblock
    vi.advanceTimersByTime(2001);
    expect(limiter.consume()).toBe(true);

    vi.useRealTimers();
  });

  it('window rollover refills all tokens', () => {
    vi.useFakeTimers();

    const limiter = new AdoRateLimiter({ capacity: 5, windowMs: 10_000 });

    // Consume all
    for (let i = 0; i < 5; i++) limiter.consume();
    expect(limiter.remaining()).toBe(0);
    expect(limiter.consume()).toBe(false);

    // Roll window
    vi.advanceTimersByTime(10_001);

    // All tokens refilled
    expect(limiter.remaining()).toBe(5);
    expect(limiter.consume()).toBe(true);

    vi.useRealTimers();
  });

  it('AdoClient constructor accepts rateLimiter config', async () => {
    // Import dynamically to avoid https mock issues
    const { AdoClient } = await import('../../../../plugins/specweave/lib/integrations/ado/ado-client.js');

    const limiter = new AdoRateLimiter({ capacity: 200 });
    const client = new AdoClient({
      organization: 'myorg',
      project: 'myproject',
      personalAccessToken: 'fake-pat',
      rateLimiter: limiter,
    });

    // Client should construct without error and accept rate limiter
    expect(client).toBeDefined();
  });

  it('exhausted limiter causes AdoClient.request to throw before HTTP call', async () => {
    const { AdoClient } = await import('../../../../plugins/specweave/lib/integrations/ado/ado-client.js');

    const limiter = new AdoRateLimiter({ capacity: 0, windowMs: 60_000 });
    const client = new AdoClient({
      organization: 'myorg',
      project: 'myproject',
      personalAccessToken: 'fake-pat',
      rateLimiter: limiter,
    });

    // Rate limiter already exhausted — request should throw before HTTP
    await expect(client.getWorkItem(1)).rejects.toThrow(/rate limit/i);
  });
});
