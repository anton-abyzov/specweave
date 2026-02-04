---
name: e2e-setup
description: Set up comprehensive Playwright E2E testing with best practices, page objects, and CI/CD integration.
---

# /sw-testing:e2e-setup

Set up comprehensive Playwright E2E testing with best practices, page objects, and CI/CD integration.

You are an expert E2E testing engineer who implements production-ready Playwright test suites.

## Your Task

Set up a complete Playwright E2E testing framework with page objects, fixtures, and testing patterns.

### 1. Playwright Stack Features

**Cross-Browser Testing**:
- Chromium, Firefox, WebKit support
- Mobile viewport emulation
- Device-specific testing (iPhone, Pixel, etc.)
- Browser context isolation
- Persistent state management

**Reliability Features**:
- Auto-wait for elements
- Network idle detection
- Retry mechanisms
- Screenshot/video on failure
- Trace recording for debugging

**Performance**:
- Parallel test execution
- Sharding for CI/CD
- Browser reuse
- Worker threads
- Test isolation

### 2. Advanced Playwright Configuration

**playwright.config.ts** (Production-Grade):
```typescript
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['github'], // GitHub Actions annotations
  ],

  use: {
    // Base URL for navigation
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    // Tracing and debugging
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Timeouts
    actionTimeout: 10000,
    navigationTimeout: 30000,

    // Browser options
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,

    // Collect HTTP Archive (HAR) files
    recordHar: process.env.CI ? undefined : { path: 'test-results/har' },
  },

  // Test timeout
  timeout: 30000,

  // Global setup/teardown
  globalSetup: require.resolve('./tests/e2e/global-setup.ts'),
  globalTeardown: require.resolve('./tests/e2e/global-teardown.ts'),

  projects: [
    // Setup project for authentication
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // Desktop browsers
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // Mobile browsers
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 12'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // Branded browsers
    {
      name: 'edge',
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],

  // Web server configuration
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
```

### 3. Page Object Model (POM)

**tests/e2e/pages/BasePage.ts**:
```typescript
import { Page, Locator } from '@playwright/test';

export abstract class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Common navigation
  async goto(path: string) {
    await this.page.goto(path);
  }

  // Wait helpers
  async waitForNetworkIdle() {
    await this.page.waitForLoadState('networkidle');
  }

  async waitForDomContentLoaded() {
    await this.page.waitForLoadState('domcontentloaded');
  }

  // Screenshot helpers
  async takeScreenshot(name: string) {
    await this.page.screenshot({
      path: `test-results/screenshots/${name}.png`,
      fullPage: true,
    });
  }

  // Cookie helpers
  async getCookies() {
    return await this.page.context().cookies();
  }

  async setCookies(cookies: any[]) {
    await this.page.context().addCookies(cookies);
  }

  // Local storage helpers
  async getLocalStorage(key: string): Promise<string | null> {
    return await this.page.evaluate((key) => {
      return localStorage.getItem(key);
    }, key);
  }

  async setLocalStorage(key: string, value: string) {
    await this.page.evaluate(({ key, value }) => {
      localStorage.setItem(key, value);
    }, { key, value });
  }

  // Common assertions
  async assertUrl(expectedUrl: string) {
    await this.page.waitForURL(expectedUrl);
  }

  async assertTitle(expectedTitle: string) {
    await this.page.waitForFunction(
      (title) => document.title === title,
      expectedTitle
    );
  }
}
```

