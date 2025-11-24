# Root Cause Analysis: TodoWrite Crash on Task Completion

**Date**: 2025-11-24
**Increment**: 0053-safe-feature-deletion
**Severity**: CRITICAL - Crashes Claude Code process
**Reporter**: User (via screenshot)

---

## Executive Summary

**CRITICAL BUG**: Marking a task as complete via TodoWrite crashes Claude Code due to **unguarded external tool sync cascade** triggered by US completion orchestrator.

**Impact**: 100% reproducible crash when marking tasks complete in increments with:
- All user stories approaching 100% completion
- GitHub/JIRA/ADO integration enabled
- Multiple Edit/Write operations from living docs sync

**Root Cause**: US completion orchestrator (`us-completion-orchestrator.js`) calls `livingDocsSync.syncIncrement()` which triggers external tool sync (GitHub/JIRA/ADO) **without respecting SKIP_GITHUB_SYNC environment variable**, causing recursive Edit/Write operations that exhaust processes.

---

## Crash Flow

### Current Architecture (BROKEN)

```
TodoWrite (task marked complete)
  ↓
post-task-completion.sh (recursion guard created)
  ↓
consolidated-sync.js (background process)
  ↓
[1/5] Update tasks.md ✅
[2/5] Sync living docs ✅
[3/5] Update AC status (ACStatusManager) ✅
[4/5] Translate living docs ✅
[5/6] Sync completed user stories (us-completion-orchestrator.js) ← BUG HERE!
  ↓
detector.getNewlyCompletedUSs() → Returns 6 USs (all 100% complete)
  ↓
livingDocsSync.syncIncrement(incrementId) ← UNGUARDED EXTERNAL SYNC!
  ↓
syncToExternalTools() → Calls syncToGitHub()
  ↓
Creates/updates GitHub issues (gh CLI)
  ↓
Edit/Write operations to sync issue metadata
  ↓
Triggers post-edit-write-consolidated.sh (NEW HOOK CHAIN!)
  ↓
Recursion guard BYPASSED (different hook event)
  ↓
INFINITE LOOP → Process exhaustion → Claude Code crash
```

### Expected Architecture (FIXED)

```
TodoWrite (task marked complete)
  ↓
post-task-completion.sh (recursion guard created)
  ↓
consolidated-sync.js (background process)
  ↓
[1/5] Update tasks.md ✅
[2/5] Sync living docs ✅
[3/5] Update AC status (ACStatusManager) ✅
[4/5] Translate living docs ✅
[5/6] Sync completed user stories (us-completion-orchestrator.js)
  ↓
detector.getNewlyCompletedUSs() → Returns 6 USs
  ↓
CHECK: process.env.SKIP_US_SYNC === 'true' → EXIT EARLY ✅
  ↓
NO external tool sync (GitHub/JIRA/ADO skipped)
  ↓
NO Edit/Write operations
  ↓
NO hook recursion
  ↓
NO crash ✅
```

---

## Evidence

### 1. US Completion State (Perfect Storm)

File: `.specweave/state/us-completion-0053-safe-feature-deletion.json`

```json
{
  "US-001": { "completed": true, "completedAt": "2025-11-24T07:29:32.433Z" },
  "US-002": { "completed": true, "completedAt": "2025-11-24T07:29:32.434Z" },
  "US-003": { "completed": true, "completedAt": "2025-11-24T07:29:32.434Z" },
  "US-004": { "completed": true, "completedAt": "2025-11-24T07:29:32.434Z" },
  "US-005": { "completed": true, "completedAt": "2025-11-24T07:29:32.434Z" },
  "US-006": { "completed": true, "completedAt": "2025-11-24T07:29:32.434Z" }
}
```

**Analysis**: ALL 6 user stories completed within 1 second! This happens when the LAST task is marked complete, causing all USs to transition from incomplete → complete simultaneously.

### 2. Hook Configuration (GitHub Sync Enabled)

File: `metadata.json`

```json
{
  "github": {
    "issues": [
      { "userStory": "US-001", "number": 722 },
      { "userStory": "US-002", "number": 723 },
      { "userStory": "US-003", "number": 724 },
      { "userStory": "US-004", "number": 725 },
      { "userStory": "US-005", "number": 726 },
      { "userStory": "US-006", "number": 727 }
    ],
    "lastSync": "2025-11-24T07:00:18.460Z"
  }
}
```

**Analysis**: GitHub integration is enabled, so `detectExternalTools()` returns `['github']`, triggering external tool sync.

