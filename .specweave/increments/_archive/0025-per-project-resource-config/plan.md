# Implementation Plan: Increment 0025 - Per-Project Resource Configuration

**Increment**: 0025-per-project-resource-config
**Status**: active
**Type**: feature
**Priority**: P0 (Critical Infrastructure)
**Estimated Duration**: 1.5 days (11 hours)

---

## Architecture Overview

**Problem**: Current validators support EITHER multiple projects OR area paths/boards, not BOTH.

**Solution**: Add hierarchical per-project configuration parsing with naming convention `{PROVIDER}_{RESOURCE}_{PROJECT}`.

**Key Architectural Decision**: Extend existing `external-resource-validator.ts` rather than creating separate config parser module. This keeps all validation logic in one place and maintains backward compatibility.

---

## Architecture Decision Records

### ADR-0025-01: Extend Existing Validator vs New Config Parser

**Decision**: Extend `AzureDevOpsResourceValidator` and `JiraResourceValidator` classes directly.

**Context**: Two options considered:
1. Create separate `ConfigParser` utility class
2. Extend existing validator classes

**Rationale**:
- ✅ Validators already have `.env` loading logic
- ✅ Validators already parse project lists
- ✅ Per-project parsing is validation logic (not generic config)
- ✅ Keeps all ADO/JIRA logic together (cohesion)
- ✅ Easier to test (fewer dependencies)

**Consequences**:
- Each validator implements its own per-project parsing
- Slightly more code duplication (acceptable for 2 providers)
- Clear separation between ADO and JIRA logic

---

### ADR-0025-02: Environment Variable Naming Convention

**Decision**: Use `{PROVIDER}_{RESOURCE_TYPE}_{PROJECT_NAME}` format.

**Examples**:
```bash
AZURE_DEVOPS_AREA_PATHS_Backend=API,Database,Cache
JIRA_BOARDS_FRONTEND=123,456
```

**Alternatives Considered**:
1. JSON in single env var: `AZURE_DEVOPS_CONFIG='{"Backend":{"areaPaths":["API"]}}'`
   - ❌ Complex parsing, error-prone, hard to read
2. Separate config file: `.specweave/ado-projects.json`
   - ❌ Two sources of truth (.env + config file)
3. Prefix-based: `BACKEND_AZURE_DEVOPS_AREA_PATHS=API,Database`
   - ❌ Unclear precedence (provider or project first?)

**Benefits**:
- ✅ Clear hierarchical structure
- ✅ Easy to validate (regex match)
- ✅ Human-readable
- ✅ Backward compatible (no `_{PROJECT}` suffix = global config)

---

### ADR-0025-03: Backward Compatibility Strategy

**Decision**: Fallback to global config if per-project config missing.

**Logic**:
```typescript
// Check for per-project config first
const areaPathsKey = `AZURE_DEVOPS_AREA_PATHS_${projectName}`;
const areaPaths = env[areaPathsKey];

// Fallback to global if per-project missing
if (!areaPaths) {
  areaPaths = env.AZURE_DEVOPS_AREA_PATHS;
}
```

**Result**: Existing simple configs continue to work with ZERO changes.

---

## Technical Architecture

### System Context

```
┌─────────────────────────────────────────────────────────────┐
│                      SpecWeave Init                         │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │         External Resource Validators                  │ │
│  │                                                       │ │
│  │  ┌──────────────────────────────────────────────┐   │ │
│  │  │   AzureDevOpsResourceValidator               │   │ │
│  │  │                                              │   │ │
│  │  │  - parsePerProjectConfig() (NEW)            │   │ │
│  │  │  - validateMultipleProjects() (ENHANCED)    │   │ │
│  │  │  - checkAreaPath() (NEW)                    │   │ │
│  │  │  - createAreaPath() (NEW)                   │   │ │
│  │  │  - checkTeam() (NEW)                        │   │ │
│  │  │  - createTeam() (NEW)                       │   │ │
│  │  └──────────────────────────────────────────────┘   │ │
│  │                                                       │ │
│  │  ┌──────────────────────────────────────────────┐   │ │
│  │  │   JiraResourceValidator                      │   │ │
│  │  │                                              │   │ │
│  │  │  - parsePerProjectConfig() (NEW)            │   │ │
│  │  │  - validateMultipleProjects() (ENHANCED)    │   │ │
│  │  │  - checkBoard() (ENHANCED)                  │   │ │
│  │  │  - createBoard() (ENHANCED)                 │   │ │
│  │  │  - promptSelectBoard() (NEW)                │   │ │
│  │  └──────────────────────────────────────────────┘   │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
           ↓                           ↓
    Azure DevOps                   JIRA
    REST API v7.0              REST API v3
```

---

## API Integration Details

### Azure DevOps REST API v7.0

**Base URL**: `https://dev.azure.com/{organization}/_apis/`

**Authentication**: Basic Auth with PAT
```typescript
const auth = Buffer.from(`:${this.pat}`).toString('base64');
const headers = { 'Authorization': `Basic ${auth}` };
```

**Endpoints**:

