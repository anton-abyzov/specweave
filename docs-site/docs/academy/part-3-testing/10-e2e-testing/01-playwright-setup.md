---
sidebar_position: 1
title: "10.1 Playwright Setup"
description: "Set up Playwright for browser automation testing"
---

# Lesson 10.1: Setting Up Playwright

**Duration**: 30 minutes | **Difficulty**: Intermediate

---

## Learning Objectives

By the end of this lesson, you will be able to:
- Install and configure Playwright
- Understand Playwright's architecture
- Write your first E2E test
- Run tests in multiple browsers

---

## What is E2E Testing?

**End-to-End (E2E) testing** simulates real user interactions:

```
Unit Tests:        [Function] ✓
Integration Tests: [API] → [Database] ✓
E2E Tests:         [Browser] → [Frontend] → [API] → [Database] ✓
```

E2E tests verify the entire application works from the user's perspective.

---

## Why Playwright?

| Feature | Playwright | Cypress | Selenium |
|---------|------------|---------|----------|
| **Speed** | Fast (parallel) | Medium | Slow |
| **Browsers** | Chrome, Firefox, Safari, Edge | Chrome, Firefox, Edge | All |
| **Auto-wait** | Built-in | Built-in | Manual |
| **Multi-tab** | Yes | Limited | Yes |
| **Mobile** | Yes (emulation) | Limited | Yes |
| **Language** | JS/TS/Python/C#/.NET | JS/TS | Many |

---

## Installation

### Quick Start

```bash
# Install Playwright
npm init playwright@latest

# This will:
# - Install @playwright/test
# - Create playwright.config.ts
# - Create example tests
# - Install browsers
```

### Manual Installation

```bash
npm install -D @playwright/test

# Install browsers
npx playwright install
```

---

## Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test directory
  testDir: './tests/e2e',

  // Run tests in parallel
  fullyParallel: true,

  // Fail build on test.only
  forbidOnly: !!process.env.CI,

  // Retries on CI
  retries: process.env.CI ? 2 : 0,

  // Reporters
  reporter: [
    ['html'],
    ['list']
  ],

  // Shared settings
  use: {
    // Base URL for navigation
    baseURL: 'http://localhost:3000',

    // Collect trace on failure
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video recording
    video: 'on-first-retry',
  },

  // Configure browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile viewports
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Start dev server before tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## Your First E2E Test

### File Structure

```
tests/
└── e2e/
    ├── home.spec.ts
    ├── login.spec.ts
    └── checkout.spec.ts
```

### Basic Test

```typescript
// tests/e2e/home.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should display welcome message', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');

    // Check for welcome text
    await expect(page.getByRole('heading', { name: 'Welcome' }))
      .toBeVisible();
  });

  test('should navigate to products', async ({ page }) => {
    await page.goto('/');

    // Click navigation link
    await page.getByRole('link', { name: 'Products' }).click();

    // Verify URL changed
    await expect(page).toHaveURL('/products');

    // Verify content loaded
    await expect(page.getByTestId('product-grid')).toBeVisible();
  });
});
```

---

## Running Tests

```bash
# Run all tests
npx playwright test

# Run specific file
npx playwright test home.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed

# Run in specific browser
npx playwright test --project=chromium

# Run in debug mode
npx playwright test --debug

# Run with UI mode
npx playwright test --ui
```

---

## Locators

Playwright recommends user-visible locators:

```typescript
// ✅ GOOD: User-facing locators
page.getByRole('button', { name: 'Submit' });
page.getByLabel('Email');
page.getByPlaceholder('Enter your email');
page.getByText('Welcome back');
page.getByTestId('submit-button');

// ❌ AVOID: Implementation details
page.locator('#submit-btn');
page.locator('.form-button-primary');
page.locator('button:nth-child(2)');
```

### Locator Priority

1. `getByRole` — Accessibility-based (best)
2. `getByLabel` — Form labels
3. `getByPlaceholder` — Input placeholders
4. `getByText` — Visible text
5. `getByTestId` — data-testid attribute
6. `locator()` — CSS/XPath (last resort)

---

## Auto-Waiting

Playwright automatically waits for elements:

```typescript
// No manual waits needed!
await page.getByRole('button', { name: 'Submit' }).click();

// Playwright waits for:
// 1. Element to be attached to DOM
// 2. Element to be visible
// 3. Element to be stable (no animations)
// 4. Element to receive events
// 5. Element to be enabled
```

### Explicit Waits (when needed)

```typescript
// Wait for network idle
await page.waitForLoadState('networkidle');

// Wait for specific element
await page.waitForSelector('[data-loaded="true"]');

// Wait for response
await page.waitForResponse('/api/users');

// Custom timeout
await expect(page.getByText('Loaded'))
  .toBeVisible({ timeout: 10000 });
```

---

## Assertions

```typescript
// Element visibility
await expect(page.getByText('Welcome')).toBeVisible();
await expect(page.getByText('Error')).toBeHidden();

// Element state
await expect(page.getByRole('button')).toBeEnabled();
await expect(page.getByRole('checkbox')).toBeChecked();

// Text content
await expect(page.getByTestId('count')).toHaveText('5');
await expect(page.getByTestId('message')).toContainText('success');

// Attributes
await expect(page.getByRole('link')).toHaveAttribute('href', '/home');
await expect(page.getByRole('img')).toHaveAttribute('alt', 'Logo');

// URL
await expect(page).toHaveURL('/dashboard');
await expect(page).toHaveURL(/\/users\/\d+/);

// Title
await expect(page).toHaveTitle('Dashboard');
```

---

## Test Isolation

Each test runs in a fresh browser context:

```typescript
test.describe('Shopping Cart', () => {
  test('should add item to cart', async ({ page }) => {
    // Fresh session, empty cart
    await page.goto('/products');
    await page.getByTestId('add-to-cart-1').click();
    await expect(page.getByTestId('cart-count')).toHaveText('1');
  });

  test('should show empty cart initially', async ({ page }) => {
    // Different session, cart is empty again
    await page.goto('/cart');
    await expect(page.getByText('Your cart is empty')).toBeVisible();
  });
});
```

---

## Scripts in package.json

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:report": "playwright show-report"
  }
}
```

---

## Key Takeaways

1. **Playwright is fast and reliable** — Auto-waiting eliminates flakiness
2. **Use user-facing locators** — `getByRole`, `getByLabel`, `getByText`
3. **Tests are isolated** — Each test gets a fresh browser context
4. **Multiple browsers** — Test Chrome, Firefox, Safari, mobile
5. **Rich tooling** — Debug mode, UI mode, trace viewer

---

## Practice Exercise

1. Install Playwright: `npm init playwright@latest`
2. Create a test that:
   - Visits https://demo.playwright.dev/todomvc
   - Adds three todo items
   - Completes one item
   - Filters to show active items
   - Verifies only two items are shown
3. Run in all browsers

---

## Next Lesson

Learn to automate complex user workflows.

→ [Continue to Lesson 10.2: Browser Automation](./02-browser-automation)
