# ULTRATHINK: AC Status Automation is BROKEN

**Date**: 2025-11-16
**Issue**: Long-term automation failure - manual intervention required at multiple points
**Severity**: 🔴 CRITICAL - System cannot work long-term

---

## 🎯 The User's Question

> "so you check ACs manually?? ultrathink on it, it MUST be working long-term with all changes, and the same for tasks.md Tasks status update!"

**User is 100% correct** - The automation is fundamentally broken.

---

## 🔍 Root Cause Analysis

### The INTENDED Automation Flow

```
1. Developer completes work (writes code, passes tests)
   ↓
2. Developer uses TodoWrite to mark task complete
   ↓
3. post-task-completion.sh hook AUTOMATICALLY runs
   ↓
4. Hook calls update-tasks-md.js → Syncs TodoWrite → tasks.md
   ↓
5. Hook calls update-ac-status.js → Syncs tasks.md → spec.md
   ↓
6. Hook calls sync-living-docs.js → Syncs to living docs
   ↓
7. ✅ Everything auto-updated!
```

### The ACTUAL Broken Flow

```
1. Developer completes work (writes code, passes tests)
   ↓
2. Developer uses TodoWrite to mark task complete
   ↓
3. post-task-completion.sh hook runs ✅
   ↓
4. Hook calls update-tasks-md.js
   ↓
5. update-tasks-md.js calls detectCompletedTasks()
   ↓
6. 💥 FUNCTION IS A STUB - RETURNS [] (EMPTY ARRAY!)
   ↓
7. ❌ No tasks marked complete in tasks.md
   ↓
8. ❌ AC status hook sees no changes
   ↓
9. ❌ ACs stay unchecked in spec.md
   ↓
10. 😞 Developer must MANUALLY:
    - Edit tasks.md checkboxes
    - Run update-ac-status.js manually
    - Check if ACs updated
```

---

## 🐛 The Bug: detectCompletedTasks() is a STUB

**File**: `plugins/specweave/lib/hooks/update-tasks-md.ts:152-161`

```typescript
function detectCompletedTasks(lines: string[]): string[] {
  // For now, this is a placeholder - we'll mark tasks as complete
  // if they have implementation sections or "COMPLETE" markers
  const completedTasks: string[] = [];

  // This function will be enhanced in future versions
  // For MVP, we'll rely on manual marking in tasks.md

  return completedTasks;  // 💥 ALWAYS RETURNS EMPTY!
}
```

**Impact**:
- ❌ TodoWrite completions NEVER sync to tasks.md
- ❌ tasks.md checkboxes stay unchecked
- ❌ AC status never updates
- ❌ Developer must manually edit tasks.md (what I did)
- ❌ Developer must manually run hook (what I did)

---

## 📊 Automation Breakdown Points

| Step | Component | Status | Impact |
|------|-----------|--------|--------|
| 1 | TodoWrite completion | ✅ Works | Marks task done in chat |
| 2 | Hook trigger | ✅ Works | post-task-completion.sh runs |
| 3 | update-tasks-md.js call | ✅ Works | Script is called |
| 4 | **detectCompletedTasks()** | ❌ **BROKEN** | Returns [] always |
| 5 | tasks.md update | ❌ Skipped | No tasks to update |
| 6 | AC status sync | ❌ Skipped | No tasks complete |
| 7 | Living docs sync | ⚠️ Runs | But with stale data |

**Failure Point**: Step 4 - The detection logic is not implemented.

---

## 🤔 Why This Wasn't Caught Earlier

1. **Development workflow**: I manually edited tasks.md instead of using TodoWrite
2. **Manual testing**: I manually ran hooks instead of relying on automation
3. **No integration tests**: No tests verify end-to-end TodoWrite → tasks.md → ACs flow
4. **Stub accepted**: TODO comment suggests "future enhancement" but it's core functionality

---

## 💡 Solution Options

### Option A: Implement detectCompletedTasks() (PROPER FIX)

**Approach**: Parse TodoWrite completion events and map to tasks.md task IDs

**Implementation**:
```typescript
function detectCompletedTasks(lines: string[]): string[] {
  const completedTasks: string[] = [];

  // Read TodoWrite state from hook environment
  const todoWriteData = process.env.TODOWRITE_DATA || '[]';
  const todos = JSON.parse(todoWriteData);

  // Map completed todos to task IDs
  for (const todo of todos) {
    if (todo.status === 'completed') {
      // Extract task ID from todo content
      // E.g., "Complete Module 3: Team Detection (T-019 through T-026)"
      const taskIds = extractTaskIds(todo.content);
      completedTasks.push(...taskIds);
    }
  }

  return completedTasks;
}

function extractTaskIds(todoContent: string): string[] {
  const taskIdPattern = /T-\d+/g;
  return todoContent.match(taskIdPattern) || [];
}
```

**Pros**:
- ✅ Fully automated TodoWrite → tasks.md sync
- ✅ No manual intervention needed
- ✅ Works long-term

**Cons**:
- ⚠️ Requires TodoWrite to pass data via env vars
- ⚠️ Requires task IDs in TodoWrite content
- ⚠️ May miss tasks if developer doesn't mention ID

---

### Option B: Heuristic Detection (FALLBACK)

**Approach**: Detect completed tasks by looking for evidence in files

**Implementation**:
```typescript
function detectCompletedTasks(lines: string[]): string[] {
  const completedTasks: string[] = [];

  // Check for tasks with "✅ COMPLETE" marker
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const taskMatch = line.match(/^###\s+(T-\d+):/);

    if (taskMatch && line.includes('✅ COMPLETE')) {
      completedTasks.push(taskMatch[1]);
    }
  }

  // Alternative: Check for tasks with all checkboxes marked
  // (Implementation boxes like "- [x] Implement X")
  for (const task of parseTasks(lines)) {
    if (allCheckboxesMarked(task)) {
      completedTasks.push(task.id);
    }
  }

  return completedTasks;
}
```

