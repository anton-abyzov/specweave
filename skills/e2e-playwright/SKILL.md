---
name: e2e-playwright
description: End-to-end browser automation and testing expert using Playwright. Tests web applications, validates user flows, captures screenshots, checks accessibility, and verifies functionality. SpecWeave-aware for increment testing. Activates for E2E testing, browser automation, web testing, Playwright, UI testing, integration testing, user flow validation, screenshot testing, accessibility testing, headless browser, test web app, browser test, automated testing, web automation, check website, validate UI, test increment.
allowed-tools: Bash, Read, Write, Glob, Grep
---

# E2E Playwright - Browser Automation & Testing Skill

## Purpose

Autonomous end-to-end testing and browser automation using Playwright. This skill enables comprehensive web application testing, user flow validation, visual regression testing, and accessibility checks.

**SpecWeave Integration**: Automatically detects SpecWeave increments and can generate test reports in `.specweave/increments/{id}/reports/`.

## Core Capabilities

### 1. User Flow Testing
- Login/logout flows with session management
- Multi-step form submissions and validation
- Shopping cart and checkout processes
- User registration and onboarding
- Password reset and account recovery

### 2. Visual Testing
- Full-page and element-specific screenshots
- Multi-viewport testing (mobile, tablet, desktop)
- Visual regression detection
- Responsive design validation

### 3. Functional Testing
- Link validation (detect broken links)
- Form field validation and error handling
- Button click responses and navigation
- API interaction validation
- Cookie and local storage management

### 4. Accessibility Testing
- ARIA attribute validation
- Keyboard navigation testing
- Screen reader compatibility checks
- Color contrast validation
- Focus management

## SpecWeave-Aware Features

**Increment Detection**: Automatically detects if running in a SpecWeave project and adapts behavior:

```javascript
// Auto-detected context
const specweaveContext = {
  isSpecweaveProject: true,
  activeIncrement: "0003-user-authentication",
  reportPath: ".specweave/increments/0003-user-authentication/reports/"
}
```

**Test Report Generation**: Creates structured test reports in increment folders:
- Test results with pass/fail status
- Screenshots organized by test case
- Performance metrics (page load, interaction timing)
- Accessibility violations summary

## Execution Workflow

### Step 1: Server Detection
Before testing, detect running development servers:

```javascript
const { detectServers } = require('./lib/utils.js');
const servers = await detectServers();
// Returns: [{ port: 3000, url: 'http://localhost:3000', name: 'Next.js' }]
```

### Step 2: Write Test Script
Create test scripts in `/tmp/e2e-test-${timestamp}.js`:

```javascript
const { chromium, devices } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false,  // Visible by default
    slowMo: 100       // Slowed for visibility
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();

  try {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Test actions here
    const title = await page.title();
    console.log('Page title:', title);

    await page.screenshot({
      path: '/tmp/homepage-test.png',
      fullPage: true
    });

    console.log('✅ Test passed');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
})();
```

### Step 3: Execute via Executor
Run the test script through the skill's executor:

```bash
cd $SKILL_DIR && node execute.js /tmp/e2e-test-${timestamp}.js
```

**Important**: Execute FROM the skill directory to ensure proper module resolution.

## Helper Utilities

The skill provides utilities in `lib/utils.js`:

### detectServers()
Auto-detects running development servers on common ports (3000-3010, 4000, 5000, 8000-8080).

```javascript
const servers = await detectServers();
// [{ port: 3000, url: 'http://localhost:3000', name: 'Dev Server' }]
```

### safeClick(page, selector, options)
Click with automatic wait and retry logic:

```javascript
await safeClick(page, 'button[type="submit"]', { timeout: 5000 });
```

### safeType(page, selector, text, options)
Type with automatic focus and validation:

```javascript
await safeType(page, 'input[name="email"]', 'user@example.com');
```

### captureScreenshot(page, name, options)
Timestamped screenshots with flexible naming:

```javascript
await captureScreenshot(page, 'login-form', { fullPage: true });
// Saves: /tmp/login-form-2025-10-27-14-30-45.png
```

### handleCookieBanner(page)
Automatically dismisses common cookie consent banners:

```javascript
await handleCookieBanner(page);
```

### extractTableData(page, selector)
Extract structured data from HTML tables:

```javascript
const data = await extractTableData(page, 'table.results');
// Returns: [{ column1: 'value1', column2: 'value2' }, ...]
```

### waitForStableDOM(page, timeout)
Wait for DOM to stop changing (useful after dynamic content loads):

```javascript
await waitForStableDOM(page, 3000);
```

### checkAccessibility(page)
Basic accessibility checks (ARIA, alt text, labels):

```javascript
const issues = await checkAccessibility(page);
// Returns: [{ type: 'missing-alt', element: 'img.logo' }, ...]
```

## Common Testing Patterns

### Pattern 1: Login Flow Test
```javascript
// Navigate to login page
await page.goto('http://localhost:3000/login');

// Fill credentials
await safeType(page, 'input[name="email"]', 'test@example.com');
await safeType(page, 'input[name="password"]', 'password123');

// Submit and wait for redirect
await Promise.all([
  page.waitForNavigation(),
  safeClick(page, 'button[type="submit"]')
]);

// Verify successful login
const dashboardTitle = await page.title();
console.log('Logged in, dashboard:', dashboardTitle);
```

### Pattern 2: Form Validation Test
```javascript
// Submit empty form to trigger validation
await safeClick(page, 'button[type="submit"]');

// Check for error messages
const errors = await page.locator('.error-message').allTextContents();
console.log('Validation errors:', errors);

// Verify form not submitted
const url = page.url();
assert(url.includes('/signup'), 'Should stay on signup page');
```

