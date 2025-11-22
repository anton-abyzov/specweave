import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimitChecker, RateLimitHeaders } from '../../../../src/core/cache/rate-limit-checker.js';
import { silentLogger } from '../../../../src/utils/logger.js';

describe('RateLimitChecker', () => {
  let checker: RateLimitChecker;

  beforeEach(() => {
    checker = new RateLimitChecker({ logger: silentLogger });
  });

  describe('shouldProceed()', () => {
    it('TC-006: should return false when rate limit is low (< 10 remaining)', () => {
      // Given: Low rate limit (5 requests remaining)
      const headers: RateLimitHeaders = {
        remaining: 5,
      };

      // When: shouldProceed is called
      const result = checker.shouldProceed(headers);

      // Then: Should not proceed
      expect(result.canProceed).toBe(false);
      expect(result.reason).toContain('Rate limit low');
      expect(result.remaining).toBe(5);
    });

    it('TC-007: should return true when rate limit is normal (>= 10 remaining)', () => {
      // Given: Normal rate limit (100 requests remaining)
      const headers: RateLimitHeaders = {
        remaining: 100,
      };

      // When: shouldProceed is called
      const result = checker.shouldProceed(headers);

      // Then: Should proceed
      expect(result.canProceed).toBe(true);
      expect(result.remaining).toBe(100);
      expect(result.reason).toBeUndefined();
    });

    it('should return true when no rate limit headers present', () => {
      // Given: No rate limit headers
      const headers: RateLimitHeaders = {};

      // When: shouldProceed is called
      const result = checker.shouldProceed(headers);

      // Then: Should proceed (assume safe)
      expect(result.canProceed).toBe(true);
      expect(result.remaining).toBeUndefined();
    });

    it('should use custom threshold when provided', () => {
      // Given: Custom threshold (20 requests)
      const customChecker = new RateLimitChecker({
        logger: silentLogger,
        threshold: 20,
      });
      const headers: RateLimitHeaders = {
        remaining: 15,
      };

      // When: shouldProceed is called
      const result = customChecker.shouldProceed(headers);

      // Then: Should not proceed (15 < 20)
      expect(result.canProceed).toBe(false);
      expect(result.reason).toContain('Rate limit low');
    });

    it('should return true when rate limit exactly equals threshold', () => {
      // Given: Rate limit exactly at threshold (10 requests)
      const headers: RateLimitHeaders = {
        remaining: 10,
      };

      // When: shouldProceed is called
      const result = checker.shouldProceed(headers);

      // Then: Should proceed (10 >= 10)
      expect(result.canProceed).toBe(true);
    });
  });

  describe('handleRateLimitError()', () => {
    it('TC-008: should handle 429 error with Retry-After header', async () => {
      // Given: 429 error with Retry-After header
      const error = {
        response: {
          status: 429,
          headers: {
            'Retry-After': '60',
          },
        },
      };

      // Spy on logger
      const errorSpy = vi.spyOn(checker['logger'], 'error');
      const warnSpy = vi.spyOn(checker['logger'], 'warn');

      // When: handleRateLimitError is called
      await checker.handleRateLimitError(error);

      // Then: Should log error and suggestion
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('60 seconds'));
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('stale cache'));
    });

    it('should handle 429 error with X-RateLimit-Reset header', async () => {
      // Given: 429 error with X-RateLimit-Reset header (1 minute from now)
      const resetTime = Math.floor(Date.now() / 1000) + 60;
      const error = {
        response: {
          status: 429,
          headers: {
            'X-RateLimit-Reset': resetTime.toString(),
          },
        },
      };

      // Spy on logger
      const errorSpy = vi.spyOn(checker['logger'], 'error');

      // When: handleRateLimitError is called
      await checker.handleRateLimitError(error);

      // Then: Should log reset time
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Reset in'));
    });

    it('should handle 429 error without retry headers', async () => {
      // Given: 429 error with no retry information
      const error = {
        response: {
          status: 429,
          headers: {},
        },
      };

      // Spy on logger
      const errorSpy = vi.spyOn(checker['logger'], 'error');

      // When: handleRateLimitError is called
      await checker.handleRateLimitError(error);

      // Then: Should log generic error
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('no retry time'));
    });
  });

  describe('extractHeaders()', () => {
    it('should extract JIRA Cloud headers (X-RateLimit-Remaining, X-RateLimit-Reset)', () => {
      // Given: JIRA Cloud response with rate limit headers
      const response = {
        headers: {
          'X-RateLimit-Remaining': '100',
          'X-RateLimit-Reset': '1700000000',
        },
      };

      // When: extractHeaders is called
      const headers = checker.extractHeaders(response);

      // Then: Should extract both headers
      expect(headers.remaining).toBe(100);
      expect(headers.reset).toBe(1700000000);
    });

    it('should extract Azure DevOps headers (x-ms-ratelimit-remaining-resource)', () => {
      // Given: ADO response with rate limit headers
      const response = {
        headers: {
          'x-ms-ratelimit-remaining-resource': '50',
          'Retry-After': '30',
        },
      };

      // When: extractHeaders is called
      const headers = checker.extractHeaders(response);

      // Then: Should extract ADO-specific headers
      expect(headers.remaining).toBe(50);
      expect(headers.retryAfter).toBe(30);
    });

    it('should extract standard Retry-After header', () => {
      // Given: Standard HTTP response with Retry-After
      const response = {
        headers: {
          'Retry-After': '120',
        },
      };

      // When: extractHeaders is called
      const headers = checker.extractHeaders(response);

      // Then: Should extract Retry-After
      expect(headers.retryAfter).toBe(120);
      expect(headers.remaining).toBeUndefined();
    });

    it('should handle case-insensitive header names', () => {
      // Given: Response with lowercase header names
      const response = {
        headers: {
          'x-ratelimit-remaining': '75',
          'retry-after': '45',
        },
      };

      // When: extractHeaders is called
      const headers = checker.extractHeaders(response);

      // Then: Should extract headers regardless of case
      expect(headers.remaining).toBe(75);
      expect(headers.retryAfter).toBe(45);
    });

    it('should handle fetch-style headers (headers.get method)', () => {
      // Given: Fetch-style response with headers.get()
      const response = {
        headers: {
          get: (name: string) => {
            const headers: Record<string, string> = {
              'X-RateLimit-Remaining': '200',
            };
            return headers[name] || null;
          },
        },
      };

      // When: extractHeaders is called
      const headers = checker.extractHeaders(response);

      // Then: Should extract using headers.get()
      expect(headers.remaining).toBe(200);
    });

    it('should return empty object when no rate limit headers present', () => {
      // Given: Response without rate limit headers
      const response = {
        headers: {
          'Content-Type': 'application/json',
        },
      };

      // When: extractHeaders is called
      const headers = checker.extractHeaders(response);

      // Then: Should return empty headers
      expect(headers.remaining).toBeUndefined();
      expect(headers.reset).toBeUndefined();
      expect(headers.retryAfter).toBeUndefined();
    });
  });

  describe('isRateLimitError()', () => {
    it('should return true for 429 status in response', () => {
      // Given: Error with 429 status
      const error = {
        response: {
          status: 429,
        },
      };

      // When: isRateLimitError is called
      const result = checker.isRateLimitError(error);

      // Then: Should return true
      expect(result).toBe(true);
    });

    it('should return true for 429 status directly on error', () => {
      // Given: Error with status property
      const error = {
        status: 429,
      };

      // When: isRateLimitError is called
      const result = checker.isRateLimitError(error);

      // Then: Should return true
      expect(result).toBe(true);
    });

    it('should return false for non-429 errors', () => {
      // Given: Error with different status
      const error = {
        response: {
          status: 500,
        },
      };

      // When: isRateLimitError is called
      const result = checker.isRateLimitError(error);

      // Then: Should return false
      expect(result).toBe(false);
    });

    it('should return false for errors without status', () => {
      // Given: Error without status
      const error = {
        message: 'Network error',
      };

      // When: isRateLimitError is called
      const result = checker.isRateLimitError(error);

      // Then: Should return false
      expect(result).toBe(false);
    });
  });
});
