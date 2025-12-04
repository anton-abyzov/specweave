# ADR-0129: US Sync Guard Rails and Safe Automatic Synchronization

**Status**: Approved
**Date**: 2025-11-24
**Deciders**: System Architect, Tech Lead, SRE
**Related**: ADR-0070 (Hook Consolidation), ADR-0073 (Hook Recursion Prevention)

---

## Context

**CRITICAL BUG DISCOVERED**: Marking a task as complete via TodoWrite causes Claude Code to crash due to unguarded external tool sync cascade triggered by the US completion orchestrator.

### Current Architecture (BROKEN)

When a task is marked complete, the post-task-completion hook triggers a cascade:

```
TodoWrite → post-task-completion.sh
  → consolidated-sync.js
    → us-completion-orchestrator.js
      → livingDocsSync.syncIncrement()
        → syncToExternalTools()
          → syncToGitHub() / syncToJira() / syncToADO()
            → Edit/Write operations for metadata updates
              → NEW HOOK CHAIN (post-edit-write-consolidated.sh)
                → INFINITE RECURSION → CRASH
```

### Root Cause

1. **US completion orchestrator** calls `livingDocsSync.syncIncrement()` without checking `SKIP_US_SYNC`
2. **LivingDocsSync** always calls `syncToExternalTools()` unless `dryRun === true`
3. **External tool sync** creates/updates issues via Edit/Write operations
4. **Edit/Write hooks** trigger new hook chains
5. **Recursion guard** doesn't prevent Edit/Write hooks (different event type)
6. **Process exhaustion** → Claude Code crash

### Evidence

**Increment 0053** (Safe Feature Deletion):
- **Status**: completed (37/37 tasks, 70/70 ACs)
- **US Completion**: All 6 user stories completed simultaneously at `2025-11-24T07:29:32.433Z`
- **GitHub Integration**: Enabled (6 issues created)
- **Crash**: ✅ CONFIRMED by user screenshot

---

## Decision

Implement **multi-tier guard rails** for US synchronization to prevent crashes while maintaining automatic sync capability.

### Emergency Hotfix (v0.25.1) - IMMEDIATE

**Change**: Add `SKIP_US_SYNC=true` to `post-task-completion.sh`

```bash
# plugins/specweave/hooks/post-task-completion.sh (line 463)
export SKIP_US_SYNC=true
```

**Impact**:
- ✅ Prevents crash immediately
- ⚠️  Disables automatic US sync on task completion
- ℹ️  Users must manually run `/specweave:sync-progress` after work

**Testing**:
```bash
# Mark task complete
TodoWrite([{ content: "T-037", status: "completed" }])

# Verify no crash
tail -50 .specweave/logs/hooks-debug.log | grep "SKIP_US_SYNC=true"
```

### Long-Term Fix (v0.26.0) - COMPREHENSIVE

Implement **3-tier guard rail system**:

#### Tier 1: Environment Variable Guards

**us-completion-orchestrator.js** (ALREADY EXISTS, just not set):

```javascript
// File: plugins/specweave/lib/hooks/us-completion-orchestrator.js (line 42)
if (process.env.SKIP_US_SYNC === 'true') {
  console.log('ℹ️  User story sync skipped (SKIP_US_SYNC=true)');
  return { success: true, message: 'Sync skipped', skipped: true };
}
```

**LivingDocsSync.syncIncrement()** (NEW):

```typescript
// File: src/core/living-docs/living-docs-sync.ts (line 212)
// Step 7: Sync to external tools (GitHub, JIRA, ADO)
if (!options.dryRun && process.env.SKIP_EXTERNAL_SYNC !== 'true') {
  await this.syncToExternalTools(incrementId, featureId, projectPath);
}
```

**post-task-completion.sh** (v0.26.0 - REMOVE hotfix):

```bash
# REMOVE: export SKIP_US_SYNC=true
# RESTORE: Automatic US sync (now safe with guard rails)

# Set guard for external tool sync (prevents Edit/Write cascade)
export SKIP_EXTERNAL_SYNC=true
```

**Why This Works**:
- US sync runs → Detects newly completed USs
- Living docs sync runs → Updates living docs files
- External tool sync SKIPPED → No Edit/Write operations
- No new hook chains → No recursion → No crash

#### Tier 2: Universal Recursion Guard

**ALL hooks** must check the recursion guard file:

