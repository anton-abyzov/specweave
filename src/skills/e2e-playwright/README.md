# E2E Playwright Skill

End-to-end browser automation and testing skill for SpecWeave using Playwright.

## Overview

This skill enables autonomous browser testing and automation through natural language. Simply describe what you want to test, and Claude will generate custom Playwright code, execute it, and return results.

**Key Features**:
- 🎭 **Auto-Detection**: Automatically activates when you mention E2E testing, browser automation, or UI testing
- 🔷 **SpecWeave-Aware**: Detects SpecWeave projects and generates reports in increment folders
- 👁️ **Visible by Default**: Tests run with visible browser for better debugging
- 🛠️ **Helper Utilities**: Pre-built functions for common testing patterns
- 📸 **Screenshot Capture**: Timestamped screenshots for visual verification
- ♿ **Accessibility Checks**: Basic a11y validation built-in
- 📊 **Test Reports**: Generates structured reports in Markdown format

## Installation

### Prerequisites

- Node.js >= 14.0.0
- npm or yarn

### Setup

1. **Install the skill** (if not already installed via SpecWeave):
   ```bash
   cd ~/.claude/skills/e2e-playwright
   npm run setup
   ```

   This will:
   - Install Playwright package
   - Download Chromium browser
   - Set up all dependencies

2. **Verify installation**:
   ```bash
   node execute.js --version
   # Output: e2e-playwright v1.0.0
   ```

## Usage

### Basic Usage

Simply ask Claude to test something:

```
User: Test the homepage at localhost:3000
```

Claude will:
1. Detect available dev servers
2. Generate a Playwright test script
3. Execute it and show results
4. Capture screenshots if needed

### Example Commands

#### Basic Navigation
```
Test if localhost:3000 loads successfully
```

#### Form Testing
```
Test the login form - use email test@example.com and password testpass123
```

#### Responsive Design
```
Take screenshots of the homepage across mobile, tablet, and desktop viewports
```

#### Link Validation
```
Check for broken links on the homepage
```

#### Accessibility Testing
```
Run accessibility checks on the signup page
```

#### User Flow
```
Test the complete checkout flow - add item to cart, fill shipping info, and complete payment
```

## How It Works

### 1. Automatic Activation

The skill activates when you use keywords like:
- E2E test, browser test, UI test
- Playwright, web automation
- Test login, test form, test website
- Screenshot, visual test
- Accessibility test, a11y check

### 2. Code Generation

Claude generates custom Playwright code based on your request:

```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false,  // Visible browser
    slowMo: 100       // Slowed for clarity
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:3000');

  // Your test logic here...

  await browser.close();
})();
```

### 3. Execution

The executor (`execute.js`) handles:
- Module resolution (runs from skill directory)
- Dependency verification
- Code wrapping (if needed)
- Error handling
- SpecWeave context detection

### 4. Results

You'll see:
- Real-time browser execution (visible by default)
- Console output with step-by-step progress
- Screenshots saved to `/tmp/`
- Test reports (in SpecWeave projects)

## Helper Utilities

The skill provides pre-built utilities in `lib/utils.js`:

### detectServers()
Auto-detect running dev servers:
```javascript
const servers = await detectServers();
// [{ port: 3000, url: 'http://localhost:3000', name: 'Next.js' }]
```

### safeClick(page, selector, options)
Click with automatic wait and retry:
```javascript
await safeClick(page, 'button[type="submit"]');
```

### safeType(page, selector, text, options)
Type with automatic focus and validation:
```javascript
await safeType(page, 'input[name="email"]', 'test@example.com');
```

### captureScreenshot(page, name, options)
Timestamped screenshots:
```javascript
await captureScreenshot(page, 'login-form');
// Saves: /tmp/login-form-2025-10-27-14-30-45.png
```

### checkAccessibility(page)
Basic accessibility validation:
```javascript
const issues = await checkAccessibility(page);
console.log('Accessibility issues:', issues);
```

### waitForStableDOM(page, timeout)
Wait for dynamic content to settle:
```javascript
await waitForStableDOM(page, 2000);
```

**See SKILL.md for complete API reference**

## SpecWeave Integration

### Context Detection

When running in a SpecWeave project, the skill:
- Detects `.specweave/` directory
- Identifies active increment (in-progress status)
- Saves test reports to `.specweave/increments/{id}/reports/`

### Test Report Generation

Generate structured test reports:

```javascript
const { generateTestReport, saveTestReport } = require('./lib/utils.js');

const results = {
  tests: [
    { name: 'TC-001: Login', status: '✅ Passed', duration: '3.2s' }
  ],
  summary: { total: 1, passed: 1, failed: 0 },
  performance: { 'Page Load': '1.2s' },
  accessibility: []
};

const report = generateTestReport(results, '0003-user-auth');
saveTestReport(report, '/path/to/increment', 'e2e-test-report.md');
```

Report format follows SpecWeave conventions with sections for:
- Test Summary
- Individual Results
- Performance Metrics
- Accessibility Issues
- Recommendations

## Examples

### Example 1: Basic Page Test

**Request**: "Test if the homepage loads"

**Generated Code**:
```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const page = await browser.newPage();

  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  const title = await page.title();
  console.log('✅ Page loaded. Title:', title);

  await captureScreenshot(page, 'homepage');
  await browser.close();
})();
```

### Example 2: Form Interaction

**Request**: "Test the login form with email test@example.com"

**Generated Code**:
```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const page = await browser.newPage();

  await page.goto('http://localhost:3000/login');

  await safeType(page, 'input[name="email"]', 'test@example.com');
  await safeType(page, 'input[name="password"]', 'password123');

  await captureScreenshot(page, 'login-filled');

  await Promise.all([
    page.waitForNavigation(),
    safeClick(page, 'button[type="submit"]')
  ]);

  console.log('✅ Login successful. URL:', page.url());
  await captureScreenshot(page, 'after-login');

  await browser.close();
})();
```