1. **Check Area Path Exists**
   - Method: `GET`
   - URL: `wit/classificationnodes/areas?path={areaPath}&api-version=7.0`
   - Success: 200 with area node object
   - Not Found: 404 error

2. **Create Area Path**
   - Method: `POST`
   - URL: `wit/classificationnodes/areas?api-version=7.0`
   - Body: `{ "name": "{areaPathName}" }`
   - Success: 200 with created node

3. **Check Team Exists**
   - Method: `GET`
   - URL: `projects/{project}/teams/{teamName}?api-version=7.0`
   - Success: 200 with team object
   - Not Found: 404 error

4. **Create Team**
   - Method: `POST`
   - URL: `projects/{project}/teams?api-version=7.0`
   - Body: `{ "name": "{teamName}" }`
   - Success: 200 with created team

**Error Handling**:
```typescript
try {
  const { stdout } = await execAsync(curlCommand);
  const response = JSON.parse(stdout);
  return response;
} catch (error: any) {
  if (error.message.includes('curl: (22)')) {
    return null; // Resource not found
  }
  throw new Error(`API Error: ${error.message}`);
}
```

---

### JIRA REST API v3

**Base URL**: `https://{domain}/rest/api/3/`

**Authentication**: Basic Auth with API token
```typescript
const auth = Buffer.from(`${this.email}:${this.apiToken}`).toString('base64');
const headers = { 'Authorization': `Basic ${auth}` };
```

**Endpoints**:

1. **Check Board Exists**
   - Method: `GET`
   - URL: `board/{boardId}` (if numeric) or `board?name={boardName}` (if string)
   - Success: 200 with board object
   - Not Found: 404 error

2. **Create Board**
   - Method: `POST`
   - URL: `board`
   - Body:
     ```json
     {
       "name": "{boardName}",
       "type": "scrum" | "kanban",
       "filterId": {filterId},
       "location": {
         "type": "project",
         "projectKeyOrId": "{projectKey}"
       }
     }
     ```
   - Success: 200 with created board

3. **List Boards for Project**
   - Method: `GET`
   - URL: `board?projectKeyOrId={projectKey}`
   - Success: 200 with boards array

**Board Creation Flow**:
```typescript
// 1. Prompt user for board type
const { boardType } = await inquirer.prompt([{
  type: 'list',
  name: 'boardType',
  message: 'Select board type:',
  choices: ['scrum', 'kanban']
}]);

// 2. Create filter first (required for board)
const filter = await this.createFilter(projectKey, boardName);

// 3. Create board with filter
const board = await this.createBoard(boardName, boardType, filter.id, projectKey);

// 4. Update .env with board ID
await this.updateEnv({ [`JIRA_BOARDS_${projectKey}`]: board.id });
```

---

## Implementation Phases

### Phase 1: Per-Project Config Parsing (2 hours)

**Goal**: Add parsing logic to both validators

**Changes to `AzureDevOpsResourceValidator`**:

```typescript
/**
 * Parse per-project area paths from .env
 * Example: AZURE_DEVOPS_AREA_PATHS_Backend=API,Database,Cache
 */
private parsePerProjectAreaPaths(): Map<string, string[]> {
  const env = this.loadEnv();
  const result = new Map<string, string[]>();
  const pattern = /^AZURE_DEVOPS_AREA_PATHS_(.+)$/;

  Object.keys(env).forEach(key => {
    const match = key.match(pattern);
    if (match) {
      const projectName = match[1];
      const paths = env[key].split(',').map(p => p.trim()).filter(Boolean);
      if (paths.length > 0) {
        result.set(projectName, paths);
      }
    }
  });

  return result;
}

/**
 * Parse per-project teams from .env
 * Example: AZURE_DEVOPS_TEAMS_Backend=Alpha,Beta
 */
private parsePerProjectTeams(): Map<string, string[]> {
  const env = this.loadEnv();
  const result = new Map<string, string[]>();
  const pattern = /^AZURE_DEVOPS_TEAMS_(.+)$/;

  Object.keys(env).forEach(key => {
    const match = key.match(pattern);
    if (match) {
      const projectName = match[1];
      const teams = env[key].split(',').map(t => t.trim()).filter(Boolean);
      if (teams.length > 0) {
        result.set(projectName, teams);
      }
    }
  });

  return result;
}

/**
 * Resolve configuration for specific project with fallback
 */
private resolveAreaPathsForProject(
  projectName: string,
  perProjectConfig: Map<string, string[]>,
  globalConfig?: string[]
): string[] {
  // Per-project config takes precedence
  if (perProjectConfig.has(projectName)) {
    return perProjectConfig.get(projectName)!;
  }

  // Fallback to global config
  return globalConfig || [];
}
```

**Changes to `JiraResourceValidator`**:

