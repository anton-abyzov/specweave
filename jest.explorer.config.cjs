/**
 * Jest Configuration for VS Code Test Explorer
 *
 * This config is specifically for the VS Code Jest extension to discover and display ALL tests,
 * including ones that might be temporarily broken or skipped in the main jest.config.cjs.
 *
 * The goal is to give developers full visibility into the test suite, even if some tests
 * are currently failing due to ESM issues, type errors, or other temporary problems.
 *
 * Main differences from jest.config.cjs:
 * - Minimal testPathIgnorePatterns (only node_modules, e2e, and .skip files)
 * - This allows ~140-150 more tests to be visible in Test Explorer
 * - Tests may show as failing, but at least they're visible for debugging
 */

const baseConfig = require('./jest.config.cjs');

module.exports = {
  ...baseConfig,

  // Override testPathIgnorePatterns to show ALL tests except:
  // 1. node_modules (never want these)
  // 2. tests/e2e/ (Playwright tests, handled separately)
  // 3. .skip.test.ts (explicitly skipped files)
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/e2e/',  // Playwright handles these
    '\\.skip\\.test\\.ts$',  // Only skip explicitly marked files
  ],

  // Keep test environment consistent
  testEnvironment: 'node',

  // Don't bail on first failure - show all test results
  bail: false,

  // Run tests serially for better stability in Test Explorer
  runInBand: true,

  // Show verbose output for better debugging
  verbose: false,  // Keep false to avoid cluttering Test Explorer
};
