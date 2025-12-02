---
increment: 0080-ado-folder-naming-fix
title: "ADO Folder Naming Fix - Remove ADO- Prefix"
priority: P0
status: completed
type: bug
created: 2025-11-29
completed: 2025-11-29
dependencies: []
structure: user-stories
---

# ADO Folder Naming Fix - Remove ADO- Prefix

## Problem Statement

The Azure DevOps init flow has **2 critical bugs** discovered during real-world testing:

### Bug 1: ADO- Prefix in Folder Names

- User sees `specs/ADO-{PROJECT}/{area}/` in UI and folder structure
- Expected: `specs/{PROJECT}/{area}/` (no prefix, like standard folders)
- The "ADO-" prefix is redundant noise - user knows they're working with ADO
- Affects both display strings and actual folder creation

**Affected Files**:
- `src/cli/helpers/init/jira-ado-auto-detect.ts` - UI strings and folder mapping logic
- `src/living-docs/fs-id-allocator.ts` - Container directory name generation
- `src/importers/external-importer.ts` - Comment/documentation strings

### Bug 2: Work Items Going to Parent Folder Instead of Area Path

- All imported ADO items land in project root instead of area path folders
- Expected: `specs/Acme/Platform-Engineering/FS-XXX/`
- Actual: `specs/Acme/FS-XXX/` or even `specs/Acme/default/FS-XXX/`
- Items should be organized by their actual area path from ADO

**Root Cause**: The folder mapping in `jira-ado-auto-detect.ts` creates the mapping but items don't use it correctly during import.

## Acceptance Criteria

### US-001: Remove ADO- Prefix from Folder Names

**As a** developer using ADO integration
**I want** clean folder names without platform prefixes
**So that** my project structure is intuitive and clean

#### Acceptance Criteria:
- [x] **AC-US1-01**: Change UI display from `specs/ADO-{PROJECT}/` to `specs/{PROJECT}/`
- [x] **AC-US1-02**: Change UI display from `specs/ADO-{PROJECT}/{area}/` to `specs/{PROJECT}/{area}/`
- [x] **AC-US1-03**: Remove ADO- prefix from folder mapping generation in `confirmAdoMapping()`
- [x] **AC-US1-04**: Update `fs-id-allocator.ts` to not add ADO- prefix to container directories
- [x] **AC-US1-05**: Update documentation comments to reflect new naming

### US-002: Ensure Work Items Go to Correct Area Path Folders

**As a** developer importing ADO work items
**I want** items organized into their actual area path folders
**So that** folder structure matches my ADO organization

#### Acceptance Criteria:
- [x] **AC-US2-01**: Items with `adoAreaPath` go to `specs/{project}/{areaLeaf}/FS-XXX/`
- [x] **AC-US2-02**: Items without area path go to `specs/{project}/_default/FS-XXX/`
- [x] **AC-US2-03**: Area path extraction uses leaf segment (after last `\`)
- [x] **AC-US2-04**: Folder structure preview shows correct paths during init

## Out of Scope

- Changing JIRA folder naming (keep JIRA- prefix for now)
- Changing ADO sync commands (only init/import affected)
- Migrating existing folder structures

## Success Metrics

- ADO init shows `specs/{PROJECT}/{area}/` in prompts
- Imported items appear in correct area path folders
- No "ADO-" prefix in any folder names
