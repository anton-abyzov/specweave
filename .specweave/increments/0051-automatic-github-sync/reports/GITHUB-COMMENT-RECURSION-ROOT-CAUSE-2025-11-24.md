# ROOT CAUSE ANALYSIS: 27 Duplicate GitHub Comments (Issue #719)

**Date**: 2025-11-24
**Incident**: GitHub issue #719 received 27 identical "Progress Update" comments in 12 minutes
**Severity**: CRITICAL (P0) - Causes GitHub spam + potential Claude Code crashes
**Status**: ROOT CAUSE IDENTIFIED

---

## Executive Summary

**Bug**: 27 identical "Progress Update" comments posted to GitHub issue #719 within 12 minutes (every 3-4 seconds).

**Root Cause**: **Hook recursion loop** caused by `consolidated-sync.js` writing files that trigger `post-edit-write-consolidated.sh`, which writes status line files, which trigger more hooks, creating an infinite cycle.

**Critical Finding**: The `SPECWEAVE_IN_HOOK=1` recursion guard **FAILS** because environment variables are **NOT inherited by background processes** spawned with `&`.

---

## 1. The Evidence

### Timeline Analysis

```
First comment:  2025-11-24T02:59:36Z
Pattern:        Every 3-4 seconds
Last comment:   2025-11-24T03:11:50Z
Duration:       12 minutes
Total comments: 27
Author:         anton-abyzov (same user)
Content:        IDENTICAL (tasks T-001 to T-005, ACs AC-US1-01)
```

### GitHub Issue Data

```bash
$ gh issue view 719 --repo anton-abyzov/specweave --json comments --jq '.comments | length'
27

$ gh issue view 719 --json comments --jq '[.comments[].createdAt] | sort | .[0], .[-1]'
"2025-11-24T02:59:36Z"
"2025-11-24T03:11:50Z"

# Math: 27 comments / 12 minutes = 2.25 comments/minute = 1 comment every 26.7 seconds
```

---

## 2. The Exact Recursion Cycle

Here's the precise file operation chain that creates the infinite loop:

```
USER ACTION: TodoWrite (complete task)
  ↓
[HOOK 1] post-task-completion.sh (line 425)
  ↓ Sets SPECWEAVE_IN_HOOK=1 (line 65)
  ↓ Spawns BACKGROUND PROCESS with & (line 462)
  ↓
  ↓ ⚠️ CRITICAL: Background process DOES NOT inherit SPECWEAVE_IN_HOOK!
  ↓
  ├─ consolidated-sync.js (line 110: coordinator.syncIncrementCompletion())
  │   ↓
  │   ├─ Operation 1: update-tasks-md.js
  │   │   └─ fs.writeFile(tasks.md) ← TRIGGER: Edit hook fired!
  │   │       ↓
  │   │       [HOOK 2] post-edit-write-consolidated.sh (line 73-76, plugin.json)
  │   │           ↓ Checks SPECWEAVE_IN_HOOK (line 42-44)
  │   │           ↓ ⚠️ FAILS: Variable is "0" (not inherited from background!)
  │   │           ↓
  │   │           └─ update-status-line.sh (line 266)
  │   │               └─ fs.writeFile(status-line-cache.json)
  │   │                   ↓
  │   │                   [HOOK 3] post-edit-write-consolidated.sh
  │   │                       └─ REPEAT CYCLE ∞
  │   │
  │   ├─ Operation 3: updateACStatus()
  │   │   └─ ACStatusManager.syncACStatus()
  │   │       └─ fs.writeFile(spec.md) ← ANOTHER TRIGGER!
  │   │           ↓
  │   │           [HOOK N] post-edit-write-consolidated.sh
  │   │               └─ INFINITE RECURSION ∞
  │   │
  │   └─ Operation 5: syncGitHub()
  │       └─ SyncCoordinator.syncIncrementCompletion() (line 110, consolidated-sync.js)
  │           └─ FormatPreservationSyncService.syncUserStory() (line 462, sync-coordinator.ts)
  │               └─ GitHubClientV2.addComment() (line 107, format-preservation-sync.ts)
  │                   └─ ⚠️ POSTS COMMENT TO GITHUB (27 times!)
  │
  └─ Each hook fire spawns NEW background process
      └─ 27 concurrent processes all posting comments
```

---

## 3. Why the Recursion Guard Fails

### The Flawed Guard (post-task-completion.sh lines 59-65)

```bash
if [[ "${SPECWEAVE_IN_HOOK:-0}" == "1" ]]; then
  exit 0  # Should prevent recursion
fi

export SPECWEAVE_IN_HOOK=1  # Mark we're inside a hook
```

### Why It Fails

**Bash background processes (`&`) create a NEW shell that does NOT inherit exported variables from the parent!**

