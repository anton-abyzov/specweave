# ⚠️ DEPRECATED: Symlink Development Mode (Advanced)

> **🔴 DEPRECATED AS OF 2025-11-22**
>
> **This workflow is no longer supported or recommended.**
>
> **Use GitHub marketplace exclusively**: All development now uses GitHub-first workflow with automatic marketplace updates (5-10s sync time).
>
> **See**: CLAUDE.md Section 1 "Local Development Setup" for current guidelines.
>
> ---
>
> **This document is preserved for historical reference only.**

---

**Original Audience**: Advanced contributors who need instant hook updates without pushing to GitHub
**Platforms**: macOS, Linux only (NOT Windows)
**Complexity**: High (bash scripts, registry manipulation)
**Maintenance**: Ongoing (Claude Code fights symlinks)

---

## When to Use This

**Use GitHub marketplace** (default recommendation) unless you need:
- **Instant hook testing** without pushing to GitHub (< 5 second feedback loop)
- **Rapid bash script iteration** (changing hooks 10+ times per session)
- **Pre-commit hook testing** (can't push without hooks working)

**Most contributors should NOT use this approach.** The GitHub marketplace workflow is simpler and more reliable.

---

## How It Works

### Normal Flow (GitHub Marketplace)
```
Local repo → Git push → GitHub → Claude Code pulls (5-10s) → Marketplace dir
```

### Symlink Flow (Advanced)
```
Local repo ← Symlink ← Marketplace dir
Changes are instant (no push needed)
```

**Trade-off**: You fight Claude Code's auto-update mechanism constantly.

---

## Setup Instructions

### Prerequisites

**macOS/Linux Only**:
- bash shell
- `ln -s` command (symlinks)
- `readlink` command (`greadlink` on macOS via `brew install coreutils`)

**Windows**: NOT SUPPORTED
- `mklink /D` requires admin privileges
- Path formats differ (`%USERPROFILE%` vs `$HOME`)
- Bash scripts won't run natively

### Step 1: Create Symlink

```bash
# From repository root
bash scripts/dev-mode.sh

# This creates:
# ~/.claude/plugins/marketplaces/specweave → /path/to/your/repo
```

**Verification**:
```bash
ls -ld ~/.claude/plugins/marketplaces/specweave
# Must show: lrwxr-xr-x ... -> /path/to/repo (SYMLINK, not drwxr-xr-x)
```

### Step 2: Prevent Claude Code Auto-Updates

Claude Code aggressively pulls from GitHub and **overwrites symlinks** with real directories. Prevent this:

```bash
# Clear GitHub source from registry
echo '{}' > ~/.claude/plugins/known_marketplaces.json

# Make read-only so Claude Code can't re-register
chmod 444 ~/.claude/plugins/known_marketplaces.json
```

**Why this works**:
- Empty registry = no GitHub source to update from
- Read-only file = Claude Code can't add marketplace back
- Symlink remains untouched

### Step 3: Verify Setup

> **Note**: The verification script from increment 0043 has been archived and removed.
> Use manual verification steps below instead.

**Manual verification**:
```bash
# Check symlink exists and points to repo
ls -ld ~/.claude/plugins/marketplaces/specweave
# Must show: lrwxr-xr-x ... -> /path/to/repo

# Check registry is locked
ls -l ~/.claude/plugins/known_marketplaces.json
# Must show: -r--r--r-- (read-only)
```

---

## Development Workflow (Symlink Mode)

```bash
# 1. Make changes to hooks (no commit needed!)
vim plugins/specweave/hooks/post-task-completion.sh

# 2. For TypeScript changes, rebuild
npm run rebuild

# 3. Test immediately in Claude Code (no push!)
/specweave:increment "test"
# Hooks execute instantly from local repo

# 4. Commit when ready
git add . && git commit -m "fix: hook logic"
git push origin develop
```

**Benefits**:
- ⚡ **Instant feedback** (no waiting for GitHub)
- 🔄 **Rapid iteration** (change → test → change)
- 🧪 **Pre-commit testing** (test hooks before pushing)

**Costs**:
- ⚠️ **Symlink breaks** if Claude Code updates (check every session)
- ⚠️ **Platform-locked** (Unix only, can't share workflow with Windows contributors)
- ⚠️ **Maintenance burden** (verify symlink, keep registry locked)

---

## Troubleshooting

### Symlink Converted to Directory

**Symptom**: Hook errors return after working fine

**Diagnosis**:
```bash
ls -ld ~/.claude/plugins/marketplaces/specweave
# Shows: drwxr-xr-x (directory) instead of lrwxr-xr-x (symlink)
```

**Cause**: Claude Code auto-updated from GitHub

**Fix**:
```bash
bash scripts/dev-mode.sh
echo '{}' > ~/.claude/plugins/known_marketplaces.json
chmod 444 ~/.claude/plugins/known_marketplaces.json
```

### Registry File Became Writable

**Symptom**: Symlink breaks repeatedly

**Diagnosis**:
```bash
ls -l ~/.claude/plugins/known_marketplaces.json
# Shows: -rw-r--r-- instead of -r--r--r--
```

**Fix**:
```bash
chmod 444 ~/.claude/plugins/known_marketplaces.json
```

### Hooks Still Failing

**Possible causes**:
1. Symlink points to wrong directory
2. Hooks not executable
3. TypeScript not compiled

**Full diagnostic**:
```bash
# Check symlink target
readlink ~/.claude/plugins/marketplaces/specweave
# Should match: git rev-parse --show-toplevel

# Check hooks executable
ls -l plugins/specweave/hooks/*.sh
# All should have: -rwxr-xr-x

# Check TypeScript compiled
ls dist/src/core/
# Should exist with .js files

# Rebuild everything
npm run rebuild
```

---

## Switching Between Modes

### Symlink → GitHub Marketplace

```bash
# Restore normal operation
chmod 644 ~/.claude/plugins/known_marketplaces.json
echo '{
  "specweave": {
    "source": {
      "source": "github",
      "repo": "anton-abyzov/specweave"
    },
    "installLocation": "'$HOME'/.claude/plugins/marketplaces/specweave",
    "lastUpdated": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"
  }
}' > ~/.claude/plugins/known_marketplaces.json

# Remove symlink
rm ~/.claude/plugins/marketplaces/specweave

# Claude Code will auto-recreate as directory from GitHub
# (Wait 5-10 seconds)
```

### GitHub Marketplace → Symlink

```bash
bash scripts/dev-mode.sh
echo '{}' > ~/.claude/plugins/known_marketplaces.json
chmod 444 ~/.claude/plugins/known_marketplaces.json
```

---

## Pre-Commit Hook Integration

The pre-commit hook checks for symlink existence (optional warning):

**Location**: `.git/hooks/pre-commit`

**Behavior**:
- If symlink exists and is broken → **Error (blocks commit)**
- If symlink doesn't exist → **Warning only (allows commit)**

**Why**: Contributors using GitHub marketplace don't have symlinks, so this check is opt-in.

---

## Comparison: Symlink vs GitHub Marketplace

| Aspect | Symlink Mode | GitHub Marketplace |
|--------|--------------|-------------------|
| **Platforms** | macOS, Linux only | macOS, Linux, Windows |
| **Setup** | Complex (3 steps + verification) | Simple (clone + npm install) |
| **Feedback Loop** | Instant (<1s) | Fast (5-10s) |
| **Maintenance** | High (check every session) | Zero (auto-managed) |
| **Team Sharing** | Unix-only | Cross-platform |
| **Reliability** | Medium (Claude Code fights it) | High (Claude Code manages it) |
| **Use Case** | Rapid hook iteration | Normal development |

---

## Recommendation

**For 95% of contributors**: Use GitHub marketplace (simpler, cross-platform)
**For hook-heavy development**: Use symlink mode (faster feedback)
**For Windows contributors**: GitHub marketplace only (symlinks don't work)

---

## See Also

> **Note**: The increments 0043 and 0046 referenced in the original document have been archived and removed.

- `scripts/dev-mode.sh` - Symlink creation script (if still present)
- `scripts/npm-mode.sh` - Revert to npm install mode (if still present)
- **Current workflow**: See CLAUDE.md "Local Development Setup" section