```typescript
/**
 * Parse per-project boards from .env
 * Example: JIRA_BOARDS_BACKEND=123,456
 */
private parsePerProjectBoards(): Map<string, string[]> {
  const env = this.loadEnv();
  const result = new Map<string, string[]>();
  const pattern = /^JIRA_BOARDS_(.+)$/;

  Object.keys(env).forEach(key => {
    const match = key.match(pattern);
    if (match) {
      const projectKey = match[1];
      const boards = env[key].split(',').map(b => b.trim()).filter(Boolean);
      if (boards.length > 0) {
        result.set(projectKey, boards);
      }
    }
  });

  return result;
}

/**
 * Resolve boards for specific project with fallback
 */
private resolveBoardsForProject(
  projectKey: string,
  perProjectConfig: Map<string, string[]>,
  globalConfig?: string[]
): string[] {
  if (perProjectConfig.has(projectKey)) {
    return perProjectConfig.get(projectKey)!;
  }

  return globalConfig || [];
}
```

**Tests** (`tests/unit/external-resource-validator/config-parsing.test.ts`):
- Parse per-project area paths (ADO)
- Parse per-project teams (ADO)
- Parse per-project boards (JIRA)
- Fallback to global config
- Handle empty resource lists
- Handle missing projects
- Invalid naming convention detection

---

### Phase 2: Azure DevOps Area Path Validation (3 hours)

**Goal**: Check and create area paths per project

**New Methods**:

```typescript
/**
 * Check if area path exists in project
 * @param projectName - ADO project name
 * @param areaPath - Area path name (e.g., "API", "Database")
 * @returns true if exists, false otherwise
 */
async checkAreaPath(projectName: string, areaPath: string): Promise<boolean> {
  try {
    const endpoint = `${projectName}/_apis/wit/classificationnodes/areas/${areaPath}?api-version=7.0`;
    const response = await this.callAzureDevOpsApi(endpoint);
    return !!response;
  } catch (error: any) {
    if (error.message.includes('404')) {
      return false;
    }
    throw error;
  }
}

/**
 * Create area path in project
 * @param projectName - ADO project name
 * @param areaPath - Area path name to create
 */
async createAreaPath(projectName: string, areaPath: string): Promise<void> {
  console.log(chalk.blue(`  📦 Creating area path: ${projectName}\\${areaPath}...`));

  try {
    const endpoint = `${projectName}/_apis/wit/classificationnodes/areas?api-version=7.0`;
    const body = { name: areaPath };
    await this.callAzureDevOpsApi(endpoint, 'POST', body);
    console.log(chalk.green(`  ✅ Created area path: ${areaPath}`));
  } catch (error: any) {
    console.error(chalk.red(`  ❌ Failed to create area path: ${error.message}`));
    throw error;
  }
}

/**
 * Check if team exists in project
 */
async checkTeam(projectName: string, teamName: string): Promise<boolean> {
  try {
    const endpoint = `projects/${projectName}/teams/${teamName}?api-version=7.0`;
    const response = await this.callAzureDevOpsApi(endpoint);
    return !!response;
  } catch (error: any) {
    if (error.message.includes('404')) {
      return false;
    }
    throw error;
  }
}

/**
 * Create team in project
 */
async createTeam(projectName: string, teamName: string): Promise<void> {
  console.log(chalk.blue(`  📦 Creating team: ${teamName}...`));

  try {
    const endpoint = `projects/${projectName}/teams?api-version=7.0`;
    const body = { name: teamName };
    await this.callAzureDevOpsApi(endpoint, 'POST', body);
    console.log(chalk.green(`  ✅ Created team: ${teamName}`));
  } catch (error: any) {
    console.error(chalk.red(`  ❌ Failed to create team: ${error.message}`));
    throw error;
  }
}
```

**Enhanced `validateMultipleProjects()` Method**:

```typescript
async validateMultipleProjects(projects: string[]): Promise<AzureDevOpsValidationResult> {
  const result: AzureDevOpsValidationResult = {
    valid: true,
    strategy: 'project-per-team',
    projects: [],
    areaPaths: [],
    teams: [],
    envUpdated: false
  };

  // Parse per-project configurations
  const perProjectAreaPaths = this.parsePerProjectAreaPaths();
  const perProjectTeams = this.parsePerProjectTeams();
  const env = this.loadEnv();
  const globalAreaPaths = env.AZURE_DEVOPS_AREA_PATHS?.split(',').map(p => p.trim()) || [];
  const globalTeams = env.AZURE_DEVOPS_TEAMS?.split(',').map(t => t.trim()) || [];

  for (const projectName of projects) {
    console.log(chalk.bold(`\n🔍 Validating project: ${projectName}`));

    // 1. Validate project exists
    const project = await this.checkProject(projectName);
    if (!project) {
      console.log(chalk.yellow(`⚠️  Project "${projectName}" not found`));
      // Prompt to create or select...
      continue;
    }

    result.projects.push({
      name: projectName,
      id: project.id,
      exists: true,
      created: false
    });

    // 2. Validate area paths for this project
    const areaPathsForProject = this.resolveAreaPathsForProject(
      projectName,
      perProjectAreaPaths,
      globalAreaPaths
    );

    if (areaPathsForProject.length > 0) {
      console.log(chalk.gray(`  Checking ${areaPathsForProject.length} area path(s)...`));

      for (const areaPath of areaPathsForProject) {
        const exists = await this.checkAreaPath(projectName, areaPath);

        if (exists) {
          console.log(chalk.green(`  ✅ ${projectName}\\${areaPath}`));
          result.areaPaths?.push({
            name: areaPath,
            exists: true,
            created: false
          });
        } else {
          console.log(chalk.yellow(`  ⚠️  Creating: ${projectName}\\${areaPath}`));
          await this.createAreaPath(projectName, areaPath);
          result.areaPaths?.push({
            name: areaPath,
            exists: false,
            created: true
          });
        }
      }
    }

    // 3. Validate teams for this project
    const teamsForProject = this.resolveTeamsForProject(
      projectName,
      perProjectTeams,
      globalTeams
    );

    if (teamsForProject.length > 0) {
      console.log(chalk.gray(`  Checking ${teamsForProject.length} team(s)...`));

      for (const teamName of teamsForProject) {
        const exists = await this.checkTeam(projectName, teamName);

        if (exists) {
          console.log(chalk.green(`  ✅ Team: ${teamName}`));
          result.teams?.push({
            name: teamName,
            exists: true,
            created: false
          });
        } else {
          console.log(chalk.yellow(`  ⚠️  Creating team: ${teamName}`));
          await this.createTeam(projectName, teamName);
          result.teams?.push({
            name: teamName,
            exists: false,
            created: true
          });
        }
      }
    }
  }

  return result;
}
```

