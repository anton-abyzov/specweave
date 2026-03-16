import { describe, it, expect, vi } from 'vitest';
import { withRetry } from '../../../src/core/sync/retry-wrapper.js';

describe('withRetry', () => {
  it('returns result when function succeeds on first call', async () => {
    const fn = vi.fn().mockResolvedValue('ok');

    const result = await withRetry(fn, { maxRetries: 3, baseMs: 10, maxMs: 300 });

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on 5xx errors and resolves on eventual success', async () => {
    const error5xx = Object.assign(new Error('Server Error'), { status: 500 });
    const fn = vi.fn()
      .mockRejectedValueOnce(error5xx)
      .mockRejectedValueOnce(error5xx)
      .mockResolvedValue('success');

    const result = await withRetry(fn, { maxRetries: 3, baseMs: 10, maxMs: 300 });

    expect(fn).toHaveBeenCalledTimes(3);
    expect(result).toBe('success');
  });

  it('throws after exhausting all retries', async () => {
    const error5xx = Object.assign(new Error('Server Error'), { status: 500 });
    const fn = vi.fn().mockRejectedValue(error5xx);

    await expect(
      withRetry(fn, { maxRetries: 3, baseMs: 10, maxMs: 300 })
    ).rejects.toThrow('Server Error');

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does not retry on 4xx errors', async () => {
    const error4xx = Object.assign(new Error('Not Found'), { status: 404 });
    const fn = vi.fn().mockRejectedValue(error4xx);

    await expect(
      withRetry(fn, { maxRetries: 3, baseMs: 10, maxMs: 300 })
    ).rejects.toThrow('Not Found');

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('applies exponential backoff between retries', async () => {
    const delays: number[] = [];
    const originalSetTimeout = globalThis.setTimeout;
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn: Function, ms?: number) => {
      if (ms && ms > 0) delays.push(ms);
      // Execute immediately for test speed
      fn();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });

    const error5xx = Object.assign(new Error('Server Error'), { status: 500 });
    const fn = vi.fn()
      .mockRejectedValueOnce(error5xx)
      .mockRejectedValueOnce(error5xx)
      .mockResolvedValue('ok');

    await withRetry(fn, { maxRetries: 3, baseMs: 100, maxMs: 5000 });

    // First delay: baseMs * 2^0 = 100 (with jitter, so between 50-150)
    // Second delay: baseMs * 2^1 = 200 (with jitter, so between 100-300)
    expect(delays).toHaveLength(2);
    expect(delays[0]).toBeGreaterThanOrEqual(50);
    expect(delays[0]).toBeLessThanOrEqual(150);
    expect(delays[1]).toBeGreaterThanOrEqual(100);
    expect(delays[1]).toBeLessThanOrEqual(300);

    vi.restoreAllMocks();
  });

  it('caps delay at maxMs', async () => {
    const delays: number[] = [];
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn: Function, ms?: number) => {
      if (ms && ms > 0) delays.push(ms);
      fn();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });

    const error5xx = Object.assign(new Error('fail'), { status: 500 });
    const fn = vi.fn()
      .mockRejectedValueOnce(error5xx)
      .mockResolvedValue('ok');

    await withRetry(fn, { maxRetries: 3, baseMs: 1000, maxMs: 50 });

    // Even with baseMs=1000, delay should be capped at maxMs=50
    expect(delays[0]).toBeLessThanOrEqual(50);

    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // T-030: Non-retryable 400 error — called exactly once
  // -------------------------------------------------------------------------
  it('does not retry on 400 Bad Request — called exactly once', async () => {
    const error400 = Object.assign(new Error('Bad Request'), { status: 400 });
    const fn = vi.fn().mockRejectedValue(error400);

    await expect(
      withRetry(fn, { maxRetries: 4, baseMs: 10, maxMs: 300 })
    ).rejects.toThrow('Bad Request');

    expect(fn).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // T-030: 5xx on all 4 attempts — last error thrown, called exactly 4 times
  // -------------------------------------------------------------------------
  it('throws last error after exhausting all 4 retries on persistent 5xx', async () => {
    const error503 = Object.assign(new Error('Service Unavailable'), { status: 503 });
    const fn = vi.fn().mockRejectedValue(error503);

    await expect(
      withRetry(fn, { maxRetries: 4, baseMs: 10, maxMs: 50 })
    ).rejects.toThrow('Service Unavailable');

    expect(fn).toHaveBeenCalledTimes(4);
  });

  it('retries errors without status (network errors)', async () => {
    const networkError = new Error('ECONNRESET');
    const fn = vi.fn()
      .mockRejectedValueOnce(networkError)
      .mockResolvedValue('recovered');

    const result = await withRetry(fn, { maxRetries: 2, baseMs: 10, maxMs: 100 });

    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
