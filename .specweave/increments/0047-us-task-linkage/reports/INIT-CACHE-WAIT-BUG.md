# Init Cache Wait Bug - 30 Second Unnecessary Delay

**Date**: 2025-11-20
**Severity**: Medium (UX issue, not functional)
**Status**: Identified, fix needed

## Problem

The `specweave init` command waits up to **30 seconds** for a marketplace cache file that it never actually uses, then proceeds anyway.

## Evidence

**User Experience**:
```bash
$ specweave init sw-voice-memo
...
⠙ Waiting for marketplace cache... (30s)
⚠ Cache initialization timeout, proceeding anyway...
✔ SpecWeave marketplace ready
```

**Code Location**: `src/cli/commands/init.ts:1053-1113`

**Flow Analysis**:

```typescript
// Line 1051: Register marketplace
await addMarketplace('github', 'github:anton-abyzov/specweave/.claude-plugin');
console.log('✔ Marketplace registered from GitHub');

// Line 1053-1104: Wait for CACHE to be ready
// CRITICAL: Wait for marketplace cache to be FULLY ready
const marketplaceCachePath = path.join(
  os.homedir(),
  '.claude/plugins/marketplaces/specweave/.claude-plugin/marketplace.json'
);

const maxWaitTime = 30000; // 30 seconds max
// ... polling loop ...

if (!cacheReady) {
  console.log('⚠ Cache initialization timeout, proceeding anyway...');
}

// Line 1113: Load from SOURCE (not cache!)
const marketplaceJsonPath = findSourceDir('.claude-plugin/marketplace.json');
//                           ^^^^^^^^^^^^^
// This loads from INSTALLED NPM PACKAGE, not cache!

const marketplace = JSON.parse(fs.readFileSync(marketplaceJsonPath, 'utf-8'));
```

**Root Cause**:
1. The wait polls for `~/.claude/plugins/marketplaces/specweave/.claude-plugin/marketplace.json` (cache)
2. But then loads from `{npm-install-dir}/.claude-plugin/marketplace.json` (source)
3. The cache is created **asynchronously by Claude Code**, not the init command
4. The init command **never reads the cache**, only the source

## Impact

- **30-second delay** on every `specweave init` command
- Delay provides **zero value** (times out and proceeds anyway)
- Poor UX - users wonder "why is it waiting?"
- Wastes developer time during testing/development

## Why Was This Added?

**Comment at line 1053**:
```typescript
// CRITICAL: Wait for marketplace cache to be FULLY ready
// Problem: Fixed delays (2s, 5s) are unreliable - cache initialization time varies
// Solution: Poll until marketplace.json exists and is readable in cache
```

**Hypothesis**: This was added to fix some race condition where Claude Code hadn't finished initializing the marketplace. But the fix is wrong - it waits for the wrong thing!

## The Correct Fix

**Option 1: Remove the wait entirely** (RECOMMENDED)

```typescript
// BEFORE (lines 1053-1108):
// Wait 30 seconds for cache...
if (!cacheReady) {
  console.log('⚠ Cache initialization timeout, proceeding anyway...');
}

// AFTER (1 line):
console.log(chalk.green('   ✔ Marketplace registered from GitHub'));
// No wait needed - we load from source, not cache!
```

**Why this works**:
- The marketplace is registered with `claude plugin marketplace add`
- This creates the marketplace record in Claude Code's registry
- The init command only needs the **source files** (installed via npm)
- It never reads the cache, so waiting for it is pointless

**Option 2: Short non-blocking wait (2-3 seconds)** (FALLBACK)

If there's some hidden dependency on the cache being ready:
```typescript
// Give Claude Code 2 seconds to start initializing, then proceed
await new Promise(resolve => setTimeout(resolve, 2000));
console.log(chalk.green('   ✔ Marketplace registered, cache initializing in background'));
```

**Option 3: Make it parallel** (ADVANCED)

```typescript
// Register marketplace (async in background)
const cacheInitPromise = addMarketplace(...);

// Load from source immediately (parallel)
const marketplaceJsonPath = findSourceDir('.claude-plugin/marketplace.json');
const marketplace = JSON.parse(fs.readFileSync(marketplaceJsonPath, 'utf-8'));

// Wait for registration to complete (but not cache files)
await cacheInitPromise;
```

## Recommended Action

**Remove the entire wait block (lines 1053-1108)**:

```diff
  console.log(chalk.green('   ✔ Marketplace registered from GitHub'));

- // CRITICAL: Wait for marketplace cache to be FULLY ready
- // Problem: Fixed delays (2s, 5s) are unreliable - cache initialization time varies
- // Solution: Poll until marketplace.json exists and is readable in cache
- spinner.text = 'Waiting for marketplace cache to initialize...';
-
- const marketplaceCachePath = path.join(
-   os.homedir(),
-   '.claude/plugins/marketplaces/specweave/.claude-plugin/marketplace.json'
- );
-
- const maxWaitTime = 30000; // 30 seconds max
- const pollInterval = 500; // Check every 500ms
- const startTime = Date.now();
- let cacheReady = false;
-
- while (Date.now() - startTime < maxWaitTime && !cacheReady) {
-   try {
-     if (fs.existsSync(marketplaceCachePath)) {
-       const content = fs.readFileSync(marketplaceCachePath, 'utf-8');
-       const data = JSON.parse(content);
-
-       // Check if the cache has the expected structure
-       if (data && typeof data === 'object') {
-         // Check if plugins are defined (even if empty)
-         if ('plugins' in data) {
-           // If plugins exist, verify they have metadata
-           const plugins = data.plugins;
-           if (typeof plugins === 'object' && plugins !== null) {
-             const pluginKeys = Object.keys(plugins);
-             if (pluginKeys.length === 0 || pluginKeys.every(key => plugins[key]?.metadata)) {
-               cacheReady = true;
-               break;
-             } else {
-               // Plugins exist but metadata incomplete - keep waiting
-               spinner.text = `Waiting for plugin metadata... (${Math.round((Date.now() - startTime) / 1000)}s)`;
-             }
-           }
-         }
-       }
-     }
-   } catch (e) {
-     // File exists but not readable yet (still being written)
-   }
-
-   // Wait before next poll
-   await new Promise(resolve => setTimeout(resolve, pollInterval));
-
-   // Update spinner to show we're still waiting
-   const elapsed = Math.round((Date.now() - startTime) / 1000);
-   spinner.text = `Waiting for marketplace cache... (${elapsed}s)`;
- }
-
- if (!cacheReady) {
-   console.log(chalk.yellow('   ⚠ Cache initialization timeout, proceeding anyway...'));
- }

  spinner.succeed('SpecWeave marketplace ready');
```

## Testing

1. **Before fix**: `time specweave init test-project` → ~35 seconds
2. **After fix**: `time specweave init test-project` → ~5 seconds
3. Verify no errors, all plugins install correctly
4. Check that Claude Code still sees the marketplace: `claude plugin marketplace list`

## Priority

**Medium** - This doesn't break functionality, but:
- Wastes 30 seconds on every init
- Confuses users ("why is it waiting?")
- Shows a warning that implies something failed
- Low-hanging fruit for significant UX improvement

---

**Next Steps**: Create a quick fix PR to remove this unnecessary wait.
