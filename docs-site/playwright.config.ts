import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3016',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'npm run serve -- --port 3016',
        port: 3016,
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
