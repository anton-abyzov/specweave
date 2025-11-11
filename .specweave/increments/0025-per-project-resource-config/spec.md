# Increment 0025: Per-Project Resource Configuration for ADO and JIRA

**Status**: active
**Type**: feature
**Priority**: P0 (Critical Infrastructure)
**Created**: 2025-11-11
**Estimated Duration**: 1.5 days (11 hours)

---

## Executive Summary

Enable rich per-project configuration where each project can have its own area paths (Azure DevOps) or boards (JIRA). This allows realistic multi-project organization matching real-world structures.

**Problem**: Current implementation supports EITHER multiple projects OR area paths/boards, not BOTH.

**Solution**: Hierarchical per-project configuration using naming convention `{PROVIDER}_{RESOURCE}_{PROJECT}`.

**Impact**: Unblocks real-world multi-project/multi-team setups for ADO and JIRA users.

---

## Problem Statement

### Current Limitation

The validators in `src/utils/external-resource-validator.ts` support:
- ✅ Multiple projects (project-per-team strategy)
- ✅ Area paths (area-path-based strategy)
- ❌ **NOT BOTH** - Each project cannot have its own area paths/boards

**Real-World Need**:
```bash
# Backend project needs different area paths than Frontend
Backend  → API, Database, Cache
Frontend → Web, Admin, Public
Mobile   → iOS, Android, Shared
```

### Target State

```bash
# Azure DevOps - Per-project area paths
AZURE_DEVOPS_PROJECTS=Backend,Frontend,Mobile
AZURE_DEVOPS_AREA_PATHS_Backend=API,Database,Cache
AZURE_DEVOPS_AREA_PATHS_Frontend=Web,Admin,Public
AZURE_DEVOPS_AREA_PATHS_Mobile=iOS,Android,Shared

# JIRA - Per-project boards
JIRA_PROJECTS=BACKEND,FRONTEND,MOBILE
JIRA_BOARDS_BACKEND=123,456      # Sprint + Kanban
JIRA_BOARDS_FRONTEND=789,012     # Sprint + Bug
JIRA_BOARDS_MOBILE=345,678,901   # iOS + Android + Release
```

---

## User Stories

### Epic 1: Azure DevOps Per-Project Configuration

#### US-001: Support per-project area paths (P0, testable)

**As a** DevOps engineer with multiple ADO projects
**I want** each project to have its own area paths
**So that** Backend can use API/Database/Cache while Frontend uses Web/Admin/Public

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Parse `AZURE_DEVOPS_AREA_PATHS_{ProjectName}` env vars (P0, testable)
- [ ] **AC-US1-02**: Validate area paths per project during setup (P0, testable)
- [ ] **AC-US1-03**: Auto-create missing area paths for each project (P0, testable)
- [ ] **AC-US1-04**: Support unlimited projects × unlimited area paths (P0, testable)

#### US-002: Support per-project teams (P1, testable)

**As a** DevOps engineer
**I want** each project to have its own teams
**So that** Backend has Alpha/Beta teams while Frontend has Gamma team

**Acceptance Criteria**:
- [ ] **AC-US2-01**: Parse `AZURE_DEVOPS_TEAMS_{ProjectName}` env vars (P1, testable)
- [ ] **AC-US2-02**: Create teams per project (P1, testable)
- [ ] **AC-US2-03**: Link teams to correct project context (P1, testable)

### Epic 2: JIRA Per-Project Configuration

#### US-003: Support per-project boards (P0, testable)

**As a** JIRA admin with multiple projects
**I want** each project to have its own boards
**So that** Backend uses boards 123/456 while Frontend uses 789/012

**Acceptance Criteria**:
- [ ] **AC-US3-01**: Parse `JIRA_BOARDS_{ProjectKey}` env vars (P0, testable)
- [ ] **AC-US3-02**: Validate boards per project (mixed IDs and names) (P0, testable)
- [ ] **AC-US3-03**: Support unlimited projects × unlimited boards (P0, testable)
- [ ] **AC-US3-04**: Detect board name conflicts across projects (P0, testable)

#### US-004: Context-aware board creation (P1, testable)

**As a** JIRA admin
**I want** boards created in the correct project context
**So that** new boards automatically associate with their project

**Acceptance Criteria**:
- [ ] **AC-US4-01**: Prompt for board type when creating (Scrum/Kanban) (P1, testable)
- [ ] **AC-US4-02**: Auto-link board to project during creation (P1, testable)
- [ ] **AC-US4-03**: Update .env with created board ID (P1, testable)

### Epic 3: Configuration Schema & Validation

#### US-005: Clear configuration documentation (P2, non-testable)

**As a** SpecWeave user
**I want** clear examples of per-project configuration
**So that** I can set up my projects correctly

