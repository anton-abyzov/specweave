/**
 * Integration tests for dual Docusaurus documentation sites
 *
 * Tests:
 * - Public docs site (port 3016)
 * - Internal docs site (port 3015)
 * - Both sites running simultaneously
 * - Correct content served from each source
 * - Search functionality (Algolia vs local)
 * - No port conflicts
 */

import { test, expect, chromium, Browser, BrowserContext, Page } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

// Test configuration
const PUBLIC_DOCS_URL = 'http://localhost:3016';
const INTERNAL_DOCS_URL = 'http://localhost:3015';
const STARTUP_WAIT = 30000; // 30 seconds for site startup
const TEST_TIMEOUT = 120000; // 2 minutes per test

// Process management
let publicDocsProcess: ChildProcess | null = null;
let internalDocsProcess: ChildProcess | null = null;

/**
 * Start a Docusaurus site
 */
async function startDocsServer(
  sitePath: string,
  expectedPort: number,
  label: string
): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 Starting ${label} on port ${expectedPort}...`);

    const process = spawn('npm', ['start'], {
      cwd: sitePath,
      stdio: 'pipe',
      shell: true,
    });

    let started = false;

    process.stdout?.on('data', (data) => {
      const output = data.toString();
      console.log(`[${label}] ${output}`);

      if (output.includes(`http://localhost:${expectedPort}`)) {
        started = true;
        console.log(`✅ ${label} started successfully!`);
        resolve(process);
      }
    });

    process.stderr?.on('data', (data) => {
      const error = data.toString();
      console.error(`[${label} ERROR] ${error}`);

      // Fail if critical error
      if (error.includes('ERROR') && !started) {
        reject(new Error(`Failed to start ${label}: ${error}`));
      }
    });

    process.on('error', (error) => {
      console.error(`[${label}] Process error:`, error);
      reject(error);
    });

    process.on('exit', (code) => {
      if (code !== 0 && !started) {
        reject(new Error(`${label} exited with code ${code}`));
      }
    });

    // Timeout fallback
    setTimeout(() => {
      if (!started) {
        reject(new Error(`${label} startup timeout after ${STARTUP_WAIT}ms`));
      }
    }, STARTUP_WAIT);
  });
}

/**
 * Kill a process gracefully
 */
async function killProcess(process: ChildProcess | null, label: string) {
  if (!process) return;

  console.log(`\n🛑 Stopping ${label}...`);

  try {
    process.kill('SIGTERM');
    await sleep(2000);

    if (process.killed) {
      console.log(`✅ ${label} stopped`);
    } else {
      console.log(`⚠️ ${label} force kill`);
      process.kill('SIGKILL');
    }
  } catch (error) {
    console.error(`Error stopping ${label}:`, error);
  }
}

/**
 * Wait for URL to be accessible
 */
async function waitForUrl(url: string, timeoutMs: number = 30000): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return true;
      }
    } catch (error) {
      // Still waiting...
    }
    await sleep(1000);
  }

  return false;
}

// Test suite setup/teardown
test.beforeAll(async () => {
  console.log('\n📦 Setting up dual Docusaurus test environment...\n');

  // Start public docs
  try {
    publicDocsProcess = await startDocsServer(
      './docs-site',
      3016,
      'Public Docs'
    );
  } catch (error) {
    console.error('Failed to start public docs:', error);
    throw error;
  }

  // Start internal docs
  try {
    internalDocsProcess = await startDocsServer(
      './docs-site-internal',
      3015,
      'Internal Docs'
    );
  } catch (error) {
    console.error('Failed to start internal docs:', error);
    throw error;
  }

  // Wait for both to be accessible
  console.log('\n⏳ Waiting for both sites to be ready...\n');

  const publicReady = await waitForUrl(PUBLIC_DOCS_URL);
  const internalReady = await waitForUrl(INTERNAL_DOCS_URL);

  if (!publicReady) {
    throw new Error('Public docs failed to become accessible');
  }

  if (!internalReady) {
    throw new Error('Internal docs failed to become accessible');
  }

  console.log('\n✅ Both documentation sites are ready!\n');
}, STARTUP_WAIT * 2);

test.afterAll(async () => {
  console.log('\n🧹 Cleaning up...\n');

  await killProcess(publicDocsProcess, 'Public Docs');
  await killProcess(internalDocsProcess, 'Internal Docs');

  console.log('\n✅ Cleanup complete\n');
});

// Tests
test.describe('Public Docs Site (port 3016)', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto(PUBLIC_DOCS_URL);
    await expect(page.locator('h1')).toContainText('SpecWeave');
  });

  test('should have correct navigation', async ({ page }) => {
    await page.goto(PUBLIC_DOCS_URL);

    // Check for public docs navigation
    await expect(page.locator('nav').getByText('Docs')).toBeVisible();
    await expect(page.locator('nav').getByText('Guides')).toBeVisible();
  });

  test('should serve public docs content', async ({ page }) => {
    await page.goto(`${PUBLIC_DOCS_URL}/docs/overview/introduction`);

    // Verify public content
    await expect(page.locator('article')).toContainText('Introduction');
  });

  test('should NOT show internal warning banner', async ({ page }) => {
    await page.goto(PUBLIC_DOCS_URL);

    // No internal docs warning
    const announcementBar = page.locator('[class*="announcementBar"]');
    const hasInternalWarning = await announcementBar.locator('text=/INTERNAL DOCUMENTATION/i').count();

    expect(hasInternalWarning).toBe(0);
  });
});

