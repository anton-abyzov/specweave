---
increment: 0079-ado-init-flow-v2
title: "ADO Init Flow V2 - Critical Fixes"
priority: P0
status: completed
type: bug
created: 2025-11-29
completed: 2025-11-29
dependencies: []
structure: user-stories
---

# ADO Init Flow V2 - Critical Fixes

## Problem Statement

The Azure DevOps init flow has **5 critical bugs** discovered during real-world testing with `acme-org/Acme`:

### Bug 1: Area Path CREATION Instead of VALIDATION
- User selects EXISTING area paths (`Acme\Platform-Engineering`)
- Validator TRIES TO CREATE them instead of just validating existence
- Error: `Creating area path: Acme\Acme\Platform-Engineering` (double prefix!)
- **Root Cause**: `ado-validator.ts:527` calls `createAreaPath()` even when paths already exist

### Bug 2: Double Project Prefix in Area Path Validation
- Area paths stored as full paths: `Acme\Platform-Engineering`
- `createAreaPath(projectName, areaName)` at line 276 outputs: `${projectName}\${areaName}`
- Result: `Acme\Acme\Platform-Engineering` (projectName prepended to already-full path)
- **Root Cause**: Config stores FULL paths, but createAreaPath expects leaf names only

### Bug 3: Team Selection is Unnecessary
- Init flow asks to select teams (checkbox with 32 teams!)
- Teams are IRRELEVANT for the 2-level folder structure
- Only Project + Area Path matters for organizing work items
- **Root Cause**: `ado.ts:230-242` prompts for teams even though they're unused

### Bug 4: Imported Work Items Go to "parent" Folder
- All imported ADO items land in `specs/{project}/parent/` instead of area path folders
- Expected: `specs/Acme/Platform-Engineering/FS-XXX/`
- Actual: `specs/Acme/parent/FS-XXX/`
- **Root Cause**: Items don't have `adoAreaPath` populated during import, falls back to `projectId = 'parent'`

### Bug 5: No Multi-Project Selection
- User can only select 1 ADO project during init
- Enterprise users have multiple projects (Acme, Acme-Mobile, etc.)
- **Root Cause**: Single project prompt, no multi-select option

## Root Cause Analysis

### Code Locations

1. **ado-validator.ts:525-538** - Tries to CREATE area paths instead of just VALIDATING
2. **ado-validator.ts:276** - Double prefix: `${projectName}\${areaName}` when areaName is already full path
3. **ado.ts:230-242** - Team selection prompt (should be removed)
4. **external-import.ts:1148-1164** - ADO item grouping by area path (works correctly IF adoAreaPath is set)
5. **ADO import** - Items not getting `adoAreaPath` field populated during fetch

## Acceptance Criteria

### US-001: Validate Area Paths Without Creating

**As a** developer with read-only ADO access
**I want** the validator to CHECK if area paths exist, not create them
**So that** initialization works without write permissions

#### Acceptance Criteria:
- [x] **AC-US1-01**: Change validator to use GET request to check area path existence
- [x] **AC-US1-02**: NEVER call createAreaPath() for user-selected paths (they already exist)
- [x] **AC-US1-03**: Only show warning if area path doesn't exist (don't try to create)
- [x] **AC-US1-04**: Remove `readOnly` logic - validation should ALWAYS be read-only

### US-002: Fix Double Prefix Bug

**As a** developer
**I want** area paths stored and validated correctly
**So that** no duplicate prefixes appear

#### Acceptance Criteria:
- [x] **AC-US2-01**: Store area paths as LEAF names only in config.json (e.g., `Platform-Engineering`)
- [x] **AC-US2-02**: OR strip project prefix before validation if full paths are stored
- [x] **AC-US2-03**: Folder creation uses consistent naming with validation

### US-003: Remove Team Selection from Init

**As a** developer
**I want** init to focus on Project + Area Path only
**So that** setup is simpler and faster

#### Acceptance Criteria:
- [x] **AC-US3-01**: Remove team selection checkbox from `promptAzureDevOpsCredentials()`
- [x] **AC-US3-02**: Remove `teams` from returned credentials
- [x] **AC-US3-03**: Remove team-related prompts and caching
- [x] **AC-US3-04**: Keep team fetching ONLY if needed for future features (disabled by default)

### US-004: Fix Import Organization by Area Path

**As a** developer importing ADO work items
**I want** items organized into their area path folders
**So that** folder structure matches ADO organization

#### Acceptance Criteria:
- [x] **AC-US4-01**: ADO import must populate `adoAreaPath` field on each work item
- [x] **AC-US4-02**: Items with area path go to `specs/{project}/{areaPathLeaf}/`
- [x] **AC-US4-03**: Items without area path go to `specs/{project}/_default/`
- [x] **AC-US4-04**: Never use "parent" as folder name - use "_default" instead

### US-005: Add Multi-Project Selection

**As a** enterprise developer
**I want** to select multiple ADO projects during init
**So that** I can manage all my projects from one SpecWeave instance

#### Acceptance Criteria:
- [x] **AC-US5-01**: After org input, fetch all projects user has access to
- [x] **AC-US5-02**: Show multi-select checkbox for projects (default: first project selected)
- [x] **AC-US5-03**: For each project, prompt for area path selection
- [x] **AC-US5-04**: Store multiple projects in config.json `sync.profiles`
- [x] **AC-US5-05**: Create folder structure for each project

## Out of Scope

- Changing ADO sync commands (only init affected)
- Modifying work item import format
- Adding new ADO API integrations beyond what's needed

## Success Metrics

- ADO init completes without area path creation errors
- No double prefix in area path handling
- Team selection removed from init flow
- Imported items organized by area path folders
- Multi-project selection works for enterprise users
