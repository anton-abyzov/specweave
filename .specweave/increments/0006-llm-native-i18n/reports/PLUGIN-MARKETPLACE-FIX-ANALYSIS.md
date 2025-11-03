# Plugin Marketplace Fix Analysis

**Date**: 2025-11-03
**Issue**: Slash commands from SpecWeave plugins not appearing in Claude Code autocomplete
**Root Cause**: Multiple configuration errors in marketplace.json and plugin structure

---

## Problem Statement

User typed `/s` in Claude Code but only saw built-in commands (`/status`, `/statusline`), NOT custom SpecWeave commands like `/specweave:inc`, `/specweave:do`, etc.

## Investigation

### 1. Marketplace Configuration Issues

**File**: `.claude-plugin/marketplace.json`

❌ **Problem**: Incorrect path format
```json
"source": "./../plugins/specweave-github"  // WRONG - extra leading dot
```

✅ **Should be**:
```json
"source": "../plugins/specweave-github"    // Correct - relative to marketplace.json
```

According to Claude Code docs:
> "All paths must be relative to plugin root and start with `./`"

But for marketplace.json, paths are relative to the marketplace file itself, not plugin roots.

### 2. Plugin Naming Inconsistency

**Marketplace** (`.claude-plugin/marketplace.json`):
```json
{
  "name": "github",  // Short name in marketplace registry
  ...
}
```

**Plugin Manifest** (`plugins/specweave-github/.claude-plugin/plugin.json`):
```json
{
  "name": "specweave-github",  // Full name in plugin manifest
  ...
}
```

❌ **Inconsistency**: Marketplace uses `"github"` but plugin.json uses `"specweave-github"`

✅ **Resolution**: Plugin manifest name is SOURCE OF TRUTH. Update marketplace to use `"specweave-github"` for consistency.

**Why this matters**: Commands are namespaced using the plugin name from plugin.json, not the marketplace.

### 3. Command File Format (FALSE ALARM - Actually Correct!)

Initially suspected command files were wrong, but they're actually correct:

**File**: `plugins/specweave/commands/specweave:do.md`
```yaml
---
name: specweave.do  # Uses dots (this is correct!)
description: Execute implementation tasks
---
```

✅ **This is correct!** Claude Code:
1. Reads plugin name from plugin.json: `"specweave"`
2. Reads command filename: `specweave.do.md` → removes `.md` → `specweave.do`
3. Creates namespaced command: `/specweave:specweave.do`

**However**, there's a better naming convention:

**Current**:
- Filename: `specweave.do.md`
- Command: `/specweave:specweave.do` (redundant "specweave" prefix)

**Recommended**:
- Filename: `do.md`
- Command: `/specweave:do` (cleaner!)

But the current format works, so this is **optional cleanup**, not a breaking issue.

### 4. GitHub Plugin Commands Have Duplicates

**Files** in `plugins/specweave-github/commands/`:
- ✅ `github-sync.md` → `/specweave-github:github-sync`
- ✅ `github-create-issue.md` → `/specweave-github:github-create-issue`
- ❌ `specweave.sync-github.md` → `/specweave-github:specweave.sync-github` (duplicate!)

The `specweave.sync-github.md` file is a duplicate/legacy command that should be removed or consolidated.

### 5. Marketplace Not Registered

User likely tried:
```
/plugin marketplace add ./
```

This might have failed because:
- `./ ` points to project root, not `.claude-plugin/` subdirectory
- Need to use `./.claude-plugin` or absolute path

## Root Causes Summary

| Issue | Impact | Severity |
|-------|--------|----------|
| 1. Incorrect `./../` paths | Marketplace can't find plugins | **CRITICAL** |
| 2. Plugin name mismatch | Commands might not namespace correctly | **HIGH** |
| 3. Marketplace not registered | Plugins not loaded | **CRITICAL** |
| 4. Duplicate command files | Confusion, unnecessary files | **LOW** |

## How Claude Code Plugin Commands Work

According to official Claude Code docs:

