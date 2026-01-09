import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  testIgnore: '**/e2e/**',  // E2E tests use Vitest, not Playwright
  timeout: 30000,
  fullyParallel: false,  // Prevent flaky tests
  forbidOnly: !!process.env.CI,
  retries: 2,  // Retry flaky tests
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['list']],  // Multiple reporters
  use: {
    trace: 'on-first-retry',
    video: 'retain-on-failure',  // Keep videos of failures
  },
  // Organize by test type
  projects: [
    {
      name: 'unit',
      testMatch: '**/unit/**/*.spec.ts',
    },
    {
      name: 'integration',
      testMatch: '**/integration/**/*.spec.ts',
    },
  ],
});
