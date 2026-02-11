/**
 * Vitest config for E2E and CLI integration tests
 *
 * Slower execution - spawns CLI processes, uses temp directories.
 * Worker count is reduced to prevent resource conflicts.
 * Use: npm run test:e2e or npm run test:e2e:cli
 */
import os from 'node:os';
import { defineConfig } from 'vitest/config';
import path from 'path';

const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const cpuCount = os.cpus().length;
const e2eWorkers = isCI ? 2 : Math.min(4, Math.max(1, Math.floor(cpuCount * 0.25)));

export default defineConfig({
  test: {
    environment: 'node',

    env: {
      PATH: `${os.homedir()}/.local/bin:${process.env.PATH}`,
    },

    maxWorkers: e2eWorkers,

    include: [
      'tests/e2e/**/*.e2e.ts',
      'tests/e2e/**/*.e2e.test.ts',
      'tests/e2e/**/*.test.ts',
      'tests/integration/core/cli-commands.test.ts',
    ],

    exclude: ['**/node_modules/**', '**/dist/**'],

    setupFiles: ['./tests/setup.ts'],

    testTimeout: 30000, // CLI spawning needs longer timeout

    globals: false,

    reporter: 'verbose',
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '^(\\.{1,2}/.*)\\.js$': '$1',
    },
  },
});