### Pattern 3: Responsive Design Test
```javascript
const viewports = [
  { name: 'Mobile', width: 375, height: 667 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Desktop', width: 1920, height: 1080 }
];

for (const viewport of viewports) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.screenshot({ path: `/tmp/responsive-${viewport.name.toLowerCase()}.png` });
  console.log(`✅ ${viewport.name} screenshot captured`);
}
```

### Pattern 4: Link Validation
```javascript
const links = await page.locator('a[href]').evaluateAll(anchors =>
  anchors.map(a => ({ text: a.textContent, href: a.href }))
);

const broken = [];
for (const link of links) {
  try {
    const response = await page.request.get(link.href);
    if (!response.ok()) broken.push(link);
  } catch (e) {
    broken.push({ ...link, error: e.message });
  }
}

console.log('Broken links:', broken);
```

## Best Practices

### 1. Use Visible Browser by Default
Set `headless: false` to observe test execution in real-time. This helps with debugging and understanding test behavior.

### 2. Add Slow Motion for Clarity
Use `slowMo: 100` to slow down actions for better visibility during development.

### 3. Wait for Network Idle
Always wait for network requests to complete before assertions:
```javascript
await page.waitForLoadState('networkidle');
```

### 4. Clean Up Resources
Always close browser instances in `finally` blocks to prevent resource leaks.

### 5. Capture Screenshots on Failure
In catch blocks, capture screenshots for debugging:
```javascript
catch (error) {
  await page.screenshot({ path: '/tmp/test-failure.png' });
  throw error;
}
```

### 6. Use Descriptive Console Output
Log clear messages for test steps and results:
```javascript
console.log('✅ Login successful');
console.log('❌ Form validation failed');
console.log('ℹ️  Found 5 broken links');
```

## Browser Selection

Playwright supports multiple browsers:

```javascript
// Chromium (default, fastest)
const browser = await chromium.launch();

// Firefox
const browser = await firefox.launch();

// WebKit (Safari)
const browser = await webkit.launch();
```

**Recommendation**: Use Chromium for development, test all browsers before production.

## Performance Considerations

- **Parallel Tests**: Run independent tests in parallel for faster execution
- **Browser Reuse**: Reuse browser contexts for multiple tests
- **Selective Screenshots**: Only capture screenshots when needed
- **Headless Mode**: Use `headless: true` in CI/CD for faster execution

## SpecWeave Test Report Format

When testing SpecWeave increments, generate reports in this format:

```markdown
# E2E Test Report - Increment 0003

**Date**: 2025-10-27
**Duration**: 45 seconds
**Status**: ✅ Passed

## Test Summary

- Total Tests: 5
- Passed: 5
- Failed: 0
- Skipped: 0

## Test Results

### TC-001: User Login Flow
- **Status**: ✅ Passed
- **Duration**: 8.2s
- **Screenshot**: `.specweave/increments/0003/reports/screenshots/login-flow.png`

### TC-002: Form Validation
- **Status**: ✅ Passed
- **Duration**: 5.1s
- **Assertions**: 3/3 passed

## Performance Metrics

- Average Page Load: 1.2s
- Total Interactions: 12
- Network Requests: 45

## Accessibility Issues

- Missing alt text: 2 instances (non-critical)
- Low contrast: 0 instances

## Recommendations

1. Add loading indicators for async operations
2. Improve error message visibility
3. Consider lazy loading for images
```

## Installation & Setup

**Initial Setup**:
```bash
cd $SKILL_DIR
npm install
npx playwright install chromium
```

**Verify Installation**:
```bash
node execute.js --version
```

## Troubleshooting

### Issue: "Cannot find module 'playwright'"
**Solution**: Run `npm install` in the skill directory

### Issue: "Browser not found"
**Solution**: Run `npx playwright install chromium`

### Issue: "Tests timeout"
**Solution**: Increase timeout in test scripts or check network connectivity

### Issue: "Screenshots not saving"
**Solution**: Ensure `/tmp/` directory is writable

## Advanced Features

### Context Persistence
Save browser state between tests:

```javascript
await context.storageState({ path: '/tmp/auth-state.json' });

// Later, restore state
const context = await browser.newContext({
  storageState: '/tmp/auth-state.json'
});
```

### Network Interception
Mock API responses for testing:

```javascript
await page.route('**/api/users', route => {
  route.fulfill({
    status: 200,
    body: JSON.stringify([{ id: 1, name: 'Test User' }])
  });
});
```

### Video Recording
Record test execution:

```javascript
const context = await browser.newContext({
  recordVideo: { dir: '/tmp/videos/' }
});
```

## Integration with CI/CD

For automated testing in CI/CD pipelines:

```bash
# Run headless with JUnit reporter
HEADLESS=true node execute.js test-suite.js --reporter=junit
```

## API Reference

For complete Playwright API documentation, refer to the official docs:
- https://playwright.dev/docs/api/class-page
- https://playwright.dev/docs/api/class-browser

## Notes

- **No MCP Required**: This skill is standalone and does not require MCP Playwright
- **Temp File Strategy**: All test scripts written to `/tmp/` to avoid project pollution
- **SpecWeave-First**: Designed to integrate seamlessly with SpecWeave workflow
- **Visible by Default**: Tests run with visible browser for better debugging

## Activation Keywords

This skill activates when you mention:
- E2E test, end-to-end test, browser test
- Playwright, web automation, UI test
- Test web app, validate website, check UI
- Screenshot, visual test, responsive test
- Login flow, user journey, test increment
- Accessibility test, broken link check
