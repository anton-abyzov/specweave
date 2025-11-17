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
    // Keep error output for debugging failures
    error: console.error,
  };
}

// Mock environment variables for consistent testing
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});
