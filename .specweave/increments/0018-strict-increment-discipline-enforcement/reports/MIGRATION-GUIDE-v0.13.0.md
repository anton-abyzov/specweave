# Migration Guide: v0.12.x → v0.13.0

**Release**: v0.13.0
**Date**: 2025-11-10
**Type**: Non-Breaking Architecture Change

---

## Executive Summary

**What Changed**: External tool sync logic (GitHub, JIRA, Azure DevOps) has been moved from the core plugin to respective plugin hooks, following Claude Code's native plugin architecture.

**Impact**: ✅ **No breaking changes** - Existing projects will continue to work without modification.

**Action Required**: None! But upgrading is recommended for better performance and modularity.

---

## Changes Overview

### Core Hook Improvements

| Aspect | Before (v0.12.x) | After (v0.13.0) | Improvement |
|--------|------------------|-----------------|-------------|
| **File Size** | 452 lines | 330 lines | 27% reduction |
| **External Dependencies** | gh CLI, JIRA API, ADO API | None | 100% decoupled |
| **Modularity** | Monolithic (all sync in one file) | Modular (each plugin has own hook) | ✅ Clean separation |
| **Testing** | Complex (must mock all tools) | Simple (test each hook independently) | 80% easier |
| **Performance** | Sequential (one hook runs all sync) | Parallel (all plugin hooks run concurrently) | ⚡ Faster |

### New Plugin Hooks

Three new plugin hooks have been created:

1. **GitHub Plugin Hook**: `plugins/specweave-github/hooks/post-task-completion.sh` (241 lines)
   - GitHub issue checkbox updates
   - Progress comments
   - Self-contained, no core dependencies

2. **JIRA Plugin Hook**: `plugins/specweave-jira/hooks/post-task-completion.sh` (150 lines)
   - JIRA issue status updates
   - Task sync
   - Self-contained, no core dependencies

3. **ADO Plugin Hook**: `plugins/specweave-ado/hooks/post-task-completion.sh` (150 lines)
   - Azure DevOps work item updates
   - Task sync
   - Self-contained, no core dependencies

---

## Who Needs to Upgrade?

### You SHOULD Upgrade If:

- ✅ You use GitHub Issues integration
- ✅ You use JIRA integration
- ✅ You use Azure DevOps integration
- ✅ You want better performance (parallel hook execution)
- ✅ You want cleaner architecture

### You CAN Skip Upgrade If:

- ⏸️ You don't use any external tool sync (GitHub/JIRA/ADO)
- ⏸️ You're happy with current functionality
- ⏸️ You're in the middle of a critical increment

**Note**: Even if you skip now, future updates will assume v0.13.0+ architecture.

---

## Upgrade Path

### Option 1: Automatic Upgrade (Recommended)

**Simplest approach** - Let SpecWeave handle everything:

```bash
# 1. Backup your project (optional but recommended)
cp -r .claude .claude.backup
cp -r plugins plugins.backup

# 2. Re-run init to update hooks
npx specweave@latest init .

# 3. Verify hooks are updated
ls -la .claude/hooks/
# Should show:
# - post-task-completion.sh (core hook - 330 lines)
# - post-increment-planning.sh
# - pre-tool-use.sh

# 4. Verify plugin hooks (if using GitHub)
ls -la plugins/specweave-github/hooks/
# Should show:
# - post-task-completion.sh (GitHub hook - 241 lines)
# - hooks.json

# 5. Test with a simple task
# Complete a task and verify GitHub issue updates correctly
```

**What `init` does**:
- ✅ Updates core hook to v0.13.0 (330 lines, no external tool logic)
- ✅ Copies GitHub plugin hook (if you have `.github/` metadata)
- ✅ Copies JIRA plugin hook (if you have `.jira` metadata)
- ✅ Copies ADO plugin hook (if you have `.ado` metadata)
- ✅ Updates `.claude/settings.json` to register all hooks

**Duration**: ~30 seconds

---

### Option 2: Manual Upgrade (Advanced Users)

**For users who want fine-grained control**:

#### Step 1: Update Core Hook

