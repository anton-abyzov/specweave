import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // Test file patterns - E2E tests only
    include: [
      'tests/e2e/**/*.test.ts',
    ],

    // Exclude patterns
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.skip.test.ts',
    ],

    // Global setup/teardown
    setupFiles: ['./tests/setup.vitest.ts'],

    // Timeout for E2E tests (longer than unit/integration)
    testTimeout: 60000, // 60 seconds for E2E workflows

    // Globals
    globals: false,

    // Reporter
    reporter: 'verbose',
  },

  // Path resolution
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '^(\\.{1,2}/.*)\\.js$': '$1',
    },
  },
});