**tests/e2e/pages/LoginPage.ts**:
```typescript
import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  // Locators
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;
  readonly rememberMeCheckbox: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator('input[name="email"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.loginButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('[role="alert"]');
    this.rememberMeCheckbox = page.locator('input[name="rememberMe"]');
    this.forgotPasswordLink = page.locator('a[href="/forgot-password"]');
  }

  // Actions
  async navigate() {
    await this.goto('/login');
  }

  async login(email: string, password: string, rememberMe = false) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);

    if (rememberMe) {
      await this.rememberMeCheckbox.check();
    }

    await this.loginButton.click();
  }

  async loginAsAdmin() {
    await this.login(
      process.env.ADMIN_EMAIL || 'admin@example.com',
      process.env.ADMIN_PASSWORD || 'admin123'
    );
  }

  async loginAsUser() {
    await this.login(
      process.env.USER_EMAIL || 'user@example.com',
      process.env.USER_PASSWORD || 'user123'
    );
  }

  // Assertions
  async assertErrorMessage(expectedMessage: string) {
    await expect(this.errorMessage).toContainText(expectedMessage);
  }

  async assertLoginSuccessful() {
    await this.page.waitForURL(/\/(dashboard|home)/);
  }

  async assertOnLoginPage() {
    await expect(this.page).toHaveURL(/\/login/);
  }
}
```

**tests/e2e/pages/DashboardPage.ts**:
```typescript
import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  readonly welcomeMessage: Locator;
  readonly userMenu: Locator;
  readonly logoutButton: Locator;
  readonly notificationBadge: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    super(page);
    this.welcomeMessage = page.locator('h1');
    this.userMenu = page.locator('[data-testid="user-menu"]');
    this.logoutButton = page.locator('button:has-text("Logout")');
    this.notificationBadge = page.locator('[data-testid="notification-badge"]');
    this.searchInput = page.locator('input[placeholder="Search..."]');
  }

  async navigate() {
    await this.goto('/dashboard');
  }

  async logout() {
    await this.userMenu.click();
    await this.logoutButton.click();
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
  }

  async getNotificationCount(): Promise<number> {
    const text = await this.notificationBadge.textContent();
    return parseInt(text || '0', 10);
  }

  async assertWelcomeMessage(username: string) {
    await expect(this.welcomeMessage).toContainText(`Welcome, ${username}`);
  }

  async assertOnDashboard() {
    await expect(this.page).toHaveURL(/\/dashboard/);
  }
}
```

### 4. Custom Fixtures

**tests/e2e/fixtures/auth.fixture.ts**:
```typescript
import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

type AuthFixtures = {
  authenticatedPage: Page;
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.loginAsUser();
    await use(page);
  },

  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },
});

export { expect } from '@playwright/test';
```

**tests/e2e/fixtures/api.fixture.ts**:
```typescript
import { test as base, APIRequestContext } from '@playwright/test';

type ApiFixtures = {
  apiContext: APIRequestContext;
};

export const test = base.extend<ApiFixtures>({
  apiContext: async ({ playwright }, use) => {
    const context = await playwright.request.newContext({
      baseURL: process.env.API_BASE_URL || 'http://localhost:3000/api',
      extraHTTPHeaders: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    await use(context);
    await context.dispose();
  },
});

export { expect } from '@playwright/test';
```

### 5. Global Setup and Teardown

**tests/e2e/global-setup.ts**:
```typescript
import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';

async function globalSetup(config: FullConfig) {
  const { baseURL, storageState } = config.projects[0].use;

  // Create auth directory
  const authDir = path.dirname(storageState as string);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Launch browser and authenticate
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to login
    await page.goto(`${baseURL}/login`);

    // Perform login
    await page.fill('input[name="email"]', process.env.USER_EMAIL || 'test@example.com');
    await page.fill('input[name="password"]', process.env.USER_PASSWORD || 'password123');
    await page.click('button[type="submit"]');

    // Wait for successful login
    await page.waitForURL(/\/(dashboard|home)/);

    // Save authentication state
    await context.storageState({ path: storageState as string });

    console.log('✓ Global setup: Authentication completed');
  } catch (error) {
    console.error('✗ Global setup: Authentication failed', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
```

**tests/e2e/global-teardown.ts**:
```typescript
import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  try {
    // Clean up auth state
    const authDir = 'playwright/.auth';
    if (fs.existsSync(authDir)) {
      fs.rmSync(authDir, { recursive: true });
      console.log('✓ Global teardown: Cleaned auth state');
    }

    // Clean up test artifacts if not in CI
    if (!process.env.CI) {
      const artifactDirs = ['test-results', 'playwright-report'];
      artifactDirs.forEach(dir => {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          console.log(`✓ Global teardown: ${dir} contains ${files.length} files`);
        }
      });
    }
  } catch (error) {
    console.error('✗ Global teardown: Cleanup failed', error);
  }
}

export default globalTeardown;
```

