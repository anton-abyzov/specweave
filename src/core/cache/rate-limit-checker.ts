import { Logger, consoleLogger } from '../../utils/logger.js';

/**
 * Rate limit response headers (JIRA, GitHub, ADO)
 */
export interface RateLimitHeaders {
  remaining?: number; // X-RateLimit-Remaining
  reset?: number; // X-RateLimit-Reset (Unix timestamp)
  retryAfter?: number; // Retry-After (seconds)
}

/**
 * Rate limit check result
 */
export interface RateLimitCheckResult {
  canProceed: boolean;
  reason?: string;
  retryAfter?: number; // seconds
  remaining?: number;
}

/**
 * RateLimitChecker - Detects API rate limits and prevents hitting limits
 *
 * Features:
 * - Parses rate limit headers from JIRA, GitHub, ADO
 * - Handles 429 (Too Many Requests) errors
 * - Suggests using stale cache when rate limit low
 * - Supports exponential backoff
 *
 * Supported headers:
 * - X-RateLimit-Remaining (JIRA Cloud, GitHub)
 * - X-RateLimit-Reset (JIRA Cloud, GitHub)
 * - Retry-After (Standard HTTP, JIRA Server, ADO)
 * - x-ms-ratelimit-remaining (Azure DevOps)
 *
 * Threshold: 10 requests remaining (configurable)
 */
export class RateLimitChecker {
  private logger: Logger;
  private threshold: number;

  constructor(options: { logger?: Logger; threshold?: number } = {}) {
    this.logger = options.logger ?? consoleLogger;
    this.threshold = options.threshold ?? 10; // Default: warn when < 10 requests remaining
  }

  /**
   * Check if safe to proceed with API call based on response headers
   *
   * @param headers Response headers from previous API call
   * @returns RateLimitCheckResult with canProceed flag
   */
  shouldProceed(headers: RateLimitHeaders): RateLimitCheckResult {
    const remaining = headers.remaining;

    // No rate limit headers = assume safe to proceed
    if (remaining === undefined) {
      return { canProceed: true };
    }

    // Low rate limit = use stale cache instead
    if (remaining < this.threshold) {
      const reason = `Rate limit low (${remaining} requests remaining, threshold: ${this.threshold})`;
      this.logger.warn(reason);
      this.logger.warn('Suggestion: Use stale cache to avoid hitting rate limit');

      return {
        canProceed: false,
        reason,
        remaining,
      };
    }

    // Safe to proceed
    return {
      canProceed: true,
      remaining,
    };
  }

  /**
   * Handle 429 (Too Many Requests) error
   *
   * @param error Error object with response headers
   * @returns Promise<void>
   */
  async handleRateLimitError(error: any): Promise<void> {
    const retryAfter = this.extractRetryAfter(error);
    const reset = this.extractReset(error);

    if (retryAfter) {
      this.logger.error(`Rate limit exceeded. Retry after ${retryAfter} seconds.`);
      this.logger.warn('Suggestion: Use stale cache while waiting for rate limit reset');
    } else if (reset) {
      const waitTime = Math.max(0, reset - Date.now() / 1000);
      this.logger.error(`Rate limit exceeded. Reset in ${Math.ceil(waitTime)} seconds.`);
      this.logger.warn('Suggestion: Use stale cache while waiting for rate limit reset');
    } else {
      this.logger.error('Rate limit exceeded (no retry time provided)');
      this.logger.warn('Suggestion: Use stale cache and retry later');
    }
  }

  /**
   * Extract rate limit headers from HTTP response
   *
   * Supports multiple header formats:
   * - JIRA Cloud: X-RateLimit-Remaining, X-RateLimit-Reset
   * - GitHub: X-RateLimit-Remaining, X-RateLimit-Reset
   * - ADO: x-ms-ratelimit-remaining-resource, Retry-After
   * - Standard: Retry-After
   *
   * @param response HTTP response or response-like object
   * @returns RateLimitHeaders object
   */
  extractHeaders(response: any): RateLimitHeaders {
    const headers: RateLimitHeaders = {};

    // Handle different response formats (axios, fetch, etc.)
    const getHeader = (name: string): string | undefined => {
      if (response.headers) {
        // Axios-style headers object
        if (typeof response.headers.get === 'function') {
          return response.headers.get(name) ?? undefined;
        }
        // Plain object headers
        return response.headers[name] ?? response.headers[name.toLowerCase()] ?? undefined;
      }
      return undefined;
    };

    // X-RateLimit-Remaining (JIRA Cloud, GitHub)
    const remaining =
      getHeader('X-RateLimit-Remaining') || getHeader('x-ms-ratelimit-remaining-resource');
    if (remaining) {
      headers.remaining = parseInt(remaining, 10);
    }

    // X-RateLimit-Reset (JIRA Cloud, GitHub)
    const reset = getHeader('X-RateLimit-Reset');
    if (reset) {
      headers.reset = parseInt(reset, 10);
    }

    // Retry-After (Standard HTTP, JIRA Server, ADO)
    const retryAfter = getHeader('Retry-After');
    if (retryAfter) {
      headers.retryAfter = parseInt(retryAfter, 10);
    }

    return headers;
  }

  /**
   * Extract Retry-After from error response
   *
   * @param error Error object
   * @returns Retry-After in seconds, or null
   */
  private extractRetryAfter(error: any): number | null {
    if (error.response?.headers) {
      const retryAfter =
        error.response.headers['Retry-After'] || error.response.headers['retry-after'];
      if (retryAfter) {
        return parseInt(retryAfter, 10);
      }
    }
    return null;
  }

  /**
   * Extract X-RateLimit-Reset from error response
   *
   * @param error Error object
   * @returns Reset timestamp (Unix seconds), or null
   */
  private extractReset(error: any): number | null {
    if (error.response?.headers) {
      const reset =
        error.response.headers['X-RateLimit-Reset'] ||
        error.response.headers['x-ratelimit-reset'];
      if (reset) {
        return parseInt(reset, 10);
      }
    }
    return null;
  }

  /**
   * Check if error is a rate limit error (429 status)
   *
   * @param error Error object
   * @returns True if 429 error
   */
  isRateLimitError(error: any): boolean {
    return error.response?.status === 429 || error.status === 429;
  }
}
