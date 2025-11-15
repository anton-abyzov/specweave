# Marketplace Registration Fix - Complete Solution

**Date**: 2025-11-13
**Issue**: Plugins not found after Claude Code updates/restarts
**Root Cause**: Marketplace unregistered from Claude Code
**Status**: ✅ FIXED

---

## Problem Analysis

### Symptom
```bash
✘ specweave@specweave
   Plugin 'specweave' not found in marketplace 'specweave'
   → Plugin may not exist in marketplace 'specweave'
```

### Root Cause Discovery

**What we found**:
1. ✅ Symlink exists: `~/.claude/plugins/marketplaces/specweave` → project directory
2. ❌ Marketplace NOT registered with Claude Code (`claude plugin marketplace list` returns empty)
3. ✅ marketplace.json valid and present

**The critical insight**: Creating a symlink is NOT enough! Claude Code requires marketplace registration via CLI.

### Why This Happens

**Marketplace registration is stored in Claude Code's settings**, which can be reset by:
- Claude Code updates
- Settings file corruption
- IDE crashes
- Manual settings reset
- User switching between Claude Code instances

**The symlink persists** (it's a filesystem operation), but **the Claude Code registration is lost** (it's stored in `~/.claude/config/settings.json`).

---

## The Fix

### Automated Setup (Recommended)

```bash
# Run the updated setup script
./scripts/setup-dev-plugins.sh

# What it does now:
# 1. Creates/verifies symlink
# 2. ✨ NEW: Checks marketplace registration
# 3. ✨ NEW: Auto-registers if missing
# 4. Installs plugins
# 5. Verifies everything works
```

### Manual Fix (If Script Fails)

```bash
# Step 1: Check if marketplace is registered
claude plugin marketplace list

# Step 2: If "No marketplaces configured" or "specweave" missing:
claude plugin marketplace add /Users/antonabyzov/Projects/github/specweave
# ⚠️ Use PROJECT ROOT, not .claude-plugin!

# Step 3: Verify registration
claude plugin marketplace list
# Should show: ❯ specweave (Source: Directory /path/to/specweave)

# Step 4: Install plugins
claude plugin install specweave
claude plugin install specweave-github
claude plugin install specweave-jira
claude plugin install specweave-ado
```

### Critical Commands

**❌ WRONG** (common mistakes):
```bash
# These will FAIL:
claude plugin marketplace add ./.claude-plugin
claude plugin marketplace add /path/to/specweave/.claude-plugin
```

**✅ CORRECT**:
```bash
# Use PROJECT ROOT:
claude plugin marketplace add /path/to/specweave
# OR from within the project:
claude plugin marketplace add $(pwd)
```

**Why?** Claude Code automatically appends `/.claude-plugin` to find `marketplace.json`.

---

## Script Improvements

### New Function: `register_marketplace()`

**Location**: `scripts/setup-dev-plugins.sh`

**What it does**:
1. Checks if marketplace is already registered
2. If registered → Shows confirmation + source
3. If missing → Auto-registers with Claude CLI
4. Verifies registration succeeded

**Code**:
```bash
register_marketplace() {
    echo "🔗 Checking marketplace registration..."

    if ! check_claude_cli; then
        echo "⚠️  Claude CLI not found"
        return 1
    fi

    # Check if already registered
    if claude plugin marketplace list 2>/dev/null | grep -q "specweave"; then
        echo "✅ Marketplace already registered"
        return 0
    fi

    # Not registered, fix it!
    echo "⚠️  Marketplace not registered with Claude Code"
    echo "Registering marketplace: $REPO_ROOT"

    if claude plugin marketplace add "$REPO_ROOT" 2>/dev/null; then
        echo "✅ Marketplace registered successfully"
        return 0
    else
        echo "❌ Failed to register marketplace"
        echo "Try manually: claude plugin marketplace add $REPO_ROOT"
        return 1
    fi
}
```

### Integration Points

**Local Setup** (`setup_symlink()`):
```bash
setup_symlink() {
    # ... create symlink ...

    # ✨ NEW: Always check/register marketplace
    echo ""
    register_marketplace

    return 0
}
```

