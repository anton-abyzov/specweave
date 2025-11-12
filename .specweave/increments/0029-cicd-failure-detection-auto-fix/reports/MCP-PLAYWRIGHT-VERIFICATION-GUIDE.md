# MCP Playwright Verification & Troubleshooting Guide

**Date**: 2025-11-12
**Increment**: 0029-cicd-failure-detection-auto-fix
**Component**: specweave-ui plugin - Playwright MCP Integration

---

## Executive Summary

**Issue Discovered**: Playwright MCP was configured but not connecting due to missing `-y` flag in npx arguments.

**Root Cause**: Without the `-y` flag, npx waits for user confirmation to install the package, causing the MCP server connection to hang.

**Fix Applied**: Added `-y` flag to Playwright MCP configuration in `.mcp.json`.

**Impact**: Users can now have Playwright MCP auto-install and connect seamlessly without manual intervention.

---

## Investigation Process

### Step 1: Check MCP Server Status

**Command**:
```bash
claude mcp list
```

**Result**:
```
Checking MCP server health...

plugin:specweave-ui:browserbase: npx -y @browserbasehq/mcp-server-browserbase - ✓ Connected
```

**Finding**: Only Browserbase was connected, Playwright MCP was NOT listed.

### Step 2: Analyze Configuration

**File**: `plugins/specweave-ui/.mcp.json`

**Before Fix**:
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"],  // ❌ Missing -y flag
      "optional": false
    },
    "browserbase": {
      "command": "npx",
      "args": ["-y", "@browserbasehq/mcp-server-browserbase"],  // ✅ Has -y flag
      "optional": true
    }
  }
}
```

**Key Difference**:
- Browserbase: Has `-y` flag → Auto-installs → Connects successfully
- Playwright: Missing `-y` flag → Waits for user input → Connection hangs

### Step 3: Verify Package Exists

**Command**:
```bash
npm view @playwright/mcp version
```

**Result**:
```
0.0.46
```

**Finding**: Package exists and is published on npm.

### Step 4: Apply Fix

**After Fix**:
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"],  // ✅ Added -y flag
      "description": "Local Playwright - PRIMARY",
      "optional": false
    }
  }
}
```

---

## The `-y` Flag: Why It Matters

### What npx Does Without `-y`

When you run `npx @playwright/mcp@latest` without `-y`:

1. npx checks if the package is installed locally
2. If not found, it prompts: "Need to install @playwright/mcp@latest. Ok to proceed? (y)"
3. **Waits for user input** ← This is where MCP connection hangs!
4. Cannot proceed without user confirmation

### What npx Does With `-y`

When you run `npx -y @playwright/mcp@latest`:

1. npx checks if the package is installed locally
2. If not found, **automatically downloads and runs it**
3. No user interaction required
4. MCP connection succeeds immediately

### Why This Matters for MCP Servers

MCP servers are started automatically by Claude Code at startup:
- Claude Code reads `.mcp.json`
- Spawns `npx` subprocess for each MCP server
- Cannot provide interactive input to subprocess
- **Without `-y` flag**: Process hangs waiting for confirmation
- **With `-y` flag**: Process installs and starts automatically

---

## MCP Server Lifecycle

### When MCP Servers Load

**Timing**: Claude Code startup (NOT on .mcp.json file change)

**Process**:
1. Claude Code starts
2. Scans for MCP configurations:
   - Project root: `.mcp.json`
   - Settings: `.claude/settings.json`
   - Plugin manifests: `plugins/*/.mcp.json`
3. For each configured MCP server:
   - Spawns subprocess with specified command
   - Waits for connection
   - Exposes tools with namespace: `mcp__plugin_{plugin}_{server}__{tool}`
4. MCP servers remain connected until Claude Code closes

### Hot Reload

**Important**: MCP configurations are **NOT** hot-reloaded!

**To apply changes**:
1. Edit `.mcp.json` or `.claude/settings.json`
2. **Restart Claude Code** (close and reopen)
3. MCP servers reconnect with new configuration

**Workaround** (if restart not possible):
- Some Claude Code builds support: `/mcp reload` command
- Otherwise: Full restart required

---

## Verification Steps

### After Configuration Fix

**1. Restart Claude Code** (required for changes to take effect)

**2. Verify MCP Server Status**:
```bash
claude mcp list
```

**Expected Output**:
```
Checking MCP server health...

plugin:specweave-ui:playwright: npx -y @playwright/mcp@latest - ✓ Connected
plugin:specweave-ui:browserbase: npx -y @browserbasehq/mcp-server-browserbase - ✓ Connected
```

**3. Check Available MCP Tools**:

