/**
 * Retry wrapper with exponential backoff and jitter.
 *
 * Retries on network errors (no status) and 5xx server errors.
 * Does not retry 4xx client errors (non-retryable).
 */

export interface RetryOptions {
  maxRetries: number;
  baseMs: number;
  maxMs: number;
}

function isRetryable(error: unknown): boolean {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status: number }).status;
    return status >= 500;
  }
  // Network errors (no status) are retryable
  return true;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!isRetryable(error) || attempt === opts.maxRetries - 1) {
        throw error;
      }

      const exponential = opts.baseMs * Math.pow(2, attempt);
      const jitter = 0.5 + Math.random(); // 0.5..1.5
      const wait = Math.min(exponential * jitter, opts.maxMs);
      await delay(wait);
    }
  }

  throw lastError;
}
