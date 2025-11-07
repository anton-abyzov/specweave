# Azure DevOps vs Jira: Team/Project Mapping Architecture

**Date**: 2025-11-07
**Issue**: Current sync profiles don't correctly map ADO Teams and Jira Projects/Components
**Impact**: Incorrect folder structure and sync behavior for multi-team projects

---

## The Critical Difference

### Azure DevOps Structure (REAL Teams)

```
Organization: easychamp
└── Project: League Scheduler
    ├── Team: "League Scheduler Team" → Area Path: "League Scheduler"
    │   └── Folder: .specweave/docs/internal/specs/league-scheduler-team/
    ├── Team: "Platform Engineering Team" → Area Path: "League Scheduler\Platform Engineering Team"
    │   └── Folder: .specweave/docs/internal/specs/platform-engineering-team/
    └── Team: "QA Team" → Area Path: "League Scheduler\QA Team"
        └── Folder: .specweave/docs/internal/specs/qa-team/
```

**Key Facts**:
- ✅ Teams are REAL entities in ADO with distinct configurations
- ✅ Multiple teams exist within ONE project
- ✅ Each team has its own Area Path (hierarchical: `Project\Team`)
- ✅ Comma-separated team names = multiple folder paths
- ✅ Work items belong to specific teams via Area Path field

**Example from screenshot**:
```
Organization: easychamp
Project: League Scheduler
Teams:
  - League Scheduler Team (Default, 1 member)
  - Platform Engineering Team (1 member)
```

**API Endpoint**: `GET https://dev.azure.com/{org}/_apis/projects/{project}/teams?api-version=7.1`

---

### Jira Structure (Projects OR Components as Team Proxies)

Jira has NO explicit "Team" concept like ADO. Instead, teams are simulated using either:

#### Strategy 1: Project per Team

```
Site: mycompany.atlassian.net
├── Project: FRONTEND (Frontend Team)
│   └── Folder: .specweave/docs/internal/specs/frontend/
├── Project: BACKEND (Backend Team)
│   └── Folder: .specweave/docs/internal/specs/backend/
└── Project: QA (QA Team)
    └── Folder: .specweave/docs/internal/specs/qa/
```

**Pros**:
- ✅ Simpler (1 project = 1 team)
- ✅ Clear separation (each team has own workflow, permissions)
- ✅ Works with Jira Free/Standard

**Cons**:
- ❌ More projects to manage
- ❌ Cross-team coordination harder

#### Strategy 2: Shared Project with Components

```
Site: mycompany.atlassian.net
└── Project: PRODUCT (Shared project)
    ├── Component: "Frontend" (simulates team)
    │   └── Folder: .specweave/docs/internal/specs/frontend/
    ├── Component: "Backend" (simulates team)
    │   └── Folder: .specweave/docs/internal/specs/backend/
    └── Component: "QA" (simulates team)
        └── Folder: .specweave/docs/internal/specs/qa/
```

**Pros**:
- ✅ One project (fewer admin overhead)
- ✅ Easier cross-team visibility
- ✅ Single backlog

**Cons**:
- ❌ Components are not full teams (just labels)
- ❌ Harder to enforce team permissions

#### Strategy 3: Advanced Roadmaps (Premium/Enterprise)

```
Site: mycompany.atlassian.net
└── Project: PRODUCT
    ├── Jira Advanced Roadmaps → Custom hierarchy
    │   ├── Team: Frontend
    │   ├── Team: Backend
    │   └── Team: QA
    └── Uses custom fields/filters to distinguish teams
```

**Pros**:
- ✅ True team support (like ADO)
- ✅ Advanced planning capabilities

**Cons**:
- ❌ Requires Premium or Enterprise plan
- ❌ More complex setup

---

## Comparison Table

| Aspect | Azure DevOps | Jira |
|--------|--------------|------|
| **Organization Level** | 1 Organization = 1 company | 1 Site = 1 company |
| **Project Level** | 1 Project = Major product/portfolio | 1 or Multiple Projects (depends on strategy) |
| **Team Concept** | ✅ **REAL** Teams (explicit entities) | ❌ **NO** explicit teams (use Projects or Components) |
| **Team Mapping** | Team Name → Area Path | Project Name OR Component Name |
| **Folder Structure** | Team Name = folder name | Project Name OR Component Name = folder name |
| **Comma-separated Teams** | Multiple teams in 1 project | Multiple projects OR multiple components in 1 project |
| **API Discovery** | `GET /{org}/_apis/projects/{project}/teams` | No teams API (list projects or components) |

