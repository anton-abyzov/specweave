# EMERGENCY PROCEDURE: TodoWrite Crash Recovery

**Emergency Type**: Claude Code Process Crash
**Trigger**: Marking tasks complete via TodoWrite
**Status**: ✅ FIXED (v0.25.1 Hotfix Applied)
**Last Updated**: 2025-11-24

---

## 🚨 SYMPTOMS

### Primary Symptoms

1. **Claude Code freezes** when marking a task as complete
2. **"Shenaniganing..." message** appears and hangs
3. **Process becomes unresponsive** - no response to user input
4. **Must force-quit** Claude Code to recover

### Secondary Symptoms

1. **Multiple Node.js processes** running (20+ concurrent)
2. **High CPU usage** (100%+ across all cores)
3. **Hook debug log** shows repeated execution of same operations
4. **Lock files** accumulate in `.specweave/state/`

---

## 🔍 DIAGNOSIS

### Quick Check (30 seconds)

```bash
# 1. Check if hotfix is applied
grep "SKIP_US_SYNC=true" plugins/specweave/hooks/post-task-completion.sh

# Expected: Should find the line (line 463)
# If NOT found: Hotfix not applied! Apply immediately (see Fix section)

# 2. Check for stuck processes
ps aux | grep -E "consolidated-sync|us-completion" | grep -v grep | wc -l

# Expected: 0-1 processes
# If >5: Process storm in progress! Kill immediately (see Recovery section)

# 3. Check circuit breaker status
cat .specweave/state/.hook-circuit-breaker 2>/dev/null || echo "0"

# Expected: "0" (no failures)
# If >=3: Circuit breaker open! Reset required (see Recovery section)
```

### Deep Diagnosis (5 minutes)

```bash
# 1. Check debug log for crash pattern
tail -200 .specweave/logs/hooks-debug.log | grep -E "US sync|syncIncrement|syncToExternalTools"

# Look for:
# - Repeated "🎯 [5/6] Detecting completed user stories" messages
# - No "SKIP_US_SYNC=true" messages (indicates hotfix missing)
# - Multiple concurrent sync operations

# 2. Check US completion state
cat .specweave/state/us-completion-*.json | jq '.[] | select(.completed == true)'

# Look for:
# - Multiple USs with identical completedAt timestamps
# - All USs showing 100% completion

# 3. Check recursion guard
ls -la .specweave/state/.hook-recursion-guard 2>/dev/null

# Expected: File should NOT exist (cleaned up by trap)
# If exists: Hung hook process! Kill and remove (see Recovery section)
```

---

## ✅ FIX (If Hotfix Not Applied)

### Emergency Hotfix (1 Minute)

```bash
# 1. Open the hook file
vim plugins/specweave/hooks/post-task-completion.sh

# 2. Navigate to line 456 (after SKIP_GITHUB_SYNC)

# 3. Add these lines:
#    # EMERGENCY FIX (v0.25.1): Skip US sync in post-task-completion hook
#    export SKIP_US_SYNC=true

# 4. Save and exit

# 5. Rebuild
npm run rebuild

# 6. Test
# Mark a task complete, verify no crash
```

### Automated Fix

```bash
# 1. Download fix script
curl -o fix-todowrite-crash.sh https://raw.githubusercontent.com/anton-abyzov/specweave/develop/scripts/fix-todowrite-crash.sh

# 2. Run fix script
bash fix-todowrite-crash.sh

# 3. Verify
grep "SKIP_US_SYNC=true" plugins/specweave/hooks/post-task-completion.sh
```

---

## 🚑 RECOVERY (If Crash In Progress)

### Step 1: Stop the Bleeding (IMMEDIATE)

```bash
# Kill ALL stuck processes
ps aux | grep -E "node.*consolidated-sync|node.*us-completion" | awk '{print $2}' | xargs kill -9

# Disable hooks temporarily
export SPECWEAVE_DISABLE_HOOKS=1

# Clean up lock files
rm -rf .specweave/state/.hook-*.lock

# Clean up recursion guard
rm -f .specweave/state/.hook-recursion-guard

# Reset circuit breaker
echo "0" > .specweave/state/.hook-circuit-breaker
```