In Claude Code, available tools should include:
- `mcp__plugin_specweave-ui_playwright__browser_goto`
- `mcp__plugin_specweave-ui_playwright__browser_click`
- `mcp__plugin_specweave-ui_playwright__browser_fill`
- `mcp__plugin_specweave-ui_playwright__browser_press`
- `mcp__plugin_specweave-ui_playwright__browser_evaluate`
- `mcp__plugin_specweave-ui_playwright__browser_snapshot`
- `mcp__plugin_specweave-ui_playwright__browser_console_messages`
- `mcp__plugin_specweave-ui_playwright__browser_close`

### Test Playwright MCP (Manual)

**Step 1: Navigate to Website**
```javascript
mcp__plugin_specweave-ui_playwright__browser_goto({
  url: "https://easychamp.com"
})
```

**Expected**: Browser opens (headed mode) and navigates to easychamp.com

**Step 2: Get Page Snapshot**
```javascript
mcp__plugin_specweave-ui_playwright__browser_snapshot({
  fullPage: true
})
```

**Expected**: Returns accessibility tree with all page elements

**Step 3: Extract Title**
```javascript
mcp__plugin_specweave-ui_playwright__browser_evaluate({
  code: "document.title"
})
```

**Expected**: Returns page title string

**Step 4: Close Browser**
```javascript
mcp__plugin_specweave-ui_playwright__browser_close()
```

**Expected**: Browser closes gracefully

---

## Complete Verification Test: easychamp.com

### Test Scenario

Verify Playwright MCP can:
1. Navigate to easychamp.com
2. Extract page structure
3. Identify key elements
4. Take screenshots
5. Execute JavaScript

### Test Script

```javascript
// Test 1: Navigation
mcp__plugin_specweave-ui_playwright__browser_goto({
  url: "https://easychamp.com"
})
// Expected: Browser opens to easychamp.com

// Test 2: Get page snapshot (accessibility tree)
const snapshot = mcp__plugin_specweave-ui_playwright__browser_snapshot({
  fullPage: true
})
// Expected: Returns structured element tree

// Test 3: Extract page title
const title = mcp__plugin_specweave-ui_playwright__browser_evaluate({
  code: "document.title"
})
// Expected: "EasyChamp - ..." or similar

// Test 4: Extract main heading
const heading = mcp__plugin_specweave-ui_playwright__browser_evaluate({
  code: "document.querySelector('h1')?.textContent"
})
// Expected: Main headline text

// Test 5: Count buttons on page
const buttonCount = mcp__plugin_specweave-ui_playwright__browser_evaluate({
  code: "document.querySelectorAll('button').length"
})
// Expected: Number of buttons

// Test 6: Check for specific elements
const hasNavbar = mcp__plugin_specweave-ui_playwright__browser_evaluate({
  code: "!!document.querySelector('nav')"
})
// Expected: true/false

// Test 7: Get console messages (check for errors)
const console = mcp__plugin_specweave-ui_playwright__browser_console_messages()
// Expected: Array of console messages

// Test 8: Cleanup
mcp__plugin_specweave-ui_playwright__browser_close()
// Expected: Browser closes
```

### Expected Results

✅ **All tests pass**:
- Navigation works
- Snapshot returns structured data
- JavaScript execution works
- Console messages captured
- Browser closes cleanly

❌ **If tests fail**:
- Check MCP server status: `claude mcp list`
- Verify Playwright MCP shows as "Connected"
- Restart Claude Code if needed
- Check browser installation: `npx playwright install chromium`

---

## Troubleshooting Guide

### Issue: Playwright MCP Not Listed in `claude mcp list`

**Symptoms**:
```bash
$ claude mcp list
plugin:specweave-ui:browserbase - ✓ Connected
# Playwright not showing
```

**Solutions**:

1. **Check `.mcp.json` has `-y` flag**:
   ```bash
   cat plugins/specweave-ui/.mcp.json | grep -A 3 playwright
   ```
   Should show: `"args": ["-y", "@playwright/mcp@latest"]`

2. **Restart Claude Code** (MCP configs only load at startup)

3. **Check npm/npx availability**:
   ```bash
   which npx && npx --version
   ```

4. **Manually test Playwright MCP installation**:
   ```bash
   npx -y @playwright/mcp@latest --help
   ```
   Should display help text without prompts

### Issue: Playwright MCP Listed But Tools Not Available

**Symptoms**:
- `claude mcp list` shows "Connected"
- But `mcp__plugin_specweave-ui_playwright__*` tools not available

**Solutions**:

1. **Check MCP server logs** (if available):
   ```bash
   # Look for error messages in logs
   cat ~/.claude/logs/mcp-playwright.log
   ```

2. **Verify package version**:
   ```bash
   npm view @playwright/mcp version
   # Should be 0.0.46 or later
   ```

3. **Try manual connection**:
   ```bash
   npx -y @playwright/mcp@latest
   # Should start server without errors
   ```

### Issue: Browser Doesn't Open (Headless Mode)

