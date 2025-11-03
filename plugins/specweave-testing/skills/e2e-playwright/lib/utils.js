/**
 * Playwright Helper Utilities for SpecWeave
 *
 * Collection of helper functions for common Playwright testing patterns.
 * SpecWeave-aware utilities for enhanced testing workflows.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Detect running development servers on common ports
 *
 * @returns {Promise<Array<{port: number, url: string, name: string}>>}
 */
async function detectServers() {
  const commonPorts = [3000, 3001, 3002, 3010, 4000, 5000, 5173, 8000, 8080, 8888];
  const servers = [];

  for (const port of commonPorts) {
    try {
      // Use lsof to check if port is in use (macOS/Linux)
      const result = execSync(`lsof -i :${port} -sTCP:LISTEN -t`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore']
      });

      if (result.trim()) {
        servers.push({
          port,
          url: `http://localhost:${port}`,
          name: guessServerName(port)
        });
      }
    } catch (e) {
      // Port not in use, continue
    }
  }

  return servers;
}

/**
 * Guess server name based on common port conventions
 */
function guessServerName(port) {
  const nameMap = {
    3000: 'Next.js / React Dev',
    3001: 'Secondary Dev Server',
    5173: 'Vite',
    4000: 'Express / Backend',
    8000: 'Python / Django',
    8080: 'Java / Spring Boot'
  };

  return nameMap[port] || 'Dev Server';
}

/**
 * Safe click with automatic wait and retry
 *
 * @param {Page} page - Playwright page object
 * @param {string} selector - CSS selector
 * @param {object} options - Click options
 */
async function safeClick(page, selector, options = {}) {
  const timeout = options.timeout || 10000;
  const retries = options.retries || 3;

  for (let i = 0; i < retries; i++) {
    try {
      await page.waitForSelector(selector, { timeout, state: 'visible' });
      await page.click(selector, { timeout });
      return;
    } catch (error) {
      if (i === retries - 1) {
        throw new Error(`Failed to click "${selector}" after ${retries} attempts: ${error.message}`);
      }
      // Wait before retry
      await page.waitForTimeout(1000);
    }
  }
}

/**
 * Safe type with automatic focus and validation
 *
 * @param {Page} page - Playwright page object
 * @param {string} selector - CSS selector
 * @param {string} text - Text to type
 * @param {object} options - Type options
 */
async function safeType(page, selector, text, options = {}) {
  const timeout = options.timeout || 10000;
  const clearFirst = options.clear !== false; // Default true

  await page.waitForSelector(selector, { timeout, state: 'visible' });

  // Focus the input
  await page.focus(selector);

  // Clear existing value if requested
  if (clearFirst) {
    await page.fill(selector, '');
  }

  // Type with slight delay for realism
  await page.type(selector, text, { delay: options.delay || 50 });

  // Verify text was entered (optional)
  if (options.verify !== false) {
    const value = await page.inputValue(selector);
    if (value !== text && !options.partial) {
      throw new Error(`Failed to type into "${selector}". Expected "${text}", got "${value}"`);
    }
  }
}

/**
 * Capture timestamped screenshot
 *
 * @param {Page} page - Playwright page object
 * @param {string} name - Base name for screenshot
 * @param {object} options - Screenshot options
 * @returns {string} Path to screenshot
 */
async function captureScreenshot(page, name, options = {}) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `${name}-${timestamp}.png`;
  const filepath = path.join(options.dir || '/tmp', filename);

  await page.screenshot({
    path: filepath,
    fullPage: options.fullPage !== false, // Default true
    ...options
  });

  console.log(`📸 Screenshot saved: ${filepath}`);
  return filepath;
}

/**
 * Handle common cookie consent banners
 *
 * @param {Page} page - Playwright page object
 */
async function handleCookieBanner(page) {
  const commonSelectors = [
    'button:has-text("Accept")',
    'button:has-text("Accept All")',
    'button:has-text("Agree")',
    'button:has-text("OK")',
    'button:has-text("I Agree")',
    'button[id*="accept"]',
    'button[class*="accept"]',
    'button[class*="cookie"]',
    '[data-testid="cookie-accept"]'
  ];

  for (const selector of commonSelectors) {
    try {
      const element = await page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 })) {
        await element.click();
        console.log('✅ Cookie banner dismissed');
        return true;
      }
    } catch (e) {
      // Continue to next selector
    }
  }

  return false;
}

