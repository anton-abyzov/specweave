/**
 * Retry Logic
 *
 * Provides retry functionality with exponential backoff.
 * Handles transient errors (network, rate limits, timeouts).
 *
 * Retry Strategy:
 * - Max 3 retries
 * - Exponential backoff: 1s, 2s, 4s
 * - Special handling for rate limits (wait and retry)
 *
 * @module retry-logic
 */

export interface RetryOptions {
  maxRetries?: number; // Default: 3
  initialDelayMs?: number; // Default: 1000 (1 second)
  maxDelayMs?: number; // Default: 8000 (8 seconds)
  retryableErrors?: string[]; // Error messages/codes to retry
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalDelayMs: number;
}

/**
 * Check if error is retryable
 *
 * @param error - Error to check
 * @returns True if error is retryable
 */
export function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();

  // Network errors
  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('econnreset') ||
    message.includes('enotfound') ||
    message.includes('econnrefused')
  ) {
    return true;
  }

  // Rate limit errors
  if (
    message.includes('rate limit') ||
    message.includes('429') ||
    message.includes('too many requests')
  ) {
    return true;
  }

  // Temporary server errors
  if (
    message.includes('500') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('504')
  ) {
    return true;
  }

  return false;
}

/**
 * Extract rate limit wait time from error
 *
 * @param error - Error that may contain rate limit info
 * @returns Wait time in milliseconds, or null if not rate limit error
 */
export function extractRateLimitWaitTime(error: Error): number | null {
  const message = error.message;

  // GitHub: "Rate limit exceeded. Retry after 60 seconds."
  const githubMatch = message.match(/retry after (\d+) seconds/i);
  if (githubMatch) {
    return parseInt(githubMatch[1]) * 1000;
  }

  // JIRA/ADO: "Rate limit exceeded. Retry-After: 120"
  const retryAfterMatch = message.match(/retry-after:\s*(\d+)/i);
  if (retryAfterMatch) {
    return parseInt(retryAfterMatch[1]) * 1000;
  }

  // Generic rate limit: default wait 60 seconds
  if (message.toLowerCase().includes('rate limit')) {
    return 60 * 1000;
  }

  return null;
}

/**
 * Retry function with exponential backoff
 *
 * @param fn - Function to retry
 * @param options - Retry options
 * @returns Retry result
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<RetryResult<T>> {
  const maxRetries = options?.maxRetries || 3;
  const initialDelay = options?.initialDelayMs || 1000;
  const maxDelay = options?.maxDelayMs || 8000;

  let lastError: Error | undefined;
  let totalDelay = 0;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const result = await fn();
      return {
        success: true,
        result,
        attempts: attempt,
        totalDelayMs: totalDelay
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // If this is the last attempt, don't retry
      if (attempt > maxRetries) {
        break;
      }

      // Check if error is retryable
      if (!isRetryableError(lastError)) {
        // Non-retryable error - fail immediately
        return {
          success: false,
          error: lastError,
          attempts: attempt,
          totalDelayMs: totalDelay
        };
      }

      // Calculate delay
      let delay = initialDelay * Math.pow(2, attempt - 1);

      // Check for rate limit wait time
      const rateLimitWait = extractRateLimitWaitTime(lastError);
      if (rateLimitWait) {
        delay = Math.min(rateLimitWait, maxDelay);
      } else {
        delay = Math.min(delay, maxDelay);
      }

      totalDelay += delay;

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: maxRetries + 1,
    totalDelayMs: totalDelay
  };
}

/**
 * Create error message with retry information
 *
 * @param error - Original error
 * @param attempts - Number of attempts made
 * @returns Enhanced error message
 */
export function createRetryErrorMessage(error: Error, attempts: number): string {
  return `${error.message} (failed after ${attempts} attempts)`;
}

/**
 * Check if error is permanent (not worth retrying)
 *
 * @param error - Error to check
 * @returns True if error is permanent
 */
export function isPermanentError(error: Error): boolean {
  const message = error.message.toLowerCase();

  // Authentication/Authorization errors
  if (
    message.includes('401') ||
    message.includes('403') ||
    message.includes('unauthorized') ||
    message.includes('forbidden')
  ) {
    return true;
  }

  // Not found errors
  if (message.includes('404') || message.includes('not found')) {
    return true;
  }

  // Bad request errors
  if (message.includes('400') || message.includes('bad request')) {
    return true;
  }

  return false;
}
