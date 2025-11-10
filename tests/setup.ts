/**
 * Jest setup file - runs before all tests
 *
 * This file is used to:
 * - Configure global test environment
 * - Register custom matchers
 * - Set up global test utilities
 * - Configure mocks for external dependencies
 */

// Extend Jest matchers with custom assertions
import './utils/matchers';

// Set longer timeout for integration tests
jest.setTimeout(10000);

// Suppress console output during tests (unless debugging)
if (!process.env.DEBUG_TESTS) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    // Keep error output for debugging failures
    error: console.error,
  };
}

// Mock environment variables for consistent testing
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
