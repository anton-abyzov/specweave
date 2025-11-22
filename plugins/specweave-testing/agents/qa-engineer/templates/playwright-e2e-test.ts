/**
 * Playwright E2E Test Template
 *
 * This template demonstrates best practices for writing end-to-end tests
 * with Playwright for web applications.
 *
 * Features:
 * - Page Object Model (POM)
 * - Test fixtures
 * - Cross-browser testing
 * - Mobile emulation
 * - API mocking
 * - Visual regression
 * - Accessibility testing
 */

import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// ============================================================================
// PAGE OBJECTS
// ============================================================================

/**
 * Login Page Object
 *
 * Encapsulates all interactions with the login page
 */
class LoginPage {
  constructor(private page: Page) {}

  // Locators
  get emailInput() {
    return this.page.getByLabel('Email');
  }

  get passwordInput() {
    return this.page.getByLabel('Password');
  }

  get loginButton() {
    return this.page.getByRole('button', { name: 'Login' });
  }

  get errorMessage() {
    return this.page.getByRole('alert');
  }

  // Actions
  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }
}

/**
 * Dashboard Page Object
 */
class DashboardPage {
  constructor(private page: Page) {}

  get welcomeMessage() {
    return this.page.getByText(/Welcome,/);
  }

  get logoutButton() {
    return this.page.getByRole('button', { name: 'Logout' });
  }

  async expectLoggedIn(username: string) {
    await expect(this.welcomeMessage).toContainText(username);
  }

  async logout() {
    await this.logoutButton.click();
  }
}

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Custom fixture that provides authenticated page
 */
const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    // Setup: Login before test
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('user@example.com', 'password123');

    // Wait for navigation to dashboard
    await page.waitForURL('/dashboard');

    // Provide authenticated page to test
    await use(page);

    // Teardown: Logout after test
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.logout();
  },
});

// ============================================================================
// BASIC E2E TESTS
// ============================================================================

test.describe('Authentication Flow', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    // ARRANGE
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // ACT
    await loginPage.login('user@example.com', 'password123');

    // ASSERT
    await expect(page).toHaveURL('/dashboard');
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.expectLoggedIn('User');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // ARRANGE
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // ACT
    await loginPage.login('invalid@example.com', 'wrongpassword');

    // ASSERT
    await loginPage.expectError('Invalid email or password');
    await expect(page).toHaveURL('/login'); // Still on login page
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    // ARRANGE
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // ACT
    await loginPage.loginButton.click();

    // ASSERT
    await expect(page.getByText('Email is required')).toBeVisible();
    await expect(page.getByText('Password is required')).toBeVisible();
  });
});

// ============================================================================
// AUTHENTICATED TESTS (Using Fixture)
// ============================================================================

test.describe('Dashboard Features', () => {
  test('should display user profile', async ({ authenticatedPage }) => {
    // Navigate to profile
    await authenticatedPage.goto('/profile');

    // Verify profile data
    await expect(
      authenticatedPage.getByText('user@example.com')
    ).toBeVisible();
    await expect(authenticatedPage.getByText('Member since')).toBeVisible();
  });

  test('should allow editing profile', async ({ authenticatedPage }) => {
    // Navigate to profile
    await authenticatedPage.goto('/profile');

    // Edit name
    const nameInput = authenticatedPage.getByLabel('Name');
    await nameInput.clear();
    await nameInput.fill('New Name');

    // Save changes
    await authenticatedPage
      .getByRole('button', { name: 'Save Changes' })
      .click();

    // Verify success
    await expect(
      authenticatedPage.getByText('Profile updated successfully')
    ).toBeVisible();
  });
});

// ============================================================================
// API MOCKING
// ============================================================================

test.describe('API Mocking', () => {
  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API to return error
    await page.route('**/api/users', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    // Navigate to users page
    await page.goto('/users');

    // Verify error message
    await expect(
      page.getByText('Failed to load users. Please try again.')
    ).toBeVisible();
  });

  test('should display mocked user data', async ({ page }) => {
    // Mock API to return test data
    await page.route('**/api/users', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify([
          { id: 1, name: 'John Doe', email: 'john@example.com' },
          { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
        ]),
      });
    });

    // Navigate to users page
    await page.goto('/users');

    // Verify mocked data is displayed
    await expect(page.getByText('John Doe')).toBeVisible();
    await expect(page.getByText('Jane Smith')).toBeVisible();
  });
});

// ============================================================================
// VISUAL REGRESSION TESTING
// ============================================================================