```bash
# File: ALL hooks (pre-edit-write, post-edit-write, post-metadata-change, etc.)
RECURSION_GUARD_FILE="$PROJECT_ROOT/.specweave/state/.hook-recursion-guard"

if [[ -f "$RECURSION_GUARD_FILE" ]]; then
  exit 0  # Silent exit if already in hook chain
fi
```

**Why This Works**:
- Guard file created by post-task-completion.sh
- ALL hooks check the SAME file
- ANY hook triggered during hook chain exits early
- No infinite loops possible

#### Tier 3: Smart Throttling

**us-completion-orchestrator.js** (NEW):

```javascript
// File: plugins/specweave/lib/hooks/us-completion-orchestrator.js
export async function syncCompletedUserStories(incrementId) {
  // ... existing code ...

  // 2. Detect newly completed user stories
  const newlyCompleted = await detector.getNewlyCompletedUSs(incrementId);

  if (newlyCompleted.length === 0) {
    return { success: true, newlyCompleted: [], message: 'No new completions' };
  }

  // NEW: Throttle rapid sync attempts (60-second window)
  const lastSyncPath = path.join(projectRoot, '.specweave/state', `us-sync-${incrementId}.json`);
  if (await fs.pathExists(lastSyncPath)) {
    const lastSync = await fs.readJson(lastSyncPath);
    const timeSinceLastSync = Date.now() - lastSync.timestamp;

    if (timeSinceLastSync < 60000) {  // 60 seconds
      console.log(`ℹ️  US sync throttled (last sync: ${timeSinceLastSync}ms ago)`);
      return { success: true, message: 'Sync throttled', throttled: true };
    }
  }

  // Save sync timestamp BEFORE syncing (prevents concurrent syncs)
  await fs.writeJson(lastSyncPath, { timestamp: Date.now() });

  // 4. Trigger living docs sync (which will sync to external tools)
  const syncResult = await livingDocsSync.syncIncrement(incrementId);

  // ... rest of existing code ...
}
```

**Why This Works**:
- Multiple rapid task completions trigger only ONE sync
- 60-second window prevents spam
- Timestamp saved BEFORE sync (prevents race conditions)
- User can override with manual `/specweave:sync-progress`

---

## Consequences

### Positive

1. **Crash Prevention**: ✅ Immediate crash fix with emergency hotfix
2. **Safe Automation**: ✅ Long-term fix allows automatic US sync with guard rails
3. **Improved Reliability**: ✅ Universal recursion guard prevents ALL infinite loops
4. **Better UX**: ✅ Throttling prevents spam and duplicate operations
5. **Maintainability**: ✅ Clear separation of concerns (env vars → guards → throttling)

### Negative

1. **Temporary Manual Sync** (v0.25.1 hotfix): ⚠️ Users must run `/specweave:sync-progress` manually
2. **Delayed External Sync** (v0.26.0): ℹ️ External tools updated only after living docs sync completes
3. **60-Second Window** (v0.26.0): ℹ️ Rapid task completions may skip some syncs (acceptable trade-off)

### Risks

1. **Regression Risk** (v0.26.0): MEDIUM
   - Complex changes across TypeScript and hooks
   - Requires comprehensive testing
   - Mitigation: Extensive unit + integration tests

2. **Data Staleness** (v0.26.0): LOW
   - External tools may lag behind living docs by up to 60 seconds
   - Mitigation: Manual sync command available

3. **Throttling Too Aggressive** (v0.26.0): LOW
   - 60-second window may skip legitimate syncs
   - Mitigation: Configurable via environment variable

---

## Implementation Plan

### Phase 1: Emergency Hotfix (v0.25.1) - COMPLETED ✅

**Timeline**: < 1 hour
**Status**: ✅ DONE

**Changes**:
- ✅ Added `SKIP_US_SYNC=true` to post-task-completion.sh
- ✅ Rebuilt project
- ✅ Created root cause analysis document

**Next Steps**:
- Commit: `fix: disable US sync in post-task hook to prevent crashes (v0.25.1 hotfix)`
- Push to GitHub
- Test in production: Mark task complete → Verify no crash

### Phase 2: Comprehensive Fix (v0.26.0) - NEXT SPRINT

**Timeline**: 2-3 days
**Status**: ⏳ PLANNED

**Changes**:

