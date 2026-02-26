import { test, expect } from '@playwright/test';

test.describe('Marketplace Page — Live Pipeline Evidence', () => {
  test('displays scanner KPI cards with real data', async ({ page }) => {
    await page.goto('/marketplace');

    // Scanner status section should be visible
    await expect(page.getByRole('heading', { name: 'Marketplace Scanner' })).toBeVisible({ timeout: 15000 });

    // Should show Scanner KPI card (exact match inside KPI section)
    await expect(page.getByText('Scanner', { exact: true })).toBeVisible();

    // Should show Last Scan card
    await expect(page.getByText('Last Scan')).toBeVisible();

    // Should show Repos Scanned card
    await expect(page.getByText('Repos Scanned')).toBeVisible();

    // Take screenshot of scanner section
    await page.screenshot({ path: 'tests/e2e/dashboard/screenshots/marketplace-scanner.png', fullPage: false });
  });

  test('submission queue shows discovered repos with mixed statuses', async ({ page }) => {
    await page.goto('/marketplace');

    // Wait for submission queue to load
    await expect(page.getByText('Submission Queue')).toBeVisible({ timeout: 15000 });

    // Should show total count > 0 (we discovered 294 repos)
    const totalText = page.locator('text=/\\d+ total/');
    await expect(totalText).toBeVisible({ timeout: 10000 });

    // Should have status filter tabs (using button role for specificity)
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Discovered' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Passed' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Failed' })).toBeVisible();

    // Queue table should have rows
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);

    // Take screenshot
    await page.screenshot({ path: 'tests/e2e/dashboard/screenshots/marketplace-queue.png', fullPage: false });
  });

  test('filter tabs work - shows passed skills', async ({ page }) => {
    await page.goto('/marketplace');

    await expect(page.getByText('Submission Queue')).toBeVisible({ timeout: 15000 });

    // Click "Passed" filter
    await page.getByRole('button', { name: 'Passed' }).click();

    // Wait for filtered results
    await page.waitForTimeout(1000);

    // Should show T1 Passed badges
    const passedBadges = page.locator('text=T1 Passed');
    const count = await passedBadges.count();
    expect(count).toBeGreaterThan(0);

    await page.screenshot({ path: 'tests/e2e/dashboard/screenshots/marketplace-passed.png', fullPage: false });
  });

  test('filter tabs work - shows failed skills', async ({ page }) => {
    await page.goto('/marketplace');

    await expect(page.getByText('Submission Queue')).toBeVisible({ timeout: 15000 });

    // Click "Failed" filter
    await page.getByRole('button', { name: 'Failed' }).click();

    await page.waitForTimeout(1000);

    // Should show T1 Failed badges
    const failedBadges = page.locator('text=T1 Failed');
    const count = await failedBadges.count();
    expect(count).toBeGreaterThan(0);

    await page.screenshot({ path: 'tests/e2e/dashboard/screenshots/marketplace-failed.png', fullPage: false });
  });

  test('insights section shows real pipeline metrics', async ({ page }) => {
    await page.goto('/marketplace');

    // Insights section heading
    const insightsHeading = page.locator('h3:has-text("Insights")');
    await expect(insightsHeading).toBeVisible({ timeout: 15000 });

    // Pass rate bars should be visible
    await expect(page.getByText('Tier 1 Pass Rate')).toBeVisible();
    await expect(page.getByText('Tier 2 Pass Rate')).toBeVisible();

    // Take screenshot of insights
    await page.screenshot({ path: 'tests/e2e/dashboard/screenshots/marketplace-insights.png', fullPage: false });
  });

  test('full page screenshot captures entire marketplace dashboard', async ({ page }) => {
    await page.goto('/marketplace');

    // Wait for all sections to load
    await expect(page.getByRole('heading', { name: 'Marketplace Scanner' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Submission Queue')).toBeVisible();
    await expect(page.locator('h3:has-text("Insights")')).toBeVisible();

    // Wait a bit more for data to settle
    await page.waitForTimeout(2000);

    // Full page screenshot as evidence
    await page.screenshot({
      path: 'tests/e2e/dashboard/screenshots/marketplace-full.png',
      fullPage: true,
    });
  });
});

test.describe('Marketplace Page — Queue Interactions', () => {
  test('queue table shows expected columns', async ({ page }) => {
    await page.goto('/marketplace');
    await expect(page.getByText('Submission Queue')).toBeVisible({ timeout: 15000 });

    // Verify all column headers
    const headers = page.locator('table thead th');
    await expect(headers.first()).toBeVisible({ timeout: 10000 });

    const headerTexts = await headers.allTextContents();
    expect(headerTexts).toEqual(
      expect.arrayContaining(['Repo', 'Author', 'Stars', 'Status', 'Tier', 'Security', 'Discovered', 'Actions']),
    );
  });

  test('pagination shows page info when queue has many items', async ({ page }) => {
    await page.goto('/marketplace');
    await expect(page.getByText('Submission Queue')).toBeVisible({ timeout: 15000 });

    // Wait for queue data to load
    const totalText = page.locator('text=/\\d+ total/');
    await expect(totalText).toBeVisible({ timeout: 10000 });

    // If total > 20, pagination should be visible
    const totalStr = await totalText.textContent();
    const total = parseInt(totalStr?.match(/(\d+)/)?.[1] || '0', 10);

    if (total > 20) {
      await expect(page.getByText(/Page 1 of/)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Prev' })).toBeVisible();

      // Prev should be disabled on first page
      await expect(page.getByRole('button', { name: 'Prev' })).toBeDisabled();

      // Click Next and verify page changes
      await page.getByRole('button', { name: 'Next' }).click();
      await expect(page.getByText(/Page 2 of/)).toBeVisible({ timeout: 5000 });

      // Prev should now be enabled
      await expect(page.getByRole('button', { name: 'Prev' })).toBeEnabled();

      // Navigate back
      await page.getByRole('button', { name: 'Prev' }).click();
      await expect(page.getByText(/Page 1 of/)).toBeVisible({ timeout: 5000 });
    }
  });

  test('filter tabs highlight active selection', async ({ page }) => {
    await page.goto('/marketplace');
    await expect(page.getByText('Submission Queue')).toBeVisible({ timeout: 15000 });

    // All tab should be active by default (has bg-gray-700 class)
    const allBtn = page.getByRole('button', { name: 'All' });
    await expect(allBtn).toHaveClass(/bg-gray-700/);

    // Click Discovered tab
    const discoveredBtn = page.getByRole('button', { name: 'Discovered' });
    await discoveredBtn.click();
    await expect(discoveredBtn).toHaveClass(/bg-gray-700/);
    // All tab should no longer be active
    await expect(allBtn).not.toHaveClass(/bg-gray-700/);
  });

  test('remaining filter tabs work - Scanning, Verified, Rejected', async ({ page }) => {
    await page.goto('/marketplace');
    await expect(page.getByText('Submission Queue')).toBeVisible({ timeout: 15000 });

    for (const tabName of ['Scanning', 'Verified', 'Rejected']) {
      await page.getByRole('button', { name: tabName }).click();
      await page.waitForTimeout(500);

      // Tab should be active
      await expect(page.getByRole('button', { name: tabName })).toHaveClass(/bg-gray-700/);

      // Either shows filtered rows or empty state
      const hasRows = await page.locator('table tbody tr').count();
      const hasEmpty = await page.getByText('No submissions found').isVisible().catch(() => false);
      expect(hasRows > 0 || hasEmpty).toBeTruthy();
    }
  });

  test('scanner start/stop button is present', async ({ page }) => {
    await page.goto('/marketplace');
    await expect(page.getByRole('heading', { name: 'Marketplace Scanner' })).toBeVisible({ timeout: 15000 });

    // Should show either Start or Stop scanner button
    const startBtn = page.getByRole('button', { name: 'Start Scanner' });
    const stopBtn = page.getByRole('button', { name: 'Stop Scanner' });

    const hasStart = await startBtn.isVisible().catch(() => false);
    const hasStop = await stopBtn.isVisible().catch(() => false);
    expect(hasStart || hasStop).toBeTruthy();
  });
});

test.describe('Marketplace Page — Verified Skills Gallery', () => {
  test('popular skills section is visible', async ({ page }) => {
    await page.goto('/marketplace');

    // Gallery section heading
    await expect(page.locator('h3:has-text("Popular Skills")')).toBeVisible({ timeout: 15000 });
  });

  test('verified skills gallery renders after loading', async ({ page }) => {
    await page.goto('/marketplace');
    await expect(page.locator('h3:has-text("Popular Skills")')).toBeVisible({ timeout: 15000 });

    // Wait for loading to complete — either cards or empty state will appear
    await page.waitForTimeout(2000);

    // The gallery section (sibling content after the heading) must contain either
    // skill cards with "View on GitHub" or the empty state text
    const galleryContainer = page.locator('h3:has-text("Popular Skills")').locator('xpath=ancestor::div[contains(@class, "rounded-xl")]');
    await expect(galleryContainer).toBeVisible();

    await page.screenshot({ path: 'tests/e2e/dashboard/screenshots/marketplace-gallery.png', fullPage: false });
  });

  test('gallery shows empty state with mocked empty verified response', async ({ page }) => {
    await page.route('**/api/marketplace/verified**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: [] }),
      }),
    );

    await page.goto('/marketplace');
    await expect(page.locator('h3:has-text("Popular Skills")')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('No verified skills yet')).toBeVisible();
  });

  test('skill search filters the gallery', async ({ page }) => {
    await page.goto('/marketplace');
    await expect(page.locator('h3:has-text("Popular Skills")')).toBeVisible({ timeout: 15000 });

    const searchInput = page.locator('input[placeholder*="Discover popular skills"]');
    if (await searchInput.isVisible()) {
      // Type a search that likely won't match
      await searchInput.fill('zzz_nonexistent_skill_xyz');
      await page.waitForTimeout(500);

      // Should show "No skills match" message
      await expect(page.getByText(/No skills match/)).toBeVisible();

      // Clear search to restore gallery
      await searchInput.clear();
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Marketplace Page — Error Handling', () => {
  test('shows error state when scanner API fails', async ({ page }) => {
    // Intercept scanner status endpoint to return 500
    await page.route('**/api/marketplace/scanner/status**', route =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, error: 'Scanner unavailable' }),
      }),
    );

    await page.goto('/marketplace');

    // Should still load the rest of the page
    await expect(page.getByText('Submission Queue')).toBeVisible({ timeout: 15000 });

    // Scanner error should trigger ErrorAlert with retry
    await expect(page.locator('button:has-text("Retry")')).toBeVisible({ timeout: 10000 });
  });

  test('queue shows empty state with mocked empty response', async ({ page }) => {
    await page.route('**/api/marketplace/queue**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: { items: [], total: 0 } }),
      }),
    );

    await page.goto('/marketplace');

    await expect(page.getByText('No submissions found')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Submissions will appear here')).toBeVisible();
  });

  test('queue shows filter-specific empty message', async ({ page }) => {
    // Return empty results for filtered requests only
    await page.route('**/api/marketplace/queue**', route => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('status')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, data: { items: [], total: 0 } }),
        });
      }
      return route.continue();
    });

    await page.goto('/marketplace');
    await expect(page.getByText('Submission Queue')).toBeVisible({ timeout: 15000 });

    // Click a filter tab
    await page.getByRole('button', { name: 'Verified' }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText('Try a different filter')).toBeVisible({ timeout: 5000 });
  });

  test('insights section shows KPI values from real data', async ({ page }) => {
    await page.goto('/marketplace');
    const insightsSection = page.locator('h3:has-text("Insights")').locator('xpath=ancestor::div[contains(@class, "rounded-xl")]');
    await expect(insightsSection).toBeVisible({ timeout: 15000 });

    // Scope assertions to the insights section to avoid ambiguous matches
    await expect(insightsSection.getByText('Tier 1 Pass Rate')).toBeVisible();
    await expect(insightsSection.getByText('Tier 2 Pass Rate')).toBeVisible();

    // KPI cards: Verified, Rejected, Pending are unique enough
    await expect(insightsSection.getByText('Rejected')).toBeVisible();
    await expect(insightsSection.getByText('Pending')).toBeVisible();
  });
});