---

## Current Implementation Gap

### What We Have Now (sync-profile.ts lines 19-31)

```typescript
export interface JiraConfig {
  domain: string;
  projectKey: string;  // ← Single project only!
  issueType?: 'Epic' | 'Story' | 'Task';
}

export interface AdoConfig {
  organization: string;
  project: string;
  workItemType?: 'Epic' | 'Feature' | 'User Story';
  areaPath?: string;  // ← Single areaPath only!
  iterationPath?: string;
}
```

### What We NEED

```typescript
export interface JiraConfig {
  domain: string;

  // Strategy 1: Multiple projects (one per team)
  projects?: string[];  // ["FRONTEND", "BACKEND", "QA"]

  // Strategy 2: Shared project with components
  projectKey?: string;  // "PRODUCT"
  components?: string[];  // ["Frontend", "Backend", "QA"]

  // Common
  issueType?: 'Epic' | 'Story' | 'Task';
  strategy: 'project-per-team' | 'shared-project-with-components';
}

export interface AdoConfig {
  organization: string;
  project: string;  // Single project (ADO structure)

  // Multiple teams within project
  teams?: string[];  // ["League Scheduler Team", "Platform Engineering Team", "QA Team"]

  // Optional: Explicit area paths (auto-generated from teams if not provided)
  areaPaths?: Record<string, string>;  // { "league-scheduler-team": "League Scheduler\\League Scheduler Team" }

  workItemType?: 'Epic' | 'Feature' | 'User Story';
  iterationPath?: string;
}
```

---

## Folder Structure Mapping

### Azure DevOps

**Config**:
```json
{
  "organization": "easychamp",
  "project": "League Scheduler",
  "teams": ["League Scheduler Team", "Platform Engineering Team", "QA Team"]
}
```

**Generated Folders**:
```
.specweave/docs/internal/specs/
├── league-scheduler-team/
│   └── spec-001-core-feature.md
├── platform-engineering-team/
│   └── spec-001-platform-api.md
└── qa-team/
    └── spec-001-automation.md
```

**Area Paths** (auto-generated):
```
"League Scheduler" → default team
"League Scheduler\\Platform Engineering Team" → platform team
"League Scheduler\\QA Team" → QA team
```

---

### Jira (Strategy 1: Project per Team)

**Config**:
```json
{
  "domain": "mycompany.atlassian.net",
  "strategy": "project-per-team",
  "projects": ["FRONTEND", "BACKEND", "QA"]
}
```

**Generated Folders**:
```
.specweave/docs/internal/specs/
├── frontend/
│   └── spec-001-ui-components.md
├── backend/
│   └── spec-001-api-v2.md
└── qa/
    └── spec-001-e2e-tests.md
```

---

### Jira (Strategy 2: Shared Project with Components)

**Config**:
```json
{
  "domain": "mycompany.atlassian.net",
  "strategy": "shared-project-with-components",
  "projectKey": "PRODUCT",
  "components": ["Frontend", "Backend", "QA"]
}
```

**Generated Folders**:
```
.specweave/docs/internal/specs/
├── frontend/
│   └── spec-001-ui-components.md
├── backend/
│   └── spec-001-api-v2.md
└── qa/
    └── spec-001-e2e-tests.md
```

**Jira Components** (assigned to issues):
```
Epic PRODUCT-123: Add user authentication
└── Component: Frontend
```

---

## Implementation Plan

### Step 1: Update Type Definitions

**File**: `src/core/types/sync-profile.ts`