### 6. Authentication Setup Tests

**tests/e2e/auth.setup.ts**:
```typescript
import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login');

  // Perform login
  await page.fill('input[name="email"]', process.env.USER_EMAIL || 'test@example.com');
  await page.fill('input[name="password"]', process.env.USER_PASSWORD || 'password123');
  await page.click('button[type="submit"]');

  // Wait for successful navigation
  await page.waitForURL(/\/(dashboard|home)/);

  // Verify authentication succeeded
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

  // Save signed-in state
  await page.context().storageState({ path: authFile });
});

setup('admin authenticate', async ({ page }) => {
  await page.goto('/login');

  await page.fill('input[name="email"]', process.env.ADMIN_EMAIL || 'admin@example.com');
  await page.fill('input[name="password"]', process.env.ADMIN_PASSWORD || 'admin123');
  await page.click('button[type="submit"]');

  await page.waitForURL(/\/(dashboard|admin)/);
  await expect(page.locator('[data-testid="admin-menu"]')).toBeVisible();

  await page.context().storageState({
    path: path.join(__dirname, '../../playwright/.auth/admin.json')
  });
});
```

### 7. Test Utilities

**tests/e2e/utils/test-helpers.ts**:
```typescript
import { Page, expect } from '@playwright/test';

export class TestHelpers {
  static async waitForApiResponse(page: Page, urlPattern: string | RegExp, timeout = 5000) {
    return await page.waitForResponse(
      response => {
        const url = response.url();
        const matches = typeof urlPattern === 'string'
          ? url.includes(urlPattern)
          : urlPattern.test(url);
        return matches && response.status() === 200;
      },
      { timeout }
    );
  }

  static async interceptApi(page: Page, urlPattern: string | RegExp, mockResponse: any) {
    await page.route(urlPattern, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponse),
      });
    });
  }

  static async blockRequests(page: Page, resourceTypes: string[]) {
    await page.route('**/*', route => {
      if (resourceTypes.includes(route.request().resourceType())) {
        route.abort();
      } else {
        route.continue();
      }
    });
  }

  static async mockGeolocation(page: Page, latitude: number, longitude: number) {
    await page.context().setGeolocation({ latitude, longitude });
    await page.context().grantPermissions(['geolocation']);
  }

  static async fillForm(page: Page, formData: Record<string, string>) {
    for (const [name, value] of Object.entries(formData)) {
      await page.fill(`[name="${name}"]`, value);
    }
  }

  static async selectDropdown(page: Page, selector: string, value: string) {
    await page.selectOption(selector, value);
  }

  static async uploadFile(page: Page, selector: string, filePath: string) {
    await page.setInputFiles(selector, filePath);
  }

  static async scrollToElement(page: Page, selector: string) {
    await page.locator(selector).scrollIntoViewIfNeeded();
  }

  static async assertAccessibility(page: Page) {
    // Basic accessibility checks
    const violations = await page.evaluate(() => {
      const issues: string[] = [];

      // Check for alt text on images
      document.querySelectorAll('img').forEach(img => {
        if (!img.alt) {
          issues.push(`Image missing alt text: ${img.src}`);
        }
      });

      // Check for form labels
      document.querySelectorAll('input, textarea, select').forEach(input => {
        const id = input.getAttribute('id');
        if (id && !document.querySelector(`label[for="${id}"]`)) {
          issues.push(`Form element missing label: ${id}`);
        }
      });

      return issues;
    });

    expect(violations).toHaveLength(0);
  }
}
```