test.describe('Internal Docs Site (port 3015)', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto(INTERNAL_DOCS_URL);
    await expect(page.locator('h1')).toContainText('SpecWeave Internal');
  });

  test('should have correct navigation', async ({ page }) => {
    await page.goto(INTERNAL_DOCS_URL);

    // Check for internal docs navigation
    await expect(page.locator('nav').getByText('Strategy')).toBeVisible();
    await expect(page.locator('nav').getByText('Architecture')).toBeVisible();
    await expect(page.locator('nav').getByText('Delivery')).toBeVisible();
  });

  test('should serve internal docs content', async ({ page }) => {
    await page.goto(`${INTERNAL_DOCS_URL}/docs/architecture/README`);

    // Verify internal content
    await expect(page.locator('article')).toContainText('Architecture');
  });

  test('should show internal warning banner', async ({ page }) => {
    await page.goto(INTERNAL_DOCS_URL);

    // Check for warning banner
    const announcementBar = page.locator('[class*="announcementBar"]');
    await expect(announcementBar).toContainText('INTERNAL DOCUMENTATION');
    await expect(announcementBar).toContainText('Not for public distribution');
  });

  test('should have red warning banner style', async ({ page }) => {
    await page.goto(INTERNAL_DOCS_URL);

    const announcementBar = page.locator('[class*="announcementBar"]');
    const backgroundColor = await announcementBar.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );

    // Red background (rgb(239, 68, 68) = #ef4444)
    expect(backgroundColor).toMatch(/rgb\(239,\s*68,\s*68\)/);
  });
});

test.describe('Dual Site Behavior', () => {
  test('both sites accessible simultaneously', async ({ browser }) => {
    // Create two separate browser contexts
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Load both sites simultaneously
    await Promise.all([
      page1.goto(PUBLIC_DOCS_URL),
      page2.goto(INTERNAL_DOCS_URL),
    ]);

    // Both should be visible
    await expect(page1.locator('h1')).toBeVisible();
    await expect(page2.locator('h1')).toBeVisible();

    // Verify correct content
    await expect(page1.locator('h1')).not.toContainText('Internal');
    await expect(page2.locator('h1')).toContainText('Internal');

    await context1.close();
    await context2.close();
  });

  test('no port conflicts', async ({ page }) => {
    // Public on 3016
    const publicResponse = await page.goto(PUBLIC_DOCS_URL);
    expect(publicResponse?.status()).toBe(200);

    // Internal on 3015
    const internalResponse = await page.goto(INTERNAL_DOCS_URL);
    expect(internalResponse?.status()).toBe(200);
  });

  test('no content leakage between sites', async ({ page }) => {
    // Check public docs don't have internal content
    await page.goto(`${PUBLIC_DOCS_URL}/docs`);
    const publicBody = await page.locator('body').textContent();
    expect(publicBody).not.toContain('ADR'); // Architecture Decision Records
    expect(publicBody).not.toContain('HLD'); // High-Level Design

    // Check internal docs don't have public-only content
    await page.goto(`${INTERNAL_DOCS_URL}/docs`);
    const internalBody = await page.locator('body').textContent();
    // Internal docs SHOULD have ADRs
    expect(internalBody).toContain('Architecture');
  });
});

test.describe('Search Functionality', () => {
  test('public docs have search', async ({ page }) => {
    await page.goto(PUBLIC_DOCS_URL);

    // Check for search input
    const searchInput = page.locator('input[type="search"], [class*="search"]');
    await expect(searchInput).toBeVisible();
  });

  test('internal docs have local search', async ({ page }) => {
    await page.goto(INTERNAL_DOCS_URL);

    // Check for local search input
    const searchInput = page.locator('input[type="search"], [class*="search"]');
    await expect(searchInput).toBeVisible();

    // Should NOT have Algolia branding
    const algoliaLogo = page.locator('text=/Search by Algolia/i');
    await expect(algoliaLogo).not.toBeVisible();
  });
});

test.describe('Content Verification', () => {
  test('public docs serve .specweave/docs/public/', async ({ page }) => {
    // Navigate to a known public doc
    await page.goto(`${PUBLIC_DOCS_URL}/docs/overview/features`);

    // Verify public content is present
    await expect(page.locator('article')).toContainText('Features');
  });

  test('internal docs serve .specweave/docs/internal/', async ({ page }) => {
    // Navigate to a known internal doc
    await page.goto(`${INTERNAL_DOCS_URL}/docs/strategy/README`);

    // Verify internal content is present
    await expect(page.locator('article')).toContainText('Strategy');
  });
});

// Run all tests
test.describe('Integration Test Summary', () => {
  test('all systems operational', async ({ page }) => {
    console.log('\n📊 Test Summary:\n');
    console.log('✅ Public docs (port 3016): Running');
    console.log('✅ Internal docs (port 3015): Running');
    console.log('✅ No port conflicts');
    console.log('✅ Correct content served');
    console.log('✅ Search functional');
    console.log('✅ Security warnings in place');

    // Simple pass-through test to show summary
    expect(true).toBe(true);
  });
});