### Step 2: Apply Hotfix (5 Minutes)

```bash
# 1. Navigate to project root
cd /path/to/specweave

# 2. Edit post-task-completion.sh (add SKIP_US_SYNC=true)
# See "FIX" section above

# 3. Rebuild
npm run rebuild

# 4. Re-enable hooks
unset SPECWEAVE_DISABLE_HOOKS
```

### Step 3: Verify Recovery (2 Minutes)

```bash
# 1. Mark a task complete (test)
# Use TodoWrite to mark any task as completed

# 2. Check debug log
tail -50 .specweave/logs/hooks-debug.log | grep "SKIP_US_SYNC"

# Expected output:
# ℹ️  User story sync skipped (SKIP_US_SYNC=true)

# 3. Verify no crash
ps aux | grep -E "consolidated-sync|us-completion" | wc -l

# Expected: 0-1 processes (not 20+)
```

---

## 🔄 WORKAROUND (If Fix Cannot Be Applied)

### Manual Task Completion Workflow

```bash
# 1. Disable hooks
export SPECWEAVE_DISABLE_HOOKS=1

# 2. Edit tasks.md manually
vim .specweave/increments/XXXX-increment-name/tasks.md

# Find task:
# **Status**: [ ] pending
# Change to:
# **Status**: [x] completed

# 3. Edit spec.md manually (mark ACs complete)
vim .specweave/increments/XXXX-increment-name/spec.md

# Find ACs:
# - [ ] **AC-US1-01**: Description
# Change to:
# - [x] **AC-US1-01**: Description

# 4. Re-enable hooks
unset SPECWEAVE_DISABLE_HOOKS

# 5. Run manual sync
/specweave:sync-progress XXXX-increment-name
```

---

## 📊 MONITORING

### Health Checks (Run Periodically)

```bash
# 1. Check hook execution time
tail -100 .specweave/logs/hooks-debug.log | grep "Consolidated background work completed"

# Expected: `<500ms` execution time
# If >1000ms: Performance degradation! Investigate

# 2. Check circuit breaker status
cat .specweave/state/.hook-circuit-breaker

# Expected: "0"
# If >=3: Circuit breaker open! Hooks disabled

# 3. Check for orphaned locks
find .specweave/state -name ".hook-*.lock" -mmin +5

# Expected: No output (no stale locks)
# If output: Remove stale locks: rm -rf .specweave/state/.hook-*.lock
```

### Automated Monitoring Script

```bash
#!/bin/bash
# File: scripts/monitor-hook-health.sh

HOOK_LOG=".specweave/logs/hooks-debug.log"
CIRCUIT_BREAKER=".specweave/state/.hook-circuit-breaker"
LOCK_DIR=".specweave/state"

echo "🔍 Hook Health Check"
echo "===================="

# Check 1: Hotfix applied
if grep -q "SKIP_US_SYNC=true" plugins/specweave/hooks/post-task-completion.sh; then
  echo "✅ Hotfix applied (v0.25.1)"
else
  echo "❌ Hotfix MISSING! Apply immediately!"
  exit 1
fi

# Check 2: No stuck processes
STUCK_PROCESSES=$(ps aux | grep -E "consolidated-sync|us-completion" | grep -v grep | wc -l)
if [ "$STUCK_PROCESSES" -gt 3 ]; then
  echo "⚠️  WARNING: $STUCK_PROCESSES stuck processes detected!"
  echo "   Run: ps aux | grep consolidated-sync"
else
  echo "✅ No stuck processes ($STUCK_PROCESSES active)"
fi

# Check 3: Circuit breaker status
CIRCUIT_STATUS=$(cat "$CIRCUIT_BREAKER" 2>/dev/null || echo "0")
if [ "$CIRCUIT_STATUS" -ge 3 ]; then
  echo "❌ Circuit breaker OPEN ($CIRCUIT_STATUS failures)!"
  echo "   Run: echo 0 > $CIRCUIT_BREAKER"
else
  echo "✅ Circuit breaker OK ($CIRCUIT_STATUS failures)"
fi

# Check 4: Stale locks
STALE_LOCKS=$(find "$LOCK_DIR" -name ".hook-*.lock" -mmin +5 | wc -l)
if [ "$STALE_LOCKS" -gt 0 ]; then
  echo "⚠️  WARNING: $STALE_LOCKS stale lock files detected!"
  echo "   Run: rm -rf $LOCK_DIR/.hook-*.lock"
else
  echo "✅ No stale locks"
fi

echo "===================="
echo "Health Check Complete"
```

