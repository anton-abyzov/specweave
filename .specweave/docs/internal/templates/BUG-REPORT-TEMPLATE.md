# Bug Report Template

**Date**: YYYY-MM-DD
**Severity**: CRITICAL | HIGH | MEDIUM | LOW
**Impact**: [Brief description of impact]
**Status**: 🔴 OPEN | 🟡 IN PROGRESS | ✅ FIXED

---

## Executive Summary

[2-3 sentences describing what went wrong and the impact]

**Actual behavior**: [What happened]
**Expected behavior**: [What should have happened]

---

## Root Cause Analysis

### Bug #1: [Primary Bug Description]

**Location**: `path/to/file.ts:line`

**Buggy Code**:
```typescript
// ❌ BUGGY CODE
// Paste the problematic code here
```

**Problem**:
- [Explain why this code is wrong]
- [List specific false positives or issues]

**Example**:
```typescript
// Show concrete example of the bug in action
```

### Bug #2: [Secondary Bug Description] (if applicable)

**Location**: `path/to/file.ts:line`

**Buggy Code**:
```typescript
// ❌ BUGGY CODE
```

**Problem**:
- [Explanation]

---

## The Fix

### Fix #1: [Description]

**File**: `path/to/file.ts`

```typescript
// ✅ FIXED CODE
// Show the corrected implementation
```

**Key Changes**:
- ❌ **Before**: [Old approach]
- ✅ **After**: [New approach]

**Why This Works**:
[Explain the reasoning behind the fix]

### Fix #2: [Description] (if applicable)

```typescript
// ✅ FIXED CODE
```

---

## Impact Assessment

[Table or list showing what was affected]

| Affected Item | Status | Should Be Affected? | Action Needed |
|---------------|--------|---------------------|---------------|
| Item 1 | Incorrect | No | Restore |
| Item 2 | Correct | Yes | Keep |

---

## Restoration/Rollback Plan

### Step 1: [First Step]

```bash
# Command to undo damage
```

Expected result: [What should happen]

### Step 2: [Second Step]

```bash
# Verification command
```

### Step 3: [Third Step]

```bash
# Re-run with fixed logic
```

---

## Prevention Measures

### Anti-Patterns to Avoid

**Anti-Pattern #1**: [Pattern Name]

```typescript
// ❌ WRONG: [Why this is wrong]
if (problematicPattern) { }

// ✅ CORRECT: [Why this is right]
if (correctPattern) { }
```

**Anti-Pattern #2**: [Pattern Name]

```typescript
// ❌ WRONG
// ...

// ✅ CORRECT
// ...
```

### Code Review Checklist

When reviewing similar code:
- [ ] Check for pattern X
- [ ] Validate pattern Y
- [ ] Test with edge cases
- [ ] Add logging for decisions

### Testing Requirements

Add tests to prevent regression:
1. **Test Case 1**: [Description]
   - **Given**: [Initial state]
   - **When**: [Action]
   - **Then**: [Expected result]

2. **Test Case 2**: [Description]
   - **Given**: [Initial state]
   - **When**: [Action]
   - **Then**: [Expected result]

---

## Lessons Learned

### 1. [Primary Lesson]

**Problem**: [What pattern caused the issue]
**Solution**: [What to do instead]

**Example**:
```typescript
// ❌ BAD
// Show anti-pattern

// ✅ GOOD
// Show correct pattern
```

### 2. [Secondary Lesson]

**Problem**: [What pattern caused the issue]
**Solution**: [What to do instead]

### 3. [Additional Lessons]

- [Key takeaway 1]
- [Key takeaway 2]
- [Key takeaway 3]

---

## Common Anti-Patterns (Reference)

### String Search for Structured Data

```typescript
// ❌ WRONG: Matches ANYWHERE in file
if (content.includes('value')) { }

// ✅ CORRECT: Parse frontmatter
const match = content.match(/^field:\s*["']?([^"'\n]+)["']?$/m);
if (match && match[1].trim() === 'value') { }
```

### Substring Matching for IDs

```typescript
// ❌ WRONG: Substring matching
archivedList.some(item => item.includes(searchId))

// ✅ CORRECT: Exact equality
archivedList.some(item => item === searchId)
```

### Missing Validation

```typescript
// ❌ WRONG: No validation
await processItem(item);

// ✅ CORRECT: Validate first
if (!isValid(item)) {
  console.log(`⏭️  Skipping ${item.id}: ${reason}`);
  return;
}
await processItem(item);
```

---

## Testing the Fix

### Before Fix (Buggy Behavior)

```bash
# Command that demonstrates the bug
```

**Result**: [What went wrong]

### After Fix (Correct Behavior)

```bash
# Step 1: Restoration
# Step 2: Re-run with fixed logic
```

**Expected Result**:
```
# Show expected output
```

---

## Summary

### What Went Wrong

1. [Root cause 1]
2. [Root cause 2]
3. Result: [Impact summary]

### What Was Fixed

1. ✅ [Fix 1]
2. ✅ [Fix 2]
3. ✅ [Fix 3]

### Next Steps

1. ✅ Run restoration script
2. ✅ Verify correct state
3. ✅ Test fixed logic
4. ✅ Add regression tests
5. ✅ Update documentation

---

**Status**: ✅ Fix implemented, tested, and ready for deployment
**Files Modified**: `path/to/file.ts` (X methods fixed)
**Restoration Script**: `path/to/restoration-script.ts`
**Related Documentation**:
- CLAUDE.md Section X
- ADR-XXXX
- Increment XXXX reports
