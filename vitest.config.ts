import { defineConfig } from 'vitest/config';
import path from 'path';
import os from 'os';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // Ensure ~/.local/bin is in PATH for Claude CLI detection tests
    // VSCode debugger doesn't source .zshrc/.bashrc, so PATH may be missing this
    env: {
      PATH: `${os.homedir()}/.local/bin:${process.env.PATH}`,
    },

    // Test file patterns
    include: [
      'tests/unit/**/*.test.ts',
      'tests/integration/**/*.test.ts',
      'tests/performance/**/*.test.ts',
      'tests/plugin-validation/**/*.test.ts',
      'tests/e2e/**/*.test.ts',
      'tests/e2e/**/*.e2e.ts', // E2E test files with .e2e.ts extension
    ],

    // Exclude patterns
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
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
        // Raised from 25% → 40% (2026-02) — target 70% by Q3
        lines: 40,
        functions: 40,
        branches: 40,
        statements: 40,
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
