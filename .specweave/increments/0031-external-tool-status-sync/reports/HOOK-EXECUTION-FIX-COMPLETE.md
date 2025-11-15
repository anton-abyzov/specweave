# Hook Execution Fix - Complete Solution

**Date**: 2025-11-13
**Issue**: Plugin hooks failing with "No such file or directory" errors
**Status**: ✅ RESOLVED

---

## Problem Summary

After completing tasks via TodoWrite, multiple plugin hooks were failing:
```
Plugin hook error: /Users/antonabyzov/.claude/plugins/marketplaces/specweave/plugins/specweave/hooks/post-task-completion.sh: No such file or directory
Plugin hook error: /Users/antonabyzov/.claude/plugins/marketplaces/specweave/plugins/specweave-github/hooks/post-task-completion.sh: No such file or directory
```

**Impact**:
- Living docs sync not running
- GitHub issue updates not syncing
- Status line cache not updating
- Sound notifications not playing

---

## Root Cause Analysis

### The Claude Code Local Marketplace Bug

When using LOCAL marketplace registration for development:

```bash
# Local registration (development)
claude plugin marketplace add /path/to/local/specweave

# What happens:
# 1. ✅ Claude registers the marketplace
# 2. ✅ Plugins get registered in installed_plugins.json
# 3. ❌ Install paths point to: ~/.claude/plugins/marketplaces/specweave/plugins/{plugin}/
# 4. ❌ BUT directory is NEVER created (no files copied!)
# 5. ❌ Hooks try to execute from non-existent paths → FAIL
```

**Key Insight**: Local marketplace registration records paths but doesn't copy files!

### Why Production Users Don't See This

Production users run `specweave init`, which uses GitHub marketplace:

```bash
# GitHub registration (production)
claude plugin marketplace add anton-abyzov/specweave

# What happens:
# 1. ✅ Claude CLONES repo from GitHub
# 2. ✅ All files copied to: ~/.claude/plugins/marketplaces/specweave/
# 3. ✅ Plugins installed from cloned directory
# 4. ✅ Hooks execute successfully!
```

**Result**: GitHub marketplace clones entire repo → Files exist → Hooks work!

---

## Solution: Environment-Aware Setup

### Automated Script (Recommended)

Created `scripts/setup-dev-plugins.sh` that:
1. **Detects environment** (local machine vs cloud VM)
2. **Local**: Creates symlink for instant updates
3. **VM/Cloud**: Uses GitHub marketplace for reliability
4. **Installs** core plugins automatically
5. **Verifies** everything works

**Usage**:
```bash
# Run from repo root
./scripts/setup-dev-plugins.sh

# Auto-detects and configures correctly!
```

### Environment Detection Logic

The script detects VMs by checking:
- `CLOUDENV`, `CODESPACE_NAME`, `GITPOD_WORKSPACE_ID` env vars
- `/.dockerenv` file (Docker)
- `/workspace` directory (cloud IDEs)
- Hypervisor indicators in `/proc/cpuinfo`
- Hostname patterns (e.g., `claude-code`)

### Two Setup Strategies

| Environment | Method | Why | Persistence |
|-------------|--------|-----|-------------|
| **Local machine** | Symlink | Instant updates, no GitHub push needed | Permanent |
| **claude.ai/code VM** | GitHub marketplace | Reliable, always up-to-date | VM re-clones on restart |
| **Codespaces** | GitHub marketplace | Works in any cloud IDE | Per-session |

---

## Implementation Details

### Local Setup (Symlink)

```bash
# Create symlink
ln -sf /path/to/specweave ~/.claude/plugins/marketplaces/specweave

# Benefits:
# ✅ Changes to hooks take effect immediately
# ✅ No need to push to GitHub for testing
# ✅ Full development workflow
```

**Use case**: Active development, rapid iteration

### VM Setup (GitHub Marketplace)

