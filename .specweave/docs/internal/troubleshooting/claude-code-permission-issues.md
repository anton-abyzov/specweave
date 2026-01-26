# Claude Code Permission Issues - Troubleshooting Guide

**Last Updated**: 2026-01-08
**Affects**: `/sw:auto` command and other plugin commands using `allowed-tools`

---

## Problem Summary

Commands like `/sw:auto` fail with cryptic permission errors:
```
Error: Bash command failed for pattern "```"!
"/Users/user/.claude/plugins/cache/specweave/sw/1.0.0/scripts/setup-auto.sh" "arguments here"
```

## Root Causes

### 1. `${CLAUDE_PLUGIN_ROOT}` Substitution Bug (FIXED in Claude Code 2.0.41)

**Issue**: The `${CLAUDE_PLUGIN_ROOT}` variable in plugin `allowed-tools` frontmatter was not being substituted, causing permission checks to fail.

**Fixed In**: Claude Code 2.0.41
**Source**: [Claude Code CHANGELOG](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md)

**If you're on 2.0.41+**: This should be fixed. If still failing, see workarounds below.

### 2. Pattern Syntax - `:*` vs `*`

**Correct Pattern**: `Bash(script-path:*)` - colon-star allows arguments after the command
**Wrong Pattern**: `Bash(script-path *)` - space-star tries to match wildcard within the path

**Fix Applied**:
- Commit: `8e2a684d` - fix(auto): restore correct :* pattern for allowed-tools
- File: `plugins/specweave/commands/auto.md` line 5

```yaml
# BEFORE (BROKEN)
allowed-tools: ["Bash(${CLAUDE_PLUGIN_ROOT}/scripts/setup-auto.sh *)"]

# AFTER (CORRECT)
allowed-tools: ["Bash(${CLAUDE_PLUGIN_ROOT}/scripts/setup-auto.sh:*)"]
```

### 3. Inline Execution Block (`!`) Permission Matching

Commands using the `!` inline execution pattern:
```markdown
```!
"${CLAUDE_PLUGIN_ROOT}/scripts/setup-auto.sh" "$ARGUMENTS"
```
```

Require the `allowed-tools` pattern to match the EXPANDED command path, not the literal variable.

**Recent Fix**: Anthropic fixed this on 2026-01-06
**Commit**: [c2022d36](https://github.com/anthropics/claude-code/commit/c2022d3698c2ed89a5d9ca4a724571d2819057a5)

---

## Workarounds

### Option 1: Add Explicit Permission to Project Settings (RECOMMENDED)

Edit `.claude/settings.json`:

```json
{
  "permissions": {
    "allow": [
      "Bash(*/scripts/setup-auto.sh:*)"
    ],
    "defaultMode": "bypassPermissions"
  }
}
```

The `*/scripts/setup-auto.sh:*` pattern matches the script regardless of the full path.

### Option 2: Use Bypass Mode (Less Secure)

If you trust all commands in your project:

```json
{
  "permissions": {
    "defaultMode": "bypassPermissions"
  }
}
```

**Note**: This should already work if `defaultMode` is set, but there may be edge cases where plugin `allowed-tools` still requires explicit permission.

### Option 3: Update Claude Code

If you're on a version older than 2.0.41:

```bash
# Check version
claude --version

# Update via Homebrew (if installed that way)
brew upgrade claude-code

# Or download latest from https://code.claude.com
```

---

## Testing the Fix

After applying workarounds:

```bash
# Test 1: Simple auto command
/sw:auto

# Test 2: Auto with prompt
/sw:auto ultrathink to fix all e2e tests

# Test 3: With options
/sw:auto --build --tests ultrathink
```

**Expected**: No permission errors, increment plan should be created.

---

## Why It Worked Before (7-10 Days Ago)

**Timeline**:
- **Before Dec 25, 2025**: Claude Code had the `${CLAUDE_PLUGIN_ROOT}` substitution working
- **~Dec 25-Jan 3**: A regression broke the substitution (bug introduced)
- **Jan 4, 2026**: Bug was reported and fixed in 2.0.41
- **Jan 6, 2026**: Additional fix for `:*` pattern with inline `!` blocks

If you were using Claude Code before late December 2025, the command worked because variable substitution was functioning. Recent updates may have temporarily broken it before the fix was released.

---

## Related Issues

- GitHub Issue #16398: Auto mode permission check fails
- GitHub PR #16522: Add :* to allowed-tools pattern to permit arguments

---

## Verification Commands

```bash
# Check Claude Code version
claude --version

# Check if plugin is installed correctly
cat ~/.claude/plugins/cache/specweave/sw/1.0.0/commands/auto.md | grep "allowed-tools"
# Should show: allowed-tools: ["Bash(${CLAUDE_PLUGIN_ROOT}/scripts/setup-auto.sh:*)"]

# Check project permissions
cat .claude/settings.json | jq '.permissions'
```

---

## Contact

If issues persist after trying all workarounds:
1. Check [GitHub Issues](https://github.com/anton-abyzov/specweave/issues)
2. File a new issue with:
   - Claude Code version (`claude --version`)
   - Error message (full output)
   - Output of verification commands above
