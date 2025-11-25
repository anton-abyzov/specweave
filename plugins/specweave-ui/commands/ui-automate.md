# UI Automate - Browser Automation Workflows

Create and execute automated browser workflows using Playwright. Generate scripts for testing, web scraping, form automation, and UI interaction sequences.

## Usage

```
/specweave-ui:ui-automate <workflow-name> [options]
```

## What I Do

1. **Workflow Planning**: Define step-by-step browser automation sequences
2. **Script Generation**: Create Playwright TypeScript/JavaScript code (code-first approach)
3. **Error Handling**: Add retry logic, timeouts, and fallbacks
4. **Output Collection**: Capture screenshots, data, and validation results

> **Why Code-First?** Anthropic research shows [code execution beats MCP tool calls](https://www.anthropic.com/engineering/code-execution-with-mcp) with 98% token reduction. Playwright code is reusable, committable, CI-runnable, and deterministic.

## Workflow Types

### 1. Form Automation
```bash
/specweave-ui:ui-automate form-fill --url https://example.com/form \
  --fields "email=test@example.com,name=John Doe"
```

### 2. Data Extraction
```bash
/specweave-ui:ui-automate scrape --url https://example.com/products \
  --selectors "title=h1.product-title,price=.price"
```

### 3. UI Testing Sequence
```bash
/specweave-ui:ui-automate test-login --url https://example.com/login \
  --steps "fill:email,fill:password,click:submit,wait:dashboard"
```

### 4. Screenshot Capture
```bash
/specweave-ui:ui-automate screenshot --url https://example.com \
  --fullPage --output screenshots/homepage.png
```

### 5. Multi-Page Navigation
```bash
/specweave-ui:ui-automate navigate --start https://example.com \
  --flow "home>products>cart>checkout"
```

## Options

### General Options
- `--url <url>` - Starting URL for automation
- `--browser <browser>` - chromium, firefox, webkit (default: chromium)
- `--headless` - Run in headless mode (default: true)
- `--output <path>` - Output directory for artifacts

### Workflow Options
- `--steps <steps>` - Comma-separated list of actions
- `--selectors <selectors>` - CSS selectors for elements
- `--fields <fields>` - Form field values (key=value pairs)
- `--wait <selector>` - Wait for element before proceeding
- `--timeout <ms>` - Max time to wait for operations (default: 30000)

### Data Collection
- `--screenshot` - Capture screenshots at each step
- `--extract <selector>` - Extract text/attributes from elements
- `--save-html` - Save page HTML at key steps

## Generated Script Features

### TypeScript Example
```typescript
import { chromium, Browser, Page } from 'playwright';

async function automateWorkflow() {
  const browser: Browser = await chromium.launch({ headless: true });
  const page: Page = await browser.newPage();

  try {
    // Step 1: Navigate
    await page.goto('https://example.com', { waitUntil: 'networkidle' });

    // Step 2: Fill form
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'secure-password');

    // Step 3: Submit
    await page.click('button[type="submit"]');

    // Step 4: Wait for navigation
    await page.waitForSelector('.dashboard', { timeout: 5000 });

    // Step 5: Capture result
    await page.screenshot({ path: 'result.png', fullPage: true });

    console.log('✓ Automation completed successfully');
  } catch (error) {
    console.error('✗ Automation failed:', error.message);
    await page.screenshot({ path: 'error.png' });
    throw error;
  } finally {
    await browser.close();
  }
}

automateWorkflow();
```

## Use Cases

### 1. Regression Testing
Automate critical user flows to catch UI regressions early.

### 2. Data Collection
Extract product information, prices, availability from multiple pages.

### 3. Load Testing
Simulate multiple users interacting with the application.

### 4. Visual Regression
Capture screenshots across environments to detect visual changes.

### 5. Form Submission
Bulk-fill forms with test data for QA purposes.

## Error Handling

### Retry Logic
```typescript
await page.click('button', { timeout: 5000 })
  .catch(async () => {
    console.log('Retrying click...');
    await page.click('button', { force: true });
  });
```

### Fallback Selectors
```typescript
const selectors = ['#submit', '.submit-btn', 'button[type="submit"]'];
for (const selector of selectors) {
  if (await page.locator(selector).count() > 0) {
    await page.click(selector);
    break;
  }
}
```

## Best Practices

1. **Use Stable Selectors**: Prefer data-testid attributes over CSS classes
2. **Add Explicit Waits**: Don't rely on implicit timeouts
3. **Handle Errors Gracefully**: Capture screenshots on failures
4. **Clean Up Resources**: Always close browsers in finally blocks
5. **Avoid Hardcoded Delays**: Use waitForSelector instead of setTimeout

## Limitations

- Requires Playwright installation
- Cannot bypass CAPTCHAs or bot detection
- May fail on dynamically loaded content without proper waits
- Performance depends on network speed and page complexity

## Related Commands

- `/specweave-ui:ui-inspect` - Inspect page elements for selectors
- `/specweave-testing:e2e-setup` - Set up full E2E testing framework
- `/specweave-testing:test-generate` - Generate test files from automation scripts

## Environment Variables

- `PLAYWRIGHT_BROWSERS_PATH` - Custom browser binaries location
- `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` - Skip browser download on install
- `HEADLESS` - Default headless mode (true/false)
