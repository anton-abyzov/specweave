import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit Tests: Retry Handler
 *
 * Tests retry logic with exponential backoff.
 */

import { RetryHandler, RetryableError } from '../../../src/core/sync/retry-handler.js';

describe('RetryHandler', () => {
  let handler: RetryHandler;

  beforeEach(() => {
    handler = new RetryHandler({
      maxRetries: 3,
      initialDelayMs: 100, // Faster for tests
      maxDelayMs: 1000,
      backoffMultiplier: 2
    });
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await handler.executeWithRetry(operation);

      expect(result.success).toBe(true);
      expect(result.value).toBe('success');
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on network error and eventually succeed', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Network error: ECONNREFUSED'))
        .mockRejectedValueOnce(new Error('Network error: ECONNREFUSED'))
        .mockResolvedValueOnce('success');

      const result = await handler.executeWithRetry(operation);

      expect(result.success).toBe(true);
      expect(result.value).toBe('success');
      expect(result.attempts).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should retry with exponential backoff', async () => {
      const delays: number[] = [];
      const operation = vi.fn().mockImplementation(async () => {
        throw new Error('Server error: 500');
      });

      const startTime = Date.now();
      await handler.executeWithRetry(operation);
      const totalTime = Date.now() - startTime;

      // Expected delays: 100ms, 200ms, 400ms = 700ms total
      expect(totalTime).toBeGreaterThanOrEqual(600);
      expect(totalTime).toBeLessThan(900);
    });

    it('should stop retrying after max attempts', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await handler.executeWithRetry(operation);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Network error');
      expect(result.attempts).toBe(4); // Initial + 3 retries
      expect(operation).toHaveBeenCalledTimes(4);
    });

    it('should not retry non-retryable errors', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Validation failed'));

      const result = await handler.executeWithRetry(operation);

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1); // No retries
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should handle rate limit errors', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Rate limit exceeded: 429'))
        .mockResolvedValueOnce('success');

      const result = await handler.executeWithRetry(operation);

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
    });

    it('should use custom error classifier', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Custom error'))
        .mockResolvedValueOnce('success');

      const customClassifier = (error: Error): RetryableError => {
        return error.message.includes('Custom') ? 'network-error' : 'unknown';
      };

      const result = await handler.executeWithRetry(operation, customClassifier);

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
    });
  });

  describe('Error Classification', () => {
    it('should classify network errors', async () => {
      const errors = [
        new Error('Network error: ECONNREFUSED'),
        new Error('DNS lookup failed: ENOTFOUND'),
        new Error('Connection timeout: ETIMEDOUT')
      ];

      for (const error of errors) {
        const operation = vi.fn()
          .mockRejectedValueOnce(error)
          .mockResolvedValueOnce('success');

        const result = await handler.executeWithRetry(operation);
        expect(result.success).toBe(true); // Should retry
      }
    });

    it('should classify rate limit errors', async () => {
      const errors = [
        new Error('Rate limit exceeded'),
        new Error('429 Too Many Requests'),
        new Error('API rate limit exceeded')
      ];

      for (const error of errors) {
        const operation = vi.fn()
          .mockRejectedValueOnce(error)
          .mockResolvedValueOnce('success');

        const result = await handler.executeWithRetry(operation);
        expect(result.success).toBe(true); // Should retry
      }
    });

    it('should classify server errors', async () => {
      const errors = [
        new Error('500 Internal Server Error'),
        new Error('502 Bad Gateway'),
        new Error('503 Service Unavailable'),
        new Error('504 Gateway Timeout')
      ];

      for (const error of errors) {
        const operation = vi.fn()
          .mockRejectedValueOnce(error)
          .mockResolvedValueOnce('success');

        const result = await handler.executeWithRetry(operation);
        expect(result.success).toBe(true); // Should retry
      }
    });
  });

  describe('Error Messages', () => {
    it('should create clear error message for network error', () => {
      const message = RetryHandler.createErrorMessage(
        new Error('Network error'),
        {
          attempt: 3,
          maxRetries: 3,
          lastError: new Error('Network error'),
          errorType: 'network-error'
        }
      );

      expect(message).toContain('Network error occurred');
      expect(message).toContain('check your internet connection');
      expect(message).toContain('Failed after 3 attempts');
    });

    it('should create clear error message for rate limit', () => {
      const message = RetryHandler.createErrorMessage(
        new Error('Rate limit'),
        {
          attempt: 2,
          maxRetries: 3,
          lastError: new Error('Rate limit'),
          errorType: 'rate-limit'
        }
      );

      expect(message).toContain('Rate limit exceeded');
      expect(message).toContain('wait a few minutes');
    });
  });

  describe('Rate Limit Detection', () => {
    it('should detect GitHub rate limit wait time', () => {
      const error = new Error('API rate limit exceeded. Retry after 60 seconds');
      const waitTime = RetryHandler.detectRateLimitWait(error);

      expect(waitTime).toBe(60);
    });

    it('should detect generic rate limit', () => {
      const error = new Error('429 Too Many Requests');
      const waitTime = RetryHandler.detectRateLimitWait(error);

      expect(waitTime).toBe(60); // Default
    });

    it('should return null for non-rate-limit errors', () => {
      const error = new Error('Generic network error');
      const waitTime = RetryHandler.detectRateLimitWait(error);

      expect(waitTime).toBeNull();
    });
  });

  describe('Delay Calculation', () => {
    it('should calculate exponential backoff delays', () => {
      const handler = new RetryHandler({
        initialDelayMs: 1000,
        backoffMultiplier: 2,
        maxDelayMs: 10000
      });

      // Access private method via any cast for testing
      const delays = [1, 2, 3, 4].map(attempt =>
        (handler as any).calculateDelay(attempt)
      );

      expect(delays).toEqual([1000, 2000, 4000, 8000]);
    });

    it('should cap delay at maximum', () => {
      const handler = new RetryHandler({
        initialDelayMs: 1000,
        backoffMultiplier: 2,
        maxDelayMs: 5000
      });

      const delay = (handler as any).calculateDelay(10); // Would be 512000ms without cap

      expect(delay).toBe(5000);
    });
  });
});