test.describe('Visual Regression', () => {
  test('homepage matches baseline', async ({ page }) => {
    await page.goto('/');

    // Capture screenshot and compare to baseline
    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('button states match baseline', async ({ page }) => {
    await page.goto('/components');

    const button = page.getByRole('button', { name: 'Submit' });

    // Default state
    await expect(button).toHaveScreenshot('button-default.png');

    // Hover state
    await button.hover();
    await expect(button).toHaveScreenshot('button-hover.png');

    // Focus state
    await button.focus();
    await expect(button).toHaveScreenshot('button-focus.png');
  });
});

// ============================================================================
// ACCESSIBILITY TESTING
// ============================================================================

test.describe('Accessibility', () => {
  test('should not have accessibility violations', async ({ page }) => {
    await page.goto('/');

    // Run axe accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Assert no violations
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/form');

    // Tab through form fields
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Email')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Password')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('button', { name: 'Submit' })
    ).toBeFocused();

    // Submit with Enter
    await page.keyboard.press('Enter');
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/');

    // Check navigation has aria-label
    await expect(
      page.getByRole('navigation', { name: 'Main navigation' })
    ).toBeVisible();

    // Check main content has aria-label
    await expect(page.getByRole('main')).toHaveAttribute(
      'aria-label',
      'Main content'
    );

    // Check all images have alt text
    const images = await page.getByRole('img').all();
    for (const img of images) {
      await expect(img).toHaveAttribute('alt');
    }
  });
});

// ============================================================================
// MOBILE TESTING
// ============================================================================

test.describe('Mobile Experience', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('should render mobile navigation', async ({ page }) => {
    await page.goto('/');

    // Mobile menu button should be visible
    await expect(
      page.getByRole('button', { name: 'Menu' })
    ).toBeVisible();

    // Desktop navigation should be hidden
    const desktopNav = page.getByRole('navigation').first();
    await expect(desktopNav).toBeHidden();
  });

  test('should handle touch gestures', async ({ page }) => {
    await page.goto('/gallery');

    // Get image element
    const image = page.getByRole('img').first();

    // Swipe left
    await image.dispatchEvent('touchstart', {
      touches: [{ clientX: 300, clientY: 200 }],
    });
    await image.dispatchEvent('touchmove', {
      touches: [{ clientX: 100, clientY: 200 }],
    });
    await image.dispatchEvent('touchend');

    // Verify navigation to next image
    await expect(page.getByText('Image 2 of 10')).toBeVisible();
  });
});

// ============================================================================
// PERFORMANCE TESTING
// ============================================================================

test.describe('Performance', () => {
  test('page load performance', async ({ page }) => {
    await page.goto('/');

    // Get performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const perfData = window.performance.timing;
      return {
        loadTime: perfData.loadEventEnd - perfData.navigationStart,
        domContentLoaded:
          perfData.domContentLoadedEventEnd - perfData.navigationStart,
      };
    });

    // Assert performance targets
    expect(performanceMetrics.loadTime).toBeLessThan(3000); // 3s max
    expect(performanceMetrics.domContentLoaded).toBeLessThan(2000); // 2s max
  });
});

// ============================================================================
// FILE UPLOAD/DOWNLOAD
// ============================================================================

test.describe('File Operations', () => {
  test('should upload file', async ({ page }) => {
    await page.goto('/upload');

    // Set up file chooser
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Upload File' }).click();
    const fileChooser = await fileChooserPromise;

    // Upload file
    await fileChooser.setFiles('tests/fixtures/test-file.pdf');

    // Verify upload success
    await expect(page.getByText('File uploaded successfully')).toBeVisible();
  });

  test('should download file', async ({ page }) => {
    await page.goto('/downloads');

    // Set up download
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Download Report' }).click();
    const download = await downloadPromise;

    // Verify download
    expect(download.suggestedFilename()).toBe('report.pdf');
    await download.saveAs(`/tmp/${download.suggestedFilename()}`);
  });
});

// ============================================================================
// MULTI-TAB/WINDOW TESTING
// ============================================================================

test.describe('Multi-Window', () => {
  test('should handle popup windows', async ({ context, page }) => {
    await page.goto('/');

    // Wait for popup
    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('button', { name: 'Open Help' }).click(),
    ]);

    // Interact with popup
    await expect(popup.getByText('Help Center')).toBeVisible();
    await popup.close();
  });
});

// ============================================================================
// BEST PRACTICES CHECKLIST
// ============================================================================

/*
✅ Page Object Model (POM)
✅ Test Fixtures for Setup/Teardown
✅ Descriptive Test Names
✅ Auto-Waiting (Playwright built-in)
✅ User-Centric Selectors (getByRole, getByLabel)
✅ API Mocking for Reliability
✅ Visual Regression Testing
✅ Accessibility Testing (axe-core)
✅ Mobile/Responsive Testing
✅ Performance Assertions
✅ File Upload/Download
✅ Multi-Tab/Window Handling
✅ Screenshot/Video on Failure (configured in playwright.config.ts)
✅ Parallel Execution (configured in playwright.config.ts)
✅ Cross-Browser Testing (configured in playwright.config.ts)
*/