**Pros**:
- ✅ Works without TodoWrite integration
- ✅ Detects manual completions
- ✅ Simpler implementation

**Cons**:
- ⚠️ Relies on manual markers (✅ COMPLETE)
- ⚠️ Doesn't auto-detect from TodoWrite
- ⚠️ Still requires some manual intervention

---

### Option C: Hybrid Approach (RECOMMENDED)

**Combine both**: TodoWrite integration + heuristic fallback

**Implementation**:
```typescript
function detectCompletedTasks(lines: string[]): string[] {
  let completedTasks: string[] = [];

  // 1. Try TodoWrite integration first
  try {
    const todoWriteData = process.env.TODOWRITE_DATA || '[]';
    const todos = JSON.parse(todoWriteData);

    for (const todo of todos) {
      if (todo.status === 'completed') {
        const taskIds = extractTaskIds(todo.content);
        completedTasks.push(...taskIds);
      }
    }
  } catch (error) {
    console.warn('⚠️ TodoWrite integration failed, falling back to heuristic');
  }

  // 2. Fallback: Heuristic detection
  if (completedTasks.length === 0) {
    completedTasks = detectByHeuristics(lines);
  }

  return completedTasks;
}
```

**Pros**:
- ✅ Best of both worlds
- ✅ Works with or without TodoWrite integration
- ✅ Graceful degradation

**Cons**:
- ⚠️ More complex
- ⚠️ Need to maintain both paths

---

## 🎯 Implementation Plan

### Phase 1: Quick Fix (30 minutes)

**Implement heuristic detection** to unblock current work:

1. Detect "✅ COMPLETE" marker in task headers
2. Detect all implementation checkboxes marked `[x]`
3. Mark those tasks complete in tasks.md
4. Test end-to-end: TodoWrite → tasks.md → ACs

**Files to modify**:
- `plugins/specweave/lib/hooks/update-tasks-md.ts` (detectCompletedTasks function)

**Test**:
```bash
# 1. Use TodoWrite to mark task complete
# 2. Hook should auto-run
# 3. tasks.md should auto-update
# 4. spec.md ACs should auto-update
# 5. Verify no manual intervention needed
```

---

### Phase 2: Full Integration (2-3 hours)

**Add TodoWrite integration**:

1. Update TodoWrite tool to pass completed task IDs via env
2. Update post-task-completion.sh to set TODOWRITE_DATA
3. Implement extractTaskIds() to parse TodoWrite content
4. Add fallback to heuristic if env data missing

**Files to modify**:
- `plugins/specweave/lib/hooks/update-tasks-md.ts`
- `plugins/specweave/hooks/post-task-completion.sh`
- TodoWrite tool integration (if needed)

---

### Phase 3: Testing & Validation (1-2 hours)

1. **Unit tests**:
   - detectCompletedTasks with various inputs
   - extractTaskIds parsing
   - Heuristic detection edge cases

2. **Integration tests**:
   - TodoWrite → tasks.md sync
   - tasks.md → spec.md AC sync
   - End-to-end automation flow

3. **E2E tests**:
   - Complete real task
   - Verify full automation chain
   - No manual intervention required

---

## 📈 Impact Assessment

### Before Fix:
- ❌ Developer must manually edit tasks.md
- ❌ Developer must manually run hooks
- ❌ Developer must verify ACs updated
- ❌ 3-5 minutes per task completion
- ❌ Error-prone (easy to forget)
- ❌ NOT SUSTAINABLE LONG-TERM

### After Fix:
- ✅ TodoWrite marks task complete
- ✅ Hook auto-runs
- ✅ tasks.md auto-updates
- ✅ ACs auto-update
- ✅ Living docs auto-sync
- ✅ 0 seconds manual work
- ✅ FULLY AUTOMATED

**Time savings**: 3-5 minutes → 0 seconds per task (100% automation)

---

## 🚨 Critical Action Items

1. **IMMEDIATE**: Implement heuristic detection (Phase 1)
2. **THIS WEEK**: Add TodoWrite integration (Phase 2)
3. **BEFORE MERGE**: Add integration tests (Phase 3)
4. **DOCUMENTATION**: Update CLAUDE.md with correct automation flow

---

## 📝 Lessons Learned

1. **Stubs are dangerous**: "TODO: implement later" becomes tech debt
2. **Test automation**: Integration tests would have caught this
3. **Manual workflows hide bugs**: I manually edited files, missing the broken automation
4. **User feedback is critical**: User questioned the workflow and exposed the flaw

---

## ✅ Acceptance Criteria for Fix

- [ ] detectCompletedTasks() returns actual completed tasks (not [])
- [ ] TodoWrite completion auto-updates tasks.md
- [ ] tasks.md updates auto-trigger AC status sync
- [ ] ACs auto-update in spec.md
- [ ] No manual intervention required
- [ ] Integration test verifies end-to-end flow
- [ ] Documentation updated

---

## 🎯 Next Steps

**IMMEDIATE**: Implement Phase 1 (heuristic detection) to unblock increment 0037

**Command to test**:
```bash
# After implementing:
npx tsx plugins/specweave/lib/hooks/update-tasks-md.ts 0037-project-specific-tasks
# Should detect T-019 through T-026 as complete
# Should update tasks.md Status lines
```

---

**Conclusion**: The user is absolutely correct - the automation is broken and requires manual intervention. This MUST be fixed for long-term sustainability. Implementing the hybrid approach will provide both immediate relief (heuristic) and proper long-term solution (TodoWrite integration).