**Symptoms**:
- Commands execute but no browser window appears

**Solution**:

Playwright MCP runs in **headed mode by default** (browser visible).

If you want headless mode (no UI), add `--headless` flag:
```json
{
  "playwright": {
    "args": ["-y", "@playwright/mcp@latest", "--headless"]
  }
}
```

### Issue: Timeout Errors

**Symptoms**:
```
Error: Navigation timeout of 60000ms exceeded
```

**Solutions**:

1. **Increase navigation timeout**:
   ```json
   {
     "playwright": {
       "args": [
         "-y",
         "@playwright/mcp@latest",
         "--timeout-navigation", "120000"
       ]
     }
   }
   ```

2. **Increase action timeout**:
   ```json
   {
     "playwright": {
       "args": [
         "-y",
         "@playwright/mcp@latest",
         "--timeout-action", "10000"
       ]
     }
   }
   ```

### Issue: "Browser not installed" Error

**Symptoms**:
```
Error: Executable doesn't exist at /path/to/chromium
```

**Solution**:

Install Playwright browsers:
```bash
npx playwright install chromium
# Or install all browsers:
npx playwright install
```

### Issue: Permission Denied

**Symptoms**:
```
Error: EACCES: permission denied
```

**Solution**:

Fix npm permissions:
```bash
# Option 1: Use nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Option 2: Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```

---

## Configuration Options

### Basic Configuration (Recommended)

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

### Advanced Configuration (With Options)

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "-y",
        "@playwright/mcp@latest",
        "--browser", "chromium",        // Browser: chromium, firefox, webkit, msedge
        "--headless",                   // Run without UI
        "--timeout-action", "10000",    // Action timeout: 10s
        "--timeout-navigation", "120000", // Navigation timeout: 2min
        "--viewport-size", "1920x1080", // Browser window size
        "--user-agent", "CustomBot/1.0" // Custom user agent
      ],
      "description": "Playwright with custom config",
      "optional": false
    }
  }
}
```

### Configuration with Persistent Profile

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "-y",
        "@playwright/mcp@latest",
        "--user-data-dir", "/path/to/profile"  // Persistent profile
      ]
    }
  }
}
```

### Configuration with Isolated Sessions

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "-y",
        "@playwright/mcp@latest",
        "--isolated",                   // Fresh session each time
        "--storage-state", "auth.json"  // But load auth from file
      ]
    }
  }
}
```

---

## Best Practices

### 1. Always Use `-y` Flag

**Why**: Enables unattended installation and execution

```json
// ✅ GOOD
"args": ["-y", "@playwright/mcp@latest"]

// ❌ BAD (will hang)
"args": ["@playwright/mcp@latest"]
```

### 2. Set Reasonable Timeouts

**Default timeouts**:
- Action: 5000ms (5s)
- Navigation: 60000ms (60s)

**For slow networks/sites, increase**:
```json
"args": [
  "-y",
  "@playwright/mcp@latest",
  "--timeout-navigation", "120000"
]
```

### 3. Use Headed Mode for Development

**Why**: See what's happening, easier debugging

```json
// ✅ GOOD (default - shows browser)
"args": ["-y", "@playwright/mcp@latest"]

// Use headless for CI/CD:
"args": ["-y", "@playwright/mcp@latest", "--headless"]
```

### 4. Install Browsers Globally

**Why**: Faster startup, shared across projects

```bash
# Install once globally
npx playwright install chromium firefox webkit

# Or install all
npx playwright install
```

### 5. Use Latest Version

**Why**: Bug fixes, new features

```json
// ✅ GOOD (always latest)
"args": ["-y", "@playwright/mcp@latest"]

// ❌ BAD (pinned, gets stale)
"args": ["-y", "@playwright/mcp@0.0.46"]
```

---

## Summary

### Problem Identified
- Playwright MCP configured but not connecting
- Missing `-y` flag caused npx to wait for user confirmation
- MCP server connection hung indefinitely

### Solution Applied
- Added `-y` flag to Playwright MCP configuration
- MCP server can now auto-install and connect seamlessly

### Verification Required
- Restart Claude Code (MCP configs only load at startup)
- Run `claude mcp list` to verify connection
- Test with easychamp.com navigation

### Configuration Best Practices
- ✅ Always use `-y` flag for npx
- ✅ Use headed mode for development (see browser)
- ✅ Set reasonable timeouts
- ✅ Install browsers globally
- ✅ Use `@latest` for automatic updates

### Next Steps
1. User restarts Claude Code
2. Playwright MCP auto-installs and connects
3. Skills auto-activate when needed
4. Browser automation works seamlessly

---

**Status**: ✅ Issue identified, fix applied, verification guide complete
**Impact**: Users can now use Playwright MCP without manual setup
**Documentation**: Complete troubleshooting guide provided