```typescript
// NEW: Jira strategy enum
export type JiraStrategy = 'project-per-team' | 'shared-project-with-components';

// UPDATED: Jira config with strategy support
export interface JiraConfig {
  domain: string;
  issueType?: 'Epic' | 'Story' | 'Task';

  // Strategy selection
  strategy: JiraStrategy;

  // Strategy 1: Multiple projects
  projects?: string[];  // ["FRONTEND", "BACKEND", "QA"]

  // Strategy 2: Shared project with components
  projectKey?: string;  // "PRODUCT"
  components?: string[];  // ["Frontend", "Backend", "QA"]
}

// UPDATED: ADO config with team support
export interface AdoConfig {
  organization: string;
  project: string;
  workItemType?: 'Epic' | 'Feature' | 'User Story';

  // NEW: Team support
  teams?: string[];  // ["Team A", "Team B", "Team C"]
  areaPaths?: Record<string, string>;  // Auto-generated from teams if not provided

  iterationPath?: string;
}
```

### Step 2: Validation Logic

**File**: `src/core/sync/profile-validator.ts` (new file)

```typescript
export function validateJiraConfig(config: JiraConfig): ValidationResult {
  const errors: string[] = [];

  if (!config.strategy) {
    errors.push('Jira strategy is required (project-per-team or shared-project-with-components)');
  }

  if (config.strategy === 'project-per-team') {
    if (!config.projects || config.projects.length === 0) {
      errors.push('projects[] is required for project-per-team strategy');
    }
    if (config.projectKey || config.components) {
      errors.push('projectKey and components are not allowed with project-per-team strategy');
    }
  }

  if (config.strategy === 'shared-project-with-components') {
    if (!config.projectKey) {
      errors.push('projectKey is required for shared-project-with-components strategy');
    }
    if (!config.components || config.components.length === 0) {
      errors.push('components[] is required for shared-project-with-components strategy');
    }
    if (config.projects) {
      errors.push('projects[] is not allowed with shared-project-with-components strategy');
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateAdoConfig(config: AdoConfig): ValidationResult {
  const errors: string[] = [];

  if (!config.organization) {
    errors.push('organization is required');
  }

  if (!config.project) {
    errors.push('project is required');
  }

  if (config.teams && config.teams.length > 0) {
    // Validate team names (no empty strings)
    const emptyTeams = config.teams.filter(t => !t.trim());
    if (emptyTeams.length > 0) {
      errors.push('Team names cannot be empty');
    }
  }

  return { valid: errors.length === 0, errors };
}
```

### Step 3: Folder Structure Generator

**File**: `src/core/sync/folder-mapper.ts` (new file)

```typescript
import path from 'path';
import { slugify } from '../utils/string-utils';

export function getSpecsFoldersForProfile(profile: SyncProfile): string[] {
  const folders: string[] = [];

  if (profile.provider === 'ado') {
    const config = profile.config as AdoConfig;

    if (config.teams && config.teams.length > 0) {
      // Multiple teams → multiple folders
      for (const team of config.teams) {
        const folderName = slugify(team);  // "Platform Engineering Team" → "platform-engineering-team"
        folders.push(`.specweave/docs/internal/specs/${folderName}`);
      }
    } else {
      // Single project, no teams specified → default folder
      const folderName = slugify(config.project);
      folders.push(`.specweave/docs/internal/specs/${folderName}`);
    }
  }

  if (profile.provider === 'jira') {
    const config = profile.config as JiraConfig;

    if (config.strategy === 'project-per-team') {
      // Multiple projects → multiple folders
      for (const projectKey of config.projects || []) {
        const folderName = slugify(projectKey);  // "FRONTEND" → "frontend"
        folders.push(`.specweave/docs/internal/specs/${folderName}`);
      }
    } else if (config.strategy === 'shared-project-with-components') {
      // Components → multiple folders
      for (const component of config.components || []) {
        const folderName = slugify(component);  // "Frontend" → "frontend"
        folders.push(`.specweave/docs/internal/specs/${folderName}`);
      }
    } else {
      // Fallback: single project → single folder
      const folderName = slugify(config.projectKey || 'default');
      folders.push(`.specweave/docs/internal/specs/${folderName}`);
    }
  }

  if (profile.provider === 'github') {
    const config = profile.config as GitHubConfig;
    const folderName = slugify(config.repo);  // "specweave" → "specweave"
    folders.push(`.specweave/docs/internal/specs/${folderName}`);
  }

  return folders;
}

export function getAreaPathForTeam(project: string, team: string): string {
  // ADO Area Path format: "Project\\Team"
  // Special case: If team name is same as project, use just project name
  if (team.toLowerCase().includes(project.toLowerCase())) {
    return project;
  }
  return `${project}\\${team}`;
}
```

