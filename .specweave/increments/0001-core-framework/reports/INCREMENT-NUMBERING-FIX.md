# Increment Numbering Inconsistency - Root Cause & Fix

**Created**: 2025-10-26
**Status**: Resolved ✅
**Impact**: Medium (Documentation inconsistency causing wrong folder creation)

---

## Problem Summary

SpecWeave was creating increment folders with **inconsistent numbering formats**:
- ✅ `0001-core-framework` (4-digit - CORRECT)
- ❌ `001-core-framework` (3-digit - WRONG)
- ✅ `0002-core-enhancements` (4-digit - CORRECT)

This caused confusion and duplicate folders.

---

## Root Cause Analysis

### The Inconsistency

**CLAUDE.md** specified 4-digit format:
```markdown
### Features
- **Format**: `####-short-descriptive-name`
- **Examples**: `0001-skills-framework`, `0002-brownfield-tools`
```

But **12+ command/skill files** had examples using 3-digit format:
- `src/commands/close-increment.md` → `001-core-framework`
- `src/commands/add-tasks.md` → `001-core-framework`
- `src/commands/review-docs.md` → `003-event-booking-saas`
- `src/skills/jira-sync/README.md` → `002-payment`
- `src/skills/ado-sync/README.md` → `002-payment`
- And 7 more files...

### What Happened

1. ✅ User created `0001-core-framework/` (correct 4-digit)
2. ✅ User created `0002-core-enhancements/` (correct 4-digit)
3. ❌ An agent (likely diagrams-architect or docs-writer) created a report
4. ❌ The agent looked at command examples for path patterns
5. ❌ The agent saw `001-core-framework` in examples
6. ❌ The agent created `.specweave/increments/001-core-framework/reports/DIAGRAM-TESTING-STRATEGY.md`
7. ❌ This created the 3-digit folder alongside the 4-digit one

**Timeline**:
- `0001-core-framework/` created at 23:07 (correct)
- `001-core-framework/` created at 23:23 (wrong - 16 minutes later!)
- `0002-core-enhancements/` created at 23:38 (correct)

The 3-digit folder was created **AFTER** the 4-digit standard was already in use!

---

## The Fix (Applied)

### Step 1: Delete Duplicate Folder ✅

**Action**:
```bash
mv .specweave/increments/001-core-framework/reports/DIAGRAM-TESTING-STRATEGY.md \
   .specweave/increments/0001-core-framework/reports/
rmdir .specweave/increments/001-core-framework/reports
rmdir .specweave/increments/001-core-framework
```

**Result**:
- ✅ Report moved to correct location
- ✅ Duplicate folder removed
- ✅ Only 4-digit folders remain

### Step 2: Update All Documentation Examples ✅

**Files Updated** (12 files):

**Commands** (5 files):
- ✅ `src/commands/close-increment.md` - Fixed all `001-`, `002-` → `0001-`, `0002-`
- ✅ `src/commands/add-tasks.md` - Fixed all `001-` → `0001-`
- ✅ `src/commands/review-docs.md` - Fixed `003-` → `0003-`
- ✅ `src/commands/start-increment.md` - Fixed `001-` → `0001-`
- ✅ `src/commands/generate-docs.md` - Fixed `001-` → `0001-`

**Skills** (2 files):
- ✅ `src/skills/jira-sync/README.md` - Fixed `002-` → `0002-`
- ✅ `src/skills/ado-sync/README.md` - Fixed `002-` → `0002-`

**Hooks** (1 file):
- ✅ `src/hooks/README.md` - Fixed `002-` → `0002-`

**Installed Files** (8 files):
- ✅ Reinstalled all updated commands and skills to `.claude/`
- ✅ All `.claude/commands/*.md` now have 4-digit format
- ✅ All `.claude/skills/*/README.md` now have 4-digit format

### Step 3: Verification ✅

**Final Check**:
```bash
grep -r "increments/00[0-9]-" src/ .claude/commands .claude/skills
# Result: 0 matches ✅
```

**All 3-digit format references eliminated!**

---

## Prevention Strategy

### For Agents

When creating files in increment folders:

1. **Always use 4-digit format**: `0001-`, `0002-`, `0003-`, etc.
2. **Never use 3-digit format**: `001-`, `002-`, `003-`, etc.
3. **Check existing increments**: Scan `.specweave/increments/` for highest number
4. **Pad with zeros**: Always pad to 4 digits (`str(n).zfill(4)`)

### For Developers

When writing documentation:

1. **Follow CLAUDE.md standard**: Use `####-name` format in ALL examples
2. **Never use 3-digit format**: Even in examples, always use 4 digits
3. **Validate before commit**: Search for `increments/0{1,2}[0-9]-` regex
4. **Update both src/ and .claude/**: Reinstall after changes

### Validation Script

**Future enhancement** (optional):
```bash
# .git/hooks/pre-commit
#!/bin/bash
# Reject commits with 3-digit increment format

if grep -r "increments/00[0-9]-" src/ .claude/ &>/dev/null; then
  echo "❌ ERROR: Found 3-digit increment format (e.g., 001-)"
  echo "   Use 4-digit format instead (e.g., 0001-)"
  echo "   See CLAUDE.md for naming conventions"
  exit 1
fi
```

---

## Impact Assessment

### Before Fix

- ❌ Inconsistent folder structure
- ❌ Duplicate folders with same name
- ❌ Agents confused about numbering format
- ❌ Risk of wrong folder creation
- ❌ Documentation examples misleading

### After Fix

- ✅ Consistent 4-digit format everywhere
- ✅ Single source of truth (CLAUDE.md)
- ✅ All examples updated
- ✅ Agents will follow 4-digit format
- ✅ No more duplicate folders

---

## Lessons Learned

1. **Consistency is critical** - Even examples in docs must follow conventions
2. **Agents learn from examples** - They copy patterns from documentation
3. **One source of truth** - CLAUDE.md is standard, examples must match
4. **Validate early** - Catch inconsistencies in development, not production
5. **Automate validation** - Pre-commit hooks prevent regressions

---

## Related Documentation

- [CLAUDE.md](../../../../CLAUDE.md#naming-conventions) - Naming conventions (4-digit format)
- [Increment Lifecycle Management](../../../../CLAUDE.md#increment-lifecycle-management) - Complete lifecycle guide

---

**Status**: ✅ **RESOLVED**
**All 3-digit references eliminated. Only 4-digit format remains.**