**tests/e2e/utils/mock-data.ts**:
```typescript
export const mockUsers = [
  {
    id: '1',
    email: 'john@example.com',
    name: 'John Doe',
    role: 'user',
  },
  {
    id: '2',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
  },
];

export const mockProducts = [
  {
    id: '1',
    name: 'Product A',
    price: 29.99,
    inStock: true,
  },
  {
    id: '2',
    name: 'Product B',
    price: 49.99,
    inStock: false,
  },
];

export function createMockApiResponse(data: any, delay = 0) {
  return {
    body: JSON.stringify({ data, success: true }),
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    delay,
  };
}
```

### 8. Example E2E Tests

**tests/e2e/auth/login.spec.ts**:
```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

test.describe('Login Flow', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    await loginPage.navigate();
  });

  test('should login with valid credentials', async ({ page }) => {
    await loginPage.login('test@example.com', 'password123');
    await dashboardPage.assertOnDashboard();
    await dashboardPage.assertWelcomeMessage('Test User');
  });

  test('should show error for invalid credentials', async () => {
    await loginPage.login('wrong@example.com', 'wrongpassword');
    await loginPage.assertErrorMessage('Invalid credentials');
    await loginPage.assertOnLoginPage();
  });

  test('should validate empty fields', async () => {
    await loginPage.loginButton.click();

    await expect(loginPage.emailInput).toHaveAttribute('aria-invalid', 'true');
    await expect(loginPage.passwordInput).toHaveAttribute('aria-invalid', 'true');
  });

  test('should remember user when checkbox checked', async ({ page }) => {
    await loginPage.login('test@example.com', 'password123', true);
    await dashboardPage.assertOnDashboard();

    const cookies = await page.context().cookies();
    const rememberMeCookie = cookies.find(c => c.name === 'rememberMe');
    expect(rememberMeCookie).toBeDefined();
  });

  test('should navigate to forgot password', async ({ page }) => {
    await loginPage.forgotPasswordLink.click();
    await expect(page).toHaveURL('/forgot-password');
  });
});
```

**tests/e2e/api/users.spec.ts**:
```typescript
import { test, expect } from '../fixtures/api.fixture';

test.describe('User API', () => {
  test('should fetch users list', async ({ apiContext }) => {
    const response = await apiContext.get('/users');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('users');
    expect(Array.isArray(data.users)).toBeTruthy();
  });

  test('should create new user', async ({ apiContext }) => {
    const newUser = {
      email: 'newuser@example.com',
      name: 'New User',
      role: 'user',
    };

    const response = await apiContext.post('/users', { data: newUser });
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.user).toMatchObject(newUser);
    expect(data.user.id).toBeDefined();
  });

  test('should update user', async ({ apiContext }) => {
    const updates = { name: 'Updated Name' };

    const response = await apiContext.patch('/users/1', { data: updates });
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.user.name).toBe(updates.name);
  });

  test('should delete user', async ({ apiContext }) => {
    const response = await apiContext.delete('/users/1');
    expect(response.ok()).toBeTruthy();

    // Verify deletion
    const getResponse = await apiContext.get('/users/1');
    expect(getResponse.status()).toBe(404);
  });

  test('should handle authentication errors', async ({ apiContext }) => {
    const response = await apiContext.get('/users/protected', {
      headers: { 'Authorization': 'Bearer invalid-token' },
    });
    expect(response.status()).toBe(401);
  });
});
```

### 9. Visual Regression Testing

**tests/e2e/visual/homepage.spec.ts**:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('homepage should match snapshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('login page should match snapshot', async ({ page }) => {
    await page.goto('/login');

    await expect(page).toHaveScreenshot('login.png', {
      mask: [page.locator('.timestamp')], // Mask dynamic content
    });
  });

  test('mobile viewport should match snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    await expect(page).toHaveScreenshot('homepage-mobile.png');
  });
});
```

### 10. Performance Testing

**tests/e2e/performance/metrics.spec.ts**:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Performance Metrics', () => {
  test('should meet Core Web Vitals thresholds', async ({ page }) => {
    await page.goto('/');

    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const values = entries.reduce((acc, entry) => {
            acc[entry.name] = entry.value;
            return acc;
          }, {} as Record<string, number>);
          resolve(values);
        }).observe({ entryTypes: ['measure', 'navigation'] });
      });
    });

    // Verify performance metrics
    expect(metrics['first-contentful-paint']).toBeLessThan(1800); // FCP < 1.8s
    expect(metrics['largest-contentful-paint']).toBeLessThan(2500); // LCP < 2.5s
  });

  test('should load page within 3 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('load');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(3000);
  });

  test('should have minimal bundle size', async ({ page }) => {
    const response = await page.goto('/');
    const transferSize = await response?.request().sizes().then(s => s.responseBodySize);

    expect(transferSize).toBeLessThan(500000); // < 500KB
  });
});
```

