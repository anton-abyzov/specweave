---
increment: 0071-fix-feature-id-collision-github-import
title: "Fix Feature ID Collision and GitHub Import Completeness"
priority: P1
status: completed
type: bug
created: 2025-11-26
completed: 2025-11-26
---

# Fix Feature ID Collision and GitHub Issue Import Completeness

## Problem Statement

Two critical issues identified in the external import and feature ID allocation system:

### Issue 1: Feature ID Numeric Collision

**Current behavior**: Internal features (`FS-001`) and external features (`FS-001E`) share the same numeric index.

**Problem**:
- `FS-001` (internal, created by greenfield increment) uses numeric "001"
- `FS-001E` (external, imported from GitHub) also uses numeric "001"
- This creates confusion and potential collisions

**Expected behavior**:
- Each PROJECT should have its own feature ID sequence starting from 001
- Internal and external features should NOT share the same numeric indices
- Options:
  - **Option A**: Unified sequence - if `FS-001` exists, external must use `FS-002E` (skip 001)
  - **Option B**: Separate namespaces - External starts at `FS-500E` or uses `FX-001` prefix
  - **Option C**: Per-project sequences with collision detection

### Issue 2: Missing External Issues During Import

**Observed**: `specweave init` with umbrella multi-repo setup (4 repos, each with 1-2 issues) only imported 6 items total.

**Root causes to investigate**:
1. `includeClosed: false` by default - missing closed issues
2. Time range filter may exclude some issues
3. Pagination edge cases (100 items per page)
4. Rate limiting stopping import early
5. Parent repo not included in sync profiles
6. GitHub API filtering/sorting affecting results

---

## User Stories

### US-001: Unified Feature ID Sequence (No Numeric Collision)

**As a** developer using SpecWeave with external imports
**I want** internal and external feature IDs to never share the same numeric index
**So that** I can reference features unambiguously without confusion

**Acceptance Criteria**:
- [x] **AC-US1-01**: When `FS-001` exists (internal), next external feature gets `FS-002E` (not `FS-001E`)
- [x] **AC-US1-02**: When `FS-001E` exists (external), next internal feature gets `FS-002` (not `FS-001`)
- [x] **AC-US1-03**: Per-project sequences remain isolated (FS-001 in project-A, FS-001 in project-B are OK)
- [x] **AC-US1-04**: Collision detection logs warning if numeric overlap detected
- [x] **AC-US1-05**: Existing projects with collisions are not broken (backward compatible)

### US-002: Complete GitHub Issue Import

**As a** user running `specweave init` with GitHub integration
**I want** ALL issues from configured repos to be imported
**So that** no work items are missed during brownfield onboarding

**Acceptance Criteria**:
- [x] **AC-US2-01**: Import includes both open AND closed issues (configurable)
- [x] **AC-US2-02**: Import fetches ALL pages (smart pagination with progress indicator)
- [x] **AC-US2-03**: Parent repo is included in umbrella mode import
- [x] **AC-US2-04**: Rate limit handling with automatic retry/backoff
- [x] **AC-US2-05**: Summary shows total issues per repo and any skipped items
- [x] **AC-US2-06**: Dry-run mode shows what WOULD be imported without creating files

---

## Technical Analysis

### Feature ID Allocation (Current Implementation)

**File**: `src/living-docs/fs-id-allocator.ts`

Current logic (lines 376-463):
```typescript
// Step 1: Sort features by creation date
// Step 2: Find chronological insertion point
// Step 3: Try to fill gaps between consecutive features
// Step 4: Fallback to append with E suffix
```

**Problem**: The algorithm looks for gaps but doesn't check if numeric index is already used by internal feature.

**Fix**: Before allocating `FS-XXXE`, check if `FS-XXX` (without E) exists. If so, skip to next number.

### GitHub Import (Current Implementation)

**File**: `src/importers/github-importer.ts`

Pagination (lines 57-121):
- Page size: 100 (GitHub API max)
- `includeClosed: false` by default
- `since` filter for time range

**File**: `src/cli/helpers/init/external-import.ts`

Import flow (lines 703-851):
- Creates ImportCoordinator
- Calls `importFromGitHubRepo()` for each repo
- Converts to living docs

**Potential issues**:
1. Default `includeClosed: false` - need to prompt user
2. Parent repo may not be in sync profiles (bug fixed 2025-11-26 but verify)
3. No import summary per repo

---

## Implementation Tasks

See `tasks.md` for detailed implementation tasks.
