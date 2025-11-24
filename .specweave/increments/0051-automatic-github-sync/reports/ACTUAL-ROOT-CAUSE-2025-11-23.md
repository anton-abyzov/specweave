# Claude Code Crash - ACTUAL Root Cause
**Date**: 2025-11-23 21:15 EST
**Status**: 🔴 CRITICAL - Requires Claude Code RESTART

---

## What Actually Happened

### My First Fix Attempt (FAILED)
```bash
✅ 1. Deleted old hooks from local filesystem
✅ 2. Refreshed marketplace cache
❌ 3. Expected it to work without restart → WRONG!
```

**Result**: Claude Code tried to execute `post-edit-spec.sh` but file didn't exist → CRASH

**Error**:
```
Plugin hook error: /bin/sh:
/Users/antonabyzov/.claude/plugins/marketplaces/specweave/plugins/specweave/hooks/post-edit-spec.sh:
No such file or directory
```

---

## The REAL Problem

### Claude Code Plugin Architecture

**How Claude Code loads plugins**:
1. **At startup**: Reads plugin.json, registers hooks, stores in memory
2. **During runtime**: Uses in-memory configuration (does NOT re-read files)
3. **Hook execution**: Resolves `${CLAUDE_PLUGIN_ROOT}` to plugin path, executes hook

**What this means**:
- Plugin configuration changes ONLY take effect on restart
- You can't update hooks mid-session
- Deleting hooks mid-session → crashes

### Timeline of What Happened

```
Session Start (before our fix):
  → Claude Code reads plugin.json (OLD config with post-edit-spec.sh)
  → Stores hook configuration in memory
  → Sets CLAUDE_PLUGIN_ROOT to local path

Our Fix:
  → We deleted old hooks (post-edit-spec.sh)
  → We refreshed marketplace
  → plugin.json now references new hooks (post-edit-write-consolidated.sh)

Claude Code (still running):
  → Still has OLD configuration in memory
  → Tries to execute post-edit-spec.sh
  → File doesn't exist → CRASH
```

---

## Current State

### What Exists Now

```bash
# Local hooks directory (where Claude Code looks):
/Users/antonabyzov/Projects/github/specweave/plugins/specweave/hooks/

✅ pre-edit-spec.sh (RESTORED from backup)
✅ post-edit-spec.sh (RESTORED from backup)
✅ pre-write-spec.sh (RESTORED from backup)
✅ post-write-spec.sh (RESTORED from backup)
✅ pre-edit-write-consolidated.sh (NEW v0.25.0)
✅ post-edit-write-consolidated.sh (NEW v0.25.0)
✅ post-metadata-change.sh (enhanced v0.25.0)
✅ post-task-completion.sh (enhanced v0.24.4)

Total: 25 hooks (old + new coexisting)
```

### Plugin Configuration

```json
// plugins/specweave/.claude-plugin/plugin.json (LOCAL)
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit",
        "hooks": [
          {
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/post-edit-write-consolidated.sh" // NEW
          },
          {
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/post-metadata-change.sh"
          }
        ]
      }
    ]
  }
}
```

### Installed Plugins Registry

```json
// ~/.claude/plugins/installed_plugins.json
{
  "specweave@specweave": {
    "version": "0.25.0",
    "installPath": "/Users/antonabyzov/Projects/github/specweave/plugins/specweave",
    "isLocal": true,  // ← Loaded from local filesystem
    "installedAt": "2025-11-24T02:08:06.832Z"
  }
}
```

---

## Why Old Hooks Still Execute

**Claude Code's current session**:
```
Memory: plugin.json loaded at startup (OLD configuration)
  → Edit hooks: post-edit-spec.sh
  → Write hooks: post-write-spec.sh

Filesystem: Both old and new hooks exist
  → Old hooks: post-edit-spec.sh (RESTORED - stops crashes)
  → New hooks: post-edit-write-consolidated.sh (NOT USED YET)
```

**After restart**:
```
Memory: plugin.json re-read (NEW configuration)
  → Edit hooks: post-edit-write-consolidated.sh
  → Write hooks: post-edit-write-consolidated.sh

Filesystem: Both old and new hooks exist
  → Old hooks: post-edit-spec.sh (CAN BE DELETED after restart)
  → New hooks: post-edit-write-consolidated.sh (WILL BE USED)
```

---

## The CORRECT Fix Strategy

### Phase 1: Stop Crashes (DONE ✅)
```bash
# Restore old hooks so Claude Code stops crashing
cp backup/pre-edit-spec.sh plugins/specweave/hooks/
cp backup/post-edit-spec.sh plugins/specweave/hooks/
cp backup/pre-write-spec.sh plugins/specweave/hooks/
cp backup/post-write-spec.sh plugins/specweave/hooks/
```

**Status**: ✅ Claude Code should work now (uses old hooks)

### Phase 2: Restart Claude Code (USER ACTION REQUIRED 🚨)
```
1. Save all work
2. Exit Claude Code completely
3. Restart Claude Code
4. Re-open this project
```

