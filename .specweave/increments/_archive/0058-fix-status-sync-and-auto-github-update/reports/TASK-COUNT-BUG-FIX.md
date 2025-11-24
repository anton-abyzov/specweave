# Task Count Bug Fix - Implementation Tasks 0/0 Issue

**Date**: 2025-11-24
**Issue**: GitHub issue #743 showing "Implementation Tasks: 0/0 (100%)" despite 4 completed tasks
**Root Cause**: Regex pattern mismatch in CompletionCalculator.extractTasks()

## Problem Analysis

### Symptom
GitHub issue completion comment showed:
```
✅ User Story Verified Complete

Completion Status:
- ✅ Acceptance Criteria: 6/6 (100%)
- ✅ Implementation Tasks: 0/0 (100%)  ← WRONG! Should be 4/4
```

### Root Cause
The `CompletionCalculator.extractTasks()` method at line 270 was using:
```typescript
const acMatch = taskBody.match(/\*\*AC\*\*:\s*([^\n]+)/);
```

This pattern **only matched** the old format:
```markdown
**AC**: AC-US2-01, AC-US2-02
```

But increment 0058's tasks.md used the **new format**:
```markdown
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03
**Satisfies AC**: AC-US3-01
```

Since the pattern didn't match, all tasks were **skipped**, resulting in:
- tasksTotal = 0
- tasksCompleted = 0
- Result: "0/0 (100%)"

## Solution

### Code Change
File: `plugins/specweave-github/lib/completion-calculator.ts` (line 270)

**Before**:
```typescript
const acMatch = taskBody.match(/\*\*AC\*\*:\s*([^\n]+)/);
```

**After**:
```typescript
const acMatch = taskBody.match(/\*\*(?:Satisfies ACs?|AC)\*\*:\s*([^\n]+)/);
```

### Regex Explanation
The new pattern supports **three formats**:
1. `**Satisfies ACs**: ...` (plural, new format)
2. `**Satisfies AC**: ...` (singular, new format)
3. `**AC**: ...` (legacy format, backward compatible)

Pattern breakdown:
- `(?:Satisfies ACs?|AC)` = Non-capturing group
  - `Satisfies ACs?` = "Satisfies AC" OR "Satisfies ACs"
  - `|AC` = OR "AC" (legacy)

## Verification

### Test Coverage
Added two new unit tests in `tests/unit/completion-calculator.test.ts`:

1. **Test: Parse "Satisfies ACs" format** (lines 267-326)
   - Creates tasks with `**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03`
   - Verifies: `tasksTotal = 2, tasksCompleted = 2`

2. **Test: Parse "Satisfies AC" singular format** (lines 328-373)
   - Creates task with `**Satisfies AC**: AC-US3-01`
   - Verifies: `tasksTotal = 1, tasksCompleted = 1`

### Test Results
```bash
$ npm run test:unit -- completion-calculator.test.ts

✓ should parse tasks with "Satisfies ACs" field format
✓ should parse tasks with "Satisfies AC" singular field format

11/11 tests passed ✓
```

### Expected Behavior After Fix
GitHub issue #743 completion comment should now show:
```
✅ User Story Verified Complete

Completion Status:
- ✅ Acceptance Criteria: 6/6 (100%)
- ✅ Implementation Tasks: 4/4 (100%)  ← FIXED!
```

## Impact

### Affected Components
1. **CompletionCalculator.extractTasks()** - Primary fix location
2. **UserStoryIssueBuilder.extractTasksLegacy()** - Already had correct pattern (line 347)
3. **GitHub issue closure comments** - Will now show correct task counts

### Backward Compatibility
✅ **Maintained** - Pattern still matches old `**AC**:` format

### Related Code
The `user-story-issue-builder.ts` already had the correct pattern:
```typescript
// Line 347 in user-story-issue-builder.ts
const acMatch = taskBody.match(/\*\*(?:Satisfies ACs?|AC)\*\*:\s*([^\n]+)/);
```

This suggests the fix was known but not applied to `completion-calculator.ts`.

## Deployment

### Build
```bash
npm run rebuild
```

### Verification Commands
```bash
# Run tests
npm run test:unit -- completion-calculator.test.ts

# Check for similar patterns (should find none)
grep -r "\\*\\*AC\\*\\*:" plugins/specweave-github/lib/
```

## Prevention

### Code Review Checklist
- [ ] When adding new task field formats, update **all** parsers
- [ ] Search codebase for similar patterns before adding new format
- [ ] Add unit tests for all supported formats

### Related Files to Check
When modifying task field patterns, check:
1. `completion-calculator.ts` - GitHub completion status
2. `user-story-issue-builder.ts` - GitHub issue body generation
3. `progress-comment-builder.ts` - Progress update comments
4. Any other files parsing tasks.md format

## References

- **GitHub Issue**: #743
- **Increment**: 0058-fix-status-sync-and-auto-github-update
- **Files Modified**:
  - `plugins/specweave-github/lib/completion-calculator.ts`
  - `tests/unit/completion-calculator.test.ts`
- **Commit**: [Pending]
