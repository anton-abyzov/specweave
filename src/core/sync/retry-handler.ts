/**
 * Retry Handler for Status Sync
 *
 * Implements exponential backoff retry logic for handling transient failures
 * in external API calls (GitHub, JIRA, Azure DevOps).
 *
 * Features:
 * - Exponential backoff (1s, 2s, 4s, 8s)
 * - Maximum retry attempts (default: 3)
 * - Rate limit detection and handling
 * - Clear error messages
 *
 * @module retry-handler
 */

export type RetryableError =
  | 'network-error'
  | 'rate-limit'
  | 'server-error'
  | 'timeout'
  | 'unknown';

export interface RetryConfig {
  maxRetries?: number; // Default: 3
  initialDelayMs?: number; // Default: 1000 (1 second)
  maxDelayMs?: number; // Default: 8000 (8 seconds)
  backoffMultiplier?: number; // Default: 2 (exponential)
}

export interface RetryContext {
  attempt: number;
  maxRetries: number;
  lastError: Error;
  errorType: RetryableError;
}

export interface RetryResult<T> {
  success: boolean;
  value?: T;
  error?: Error;
  attempts: number;
  totalDelay: number;
}

/**
 * Retry Handler
 *
 * Handles retries with exponential backoff for external API calls.
 */
export class RetryHandler {
  private config: Required<RetryConfig>;

  constructor(config: RetryConfig = {}) {
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      initialDelayMs: config.initialDelayMs ?? 1000,
      maxDelayMs: config.maxDelayMs ?? 8000,
      backoffMultiplier: config.backoffMultiplier ?? 2
    };
  }

  /**
   * Execute operation with retry logic
   *
   * @param operation - Async operation to execute
   * @param errorClassifier - Function to classify errors (determines if retryable)
   * @returns Retry result with value or error
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    errorClassifier?: (error: Error) => RetryableError
  ): Promise<RetryResult<T>> {
    let attempt = 0;
    let totalDelay = 0;
    let lastError: Error | undefined;

    while (attempt <= this.config.maxRetries) {
      try {
        const value = await operation();

        return {
          success: true,
          value,
          attempts: attempt + 1,
          totalDelay
        };
      } catch (error) {
        lastError = error as Error;
        attempt++;

        // Classify error
        const errorType = errorClassifier
          ? errorClassifier(lastError)
          : this.classifyError(lastError);

        // Check if we should retry
        if (!this.isRetryable(errorType) || attempt > this.config.maxRetries) {
          return {
            success: false,
            error: lastError,
            attempts: attempt,
            totalDelay
          };
        }

        // Calculate delay for next retry
        const delay = this.calculateDelay(attempt);
        totalDelay += delay;

        // Wait before retrying
        await this.delay(delay);
      }
    }

    // Should not reach here, but TypeScript needs this
    return {
      success: false,
      error: lastError ?? new Error('Unknown error'),
      attempts: attempt,
      totalDelay
    };
  }

  /**
   * Classify error type
   *
   * @param error - Error to classify
   * @returns Error type
   */
  private classifyError(error: Error): RetryableError {
    const message = error.message.toLowerCase();

    // Network errors (retry)
    if (
      message.includes('network') ||
      message.includes('econnrefused') ||
      message.includes('enotfound') ||
      message.includes('etimedout')
    ) {
      return 'network-error';
    }

    // Rate limit errors (retry with longer delay)
    if (
      message.includes('rate limit') ||
      message.includes('429') ||
      message.includes('too many requests')
    ) {
      return 'rate-limit';
    }

    // Server errors (retry)
    if (
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504') ||
      message.includes('internal server error')
    ) {
      return 'server-error';
    }

    // Timeout errors (retry)
    if (message.includes('timeout')) {
      return 'timeout';
    }

    // Unknown errors (don't retry by default)
    return 'unknown';
  }

  /**
   * Check if error type is retryable
   *
   * @param errorType - Error type
   * @returns True if retryable
   */
  private isRetryable(errorType: RetryableError): boolean {
    return errorType !== 'unknown';
  }

  /**
   * Calculate delay for retry attempt
   *
   * Uses exponential backoff: initialDelay * (multiplier ^ (attempt - 1))
   *
   * @param attempt - Current attempt number (1-based)
   * @returns Delay in milliseconds
   */
  private calculateDelay(attempt: number): number {
    const delay =
      this.config.initialDelayMs *
      Math.pow(this.config.backoffMultiplier, attempt - 1);

    // Cap at max delay
    return Math.min(delay, this.config.maxDelayMs);
  }

  /**
   * Delay execution
   *
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create clear error message for user
   *
   * @param error - Original error
   * @param context - Retry context
   * @returns User-friendly error message
   */
  static createErrorMessage(error: Error, context: RetryContext): string {
    const messages: Record<RetryableError, string> = {
      'network-error': `Network error occurred. Please check your internet connection and try again.`,
      'rate-limit': `Rate limit exceeded for external API. Please wait a few minutes and try again.`,
      'server-error': `External service is experiencing issues. Please try again later.`,
      'timeout': `Request timed out. Please check your connection and try again.`,
      'unknown': `An unexpected error occurred: ${error.message}`
    };

    const baseMessage = messages[context.errorType];

    if (context.attempt >= context.maxRetries) {
      return `${baseMessage}\n\nFailed after ${context.attempt} attempts.`;
    }

    return baseMessage;
  }

  /**
   * Handle rate limit error
   *
   * Detects rate limit from error and calculates wait time.
   *
   * @param error - Error that may contain rate limit info
   * @returns Wait time in seconds (null if not rate limit)
   */
  static detectRateLimitWait(error: Error): number | null {
    const message = error.message;

    // GitHub rate limit format: "API rate limit exceeded. Retry after 60 seconds"
    const githubMatch = message.match(/retry after (\d+) seconds/i);
    if (githubMatch) {
      return parseInt(githubMatch[1], 10);
    }

    // JIRA rate limit (typically in headers, but may be in error message)
    const jiraMatch = message.match(/retry after (\d+)/i);
    if (jiraMatch) {
      return parseInt(jiraMatch[1], 10);
    }

    // Generic 429 error - default to 60 seconds
    if (message.includes('429') || message.toLowerCase().includes('rate limit')) {
      return 60;
    }

    return null;
  }
}
