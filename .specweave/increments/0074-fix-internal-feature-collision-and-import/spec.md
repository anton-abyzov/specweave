---
increment: 0074-fix-internal-feature-collision-and-import
title: "Fix Internal Feature ID Collision and GitHub Import Issues"
priority: P0
status: completed
type: bug
created: 2025-11-26
---

# Fix Internal Feature ID Collision and GitHub Import Issues

## Problem Statement

### Issue 1: FS-001 vs FS-001E Collision (CRITICAL)

**Observed**: In user project `sw-meeting-cost-be/`, both `FS-001` (internal) and `FS-001E` (external) exist in the same project folder.

**Root cause**: Internal feature ID generation in `living-docs-sync.ts` uses increment number to generate `FS-XXX` WITHOUT checking if `FS-XXXE` (external) already exists.

**Code locations generating internal IDs without collision check**:
- `src/core/living-docs/living-docs-sync.ts:203` - Fallback generation
- `src/core/living-docs/living-docs-sync.ts:374` - Auto-generation
- `src/core/living-docs/hierarchy-mapper.ts:424, 457, 501`
- `src/core/living-docs/feature-id-manager.ts:127`

**Expected behavior**: When generating `FS-001` for internal feature, if `FS-001E` exists, should use `FS-002` instead.

### Issue 2: Only 1 Issue Grabbed Per Project (INVESTIGATE)

**Observed**: User reports only 1 GitHub issue imported per project despite repos having multiple issues.

**Potential causes to investigate**:
1. Time range filter (`since` parameter) excluding older issues
2. `includeClosed` prompt default may be misleading users
3. Pagination breaking early
4. Items being silently filtered by duplicate detection
5. Issues not updated within time range (GitHub API `since` filters by `updated_at`)

### Issue 3: No Background Job Support for Large Imports

**Observed**: For repos with 100+ issues, import takes too long and user has no visibility.

**Expected**: Large imports should run in background with progress tracking via `/specweave:jobs`.

---

## User Stories

### US-001: Internal Feature ID Collision Prevention

**As a** developer using SpecWeave with external imports
**I want** internal feature IDs to never collide with external feature IDs
**So that** I can have clean, unambiguous feature folders

**Acceptance Criteria**:
- [x] **AC-US1-01**: When generating `FS-001` (internal), if `FS-001E` exists, use `FS-002`
- [x] **AC-US1-02**: Collision check applies to ALL internal ID generation code paths
- [x] **AC-US1-03**: Warning logged when collision avoided
- [x] **AC-US1-04**: Existing projects with collisions are not broken (backward compatible)

### US-002: GitHub Import Completeness

**As a** user running `specweave init` with GitHub integration
**I want** ALL issues from configured repos to be imported
**So that** no work items are missed during brownfield onboarding

**Acceptance Criteria**:
- [x] **AC-US2-01**: Debug logging shows exactly how many issues API returned
- [x] **AC-US2-02**: Summary shows total per repo, including skipped items with reasons
- [x] **AC-US2-03**: Time range filter behavior clearly documented in prompt
- [x] **AC-US2-04**: If 0 issues imported, show warning with troubleshooting steps

### US-003: Background Job Support for Large Imports (DESCOPED)

> **Note**: This user story was descoped from increment 0074 as it requires significant
> infrastructure work. Background job support is already implemented in increment 0065.
> This bug fix increment focuses on collision prevention and import completeness only.

**As a** user importing from repos with many issues (100+)
**I want** imports to run in background
**So that** I can continue working while import completes

**Acceptance Criteria**: (DESCOPED - see increment 0065-background-jobs)
- [ ] **AC-US3-01**: Imports with >50 items trigger background job prompt
- [ ] **AC-US3-02**: Background job progress visible via `/specweave:jobs`
- [ ] **AC-US3-03**: Job can be paused/resumed
- [ ] **AC-US3-04**: Completion notification when done

---

## Technical Analysis

### Internal ID Generation Path

```
User runs: /specweave:do
  ↓
LivingDocsSync.syncIncrement(incrementId)
  ↓
getFeatureIdForIncrement(incrementId)
  ↓
Auto-generates: FS-${incrementNumber} (line 374)
  ↓
NO CHECK for FS-XXXE collision!
  ↓
Creates folder: specs/{project}/FS-001/
  ↓
COLLISION with existing FS-001E!
```

### Fix Strategy

Create utility function `findNextAvailableInternalId(baseNumber, projectPath)`:
1. Check if `FS-{baseNumber}` exists → if yes, continue
2. Check if `FS-{baseNumber}E` exists → if yes, increment and retry
3. Return first available number

Apply this utility to ALL internal ID generation paths.

---

## Implementation Tasks

See `tasks.md`
