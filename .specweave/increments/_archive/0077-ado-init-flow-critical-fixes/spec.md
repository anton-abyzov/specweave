---
increment: 0077-ado-init-flow-critical-fixes
title: "ADO Init Flow Critical Fixes"
priority: P1
status: completed
type: bug
created: 2025-11-27
dependencies: []
structure: user-stories
---

# ADO Init Flow Critical Fixes

## Problem Statement

The Azure DevOps (ADO) initialization flow in `specweave init` has **4 critical bugs** that completely break the ADO integration:

1. **AZURE_DEVOPS_PROJECTS not written to .env** - Validator expects this var but it's never set
2. **ADO detection fails during import** - Env var name mismatch (`ADO_ORG_URL` vs `AZURE_DEVOPS_ORG`)
3. **No specs structure created** - Unlike JIRA/GitHub, ADO doesn't create `.specweave/docs/internal/specs/{project}/` folders
4. **Missing work item selection by pattern** - GitHub has pattern-based repo selection, ADO has none

## Root Cause Analysis

### Bug 1: AZURE_DEVOPS_PROJECTS Not Written
- **Location**: `src/cli/helpers/issue-tracker/ado.ts:352-369` (`getAzureDevOpsEnvVars`)
- **Cause**: Only writes `AZURE_DEVOPS_PAT`, `AZURE_DEVOPS_ORG`, `AZURE_DEVOPS_PROJECT` (singular)
- **Validator**: `src/utils/validators/ado-validator.ts:316-324` expects `AZURE_DEVOPS_PROJECTS` (plural) for area-path strategy
- **Impact**: Validation fails with "AZURE_DEVOPS_PROJECTS not found in .env"

### Bug 2: ADO Detection Fails During Import
- **Location**: `src/cli/helpers/init/config-detection.ts:91-121` (`detectADOConfig`)
- **Cause**: Looks for `ADO_ORG_URL`, `ADO_PROJECT`, `ADO_PAT`
- **But**: `promptAzureDevOpsCredentials` writes `AZURE_DEVOPS_ORG`, `AZURE_DEVOPS_PROJECT`, `AZURE_DEVOPS_PAT`
- **Impact**: `ado` is always `null` in `detectAllConfigs`, import never happens

### Bug 3: No Specs Structure Created
- **Location**: `src/cli/commands/init.ts` and `src/cli/helpers/issue-tracker/index.ts`
- **Cause**: GitHub/JIRA have directory creation, ADO doesn't
- **Impact**: No `.specweave/docs/internal/specs/{area-path}/` folders created

### Bug 4: Missing Pattern-Based Selection
- **Location**: Compare `src/cli/helpers/github-repo-selector.ts` with `src/cli/helpers/issue-tracker/ado.ts`
- **Cause**: GitHub has `selectRepositories` with pattern matching, ADO has no equivalent
- **Impact**: Users must manually select 39+ area paths with no filtering options

## Acceptance Criteria

### US-001: Fix Env Var Name Consistency

**As a** developer setting up ADO integration
**I want** the env vars to be written and read consistently
**So that** ADO validation and import work correctly

#### Acceptance Criteria:
- [x] **AC-US1-01**: `getAzureDevOpsEnvVars` writes env vars that `detectADOConfig` can read
- [x] **AC-US1-02**: Standardize on `AZURE_DEVOPS_*` prefix for all ADO env vars
- [x] **AC-US1-03**: `detectADOConfig` reads `AZURE_DEVOPS_ORG`, `AZURE_DEVOPS_PROJECT`, `AZURE_DEVOPS_PAT`
- [x] **AC-US1-04**: Write `AZURE_DEVOPS_PROJECTS` (plural) when multiple area paths selected
- [x] **AC-US1-05**: Backward compatibility: Also check legacy `ADO_*` vars during detection

### US-002: Fix ADO Work Item Import

**As a** developer initializing SpecWeave with ADO
**I want** my work items to be imported to living docs
**So that** I can see existing work in the SpecWeave structure

#### Acceptance Criteria:
- [x] **AC-US2-01**: ADO detection succeeds when `AZURE_DEVOPS_*` vars are in `.env`
- [x] **AC-US2-02**: `promptAndRunExternalImport` correctly detects ADO configuration
- [x] **AC-US2-03**: Work items are imported and converted to User Stories
- [x] **AC-US2-04**: Imported items appear in `.specweave/docs/internal/specs/` structure

### US-003: Create ADO Project Folder Structure

**As a** developer using area-path-based ADO organization
**I want** SpecWeave to create the appropriate folder structure
**So that** imported work items are organized correctly

#### Acceptance Criteria:
- [x] **AC-US3-01**: `specs/ADO-{project}/` folder created for by-project mode
- [x] **AC-US3-02**: `specs/ADO-{project}/{area-path}/` folders created for by-area mode
- [x] **AC-US3-03**: Folder creation happens during init, not just during import
- [x] **AC-US3-04**: Similar to JIRA's 2-level structure (`specs/JIRA-{project}/{board}/`)

### US-004: Add Pattern-Based Work Item Selection

**As a** developer with many area paths in ADO
**I want** to filter work items by pattern (like GitHub repos)
**So that** I can selectively import relevant items

#### Acceptance Criteria:
- [x] **AC-US4-01**: Add pattern matching for area paths (e.g., `*-Platform`, `*-Service`)
- [x] **AC-US4-02**: Similar UX to `github-repo-selector.ts` (all org, pattern, explicit list)
- [x] **AC-US4-03**: Show preview of matched area paths before confirmation
- [x] **AC-US4-04**: Save selection strategy to config.json

### US-005: Move ADO Configuration to config.json

**As a** developer
**I want** non-secret ADO configuration in config.json (not .env)
**So that** team members can share configuration

#### Acceptance Criteria:
- [x] **AC-US5-01**: `AZURE_DEVOPS_ORG` value stored in `config.json` (not .env)
- [x] **AC-US5-02**: `AZURE_DEVOPS_PROJECT` value stored in `config.json`
- [x] **AC-US5-03**: Selected area paths stored in `config.json`
- [x] **AC-US5-04**: Only `AZURE_DEVOPS_PAT` remains in `.env` (secret)
- [x] **AC-US5-05**: Detection reads from both config.json and .env

## Out of Scope

- Changing existing JIRA or GitHub integration patterns
- Adding new ADO features beyond fixing init flow
- Modifying ADO sync commands (only init affected)

## Dependencies

- None (self-contained bug fixes)

## Success Metrics

- ADO init flow completes without "AZURE_DEVOPS_PROJECTS not found" error
- Work items are successfully imported during init
- Folder structure matches JIRA pattern (`ADO-{project}/{area}/`)
- Pattern-based filtering available for area path selection