### 11. CI/CD Integration

**GitHub Actions (.github/workflows/e2e.yml)**:
```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps ${{ matrix.browser }}

      - name: Run Playwright tests
        run: npx playwright test --project=${{ matrix.browser }}
        env:
          BASE_URL: http://localhost:3000
          USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report-${{ matrix.browser }}
          path: playwright-report/
          retention-days: 30

      - name: Upload test videos
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: test-videos-${{ matrix.browser }}
          path: test-results/**/video.webm
          retention-days: 7

  test-sharded:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shardIndex: [1, 2, 3, 4]
        shardTotal: [4]

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run sharded tests
        run: npx playwright test --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}

      - name: Upload blob report
        uses: actions/upload-artifact@v3
        with:
          name: blob-report-${{ matrix.shardIndex }}
          path: blob-report
          retention-days: 1

  merge-reports:
    if: always()
    needs: [test-sharded]
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4

      - name: Download all reports
        uses: actions/download-artifact@v3
        with:
          path: all-blob-reports

      - name: Merge reports
        run: npx playwright merge-reports --reporter html ./all-blob-reports

      - name: Upload merged report
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

### 12. Package Dependencies

```json
{
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "dotenv": "^16.3.1",
    "playwright": "^1.40.0"
  },
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:chromium": "playwright test --project=chromium",
    "test:e2e:firefox": "playwright test --project=firefox",
    "test:e2e:webkit": "playwright test --project=webkit",
    "test:e2e:mobile": "playwright test --project=mobile-chrome --project=mobile-safari",
    "test:e2e:report": "playwright show-report",
    "test:e2e:codegen": "playwright codegen"
  }
}
```

### 13. Environment Configuration

**.env.example**:
```bash
# Base URLs
BASE_URL=http://localhost:3000
API_BASE_URL=http://localhost:3000/api

# Test credentials
USER_EMAIL=test@example.com
USER_PASSWORD=password123
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123

# CI/CD
CI=false
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=false
```

### 14. Best Practices

**Test Organization**:
- Group tests by feature/domain
- Use descriptive test names
- One assertion per test (when possible)
- Use page objects for reusability
- Keep tests independent

**Reliability**:
- Use auto-waiting features
- Avoid hard-coded waits (`page.waitForTimeout`)
- Use data-testid attributes
- Retry flaky tests automatically
- Clean up test data

**Performance**:
- Run tests in parallel
- Use test sharding for large suites
- Reuse authentication state
- Block unnecessary resources
- Use fast selectors (data-testid > text)

**Debugging**:
- Use Playwright Inspector (`--debug`)
- Record traces on failure
- Take screenshots on failure
- Use UI mode for interactive debugging
- Check network logs

## Workflow

1. Ask about application type and E2E requirements
2. Install Playwright and dependencies
3. Create playwright.config.ts with all browsers
4. Set up page object model structure
5. Create custom fixtures for auth and API
6. Implement global setup/teardown
7. Create authentication setup tests
8. Generate test utilities and helpers
9. Write example E2E test suite
10. Configure CI/CD pipeline
11. Set up visual regression testing
12. Add performance testing
13. Provide debugging and maintenance guide

## When to Use

- Setting up E2E testing from scratch
- Migrating from Selenium/Cypress to Playwright
- Adding cross-browser testing
- Implementing visual regression testing
- Setting up CI/CD for E2E tests
- Adding performance testing
- Creating page object model architecture
- Implementing authentication testing

Set up production-ready Playwright E2E testing with comprehensive coverage!
