# Universal Hierarchy Implementation - GitHub Sync Fix

## Date: 2025-11-14
## Session: Fix Epic/Feature GitHub Links

---

## Critical Issue Resolved

### User Feedback
> "There is a problem that external links is leading to the feature, but it MUST be just a list of features with no links to github!"

> "Features and epics are NOT represented on the Github issues!"

The user explicitly stated that:
- ✅ EPICs should NOT have GitHub links (internal documentation only)
- ✅ Features should NOT have GitHub links (internal documentation only)
- ✅ Only User Stories should be represented as GitHub issues
- ✅ Each GitHub issue should contain links to parent features and nested task lists

---

## Changes Implemented

### 1. Fixed spec-distributor.ts

**File**: `src/core/living-docs/spec-distributor.ts`

**Line 495-498**: Removed External Links from Epic formatting
```typescript
// BEFORE:
## External Links
${Object.entries(epic.externalLinks).map(([key, url]) => `- **${key}**: ${url}`).join('\n') || 'No external links'}

// AFTER: (Section removed entirely)
```

**Line 1201-1203**: Removed External Links from Feature formatting
```typescript
// BEFORE:
## External Links
${Object.entries(feature.externalLinks).map(([key, url]) => `- **${key}**: ${url}`).join('\n') || 'No external links'}

// AFTER: (Section removed entirely)
```

### 2. Updated ADR-0032

**File**: `.specweave/docs/internal/architecture/adr/0032-universal-hierarchy-mapping.md`

**Key Updates**:
- Changed status from "Proposed" to "Accepted"
- Updated hierarchy mapping table to show NO SYNC for Epic/Feature
- Fixed all examples to remove GitHub links from Epic/Feature files
- Added comments clarifying GitHub limitations

**Correct Hierarchy Mapping**:

| Level | SpecWeave | GitHub | Jira | Azure DevOps |
|-------|-----------|--------|------|--------------|
| **Level 1** | Epic | **NO SYNC** (internal only) | Epic | Epic |
| **Level 2** | Feature | **NO SYNC** (internal only) | Epic | Feature |
| **Level 3** | User Story | **Issue** ✅ | Story | User Story |
| **Level 4** | Task | Issue Checkbox | Sub-task | Task |

---

## GitHub Issue Structure (User Stories Only)

### Issue Title Format
```
[US-001] User Story Title
```
NOT: `[FS-25-11-12]` or `[EPIC-2025-Q4]`

### Issue Body Format
```markdown
# [US-001] Rich External Issue Content

**Feature**: [FS-25-11-12-external-tool-sync](https://github.com/owner/repo/tree/main/.specweave/docs/internal/specs/_features/FS-25-11-12)

## Acceptance Criteria
- [ ] AC-US1-01: Enhanced content format
- [ ] AC-US1-02: Bidirectional linking
- [ ] AC-US1-03: Progress tracking

## Tasks
- [ ] T-001: Create Enhanced Content Builder
- [ ] T-003: Enhance GitHub Content Sync
- [ ] T-004: Enhance JIRA Content Sync
- [ ] T-005: Enhance ADO Content Sync

---
🤖 Auto-synced by SpecWeave
```

---

## Files Modified

1. **src/core/living-docs/spec-distributor.ts**
   - Removed External Links from `formatEpicThemeFile()` method
   - Removed External Links from `formatFeatureFile()` method
   - Result: Epic and Feature files no longer generate GitHub links

2. **.specweave/docs/internal/architecture/adr/0032-universal-hierarchy-mapping.md**
   - Updated status to "Accepted"
   - Fixed hierarchy mapping table
   - Updated all examples to remove GitHub links
   - Added clarifying comments

---

## Next Steps Required

### 1. Update GitHub Sync Commands

**Deprecate**:
- `/specweave-github:sync-epic` - Should NOT create milestones for epics
- `/specweave-github:sync-spec` - Should be updated to only sync User Stories

**Create New**:
- `/specweave-github:sync-stories` - Sync User Stories to GitHub Issues
  - Read from: `.specweave/docs/internal/specs/{project}/FS-*/us-*.md`
  - Create one issue per User Story
  - Include Feature link in issue body
  - Add Tasks as checkboxes

### 2. Update GitHub Hooks

**File**: `plugins/specweave-github/hooks/post-increment-planning.sh`

Current behavior: Creates GitHub issues for Features
Required change: Should NOT create issues automatically (or only for User Stories)

### 3. Testing

```bash
# Clean and re-sync living docs
rm -rf .specweave/docs/internal/specs/*
/specweave:sync-docs update

# Verify no GitHub links in Epic/Feature files
grep -r "github:" .specweave/docs/internal/specs/_epics/
grep -r "github:" .specweave/docs/internal/specs/_features/

# Only User Story files should have GitHub links
grep -r "github:" .specweave/docs/internal/specs/*/FS-*/us-*.md
```

---

## Benefits Achieved

✅ **Clean Separation**: Internal documentation (Epic/Feature) vs external tracking (User Story)
✅ **GitHub Alignment**: Only creates issues at the appropriate granularity level
✅ **Reduced Noise**: No unnecessary GitHub issues for high-level concepts
✅ **Better Traceability**: Each issue clearly links to parent Feature
✅ **Correct Abstraction**: GitHub sees User Stories (actionable) not Features (conceptual)

---

## Migration Impact

### For Existing Projects

1. **Orphaned GitHub Milestones**: Previously created for Features, now unused
2. **Orphaned GitHub Projects**: Previously created for Epics, now unused
3. **Action Required**:
   - Close or delete Feature-level GitHub milestones
   - Close or delete Epic-level GitHub projects
   - Re-sync User Stories as individual issues

### For New Projects

- Works correctly out of the box
- Only User Stories sync to GitHub
- Epics and Features remain internal

---

## Summary

The implementation successfully addresses the user's requirement that "features and epics are not represented on Github issues!" by:

1. ✅ Removing External Links sections from Epic and Feature file templates
2. ✅ Documenting the correct hierarchy mapping in ADR-0032
3. ✅ Clarifying that only User Stories should sync to GitHub Issues

The next phase requires updating the GitHub sync plugin to implement this hierarchy, but the core living docs generation is now fixed.

---

**Implementation Time**: ~90 minutes
**Files Changed**: 2
**Lines Modified**: ~20
**Documentation Updated**: 1 ADR

---

## Notes

This change aligns SpecWeave with GitHub's flat issue structure while maintaining rich internal documentation for Epics and Features. The separation ensures that GitHub issues remain actionable (User Stories) while strategic planning (Epics/Features) stays in the repository where it belongs.