/**
 * Vitest config for UNIT tests only
 *
 * Fast execution - no CLI spawning, no network, no temp directories.
 * Use: npm run test:unit:fast
 */
import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config.ts';

export default defineConfig({
  ...baseConfig,
  test: {
    ...(baseConfig as any).test,
    include: ['tests/unit/**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.e2e.test.ts',
      '**/*.e2e.ts',
    ],
    testTimeout: 5000, // Unit tests should be fast
  },
});
