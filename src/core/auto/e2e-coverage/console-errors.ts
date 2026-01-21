/**
 * Console Errors
 *
 * Parses console errors from E2E test output.
 *
 * @module core/auto/e2e-coverage/console-errors
 * @since v1.0.115
 */

import type { ConsoleError, ConsoleErrorResult } from './types.js';

/**
 * Parse console errors from E2E test output
 *
 * Looks for patterns like:
 * - "console.error: ..."
 * - "Uncaught Error: ..."
 * - "Error: ..." in page console
 *
 * @param output - Test output (stdout/stderr combined)
 * @param excludePatterns - Patterns to exclude (expected errors)
 * @returns Parsed console errors
 */
export function parseConsoleErrors(
  output: string,
  excludePatterns: RegExp[] = []
): ConsoleErrorResult {
  const errors: ConsoleError[] = [];
  const warnings: ConsoleError[] = [];
  const uncaughtExceptions: ConsoleError[] = [];

  // Default exclusions for expected/handled errors
  const defaultExclusions = [
    /Download the React DevTools/i,
    /React does not recognize the/i,
    /Warning: Each child in a list should have/i,
    /Failed to load resource.*favicon/i,
    /Source map warning/i,
    /\[HMR\]/i,
    /hot.*reload/i,
    /@fs/i, // Vite dev server
    /WebSocket connection/i, // Dev server
    /Compiled successfully/i,
    /Download the Apollo DevTools/i,
  ];

  const allExclusions = [...defaultExclusions, ...excludePatterns];

  const isExcluded = (msg: string): boolean => {
    return allExclusions.some((pattern) => pattern.test(msg));
  };

  // Pattern 1: Playwright console listener output
  // Format: console.error: Error message here
  // Or: console.error Error message here
  const lines = output.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();

    // console.error pattern
    const errorMatch = trimmed.match(/^console\.error[:\s]+(.+)/i);
    if (errorMatch) {
      const message = errorMatch[1].trim();
      if (!isExcluded(message) && !errors.find((e) => e.message === message)) {
        errors.push({ type: 'error', message });
      }
    }

    // console.warn pattern
    const warnMatch = trimmed.match(/^console\.warn[:\s]+(.+)/i);
    if (warnMatch) {
      const message = warnMatch[1].trim();
      if (!isExcluded(message) && !warnings.find((w) => w.message === message)) {
        warnings.push({ type: 'warn', message });
      }
    }

    // Uncaught exception pattern
    const uncaughtMatch = trimmed.match(/^(?:Uncaught|unhandled)\s+(?:Error|Exception|TypeError|ReferenceError)[:\s]+(.+)/i);
    if (uncaughtMatch) {
      const message = uncaughtMatch[1].trim();
      if (!isExcluded(message) && !uncaughtExceptions.find((e) => e.message === message)) {
        uncaughtExceptions.push({ type: 'uncaught', message });
      }
    }
  }

  let match;

  // Pattern 4: Page error event (Playwright)
  const pageErrorPattern = /page\.on\(['"](?:page)?error['"]\).*?[:\s]+(.+?)(?=\n|$)/gi;
  while ((match = pageErrorPattern.exec(output)) !== null) {
    const message = match[1].trim();
    if (!isExcluded(message)) {
      errors.push({ type: 'error', message, source: 'page' });
    }
  }

  // Pattern 5: React error boundaries
  const errorBoundaryPattern = /Error\s+caught\s+by\s+(?:Error\s*)?Boundary[:\s]+(.+?)(?=\n|$)/gi;
  while ((match = errorBoundaryPattern.exec(output)) !== null) {
    const message = match[1].trim();
    if (!isExcluded(message)) {
      errors.push({ type: 'error', message, source: 'ErrorBoundary' });
    }
  }

  // Pattern 6: General "Error:" in page console (Playwright traces)
  const traceErrorPattern = /\[page\].*?Error:\s*(.+?)(?=\n|$)/gi;
  while ((match = traceErrorPattern.exec(output)) !== null) {
    const message = match[1].trim();
    if (!isExcluded(message) && !errors.find((e) => e.message === message)) {
      errors.push({ type: 'error', message, source: 'page' });
    }
  }

  return {
    errors,
    warnings,
    uncaughtExceptions,
    total: errors.length + uncaughtExceptions.length,
  };
}

/**
 * Check if console errors should block completion
 *
 * @param result - Console error parsing result
 * @param config - Configuration
 * @returns Whether to block and reason
 */
export function shouldBlockOnConsoleErrors(
  result: ConsoleErrorResult,
  config: {
    blockOnErrors?: boolean;
    blockOnUncaught?: boolean;
    maxErrors?: number;
  } = {}
): { block: boolean; reason: string } {
  const { blockOnErrors = true, blockOnUncaught = true, maxErrors = 0 } = config;

  if (blockOnUncaught && result.uncaughtExceptions.length > 0) {
    return {
      block: true,
      reason: `${result.uncaughtExceptions.length} uncaught exception(s) in browser console`,
    };
  }

  if (blockOnErrors && result.errors.length > 0) {
    return {
      block: true,
      reason: `${result.errors.length} console error(s) in browser`,
    };
  }

  if (maxErrors > 0 && result.total > maxErrors) {
    return {
      block: true,
      reason: `${result.total} console errors exceed limit of ${maxErrors}`,
    };
  }

  return { block: false, reason: 'No blocking console errors' };
}