**Tests** (`tests/unit/external-resource-validator/ado-area-paths.test.ts`):
- Check area path exists (positive)
- Check area path exists (negative - 404)
- Create area path (success)
- Create area path (API error)
- Check team exists
- Create team
- Validate multiple projects with per-project area paths
- Fallback to global area paths

**Integration Tests** (`tests/integration/external-resource-validator/ado-validation.test.ts`):
- End-to-end validation with real ADO API (requires test org)
- Create and validate area paths
- Create and validate teams

---

### Phase 3: JIRA Board Validation (3 hours)

**Goal**: Check and create boards per project

**Enhanced Methods**:

```typescript
/**
 * Check if board exists (by ID or name)
 * @param boardIdOrName - Board ID (numeric string) or name
 * @returns Board object if exists, null otherwise
 */
async checkBoard(boardIdOrName: string): Promise<JiraBoard | null> {
  try {
    // Try as ID first
    if (/^\d+$/.test(boardIdOrName)) {
      const endpoint = `board/${boardIdOrName}`;
      const board = await this.callJiraApi(endpoint);
      return {
        id: board.id,
        name: board.name,
        type: board.type
      };
    }

    // Try as name
    const endpoint = `board?name=${encodeURIComponent(boardIdOrName)}`;
    const response = await this.callJiraApi(endpoint);

    if (response.values && response.values.length > 0) {
      const board = response.values[0];
      return {
        id: board.id,
        name: board.name,
        type: board.type
      };
    }

    return null;
  } catch (error: any) {
    if (error.message.includes('404')) {
      return null;
    }
    throw error;
  }
}

/**
 * Create JIRA board interactively
 * @param projectKey - JIRA project key
 * @param boardName - Board name
 * @returns Created board
 */
async createBoard(projectKey: string, boardName: string): Promise<JiraBoard> {
  console.log(chalk.blue(`\n📦 Creating board: ${boardName} for ${projectKey}...`));

  // 1. Prompt for board type
  const { boardType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'boardType',
      message: 'Select board type:',
      choices: [
        { name: 'Scrum (Sprint-based)', value: 'scrum' },
        { name: 'Kanban (Continuous flow)', value: 'kanban' }
      ]
    }
  ]);

  // 2. Create filter (required for board creation)
  console.log(chalk.gray('  Creating filter...'));
  const filter = await this.createBoardFilter(projectKey, boardName);

  // 3. Create board
  const body = {
    name: boardName,
    type: boardType,
    filterId: filter.id,
    location: {
      type: 'project',
      projectKeyOrId: projectKey
    }
  };

  try {
    const board = await this.callJiraApi('board', 'POST', body);
    console.log(chalk.green(`✅ Board created: ${boardName} (ID: ${board.id})`));
    return {
      id: board.id,
      name: board.name,
      type: board.type
    };
  } catch (error: any) {
    console.error(chalk.red(`❌ Failed to create board: ${error.message}`));
    throw error;
  }
}

/**
 * Create filter for board (internal helper)
 */
private async createBoardFilter(projectKey: string, boardName: string): Promise<any> {
  const body = {
    name: `${boardName} Filter`,
    jql: `project = ${projectKey} ORDER BY Rank ASC`,
    description: `Auto-created filter for ${boardName}`
  };

  try {
    const filter = await this.callJiraApi('filter', 'POST', body);
    return filter;
  } catch (error: any) {
    throw new Error(`Failed to create filter: ${error.message}`);
  }
}

/**
 * Prompt user to select existing board
 */
async promptSelectBoard(projectKey: string): Promise<JiraBoard> {
  console.log(chalk.blue(`\nFetching boards for ${projectKey}...`));

  const boards = await this.fetchBoards(projectKey);

  if (boards.length === 0) {
    throw new Error(`No boards found for project ${projectKey}`);
  }

  const { selectedBoardId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedBoardId',
      message: 'Select an existing board:',
      choices: boards.map(b => ({
        name: `${b.name} (ID: ${b.id}, Type: ${b.type})`,
        value: b.id
      }))
    }
  ]);

  return boards.find(b => b.id === selectedBoardId)!;
}
```

