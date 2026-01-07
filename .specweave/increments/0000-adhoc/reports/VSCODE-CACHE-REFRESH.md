# VSCode File Cache Refresh Guide

**Issue**: VSCode shows files in Explorer that don't actually exist on disk

**Why this happens**:
- Files were moved/deleted
- VSCode file watcher didn't catch the change
- Explorer cache is stale

## Quick Fix (Recommended)

```bash
# 1. Verify files don't exist
ls -la *.md | grep -v "CLAUDE\|README\|CHANGELOG\|LICENSE\|CODE_OF_CONDUCT\|SECURITY\|AGENTS\|IMPLEMENTATION"

# 2. Reload VSCode window
# CMD/CTRL + SHIFT + P → "Developer: Reload Window"
```

## Deep Refresh (If Quick Fix Doesn't Work)

```bash
# 1. Close VSCode completely
# 2. Clear workspace cache
rm -rf ~/Library/Application\ Support/Code/User/workspaceStorage/*

# 3. Restart VSCode
```

## Verify Clean State

```bash
# Check actual files on disk
ls -1 *.md 2>/dev/null

# Should only show:
# AGENTS.md
# CHANGELOG.md
# CLAUDE.md
# CODE_OF_CONDUCT.md
# README.md
# SECURITY.md
```

## Prevention

The root folder pollution is now prevented by:

1. **Design-time**: [CLAUDE.md](../../../CLAUDE.md) Critical Safety Rule #6
2. **Runtime**: [.gitignore](../../../.gitignore) patterns (lines 149-172)
3. **Commit-time**: Pre-commit hook #13

If VSCode shows pollution files:
- They're either in `.gitignore` (so won't be committed)
- Or VSCode cache is stale (reload window)
- Actual disk is clean ✅
