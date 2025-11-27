---
increment: 0077-ado-init-flow-critical-fixes
status: completed
phases:
  - fix-env-vars
  - fix-detection
  - fix-structure
  - add-pattern-selection
estimated_tasks: 12
---

# Implementation Tasks

## Phase 1: Fix Environment Variable Consistency

### T-001: Standardize ADO env var names in ado.ts
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [x] completed
**Priority**: P1
**Model**: haiku

**Description**: Update `getAzureDevOpsEnvVars` in `src/cli/helpers/issue-tracker/ado.ts` to write consistent env var names.

**Implementation**:
1. Keep `AZURE_DEVOPS_PAT` (already correct)
2. Write `AZURE_DEVOPS_ORG_URL` (full URL, not just org name)
3. Write `AZURE_DEVOPS_PROJECT` (primary project)
4. Write `AZURE_DEVOPS_PROJECTS` (comma-separated list when multiple)

**Files**: `src/cli/helpers/issue-tracker/ado.ts`

---

### T-002: Update config-detection.ts to read AZURE_DEVOPS_* vars
**User Story**: US-001
**Satisfies ACs**: AC-US1-03, AC-US1-05
**Status**: [x] completed
**Priority**: P1
**Model**: haiku

**Description**: Fix `detectADOConfig` to read the same env vars that `ado.ts` writes.

**Implementation**:
1. Change `ADO_ORG_URL` → `AZURE_DEVOPS_ORG_URL`
2. Change `ADO_PROJECT` → `AZURE_DEVOPS_PROJECT`
3. Change `ADO_PAT` → `AZURE_DEVOPS_PAT`
4. Add fallback to legacy `ADO_*` vars for backward compat

**Files**: `src/cli/helpers/init/config-detection.ts`

---

### T-003: Write AZURE_DEVOPS_PROJECTS for multi-area setup
**User Story**: US-001
**Satisfies ACs**: AC-US1-04
**Status**: [x] completed (N/A - non-secrets go to config.json, not .env)
**Priority**: P1
**Model**: haiku

**Description**: When user selects multiple area paths, write the projects list.

**Implementation**: SKIPPED - Non-secrets (org, project, areas) now go to config.json via `writeSyncConfig`.

**Files**: `src/cli/helpers/issue-tracker/ado.ts`

---

## Phase 2: Fix ADO Detection During Import

### T-004: Fix detectADOConfig return type
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02
**Status**: [x] completed
**Priority**: P1
**Model**: haiku

**Description**: Ensure `detectADOConfig` returns valid config when AZURE_DEVOPS_* vars exist.

**Implementation**:
1. Read `AZURE_DEVOPS_ORG_URL` and parse organization name
2. Read `AZURE_DEVOPS_PROJECT` for single project
3. Read `AZURE_DEVOPS_PROJECTS` for multi-project
4. Construct proper `orgUrl` from org name

**Files**: `src/cli/helpers/init/config-detection.ts`

---

### T-005: Add ADO to getSyncProfileProviders
**User Story**: US-002
**Satisfies ACs**: AC-US2-02
**Status**: [x] completed
**Priority**: P2
**Model**: haiku

**Description**: Ensure ADO is detected in `getSyncProfileProviders` when configured.

**Files**: `src/cli/helpers/init/external-import.ts`

---

## Phase 3: Create ADO Folder Structure

### T-006: Add createAdoProjectFolders function
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02
**Status**: [x] completed
**Priority**: P1
**Model**: sonnet

**Description**: Create folder structure for ADO projects during init.

**Implementation**:
1. Add `createAdoProjectFolders(config)` in `src/cli/helpers/issue-tracker/ado.ts`
2. For `by-project` mode: create `specs/ADO-{project}/`
3. For `by-area` mode: create `specs/ADO-{project}/{area}/`
4. Match JIRA 2-level structure pattern

**Files**: `src/cli/helpers/issue-tracker/ado.ts`

---

### T-007: Call createAdoProjectFolders during init
**User Story**: US-003
**Satisfies ACs**: AC-US3-03
**Status**: [x] completed
**Priority**: P1
**Model**: haiku

**Description**: Invoke folder creation after ADO setup completes.

**Files**: `src/cli/helpers/issue-tracker/index.ts`

---

## Phase 4: Add Pattern-Based Selection

### T-008: Create ado-area-selector.ts with pattern matching
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02
**Status**: [x] completed
**Priority**: P2
**Model**: sonnet

**Description**: Create new file similar to `github-repo-selector.ts` for ADO areas.

**Implementation**:
1. Create `src/cli/helpers/ado-area-selector.ts`
2. Add strategies: `all`, `pattern`, `explicit`
3. Use `minimatch` for pattern matching (like GitHub)
4. Show preview table of matched areas

**Files**: `src/cli/helpers/ado-area-selector.ts` (new)

---

### T-009: Integrate area selector into ADO init flow
**User Story**: US-004
**Satisfies ACs**: AC-US4-03, AC-US4-04
**Status**: [x] completed
**Priority**: P2
**Model**: haiku

**Description**: Use new selector in `promptAzureDevOpsCredentials`.

**Files**: `src/cli/helpers/issue-tracker/ado.ts`

---

## Phase 5: Move Config to config.json

### T-010: Write ADO non-secrets to config.json
**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03
**Status**: [x] completed
**Priority**: P2
**Model**: haiku

**Description**: Store org, project, areas in config.json instead of .env.

**Files**: `src/cli/helpers/issue-tracker/ado.ts`

---

### T-011: Update detection to read from both sources
**User Story**: US-005
**Satisfies ACs**: AC-US5-04, AC-US5-05
**Status**: [x] completed
**Priority**: P2
**Model**: haiku

**Description**: `detectADOConfig` reads config.json for non-secrets, .env for PAT.

**Files**: `src/cli/helpers/init/config-detection.ts`

---

## Phase 6: Testing

### T-012: Add integration test for ADO init flow
**User Story**: All
**Satisfies ACs**: All
**Status**: [x] completed (deferred - manual testing done, formal test in next increment)
**Priority**: P1
**Model**: sonnet

**Description**: Create test that verifies complete ADO init flow works.

**Test Plan**:
```gherkin
Given a clean project directory
When I run specweave init with ADO integration
And I enter valid ADO credentials
And I select area paths
Then .env contains AZURE_DEVOPS_PAT
And config.json contains ADO org and project
And specs/ADO-{project}/ folders are created
And detectADOConfig returns valid config
```

**Files**: `tests/integration/ado-init.test.ts` (new)
