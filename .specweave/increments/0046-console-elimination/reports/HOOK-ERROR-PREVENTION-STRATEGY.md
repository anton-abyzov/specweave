# Hook Error Prevention Strategy

**Date**: 2025-11-19
**Issue**: Claude Code aggressively auto-updates marketplace from GitHub, overwriting symlink
**Solution**: Multi-layered prevention approach

---

## Root Cause

Claude Code has a background process that monitors `~/.claude/plugins/known_marketplaces.json` and auto-updates marketplaces from their sources (e.g., GitHub). When the SpecWeave marketplace is registered with a GitHub source, Claude Code periodically:

1. Detects the marketplace needs updating
2. Pulls latest code from GitHub
3. **Overwrites the symlink** with a real directory copy
4. Updates `lastUpdated` timestamp in `known_marketplaces.json`

This happens **very aggressively** (every few seconds during active development), making symlink-based development impossible without protection.

---

## Prevention Strategy (Multi-Layered)

### Layer 1: Script-Based Setup ✅

**Use the official dev-mode script**:
```bash
bash scripts/dev-mode.sh
```

This script:
- Removes any existing directory/symlink
- Creates fresh symlink to local repo
- Verifies symlink creation
- Provides clear success/failure feedback

### Layer 2: Marketplace Registry Protection ✅

**Prevent auto-updates by clearing and locking marketplace registry**:
```bash
# Clear GitHub source from registry
echo '{}' > ~/.claude/plugins/known_marketplaces.json

# Make read-only to prevent Claude Code from re-registering
chmod 444 ~/.claude/plugins/known_marketplaces.json
```

**Why this works**:
- Empty registry = no GitHub source to pull from
- Read-only file = Claude Code can't add marketplace back
- Symlink remains untouched

### Layer 3: Pre-Commit Hook Verification (TODO)

Add to `.git/hooks/pre-commit`:
```bash
# Verify symlink exists and is correct
if [ ! -L ~/.claude/plugins/marketplaces/specweave ]; then
  echo "❌ ERROR: Marketplace symlink missing!"
  echo "Fix: bash scripts/dev-mode.sh"
  exit 1
fi

SYMLINK_TARGET=$(readlink ~/.claude/plugins/marketplaces/specweave)
REPO_ROOT=$(git rev-parse --show-toplevel)

if [ "$SYMLINK_TARGET" != "$REPO_ROOT" ]; then
  echo "❌ ERROR: Symlink points to wrong location!"
  echo "Expected: $REPO_ROOT"
  echo "Actual: $SYMLINK_TARGET"
  echo "Fix: bash scripts/dev-mode.sh"
  exit 1
fi
```

### Layer 4: Session Startup Check (TODO)

Add to shell profile (`.zshrc` / `.bashrc`):
```bash
# Auto-fix SpecWeave dev environment on terminal startup
if [ -d ~/Projects/github/specweave ]; then
  if [ ! -L ~/.claude/plugins/marketplaces/specweave ] || \
     [ "$(readlink ~/.claude/plugins/marketplaces/specweave)" != "$HOME/Projects/github/specweave" ]; then
    echo "🔧 Fixing SpecWeave dev environment..."
    bash ~/Projects/github/specweave/scripts/dev-mode.sh
  fi
fi
```

---

## Quick Recovery

If hooks start failing again:

```bash
# One-line fix
bash scripts/dev-mode.sh && echo '{}' > ~/.claude/plugins/known_marketplaces.json && chmod 444 ~/.claude/plugins/known_marketplaces.json

# Verify fix
bash .specweave/increments/0043-spec-md-desync-fix/scripts/verify-dev-setup.sh
```

---

## Testing the Fix

1. **Trigger TodoWrite**: Use TodoWrite tool to trigger post-task-completion hooks
2. **Wait 5 seconds**: Check if symlink persists
3. **Run verification**: `bash .specweave/increments/0043-spec-md-desync-fix/scripts/verify-dev-setup.sh`
4. **Expected**: All checks pass, no "No such file or directory" errors

---

## Alternative: NPM Testing Mode

If you need to test the **npm-installed** version (as end-users would experience it):

```bash
# Switch to npm mode (removes symlink, uses global install)
bash scripts/npm-mode.sh

# Test as end-user
cd /tmp
mkdir test-project && cd test-project
specweave init .
# ... test commands ...

# Switch back to dev mode
cd ~/Projects/github/specweave
bash scripts/dev-mode.sh
```

---

## Files Changed

- `~/.claude/plugins/marketplaces/specweave` → symlink to local repo
- `~/.claude/plugins/known_marketplaces.json` → cleared + read-only

---

## Verification Checklist

- [x] Symlink exists and points to local repo
- [x] Hooks are executable
- [x] Marketplace registry cleared
- [x] Registry file made read-only
- [x] Verification script passes
- [ ] Pre-commit hook updated (future work)
- [ ] Shell profile updated (future work)

