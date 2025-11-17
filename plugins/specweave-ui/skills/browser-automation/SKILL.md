---
name: browser-automation
description: |
  Browser automation and E2E testing using Playwright MCP (always available).
  Auto-activates for: browser automation, web testing, E2E tests, Playwright, browser interaction,
  scraping, testing flows, user journeys, accessibility testing, screenshot capture.

  CRITICAL: ALWAYS use Playwright MCP (mcp__plugin_specweave-ui_playwright__*) as PRIMARY choice.

  NOTE: Browserbase tools (mcp__plugin_specweave-ui_browserbase__*) are NOT loaded by default.
  They require manual setup and are only for CI/CD or cloud scenarios.
allowed-tools:
  - mcp__plugin_specweave-ui_playwright__*
  - mcp__plugin_specweave-ui_browserbase__*
  - Read
  - Write
  - Bash
---

# Browser Automation Skill

**Expert in browser automation and E2E testing using Playwright MCP and Browserbase.**

## Core Capabilities

### 1. Playwright MCP Integration (PRIMARY - Local Testing)

**✅ ALWAYS TRY PLAYWRIGHT MCP FIRST!**

Playwright MCP provides local, fast, reliable browser automation:

#### Available Tools (mcp__plugin_specweave-ui_playwright__*)

- **browser_goto** - Navigate to URLs
- **browser_click** - Click elements (by role, text, test ID)
- **browser_fill** - Fill form inputs
- **browser_press** - Keyboard interactions
- **browser_evaluate** - Execute JavaScript
- **browser_snapshot** - Get accessibility tree (for element selection)
- **browser_console_messages** - Retrieve console logs
- **browser_close** - Close browser session

#### Best Practices (Microsoft Playwright MCP Guidelines)

**Element Selection Strategy** (in priority order):

1. **getByRole** (PREFERRED) - Accessibility-first, semantic selection
   ```javascript
   // Example: Click a button
   browser_click({ ref: "button[name='submit']", element: "Submit button" })
   ```

2. **getByText** - Text content selection
   ```javascript
   // Example: Find by visible text
   browser_click({ ref: "text='Sign In'", element: "Sign In button" })
   ```

3. **getByTestId** - Test ID attributes (data-testid)
   ```javascript
   // Example: Use test IDs
   browser_click({ ref: "[data-testid='login-btn']", element: "Login button" })
   ```

4. **Avoid .locator** - Only use when absolutely necessary with justification comment

**Session Management**:
- Default: Persistent profile (retains login state)
- Use `--isolated` flag for fresh sessions
- Use `--storage-state` for pre-authenticated scenarios

**Configuration Options**:
```json
{
  "playwright": {
    "command": "npx",
    "args": [
      "@playwright/mcp@latest",
      "--browser", "chromium",    // or firefox, webkit, msedge
      "--headless",               // or omit for headed mode
      "--timeout-action", "5000", // ms
      "--timeout-navigation", "60000" // ms
    ]
  }
}
```

#### Testing Workflow

**Step 1: Navigate**
```javascript
browser_goto({ url: "https://example.com" })
```

**Step 2: Get Snapshot (for element discovery)**
```javascript
browser_snapshot({ fullPage: true })
// Returns accessibility tree with element refs
```

**Step 3: Interact with Elements**
```javascript
// Click button (by role)
browser_click({
  ref: "button[name='login']",
  element: "Login button"
})

// Fill input (by role)
browser_fill({
  ref: "input[name='email']",
  text: "user@example.com"
})

// Press Enter
browser_press({
  ref: "input[name='email']",
  key: "Enter"
})
```

**Step 4: Verify Results**
```javascript
// Execute JavaScript to check state
browser_evaluate({
  code: "document.querySelector('.success-message').textContent"
})

// Get console messages
browser_console_messages()
```

**Step 5: Clean Up**
```javascript
browser_close()
```

### 2. Browserbase Integration (OPTIONAL - Cloud Testing)

**⚠️ NOT LOADED BY DEFAULT - Manual setup required!**

**Note**: Browserbase is NOT auto-loaded to save ~5,600 tokens per request. Enable only when needed for CI/CD or cloud scenarios.

Browserbase provides cloud-based browser automation:

#### When to Use Browserbase

- ✅ CI/CD pipelines without local browsers
- ✅ Parallel test execution (10x faster)
- ✅ Cross-browser testing at scale
- ❌ **NOT for local development** (use Playwright MCP!)

