# Plugin Installation Error - Root Cause Analysis
**Date**: 2025-11-22
**Severity**: CRITICAL
**Type**: Configuration / Version Mismatch

---

## Executive Summary

Plugin installation errors in Claude Code are caused by:
1. **Stale local plugin installations** (v0.22.14 vs current v0.23.16)
2. **Mixed installation paths** (marketplace vs project directory)
3. **Old git commits** (from Nov 20, not current Nov 22 code)
4. **Using local refs instead of GitHub refs** (violates CLAUDE.md §1 guidance)

**Impact**: Plugins fail to load, features unavailable, development blocked

---

## Investigation Findings

### 1. Current State

**Project Version**: 0.23.16
**Current Commit**: `ff449c1dfca5987ce4eb3a03ceb00e411d0ebe02` (NOT pushed)
**Git Branch**: develop (ahead by 1 commit)

### 2. Installed Plugin Analysis

From `~/.claude/plugins/installed_plugins.json`:

#### Core Plugin (`specweave@specweave`)
```json
{
  "version": "0.22.14",  ⚠️ 2 versions behind (current: 0.23.16)
  "installPath": "/Users/antonabyzov/.claude/plugins/marketplaces/specweave/plugins/specweave",
  "gitCommitSha": "0f0269640dd477160cfb95e0d60364c32d29be6f",  ⚠️ OLD (pre-0.23.14)
  "isLocal": true  ⚠️ Local reference, not GitHub
}
```

**Commit age**: From before 2025-11-20 (4+ commits behind):
- Missing: v0.23.14 (emergency hook safety)
- Missing: v0.23.15 (plugin stub removal)
- Missing: v0.23.16 (current version)

#### Other Plugins
```json
{
  "installPath": "/Users/antonabyzov/Projects/github/specweave/plugins/specweave-*",  ⚠️ Direct project path!
  "gitCommitSha": "29942785b8b2e546ff9412332887f0b3017f3beb",  ⚠️ OLD
  "isLocal": true  ⚠️ Local reference
}
```

**Problem**: These plugins point DIRECTLY to project directory, bypassing marketplace!

### 3. Marketplace Registration

From `~/.claude/plugins/known_marketplaces.json`:

```json
{
  "specweave": {
    "source": {
      "source": "github",
      "repo": "anton-abyzov/specweave"  ✅ Correct GitHub ref
    },
    "installLocation": "/Users/antonabyzov/.claude/plugins/marketplaces/specweave",
    "lastUpdated": "2025-11-22T07:28:00.252Z"  ⚠️ Updated today, but plugins are old
  }
}
```

**Marketplace IS registered correctly**, but plugins are stale local copies!

### 4. Root Cause

**Primary Issue**: Local development workflow (symlinks/local paths) violates CLAUDE.md §1:

> Testing Unpublished Changes:
> - **Option 1**: Temp branch → push → test → delete
> - **Option 2**: Fork-based (`claude plugin marketplace add github:YOUR_USERNAME/specweave`)
> - **Option 3**: Symlink (Unix-only, see `.specweave/docs/internal/advanced/symlink-dev-mode.md`)

**Current setup**: Mix of Option 3 (symlink-like with `isLocal: true`) and stale local paths

**Why it fails**:
1. ❌ Plugins installed with old commits (not auto-updating)
2. ❌ Version mismatch (0.22.14 vs 0.23.16)
3. ❌ Direct project path references bypass marketplace update mechanism
4. ❌ Unpushed changes (commit ff449c1) not in GitHub, so GitHub ref can't fetch them

---

## Impact Analysis

### What's Broken

1. **Plugin Loading Failures**: Old versions may have incompatible APIs
2. **Missing Features**: Emergency hook safety (v0.23.14) not active
3. **Potential Hook Crashes**: Pre-v0.23.14 hooks lack circuit breaker protection
4. **Development Blocked**: Can't test latest changes in Claude Code

### User Experience

User sees: "5. View installation status (errors)" in Claude Code plugin menu

Errors likely show:
- Version mismatches
- Missing dependencies (from v0.23.16)
- Hook failures (old code)

---

## Solution Options

### Option 1: GitHub-First (RECOMMENDED - Per CLAUDE.md §1)

**Steps**:
1. **Push current commit** to GitHub:
   ```bash
   git push origin develop
   ```

2. **Remove marketplace**:
   ```bash
   claude plugin marketplace remove specweave
   ```

3. **Re-add from GitHub**:
   ```bash
   claude plugin marketplace add github:anton-abyzov/specweave
   ```

4. **Browse and install plugins** (Claude Code will fetch latest from GitHub)

**Pros**:
- ✅ Always uses latest pushed code
- ✅ Auto-updates within 5-10 seconds of push
- ✅ Clean separation (development vs usage)
- ✅ Follows CLAUDE.md best practices

**Cons**:
- ❌ Requires pushing for every test (can use temp branches)

---

### Option 2: Fix Local Symlink (Development Mode)

**Steps**:
1. **Remove stale installations**:
   ```bash
   rm -rf ~/.claude/plugins/marketplaces/specweave
   ```

2. **Create proper symlink**:
   ```bash
   ln -s "$(pwd)" ~/.claude/plugins/marketplaces/specweave
   ```

3. **Rebuild**:
   ```bash
   npm run rebuild
   ```

4. **Restart Claude Code**

**Pros**:
- ✅ Instant updates (no push needed)
- ✅ Faster development iteration

**Cons**:
- ❌ Requires manual rebuild after changes
- ❌ Easy to get out of sync (as happened here!)
- ❌ Only works on Unix systems
- ❌ Not recommended for production use

---

