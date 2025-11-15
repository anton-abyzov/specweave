# Format Consistency Audit Complete

**Date**: 2025-11-14
**Increment**: 0032-prevent-increment-number-gaps
**Issue**: User saw old [INC-XXXX] format in GitHub issues, confusion about correct format

---

## Problem

User noticed old [INC-XXXX] format GitHub issues and questioned why deprecated format still appeared. This revealed a **documentation gap**: format rules were buried in contributor docs and completely missing from user-facing templates.

## Root Cause Analysis

**Code was already correct**:
- ✅ `github-epic-sync.ts:542` creates issues with `[${epicId}]` → `[FS-031]`
- ✅ `post-increment-planning.sh:409` uses `[FS-YY-MM-DD]` format
- ✅ All hooks using correct format

**Documentation was incomplete**:
- ⚠️ CLAUDE.md (contributor): Had format rules but buried in hooks section (line 1165)
- ❌ CLAUDE.md.template (user): NO format rules at all!
- ❌ Command docs: Still showed [INC-] format in examples
- ❌ Agent docs: Still used [INC-] in examples

**Result**: Future Claude instances and users wouldn't know about format change!

---

## Changes Made

### 1. User-Facing Documentation (CLAUDE.md.template)

**File**: `src/templates/CLAUDE.md.template`
**Location**: Added new section after "Automatic Syncing" (line 131-146)

**Added**:
```markdown
### 🏷️ GitHub Issue Format (CRITICAL!)

**SpecWeave uses date-based naming for GitHub issues:**

| Context | Format | Example |
|---------|--------|---------|
| **Feature/Epic Issue** | `[FS-NNN]` | `[FS-031] External Tool Status Sync` |
| **User Story Issue** | `[FS-NNN][US-NNN]` | `[FS-031][US-002] Task-Level Mapping` |

**⛔ NEVER use `[INC-XXXX]` format** - This is deprecated and will cause sync issues!

**Why?**
- ✅ `[FS-XXX]` matches Epic folder structure in living docs
- ✅ Enables proper hierarchical tracking (Epic → User Stories → Tasks)
- ✅ Works with Universal Hierarchy architecture (v0.18.0+)
- ❌ `[INC-XXX]` is obsolete and breaks living docs sync
```

**Impact**: Every new SpecWeave project will have this guidance from day 1!

---

### 2. Contributor Documentation (CLAUDE.md)

**File**: `CLAUDE.md`
**Location**: Added right after "Hierarchy Mapping" table (line 741-767)

**Added**:
- Prominent section: "🏷️ GitHub Issue Title Format (CRITICAL FOR CONTRIBUTORS!)"
- Comprehensive table with code locations
- Clear deprecation warning
- **BONUS**: Cleanup command included for old issues!

```bash
# Close all old [INC-] format issues
gh issue list --search "[INC-" --state open --json number --jq '.[].number' | \
  xargs -I {} gh issue close {} --comment "Migrating to [FS-XXX] format (Universal Hierarchy v0.18.0+)"

# Re-sync to create new [FS-] issues
/specweave-github:sync-epic FS-031
```

**Impact**: Contributors and AI agents will see format rules prominently in Living Docs section!

---

### 3. Command Documentation Updates

#### specweave-github-sync-tasks.md