#### Available Tools (mcp__plugin_specweave-ui_browserbase__*)

**Note**: These tools are ONLY available after manual setup.

- **browserbase_session_create** - Create cloud session
- **browserbase_session_close** - Close session
- **browserbase_stagehand_navigate** - Navigate to URL
- **browserbase_stagehand_act** - Perform action (click, type, etc.)
- **browserbase_stagehand_extract** - Extract data from page
- **browserbase_stagehand_observe** - Find elements
- **browserbase_screenshot** - Capture screenshot
- **browserbase_stagehand_get_url** - Get current URL
- **browserbase_stagehand_agent** - Run autonomous task

#### Manual Setup (when needed)

1. Get API credentials from [Browserbase](https://www.browserbase.com/)
2. Set environment variables:
   ```bash
   export BROWSERBASE_API_KEY="bb_xxx"
   export BROWSERBASE_PROJECT_ID="proj_xxx"
   ```
3. Add to `.claude/settings.json`:
   ```json
   {
     "mcpServers": {
       "browserbase": {
         "command": "npx",
         "args": ["-y", "@browserbasehq/mcp-server-browserbase"],
         "env": {
           "BROWSERBASE_API_KEY": "${BROWSERBASE_API_KEY}",
           "BROWSERBASE_PROJECT_ID": "${BROWSERBASE_PROJECT_ID}"
         }
       }
     }
   }
   ```
4. Restart Claude Code

#### Testing Workflow (Browserbase)

**Step 1: Create Session**
```javascript
browserbase_session_create()
```

**Step 2: Navigate**
```javascript
browserbase_stagehand_navigate({ url: "https://example.com" })
```

**Step 3: Interact**
```javascript
// Click button (natural language)
browserbase_stagehand_act({
  action: "Click the login button"
})

// Fill form (natural language)
browserbase_stagehand_act({
  action: "Type 'user@example.com' into the email field"
})
```

**Step 4: Extract Data**
```javascript
browserbase_stagehand_extract({
  instruction: "Extract all product names and prices"
})
```

**Step 5: Close Session**
```javascript
browserbase_session_close()
```

### 3. E2E Test Writing Best Practices

#### Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('User Login Flow', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    // ✅ Use accessibility-first selectors
    await page.goto('https://example.com/login');

    // ✅ getByRole (PREFERRED)
    await page.getByRole('textbox', { name: 'Email' }).fill('user@example.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // ✅ Verify outcome
    await expect(page.getByText('Welcome back!')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('https://example.com/login');

    // ✅ getByTestId for stable selectors
    await page.getByTestId('email-input').fill('invalid@example.com');
    await page.getByTestId('password-input').fill('wrong');
    await page.getByTestId('login-button').click();

    // ✅ Verify error message
    await expect(page.getByText('Invalid credentials')).toBeVisible();
  });
});
```

#### Selector Guidelines (Priority Order)

1. **getByRole** - Accessibility-first (BEST)
   - `getByRole('button', { name: 'Submit' })`
   - `getByRole('textbox', { name: 'Email' })`
   - `getByRole('link', { name: 'Home' })`

2. **getByText** - Visible text (GOOD)
   - `getByText('Sign In')`
   - `getByText(/welcome/i)` (regex)

3. **getByTestId** - Test attributes (OK)
   - `getByTestId('login-form')`
   - Requires: `<form data-testid="login-form">`

4. **getByLabel** - Form labels (OK)
   - `getByLabel('Email')`

5. **.locator** - CSS/XPath (AVOID)
   - Only use with clear justification comment
   - Example: `// JUSTIFICATION: Complex table structure requires XPath`

#### Test Organization

```typescript
// ✅ Use .serial for dependent tests
test.describe.serial('User Journey', () => {
  test('step 1: register', async ({ page }) => {
    // Registration flow
  });

  test('step 2: verify email', async ({ page }) => {
    // Email verification (depends on step 1)
  });

  test('step 3: complete profile', async ({ page }) => {
    // Profile completion (depends on step 2)
  });
});

// ✅ Re-use auth state
test.use({ storageState: 'auth.json' });

test('authenticated action', async ({ page }) => {
  // Already logged in via storageState
  await page.goto('https://example.com/dashboard');
});
```

### 4. Common Patterns

