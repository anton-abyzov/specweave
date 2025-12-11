/**
 * Vitest setup file - runs before all tests
 *
 * This file is used to:
 * - Configure global test environment
 * - Register custom matchers
 * - Set up global test utilities
 * - Configure mocks for external dependencies
 */

import { afterEach, vi } from 'vitest';

// Extend Vitest matchers with custom assertions
import './utils/matchers';

// Note: Test timeout is configured in vitest.config.ts (testTimeout: 10000)

// Suppress console output during tests (unless debugging)
if (!process.env.DEBUG_TESTS) {
  global.console = {
    ...console,
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(), // Suppress error output too (tests intentionally trigger errors)
  } as Console;
}

// Mock environment variables for consistent testing
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests

// Suppress stderr output during tests (git errors, etc.)
if (!process.env.DEBUG_TESTS) {
  const originalStderrWrite = process.stderr.write.bind(process.stderr);
  process.stderr.write = ((chunk: any, encoding?: any, callback?: any): boolean => {
    // Suppress common test noise patterns
    const str = chunk.toString();
    if (
      str.includes('fatal: not a git repository') ||
      str.includes('Registry corrupted') ||
      str.includes('Session not found') ||
      str.includes('Circuit breaker OPEN') ||
      str.includes('Lock acquisition timeout') ||
      str.includes('ERROR: Increment') ||
      str.includes('Event handler error')
    ) {
      // Silently discard these expected test errors
      if (typeof callback === 'function') callback();
      return true;
    }
    // Keep other stderr output (actual failures)
    return originalStderrWrite(chunk, encoding, callback);
  }) as typeof process.stderr.write;

  // Suppress stdout progress bars from tests
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((chunk: any, encoding?: any, callback?: any): boolean => {
    const str = chunk.toString();
    // Suppress progress bars and spinner output from tests
    if (
      str.includes('[K') || // ANSI escape codes (clear line)
      str.includes('[=>') || // Progress bar patterns
      str.includes('[==>') ||
      str.includes('[===>') ||
      str.includes('% [') || // Percentage with progress bar
      str.includes('elapsed') ||
      str.includes('remaining') ||
      str.match(/\d+\/\d+.*\[/) || // Pattern: "5/100 ["
      str.includes('All succeeded...') ||
      str.includes('All done...') ||
      str.includes('Fetching projects...') ||
      str.includes('Performance Test...')
    ) {
      // Silently discard progress output
      if (typeof callback === 'function') callback();
      return true;
    }
    // Keep other stdout (vitest reporter output)
    return originalStdoutWrite(chunk, encoding, callback);
  }) as typeof process.stdout.write;
}

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});