**Acceptance Criteria**:
- [ ] **AC-US5-01**: Skill docs show per-project examples (P2, non-testable - documentation)
- [ ] **AC-US5-02**: Error messages explain correct format (P2, testable)
- [ ] **AC-US5-03**: Migration guide from simple to rich config (P2, non-testable - documentation)

#### US-006: Graceful edge case handling (P1, testable)

**As a** SpecWeave user
**I want** clear errors for misconfiguration
**So that** I can fix issues quickly

**Acceptance Criteria**:
- [ ] **AC-US6-01**: Detect missing project in per-project var (P1, testable)
- [ ] **AC-US6-02**: Handle empty resource lists gracefully (P1, testable)
- [ ] **AC-US6-03**: Validate naming convention compliance (P1, testable)
- [ ] **AC-US6-04**: Backward compatibility with existing simple configs (P0, testable)

---

## Functional Requirements

### FR-001: Configuration Parsing

**Description**: Parse hierarchical per-project environment variables

**Details**:
- Pattern: `{PROVIDER}_{RESOURCE_TYPE}_{PROJECT_NAME}=value1,value2`
- Providers: `AZURE_DEVOPS`, `JIRA`
- Resource types: `AREA_PATHS`, `TEAMS`, `BOARDS`
- Project names: Match `{PROVIDER}_PROJECTS` values exactly

**Examples**:
```bash
# ADO
AZURE_DEVOPS_PROJECTS=Backend,Frontend
AZURE_DEVOPS_AREA_PATHS_Backend=API,DB
AZURE_DEVOPS_AREA_PATHS_Frontend=Web

# JIRA
JIRA_PROJECTS=BACK,FRONT
JIRA_BOARDS_BACK=123,456
JIRA_BOARDS_FRONT=789
```

### FR-002: Validation Logic

**Description**: Validate per-project resources during `specweave init` or `validate-{ado|jira}` commands

**Validation Rules**:
1. Project name in per-project var MUST exist in `{PROVIDER}_PROJECTS`
2. Resource values MUST be non-empty
3. Naming convention MUST match pattern exactly
4. Backward compatibility: Global vars (no `_{PROJECT}` suffix) still work

**Error Examples**:
```
❌ Invalid project name in AZURE_DEVOPS_AREA_PATHS_InvalidProject
   Project "InvalidProject" not found in AZURE_DEVOPS_PROJECTS

❌ Empty resource list in JIRA_BOARDS_BACKEND
   Must provide at least one board ID or name
```

### FR-003: Resource Creation

**Description**: Auto-create missing resources per project

**Azure DevOps**:
- Area paths: `POST /wit/classificationnodes/areas`
- Teams: `POST /teams`

**JIRA**:
- Boards: Interactive prompt (user selects type, provides name)
- Update .env with created board ID

### FR-004: Folder Organization

**Description**: Organize specs by project and area path/board

**Structure**:
```
.specweave/docs/internal/specs/
├── Backend/
│   ├── API/
│   ├── Database/
│   └── Cache/
├── Frontend/
│   ├── Web/
│   ├── Admin/
│   └── Public/
└── Mobile/
    ├── iOS/
    ├── Android/
    └── Shared/
```

---

## Non-Functional Requirements

### NFR-001: Backward Compatibility (P0)

**Description**: Existing simple configurations continue to work

**Test**: Run validation on legacy `.env` files with no per-project vars
**Target**: 100% compatibility (zero breaking changes)

### NFR-002: Performance (P1)

**Description**: Validation completes quickly even with many projects

**Target**: <5 seconds for 3 projects × 5 resources each (15 total validations)

### NFR-003: Usability (P1)

**Description**: Error messages are clear and actionable

**Example**:
```
❌ Configuration Error

Problem: AZURE_DEVOPS_AREA_PATHS_Backend references unknown project
Solution: Add "Backend" to AZURE_DEVOPS_PROJECTS first

Current:
  AZURE_DEVOPS_PROJECTS=Frontend,Mobile

Expected:
  AZURE_DEVOPS_PROJECTS=Backend,Frontend,Mobile
```

### NFR-004: Scalability (P2)

**Description**: Support unlimited projects and resources

**Target**: No hard-coded limits (tested with 10 projects × 10 resources)

---

## Implementation Plan

### Phase 1: Configuration Parsing (2 hours)

**Create**: `src/utils/config-parser.ts`

