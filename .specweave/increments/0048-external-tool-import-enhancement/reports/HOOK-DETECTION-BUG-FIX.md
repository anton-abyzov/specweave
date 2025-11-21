# Hook Increment Detection Bug Fix

**Date**: 2025-11-21
**Severity**: Medium
**Impact**: False warnings, incorrect increment detection

## Problem

All task completion hooks used flawed increment detection logic that could incorrectly identify `_working` directories as active increments.

### Root Cause

**Flawed Pattern** (5 hooks affected):
```bash
CURRENT_INCREMENT=$(ls -t .specweave/increments/ | grep -v "_backlog" | head -1)
```

**Missing Exclusions**:
- ✅ Excluded: `_backlog` (planned increments)
- ❌ Missing: `_archive` (completed increments)
- ❌ Missing: `_working` (temporary/non-standard increments)

### What Happened

1. User had `.specweave/increments/_working/repository-hosting-fix/`
2. When `_working` was modified, `ls -t` sorted it first
3. Hook detected `_working` as "current increment"
4. Constructed path: `.specweave/increments/_working/tasks.md`
5. File didn't exist → **Warning: tasks.md not found**

Even though the REAL increment (`0048-external-tool-import-enhancement`) had a valid `tasks.md` file!

## Solution

**Fixed Pattern** (all 5 hooks):
```bash
CURRENT_INCREMENT=$(ls -t .specweave/increments/ | grep -v "_backlog" | grep -v "_archive" | grep -v "_working" | head -1)
```

### Files Modified

1. `plugins/specweave/hooks/pre-task-completion.sh` (line 95)
2. `plugins/specweave/hooks/post-task-completion.sh` (line 181)
3. `plugins/specweave-github/hooks/post-task-completion.sh` (line 105)
4. `plugins/specweave-ado/hooks/post-task-completion.sh` (line 59)
5. `plugins/specweave-jira/hooks/post-task-completion.sh` (line 59)

## Verification

```bash
# Before fix:
ls -t .specweave/increments/ | grep -v "_backlog" | head -1
# Could return: _working (WRONG!)

# After fix:
ls -t .specweave/increments/ | grep -v "_backlog" | grep -v "_archive" | grep -v "_working" | head -1
# Returns: 0048-external-tool-import-enhancement (CORRECT!)
```

## Prevention

1. **Standard pattern**: All future hooks MUST use the 3-exclusion pattern
2. **Validation**: Pre-commit hook should check for incomplete patterns
3. **Documentation**: Add to CLAUDE.md as critical rule

## Testing

```bash
# Verify correct detection:
bash -c 'cd /Users/antonabyzov/Projects/github/specweave && \
  ls -t .specweave/increments/ | \
  grep -v "_backlog" | \
  grep -v "_archive" | \
  grep -v "_working" | \
  head -1'
# Expected: 0048-external-tool-import-enhancement
```

## Impact

**Before Fix**:
- ❌ Random warnings when `_working` directories existed
- ❌ Could sync wrong increment to external tools
- ❌ Confused users with false "tasks.md not found" errors

**After Fix**:
- ✅ Consistently detects correct active increment
- ✅ No false warnings
- ✅ Reliable external tool sync

## See Also

- ADR-0055: Progress Tracking and Cancellation Discipline
- CLAUDE.md: Hook Registration (CRITICAL!)
- Pre-commit hooks: Should validate increment detection patterns