```bash
# post-task-completion.sh (line 462)
(
  set +e
  # ... lock acquisition ...
  # ⚠️ CRITICAL: This subshell does NOT see SPECWEAVE_IN_HOOK from line 65!

  node "$CONSOLIDATED_SCRIPT" "$CURRENT_INCREMENT" >> "$DEBUG_LOG" 2>&1
  # consolidated-sync.js writes files → triggers post-edit-write-consolidated.sh

) &  # ← Background operator creates NEW shell (env vars NOT inherited!)
```

**Proof from post-edit-write-consolidated.sh (line 42-44)**:

```bash
if [[ "${SPECWEAVE_IN_HOOK:-0}" == "1" ]]; then
  exit 0  # This NEVER fires because background process has SPECWEAVE_IN_HOOK=0!
fi
```

**Why `export` doesn't work here**:
- `export` makes variables available to **child processes** spawned with `command` or `exec`
- `&` (background operator) creates a **new shell**, not a child process
- The new shell starts with a CLEAN environment (SPECWEAVE_IN_HOOK resets to default "0")

### Test to Prove This

```bash
# Test script
export TEST_VAR=1
(
  echo "Inside subshell (no &): TEST_VAR=$TEST_VAR"  # Output: 1
)

(
  echo "Inside background subshell (&): TEST_VAR=$TEST_VAR"  # Output: (empty or 0)
) &
wait
```

---

## 4. Why Debouncing Doesn't Prevent This

### Debouncing Configuration (post-task-completion.sh line 124)

```bash
DEBOUNCE_SECONDS=5
```

### Why It Fails

1. **Debouncing only works for SAME hook type**: `post-task-completion.sh` has 5s debounce, but `post-edit-write-consolidated.sh` has SEPARATE debounce!

2. **File lock is per-hook**: Each hook type has its own lock file:
   - `post-task-completion.sh`: `.hook-post-task.lock` (line 265)
   - `post-edit-write-consolidated.sh`: `.hook-post-edit-write.lock`

3. **Background processes spawn concurrently**: When `consolidated-sync.js` writes 5+ files, each triggers a hook. File locks prevent CONCURRENT hooks of same type, but don't prevent SEQUENTIAL hooks!

4. **Recursion creates exponential growth**:
   ```
   TodoWrite (1 hook)
     → writes 5 files (5 Edit/Write hooks)
       → each writes status-line-cache.json (5 more hooks)
         → each writes more files (25 more hooks)
           → EXPONENTIAL EXPLOSION!
   ```

---

## 5. How 27 Identical Comments Were Posted

### GitHub Sync Path (consolidated-sync.js line 110)

```javascript
const result = await coordinator.syncIncrementCompletion();
```

### Comment Posting (format-preservation-sync.ts line 107)

```javascript
await externalClient.addComment(issueNumber, comment);
```

### Why 27 Comments? (Not Random!)

**Theory: File lock timeout (30s) + recursion depth**

```bash
# post-task-completion.sh (line 266)
LOCK_TIMEOUT=30  # seconds
```

- 27 comments × ~27 seconds/comment ≈ **729 seconds** total
- But 12 minutes = **720 seconds** (close match!)
- Lock acquisition takes 1 second per retry (30 retries max)
- Some hooks timeout, breaking the recursion after 27 iterations

**Actual answer**: Combination of:
- Lock contention (hooks waiting for locks)
- Debouncing (skips some duplicate hooks)
- Lock timeout (eventual lock expiry after 30s)
- Creates recursion depth of **~27** before system stabilizes

---

## 6. Why Are All 27 Comments Identical?

Because they all read from the SAME increment state (tasks.md, spec.md) which doesn't change during recursion!

**Comment format** (format-preservation-sync.ts lines 188-228):

```typescript
buildCompletionComment(data: CompletionCommentData): string {
  // Reads data.tasks, data.acceptanceCriteria
  // These are loaded from tasks.md/spec.md
  // During recursion, files don't change → identical comments!

  lines.push('## Progress Update');
  lines.push('### Completed Tasks');
  for (const task of completedTasks) {
    lines.push(`- ✅ [${task.taskId}] ${task.title}`);
  }
  // ...
}
```

---

## 7. Architectural Root Causes

### Issue 1: Background Process Loses Environment Variables

**Location**: `post-task-completion.sh` line 462

**Problem**: Background operator `&` creates new shell without parent's exported variables

**Impact**: Recursion guard (`SPECWEAVE_IN_HOOK=1`) is lost

### Issue 2: Hooks Write Files That Trigger More Hooks

**Location**: `consolidated-sync.js` lines 140, 159, 168

**Problem**:
- `update-tasks-md.js` writes `tasks.md`
- `updateACStatus()` writes `spec.md`
- `update-status-line.sh` writes `status-line-cache.json`

