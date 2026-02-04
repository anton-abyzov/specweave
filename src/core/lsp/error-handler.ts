/**
 * LspErrorHandler - Fail-fast error handling with grep fallback
 *
 * @see spec.md US-007: Error Handling
 * @satisfies AC-US7-01, AC-US7-02
 */

/**
 * Grep fallback interface for testing
 */
export interface GrepFallback {
  search(pattern: string, path: string): Promise<GrepResult[]>;
}

/**
 * Result of a grep search
 */
export interface GrepResult {
  file: string;
  line: number;
  match: string;
}

/**
 * Error type classification
 */
export type ErrorType = 'timeout' | 'crash' | 'connection' | 'unknown';

/**
 * Result of error handling
 */
export interface ErrorHandlerResult {
  /** Whether retry was attempted (always false - fail fast) */
  retried: boolean;
  /** User-friendly error message */
  errorMessage: string;
  /** Classified error type */
  errorType: ErrorType;
  /** Suggestion for fixing the issue */
  suggestion?: string;
  /** Whether grep fallback was used */
  usedFallback: boolean;
  /** Results from grep fallback (if used) */
  fallbackResults?: GrepResult[];
}

/**
 * Options for error handling
 */
export interface HandleOptions {
  /** Enable grep fallback on crash */
  enableFallback?: boolean;
  /** Pattern to search for in fallback */
  searchPattern?: string;
  /** Path to search in fallback */
  searchPath?: string;
}

/**
 * Fail-fast error handler for LSP operations
 */
export class LspErrorHandler {
  private readonly grepFallback?: GrepFallback;

  constructor(grepFallback?: GrepFallback) {
    this.grepFallback = grepFallback;
  }

  /**
   * Handle an LSP error with fail-fast behavior
   *
   * @param error - The error that occurred
   * @param options - Handling options
   * @returns Promise resolving to handler result
   */
  async handle(
    error: Error,
    options: HandleOptions = {}
  ): Promise<ErrorHandlerResult> {
    const errorType = this.classifyError(error);
    const errorMessage = this.formatError(error, errorType);
    const suggestion = this.getSuggestion(errorType);

    let usedFallback = false;
    let fallbackResults: GrepResult[] | undefined;

    // Use grep fallback if enabled and crash/timeout
    if (
      options.enableFallback &&
      this.grepFallback &&
      options.searchPattern &&
      options.searchPath &&
      (errorType === 'crash' || errorType === 'timeout')
    ) {
      usedFallback = true;
      fallbackResults = await this.grepFallback.search(
        options.searchPattern,
        options.searchPath
      );
    }

    return {
      retried: false, // Fail fast - never retry
      errorMessage,
      errorType,
      suggestion,
      usedFallback,
      fallbackResults,
    };
  }

  private classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase();

    if (
      message.includes('timeout') ||
      message.includes('etimedout') ||
      message.includes('timed out')
    ) {
      return 'timeout';
    }

    if (
      message.includes('crash') ||
      message.includes('exited') ||
      message.includes('process')
    ) {
      return 'crash';
    }

    if (
      message.includes('econnrefused') ||
      message.includes('connection') ||
      message.includes('refused')
    ) {
      return 'connection';
    }

    return 'unknown';
  }

  private formatError(error: Error, type: ErrorType): string {
    switch (type) {
      case 'timeout':
        return `LSP operation timed out: ${error.message}`;
      case 'crash':
        return `LSP server crashed: ${error.message}`;
      case 'connection':
        return `Failed to connect to LSP server: ${error.message}`;
      default:
        return `LSP error: ${error.message}`;
    }
  }

  private getSuggestion(type: ErrorType): string | undefined {
    switch (type) {
      case 'timeout':
        return 'Try increasing the timeout in .specweave/config.json (lsp.timeout)';
      case 'crash':
        return 'Run `specweave lsp doctor` to diagnose server issues';
      case 'connection':
        return 'Ensure the LSP server is installed and in your PATH';
      default:
        return undefined;
    }
  }
}
