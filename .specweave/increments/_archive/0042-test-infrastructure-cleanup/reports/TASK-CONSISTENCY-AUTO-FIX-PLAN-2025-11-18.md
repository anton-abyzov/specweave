# Task Consistency Auto-Fix Implementation Plan

**Date**: 2025-11-18
**Increment**: 0042 - Phase C
**Issue**: 9 task consistency tests failing - hook warns but doesn't auto-fix

---

## Problem

The `update-tasks-md` hook currently:
- ✅ **Detects** inconsistencies (warns about them)
- ❌ **Does NOT auto-fix** them

Tests expect:
- ✅ Detect inconsistencies
- ✅ **Auto-fix** headers to match checkbox state

---

## Current Behavior (Detection Only)

**File**: `plugins/specweave/lib/hooks/update-tasks-md.ts`

**Lines 192-195** (Header has COMPLETE but checkboxes incomplete):
```typescript
} else {
  // ⚠️  INCONSISTENT: Header says COMPLETE but checkboxes incomplete
  warnings.push(`${taskId}: Header has ✅ COMPLETE but not all checkboxes checked`);
}
```

**Lines 208-214** (Checkboxes complete but header missing marker):
```typescript
if (!hasCompleteMarker && implementationSection && allCheckboxesComplete) {
  warnings.push(`${taskId}: All checkboxes checked but header missing ✅ COMPLETE`);
  // Still count as complete (checkboxes are source of truth for work done)
  if (!completedTasks.includes(taskId)) {
    completedTasks.push(taskId);
  }
  continue;
}
```

---

## Required Auto-Fix Behavior

### Fix Type 1: Remove Incorrect COMPLETE Marker
**Condition**: Header has `✅ COMPLETE` but not all checkboxes are checked
**Action**: Remove `✅ COMPLETE` from task header
**Example**:
```markdown
### T-001: Test task ✅ COMPLETE  → ### T-001: Test task
**Implementation**:
- [ ] Step 1
- [ ] Step 2
```

### Fix Type 2: Add Missing COMPLETE Marker
**Condition**: All checkboxes checked but header missing `✅ COMPLETE`
**Action**: Add `✅ COMPLETE` to task header (before first line break/newline)
**Example**:
```markdown
### T-001: Test task  → ### T-001: Test task ✅ COMPLETE
**Implementation**:
- [x] Step 1
- [x] Step 2
```

---

## Implementation Plan

### Step 1: Modify `detectCompletedTasks()` Return Type
**Change**:
```typescript
// Before:
function detectCompletedTasks(lines: string[]): string[]

// After:
function detectCompletedTasks(lines: string[]): {
  completedTasks: string[];
  fixes: TaskConsistencyFix[];
}
```

**Add Interface**:
```typescript
interface TaskConsistencyFix {
  taskId: string;
  lineNumber: number;
  action: 'add-complete-marker' | 'remove-complete-marker';
  currentLine: string;
}
```

### Step 2: Collect Fixes During Detection
**Lines 192-195** (remove marker):
```typescript
} else {
  // ⚠️  INCONSISTENT: Remove COMPLETE marker
  fixes.push({
    taskId,
    lineNumber: i,
    action: 'remove-complete-marker',
    currentLine: line
  });
  warnings.push(`${taskId}: Header has ✅ COMPLETE but not all checkboxes checked`);
}
```

**Lines 208-214** (add marker):
```typescript
if (!hasCompleteMarker && implementationSection && allCheckboxesComplete) {
  fixes.push({
    taskId,
    lineNumber: i,
    action: 'add-complete-marker',
    currentLine: line
  });
  warnings.push(`${taskId}: All checkboxes checked but header missing ✅ COMPLETE`);
  // ... rest of logic
}
```

### Step 3: Create `applyConsistencyFixes()` Function
```typescript
function applyConsistencyFixes(content: string, fixes: TaskConsistencyFix[]): string {
  let updated = content;

  for (const fix of fixes) {
    const lines = updated.split('\n');
    const line = lines[fix.lineNumber];

    if (fix.action === 'remove-complete-marker') {
      // Remove ✅ COMPLETE from header
      const fixed = line.replace(/\s*✅\s*COMPLETE\s*/g, '');
      lines[fix.lineNumber] = fixed;
    } else if (fix.action === 'add-complete-marker') {
      // Add ✅ COMPLETE before newline
      const fixed = line.trim() + ' ✅ COMPLETE';
      lines[fix.lineNumber] = fixed;
    }

    updated = lines.join('\n');
  }

  return updated;
}
```

### Step 4: Integrate into `updateTasksMd()` Main Function
**At line 67** (after detecting completed tasks):
```typescript
// 4. Get recently completed tasks and consistency fixes
const { completedTasks, fixes } = detectCompletedTasks(lines);

// 4a. Apply consistency fixes FIRST (before other updates)
if (fixes.length > 0) {
  console.log(`🔧 Auto-fixing ${fixes.length} task consistency issue(s)...`);
  updatedContent = applyConsistencyFixes(originalContent, fixes);

  // Re-read lines after fixes
  const updatedLines = updatedContent.split('\n');

  // Re-detect completed tasks from fixed content
  const redetected = detectCompletedTasks(updatedLines);
  completedTasks = redetected.completedTasks;

  console.log('✅ Task consistency auto-fixed');
}

if (completedTasks.length === 0 && fixes.length === 0) {
  console.log('✅ No new task completions detected');
  return;
}
```

### Step 5: Add "Auto-fixed" to Output
**After line 96** (write back to tasks.md):
```typescript
console.log(`✅ Updated ${tasksPath}`);
if (fixes.length > 0) {
  console.log(`🔧 Auto-fixed ${fixes.length} consistency issue(s)`);
}
console.log(`   Completed: ${completedCount}/${totalTasks}`);
console.log(`   Progress: ${progress}%\n`);
```

---

## Expected Test Results

After implementation, all 9 tests should pass:
1. ✅ removes ✅ COMPLETE marker when checkboxes incomplete
2. ✅ adds ✅ COMPLETE marker when all checkboxes checked
3. ✅ handles multiple tasks with mixed consistency
4. ✅ syncs ACs after fixing task headers
5. ✅ unchecks ACs when task header auto-fixed to incomplete
6. ✅ calculates correct progress after auto-fix
7. ✅ running hook multiple times produces same result (idempotence)
8. ✅ handles task with no implementation section gracefully
9. ✅ preserves task content while fixing header

---

## Implementation Checklist

- [ ] Add `TaskConsistencyFix` interface
- [ ] Modify `detectCompletedTasks()` return type
- [ ] Collect fixes during detection (lines 192-195, 208-214)
- [ ] Create `applyConsistencyFixes()` function
- [ ] Integrate auto-fix into `updateTasksMd()` main function
- [ ] Add "Auto-fixed" output message
- [ ] Test all 9 test cases
- [ ] Commit changes

---

## Files to Modify

1. `plugins/specweave/lib/hooks/update-tasks-md.ts` (main changes)
2. No new files needed (enhancement to existing hook)

---

**Next Steps**: Implement the plan, run tests, commit fix.
