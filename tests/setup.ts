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
}

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});