### Option 3: Hybrid (Temp Branches)

**Steps**:
1. **Create temp branch** for each test:
   ```bash
   git checkout -b test-feature-xyz
   git push origin test-feature-xyz
   ```

2. **Test** via GitHub ref (auto-updates)

3. **Delete branch** after testing:
   ```bash
   git push origin --delete test-feature-xyz
   ```

**Pros**:
- ✅ GitHub-first (auto-updates)
- ✅ Doesn't pollute develop with test commits
- ✅ Clean workflow

**Cons**:
- ❌ Extra branch management overhead

---

## Immediate Actions Required

### 1. Push Current Commit (CRITICAL)
```bash
git push origin develop
```

**Why**: Unpushed commit ff449c1 is blocking GitHub-based installation

### 2. Clean Stale Installations
```bash
# Remove marketplace (will clean all plugins)
claude plugin marketplace remove specweave

# Or manually clean
rm -rf ~/.claude/plugins/marketplaces/specweave
```

### 3. Reinstall from GitHub
```bash
# Wait 10 seconds after push for GitHub to process
sleep 10

# Add marketplace
claude plugin marketplace add github:anton-abyzov/specweave

# Browse and install plugins in Claude Code UI
```

### 4. Verify Installation
```bash
# Check versions match
cat ~/.claude/plugins/installed_plugins.json | grep -A 5 "specweave@specweave"

# Should show:
# "version": "0.23.16"
# "gitCommitSha": "ff449c1..."  (current commit)
```

---

## Prevention

### 1. Document in CLAUDE.md

Add warning about local development pitfalls:

```markdown
### ⚠️ CRITICAL: Local Development Sync Issues

**Symptom**: Plugin installation errors, old versions, stale code

**Root Cause**: Using local symlinks/paths without proper maintenance

**Solution**: ALWAYS use GitHub-first workflow (Option 1) unless actively debugging plugins

**If using symlinks**:
1. Run `npm run rebuild` after EVERY code change
2. Restart Claude Code after rebuild
3. Check `~/.claude/plugins/installed_plugins.json` for version mismatches
```

### 2. Pre-Commit Hook Validation

Add check to validate plugin versions match package.json:

```bash
# scripts/pre-commit-plugin-version-check.sh
PACKAGE_VERSION=$(cat package.json | grep '"version"' | cut -d'"' -f4)
INSTALLED_VERSION=$(cat ~/.claude/plugins/installed_plugins.json | grep -A 1 "specweave@specweave" | grep version | cut -d'"' -f4)

if [ "$PACKAGE_VERSION" != "$INSTALLED_VERSION" ]; then
  echo "⚠️ WARNING: Installed plugin version ($INSTALLED_VERSION) != package.json ($PACKAGE_VERSION)"
  echo "   Consider reinstalling from GitHub"
fi
```

### 3. CI/CD Validation

Add GitHub Actions job to verify marketplace.json matches actual plugin directories

---

## Timeline

**2025-11-20 12:06**: Last marketplace directory update (per ls -la)
**2025-11-20 17:10**: Core plugin installed at v0.22.14 (per installed_plugins.json)
**2025-11-22 02:28**: Marketplace updated (per ls timestamp)
**2025-11-22 07:28**: Marketplace re-registered (per known_marketplaces.json)
**NOW**: Plugins still at OLD versions despite marketplace updates

**Gap**: 2-4 versions behind, 2+ days of commits missing

---

## Related Issues

- **CLAUDE.md §1**: Local Development Setup (violated)
- **CLAUDE.md §14**: Marketplace Plugin Completeness (plugins validated OK, but stale)
- **ADR-0060**: Hook safety (v0.23.14 improvements NOT active due to old plugin version)
- **v0.23.14 Release**: Emergency hook safety NOT deployed to local Claude Code
- **v0.23.15 Release**: Plugin stub removal NOT deployed
- **v0.23.16**: Current version NOT deployed

---

## Conclusion

**Root Cause Confirmed**: Using local plugin references (`isLocal: true`) without proper synchronization

**Recommended Fix**: Switch to GitHub-first workflow (CLAUDE.md §1 Option 1)

**Immediate Action**: Push commit + reinstall from GitHub

**Prevention**: Add version mismatch warnings to pre-commit hooks

---

## Appendix A: Full Installation State

### known_marketplaces.json
```json
{
  "specweave": {
    "source": {
      "source": "github",
      "repo": "anton-abyzov/specweave"
    },
    "installLocation": "/Users/antonabyzov/.claude/plugins/marketplaces/specweave",
    "lastUpdated": "2025-11-22T07:28:00.252Z"
  }
}
```

### installed_plugins.json (partial)
```json
{
  "version": 1,
  "plugins": {
    "specweave@specweave": {
      "version": "0.22.14",  ⚠️ STALE
      "installedAt": "2025-11-20T17:10:00.000Z",
      "installPath": "/Users/antonabyzov/.claude/plugins/marketplaces/specweave/plugins/specweave",
      "gitCommitSha": "0f0269640dd477160cfb95e0d60364c32d29be6f",  ⚠️ OLD
      "isLocal": true
    },
    "specweave-github@specweave": {
      "installPath": "/Users/antonabyzov/Projects/github/specweave/plugins/specweave-github",  ⚠️ DIRECT PATH!
      "gitCommitSha": "29942785b8b2e546ff9412332887f0b3017f3beb",
      "isLocal": true
    }
  }
}
```

### Git State
```
Current: ff449c1dfca5987ce4eb3a03ceb00e411d0ebe02 (NOT pushed)
Branch: develop (ahead by 1 commit)
Version: 0.23.16
```

---

**END OF REPORT**
