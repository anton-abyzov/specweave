# Hook Error Resolution - Final Recommendation

**Date**: 2025-11-19
**Issue**: Plugin hooks failing with "No such file or directory"
**Root Cause**: Claude Code looks for hooks in marketplace directory
**Solution**: Use GitHub marketplace (cross-platform, simple)

---

## Executive Summary

**Problem**: TodoWrite triggered hook errors because Claude Code couldn't find hooks.

**Initial Approach**: Created symlink from marketplace → local repo (Unix-only, complex)

**Better Approach**: Use GitHub marketplace auto-updates (cross-platform, simple)

**Recommendation**: Update CLAUDE.md to recommend GitHub marketplace as primary workflow

---

## What We Learned

### Hook Execution Path

Claude Code executes hooks from:
```
~/.claude/plugins/marketplaces/specweave/plugins/*/hooks/*.sh
```

**NOT from**: Local repo or `installPath` in plugin registry

### Claude Code Auto-Update Behavior

- **Frequency**: Every 5-10 seconds during active development
- **Source**: Pulls from `anton-abyzov/specweave` on GitHub
- **Reliability**: Very aggressive, always overwrites local changes
- **Benefit**: Contributors get instant updates after pushing to GitHub

---

## Cross-Platform Comparison

| Approach | macOS | Linux | Windows | Complexity | Reliability |
|----------|-------|-------|---------|------------|-------------|
| **Symlink** | ✅ | ✅ | ❌ Admin required | High (scripts, locking) | Medium (race conditions) |
| **GitHub Marketplace** | ✅ | ✅ | ✅ | Low (git only) | High (Claude Code manages) |

---

## Recommended Workflow (GitHub Marketplace)

### One-Time Setup

```bash
git clone https://github.com/YOUR_USERNAME/specweave.git
cd specweave
npm install
npm run rebuild
```

Claude Code automatically installs from GitHub marketplace.

### Development Cycle

```bash
# 1. Make changes
vim src/core/task-parser.ts

# 2. Build TypeScript
npm run rebuild

# 3. Test locally
npm test

# 4. Commit & push
git add . && git commit -m "feat: new feature"
git push origin develop

# 5. Wait 5-10 seconds (Claude Code auto-updates)

# 6. Test in Claude Code
/specweave:increment "test feature"
```

### Hook-Only Changes (No TypeScript Build)

```bash
vim plugins/specweave/hooks/post-task-completion.sh
git add . && git commit -m "fix: hook error handling"
git push origin develop
# Wait 5-10 seconds → Claude Code auto-updates
```

---

## Edge Case: Testing Unpushed Changes

### Option 1: Temporary Branch

```bash
git checkout -b temp-test-$(date +%s)
git add . && git commit -m "temp: testing"
git push origin temp-test-...
# Test in Claude Code
git push origin --delete temp-test-...
git checkout develop && git branch -D temp-test-...
```

### Option 2: Fork-Based Development

```bash
# One-time: Point Claude Code to your fork
claude plugin marketplace remove specweave
claude plugin marketplace add github:YOUR_USERNAME/specweave

# Now push to your fork's develop branch
git push origin develop
# Claude Code pulls from YOUR fork instead of upstream
```

### Option 3: Symlink (Advanced, Unix-Only)

```bash
bash scripts/dev-mode.sh
echo '{}' > ~/.claude/plugins/known_marketplaces.json
chmod 444 ~/.claude/plugins/known_marketplaces.json
```

**Warning**: Only works on macOS/Linux, breaks on Windows

---

## Impact on Documentation

### CLAUDE.md Changes

**Section: "1. Dual-Mode Development Setup"**

- **BEFORE**: 50+ lines of symlink setup (MANDATORY)
- **AFTER**: 5 lines of git workflow (RECOMMENDED) + symlink as optional

**New Structure**:
```markdown
### Local Development Setup

#### Quick Start (All Platforms)
1. Clone, install, build
2. Push changes → Claude Code auto-updates
3. No symlinks, no scripts needed

#### Advanced: Symlink Mode (Optional, Unix-Only)
- For instant testing without pushing
- See: .specweave/docs/internal/advanced/symlink-dev-mode.md
```

---

## Verification

### Current State (Working)

```bash
$ ls -ld ~/.claude/plugins/marketplaces/specweave
drwxr-xr-x@ 37 ... /Users/.../.claude/plugins/marketplaces/specweave
# ✅ Directory (NOT symlink) - Claude Code manages it

$ cat ~/.claude/plugins/known_marketplaces.json | jq .
{
  "specweave": {
    "source": {
      "source": "github",
      "repo": "anton-abyzov/specweave"
    },
    "installLocation": "~/.claude/plugins/marketplaces/specweave",
    "lastUpdated": "2025-11-19T13:51:04.502Z"
  }
}
# ✅ GitHub source registered

$ test -f ~/.claude/plugins/marketplaces/specweave/plugins/specweave/hooks/post-task-completion.sh
# ✅ Hooks accessible

# Trigger TodoWrite → No errors! ✅
```

---

## Next Steps

1. **Update CLAUDE.md**: Replace symlink-first with GitHub marketplace-first
2. **Move symlink docs**: To `.specweave/docs/internal/advanced/` (optional reference)
3. **Update CONTRIBUTING.md**: Reference GitHub marketplace workflow
4. **Simplify pre-commit hook**: Remove symlink verification
5. **Update increment 0043 docs**: Mark symlink approach as advanced/optional

---

## Files Changed

### Created
- `.specweave/increments/0046-console-elimination/reports/SIMPLE-DEV-SETUP-RECOMMENDATION.md`
- `.specweave/increments/0046-console-elimination/reports/HOOK-ERROR-PREVENTION-STRATEGY.md` (symlink approach)
- `.specweave/increments/0046-console-elimination/reports/HOOK-ERROR-RESOLUTION-FINAL.md` (this file)

### Reverted
- `~/.claude/plugins/known_marketplaces.json` → Restored GitHub source
- `~/.claude/plugins/marketplaces/specweave` → Removed symlink, let Claude Code manage

---

## Conclusion

**The hook errors are resolved** by using Claude Code's intended workflow:

✅ **GitHub marketplace auto-updates** (cross-platform)
✅ **No complex setup** (just git push)
✅ **No symlink management** (Claude Code handles it)
✅ **No OS-specific scripts** (works on macOS, Linux, Windows)

**Recommendation**: Update CLAUDE.md to reflect this simpler approach as primary, with symlink as advanced option.
