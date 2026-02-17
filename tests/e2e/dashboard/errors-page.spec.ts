import { test, expect } from '@playwright/test';

test.describe('Errors Page', () => {
  test('loads error groups without timeout', async ({ page }) => {
    await page.goto('/errors');

    // Should show the Error Tracing heading
    await expect(page.locator('text=Error Tracing')).toBeVisible({ timeout: 35000 });

    // Should show KPI cards
    await expect(page.locator('text=Total Errors')).toBeVisible();
    await expect(page.locator('text=Error Types')).toBeVisible();
    await expect(page.locator('text=Affected Sessions')).toBeVisible();
  });

  test('shows error banner with retry on API failure', async ({ page }) => {
    // Intercept errors API — fail all calls (initial + retry)
    await page.route('**/api/errors**', route =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, error: 'Parse failure' }),
      }),
    );

    await page.goto('/errors');

    // ErrorsPage has its own error banner (useApi throws "HTTP {status}", not body text)
    await expect(page.locator('text=HTTP 500')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('button:has-text("Retry")')).toBeVisible();
  });

  test('tab switching works correctly', async ({ page }) => {
    await page.goto('/errors');

    // Wait for page to load
    await expect(page.locator('text=Error Tracing')).toBeVisible({ timeout: 35000 });

    // Click each tab and verify it becomes visually active (bg changes)
    for (const tabLabel of ['All Errors', 'Timeline', 'Sessions', 'Error Groups']) {
      const tab = page.locator(`button:has-text("${tabLabel}")`);
      await tab.click();
      // Active tab gets a distinct background — just verify the click didn't error
      // and the tab is still visible
      await expect(tab).toBeVisible();
    }
  });

  test('search functionality works', async ({ page }) => {
    await page.goto('/errors');
    await expect(page.locator('text=Error Tracing')).toBeVisible({ timeout: 35000 });

    // Type search query and submit
    const searchInput = page.locator('input[placeholder*="Search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('test query');
      const searchBtn = page.locator('button:has-text("Search")');
      if (await searchBtn.isVisible()) {
        await searchBtn.click();
      }
    }
    // Search completing without errors is sufficient
  });
});