---

## 🔬 ROOT CAUSE REFERENCE

### Why This Crash Happened

1. **US completion orchestrator** (`us-completion-orchestrator.js`) triggers on task completion
2. Detects ALL user stories as "newly complete" (perfect storm when last task marked complete)
3. Calls `livingDocsSync.syncIncrement()` for each US
4. Living docs sync calls `syncToExternalTools()` WITHOUT checking `SKIP_GITHUB_SYNC`
5. External tool sync creates/updates GitHub issues (Edit/Write operations)
6. Edit/Write hooks trigger NEW hook chains (recursion guard doesn't protect Edit/Write)
7. Infinite recursion → Process exhaustion → Crash

### Why Hotfix Works

- Sets `SKIP_US_SYNC=true` before calling consolidated-sync
- US completion orchestrator checks this flag (line 42)
- If true, exits early WITHOUT calling `livingDocsSync.syncIncrement()`
- No external tool sync → No Edit/Write operations → No new hook chains
- No recursion → No crash

### Long-Term Fix (v0.26.0)

- Add `SKIP_EXTERNAL_SYNC` check in `LivingDocsSync.syncIncrement()`
- Universal recursion guard (ALL hooks check same guard file)
- Smart throttling (60-second window for US sync)
- Restore automatic US sync (now safe with guard rails)

---

## 📞 ESCALATION MATRIX

### Level 1: Self-Service (User)

**Action**: Apply emergency hotfix
**Timeline**: < 5 minutes
**Documentation**: This file (TODOWRITE-CRASH-RECOVERY.md)

### Level 2: Team Lead

**Trigger**: Hotfix doesn't resolve crash
**Action**: Deep diagnosis, custom recovery script
**Timeline**: < 30 minutes
**Contact**: #engineering Slack channel

### Level 3: System Architect

**Trigger**: Recurring crashes after hotfix
**Action**: Architecture review, emergency code changes
**Timeline**: < 2 hours
**Contact**: Direct message to System Architect

### Level 4: Emergency Release

**Trigger**: Crash affects multiple users/increments
**Action**: Emergency v0.25.1 release with hotfix
**Timeline**: < 4 hours
**Contact**: Release Manager + DevOps team

---

## 📚 RELATED DOCUMENTS

1. **Executive Summary**:
   `.specweave/increments/_archive/0053-safe-feature-deletion/reports/EXECUTIVE-SUMMARY-CRASH-FIX-2025-11-24.md`

2. **Root Cause Analysis**:
   `.specweave/increments/_archive/0053-safe-feature-deletion/reports/ROOT-CAUSE-ANALYSIS-TODOWRITE-CRASH-2025-11-24.md`

3. **ADR-0129** (Architectural Decision):
   `.specweave/docs/internal/architecture/adr/0129-us-sync-guard-rails.md`

4. **CLAUDE.md** (Development Guide):
   Section "9a. Hook Performance & Safety (CRITICAL - v0.25.0)"

---

## ✅ POST-RECOVERY CHECKLIST

After recovering from crash:

- [ ] Verify hotfix applied (`grep SKIP_US_SYNC plugins/specweave/hooks/post-task-completion.sh`)
- [ ] Verify no stuck processes (`ps aux | grep consolidated-sync`)
- [ ] Reset circuit breaker (`echo 0 > .specweave/state/.hook-circuit-breaker`)
- [ ] Clean lock files (`rm -rf .specweave/state/.hook-*.lock`)
- [ ] Test task completion (mark 1 task complete, verify no crash)
- [ ] Run manual sync (`/specweave:sync-progress`)
- [ ] Document incident in project log
- [ ] Notify team if crash affected shared increment

---

**REMEMBER**: After v0.25.1 hotfix, you MUST run `/specweave:sync-progress` manually after completing tasks to sync to GitHub/JIRA/ADO. Automatic sync will be restored in v0.26.0.
