import { defineConfig } from 'vitest/config';
import path from 'path';
import os from 'os';
import { readFileSync } from 'fs';

function loadCoverageThresholds(): { lines: number; functions: number; branches: number; statements: number } {
  const fallback = { lines: 38, functions: 46, branches: 33, statements: 38 };
  try {
    const raw = readFileSync('.specweave/config.json', 'utf-8');
    const config = JSON.parse(raw);
    const unit = config?.testing?.coverageTargets?.unit;
    if (typeof unit === 'number') {
      // branches coverage is harder to achieve than line/function coverage;
      // apply a -10pt margin to avoid false build failures
      return { lines: unit, functions: unit, branches: Math.max(unit - 10, 0), statements: unit };
    }
    return fallback;
  } catch {
    return fallback;
  }
}

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
      'plugins/specweave/.lint/**/*.test.ts', // Plugin lint tests (0669 Wave 3)
      'src/**/*.test.ts', // Co-located unit tests (0669 Wave 5)
    ],

    // Exclude patterns
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
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
        // Thresholds loaded from .specweave/config.json (testing.coverageTargets.unit)
        // Fallback: lines 38, functions 46, branches 33, statements 38
        ...loadCoverageThresholds(),
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