/**
 * Extract data from HTML table
 *
 * @param {Page} page - Playwright page object
 * @param {string} selector - Table selector
 * @returns {Array<object>} Array of row objects
 */
async function extractTableData(page, selector) {
  return await page.evaluate((sel) => {
    const table = document.querySelector(sel);
    if (!table) return [];

    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
    const rows = Array.from(table.querySelectorAll('tbody tr'));

    return rows.map(row => {
      const cells = Array.from(row.querySelectorAll('td'));
      const rowData = {};
      cells.forEach((cell, index) => {
        rowData[headers[index] || `column${index}`] = cell.textContent.trim();
      });
      return rowData;
    });
  }, selector);
}

/**
 * Wait for DOM to stabilize (no changes for specified duration)
 *
 * @param {Page} page - Playwright page object
 * @param {number} stabilityTime - Time in ms to wait for stability
 */
async function waitForStableDOM(page, stabilityTime = 1000) {
  let lastMutationTime = Date.now();
  let stabilityTimeout;

  return new Promise((resolve) => {
    const observer = page.evaluateHandle((ms) => {
      return new Promise((res) => {
        let lastChange = Date.now();
        let timeout;

        const checkStability = () => {
          if (Date.now() - lastChange >= ms) {
            observer.disconnect();
            res();
          }
        };

        const observer = new MutationObserver(() => {
          lastChange = Date.now();
          clearTimeout(timeout);
          timeout = setTimeout(checkStability, ms);
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true
        });

        // Initial stability check
        timeout = setTimeout(checkStability, ms);
      });
    }, stabilityTime);

    observer.then(() => resolve());
  });
}

/**
 * Basic accessibility checks
 *
 * @param {Page} page - Playwright page object
 * @returns {Array<{type: string, element: string, message: string}>}
 */
async function checkAccessibility(page) {
  return await page.evaluate(() => {
    const issues = [];

    // Check for images without alt text
    document.querySelectorAll('img').forEach(img => {
      if (!img.alt) {
        issues.push({
          type: 'missing-alt',
          element: img.outerHTML.substring(0, 100),
          message: 'Image missing alt text'
        });
      }
    });

    // Check for form inputs without labels
    document.querySelectorAll('input, textarea, select').forEach(input => {
      if (input.type === 'hidden') return;

      const hasLabel = !!input.closest('label') ||
                      !!document.querySelector(`label[for="${input.id}"]`) ||
                      !!input.getAttribute('aria-label') ||
                      !!input.getAttribute('aria-labelledby');

      if (!hasLabel) {
        issues.push({
          type: 'missing-label',
          element: input.outerHTML.substring(0, 100),
          message: 'Form input missing label or ARIA label'
        });
      }
    });

    // Check for buttons without accessible text
    document.querySelectorAll('button').forEach(button => {
      const hasText = button.textContent.trim() ||
                     button.getAttribute('aria-label') ||
                     button.querySelector('img')?.alt;

      if (!hasText) {
        issues.push({
          type: 'missing-button-text',
          element: button.outerHTML.substring(0, 100),
          message: 'Button missing accessible text'
        });
      }
    });

    // Check for links without text
    document.querySelectorAll('a').forEach(link => {
      const hasText = link.textContent.trim() ||
                     link.getAttribute('aria-label') ||
                     link.querySelector('img')?.alt;

      if (!hasText) {
        issues.push({
          type: 'missing-link-text',
          element: link.outerHTML.substring(0, 100),
          message: 'Link missing accessible text'
        });
      }
    });

    return issues;
  });
}

/**
 * Generate SpecWeave test report
 *
 * @param {object} results - Test results object
 * @param {string} incrementId - Increment ID (e.g., "0003-user-auth")
 * @returns {string} Report content in Markdown
 */
