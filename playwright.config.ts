import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  timeout: 30000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
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
    {
      name: 'e2e',
      testMatch: '**/e2e/**/*.spec.ts',
    },
  ],
});