**What happens on restart**:
- Claude Code re-reads plugin.json (NEW configuration)
- Registers new consolidated hooks
- Old hooks no longer referenced

### Phase 3: Cleanup (AFTER restart)
```bash
# Delete old hooks (no longer needed)
rm plugins/specweave/hooks/pre-edit-spec.sh
rm plugins/specweave/hooks/post-edit-spec.sh
rm plugins/specweave/hooks/pre-write-spec.sh
rm plugins/specweave/hooks/post-write-spec.sh

# Keep only:
# - pre-edit-write-consolidated.sh (NEW)
# - post-edit-write-consolidated.sh (NEW)
# - post-metadata-change.sh (enhanced)
# - post-task-completion.sh (enhanced)
```

---

## Why This Is The ONLY Solution

### Why marketplace refresh didn't work
```
Marketplace refresh updates files on disk
  ✅ Plugin files updated
  ✅ Hook files updated
  ❌ Claude Code still using old in-memory config
```

### Why you can't update hooks mid-session
```
Claude Code plugin loading:
  1. Startup: Read plugin.json → Store in memory
  2. Runtime: Use memory (NO re-read)
  3. Shutdown: Discard memory

To change plugins: MUST restart
```

### Why we had to restore old hooks
```
Current session configuration: References old hooks
Old hooks deleted: File not found → CRASH
Old hooks restored: File found → WORKS
After restart: New config → Uses new hooks → Can delete old
```

---

## Validation After Restart

### 1. Check Hook Execution
```bash
tail -f .specweave/logs/hooks-debug.log

# Should see NEW hook names:
[...] pre-edit-write: Detected file_path: ...
[...] post-edit-write: Running update-status-line.sh

# NOT old names:
[...] pre-edit-spec: ...  ❌ (if you see this, restart didn't work)
```

### 2. Test Task Completion
```bash
# Complete a task
# Should see 3 hooks fire
# Should NOT crash
```

### 3. Check Process Count
```bash
ps aux | grep -E "(node|bash)" | grep specweave | wc -l
# Expected: < 10 (was 100+ before)
```

### 4. Then Cleanup
```bash
# ONLY after restart and validation:
rm plugins/specweave/hooks/pre-edit-spec.sh
rm plugins/specweave/hooks/post-edit-spec.sh
rm plugins/specweave/hooks/pre-write-spec.sh
rm plugins/specweave/hooks/post-write-spec.sh
```

---

## What I Learned

### Mistake #1: Assumed Plugin Hot-Reload
```
❌ Thought: Delete old hooks → marketplace refresh → it works
✅ Reality: Claude Code caches config in memory → requires restart
```

### Mistake #2: Didn't Test Mid-Session
```
❌ Thought: Fix is complete, user can restart when ready
✅ Reality: Fix broke current session, user can't work
```

### Mistake #3: Incomplete Investigation
```
❌ Thought: Marketplace cache was the issue
✅ Reality: In-memory configuration was the issue
```

### What Should Have Happened
```
Correct approach:
1. Create new hooks (keep old ones)
2. Update plugin.json to reference new hooks
3. Test that both old and new work
4. Tell user to restart
5. AFTER restart, delete old hooks
```

---

## Prevention: Future Hook Changes

### Mandatory Protocol

**When updating hooks**:
```bash
# 1. Create new hooks (don't delete old yet!)
cp old-hook.sh old-hook.sh.backup
vi new-hook.sh

# 2. Update plugin.json
vi plugins/*/.claude-plugin/plugin.json

# 3. Test in NEW session
# Start fresh Claude Code session
# Verify new hooks execute
# Check logs for new hook names

# 4. If successful, delete old hooks
rm old-hook.sh.backup

# 5. Document in CHANGELOG
```

**Never**:
- ❌ Delete hooks during active session
- ❌ Assume marketplace refresh applies immediately
- ❌ Skip testing in fresh session

**Always**:
- ✅ Keep old hooks until restart confirmed
- ✅ Test in fresh Claude Code session
- ✅ Verify logs show new hook names
- ✅ Have rollback plan (backup hooks)

---

## Summary

### Current Status
```
✅ Old hooks restored → Claude Code works now
✅ New hooks exist → Ready for activation
✅ Plugin config updated → Will use new hooks after restart
⏳ USER MUST RESTART → Required to activate new config
```

### After Restart
```
✅ Claude Code uses new consolidated hooks
✅ 50% reduction in hook overhead
✅ All safety features active
✅ Can delete old hooks safely
```

### The Real Root Cause
```
Not: Marketplace cache desync
Not: Missing hooks

ACTUAL: Claude Code doesn't hot-reload plugin configuration
        Plugin changes require restart to take effect
        Deleting hooks mid-session breaks current session
```

---

**Next Step**: RESTART CLAUDE CODE
**ETA**: 30 seconds (exit + restart)
**Risk**: NONE (old hooks work, new hooks ready)
**Validation**: Check logs for "post-edit-write" not "post-edit-spec"
