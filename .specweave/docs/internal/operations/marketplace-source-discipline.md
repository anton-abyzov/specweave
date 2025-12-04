# Emergency Procedure: Marketplace Source Discipline

**Status**: CRITICAL
**Severity**: P0 (Causes Claude Code crashes)
**Date**: 2025-11-24

---

## The Problem

**Symptom**: Claude Code throws "Plugin hook error: No such file or directory" for hooks that exist in source code.

**Root Cause**: Using **local mode** in marketplace refresh creates filesystem coupling that leads to stale hook registrations.

---

## Why Local Mode is Dangerous

### Local Mode Behavior

```json
{
  "source": { "source": "directory", "path": "/Users/antonabyzov/Projects/github/specweave" },
  "installLocation": "/Users/antonabyzov/Projects/github/specweave"  ← SAME PATH!
}
```

**Problems**:
1. **No Separate Installation** - Claude Code reads hooks directly from your working directory
2. **Filesystem Coupling** - Any git operations, file deletions, or uncommitted changes affect "installed" plugins
3. **Stale Registrations** - If marketplace is wiped/corrupted, Claude Code still tries to execute hooks from old paths
4. **Path Confusion** - Hooks expected at `~/.claude/plugins/marketplaces/` but actually at `/Users/.../specweave/`

### GitHub Mode Behavior

```json
{
  "source": { "source": "github", "repo": "anton-abyzov/specweave" },
  "installLocation": "/Users/antonabyzov/.claude/plugins/marketplaces/specweave"  ← SEPARATE PATH!
}
```

**Benefits**:
1. **Proper Copy** - Hooks installed to separate directory
2. **Stable Source** - Pulls from committed GitHub code only
3. **No Coupling** - Working directory changes don't affect runtime
4. **Production-Ready** - Same setup as end users

---

## Emergency Recovery

**If you see "Plugin hook error: No such file or directory":**

```bash
# 1. Refresh marketplace using GitHub mode
bash scripts/refresh-marketplace.sh --github

# 2. Verify source is GitHub
cat ~/.claude/plugins/known_marketplaces.json | jq -r '.specweave.source'
# Should output: {"source": "github", "repo": "anton-abyzov/specweave"}

# 3. RESTART Claude Code (critical!)

# 4. Verify hooks exist
ls ~/.claude/plugins/marketplaces/specweave/plugins/specweave/hooks/
# Should show 25+ hook files
```

---

## The Rule

**🚨 ALWAYS USE GITHUB MODE UNLESS ACTIVELY DEVELOPING**

```bash
# ✅ CORRECT (default)
bash scripts/refresh-marketplace.sh

# ❌ WRONG (only for emergency local testing)
bash scripts/refresh-marketplace.sh --local
```

---

## Development Workflow

**Correct workflow:**

1. Make changes to hooks/plugins
2. **Commit changes** (`git add . && git commit`)
3. **Push to GitHub** (`git push`)
4. **Refresh marketplace** (`bash scripts/refresh-marketplace.sh`)  ← Uses GitHub by default
5. **Restart Claude Code**
6. Test changes

**Emergency local testing** (use sparingly!):

1. Make changes to hooks/plugins
2. **Refresh with local mode** (`bash scripts/refresh-marketplace.sh --local`)
3. **Restart Claude Code**
4. Test changes
5. **Immediately commit, push, and switch back to GitHub mode**:
   ```bash
   git add . && git commit -m "fix: ..."
   git push
   bash scripts/refresh-marketplace.sh  # Back to GitHub mode!
   ```

---

## Prevention

**Script change (v0.25.1)**:
- Default changed from `local` to `github`
- Explicit `--local` flag required for local mode
- Warning messages added to help text

**CLAUDE.md updated** with:
- Critical warning about local mode dangers
- GitHub mode verification instructions
- Emergency recovery procedure

---

## Incident History

**2025-11-24**: Local mode caused empty marketplace → stale hook registrations → "hook not found" errors for `user-prompt-submit.sh` and `pre-command-deduplication.sh`.

**Resolution**: Changed default to GitHub mode, updated docs, refreshed marketplace.

---

## Verification Checklist

After any marketplace refresh:

- [ ] Check source: `cat ~/.claude/plugins/known_marketplaces.json | jq -r '.specweave.source.source'` → should be `"github"`
- [ ] Verify separate installation: `installLocation` should be `~/.claude/plugins/marketplaces/specweave`
- [ ] Confirm hooks exist: `ls ~/.claude/plugins/marketplaces/specweave/plugins/specweave/hooks/` → should show 25+ files
- [ ] Restart Claude Code
- [ ] Test hooks: Create a TodoWrite → verify no "hook not found" errors

---

**See Also**:
- `.specweave/docs/internal/../operations/hook-crash-recovery.md`
- `scripts/refresh-marketplace.sh` (source of truth for marketplace operations)
- CLAUDE.md section 1a (Quick Marketplace Refresh)