**VM Setup** (`setup_github_marketplace()`):
```bash
setup_github_marketplace() {
    # Check if already registered
    if claude plugin marketplace list 2>/dev/null | grep -q "specweave"; then
        MARKETPLACE_SOURCE=$(...)

        # Check if it's GitHub source
        if [[ "$MARKETPLACE_SOURCE" =~ "GitHub" ]]; then
            echo "✅ GitHub marketplace already registered"
            return 0
        else
            # Local found, switch to GitHub
            claude plugin marketplace remove specweave
        fi
    fi

    # ... add GitHub marketplace ...
}
```

---

## Testing the Fix

### Test 1: Fresh Setup

```bash
# Remove marketplace registration
claude plugin marketplace remove specweave

# Run setup script
./scripts/setup-dev-plugins.sh

# Expected output:
# ✅ Symlink created
# ⚠️  Marketplace not registered
# 🔗 Registering marketplace...
# ✅ Marketplace registered successfully
# ✅ Registration verified
```

### Test 2: Already Registered

```bash
# Run setup script again
./scripts/setup-dev-plugins.sh

# Expected output:
# ✅ Symlink created
# ✅ Marketplace already registered
#    Source: Directory (/path/to/specweave)
```

### Test 3: Plugin Installation

```bash
# Try installing plugins
claude plugin install specweave

# Should succeed now!
# ✔ Successfully installed plugin: specweave@specweave
```

---

## Prevention Strategy

### For Contributors

**Always run the setup script** after:
- Claude Code updates
- IDE crashes
- Switching machines
- Fresh checkout of the repo

```bash
# Quick health check
./scripts/setup-dev-plugins.sh

# If you see "Marketplace not registered", it will auto-fix!
```

### For Users (Production)

**Users don't have this problem** because they use:
```bash
# GitHub marketplace (always reliable)
claude plugin marketplace add anton-abyzov/specweave
```

GitHub marketplaces persist better because Claude Code stores the GitHub URL (not a local path that can break).

---

## Architecture Insight

### Two Types of Marketplace Sources

| Type | Registration | Persistence | Use Case |
|------|--------------|-------------|----------|
| **GitHub** | `anton-abyzov/specweave` | ✅ Survives updates | Production users |
| **Local** | `/path/to/specweave` | ⚠️ Can be lost | Contributors (dev) |

**Why Local Can Break**:
- Stored as absolute path in settings
- If path changes → registration breaks
- If settings reset → registration lost
- Requires both symlink AND registration

**Why GitHub is Reliable**:
- Stored as GitHub repo reference
- Always accessible (no path dependencies)
- Settings reset → re-fetch from GitHub

---

## Verification Checklist

After running the fix, verify:

- [ ] Marketplace registered: `claude plugin marketplace list`
- [ ] Symlink exists: `ls -la ~/.claude/plugins/marketplaces/specweave`
- [ ] Plugins install: `claude plugin install specweave`
- [ ] Hooks work: Complete a task → check for hook output
- [ ] Commands work: `/specweave:status` in Claude Code

---

## Related Documentation

- **Setup Script**: `scripts/setup-dev-plugins.sh`
- **Setup Guide**: `scripts/README-setup-dev-plugins.md`
- **CLAUDE.md**: Development troubleshooting section
- **Plugin System**: Claude Code docs (https://docs.claude.com/plugins)

---

## Future Improvements

### Potential Enhancements

1. **Health Check Command**:
   ```bash
   ./scripts/check-plugin-health.sh
   # Checks: marketplace registration, symlink, plugin installation
   ```

2. **Auto-Fix on Failure**:
   ```bash
   # If plugin commands fail, auto-run setup script
   /specweave:status → Error → Auto-suggests: ./scripts/setup-dev-plugins.sh
   ```

3. **Watch for Updates**:
   ```bash
   # Detect Claude Code updates and auto-re-register
   # (Monitor Claude Code version file, trigger setup script on change)
   ```

### Won't Fix (By Design)

**Automatic re-registration on every hook execution** → Too slow, unnecessary overhead

**Settings file patching** → Fragile, Claude Code owns settings

**Global config override** → Breaks Claude Code's plugin system

---

## Summary

**Problem**: Marketplace registration lost after Claude Code updates
**Root Cause**: Symlink ≠ Registration (two separate concerns)
**Solution**: Auto-check and re-register marketplace in setup script
**Prevention**: Run `./scripts/setup-dev-plugins.sh` after IDE updates

**Status**: ✅ **FIXED** - Script now handles marketplace registration automatically!

---

**Last Updated**: 2025-11-13
**Contributors**: Anton Abyzov (with Claude Code assistance)
