import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CachedRateLimiter } from '../../../../src/core/sync/cached-rate-limiter.js';

describe('CachedRateLimiter', () => {
  let mockCheckRateLimit: ReturnType<typeof vi.fn>;
  let limiter: CachedRateLimiter;

  const makeStatus = (remaining = 4000, limit = 5000) => ({
    remaining,
    limit,
    resetAt: new Date(Date.now() + 3600_000),
    percentUsed: ((limit - remaining) / limit) * 100,
  });

  beforeEach(() => {
    vi.useFakeTimers();
    mockCheckRateLimit = vi.fn().mockResolvedValue(makeStatus());
    limiter = new CachedRateLimiter({ checkRateLimit: mockCheckRateLimit });
  });

  it('calls underlying checkRateLimit on first canProceed', async () => {
    const result = await limiter.canProceed(1);
    expect(mockCheckRateLimit).toHaveBeenCalledTimes(1);
    expect(result.allowed).toBe(true);
  });

  it('returns cached result within 60s TTL', async () => {
    await limiter.canProceed(1);
    expect(mockCheckRateLimit).toHaveBeenCalledTimes(1);

    // 30 seconds later — within TTL
    vi.advanceTimersByTime(30_000);
    await limiter.canProceed(1);
    expect(mockCheckRateLimit).toHaveBeenCalledTimes(1); // no new call
  });

  it('refreshes cache after 60s TTL expires', async () => {
    await limiter.canProceed(1);
    expect(mockCheckRateLimit).toHaveBeenCalledTimes(1);

    // 61 seconds later — TTL expired
    vi.advanceTimersByTime(61_000);
    await limiter.canProceed(1);
    expect(mockCheckRateLimit).toHaveBeenCalledTimes(2);
  });

  it('returns allowed false when estimated calls exceed remaining', async () => {
    mockCheckRateLimit.mockResolvedValue(makeStatus(2, 5000));
    const result = await limiter.canProceed(5);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('remaining');
  });

  it('returns allowed false when percent used exceeds 90%', async () => {
    mockCheckRateLimit.mockResolvedValue(makeStatus(400, 5000)); // 92% used
    const result = await limiter.canProceed(1);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('%');
  });

  it('returns allowed true when sufficient capacity', async () => {
    mockCheckRateLimit.mockResolvedValue(makeStatus(4000, 5000)); // 20% used
    const result = await limiter.canProceed(10);
    expect(result.allowed).toBe(true);
  });

  it('getStatus returns cached status without extra call', async () => {
    await limiter.canProceed(1);
    const status = limiter.getStatus();
    expect(status).not.toBeNull();
    expect(status!.remaining).toBe(4000);
    expect(mockCheckRateLimit).toHaveBeenCalledTimes(1);
  });

  it('getStatus returns null when no cache exists', () => {
    const status = limiter.getStatus();
    expect(status).toBeNull();
  });
});
