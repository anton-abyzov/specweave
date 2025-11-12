# Increment 0026: Multi-Repo Unit Tests - ABANDONED

**Status**: Abandoned
**Date**: 2025-11-11
**Reason**: Incomplete implementation, superseded by increment 0028 multi-repo UX improvements

## Why Abandoned

This increment was started but never completed. Progress: 0/4 tasks (0%).

The work may be revisited in a future increment if needed, but for now we're focusing on higher-priority UX improvements to the multi-repo setup flow.

## Next Steps

Continue with increment 0028 for multi-repo UX improvements.

---

## Related Work: Multi-Project Structure Fix

The following content was from a parallel increment attempt (0026-multiproject-structure-fix) that was merged here:

# Increment 0026: Multi-Project Structure Fix

## Problem Statement

Two critical issues with multi-project setup:

### Issue 1: Repository Location
- **Current**: Repositories created in `services/{repo}/`, `projects/{repo}/` (nested, incorrect)
- **Expected**: Repositories created at root level `{repo}/` (e.g., `backend/`, `frontend/`)
- **Root Cause**: Folder detector patterns include `services/*`, `apps/*`, `packages/*`

### Issue 2: Internal Docs Structure
- **Current**: Nested structure with multiple folders per project:
  ```
  .specweave/docs/internal/projects/{projectId}/
  ├── specs/
  ├── modules/
  ├── team/
  ├── architecture/
  └── legacy/
  ```
- **Expected**: Simplified structure with ONLY specs:
  ```
  .specweave/docs/internal/specs/{projectId}/
  ```
- **Root Cause**: `ProjectManager.createProjectStructure()` and `RepoStructureManager.createSpecWeaveStructure()` create nested folders

## Requirements

### US1: Fix Repository Creation
- **AC-US1-01**: Repositories MUST be created at root level (P1, testable)
- **AC-US1-02**: Remove `services/*`, `apps/*`, `packages/*` patterns from folder detector (P1, testable)
- **AC-US1-03**: Repository path MUST be `{repoId}/` not `services/{repoId}/` (P1, testable)

### US2: Fix Internal Docs Structure
- **AC-US2-01**: ONLY create `.specweave/docs/internal/specs/{projectId}/` folder (P1, testable)
- **AC-US2-02**: DO NOT create modules/, team/, project-arch/, legacy/ folders (P1, testable)
- **AC-US2-03**: Update ProjectManager path methods to reflect new structure (P1, testable)
- **AC-US2-04**: Remove nested folder creation from RepoStructureManager (P1, testable)

### US3: Consistency Across All Providers
- **AC-US3-01**: GitHub sync MUST use `.specweave/docs/internal/specs/{repo}/` (P1, testable)
- **AC-US3-02**: JIRA sync MUST use `.specweave/docs/internal/specs/{project}/` (P1, testable)
- **AC-US3-03**: ADO sync MUST use `.specweave/docs/internal/specs/{project}/` (P1, testable)

## Out of Scope
- Existing projects with old structure (migration scripts not included)
- Backward compatibility with old nested structure
- Changes to cross-project folders (architecture/, delivery/, etc. - these stay)

## Success Criteria
- ✅ Repositories created at root level ONLY
- ✅ ONLY specs/ folder created per project
- ✅ All E2E tests pass
- ✅ All unit tests pass
- ✅ Works consistently for GitHub, JIRA, ADO