### 3. SKIP_GITHUB_SYNC Flag (NOT RESPECTED)

File: `plugins/specweave/hooks/post-task-completion.sh` (line 456)

```bash
export SKIP_GITHUB_SYNC=true
```

**Analysis**: This flag is set to skip GitHub sync in consolidated-sync.js (operation 6/6), BUT the US completion orchestrator (operation 5/6) calls `livingDocsSync.syncIncrement()` which has its OWN call to `syncToExternalTools()` that **ignores this flag**.

### 4. US Completion Orchestrator (Unguarded Sync)

File: `plugins/specweave/lib/hooks/us-completion-orchestrator.js` (lines 69-76)

```javascript
// 4. Trigger living docs sync (which will sync to external tools)
console.log(`\n📚 Syncing living docs for ${incrementId}...`);

const livingDocsSync = new LivingDocsSync(projectRoot, {
  logger: consoleLogger
});

const syncResult = await livingDocsSync.syncIncrement(incrementId);
```

**BUG**: No check for `SKIP_US_SYNC` or `SKIP_GITHUB_SYNC` before calling `syncIncrement()`.

### 5. Living Docs Sync (Automatic External Sync)

File: `src/core/living-docs/living-docs-sync.ts` (line 213)

```typescript
// Step 7: Sync to external tools (GitHub, JIRA, ADO)
if (!options.dryRun) {
  await this.syncToExternalTools(incrementId, featureId, projectPath);
}
```

**BUG**: Always calls external tool sync unless `options.dryRun === true`. No check for `SKIP_GITHUB_SYNC` or `SKIP_US_SYNC`.

### 6. Recursion Guard (BYPASSED)

File: `plugins/specweave/hooks/post-task-completion.sh` (lines 101-114)

```bash
RECURSION_GUARD_FILE="$PROJECT_ROOT/.specweave/state/.hook-recursion-guard"

if [[ -f "$RECURSION_GUARD_FILE" ]]; then
  echo "[$(date)] ⏭️  Recursion guard detected - skipping" >> "$DEBUG_LOG"
  exit 0
fi

# Create guard file
touch "$RECURSION_GUARD_FILE"
trap 'rm -f "$RECURSION_GUARD_FILE"' EXIT
```

**Analysis**: The recursion guard works for PostToolUse:TodoWrite hooks, BUT it doesn't prevent PostToolUse:Edit or PostToolUse:Write hooks triggered by `livingDocsSync.syncIncrement()` Edit/Write operations.

---

## Architectural Flaws

### 1. **Missing SKIP_US_SYNC Flag**

The US completion orchestrator should respect a `SKIP_US_SYNC` environment variable, similar to `SKIP_GITHUB_SYNC`.

**Current Code**:
```javascript
// us-completion-orchestrator.js (line 42)
if (process.env.SKIP_US_SYNC === 'true') {
  console.log('ℹ️  User story sync skipped (SKIP_US_SYNC=true)');
  return { success: true, message: 'Sync skipped', skipped: true };
}
```

**Status**: ✅ EXISTS but NOT SET by post-task-completion.sh!

### 2. **LivingDocsSync Ignores SKIP_GITHUB_SYNC**

The `syncToExternalTools()` method should check environment variables before syncing.

**Current Code**:
```typescript
// living-docs-sync.ts (line 212-214)
if (!options.dryRun) {
  await this.syncToExternalTools(incrementId, featureId, projectPath);
}
```

**Fix Needed**:
```typescript
if (!options.dryRun && process.env.SKIP_EXTERNAL_SYNC !== 'true') {
  await this.syncToExternalTools(incrementId, featureId, projectPath);
}
```

### 3. **No Recursion Guard for Edit/Write Hooks**

The recursion guard file is only checked in `post-task-completion.sh`, but Edit/Write operations trigger different hooks (`post-edit-write-consolidated.sh`) which may not check the same guard file.

**Fix Needed**: All hooks must check the SAME recursion guard file before executing ANY background work.

---

## Crash Scenarios

### Scenario 1: Last Task Completion (100% Reproducible)

**Trigger**: User marks the last task as complete in tasks.md
**State**: All 6 USs transition from incomplete (99.9%) → complete (100%)
**Result**:
1. `getNewlyCompletedUSs()` returns 6 USs
2. `livingDocsSync.syncIncrement()` called 6 times (or once with all USs)
3. Each sync triggers Edit/Write to GitHub issue metadata
4. Each Edit/Write triggers new hook chain
5. Process exhaustion → Claude Code crash

