import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // Test file patterns
    include: [
      'tests/unit/**/*.test.ts',
      'tests/integration/**/*.test.ts',
      'tests/performance/**/*.test.ts',
    ],

    // Exclude patterns
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/tests/e2e/**', // E2E tests run with Playwright
      '**/*.skip.test.ts', // Skip tests with .skip.test.ts extension
      '**/plugins/**/lib/hooks/**', // Exclude hook TypeScript files (not tests!)
    ],

    // Global setup/teardown
    setupFiles: ['./tests/setup.ts'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/index.ts',
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
      ],
      thresholds: {
        lines: 60,
        functions: 50,
        branches: 45,
        statements: 60,
      },
    },

    // Timeout for tests
    testTimeout: 10000,

    // Globals (if needed for compatibility)
    globals: false, // We'll use explicit imports

    // Reporter
    reporter: 'default',
  },

  // Path resolution (equivalent to Jest's moduleNameMapper)
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Handle .js imports pointing to .ts files (ESM compatibility)
      '^(\\.{1,2}/.*)\\.js$': '$1',
    },
  },
});