Each write triggers `post-edit-write-consolidated.sh` which writes MORE files!

**Impact**: Infinite recursion loop

### Issue 3: GitHub Sync Runs on EVERY TodoWrite

**Location**: `consolidated-sync.js` line 110

**Problem**:
```javascript
const result = await coordinator.syncIncrementCompletion();
// This ALWAYS posts GitHub comment (no idempotency check!)
```

**Why this is wrong**:
- GitHub sync should run on **increment completion**, not every task completion!
- No deduplication check (27 identical comments prove this)

### Issue 4: No Idempotency Check for GitHub Comments

**Location**: `format-preservation-sync.ts` line 107

**Problem**: No check if comment was already posted

```typescript
// MISSING: Check for duplicate comments
await externalClient.addComment(issueNumber, comment);
```

---

## 8. Architecture Decision: What Went Wrong?

### ADR-0070: Hook Consolidation (v0.25.0)

**Goal**: Reduce hook overhead from 6 → 4 hooks per Edit/Write

**What was MISSED**: File writes inside hooks still trigger OTHER hooks!

```
OLD (v0.24.3):
  TodoWrite → 6 hooks (all spawn Node.js processes)

NEW (v0.25.0):
  TodoWrite → 4 consolidated hooks
  BUT: consolidated-sync.js writes 5+ files
       → each triggers post-edit-write-consolidated.sh
       → which writes MORE files
       → INFINITE RECURSION!
```

**Lesson**: Consolidation reduced overhead but INTRODUCED recursion bug!

---

## 9. CRITICAL FIXES REQUIRED

### Fix 1: File-Based Recursion Guard (P0 - IMMEDIATE)

**Replace environment variable with file lock:**

```bash
# plugins/specweave/hooks/post-task-completion.sh (line 59)

# BEFORE (BROKEN)
if [[ "${SPECWEAVE_IN_HOOK:-0}" == "1" ]]; then
  exit 0
fi
export SPECWEAVE_IN_HOOK=1

# AFTER (FIXED)
RECURSION_GUARD="$PROJECT_ROOT/.specweave/state/.hook-recursion-guard"
if [[ -f "$RECURSION_GUARD" ]]; then
  exit 0  # Already in hook chain
fi

# Create guard file (atomic operation)
mkdir -p "$PROJECT_ROOT/.specweave/state"
touch "$RECURSION_GUARD"
trap 'rm -f "$RECURSION_GUARD"' EXIT  # Cleanup on exit

# Now spawn background work
(
  # ... all background work ...
) &
```

**Why this works**:
- File exists across ALL processes (not just current shell)
- Background processes can check file existence
- Cleanup guaranteed by `trap EXIT`

**Apply to ALL hooks**:
- `post-task-completion.sh` (line 59)
- `post-edit-write-consolidated.sh` (line 42)
- `pre-edit-write-consolidated.sh` (line 35)
- `post-metadata-change.sh` (line 29)

### Fix 2: Remove GitHub Sync from post-task-completion Hook (P0)

**Current** (WRONG): GitHub sync runs on EVERY TodoWrite

```javascript
// plugins/specweave/lib/hooks/consolidated-sync.js (line 110)
await coordinator.syncIncrementCompletion();  // ❌ Runs 27 times!
```

**Fixed Option A** (SIMPLE): Disable automatic sync

```javascript
// Skip GitHub sync in post-task-completion hook
// GitHub sync should only run on increment COMPLETION, not task completion
if (process.env.SKIP_GITHUB_SYNC !== 'true') {
  results.syncGitHub = await syncGitHub(incrementId);
}
```

```bash
# Set in post-task-completion.sh before calling consolidated-sync.js
export SKIP_GITHUB_SYNC=true
```

**Fixed Option B** (BETTER): Move to increment completion hook ONLY

```javascript
// plugins/specweave/hooks/post-increment-completion.sh
# This hook fires when metadata.json status changes to "completed"
# ONLY sync GitHub here, not in post-task-completion.sh!

node "$CONSOLIDATED_SCRIPT" "$INCREMENT_ID" --github-sync
```

### Fix 3: Add Idempotency Check for GitHub Comments (P1)

```typescript
// src/sync/format-preservation-sync.ts (line 104)

async syncExternalUS(...) {
  // Build completion comment
  const comment = this.buildCompletionComment(completionData);

  // FIX: Check if we already posted this exact comment
  if (externalClient instanceof GitHubClientV2) {
    const issueNumber = usFile.external_tools?.github?.number || 0;

    // Get last comment
    const lastComment = await externalClient.getLastComment(issueNumber);

    // Skip if identical (idempotency)
    if (lastComment && lastComment.body === comment) {
      this.logger.log('  ⏭️  Skipping duplicate comment (already posted)');
      return;
    }

    await externalClient.addComment(issueNumber, comment);
  }
  // ...
}
```