#### Pattern: Form Submission
```javascript
// Playwright MCP
browser_goto({ url: "https://example.com/contact" })
browser_fill({ ref: "input[name='email']", text: "user@example.com" })
browser_fill({ ref: "textarea[name='message']", text: "Hello!" })
browser_click({ ref: "button[type='submit']", element: "Submit button" })

// Browserbase (fallback)
browserbase_stagehand_act({ action: "Fill email with user@example.com" })
browserbase_stagehand_act({ action: "Fill message with Hello!" })
browserbase_stagehand_act({ action: "Click the Submit button" })
```

#### Pattern: Data Extraction
```javascript
// Playwright MCP
browser_snapshot() // Get page structure
browser_evaluate({
  code: `
    Array.from(document.querySelectorAll('.product')).map(el => ({
      name: el.querySelector('.name').textContent,
      price: el.querySelector('.price').textContent
    }))
  `
})

// Browserbase (fallback)
browserbase_stagehand_extract({
  instruction: "Extract all product names and prices from the page"
})
```

#### Pattern: Screenshot Capture
```javascript
// Playwright MCP
browser_evaluate({
  code: `
    const canvas = await page.screenshot({ fullPage: true });
    canvas.toDataURL('image/png')
  `
})

// Browserbase (fallback)
browserbase_screenshot({ name: "page-capture" })
```

### 5. Debugging E2E Tests

#### Test Output Analysis

When tests fail, check `test-output/` for:
- **Error context** (.md files) - What went wrong
- **Screenshots** (.png files) - End state visualization
- **Traces** (.zip files) - Full execution trace

#### Common Issues

**Issue: Element not found**
```javascript
// ❌ BAD: Fragile selector
await page.locator('.btn-primary').click()

// ✅ GOOD: Accessibility-first
await page.getByRole('button', { name: 'Submit' }).click()
```

**Issue: Timing issues**
```javascript
// ❌ BAD: Arbitrary wait
await page.waitForTimeout(5000)

// ✅ GOOD: Wait for specific condition
await page.waitForSelector('[data-testid="success-message"]')
await expect(page.getByText('Success')).toBeVisible()
```

**Issue: Flaky tests**
```javascript
// ✅ Use test-only API endpoints
await request.post('/api/test/seed', { data: testData })

// ✅ Re-use auth storage state
test.use({ storageState: 'auth.json' })

// ✅ Explicit waits
await page.waitForLoadState('networkidle')
```

## Decision Tree: Which Tool to Use?

```
Are you running locally (dev machine or VM)?
├─ YES → Use Playwright MCP (PRIMARY)
│  ├─ Tools: mcp__plugin_specweave-ui_playwright__*
│  ├─ Fast, reliable, local execution
│  └─ No API keys needed
│
└─ NO → Running in CI/CD or need cloud infrastructure?
   └─ YES → Use Browserbase (FALLBACK)
      ├─ Tools: mcp__plugin_specweave-ui_browserbase__*
      ├─ Requires: BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID
      └─ Benefits: Parallel execution, no browser install
```

## Configuration Files

### .mcp.json (Plugin-Level - Auto-Loaded)
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"],
      "description": "Local Playwright - PRIMARY",
      "optional": false
    }
  }
}
```

**Note**: Browserbase is NOT in `.mcp.json` (not auto-loaded). To enable Browserbase, add it to your project's `.claude/settings.json` as shown in the "Manual Setup" section above.

### playwright.config.ts (Project-Level)
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  use: {
    // ✅ Accessibility-first testing
    actionTimeout: 5000,
    navigationTimeout: 60000,

    // ✅ Screenshots on failure
    screenshot: 'only-on-failure',

    // ✅ Traces for debugging
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' }
    },
    {
      name: 'firefox',
      use: { browserName: 'firefox' }
    },
    {
      name: 'webkit',
      use: { browserName: 'webkit' }
    }
  ]
});
```

## Quick Reference

### Playwright MCP Commands
```bash
# Install MCP server
npx @playwright/mcp@latest

# Run with options
npx @playwright/mcp@latest --browser chromium --headless

# Run with config
npx @playwright/mcp@latest --config playwright-mcp.json
```

### Browserbase Setup
```bash
# Get API keys
# 1. Sign up at https://www.browserbase.com/
# 2. Create project
# 3. Get API key and project ID

# Set environment
export BROWSERBASE_API_KEY="bb_xxx"
export BROWSERBASE_PROJECT_ID="proj_xxx"

# Test connection
npx -y @browserbasehq/mcp-server-browserbase
```

## Examples