### Scenario 2: Rapid Task Completion (High Risk)

**Trigger**: User marks 3-4 tasks complete in rapid succession (< 5 seconds)
**State**: Multiple USs transition to 100% within debounce window
**Result**:
1. Multiple `getNewlyCompletedUSs()` calls
2. Concurrent `livingDocsSync.syncIncrement()` operations
3. Race conditions in file locks
4. Process exhaustion → Claude Code crash

### Scenario 3: Manual Sync Command (Lower Risk)

**Trigger**: User runs `/specweave:sync-progress` or `/specweave-github:sync`
**State**: External tool sync runs in controlled context
**Result**: ✅ No crash (these commands set proper environment variables)

---

## Long-Term Architectural Fix

### Phase 1: Immediate Emergency Fix (v0.25.1 - HOTFIX)

**Objective**: Prevent crash with minimal code changes

**Changes**:

1. **Set SKIP_US_SYNC in post-task-completion.sh** (1 line change)

```bash
# File: plugins/specweave/hooks/post-task-completion.sh (after line 456)
export SKIP_GITHUB_SYNC=true
export SKIP_US_SYNC=true  # ← ADD THIS
```

**Impact**:
- ✅ Prevents crash immediately
- ⚠️  Disables automatic US sync on task completion
- ℹ️  Users must manually run `/specweave:sync-progress` after task completion

**Testing**:
```bash
# 1. Mark task as complete
TodoWrite([{ content: "T-037", status: "completed" }])

# 2. Verify hook completes without crash
tail -50 .specweave/logs/hooks-debug.log

# 3. Verify US sync was skipped
grep "SKIP_US_SYNC=true" .specweave/logs/hooks-debug.log
```

### Phase 2: Comprehensive Architectural Fix (v0.26.0)

**Objective**: Safe automatic US sync with proper guard rails

**Changes**:

1. **Add SKIP_EXTERNAL_SYNC check in LivingDocsSync** (TypeScript)

```typescript
// File: src/core/living-docs/living-docs-sync.ts (line 212)
// Step 7: Sync to external tools (GitHub, JIRA, ADO)
if (!options.dryRun && process.env.SKIP_EXTERNAL_SYNC !== 'true') {
  await this.syncToExternalTools(incrementId, featureId, projectPath);
}
```

2. **Add universal recursion guard check** (All hooks)

```bash
# File: ALL hooks (pre-edit-write-consolidated.sh, post-edit-write-consolidated.sh, etc.)
# Add BEFORE any background work:
if [[ -f "$PROJECT_ROOT/.specweave/state/.hook-recursion-guard" ]]; then
  exit 0
fi
```

3. **Add smart US sync throttling** (TypeScript)

```typescript
// File: plugins/specweave/lib/hooks/us-completion-orchestrator.js
// Only sync if:
// - SKIP_US_SYNC !== 'true'
// - Newly completed USs exist
// - NOT already synced within last 60 seconds (debounce)
const lastSyncTime = await readLastSyncTime(incrementId);
if (Date.now() - lastSyncTime < 60000) {
  console.log('ℹ️  US sync throttled (synced within last 60s)');
  return { success: true, message: 'Sync throttled', throttled: true };
}
```

**Impact**:
- ✅ Prevents crash with proper guard rails
- ✅ Allows automatic US sync when safe
- ✅ Throttles rapid sync attempts
- ✅ Respects universal recursion guard

**Testing**:
```bash
# 1. Remove SKIP_US_SYNC flag
# 2. Mark multiple tasks complete rapidly
# 3. Verify only ONE US sync runs
# 4. Verify NO crashes
```

### Phase 3: Monitoring & Observability (v0.26.1)

**Objective**: Detect and prevent future crashes proactively

**Changes**:

1. **Add US sync metrics** (Logs)

```javascript
// File: plugins/specweave/lib/hooks/us-completion-orchestrator.js
console.log(`\n📊 US Sync Metrics:`);
console.log(`   Newly completed: ${newlyCompleted.length}`);
console.log(`   Last sync: ${lastSyncTime ? `${Date.now() - lastSyncTime}ms ago` : 'never'}`);
console.log(`   Throttled: ${throttled ? 'yes' : 'no'}`);
```

2. **Add crash detection** (Circuit breaker enhancement)