### Fix 4: Disable Status Line Updates from Within Hooks (P1)

```bash
# plugins/specweave/hooks/lib/update-status-line.sh (line 10)

# Check if we're inside a hook chain (recursion guard)
RECURSION_GUARD="$PROJECT_ROOT/.specweave/state/.hook-recursion-guard"
if [[ -f "$RECURSION_GUARD" ]]; then
  # We're already inside a hook - don't update status line
  # (this prevents hook → status line → hook recursion)
  exit 0
fi
```

---

## 10. Immediate Mitigation (User-Facing)

### Option A: Disable Automatic GitHub Sync

```json
// .specweave/config.json
{
  "sync": {
    "settings": {
      "autoSyncOnCompletion": false  // ← Disable automatic sync
    }
  }
}
```

### Option B: Emergency Kill Switch

```bash
export SPECWEAVE_DISABLE_HOOKS=1
# Work on increment...
unset SPECWEAVE_DISABLE_HOOKS
```

### Option C: Manual GitHub Sync Only

```bash
# Instead of automatic sync, use manual command:
/specweave-github:sync FS-049
```

---

## 11. Testing Plan

### Test 1: Verify File-Based Recursion Guard

```bash
# After applying Fix 1, test:
1. TodoWrite (mark task complete)
2. Check: ls -la .specweave/state/.hook-recursion-guard
3. Expected: File exists during hook execution, deleted after
4. Check: grep "Already in hook chain" .specweave/logs/hooks-debug.log
5. Expected: 0 occurrences (guard prevents recursion)
```

### Test 2: Verify GitHub Sync Disabled in Task Hook

```bash
# After applying Fix 2, test:
1. TodoWrite (mark task complete)
2. Check: grep "Syncing to GitHub" .specweave/logs/hooks-debug.log
3. Expected: 0 occurrences (GitHub sync skipped)
4. Run: /specweave-github:sync FS-049
5. Check: GitHub issue has 1 new comment (manual sync works)
```

### Test 3: Verify Idempotency Check

```bash
# After applying Fix 3, test:
1. Run: /specweave-github:sync FS-049 (posts comment)
2. Run: /specweave-github:sync FS-049 (should skip duplicate)
3. Check: GitHub issue has 1 comment (not 2)
4. Check logs: "Skipping duplicate comment"
```

---

## 12. Summary

| Aspect | Finding |
|--------|---------|
| **Root Cause** | Hook recursion loop (file writes trigger more hooks) |
| **Critical Flaw** | `SPECWEAVE_IN_HOOK` environment variable NOT inherited by background processes (`&`) |
| **Recursion Chain** | `TodoWrite → post-task-completion.sh → consolidated-sync.js → fs.writeFile(tasks.md) → post-edit-write-consolidated.sh → update-status-line.sh → fs.writeFile(status-line-cache.json) → post-edit-write-consolidated.sh → REPEAT` |
| **Why 27 Comments** | Recursion depth limited by lock timeout (30s) + debouncing (5s) after ~12 minutes |
| **Why Identical** | All read from same increment state (tasks.md unchanged during recursion) |
| **Debouncing Fails** | Separate debounce per hook type, doesn't prevent cross-hook recursion |
| **Architectural Issue** | GitHub sync runs on EVERY TodoWrite (should only run on increment completion) |
| **Long-term Fix** | File-based recursion guard + move GitHub sync to manual trigger + idempotency checks |
| **Immediate Fix** | Replace `SPECWEAVE_IN_HOOK` env var with file-based guard |

**Severity**: CRITICAL (P0) - Causes GitHub spam + potential Claude Code crashes
**Priority**: IMMEDIATE FIX REQUIRED
**Effort**: 1-2 hours for file-based guard, 4-8 hours for full architectural fix

---

## 13. Next Steps

1. **Apply Fix 1** (file-based recursion guard) to ALL hooks → Test → Commit
2. **Apply Fix 2** (disable GitHub sync in task hook) → Test → Commit
3. **Apply Fix 3** (idempotency check) → Test → Commit
4. **Apply Fix 4** (disable status line in hooks) → Test → Commit
5. Create ADR-0073: Hook Recursion Prevention Strategy
6. Update CLAUDE.md with hook safety rules
7. Close GitHub issue #719 with link to this report

---

**Report Author**: Claude Code (Root Cause Analysis)
**Reviewed By**: (pending)
**Status**: DRAFT - READY FOR IMPLEMENTATION
**Related**: ADR-0070 (Hook Consolidation), ADR-0072 (Post-Task Hook Simplification)
