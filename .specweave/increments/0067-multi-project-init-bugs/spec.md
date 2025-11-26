---
increment: 0067-multi-project-init-bugs
---

# Fix Multi-Project Init Critical Bugs

**Type**: Bug Fix (Critical)
**Status**: Active

## Problem Statement

When initializing a multi-project setup with 1 parent + N implementation repositories:

1. **Parent folder missing** - `.specweave/docs/internal/specs/` only gets implementation repo folders, NOT the parent repo folder
2. **External import fails silently** - GitHub issues exist but "Import failed" with zero details shown

## Root Cause Analysis

### Bug #1: Parent Repo Folder Not Created

**File**: `src/core/repo-structure/repo-initializer.ts:309-326`

**Current Code**:
```typescript
} else if (config.architecture === 'multi-repo' || config.architecture === 'parent') {
  for (const repo of config.repositories) {  // Only implementation repos!
    const projectSpecPath = path.join(specweavePath, 'docs', 'internal', 'specs', repo.id);
    if (!existsSync(projectSpecPath)) {
      mkdirSync(projectSpecPath, { recursive: true });
    }
  }
}
```

**Issue**: `config.parentRepo` is never processed - only `config.repositories` (implementation repos) are iterated.

### Bug #2a: GitHub Config Skipped for Profiles-Only Mode

**File**: `src/cli/helpers/init/external-import.ts:404`

**Current Code**:
```typescript
if (github && hasGitHubToken) {  // Line 404
  if (repoSelectionConfig && repoSelectionConfig.repositories.length > 0) {
```

**Conflict**: At line 359, condition is `(github || hasGitHubProfiles)`, but at line 404 it's only `github`. When `github=null` but profiles exist, import is skipped.

### Bug #2b: Silent Error Handling

**Files**:
- `src/cli/helpers/init/external-import.ts:773-774`
- `src/cli/commands/init.ts:457-459`

**Issue**: Generic "Import failed" message with no error details, then completely swallowed in init.ts.

## User Stories

### US-001: Parent Folder Creation
**As a** developer setting up multi-project architecture
**I want** the parent repo to have its own specs folder
**So that** I can store parent-level specifications

#### Acceptance Criteria
- [x] **AC-US1-01**: Parent repo folder created at `.specweave/docs/internal/specs/{parent-id}/`
- [x] **AC-US1-02**: Parent folder created when `config.architecture === 'parent'`
- [x] **AC-US1-03**: Console shows "[OK] Created project structure: {parent-name}"

### US-002: External Import Reliability
**As a** developer with GitHub issues
**I want** external import to work with multi-repo profiles
**So that** existing issues are imported to living docs

#### Acceptance Criteria
- [x] **AC-US2-01**: Import works when `github=null` but sync profiles exist
- [x] **AC-US2-02**: GitHub config built from `repoSelectionConfig` when available
- [x] **AC-US2-03**: Error messages include actual error details
- [x] **AC-US2-04**: Per-repo failures shown for multi-repo imports

## Technical Details

### Files to Modify

1. `src/core/repo-structure/repo-initializer.ts` - Add parent repo handling
2. `src/cli/helpers/init/external-import.ts` - Fix condition, improve errors
3. `src/cli/commands/init.ts` - Log actual errors instead of swallowing

### Expected Behavior After Fix

**Init with 4 repos (1 parent + 3 impl)**:
```
.specweave/docs/internal/specs/
├── sw-meeting-cost/        <- Parent (NEW!)
├── sw-meeting-cost-be/
├── sw-meeting-cost-fe/
└── sw-meeting-cost-shared/
```

**Import with profiles**:
```
✓ Imported 3 items
   ✓ sw-meeting-cost: 1 item
   ✓ sw-meeting-cost-be: 2 items
```