**Enhanced `validateMultipleProjects()` Method**:

```typescript
async validateMultipleProjects(projects: string[]): Promise<JiraValidationResult> {
  const result: JiraValidationResult = {
    valid: true,
    project: { exists: false },
    boards: {
      valid: true,
      existing: [],
      missing: [],
      created: []
    },
    envUpdated: false
  };

  // Parse per-project boards
  const perProjectBoards = this.parsePerProjectBoards();
  const env = this.loadEnv();
  const globalBoards = env.JIRA_BOARDS?.split(',').map(b => b.trim()) || [];

  for (const projectKey of projects) {
    console.log(chalk.bold(`\n🔍 Validating project: ${projectKey}`));

    // 1. Validate project exists
    const project = await this.checkProject(projectKey);
    if (!project) {
      console.log(chalk.yellow(`⚠️  Project "${projectKey}" not found`));
      // Prompt to create or select...
      continue;
    }

    // 2. Validate boards for this project
    const boardsForProject = this.resolveBoardsForProject(
      projectKey,
      perProjectBoards,
      globalBoards
    );

    if (boardsForProject.length > 0) {
      console.log(chalk.gray(`  Checking ${boardsForProject.length} board(s)...`));

      for (const boardIdOrName of boardsForProject) {
        const board = await this.checkBoard(boardIdOrName);

        if (board) {
          console.log(chalk.green(`  ✅ Board: ${board.name} (ID: ${board.id})`));
          result.boards.existing.push(board.id);
        } else {
          console.log(chalk.yellow(`  ⚠️  Board "${boardIdOrName}" not found`));

          // Prompt user for action
          const { action } = await inquirer.prompt([
            {
              type: 'list',
              name: 'action',
              message: `What to do with board "${boardIdOrName}"?`,
              choices: [
                { name: 'Create new board', value: 'create' },
                { name: 'Select existing board', value: 'select' },
                { name: 'Skip', value: 'skip' }
              ]
            }
          ]);

          if (action === 'create') {
            const createdBoard = await this.createBoard(projectKey, boardIdOrName);
            result.boards.created.push({ name: createdBoard.name, id: createdBoard.id });

            // Update .env with created board ID
            const boardsKey = `JIRA_BOARDS_${projectKey}`;
            const updatedBoards = [...boardsForProject.filter(b => b !== boardIdOrName), createdBoard.id.toString()];
            await this.updateEnv({ [boardsKey]: updatedBoards.join(',') });
            result.envUpdated = true;
          } else if (action === 'select') {
            const selectedBoard = await this.promptSelectBoard(projectKey);
            result.boards.existing.push(selectedBoard.id);

            // Update .env with selected board ID
            const boardsKey = `JIRA_BOARDS_${projectKey}`;
            const updatedBoards = [...boardsForProject.filter(b => b !== boardIdOrName), selectedBoard.id.toString()];
            await this.updateEnv({ [boardsKey]: updatedBoards.join(',') });
            result.envUpdated = true;
          } else {
            result.boards.missing.push(boardIdOrName);
            result.boards.valid = false;
          }
        }
      }
    }
  }

  return result;
}
```

**Tests** (`tests/unit/external-resource-validator/jira-boards.test.ts`):
- Check board by ID (exists)
- Check board by name (exists)
- Check board (not found)
- Create board (scrum)
- Create board (kanban)
- Create board filter
- Prompt select board
- Validate multiple projects with per-project boards

**Integration Tests** (`tests/integration/external-resource-validator/jira-validation.test.ts`):
- End-to-end validation with real JIRA API (requires test instance)
- Create and validate boards

---

### Phase 4: Validation & Error Handling (2 hours)

**Goal**: Add comprehensive validation and clear error messages

**Validation Functions**:

```typescript
/**
 * Validate per-project configuration
 * @throws Error if configuration is invalid
 */
validatePerProjectConfig(provider: 'azure-devops' | 'jira'): void {
  const env = this.loadEnv();

  // Get project list
  const projectsKey = provider === 'azure-devops' ? 'AZURE_DEVOPS_PROJECTS' : 'JIRA_PROJECTS';
  const projectsList = env[projectsKey]?.split(',').map(p => p.trim()) || [];

  if (projectsList.length === 0) {
    return; // No multi-project setup, skip validation
  }

  // Check per-project vars reference valid projects
  const prefix = provider === 'azure-devops' ? 'AZURE_DEVOPS' : 'JIRA';
  const pattern = new RegExp(`^${prefix}_(AREA_PATHS|TEAMS|BOARDS)_(.+)$`);

  Object.keys(env).forEach(key => {
    const match = key.match(pattern);
    if (match) {
      const projectName = match[2];

      // Check if project exists in project list
      if (!projectsList.includes(projectName)) {
        throw new Error(
          `Invalid configuration:\n\n` +
          `Problem: ${key} references unknown project "${projectName}"\n` +
          `Solution: Add "${projectName}" to ${projectsKey}\n\n` +
          `Current:\n` +
          `  ${projectsKey}=${env[projectsKey]}\n\n` +
          `Expected:\n` +
          `  ${projectsKey}=${[...projectsList, projectName].join(',')}`
        );
      }

      // Check if resource list is non-empty
      const resources = env[key].split(',').map(r => r.trim()).filter(Boolean);
      if (resources.length === 0) {
        throw new Error(
          `Invalid configuration:\n\n` +
          `Problem: ${key} has empty resource list\n` +
          `Solution: Provide at least one resource or remove the variable\n\n` +
          `Example:\n` +
          `  ${key}=Resource1,Resource2`
        );
      }
    }
  });
}

/**
 * Validate naming convention compliance
 */
validateNamingConvention(envKey: string): boolean {
  const adoPattern = /^AZURE_DEVOPS_(AREA_PATHS|TEAMS)_[A-Za-z0-9_-]+$/;
  const jiraPattern = /^JIRA_BOARDS_[A-Z0-9]+$/;

  return adoPattern.test(envKey) || jiraPattern.test(envKey);
}
```