### Plugin Structure
```
my-plugin/
├── .claude-plugin/
│   └── plugin.json          # Plugin manifest with "name" field
├── commands/                 # Slash commands
│   └── my-command.md         # Creates /plugin-name:my-command
├── skills/                   # Auto-activating capabilities
└── agents/                   # Specialized agents
```

### Command Namespacing

1. **Plugin name** comes from `plugin.json`:
   ```json
   { "name": "my-plugin" }
   ```

2. **Command name** comes from markdown filename (minus `.md`):
   ```
   commands/do-thing.md → "do-thing"
   ```

3. **Final command** is namespaced:
   ```
   /my-plugin:do-thing
   ```

### Marketplace Registration

Add marketplace with **absolute** or **relative** path:

```bash
# Absolute (always works)
/plugin marketplace add /full/path/to/.claude-plugin

# Relative (must be in project root)
/plugin marketplace add ./.claude-plugin
```

Then install plugins:
```bash
/plugin install specweave@specweave
/plugin install specweave-github@specweave
```

## Fix Plan

### Fix 1: Update marketplace.json Paths

Replace all `./../plugins/` with `../plugins/`:

```diff
{
  "name": "github",
- "source": "./../plugins/specweave-github",
+ "source": "../plugins/specweave-github",
}
```

### Fix 2: Align Plugin Names

Update marketplace.json to use plugin.json names:

```diff
{
- "name": "github",
+ "name": "specweave-github",
  "source": "../plugins/specweave-github",
}
```

Apply to all 18 plugins.

### Fix 3: Remove Duplicate Commands

In `plugins/specweave-github/commands/`:
- Keep: `github-sync.md`, `github-create-issue.md`, etc.
- Remove or rename: `specweave.sync-github.md` (duplicate functionality)

### Fix 4: Registration Instructions

Document correct marketplace add command:

```bash
# From SpecWeave project root:
/plugin marketplace add ./.claude-plugin

# Verify:
/plugin marketplace list

# Install:
/plugin install specweave@specweave
/plugin install specweave-github@specweave
```

## Expected Outcome

After fixes, typing `/specweave` should show:

```
/specweave:inc          # Plan new increment
/specweave:do           # Execute tasks
/specweave:next         # Smart transition
/specweave:done         # Close increment
/specweave:progress     # Show progress
/specweave:validate     # Validate increment
/specweave-github:sync       # Sync with GitHub
/specweave-github:create-issue  # Create issue
/specweave-github:close-issue   # Close issue
/specweave-github:status     # GitHub status
```

## Testing Plan

1. **Fix marketplace.json** (paths and names)
2. **Remove duplicate commands**
3. **Verify plugin.json files** have correct names
4. **Register marketplace**:
   ```bash
   /plugin marketplace add ./.claude-plugin
   ```
5. **Verify registration**:
   ```bash
   /plugin marketplace list
   # Should show: "specweave" marketplace with 18 plugins
   ```
6. **Install core plugin**:
   ```bash
   /plugin install specweave@specweave
   ```
7. **Test commands**:
   ```bash
   /specweave:inc
   /specweave:do
   ```
8. **Install GitHub plugin**:
   ```bash
   /plugin install specweave-github@specweave
   ```
9. **Test GitHub commands**:
   ```bash
   /specweave-github:sync
   ```

## Implementation Notes

- All changes go to `.specweave/increments/0006-llm-native-i18n/reports/` (this file)
- Update `.claude-plugin/marketplace.json` (source of truth)
- Update `.claude-plugin/README.md` (fix documentation)
- Optional: Rename command files for cleaner namespacing (e.g., `specweave.do.md` → `do.md`)
- Test with actual Claude Code installation

## References

- Claude Code Plugin Docs: https://docs.claude.com/en/docs/claude-code/plugins
- Plugin Marketplaces: https://docs.claude.com/en/docs/claude-code/plugin-marketplaces
- Slash Commands: https://docs.claude.com/en/docs/claude-code/slash-commands

---

**Status**: Analysis Complete ✅
**Next**: Implement fixes in marketplace.json and test
