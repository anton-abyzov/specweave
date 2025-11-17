/**
 * Vitest setup file - runs before all tests
 *
 * This file is used to:
 * - Configure global test environment
 * - Register custom matchers
 * - Set up global test utilities
 * - Configure mocks for external dependencies
 */

import { beforeEach, afterEach, expect } from 'vitest';
import './utils/matchers.vitest';

// Mock environment variables for consistent testing
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests

// Suppress console output during tests (unless debugging)
if (!process.env.DEBUG_TESTS) {
  global.console = {
    ...console,
    log: () => {},
    debug: () => {},
    info: () => {},
    warn: () => {},
    // Keep error output for debugging failures
    error: console.error,
  };
}

// Global setup - runs before all tests
beforeEach(() => {
  // Reset any global state if needed
});

// Global teardown - runs after each test
afterEach(() => {
  // Clean up after each test
  // Note: vi.clearAllMocks() should be called in individual test files as needed
});