**Error Messages**:

```typescript
// Example error output

// 1. Missing project in per-project var
throw new Error(`
❌ Configuration Error

Problem: AZURE_DEVOPS_AREA_PATHS_Backend references unknown project
Solution: Add "Backend" to AZURE_DEVOPS_PROJECTS first

Current:
  AZURE_DEVOPS_PROJECTS=Frontend,Mobile

Expected:
  AZURE_DEVOPS_PROJECTS=Backend,Frontend,Mobile
`);

// 2. Empty resource list
throw new Error(`
❌ Configuration Error

Problem: JIRA_BOARDS_BACKEND has empty resource list
Solution: Provide at least one board ID or name

Example:
  JIRA_BOARDS_BACKEND=123,456
`);

// 3. Naming convention violation
throw new Error(`
❌ Configuration Error

Problem: Invalid environment variable name "ADO_BACKEND_PATHS"
Solution: Use correct naming convention

Pattern: {PROVIDER}_{RESOURCE_TYPE}_{PROJECT_NAME}

Example:
  AZURE_DEVOPS_AREA_PATHS_Backend=API,Database
`);
```

**Tests** (`tests/unit/external-resource-validator/validation.test.ts`):
- Validate per-project config (valid)
- Validate per-project config (missing project)
- Validate per-project config (empty resources)
- Validate naming convention (valid ADO)
- Validate naming convention (valid JIRA)
- Validate naming convention (invalid)
- Error message format verification

---

### Phase 5: Documentation (1 hour)

**Goal**: Update skill docs with per-project examples

**Files to Update**:

1. **`plugins/specweave-ado/skills/ado-resource-validator/SKILL.md`**

Add section:
```markdown
## Per-Project Configuration

**Multiple projects with different organizational structures:**

```bash
# Multi-project setup
AZURE_DEVOPS_PROJECTS=Backend,Frontend,Mobile

# Backend project (API services)
AZURE_DEVOPS_AREA_PATHS_Backend=API,Database,Cache,Auth
AZURE_DEVOPS_TEAMS_Backend=Backend-Alpha,Backend-Beta

# Frontend project (Web apps)
AZURE_DEVOPS_AREA_PATHS_Frontend=Web,Admin,Public,Shared
AZURE_DEVOPS_TEAMS_Frontend=Frontend-Team

# Mobile project (iOS + Android)
AZURE_DEVOPS_AREA_PATHS_Mobile=iOS,Android,Shared,Common
AZURE_DEVOPS_TEAMS_Mobile=iOS-Team,Android-Team,QA-Team
```

**Backward compatibility:** Simple configs still work!

```bash
# This still works (no per-project vars)
AZURE_DEVOPS_PROJECTS=Backend,Frontend
# All projects share same area paths (if any)
```
```

2. **`plugins/specweave-jira/skills/jira-resource-validator/SKILL.md`**

Add section:
```markdown
## Per-Project Board Configuration

**Multiple projects with different boards:**

```bash
# Multi-project setup
JIRA_PROJECTS=BACKEND,FRONTEND,MOBILE

# Backend project boards
JIRA_BOARDS_BACKEND=123,456
# 123 = Sprint Board
# 456 = Kanban Board

# Frontend project boards
JIRA_BOARDS_FRONTEND=789,012
# 789 = Sprint Board
# 012 = Bug Board

# Mobile project boards
JIRA_BOARDS_MOBILE=345,678,901
# 345 = iOS Board
# 678 = Android Board
# 901 = Release Board
```

**Backward compatibility:** Global boards still work!

```bash
# This still works (single board for all projects)
JIRA_BOARDS=123
```
```

3. **Migration Guide**

Create: `.specweave/docs/public/guides/multi-project-migration.md`

```markdown
# Migrating from Simple to Per-Project Configuration

## Azure DevOps

**Before** (Simple):
```bash
AZURE_DEVOPS_PROJECTS=Backend,Frontend
```

**After** (Rich):
```bash
AZURE_DEVOPS_PROJECTS=Backend,Frontend

