---
increment: 0066-multi-project-jira-ado-init
feature_id: FS-066
type: feature
status: completed
created: 2025-11-26T14:00:00Z
---

# Multi-Project JIRA/ADO Import During Init

## Problem Statement

Currently `specweave init` only imports from a single JIRA project or ADO project. The infrastructure for multi-project support exists (2-level folder structure, board/area path selection helpers), but it's not wired into the init flow.

**Current Gap:**
- `external-import.ts` lines 410-426 pass simple JIRA/ADO config without `projects[]` or `boardMapping`
- `jira-board-selection.ts` and `ado-area-selection.ts` exist but aren't called during init
- Users with multiple JIRA projects must manually configure after init

## User Stories

### US-001: Multi-Project JIRA Import
**As a** user with multiple JIRA projects,
**I want** to select which projects to import during init,
**So that** items from all my projects are organized in separate folders.

**Acceptance Criteria:**
- [x] **AC-US1-01**: Init detects available JIRA projects and shows count
- [x] **AC-US1-02**: User can choose organization strategy (simple/by-project/by-board)
- [x] **AC-US1-03**: "By project" shows checkbox to select which projects
- [x] **AC-US1-04**: Selected projects create `specs/JIRA-{KEY}/` folder structure
- [x] **AC-US1-05**: Sync profile stores multi-project config for future syncs

### US-002: Multi-Area ADO Import
**As a** user with ADO area paths,
**I want** to select area paths to import during init,
**So that** work items are organized by team/area in separate folders.

**Acceptance Criteria:**
- [x] **AC-US2-01**: Init detects ADO project structure (area paths, teams)
- [x] **AC-US2-02**: User can choose organization strategy (simple/by-area/by-team)
- [x] **AC-US2-03**: "By area" shows checkbox to select which area paths
- [x] **AC-US2-04**: Selected areas create `specs/ADO-{Area}/` folder structure
- [x] **AC-US2-05**: Sync profile stores area path config for future syncs

### US-003: Smart Defaults Based on Structure
**As a** user,
**I want** smart defaults based on my project structure,
**So that** I don't have to think about organization strategy.

**Acceptance Criteria:**
- [x] **AC-US3-01**: 1 JIRA project → default "simple"
- [x] **AC-US3-02**: 2-5 JIRA projects → default "by-project"
- [x] **AC-US3-03**: 1 project with many boards → suggest "by-board"
- [x] **AC-US3-04**: ADO with multiple area paths → default "by-area"
- [x] **AC-US3-05**: Show item counts per project/area to help user decide

## Design: Optimal UX

### Principle: Minimum Prompts, Maximum Value

**JIRA Flow:**
```
🔗 Connecting to JIRA (company.atlassian.net)...
   Found 3 projects: CORE (245 issues), MOBILE (89), INFRA (12)

📋 JIRA Import Organization:
   ○ All projects → single folder (simple)
   ● Each project → separate folder (recommended)
   ○ Map by boards (advanced - for enterprise)

[If "Each project" selected]
   Select projects to import:
   [x] CORE (245 issues)
   [x] MOBILE (89 issues)
   [ ] INFRA (12 issues)
```

**ADO Flow:**
```
🔷 Connecting to Azure DevOps...
   Project "MyProduct" has 4 area paths

🗂️ ADO Import Organization:
   ○ All work → single folder (simple)
   ● Each area path → separate folder (recommended)
   ○ Map by teams (advanced)

[If "area path" selected]
   Select area paths:
   [x] MyProduct\Frontend (156 items)
   [x] MyProduct\Backend (203 items)
   [ ] MyProduct\Legacy (45 items)
```

### Organization Strategies

| Strategy | JIRA | ADO | Folder Structure |
|----------|------|-----|------------------|
| Simple | All in one | Root level | `specs/default/` |
| By Container | Per project | Per area path | `specs/JIRA-CORE/`, `specs/ADO-Frontend/` |
| Advanced | Per board | Per team | `specs/JIRA-CORE/fe/`, `specs/ADO-MyProduct/frontend/` |

## Technical Design

### 1. New Helper Functions in `external-import.ts`

```typescript
// Orchestrates JIRA multi-project selection
async function promptJiraOrganizationSetup(
  jiraConfig: JiraConfig,
  targetDir: string
): Promise<JiraImportSetup>

// Orchestrates ADO multi-area selection
async function promptAdoOrganizationSetup(
  adoConfig: ADOConfig,
  targetDir: string
): Promise<AdoImportSetup>
```

### 2. Updated Coordinator Config

```typescript
interface CoordinatorConfig {
  // Existing...
  jira?: {
    host: string;
    email: string;
    apiToken: string;
    // NEW: Multi-project support
    projects?: string[];
    boardMapping?: JiraBoardMappingConfig;
  };
  ado?: {
    orgUrl: string;
    project: string;
    pat: string;
    // NEW: Multi-area support
    areaPaths?: string[];
    areaPathMapping?: AdoAreaPathMappingConfig;
  };
}
```

### 3. Wire Into Init Flow

```typescript
// In external-import.ts, after time range selection:

// JIRA multi-project setup
if (jira) {
  const jiraSetup = await promptJiraOrganizationSetup(jira, targetDir);
  coordinatorConfig.jira = {
    ...coordinatorConfig.jira,
    projects: jiraSetup.projects,
    boardMapping: jiraSetup.boardMapping,
  };
}

// ADO multi-area setup
if (ado) {
  const adoSetup = await promptAdoOrganizationSetup(ado, targetDir);
  coordinatorConfig.ado = {
    ...coordinatorConfig.ado,
    areaPaths: adoSetup.areaPaths,
    areaPathMapping: adoSetup.areaPathMapping,
  };
}
```

### 4. Reuse Existing Helpers

- `promptOrganizationStrategy()` from `jira-board-selection.ts`
- `promptBoardSelection()` from `jira-board-selection.ts`
- `promptAdoOrganizationStrategy()` from `ado-area-selection.ts`
- `promptAreaPathSelection()` from `ado-area-selection.ts`

## Out of Scope

- Automatic project discovery without user confirmation
- Cross-platform deduplication (same item in JIRA and GitHub)
- Migration from existing single-project to multi-project setup

## Files to Modify

1. `src/cli/helpers/init/external-import.ts` - Main integration point
2. `src/importers/import-coordinator.ts` - Handle multi-project configs
3. `src/core/types/sync-profile.ts` - Already has types, may need updates
4. `src/cli/helpers/issue-tracker/jira-board-selection.ts` - May need project fetching
5. `src/cli/helpers/issue-tracker/ado-area-selection.ts` - May need area path fetching

## Dependencies

- JIRA API access for project/board listing
- ADO API access for area path listing
- Existing 2-level folder structure in item-converter.ts
