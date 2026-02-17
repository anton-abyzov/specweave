import { test, expect } from '@playwright/test';

test.describe('Overview Page', () => {
  test('loads without timeout and displays KPI cards', async ({ page }) => {
    await page.goto('/');

    // Should show KPI cards after loading (allow up to 35s for cold cache)
    await expect(page.locator('text=Active Increments')).toBeVisible({ timeout: 35000 });
    await expect(page.locator('text=Events Today')).toBeVisible();

    // Should NOT show error state
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });

  test('shows ErrorAlert with retry on server error', async ({ page }) => {
    // Intercept ALL overview API calls and return 500
    // useApi retries once (2 total calls), so both must fail
    await page.route('**/api/overview**', route =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, error: 'Internal server error' }),
      }),
    );

    await page.goto('/');

    // Should show styled error banner after initial + retry fail (~2s retry delay)
    await expect(page.locator('text=Something went wrong')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=HTTP 500')).toBeVisible();
    await expect(page.locator('button:has-text("Retry")')).toBeVisible();
  });

  test('shows timeout-specific guidance on timeout', async ({ page }) => {
    test.setTimeout(90000);

    // Intercept API and never respond — let client abort timeout trigger
    // AbortError is NOT retried, so error shows after single 30s timeout
    await page.route('**/api/overview**', () => {
      // Never fulfill or continue — client AbortController will fire
    });

    await page.goto('/');

    // Should show timeout error with guidance text (30s client timeout)
    await expect(page.locator('text=timed out')).toBeVisible({ timeout: 45000 });
    await expect(page.locator('text=session logs')).toBeVisible();
    await expect(page.locator('button:has-text("Retry")')).toBeVisible();
  });

  test('retry button re-fetches data successfully', async ({ page }) => {
    // Use a flag instead of callCount to avoid SSE-triggered refetches bypassing the intercept
    let shouldFail = true;
    await page.route('**/api/overview**', route => {
      if (shouldFail) {
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ ok: false, error: 'Temporary error' }),
        });
      }
      return route.continue();
    });

    await page.goto('/');

    // Error shows after all auto-attempts fail
    await expect(page.locator('text=Something went wrong')).toBeVisible({ timeout: 15000 });

    // Allow the next call to succeed, then click retry
    shouldFail = false;
    await page.locator('button:has-text("Retry")').click();

    // Should now load the real page content
    await expect(page.locator('text=Active Increments')).toBeVisible({ timeout: 35000 });
  });
});
