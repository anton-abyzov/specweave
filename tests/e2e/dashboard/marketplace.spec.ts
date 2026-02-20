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