# Add per-project area paths
AZURE_DEVOPS_AREA_PATHS_Backend=API,Database,Cache
AZURE_DEVOPS_AREA_PATHS_Frontend=Web,Admin,Public

# Add per-project teams (optional)
AZURE_DEVOPS_TEAMS_Backend=Alpha,Beta
AZURE_DEVOPS_TEAMS_Frontend=Gamma
```

## JIRA

**Before** (Simple):
```bash
JIRA_PROJECTS=BACK,FRONT
JIRA_BOARDS=123
```

**After** (Rich):
```bash
JIRA_PROJECTS=BACK,FRONT

# Add per-project boards
JIRA_BOARDS_BACK=123,456
JIRA_BOARDS_FRONT=789,012
```

## Benefits

✅ Each project has its own organizational structure
✅ Clear separation between projects
✅ Scales to unlimited projects
✅ Backward compatible (no breaking changes)
```

---

## Testing Strategy

### Unit Tests (30 tests total)

**Config Parsing** (`tests/unit/external-resource-validator/config-parsing.test.ts`):
- ✅ Parse ADO per-project area paths
- ✅ Parse ADO per-project teams
- ✅ Parse JIRA per-project boards
- ✅ Fallback to global config
- ✅ Handle empty resource lists
- ✅ Handle missing projects
- ✅ Multiple projects with mixed configs

**ADO Validation** (`tests/unit/external-resource-validator/ado-validation.test.ts`):
- ✅ Check area path exists (positive)
- ✅ Check area path exists (negative)
- ✅ Create area path (success)
- ✅ Create area path (API error)
- ✅ Check team exists
- ✅ Create team
- ✅ Validate multiple projects with area paths
- ✅ Resolve area paths with per-project config
- ✅ Resolve area paths with global fallback

**JIRA Validation** (`tests/unit/external-resource-validator/jira-validation.test.ts`):
- ✅ Check board by ID
- ✅ Check board by name
- ✅ Check board (not found)
- ✅ Create board (scrum)
- ✅ Create board (kanban)
- ✅ Create board filter
- ✅ Prompt select board
- ✅ Validate multiple projects with boards
- ✅ Resolve boards with per-project config

**Validation Logic** (`tests/unit/external-resource-validator/validation.test.ts`):
- ✅ Validate per-project config (valid)
- ✅ Validate per-project config (missing project)
- ✅ Validate per-project config (empty resources)
- ✅ Validate naming convention (ADO)
- ✅ Validate naming convention (JIRA)
- ✅ Validate naming convention (invalid)
- ✅ Error message format

**Backward Compatibility** (`tests/unit/external-resource-validator/backward-compat.test.ts`):
- ✅ Simple multi-project config (no area paths/boards)
- ✅ Global area paths (shared across projects)
- ✅ Global boards (shared across projects)
- ✅ Mixed: Some projects with per-project, some without

### Integration Tests (10 tests total)

**ADO Integration** (`tests/integration/external-resource-validator/ado.test.ts`):
- ✅ End-to-end ADO validation with test org
- ✅ Create area paths
- ✅ Create teams
- ✅ Multi-project with per-project area paths
- ✅ Multi-project with per-project teams

**JIRA Integration** (`tests/integration/external-resource-validator/jira.test.ts`):
- ✅ End-to-end JIRA validation with test instance
- ✅ Create boards
- ✅ Multi-project with per-project boards
- ✅ Board creation flow (interactive)
- ✅ Board selection flow (interactive)

### Test Coverage Targets

| Component | Unit Coverage | Integration Coverage |
|-----------|--------------|---------------------|
| Config Parsing | 95% | N/A |
| ADO Validation | 90% | 80% |
| JIRA Validation | 90% | 80% |
| Error Handling | 100% | N/A |
| **Overall** | **92%** | **80%** |

---

## File Structure

### Modified Files

```
src/utils/external-resource-validator.ts         (+350 lines)
├── AzureDevOpsResourceValidator
│   ├── parsePerProjectAreaPaths()              [NEW]
│   ├── parsePerProjectTeams()                  [NEW]
│   ├── resolveAreaPathsForProject()            [NEW]
│   ├── resolveTeamsForProject()                [NEW]
│   ├── checkAreaPath()                         [NEW]
│   ├── createAreaPath()                        [NEW]
│   ├── checkTeam()                             [NEW]
│   ├── createTeam()                            [NEW]
│   └── validateMultipleProjects()              [ENHANCED]
│
└── JiraResourceValidator
    ├── parsePerProjectBoards()                 [NEW]
    ├── resolveBoardsForProject()               [NEW]
    ├── checkBoard()                            [ENHANCED]
    ├── createBoard()                           [ENHANCED]
    ├── createBoardFilter()                     [NEW]
    ├── promptSelectBoard()                     [NEW]
    └── validateMultipleProjects()              [ENHANCED]
```

### New Test Files