### Step 4: Update ADO Client

**File**: `plugins/specweave-ado/lib/ado-client-v2.ts`

```typescript
export class AdoClientV2 {
  private organization: string;
  private project: string;
  private teams: string[];
  private areaPaths: Record<string, string>;

  constructor(profile: SyncProfile, personalAccessToken: string) {
    const config = profile.config as AdoConfig;
    this.organization = config.organization;
    this.project = config.project;
    this.teams = config.teams || [];

    // Auto-generate area paths if not provided
    if (config.areaPaths) {
      this.areaPaths = config.areaPaths;
    } else {
      this.areaPaths = {};
      for (const team of this.teams) {
        const folderName = slugify(team);
        this.areaPaths[folderName] = getAreaPathForTeam(this.project, team);
      }
    }
  }

  /**
   * Create epic for specific team
   */
  async createEpicForTeam(teamFolderName: string, request: CreateWorkItemRequest): Promise<WorkItem> {
    const areaPath = this.areaPaths[teamFolderName];
    if (!areaPath) {
      throw new Error(`Unknown team folder: ${teamFolderName}. Available: ${Object.keys(this.areaPaths).join(', ')}`);
    }

    return this.createEpic({
      ...request,
      areaPath,
    });
  }

  /**
   * List teams in project
   */
  async listTeams(): Promise<Team[]> {
    const url = `/_apis/projects/${this.project}/teams?api-version=7.1`;
    const response = await this.request('GET', url);
    return response.value || [];
  }
}
```

### Step 5: Update Jira Client

**File**: `plugins/specweave-jira/lib/jira-client-v2.ts` (new file)

```typescript
export class JiraClientV2 {
  private domain: string;
  private strategy: JiraStrategy;
  private projects: string[];
  private projectKey?: string;
  private components: string[];

  constructor(profile: SyncProfile, credentials: JiraCredentials) {
    const config = profile.config as JiraConfig;
    this.domain = config.domain;
    this.strategy = config.strategy;

    if (config.strategy === 'project-per-team') {
      this.projects = config.projects || [];
    } else {
      this.projectKey = config.projectKey;
      this.components = config.components || [];
    }
  }

  /**
   * Create epic for specific team (project or component)
   */
  async createEpicForTeam(teamFolderName: string, request: JiraIssueCreate): Promise<JiraIssue> {
    if (this.strategy === 'project-per-team') {
      // Find matching project
      const projectKey = this.projects.find(p => slugify(p) === teamFolderName);
      if (!projectKey) {
        throw new Error(`Unknown team folder: ${teamFolderName}`);
      }

      return this.createIssue(request, projectKey);
    } else {
      // Shared project with component
      const component = this.components.find(c => slugify(c) === teamFolderName);
      if (!component) {
        throw new Error(`Unknown team folder: ${teamFolderName}`);
      }

      // Add component to issue
      return this.createIssue({
        ...request,
        customFields: {
          ...request.customFields,
          components: [{ name: component }],
        },
      }, this.projectKey!);
    }
  }
}
```

### Step 6: Update Profile Creation Flow

**File**: `src/cli/commands/sync-profile-create.ts`

Add interactive prompts for ADO teams and Jira strategy:

```typescript
// ADO: Ask for teams
if (provider === 'ado') {
  const hasTeams = await confirm({ message: 'Does this project have multiple teams?' });

  if (hasTeams) {
    const teamsInput = await input({
      message: 'Enter team names (comma-separated):',
      validate: (input) => input.trim().length > 0 ? true : 'Team names are required',
    });

    const teams = teamsInput.split(',').map(t => t.trim()).filter(Boolean);
    config.teams = teams;

    console.log(`\n📁 Specs folders will be created for each team:`);
    for (const team of teams) {
      console.log(`   - .specweave/docs/internal/specs/${slugify(team)}/`);
    }
  }
}

// Jira: Ask for strategy
if (provider === 'jira') {
  const strategy = await select({
    message: 'How are teams organized in Jira?',
    choices: [
      { value: 'project-per-team', name: 'Separate project for each team (e.g., FRONTEND, BACKEND, QA)' },
      { value: 'shared-project-with-components', name: 'One project with components for teams (e.g., PRODUCT project with Frontend/Backend/QA components)' },
    ],
  });

  config.strategy = strategy;

  if (strategy === 'project-per-team') {
    const projectsInput = await input({
      message: 'Enter project keys (comma-separated):',
      validate: (input) => input.trim().length > 0 ? true : 'Project keys are required',
    });

    config.projects = projectsInput.split(',').map(p => p.trim()).filter(Boolean);
  } else {
    const projectKey = await input({ message: 'Enter shared project key:' });
    const componentsInput = await input({ message: 'Enter component names (comma-separated):' });

    config.projectKey = projectKey;
    config.components = componentsInput.split(',').map(c => c.trim()).filter(Boolean);
  }
}
```