1. **LivingDocsSync** (TypeScript):
   - Add `SKIP_EXTERNAL_SYNC` check before `syncToExternalTools()`
   - File: `src/core/living-docs/living-docs-sync.ts`

2. **All Hooks** (Bash):
   - Add universal recursion guard check to ALL hooks
   - Files: `pre-edit-write-consolidated.sh`, `post-edit-write-consolidated.sh`, `post-metadata-change.sh`

3. **US Completion Orchestrator** (JavaScript):
   - Add 60-second throttling logic
   - File: `plugins/specweave/lib/hooks/us-completion-orchestrator.js`

4. **Post-Task Hook** (Bash):
   - REMOVE `SKIP_US_SYNC=true` (restore automatic sync)
   - ADD `SKIP_EXTERNAL_SYNC=true` (prevent Edit/Write cascade)
   - File: `plugins/specweave/hooks/post-task-completion.sh`

**Testing**:

1. **Unit Tests**:
   - `USCompletionDetector.getNewlyCompletedUSs()`
   - `LivingDocsSync.syncIncrement()` with `SKIP_EXTERNAL_SYNC`
   - Throttling logic

2. **Integration Tests**:
   - Mark task complete → US sync runs → External sync skipped → No crash
   - Rapid task completion → Single sync → No crash
   - All USs complete simultaneously → Single sync → No crash

3. **Manual Testing**:
   - Increment with 6 USs, mark last task complete
   - Verify US sync runs but external sync is skipped
   - Verify living docs updated
   - Verify `/specweave:sync-progress` can manually sync external tools

**Rollout**:
1. Merge to develop branch
2. Test in local environment
3. Deploy to staging
4. Monitor for crashes
5. Deploy to production

### Phase 3: Monitoring (v0.26.1) - FOLLOW-UP

**Timeline**: 1 week
**Status**: 📋 TODO

**Changes**:

1. **Metrics Logging**:
   - Add US sync metrics (newly completed count, throttle status, sync duration)
   - File: `plugins/specweave/lib/hooks/us-completion-orchestrator.js`

2. **Circuit Breaker Enhancement**:
   - Track US sync failures separately
   - Auto-disable after 3 consecutive failures
   - File: `plugins/specweave/hooks/post-task-completion.sh`

3. **Health Check Command**:
   - `/specweave:health` command
   - Checks circuit breaker, recursion guards, lock files, hook execution times
   - File: `plugins/specweave/commands/specweave-health.md`

4. **Documentation**:
   - Update CLAUDE.md with new guard rail system
   - Document throttling behavior
   - Add troubleshooting guide

---

## Testing Strategy

### Crash Reproduction Tests

**Test 1: Last Task Completion (Critical)**

```bash
# Setup: Increment with 6 USs, all at 99% completion
# Action: Mark last task as complete
# Expected (v0.25.1): No crash, US sync skipped
# Expected (v0.26.0): No crash, US sync runs, external sync skipped
```

**Test 2: Rapid Task Completion**

```bash
# Setup: Mark 3-4 tasks complete within 5 seconds
# Expected (v0.26.0): Only ONE US sync runs (throttled)
```

**Test 3: Concurrent USs**

```bash
# Setup: Multiple USs transition to 100% simultaneously
# Expected (v0.26.0): Single sync, all USs detected, no crash
```

### Guard Rail Tests

**Test 4: SKIP_EXTERNAL_SYNC Respected**

```typescript
// Setup: SKIP_EXTERNAL_SYNC=true
// Action: Run livingDocsSync.syncIncrement()
// Expected: Living docs updated, external tools NOT synced
```

**Test 5: Universal Recursion Guard**

```bash
# Setup: Recursion guard file exists
# Action: Trigger Edit/Write hooks
# Expected: Hooks exit early, no work performed
```

**Test 6: Throttling Works**

```javascript
// Setup: Sync timestamp < 60 seconds old
// Action: Run syncCompletedUserStories()
// Expected: Sync skipped (throttled)
```

### Regression Tests

**Test 7: Manual Sync Still Works**

```bash
# Action: Run /specweave:sync-progress
# Expected: US sync runs, external tools synced (no throttling)
```

**Test 8: Increment Completion Sync**

```bash
# Action: Run /specweave:done 0053
# Expected: Full sync to external tools (no skip flags)
```

---

## Rollback Plan

### Emergency Rollback (v0.25.1)