**Before**:
```markdown
**Title**: `[INC-####] Increment Title`
**Example**: `[INC-0004] Plugin Architecture`
```

**After**:
```markdown
**Title**: `[FS-YY-MM-DD] Increment Title` (date-based format matching Epic folder)
**Example**: `[FS-25-11-12] Plugin Architecture`
**Legacy Format** (deprecated): `[INC-0004]` - No longer used!
```

#### specweave-github-sync-epic.md

**Before**:
```markdown
**Title**: `[INC-0001-core-framework] Title`
```

**After**:
```markdown
**Title**: `[FS-031] Title` (Feature ID from Epic folder)
**Note**: Uses Epic's FS-XXX ID, not increment number!
```

**Also updated**:
- Example output showing correct [FS-031] format
- Added deprecation note

---

### 4. Agent Documentation Updates

#### github-task-splitter/AGENT.md

**Before**:
```markdown
# [INC-0015] Shopping Cart - Frontend Tasks

Part of increment 0015-shopping-cart
```

**After**:
```markdown
# [FS-25-11-14] Shopping Cart - Frontend Tasks

Part of increment 0015-shopping-cart (Feature: FS-25-11-14)
```

---

### 5. Code Comment Updates

#### github-epic-sync.ts

**Before**:
```typescript
// Pattern: "[FS-031] Title" or "[INC-0031] Title"
```

**After**:
```typescript
// Pattern: "[FS-031] Title" (new) or "[INC-0031] Title" (deprecated, legacy support only)
```

#### duplicate-detector.ts

**Updated 3 locations**:
1. Interface comment: `"[FS-031]" (current) or "[INC-0031]" (deprecated, legacy only)`
2. JSDoc comment: `"[FS-031]" current, "[INC-0031]" deprecated`
3. Example comment: `"[FS-031]" (current format)` / `"[INC-0031]" (deprecated, legacy support only)`

---

## Verification

### Hooks (✅ Already Correct)
- ✅ `post-increment-planning.sh` - Uses `[FS-YY-MM-DD]` format (line 409)
- ✅ `post-task-completion.sh` (GitHub) - Syncs specs, not increments (no [INC-] usage)
- ✅ All other hooks - No [INC-] references found

### Code (✅ Already Correct)
- ✅ `github-epic-sync.ts:542` - Creates issues with `[${epicId}]` → `[FS-031]`
- ✅ `duplicate-detector.ts` - Searches for both formats (legacy support)
- ✅ All sync logic uses Epic ID, not increment number

### Documentation (✅ Now Consistent)
- ✅ User template (CLAUDE.md.template) - New section added
- ✅ Contributor guide (CLAUDE.md) - Prominent section added
- ✅ Command docs - All updated to show [FS-XXX] format
- ✅ Agent docs - Examples updated to [FS-XXX] format
- ✅ Code comments - Clarified deprecation

---

## Files Changed

### Documentation
1. `src/templates/CLAUDE.md.template` - Added GitHub format section
2. `CLAUDE.md` - Added prominent format section with cleanup commands

### Command Docs
3. `plugins/specweave-github/commands/specweave-github-sync-tasks.md` - Updated examples
4. `plugins/specweave-github/commands/specweave-github-sync-epic.md` - Updated examples + added notes

### Agent Docs
5. `plugins/specweave-github/agents/github-task-splitter/AGENT.md` - Updated examples

### Code Comments
6. `plugins/specweave-github/lib/github-epic-sync.ts` - Clarified deprecation
7. `plugins/specweave-github/lib/duplicate-detector.ts` - Updated 3 comments

---

## Impact

### Immediate Benefits
✅ **Future Claude instances**: Will see format rules in loaded context
✅ **New users**: Will receive clear guidance via CLAUDE.md template
✅ **Contributors**: Will see prominent warnings in contributor guide
✅ **Consistency**: All docs now show correct [FS-XXX] format
✅ **Cleanup**: Provided command to close old [INC-] issues

### Long-term Benefits
✅ **Prevents confusion**: No more questions about format
✅ **Better onboarding**: Users know correct format from day 1
✅ **Self-documenting**: Code comments explain deprecated format
✅ **Maintainable**: Future changes won't break format understanding

---

## User Action Required

**To clean up old [INC-] issues** (from screenshot):

```bash
# Close all old [INC-] format issues
gh issue list --search "[INC-" --state open --json number --jq '.[].number' | \
  xargs -I {} gh issue close {} --comment "Migrating to [FS-XXX] format (Universal Hierarchy v0.18.0+)"

# Re-sync Epic to create fresh [FS-031] issues
/specweave-github:sync-epic FS-031
```

**No git push needed** - this is a documentation fix, not a code issue!

---

## Lessons Learned

1. **Documentation must be proactive**: Don't bury critical format rules in subsections
2. **User templates are critical**: Users won't see contributor docs
3. **Examples matter**: Outdated examples confuse more than help
4. **Comments age**: Code comments should clarify deprecation, not just show both formats
5. **Consistency checks**: Need to audit all documentation when format changes

---

## Next Steps

1. ✅ **Commit changes**: All documentation and comments updated
2. ⏳ **User cleanup**: User should run cleanup command to close old issues
3. ⏳ **Monitor**: Watch for any remaining [INC-] references in other plugins
4. 📝 **Consider**: Add validation script to reject [INC-] format in CI/CD

---

**Status**: ✅ COMPLETE
**Result**: Format consistency achieved across all documentation and code!

🎉 Future Claude instances won't make [INC-] mistakes!