### Example 1: Login Flow (Playwright MCP)
```javascript
// Step 1: Navigate
browser_goto({ url: "https://app.example.com/login" })

// Step 2: Fill form
browser_fill({ ref: "input[name='email']", text: "user@example.com" })
browser_fill({ ref: "input[name='password']", text: "secure123" })

// Step 3: Submit
browser_click({ ref: "button[type='submit']", element: "Login button" })

// Step 4: Verify
browser_evaluate({ code: "document.querySelector('.welcome').textContent" })
// Returns: "Welcome back, User!"
```

### Example 2: E2E Test Generation
```typescript
import { test, expect } from '@playwright/test';

test('complete user registration flow', async ({ page }) => {
  // Navigate
  await page.goto('https://app.example.com/signup');

  // ✅ MUST use getByRole (accessibility-first)
  await page.getByRole('textbox', { name: 'Email' })
    .fill('newuser@example.com');
  await page.getByRole('textbox', { name: 'Password' })
    .fill('secure123');
  await page.getByRole('textbox', { name: 'Confirm Password' })
    .fill('secure123');

  // ✅ MUST use getByRole for button
  await page.getByRole('button', { name: 'Create Account' }).click();

  // ✅ Verify success
  await expect(page.getByText('Account created successfully'))
    .toBeVisible();
});
```

### Example 3: Data Extraction (Browserbase Fallback)
```javascript
// Create session
browserbase_session_create()

// Navigate
browserbase_stagehand_navigate({ url: "https://products.example.com" })

// Extract products
browserbase_stagehand_extract({
  instruction: "Extract all product names, prices, and availability status"
})
// Returns: [
//   { name: "Product A", price: "$99", available: true },
//   { name: "Product B", price: "$149", available: false }
// ]

// Close session
browserbase_session_close()
```

## Troubleshooting

### Playwright MCP Issues

**Issue: MCP server not found**
```bash
# Install globally
npm install -g @playwright/mcp

# Or use npx (recommended)
npx @playwright/mcp@latest
```

**Issue: Browser not installed**
```bash
# Install Playwright browsers
npx playwright install chromium
```

**Issue: Timeout errors**
```json
{
  "args": [
    "@playwright/mcp@latest",
    "--timeout-action", "10000",
    "--timeout-navigation", "120000"
  ]
}
```

### Browserbase Issues

**Issue: Authentication failed**
```bash
# Check environment variables
echo $BROWSERBASE_API_KEY
echo $BROWSERBASE_PROJECT_ID

# Re-set if missing
export BROWSERBASE_API_KEY="bb_xxx"
export BROWSERBASE_PROJECT_ID="proj_xxx"
```

**Issue: Session creation timeout**
- Check Browserbase dashboard for quota limits
- Verify API key has correct permissions
- Try reducing parallel session count

## Verification Steps

### Quick Check: Is Playwright MCP Connected?

```bash
# Check MCP server status
claude mcp list

# Should show:
# plugin:specweave-ui:playwright - ✓ Connected
```

### Test Playwright MCP (5-Second Test)

```javascript
// 1. Navigate
mcp__plugin_specweave-ui_playwright__browser_goto({ url: "https://example.com" })

// 2. Get title
mcp__plugin_specweave-ui_playwright__browser_evaluate({ code: "document.title" })
// Expected: "Example Domain"

// 3. Close
mcp__plugin_specweave-ui_playwright__browser_close()
```

✅ **If this works**: Playwright MCP is properly configured!

❌ **If this fails**: See troubleshooting section below.

### Common Setup Issue: Missing `-y` Flag

**Problem**: Playwright MCP shows as not connected in `claude mcp list`

**Solution**: Check `.mcp.json` has the `-y` flag:

```json
{
  "playwright": {
    "args": ["-y", "@playwright/mcp@latest"]  // ✅ Has -y
  }
}
```

Without `-y`, npx waits for user confirmation and MCP connection hangs!

**After fixing**: Restart Claude Code for changes to take effect.

## Resources

- **Playwright MCP**: https://github.com/microsoft/playwright-mcp
- **Browserbase**: https://www.browserbase.com/docs
- **Playwright Docs**: https://playwright.dev/
- **E2E Best Practices**: https://playwright.dev/docs/best-practices
- **Verification Guide**: See `.specweave/increments/0029-cicd-failure-detection-auto-fix/reports/MCP-PLAYWRIGHT-VERIFICATION-GUIDE.md`

---

**Remember**: ALWAYS try Playwright MCP first! Only use Browserbase as fallback for cloud/CI scenarios.