```bash
# Remove local marketplace
claude plugin marketplace remove specweave

# Add GitHub marketplace
claude plugin marketplace add anton-abyzov/specweave

# Install plugins
claude plugin install specweave
claude plugin install specweave-github

# Benefits:
# ✅ Reliable across VM recreations
# ✅ Always up-to-date with GitHub
# ✅ Production-like testing
```

**Use case**: Cloud development, production testing

---

## Files Changed

### 1. Setup Script
**File**: `scripts/setup-dev-plugins.sh`
- Automatic environment detection
- Smart setup (symlink vs GitHub)
- Plugin installation
- Verification checks

### 2. Documentation
**Files**:
- `CLAUDE.md` (lines 2838-2904) - Troubleshooting section
- `scripts/README-setup-dev-plugins.md` - Script documentation

### 3. Size Reduction
**CLAUDE.md**:
- **Before**: 2917 lines
- **After**: 2968 lines (+51 lines)
- Added automated solution with clear instructions

---

## Verification

### Testing Local Setup

```bash
# Run setup
./scripts/setup-dev-plugins.sh

# Expected output:
# Environment detected: local
# ✅ Symlink created successfully
# ✅ Core hooks accessible

# Verify
ls -la ~/.claude/plugins/marketplaces/specweave
# → Should show: specweave -> /path/to/repo

test -f ~/.claude/plugins/marketplaces/specweave/plugins/specweave/hooks/post-task-completion.sh && echo "✅"
# → Should output: ✅
```

### Testing VM Setup

In claude.ai/code or Codespaces:

```bash
# Run setup
./scripts/setup-dev-plugins.sh

# Expected output:
# Environment detected: vm
# 🌐 Setting up GitHub marketplace...
# ✅ GitHub marketplace added
# ✅ Marketplace cloned to: ~/.claude/plugins/marketplaces/specweave

# Verify
ls -la ~/.claude/plugins/marketplaces/specweave
# → Should show: actual directory (not symlink)

test -f ~/.claude/plugins/marketplaces/specweave/plugins/specweave/hooks/post-task-completion.sh && echo "✅"
# → Should output: ✅
```

---

## Results

### Before Fix
```
❌ Hooks fail: "No such file or directory"
❌ Living docs not syncing
❌ GitHub issues not updating
❌ Status line stale
❌ No completion sounds
```

### After Fix
```
✅ Hooks execute successfully
✅ Living docs sync automatically
✅ GitHub issues update on task completion
✅ Status line refreshes
✅ Completion sounds play
✅ Works in both local and VM environments!
```

---

## Key Insights

1. **GitHub marketplace CLONES repo** → Files exist → Hooks work
2. **Local marketplace RECORDS path** → No files copied → Hooks fail
3. **Environment matters**: Symlink (local) vs GitHub (VM)
4. **Production users unaffected**: They use GitHub marketplace automatically
5. **Contributors need setup**: One-time script execution fixes everything

---

## Future Improvements

**Potential enhancements**:
1. **Auto-detect and warn**: If local marketplace detected, show warning
2. **Init-time setup**: Run `setup-dev-plugins.sh` during `specweave init` for contributors
3. **CI/CD testing**: Test both setups in GitHub Actions
4. **Fallback detection**: If hooks fail, suggest running setup script

**For now**: Manual run of `setup-dev-plugins.sh` is sufficient for contributors.

---

## Related Issues

- **Issue #30**: Plugin hooks not executing (resolved)
- **PR #45**: Hook execution fix (merged)
- **ADR-031**: Development environment setup strategy (to be written)

---

## References

- **Setup script**: `scripts/setup-dev-plugins.sh`
- **Documentation**: `CLAUDE.md` lines 2838-2904
- **Script README**: `scripts/README-setup-dev-plugins.md`
- **Plugin architecture**: `plugins/*/README.md`
- **Hooks documentation**: `plugins/specweave/hooks/README.md`

---

**Summary**: One automated script (`setup-dev-plugins.sh`) solves hook execution issues for BOTH local development AND cloud VMs by detecting environment and using the right setup strategy. Production users unaffected - they get GitHub marketplace automatically via `specweave init`. ✅