function generateTestReport(results, incrementId) {
  const {
    tests = [],
    summary = {},
    performance = {},
    accessibility = [],
    recommendations = []
  } = results;

  const date = new Date().toISOString().split('T')[0];
  const status = summary.failed === 0 ? '✅ Passed' : '❌ Failed';

  let report = `# E2E Test Report - Increment ${incrementId}\n\n`;
  report += `**Date**: ${date}\n`;
  report += `**Duration**: ${summary.duration || 'N/A'}\n`;
  report += `**Status**: ${status}\n\n`;

  report += `## Test Summary\n\n`;
  report += `- Total Tests: ${summary.total || 0}\n`;
  report += `- Passed: ${summary.passed || 0}\n`;
  report += `- Failed: ${summary.failed || 0}\n`;
  report += `- Skipped: ${summary.skipped || 0}\n\n`;

  if (tests.length > 0) {
    report += `## Test Results\n\n`;
    tests.forEach(test => {
      report += `### ${test.name}\n`;
      report += `- **Status**: ${test.status}\n`;
      report += `- **Duration**: ${test.duration}\n`;
      if (test.screenshot) {
        report += `- **Screenshot**: \`${test.screenshot}\`\n`;
      }
      if (test.error) {
        report += `- **Error**: ${test.error}\n`;
      }
      report += `\n`;
    });
  }

  if (Object.keys(performance).length > 0) {
    report += `## Performance Metrics\n\n`;
    Object.entries(performance).forEach(([key, value]) => {
      report += `- ${key}: ${value}\n`;
    });
    report += `\n`;
  }

  if (accessibility.length > 0) {
    report += `## Accessibility Issues\n\n`;
    const grouped = accessibility.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    }, {});

    Object.entries(grouped).forEach(([type, count]) => {
      report += `- ${type}: ${count} instance${count > 1 ? 's' : ''}\n`;
    });
    report += `\n`;
  }

  if (recommendations.length > 0) {
    report += `## Recommendations\n\n`;
    recommendations.forEach((rec, i) => {
      report += `${i + 1}. ${rec}\n`;
    });
    report += `\n`;
  }

  report += `---\n`;
  report += `*Generated by e2e-playwright skill*\n`;

  return report;
}

/**
 * Save test report to SpecWeave increment folder
 *
 * @param {string} reportContent - Markdown report content
 * @param {string} incrementPath - Path to increment folder
 * @param {string} filename - Report filename
 */
function saveTestReport(reportContent, incrementPath, filename = 'e2e-test-report.md') {
  const reportsDir = path.join(incrementPath, 'reports');

  // Create reports directory if it doesn't exist
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const reportPath = path.join(reportsDir, filename);
  fs.writeFileSync(reportPath, reportContent, 'utf8');

  console.log(`📄 Test report saved: ${reportPath}`);
  return reportPath;
}

/**
 * Wait for network to be idle
 *
 * @param {Page} page - Playwright page object
 * @param {number} timeout - Timeout in ms
 */
async function waitForNetworkIdle(page, timeout = 30000) {
  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch (e) {
    console.warn('⚠️  Network idle timeout - continuing anyway');
  }
}

/**
 * Scroll to element
 *
 * @param {Page} page - Playwright page object
 * @param {string} selector - CSS selector
 */
async function scrollToElement(page, selector) {
  await page.locator(selector).scrollIntoViewIfNeeded();
}

/**
 * Wait for element to be visible
 *
 * @param {Page} page - Playwright page object
 * @param {string} selector - CSS selector
 * @param {number} timeout - Timeout in ms
 */
async function waitForVisible(page, selector, timeout = 10000) {
  await page.waitForSelector(selector, { state: 'visible', timeout });
}

/**
 * Check if element exists
 *
 * @param {Page} page - Playwright page object
 * @param {string} selector - CSS selector
 * @returns {boolean}
 */
async function elementExists(page, selector) {
  try {
    await page.waitForSelector(selector, { timeout: 1000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get text content of element
 *
 * @param {Page} page - Playwright page object
 * @param {string} selector - CSS selector
 * @returns {string}
 */
async function getText(page, selector) {
  return await page.locator(selector).textContent();
}

/**
 * Get all matching elements count
 *
 * @param {Page} page - Playwright page object
 * @param {string} selector - CSS selector
 * @returns {number}
 */
async function countElements(page, selector) {
  return await page.locator(selector).count();
}

// Export all utilities
module.exports = {
  detectServers,
  safeClick,
  safeType,
  captureScreenshot,
  handleCookieBanner,
  extractTableData,
  waitForStableDOM,
  checkAccessibility,
  generateTestReport,
  saveTestReport,
  waitForNetworkIdle,
  scrollToElement,
  waitForVisible,
  elementExists,
  getText,
  countElements
};
