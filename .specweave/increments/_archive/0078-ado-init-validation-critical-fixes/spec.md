---
increment: 0078-ado-init-validation-critical-fixes
title: "ADO Init Validation Critical Fixes"
priority: P0
status: completed
type: bug
created: 2025-11-28
completed: 2025-11-29
dependencies: []
structure: user-stories
---

# ADO Init Validation Critical Fixes

## Problem Statement

The Azure DevOps (ADO) initialization flow has **4 critical bugs** discovered during real-world testing with `acme-org/Acme`:

1. **Area path CREATION despite read-only permissions** - Validator attempts to CREATE area paths even when user said "No" to all sync permissions
2. **Wrong project folder naming** - Creates `ADO-Acme` instead of `Acme`
3. **Work items not sorted by area path** - All items go to parent folder, not organized into area-path subfolders
4. **Missing repo cloning step** - For multi-repo setups, no step to configure repo cloning pattern (e.g., `sw-*`)

## Root Cause Analysis

### Bug 1: Area Path Creation Despite "No" Permissions

- **Location**: `src/utils/validators/ado-validator.ts:507-528` (`validate()` method)
- **Flow**: `validateResources()` in `issue-tracker/index.ts:449-454` calls `validateAzureDevOpsResources()`
- **Bug**: Validator ALWAYS tries to create area paths at line 517: `await this.createAreaPath(projectName, areaName)`
- **Expected**: When `canUpsertInternalItems=false`, `canUpdateExternalItems=false`, `canUpdateStatus=false`, the validator should be READ-ONLY
- **Impact**: API errors (403/401) when user doesn't have create permissions, or unwanted area paths created

### Bug 2: Wrong Project Folder Naming

- **Location**: `src/cli/helpers/issue-tracker/ado.ts:387`
- **Code**: `const adoProjectDir = path.join(specsDir, \`ADO-\${projectName}\`);`
- **Expected**: User specified project name `Acme`, folder should be `Acme`
- **Actual**: Creates `ADO-Acme`
- **Impact**: Mismatch between user expectation and folder naming

### Bug 3: Work Items Not Sorted by Area Path

- **Location**: `src/cli/helpers/init/external-import.ts:1112-1196` (`groupItemsByExternalContainer`)
- **Bug**: Items are grouped by area path but the `convertToLivingDocs` function may not be respecting the 2-level structure
- **Evidence**: User sees all items in parent folder, not in area-path subfolders
- **Impact**: Unorganized import, defeating purpose of area-path selection

### Bug 4: Missing Repo Cloning Step for Multi-Repo

- **Location**: `src/cli/helpers/init/repository-setup.ts`
- **Bug**: For "multiple repos" choice, there's no step to configure repo cloning pattern
- **Expected Flow**:
  1. User chooses "multiple repos"
  2. User enters pattern (e.g., `sw-*`) or selects repos
  3. System clones matching repos OR imports from them
- **Impact**: Multi-repo users can't easily set up umbrella repositories

## Acceptance Criteria

### US-001: Respect Sync Permissions in ADO Validator

**As a** developer with read-only ADO access
**I want** the validator to NOT try creating area paths
**So that** initialization succeeds without API errors

#### Acceptance Criteria:
- [x] **AC-US1-01**: Read `syncPermissions` from config.json before validation
- [x] **AC-US1-02**: If `canUpsertInternalItems=false`, skip ALL create operations
- [x] **AC-US1-03**: Validator only CHECKS existence (GET requests), never creates (POST)
- [x] **AC-US1-04**: Log clear message: "Skipping area path creation (read-only mode)"

### US-002: Fix Project Folder Naming

**As a** developer setting up ADO integration
**I want** the project folder to match the project name I specified
**So that** folder names are intuitive and consistent

#### Acceptance Criteria:
- [x] **AC-US2-01**: Use project name directly without prefix: `Acme` not `ADO-Acme`
- [~] **AC-US2-02**: OR make prefix configurable in config.json (SKIPPED - chose option 1)
- [x] **AC-US2-03**: Import and folder creation must use same naming convention
- [~] **AC-US2-04**: Document the naming convention in ADR (SKIPPED - trivial change)

### US-003: Sort Imported Items by Area Path

**As a** developer with area-path-based organization
**I want** imported work items to be sorted into area path folders
**So that** the import respects my team structure

#### Acceptance Criteria:
- [x] **AC-US3-01**: Work items grouped by `System.AreaPath` field
- [x] **AC-US3-02**: Each area path gets its own subfolder under project
- [x] **AC-US3-03**: Structure: `specs/{project}/{area-path}/FS-XXX/US-XXX.md`
- [~] **AC-US3-04**: Items without area path go to `_default/` folder (SKIPPED - uses projectId fallback)
- [~] **AC-US3-05**: Preview shows count per area path before import (SKIPPED - preview already existed)

### US-004: Add Repo Cloning Step for Multi-Repo Mode

**As a** developer with multiple repositories
**I want** to configure repo cloning during init
**So that** all my repos are managed together

#### Acceptance Criteria:
- [x] **AC-US4-01**: After "multiple repos" selection, show cloning options
- [x] **AC-US4-02**: Options: "Pattern match" (e.g., `sw-*`), "Explicit list", "Skip cloning"
- [~] **AC-US4-03**: For ADO repos, use ADO Repos API to list available repos (SKIPPED - pattern input sufficient)
- [~] **AC-US4-04**: Save clone configuration to config.json (SKIPPED - stored in adoClonePattern return value)
- [x] **AC-US4-05**: Don't block init if cloning skipped - can clone later

## Out of Scope

- Changing ADO sync commands (only init affected)
- Modifying work item import format
- Adding new ADO API integrations

## Dependencies

- None (self-contained bug fixes)

## Success Metrics

- ADO init completes without area path creation errors when permissions are read-only
- Project folder named correctly without unwanted prefixes
- Imported items organized into area path subfolders
- Multi-repo setup prompts for repo cloning pattern