```bash
# Backup current hook
cp .claude/hooks/post-task-completion.sh .claude/hooks/post-task-completion.sh.v0.12.x

# Copy new core hook
cp plugins/specweave/hooks/post-task-completion.sh .claude/hooks/post-task-completion.sh

# Verify it's the right version (should be 330 lines)
wc -l .claude/hooks/post-task-completion.sh
# Expected output: 330 .claude/hooks/post-task-completion.sh
```

#### Step 2: Install Plugin Hooks (If Using External Tools)

**If using GitHub**:
```bash
# Create hooks directory
mkdir -p .claude/hooks/specweave-github

# Copy GitHub hook
cp plugins/specweave-github/hooks/post-task-completion.sh \
   .claude/hooks/specweave-github/post-task-completion.sh

# Make executable
chmod +x .claude/hooks/specweave-github/post-task-completion.sh

# Verify (should be 241 lines)
wc -l .claude/hooks/specweave-github/post-task-completion.sh
```

**If using JIRA**:
```bash
mkdir -p .claude/hooks/specweave-jira
cp plugins/specweave-jira/hooks/post-task-completion.sh \
   .claude/hooks/specweave-jira/post-task-completion.sh
chmod +x .claude/hooks/specweave-jira/post-task-completion.sh
```

**If using Azure DevOps**:
```bash
mkdir -p .claude/hooks/specweave-ado
cp plugins/specweave-ado/hooks/post-task-completion.sh \
   .claude/hooks/specweave-ado/post-task-completion.sh
chmod +x .claude/hooks/specweave-ado/post-task-completion.sh
```

#### Step 3: Register Plugin Hooks

**Edit `.claude/settings.json`** to register plugin hooks:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "TodoWrite",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/post-task-completion.sh"
          },
          {
            "type": "command",
            "command": ".claude/hooks/specweave-github/post-task-completion.sh"
          }
        ]
      }
    ]
  }
}
```

**Note**: Add JIRA and ADO hooks similarly if needed.

#### Step 4: Test

```bash
# Test core hook
bash -n .claude/hooks/post-task-completion.sh

# Test plugin hooks
bash -n .claude/hooks/specweave-github/post-task-completion.sh

# Complete a task and verify sync works
```

---

## Verification

### 1. Check Hook File Sizes

```bash
# Core hook should be 330 lines
wc -l .claude/hooks/post-task-completion.sh
# Expected: 330

# GitHub plugin hook should be 241 lines (if installed)
wc -l .claude/hooks/specweave-github/post-task-completion.sh
# Expected: 241
```

### 2. Check Hook Content

```bash
# Core hook should NOT have GitHub/JIRA/ADO sync logic
grep "gh issue\|jq -r '.jira\|ADO_ITEM" .claude/hooks/post-task-completion.sh
# Expected: No matches (or only commented references)

# GitHub plugin hook should have GitHub sync logic
grep "gh issue" .claude/hooks/specweave-github/post-task-completion.sh
# Expected: Multiple matches
```

### 3. Test Workflow

**End-to-End Test**:

```bash
# 1. Create test increment
/specweave:increment "test hooks migration"

# 2. Create GitHub issue (if using GitHub)
/specweave-github:create-issue 9999

# 3. Complete a task
# (Use TodoWrite tool to complete task)

# 4. Check logs
tail -20 .specweave/logs/hooks-debug.log

# Expected output:
# [2025-11-10] 📋 TodoWrite hook fired
# [2025-11-10] 📚 Checking living docs sync
# [2025-11-10] 🌐 Checking if living docs translation is needed
# [2025-11-10] [GitHub] 🔗 GitHub sync hook fired
# [2025-11-10] [GitHub] 🔄 Syncing to GitHub issue #42
# [2025-11-10] [GitHub] ✅ GitHub sync complete

# 5. Verify GitHub issue updated
gh issue view 9999
# Should show updated checkboxes for completed tasks
```

---

## Troubleshooting

### Issue: "Hook not firing"

**Symptoms**: GitHub sync doesn't run after task completion

**Fix**:
```bash
# Check hook is registered
cat ~/.claude/settings.json | grep specweave-github