```
tests/unit/external-resource-validator/
├── config-parsing.test.ts                      [NEW] (7 tests)
├── ado-validation.test.ts                      [NEW] (9 tests)
├── jira-validation.test.ts                     [NEW] (9 tests)
├── validation.test.ts                          [NEW] (7 tests)
└── backward-compat.test.ts                     [NEW] (4 tests)

tests/integration/external-resource-validator/
├── ado.test.ts                                 [NEW] (5 tests)
└── jira.test.ts                                [NEW] (5 tests)
```

### Updated Documentation

```
plugins/specweave-ado/skills/ado-resource-validator/SKILL.md
plugins/specweave-jira/skills/jira-resource-validator/SKILL.md
.specweave/docs/public/guides/multi-project-migration.md [NEW]
```

---

## Risk Analysis

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **ADO API changes** | High | Low | Pin API version (7.0), monitor deprecations |
| **JIRA API rate limits** | Medium | Medium | Batch requests, add retry logic |
| **Backward compatibility breaks** | Critical | Low | Comprehensive fallback testing |
| **Complex validation errors** | Medium | Medium | Clear, actionable error messages |
| **Empty resource lists** | Low | Medium | Explicit validation with helpful errors |

### Implementation Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Scope creep** | Medium | Low | Strict adherence to spec |
| **Test coverage gaps** | High | Low | 92% unit + 80% integration required |
| **Documentation outdated** | Medium | Medium | Update docs in same PR |
| **Migration path unclear** | High | Low | Dedicated migration guide |

---

## Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Backward Compatibility** | 100% | All existing configs work with ZERO changes |
| **Configuration Flexibility** | Unlimited | Test 10 projects × 10 resources each |
| **Validation Performance** | <5 seconds | Time 3 projects × 5 resources validation |
| **Test Coverage** | 85%+ | Unit (92%) + Integration (80%) |
| **Error Rate** | <1% | Monitor production usage after release |
| **User Satisfaction** | 95%+ | Survey ADO/JIRA users after 2 weeks |

---

## Implementation Checklist

### Phase 1: Config Parsing ✓
- [ ] Add `parsePerProjectAreaPaths()` to ADO validator
- [ ] Add `parsePerProjectTeams()` to ADO validator
- [ ] Add `parsePerProjectBoards()` to JIRA validator
- [ ] Add fallback resolution logic
- [ ] Write 7 unit tests
- [ ] Code review

### Phase 2: ADO Integration ✓
- [ ] Add `checkAreaPath()` method
- [ ] Add `createAreaPath()` method
- [ ] Add `checkTeam()` method
- [ ] Add `createTeam()` method
- [ ] Enhance `validateMultipleProjects()`
- [ ] Write 9 unit tests
- [ ] Write 5 integration tests
- [ ] Code review

### Phase 3: JIRA Integration ✓
- [ ] Enhance `checkBoard()` method
- [ ] Enhance `createBoard()` method
- [ ] Add `createBoardFilter()` method
- [ ] Add `promptSelectBoard()` method
- [ ] Enhance `validateMultipleProjects()`
- [ ] Write 9 unit tests
- [ ] Write 5 integration tests
- [ ] Code review

### Phase 4: Validation ✓
- [ ] Add `validatePerProjectConfig()` function
- [ ] Add `validateNamingConvention()` function
- [ ] Implement clear error messages
- [ ] Write 7 validation tests
- [ ] Write 4 backward compatibility tests
- [ ] Code review

### Phase 5: Documentation ✓
- [ ] Update ADO skill docs
- [ ] Update JIRA skill docs
- [ ] Create migration guide
- [ ] Add per-project examples
- [ ] Review all documentation
- [ ] Code review

### Final Validation ✓
- [ ] Run full test suite (40 tests)
- [ ] Verify 85%+ coverage
- [ ] Test with real ADO org
- [ ] Test with real JIRA instance
- [ ] Manual QA testing
- [ ] Performance testing (<5s validation)

---

## Dependencies

**None** - This increment is self-contained and has no external dependencies.

**Enables Future Work**:
- Per-project sync schedules
- Per-project notification settings
- Per-project access control
- Per-project DORA metrics

---

## Deployment

**No deployment changes needed** - This is a library enhancement.

**Installation**: Standard `npm install specweave` will get the new version.

**Migration**: Existing configs work with ZERO changes (100% backward compatible).

---

## Rollback Plan

**If issues arise**:
1. Revert to previous version: `npm install specweave@<previous-version>`
2. No data loss (configuration in `.env` unchanged)
3. All validation is read-only (no destructive operations without user confirmation)

---

## Summary

**What We're Building**:
- Hierarchical per-project configuration for ADO and JIRA
- Naming convention: `{PROVIDER}_{RESOURCE}_{PROJECT}`
- Backward compatible with existing simple configs

**Key Technical Decisions**:
- Extend existing validators (not separate config parser)
- Fallback to global config if per-project missing
- Clear, actionable error messages

**Implementation Size**:
- +350 lines in `external-resource-validator.ts`
- +40 tests (30 unit + 10 integration)
- +3 documentation files

**Timeline**: 11 hours (1.5 days)

**Risk**: Low (isolated changes, comprehensive tests, 100% backward compatible)

---

**Plan Version**: 1.0
**Created**: 2025-11-11
**Status**: Ready for implementation