---

## Testing Strategy

### Unit Tests

1. **Validation Tests** (`tests/unit/sync/profile-validator.test.ts`)
   - Valid ADO config with teams
   - Valid Jira config with project-per-team strategy
   - Valid Jira config with shared-project-with-components strategy
   - Invalid configs (missing required fields)

2. **Folder Mapping Tests** (`tests/unit/sync/folder-mapper.test.ts`)
   - ADO with teams → multiple folders
   - Jira project-per-team → multiple folders
   - Jira shared-project-with-components → multiple folders
   - Folder name slugification

### Integration Tests

1. **ADO Multi-Team** (`tests/integration/ado/multi-team-sync.test.ts`)
   - Create profile with 3 teams
   - List teams from API
   - Create epics in different teams (different area paths)
   - Verify folder structure

2. **Jira Strategy 1** (`tests/integration/jira/project-per-team.test.ts`)
   - Create profile with 3 projects
   - Create epics in different projects
   - Verify folder structure

3. **Jira Strategy 2** (`tests/integration/jira/shared-project-components.test.ts`)
   - Create profile with 1 project + 3 components
   - Create epics with different components
   - Verify folder structure

---

## Migration Guide

### Existing ADO Users

**Before** (single project):
```json
{
  "provider": "ado",
  "config": {
    "organization": "easychamp",
    "project": "League Scheduler",
    "areaPath": "League Scheduler"
  }
}
```

**After** (multi-team):
```json
{
  "provider": "ado",
  "config": {
    "organization": "easychamp",
    "project": "League Scheduler",
    "teams": [
      "League Scheduler Team",
      "Platform Engineering Team",
      "QA Team"
    ]
  }
}
```

**Migration**:
1. Add `teams` array
2. SpecWeave auto-generates area paths: `"League Scheduler\\{Team}"`
3. Folders created: `league-scheduler-team/`, `platform-engineering-team/`, `qa-team/`

### Existing Jira Users

**Before** (single project):
```json
{
  "provider": "jira",
  "config": {
    "domain": "mycompany.atlassian.net",
    "projectKey": "PRODUCT"
  }
}
```

**After** (multi-project OR components):

**Option 1: Project per team**
```json
{
  "provider": "jira",
  "config": {
    "domain": "mycompany.atlassian.net",
    "strategy": "project-per-team",
    "projects": ["FRONTEND", "BACKEND", "QA"]
  }
}
```

**Option 2: Shared project with components**
```json
{
  "provider": "jira",
  "config": {
    "domain": "mycompany.atlassian.net",
    "strategy": "shared-project-with-components",
    "projectKey": "PRODUCT",
    "components": ["Frontend", "Backend", "QA"]
  }
}
```

---

## Summary

| Provider | Team Concept | Config Format | Folder Mapping |
|----------|--------------|---------------|----------------|
| **ADO** | ✅ REAL Teams | `teams: ["Team A", "Team B"]` | `team-a/`, `team-b/` |
| **Jira (Strategy 1)** | ❌ Projects as teams | `projects: ["PROJ-A", "PROJ-B"]` | `proj-a/`, `proj-b/` |
| **Jira (Strategy 2)** | ❌ Components as teams | `projectKey: "MAIN", components: ["Comp A"]` | `comp-a/`, `comp-b/` |
| **GitHub** | ❌ One repo | `owner: "org", repo: "project"` | `project/` |

**Key Takeaway**: ADO has explicit teams (1 project → many teams), Jira uses projects or components to simulate teams.