**Functions**:
```typescript
// Parse per-project config from .env
parsePerProjectConfig(
  provider: 'azure-devops' | 'jira',
  resourceType: 'area-paths' | 'teams' | 'boards',
  env: Record<string, string>
): Map<string, string[]>

// Example:
// AZURE_DEVOPS_AREA_PATHS_Backend=API,DB
// → Map { "Backend" => ["API", "DB"] }

// Resolve config for specific project with fallback
resolveForProject(
  projectName: string,
  perProjectConfig: Map<string, string[]>,
  globalConfig: string[] | undefined
): string[]

// Example:
// If AZURE_DEVOPS_AREA_PATHS_Backend exists → use it
// Else fallback to AZURE_DEVOPS_AREA_PATHS (global)
```

**Tests**: 10 unit tests (`tests/unit/config-parser.test.ts`)

### Phase 2: Azure DevOps Integration (3 hours)

**Modify**: `src/utils/external-resource-validator.ts`

**Changes in `AzureDevOpsResourceValidator`**:
```typescript
async validateMultipleProjects(projects: string[]): Promise<ValidationResult> {
  for (const projectName of projects) {
    // 1. Validate project exists
    const project = await this.checkProject(projectName);

    // 2. Check per-project area paths (NEW!)
    const areaPathsKey = `AZURE_DEVOPS_AREA_PATHS_${projectName}`;
    const areaPaths = this.env[areaPathsKey]?.split(',');

    if (areaPaths) {
      for (const path of areaPaths) {
        const exists = await this.checkAreaPath(projectName, path);
        if (!exists) {
          await this.createAreaPath(projectName, path);
        }
      }
    }

    // 3. Check per-project teams (NEW!)
    const teamsKey = `AZURE_DEVOPS_TEAMS_${projectName}`;
    const teams = this.env[teamsKey]?.split(',');

    if (teams) {
      for (const team of teams) {
        const exists = await this.checkTeam(projectName, team);
        if (!exists) {
          await this.createTeam(projectName, team);
        }
      }
    }
  }
}
```

**Tests**: 15 unit + 5 integration tests

### Phase 3: JIRA Integration (3 hours)

**Modify**: `src/utils/external-resource-validator.ts`

**Changes in `JiraResourceValidator`**:
```typescript
async validateMultipleProjects(projects: string[]): Promise<ValidationResult> {
  for (const projectKey of projects) {
    // 1. Validate project exists
    const project = await this.checkProject(projectKey);

    // 2. Check per-project boards (NEW!)
    const boardsKey = `JIRA_BOARDS_${projectKey}`;
    const boards = this.env[boardsKey]?.split(',');

    if (boards) {
      for (const boardIdOrName of boards) {
        const exists = await this.checkBoard(boardIdOrName);
        if (!exists) {
          const { action } = await inquirer.prompt([
            {
              type: 'list',
              message: `Board ${boardIdOrName} not found. What to do?`,
              choices: ['Create', 'Select existing', 'Skip']
            }
          ]);

          if (action === 'Create') {
            await this.createBoard(projectKey, boardIdOrName);
          }
        }
      }
    }
  }
}
```

**Tests**: 15 unit + 5 integration tests

### Phase 4: Validation & Error Handling (2 hours)

**Error Messages**:
- Missing project in per-project var
- Empty resource list
- Naming convention violations
- Backward compatibility checks

**Tests**: 10 unit tests for error scenarios

### Phase 5: Documentation (1 hour)

**Update**:
- `plugins/specweave-ado/skills/ado-resource-validator/SKILL.md`
- `plugins/specweave-jira/skills/jira-resource-validator/SKILL.md`
- Add per-project examples
- Migration guide from simple to rich config

---

## Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Backward Compatibility | 100% | All existing configs work |
| Configuration Flexibility | Unlimited | Test 10 projects × 10 resources |
| Validation Performance | <5s | Time 3 projects × 5 resources |
| Error Rate | <1% | Monitor production usage |
| User Satisfaction | 95%+ | Survey after release |

---

## Out of Scope

- ❌ Automatic migration from simple to rich config (manual for now)
- ❌ UI for configuration (CLI/text only)
- ❌ Real-time sync of config changes (requires restart)
- ❌ Per-project configuration for other providers (GitHub only has repos, no sub-resources)

---

## Dependencies

**None** - This increment is self-contained

**Enables**:
- Future: Per-project sync schedules
- Future: Per-project notification settings
- Future: Per-project access control

---

## References

**Design Document**: `.specweave/increments/0022-multi-repo-init-ux/reports/PER-PROJECT-CONFIGURATION-DESIGN.md`

**Related Files**:
- `src/utils/external-resource-validator.ts` (main implementation)
- `src/cli/helpers/issue-tracker/ado.ts` (ADO credential prompts)
- `src/cli/helpers/issue-tracker/jira.ts` (JIRA credential prompts)

---

**Estimated Total Effort**: 11 hours (1.5 days)
**Complexity**: Medium (config parsing + API integration)
**Risk**: Low (isolated changes, full test coverage)
