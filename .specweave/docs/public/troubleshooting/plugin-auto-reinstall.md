# Troubleshooting: Plugins Keep Reinstalling

> Why plugins reappear after uninstalling and how to fix it

## Symptom

You uninstall SpecWeave plugins with `claude plugin uninstall`, but they reappear in subsequent prompts.

## Root Cause

SpecWeave has **plugin auto-loading hooks** that detect project needs and install plugins. The hooks run on every user prompt and can reinstall plugins you just removed.

There are multiple mechanisms that can trigger installation:

| Mechanism | Location | What It Does | Status (v1.0.159) |
|-----------|----------|--------------|-------------------|
| LLM Detection | `user-prompt-submit.sh` | Analyzes prompts, installs for BUILD tasks | ✅ Kept (correct behavior) |
| Keyword Fallback | `user-prompt-submit.sh` | Matches keywords like "test", "database" | ❌ Removed |
| Project Detection | `session-start.sh` | Scans package.json, Dockerfile, etc. | ❌ Removed |
| Startup Health Check | `startup-health-check.sh` | Auto-repairs marketplace, reinstalls plugins | ❌ Removed (installs removed) |

**Critical**: Hooks run from the **PLUGIN CACHE** (`~/.claude/plugins/cache/`), not from source code.

## Quick Fix

### Step 1: Disable Auto-Loading Temporarily

```bash
export SPECWEAVE_DISABLE_AUTO_LOAD=1
```

### Step 2: Clean the Registry

```bash
# Keep only core SpecWeave plugins (context7 and playwright are optional, user-installed)
cat > ~/.claude/plugins/installed_plugins.json << 'EOF'
{
  "version": 2,
  "plugins": {
    "sw@specweave": [
      {
        "scope": "user",
        "installPath": "/Users/YOUR_USER/.claude/plugins/cache/specweave/sw/VERSION",
        "version": "VERSION"
      }
    ],
    "sw-router@specweave": [
      {
        "scope": "user",
        "installPath": "/Users/YOUR_USER/.claude/plugins/cache/specweave/sw-router/VERSION",
        "version": "VERSION"
      }
    ]
  }
}
EOF
# Optionally re-add MCP plugins if you use them:
# claude plugin install context7@claude-plugins-official
# claude plugin install playwright@claude-plugins-official
```

### Step 3: Restart Claude Code

Hooks are loaded at session start. Restart to pick up the environment variable.

## Permanent Fix

### Option A: Configure Auto-Load Settings

In `.specweave/config.json`:

```json
{
  "pluginAutoLoad": {
    "enabled": true,      // Keep enabled for smart loading
    "suggestOnly": true   // Suggest but don't auto-install
  }
}
```

This will show suggestions like:
```
Plugins that may help: sw-frontend, sw-payments
To install: claude plugin install sw-frontend@specweave
```

### Option B: Disable Auto-Load Completely

```json
{
  "pluginAutoLoad": {
    "enabled": false,
    "suggestOnly": false
  }
}
```

No detection, no suggestions. Fully manual mode.

### Option C: Update Hooks in Cache (v1.0.159+)

If you're using SpecWeave v1.0.159+, the hooks should NOT have aggressive keyword fallback or project scanning. Verify your cache has the updated hooks:

```bash
# Check for keyword fallback (should be 0)
grep -c "detect_plugins_by_keywords" \
  ~/.claude/plugins/cache/specweave/sw/*/hooks/user-prompt-submit.sh

# Check for project detection (should be 0 or just comments)
grep -c "specweave detect-project" \
  ~/.claude/plugins/cache/specweave/sw/*/hooks/v2/dispatchers/session-start.sh

# Check for hardcoded plugin install loop in startup-health-check.sh
# Should return "REMOVED" comment, not actual install loop
grep "for plugin in sw" \
  ~/.claude/plugins/cache/specweave/sw/*/hooks/startup-health-check.sh
```

If counts are > 0 or you see `for plugin in sw sw-github sw-testing`, your cache has old hooks. Update by reinstalling:

```bash
claude plugin uninstall sw@specweave
claude plugin install sw@specweave
```

## Understanding the Detection Flow

### v1.0.159+ (Current)

```
User Prompt
    ↓
user-prompt-submit.sh
    ↓
Is it a BUILD/IMPLEMENT request?
    ↓
[LLM Detection via specweave detect-intent]
    ↓
If BUILD task → Install recommended plugins
If question/discussion → No installation
```

### Pre-v1.0.159 (Old Behavior)

```
User Prompt
    ↓
user-prompt-submit.sh
    ↓
[LLM Detection] → If fails/empty...
    ↓
[Keyword Fallback] → Matches "test", "database", etc.
    ↓
Install matched plugins (TOO AGGRESSIVE!)

ALSO at session start:
    ↓
session-start.sh
    ↓
[Project Detection] → Scans package.json, Dockerfile
    ↓
Install based on project files (UNWANTED!)
```

## Checking Logs

View what's triggering installations:

```bash
# Lazy-loading log
tail -100 ~/.specweave/logs/lazy-loading.log

# Example entries:
# [2026-01-25T00:10:35] detect-intent | duration=1500ms
# [2026-01-25T00:10:36] plugins | installed=sw-frontend | already=none
# [2026-01-25T00:10:36] keyword-fallback | plugins=sw-testing | reason=llm_failed
```

If you see `keyword-fallback`, your cache has old hooks.

## For Plugin Developers

If you're editing hook source files, remember:

1. **Edits to source don't affect running session**
2. **Copy to cache for immediate testing**:
   ```bash
   cp plugins/specweave/hooks/user-prompt-submit.sh \
      ~/.claude/plugins/cache/specweave/sw/1.0.0/hooks/
   ```
3. **Or reinstall from local source**:
   ```bash
   cd /path/to/specweave
   claude plugin uninstall sw@specweave
   claude plugin install .
   ```

## Related

- [Plugin Management Guide](../guides/plugin-management.md)
- [Plugin Naming Conventions](./plugin-naming-conventions.md)