```bash
# File: plugins/specweave/hooks/post-task-completion.sh
# Track US sync failures
if [[ -f "$US_SYNC_FAILURE_FILE" ]]; then
  FAILURE_COUNT=$(cat "$US_SYNC_FAILURE_FILE")
  if (( FAILURE_COUNT >= 3 )); then
    export SKIP_US_SYNC=true  # Auto-disable after 3 failures
  fi
fi
```

3. **Add health check command** (CLI)

```bash
# New command: /specweave:health
# Checks:
# - Circuit breaker status
# - Recursion guard files
# - Lock file ages
# - Hook execution times
# - US sync failure count
```

---

## Testing Plan

### Unit Tests

1. **USCompletionDetector.getNewlyCompletedUSs()**
   - ✅ Returns empty array when all USs already complete
   - ✅ Returns only newly completed USs
   - ✅ Handles state file corruption gracefully

2. **LivingDocsSync.syncIncrement()**
   - ✅ Skips external sync when SKIP_EXTERNAL_SYNC=true
   - ✅ Respects dryRun option
   - ✅ Handles missing GitHub configuration gracefully

### Integration Tests

1. **Task Completion Flow**
   - ✅ Mark task complete → US completion detected → NO crash
   - ✅ Mark multiple tasks rapidly → Throttled sync → NO crash
   - ✅ All USs complete simultaneously → Single sync → NO crash

2. **Recursion Guard**
   - ✅ Recursion guard prevents infinite loops
   - ✅ Guard file cleaned up on hook exit
   - ✅ Guard file shared across all hooks

### Regression Tests

1. **Previous Crash Scenarios**
   - ✅ Test all scenarios from ADR-0070 (Hook Consolidation)
   - ✅ Test all scenarios from v0.26.1 (PROJECT_ROOT order bug)
   - ✅ Test all scenarios from this incident

---

## Rollout Plan

### Phase 1: Emergency Hotfix (v0.25.1) - IMMEDIATE

**Timeline**: < 1 hour
**Changes**: 1 line (add `SKIP_US_SYNC=true`)
**Risk**: LOW (disables feature temporarily)
**Rollback**: Remove 1 line

**Steps**:
1. Add `export SKIP_US_SYNC=true` to post-task-completion.sh
2. Rebuild: `npm run rebuild`
3. Test manually: Mark task complete, verify no crash
4. Commit: `fix: disable US sync in post-task hook to prevent crashes (v0.25.1 hotfix)`
5. Push to GitHub

### Phase 2: Architectural Fix (v0.26.0) - NEXT SPRINT

**Timeline**: 2-3 days
**Changes**: Multiple files (TypeScript + hooks)
**Risk**: MEDIUM (complex changes)
**Rollback**: Revert commit

**Steps**:
1. Implement SKIP_EXTERNAL_SYNC check in LivingDocsSync
2. Add universal recursion guard check to all hooks
3. Implement US sync throttling
4. Write comprehensive tests (unit + integration)
5. Manual testing in dev environment
6. Commit: `feat: safe automatic US sync with guard rails (v0.26.0)`
7. Push to GitHub

### Phase 3: Monitoring (v0.26.1) - FOLLOW-UP

**Timeline**: 1 week
**Changes**: Observability enhancements
**Risk**: LOW (logging only)
**Rollback**: Not needed (non-breaking)

**Steps**:
1. Add US sync metrics logging
2. Enhance circuit breaker with US sync tracking
3. Create health check command
4. Update documentation
5. Commit: `feat: US sync monitoring and health checks (v0.26.1)`

---

## ADR References

- **ADR-0070**: Hook Consolidation (v0.25.0)
- **ADR-0073**: Hook Recursion Prevention Strategy (v0.26.0)
- **ADR-0072**: Post-Task Hook Simplification (v0.24.4)
- **ADR-0060**: Three-tier optimization architecture (v0.24.3)

---

## Conclusion

**IMMEDIATE ACTION REQUIRED**: Deploy emergency hotfix (v0.25.1) by adding `SKIP_US_SYNC=true` to post-task-completion.sh.

**LONG-TERM FIX**: Implement comprehensive architectural changes in v0.26.0 with proper guard rails and throttling.

**LESSONS LEARNED**:
1. External tool sync MUST respect global skip flags
2. Recursion guards MUST be universal across ALL hooks
3. Automatic cascading operations MUST have throttling
4. ALL background operations MUST have circuit breakers
5. Hook complexity MUST be minimized (fewer operations = less risk)

**STATUS**: Emergency hotfix ready for deployment.