**If hotfix causes issues**:
```bash
# 1. Remove SKIP_US_SYNC line
git diff HEAD~1 plugins/specweave/hooks/post-task-completion.sh
git checkout HEAD~1 -- plugins/specweave/hooks/post-task-completion.sh

# 2. Rebuild
npm run rebuild

# 3. Test
# Mark task complete, verify behavior
```

### Rollback (v0.26.0)

**If comprehensive fix causes issues**:
```bash
# 1. Revert commit
git revert <commit-sha>

# 2. Rebuild
npm run rebuild

# 3. Re-apply v0.25.1 hotfix
git cherry-pick <v0.25.1-commit-sha>

# 4. Test
# Mark task complete, verify no crash
```

---

## Alternatives Considered

### Alternative 1: Disable US Sync Permanently

**Approach**: Remove US completion orchestrator entirely

**Pros**:
- ✅ No crash risk
- ✅ Simple implementation

**Cons**:
- ❌ Lose automatic US-level sync
- ❌ Users must manually track US completion
- ❌ External tools never updated automatically

**Decision**: ❌ REJECTED - Loss of functionality too severe

### Alternative 2: Move US Sync to Increment Completion

**Approach**: Only sync USs when increment status → "completed"

**Pros**:
- ✅ No crash risk during task completion
- ✅ External tools always up-to-date at closure

**Cons**:
- ❌ Long delay between US completion and external sync
- ❌ No feedback during increment execution
- ❌ GitHub issues not updated until increment done

**Decision**: ❌ REJECTED - UX too poor (delay too long)

### Alternative 3: Queue-Based Sync

**Approach**: Queue US sync requests, process in background with rate limiting

**Pros**:
- ✅ No crash risk
- ✅ Automatic sync still works
- ✅ Natural throttling via queue

**Cons**:
- ❌ Complex implementation (queue system, worker process)
- ❌ Requires persistent storage (queue state)
- ❌ Hard to debug (async operations)

**Decision**: ❌ REJECTED - Too complex for current needs

### Alternative 4: Multi-Tier Guard Rails (CHOSEN)

**Approach**: Implement 3-tier guard rail system (env vars + recursion guard + throttling)

**Pros**:
- ✅ No crash risk
- ✅ Automatic sync still works
- ✅ Simple implementation (no queue, no persistence)
- ✅ Easy to debug (sync logs)
- ✅ Progressive rollout (hotfix → comprehensive → monitoring)

**Cons**:
- ⚠️  External tools lag behind living docs by up to 60 seconds
- ⚠️  Requires careful testing (multiple guard layers)

**Decision**: ✅ ACCEPTED - Best balance of safety, functionality, and complexity

---

## Success Metrics

### Emergency Hotfix (v0.25.1)

- **Crash Rate**: 0% (no crashes on task completion)
- **Manual Sync Usage**: Track `/specweave:sync-progress` command usage
- **User Feedback**: Collect feedback on manual sync requirement

### Comprehensive Fix (v0.26.0)

- **Crash Rate**: 0% (no crashes on task completion)
- **US Sync Success Rate**: 95%+ (allow 5% for throttling)
- **External Tool Sync Lag**: < 60 seconds average
- **Hook Execution Time**: < 500ms total (including all guard checks)

### Monitoring (v0.26.1)

- **Circuit Breaker Trips**: 0 (no auto-disables)
- **Throttle Rate**: < 10% (most syncs proceed)
- **Health Check Failures**: 0 (all checks pass)

---

## Related Documents

- **Root Cause Analysis**: `.specweave/increments/_archive/0053-safe-feature-deletion/reports/ROOT-CAUSE-ANALYSIS-TODOWRITE-CRASH-2025-11-24.md`
- **ADR-0070**: Hook Consolidation (v0.25.0)
- **ADR-0073**: Hook Recursion Prevention Strategy (v0.26.0)
- **ADR-0072**: Post-Task Hook Simplification (v0.24.4)
- **ADR-0060**: Three-tier optimization architecture (v0.24.3)

---

## Approval

**Approved By**: System Architect, Tech Lead, SRE
**Approval Date**: 2025-11-24
**Status**: Approved for implementation

**Emergency Hotfix (v0.25.1)**: ✅ APPROVED - Deploy immediately
**Comprehensive Fix (v0.26.0)**: ✅ APPROVED - Deploy in next sprint
**Monitoring (v0.26.1)**: ✅ APPROVED - Deploy as follow-up