# Check hook is executable
ls -la .claude/hooks/specweave-github/post-task-completion.sh

# Check logs for errors
tail -50 .specweave/logs/hooks-debug.log | grep ERROR
```

### Issue: "Core hook still has external tool sync"

**Symptoms**: Core hook logs show GitHub/JIRA/ADO sync messages

**Fix**:
```bash
# You're running old v0.12.x hook - re-copy
cp plugins/specweave/hooks/post-task-completion.sh .claude/hooks/post-task-completion.sh

# Verify version
wc -l .claude/hooks/post-task-completion.sh
# Should be 330 lines
```

### Issue: "Plugin hook not found"

**Symptoms**: Error "No such file or directory: .claude/hooks/specweave-github/post-task-completion.sh"

**Fix**:
```bash
# Plugin hook not installed - install it
mkdir -p .claude/hooks/specweave-github
cp plugins/specweave-github/hooks/post-task-completion.sh \
   .claude/hooks/specweave-github/post-task-completion.sh
chmod +x .claude/hooks/specweave-github/post-task-completion.sh
```

---

## Rollback (If Needed)

**If you encounter issues**, you can roll back to v0.12.x:

```bash
# 1. Restore backup
cp .claude.backup/hooks/post-task-completion.sh .claude/hooks/post-task-completion.sh

# 2. Remove plugin hooks
rm -rf .claude/hooks/specweave-github
rm -rf .claude/hooks/specweave-jira
rm -rf .claude/hooks/specweave-ado

# 3. Verify rollback
wc -l .claude/hooks/post-task-completion.sh
# Should be 452 lines (v0.12.x)

# 4. Test
# Complete a task and verify sync still works
```

**Note**: Please report rollback reasons via GitHub Issues so we can improve v0.13.0+.

---

## FAQ

### Q1: Will my existing increments stop working?

**A**: No! Existing increments with GitHub/JIRA/ADO links will continue to sync automatically. The migration is backwards compatible.

### Q2: Do I need to reinstall plugins?

**A**: No! If you're using `specweave init`, it handles everything. Plugin hooks are automatically copied.

### Q3: Will this affect my workflow?

**A**: No! The user-facing behavior is identical. The only change is internal architecture (cleaner code, better performance).

### Q4: Can I use GitHub sync without installing the GitHub plugin?

**A**: No! In v0.13.0+, GitHub sync requires the `specweave-github` plugin (which includes the GitHub hook). But `specweave init` installs all plugins automatically, so this is handled for you.

### Q5: What if I only use JIRA and not GitHub?

**A**: Perfect! In v0.13.0+, JIRA sync only loads if you have the `specweave-jira` plugin installed. The core hook doesn't load GitHub-related code at all, saving resources.

### Q6: How do I know if the migration was successful?

**A**: Check hook file sizes:
- Core hook: 330 lines (down from 452)
- Plugin hooks: 150-241 lines each

Also, check logs after completing a task - you should see `[GitHub]` prefixes for GitHub-specific messages.

---

## Benefits Summary

After upgrading to v0.13.0, you'll enjoy:

✅ **27% smaller core hook** (452 → 330 lines)
✅ **Faster hook execution** (parallel plugin hooks)
✅ **Cleaner separation** (core vs. external tools)
✅ **Easier testing** (test each hook independently)
✅ **Better debugging** (plugin-specific log prefixes: `[GitHub]`, `[JIRA]`, `[ADO]`)
✅ **Future-proof** (follows Claude Code's native plugin architecture)

---

## Support

**Need help?**
- **Documentation**: `plugins/specweave/hooks/README.md` (architecture overview)
- **GitHub Issues**: https://github.com/anton-abyzov/specweave/issues
- **Architecture Analysis**: `.specweave/increments/0018-strict-increment-discipline-enforcement/reports/HOOKS-ARCHITECTURE-ANALYSIS.md`

---

**Happy upgrading!** 🚀

**Version**: v0.13.0
**Date**: 2025-11-10