### Example 3: Responsive Testing

**Request**: "Test responsive design across mobile, tablet, and desktop"

**Generated Code**:
```javascript
const { chromium, devices } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });

  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1920, height: 1080 }
  ];

  for (const viewport of viewports) {
    const page = await browser.newPage();
    await page.setViewportSize(viewport);

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    await captureScreenshot(page, `homepage-${viewport.name.toLowerCase()}`);
    console.log(`✅ ${viewport.name} screenshot captured`);

    await page.close();
  }

  await browser.close();
})();
```

## Advanced Features

### Network Interception

Mock API responses:
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

### Context Persistence

Save and restore browser state:
```javascript
// Save
await context.storageState({ path: '/tmp/auth-state.json' });

// Restore
const context = await browser.newContext({
  storageState: '/tmp/auth-state.json'
});
```

## Testing the Skill

Run test cases to verify functionality:

```bash
# Verify installation
node execute.js --version

# Test basic execution
echo "console.log('Hello, Playwright!')" | node execute.js

# Run from file
echo "const { chromium } = require('playwright'); console.log('✅ Playwright loaded');" > /tmp/test.js
node execute.js /tmp/test.js
```

**Automated Test Cases**:
- `TC-001-basic-navigation.yaml` - Basic browser launch and navigation
- `TC-002-form-interaction.yaml` - Form filling with helper utilities
- `TC-003-specweave-integration.yaml` - SpecWeave context detection and reporting
- `TC-004-accessibility-check.yaml` - Accessibility validation

## Troubleshooting

### Issue: "Cannot find module 'playwright'"

**Solution**: Run setup script
```bash
cd ~/.claude/skills/e2e-playwright
npm run setup
```

### Issue: "Browser not found"

**Solution**: Install Chromium browser
```bash
npx playwright install chromium
```

### Issue: "ECONNREFUSED on localhost:3000"

**Solution**: Make sure your dev server is running
```bash
# Detect running servers
const servers = await detectServers();
console.log(servers);
```

### Issue: "Test times out"

**Solution**: Increase timeout in test script
```javascript
await page.waitForSelector('button', { timeout: 30000 });
```

### Issue: "Screenshots not saving"

**Solution**: Check `/tmp/` directory permissions
```bash
ls -la /tmp/
```

## Best Practices

1. **Start with visible browser**: Use `headless: false` during development
2. **Add slow motion**: Use `slowMo: 100` for better visibility
3. **Wait for network idle**: Always wait for page to fully load
4. **Capture screenshots**: Take screenshots before and after key actions
5. **Use helper utilities**: Leverage `safeClick`, `safeType` for reliability
6. **Clean up resources**: Always close browser in `finally` blocks
7. **Test incrementally**: Break complex flows into smaller tests
8. **Check accessibility**: Run `checkAccessibility()` regularly

## Performance

- **Chromium**: Fastest, recommended for development
- **Firefox**: Good compatibility, slightly slower
- **WebKit**: Safari engine, use for cross-browser testing
- **Headless mode**: 2-3x faster, use in CI/CD
- **Parallel tests**: Run independent tests concurrently

## CI/CD Integration

Run tests in headless mode:

```bash
HEADLESS=true node execute.js test-suite.js
```

Example GitHub Actions:
```yaml
- name: Run E2E Tests
  run: |
    cd ~/.claude/skills/e2e-playwright
    npm run setup
    HEADLESS=true node execute.js tests/e2e-suite.js
```

## Comparison with Original

This skill is **inspired by** [lackeyjb/playwright-skill](https://github.com/lackeyjb/playwright-skill) but with significant enhancements:

### Key Differences

| Feature | Original | SpecWeave Version |
|---------|----------|-------------------|
| **Name** | `playwright-skill` | `e2e-playwright` |
| **Executor** | `run.js` | `execute.js` |
| **Helpers** | `lib/helpers.js` | `lib/utils.js` |
| **SpecWeave Integration** | ❌ No | ✅ Yes (context detection, reports) |
| **Test Cases** | ❌ None | ✅ 4 YAML test cases |
| **Accessibility** | ❌ Basic | ✅ Comprehensive `checkAccessibility()` |
| **Report Generation** | ❌ No | ✅ Markdown reports in increments |
| **Dependencies** | MCP optional | ❌ No MCP required |

### What's Enhanced

1. **SpecWeave-Aware**: Auto-detects SpecWeave projects and generates reports in increment folders
2. **More Utilities**: Additional helpers like `waitForStableDOM`, `scrollToElement`, `countElements`
3. **Better Error Handling**: Clearer error messages with context
4. **Test Report Format**: Structured Markdown reports following SpecWeave conventions
5. **Test Cases**: Comprehensive YAML test cases for validation
6. **Documentation**: More extensive examples and troubleshooting

### Credit

Original concept by [@lackeyjb](https://github.com/lackeyjb). This is a reimagined version specifically for SpecWeave workflows.

## Contributing

Contributions welcome! Please:
1. Add test cases for new features
2. Follow SpecWeave conventions
3. Update documentation
4. Test with both SpecWeave and non-SpecWeave projects

## License

MIT License - See LICENSE file for details

## Support

- **Documentation**: See SKILL.md for complete API reference
- **Issues**: Report bugs or request features via GitHub issues
- **SpecWeave**: See [SpecWeave documentation](https://github.com/anton-abyzov/specweave) for framework details

## Version History

- **1.0.0** (2025-10-27)
  - Initial release
  - SpecWeave integration
  - 4 comprehensive test cases
  - Enhanced helper utilities
  - Test report generation

---

**Happy Testing! 🎭**
