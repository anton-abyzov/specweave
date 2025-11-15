# Implementation Plan: Hierarchical External Sync

**Increment**: 0015-hierarchical-external-sync
**Target Version**: 0.10.0
**Estimated Effort**: 13 days

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     SpecWeave Init                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  1. Strategy Selection (Simple/Filtered/Custom)      │  │
│  │  2. Container Multi-Select (Projects/Repos)          │  │
│  │  3. Sub-Org Multi-Select (Boards/Area Paths)         │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │ Generates
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              .specweave/config.json                         │
│  {                                                           │
│    "sync": {                                                 │
│      "profiles": {                                           │
│        "my-profile": {                                       │
│          "strategy": "filtered",                             │
│          "containers": [                                     │
│            {                                                 │
│              "id": "PROJECT-A",                              │
│              "subOrganizations": ["Board 1", "Board 2"],     │
│              "filters": {...}                                │
│            }                                                 │
│          ]                                                   │
│        }                                                     │
│      }                                                       │
│    }                                                         │
│  }                                                           │
└──────────────────────┬──────────────────────────────────────┘
                       │ Used by
                       ▼
┌─────────────────────────────────────────────────────────────┐
│          Provider-Specific Clients                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Jira Client  │  │GitHub Client │  │  ADO Client  │     │
│  │  Multi-      │  │  Multi-      │  │  Multi-      │     │
│  │  Project +   │  │  Repo +      │  │  Project +   │     │
│  │  Board Sync  │  │  Board Sync  │  │  Area Path   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User runs: specweave init
    ↓
1. Detect provider (Jira/GitHub/ADO)
    ↓
2. Ask strategy (Simple/Filtered/Custom)
    ↓
3. [If Filtered] Fetch all containers (projects/repos)
    ↓
4. [If Filtered] Multi-select containers
    ↓
5. [If Filtered] For each container, fetch sub-orgs (boards/etc)
    ↓
6. [If Filtered] Multi-select sub-orgs per container
    ↓
7. [If Filtered] Optional: Configure filters (labels, assignees)
    ↓
8. Generate config.json with hierarchical structure
    ↓
9. Test connection and save

User runs: /specweave-jira:sync 0015
    ↓
1. Load sync profile from config.json
    ↓
2. [If strategy=filtered] Build hierarchical JQL:
   (project=PROJECT-A AND board IN ("Board 1", "Board 2"))
   OR
   (project=PROJECT-B AND board IN ("Board 3"))
    ↓
3. Fetch issues from all matched containers + sub-orgs
    ↓
4. Apply filters (time range, labels, assignees)
    ↓
5. Create/update increment metadata with external links
```

---

## Phase 1: Core Types & Schema

### 1.1 Update Sync Profile Types

**File**: `src/core/types/sync-profile.ts`

**Add**:
```typescript
/**
 * Sync strategy type
 * - simple: One container, no filtering (backward compatible)
 * - filtered: Multiple containers + sub-organizations + filters (NEW)
 * - custom: Raw query (JQL/GraphQL/WIQL) (NEW)
 */
export type SyncStrategy = 'simple' | 'filtered' | 'custom';

/**
 * Container filters (provider-specific)
 */
export interface SyncContainerFilters {
  // Common filters (all providers)
  includeLabels?: string[];
  excludeLabels?: string[];
  assignees?: string[];
  statusCategories?: string[];

  // Jira-specific
  components?: string[];
  sprints?: string[];
  issueTypes?: string[];

  // GitHub-specific
  milestones?: string[];
  states?: ('open' | 'closed')[];

  // ADO-specific
  areaPaths?: string[];
  iterationPaths?: string[];
  workItemTypes?: string[];
}

/**
 * Container definition (project, repo, etc.)
 */
export interface SyncContainer {
  /** Container ID (Jira project key, GitHub owner/repo, ADO project) */
  id: string;

  /** Sub-organizations (boards, project boards, team boards) */
  subOrganizations?: string[];

  /** Filters applied to this container */
  filters?: SyncContainerFilters;
}

/**
 * Sync profile configuration (UPDATED)
 */
export interface SyncProfileConfig {
  // Simple strategy (backward compatible)
  container?: string;

  // Filtered strategy (NEW)
  containers?: SyncContainer[];

  // Custom strategy (NEW)
  customQuery?: string;

  // Common settings (all strategies)
  owner?: string;  // GitHub only
  repo?: string;   // GitHub only (for simple strategy)
}

/**
 * Sync profile (UPDATED)
 */
export interface SyncProfile {
  provider: 'github' | 'jira' | 'ado';
  displayName: string;

  /** Sync strategy (NEW field) */
  strategy: SyncStrategy;

  config: SyncProfileConfig;

  timeRange?: {
    default: '1W' | '1M' | '3M' | '6M' | 'ALL';
    max: '1W' | '1M' | '3M' | '6M' | 'ALL';
  };

  rateLimits?: {
    maxItemsPerSync: number;
    warnThreshold: number;
  };
}
```

**Migration**:
- Existing profiles without `strategy` field → default to `'simple'`
- Existing profiles with `config.container` → still work (simple strategy)
- Backward compatible: No breaking changes

### 1.2 Update JSON Schema

**File**: `src/core/schemas/sync-profile.schema.json`

**Add validation for**:
- `strategy` field (enum: simple, filtered, custom)
- `containers` array (for filtered strategy)
- `customQuery` string (for custom strategy)
- Mutually exclusive: (container XOR containers XOR customQuery)

### 1.3 Unit Tests

**File**: `tests/unit/sync/sync-profile-validation.test.ts`

**Tests**:
- ✅ Parse simple strategy (backward compatible)
- ✅ Parse filtered strategy with containers
- ✅ Parse custom strategy with query
- ✅ Validate mutual exclusion (only one config type)
- ✅ Validate container structure
- ✅ Validate filters structure

---

## Phase 2: Provider Implementations

### 2.1 Jira: Multi-Project + Board Sync

**File**: `plugins/specweave-jira/lib/jira-hierarchical-sync.ts` (NEW)

**Key Functions**:

```typescript
/**
 * Fetch boards for a Jira project
 */
export async function fetchBoardsForProject(
  client: JiraClient,
  projectKey: string
): Promise<JiraBoard[]> {
  // GET /rest/agile/1.0/board?projectKeyOrId={projectKey}
  // Returns: [{id, name, type, location}, ...]
}

/**
 * Build hierarchical JQL query from containers
 */
export function buildHierarchicalJQL(
  containers: SyncContainer[]
): string {
  // Example output:
  // (project=PROJECT-A AND board IN (123, 456) AND labels IN (feature))
  // OR
  // (project=PROJECT-B AND board IN (789))

  const clauses = containers.map(container => {
    const parts: string[] = [`project=${container.id}`];

    if (container.subOrganizations?.length) {
      // Resolve board names to IDs
      const boardIds = await resolveBoardIds(container.subOrganizations);
      parts.push(`board IN (${boardIds.join(',')})`);
    }

    if (container.filters?.includeLabels) {
      parts.push(`labels IN (${container.filters.includeLabels.join(',')})`);
    }

    // ... more filters

    return `(${parts.join(' AND ')})`;
  });

  return clauses.join(' OR ');
}

/**
 * Fetch issues hierarchically
 */
export async function fetchIssuesHierarchical(
  client: JiraClient,
  profile: SyncProfile,
  timeRange: string
): Promise<JiraIssue[]> {
  if (profile.strategy === 'simple') {
    // Existing behavior (backward compatible)
    return fetchIssuesSimple(client, profile, timeRange);
  }

  if (profile.strategy === 'custom') {
    // Use customQuery directly
    return client.searchIssues(profile.config.customQuery);
  }

  // Filtered strategy
  const jql = buildHierarchicalJQL(profile.config.containers!);
  const timeFilter = buildTimeRangeJQL(timeRange);
  const finalJQL = `${jql} AND ${timeFilter}`;

  return client.searchIssues(finalJQL);
}
```

**Integration Test**: `tests/integration/jira/hierarchical-sync.test.ts`

**Mock Data**:
- 2 projects: PROJECT-A, PROJECT-B
- PROJECT-A: 3 boards (Board 1, Board 2, Board 3)
- PROJECT-B: 2 boards (Board 4, Board 5)
- 50 issues total

**Test Cases**:
- Fetch from one project, one board
- Fetch from two projects, specific boards
- Apply label filter (includeLabels: ["feature"])
- Apply assignee filter
- Verify JQL correctness

### 2.2 GitHub: Multi-Repo + Project Board Sync

**File**: `plugins/specweave-github/lib/github-hierarchical-sync.ts` (NEW)

**Key Functions**:

```typescript
/**
 * Fetch project boards for a GitHub repo
 */
export async function fetchProjectBoardsForRepo(
  client: GitHubClient,
  owner: string,
  repo: string
): Promise<GitHubProjectBoard[]> {
  // GraphQL query: repository.projectsV2.nodes
  // Returns: [{id, title, url}, ...]
}

/**
 * Build hierarchical GraphQL query
 */
export function buildHierarchicalGraphQL(
  containers: SyncContainer[]
): string {
  // Example output:
  // repo:owner/repo-a repo:owner/repo-b label:feature

  const repoClauses = containers.map(c => `repo:${c.id}`).join(' ');

  // Add filters
  const filters: string[] = [];
  containers.forEach(c => {
    if (c.filters?.includeLabels) {
      c.filters.includeLabels.forEach(label => {
        filters.push(`label:${label}`);
      });
    }
  });

  return [repoClauses, ...filters].join(' ');
}

/**
 * Fetch issues hierarchically
 */
export async function fetchIssuesHierarchical(
  client: GitHubClient,
  profile: SyncProfile,
  timeRange: string
): Promise<GitHubIssue[]> {
  if (profile.strategy === 'simple') {
    return fetchIssuesSimple(client, profile, timeRange);
  }

  if (profile.strategy === 'custom') {
    return client.searchIssues(profile.config.customQuery);
  }

  // Filtered strategy
  const query = buildHierarchicalGraphQL(profile.config.containers!);
  const timeFilter = buildTimeRangeQuery(timeRange);
  const finalQuery = `${query} ${timeFilter}`;

  return client.searchIssues(finalQuery);
}
```

**Integration Test**: `tests/integration/github/hierarchical-sync.test.ts`

**Mock Data**:
- 2 repos: owner/repo-a, owner/repo-b
- repo-a: 2 project boards
- repo-b: 1 project board
- 30 issues total

**Test Cases**:
- Fetch from two repos
- Filter by project board
- Filter by labels
- Filter by milestone

### 2.3 ADO: Multi-Project + Area Path Sync

**File**: `plugins/specweave-ado/lib/ado-hierarchical-sync.ts` (NEW)

**Key Functions**:

```typescript
/**
 * Fetch area paths for an ADO project
 */
export async function fetchAreaPathsForProject(
  client: ADOClient,
  project: string
): Promise<string[]> {
  // GET https://dev.azure.com/{org}/_apis/wit/classificationnodes/Areas?$depth=2
  // Returns: ["Platform", "Platform\Core", "Platform\Services", ...]
}

/**
 * Build hierarchical WIQL query
 */
export function buildHierarchicalWIQL(
  containers: SyncContainer[]
): string {
  // Example output:
  // SELECT * FROM WorkItems WHERE
  //   ([System.TeamProject] = 'Project-A' AND [System.AreaPath] UNDER 'Project-A\Platform')
  //   OR
  //   ([System.TeamProject] = 'Project-B' AND [System.AreaPath] UNDER 'Project-B\Services')

  const clauses = containers.map(container => {
    const parts: string[] = [
      `[System.TeamProject] = '${container.id}'`
    ];

    if (container.filters?.areaPaths?.length) {
      const areaPathClauses = container.filters.areaPaths.map(ap =>
        `[System.AreaPath] UNDER '${container.id}\\${ap}'`
      );
      parts.push(`(${areaPathClauses.join(' OR ')})`);
    }

    // Add other filters
    if (container.filters?.workItemTypes) {
      const types = container.filters.workItemTypes.map(t => `'${t}'`).join(',');
      parts.push(`[System.WorkItemType] IN (${types})`);
    }

    return `(${parts.join(' AND ')})`;
  });

  return `SELECT * FROM WorkItems WHERE ${clauses.join(' OR ')}`;
}

/**
 * Fetch work items hierarchically
 */
export async function fetchWorkItemsHierarchical(
  client: ADOClient,
  profile: SyncProfile,
  timeRange: string
): Promise<ADOWorkItem[]> {
  if (profile.strategy === 'simple') {
    return fetchWorkItemsSimple(client, profile, timeRange);
  }

  if (profile.strategy === 'custom') {
    return client.queryWorkItems(profile.config.customQuery);
  }

  // Filtered strategy
  const wiql = buildHierarchicalWIQL(profile.config.containers!);
  const timeFilter = buildTimeRangeWIQL(timeRange);
  const finalWIQL = `${wiql} AND ${timeFilter}`;

  return client.queryWorkItems(finalWIQL);
}
```

**Integration Test**: `tests/integration/ado/hierarchical-sync.test.ts`

**Mock Data**:
- 2 projects: Project-A, Project-B
- Project-A: Area paths ["Platform", "Platform\Core"]
- Project-B: Area paths ["Services", "Services\API"]
- 40 work items total

**Test Cases**:
- Fetch from two projects
- Filter by area path
- Filter by work item type
- Filter by iteration path

---

## Phase 3: Init Wizard Enhancement

### 3.1 Strategy Selection

**File**: `src/cli/commands/init.ts` (UPDATE)

**Add interactive prompts**:

```typescript
async function selectSyncStrategy(): Promise<SyncStrategy> {
  const { strategy } = await inquirer.prompt([
    {
      type: 'list',
      name: 'strategy',
      message: 'How is your work organized?',
      choices: [
        {
          name: 'Simple (one project/repo)',
          value: 'simple',
          short: 'Simple'
        },
        {
          name: 'Filtered (multiple projects/repos with boards)',
          value: 'filtered',
          short: 'Filtered'
        },
        {
          name: 'Custom (I\'ll write my own query)',
          value: 'custom',
          short: 'Custom'
        }
      ]
    }
  ]);

  return strategy;
}
```

### 3.2 Container Multi-Select (Filtered Strategy)

**File**: `src/cli/commands/init-hierarchical.ts` (NEW)

```typescript
async function selectContainers(
  provider: 'jira' | 'github' | 'ado',
  client: any
): Promise<string[]> {
  console.log('📋 Fetching available containers...\n');

  let containers: any[];
  if (provider === 'jira') {
    containers = await client.getProjects();
  } else if (provider === 'github') {
    containers = await client.listRepositories();
  } else {
    containers = await client.getProjects();
  }

  const { selectedContainers } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedContainers',
      message: `Select ${provider === 'jira' ? 'projects' : provider === 'github' ? 'repos' : 'projects'}:`,
      choices: containers.map(c => ({
        name: formatContainerChoice(c, provider),
        value: c.key || c.name || c.id,
        checked: false
      })),
      pageSize: 15,
      validate: (selected: string[]) => {
        if (selected.length === 0) {
          return 'Please select at least one container';
        }
        return true;
      }
    }
  ]);

  return selectedContainers;
}
```

### 3.3 Sub-Organization Multi-Select

```typescript
async function selectSubOrganizations(
  provider: 'jira' | 'github' | 'ado',
  client: any,
  containerId: string
): Promise<string[]> {
  console.log(`\n📋 Fetching boards for ${containerId}...\n`);

  let subOrgs: any[];
  if (provider === 'jira') {
    subOrgs = await fetchBoardsForProject(client, containerId);
  } else if (provider === 'github') {
    const [owner, repo] = containerId.split('/');
    subOrgs = await fetchProjectBoardsForRepo(client, owner, repo);
  } else {
    subOrgs = await fetchAreaPathsForProject(client, containerId);
  }

  const { selected } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selected',
      message: `Select boards/boards for ${containerId}:`,
      choices: [
        ...subOrgs.map(so => ({
          name: so.name || so.title || so,
          value: so.name || so.title || so,
          checked: false
        })),
        new inquirer.Separator(),
        {
          name: '✓ Select all',
          value: '__ALL__'
        }
      ],
      pageSize: 15
    }
  ]);

  if (selected.includes('__ALL__')) {
    return subOrgs.map(so => so.name || so.title || so);
  }

  return selected.filter((s: string) => s !== '__ALL__');
}
```

### 3.4 Optional Filter Configuration

```typescript
async function configureFilters(
  provider: 'jira' | 'github' | 'ado'
): Promise<SyncContainerFilters> {
  console.log('\n⚙️  Optional: Configure filters\n');

  const { wantsFilters } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'wantsFilters',
      message: 'Add filters (labels, assignees, etc.)?',
      default: false
    }
  ]);

  if (!wantsFilters) {
    return {};
  }

  const filters: SyncContainerFilters = {};

  // Common filters
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'includeLabels',
      message: 'Include labels (comma-separated, optional):',
      filter: (input: string) => input ? input.split(',').map(s => s.trim()) : undefined
    },
    {
      type: 'input',
      name: 'excludeLabels',
      message: 'Exclude labels (comma-separated, optional):',
      filter: (input: string) => input ? input.split(',').map(s => s.trim()) : undefined
    },
    {
      type: 'input',
      name: 'assignees',
      message: 'Filter by assignees (comma-separated, optional):',
      filter: (input: string) => input ? input.split(',').map(s => s.trim()) : undefined
    }
  ]);

  Object.assign(filters, answers);

  // Provider-specific filters
  if (provider === 'jira') {
    const jiraFilters = await inquirer.prompt([
      {
        type: 'input',
        name: 'components',
        message: 'Filter by components (comma-separated, optional):',
        filter: (input: string) => input ? input.split(',').map(s => s.trim()) : undefined
      }
    ]);
    Object.assign(filters, jiraFilters);
  }

  // ... more provider-specific filters

  return filters;
}
```

### 3.5 Config Generation

```typescript
async function generateHierarchicalConfig(
  provider: 'jira' | 'github' | 'ado',
  strategy: SyncStrategy,
  client: any
): Promise<SyncProfile> {
  if (strategy === 'custom') {
    // Prompt for raw query
    const { customQuery } = await inquirer.prompt([
      {
        type: 'input',
        name: 'customQuery',
        message: `Enter ${provider === 'jira' ? 'JQL' : provider === 'github' ? 'GitHub search' : 'WIQL'} query:`,
        validate: (input: string) => input.length > 0 || 'Query cannot be empty'
      }
    ]);

    return {
      provider,
      displayName: `Custom ${provider} query`,
      strategy: 'custom',
      config: { customQuery }
    };
  }

  if (strategy === 'simple') {
    // Existing simple strategy flow (unchanged)
    return generateSimpleConfig(provider, client);
  }

  // Filtered strategy
  const selectedContainerIds = await selectContainers(provider, client);

  const containers: SyncContainer[] = [];

  for (const containerId of selectedContainerIds) {
    const subOrgs = await selectSubOrganizations(provider, client, containerId);
    const filters = await configureFilters(provider);

    containers.push({
      id: containerId,
      subOrganizations: subOrgs.length > 0 ? subOrgs : undefined,
      filters: Object.keys(filters).length > 0 ? filters : undefined
    });
  }

  return {
    provider,
    displayName: `${provider} hierarchical sync`,
    strategy: 'filtered',
    config: { containers }
  };
}
```

---

## Phase 4: Documentation

### 4.1 Overview Page

**File**: `docs-site/docs/guides/external-sync/overview.md`

**Content**:
- Introduction to external sync
- Three strategies explained (Simple, Filtered, Custom)
- Decision tree: Which strategy to use?
- Quick start guides (links to provider-specific docs)

### 4.2 Sync Strategies Page

**File**: `docs-site/docs/guides/external-sync/sync-strategies.md`

**Content**:
- **Simple Strategy**: One container, use when you have one project/repo
- **Filtered Strategy**: Multiple containers + boards, use when you have multiple projects or want board-level control
- **Custom Strategy**: Raw queries, use when you need maximum flexibility

**Decision Tree**:
```
Do you work across multiple projects/repos?
├─ NO → Use Simple strategy
└─ YES → Do you need board-level control?
    ├─ NO → Use Simple strategy (sync entire projects)
    └─ YES → Do you have complex query needs?
        ├─ NO → Use Filtered strategy
        └─ YES → Use Custom strategy
```

### 4.3 Provider-Specific Guides

**Jira**:

**File**: `docs-site/docs/guides/external-sync/jira/hierarchical.md`

**Content**:
- When to use hierarchical sync (multiple projects, specific boards)
- Interactive setup walkthrough
- Example config (multi-project with board filtering)
- Common patterns:
  - Sync two projects with all boards
  - Sync one project with specific boards
  - Sync multiple projects with label filtering
- Troubleshooting

**GitHub**:

**File**: `docs-site/docs/guides/external-sync/github/multi-repo.md`

**Content**:
- When to use multi-repo sync
- Interactive setup walkthrough
- Example config (multiple repos with project boards)
- Common patterns:
  - Sync frontend across web + mobile repos
  - Sync with label filtering
  - Sync with milestone filtering
- Troubleshooting

**ADO**:

**File**: `docs-site/docs/guides/external-sync/ado/area-paths.md`

**Content**:
- When to use area path filtering
- Interactive setup walkthrough
- Example config (multiple projects with area paths)
- Common patterns:
  - Sync Platform team (multiple area paths)
  - Sync Services team (specific work item types)
  - Cross-team sync
- Troubleshooting

### 4.4 Example Configs (Generic Terms)

**Jira Multi-Project**:
```json
{
  "sync": {
    "profiles": {
      "cross-team-work": {
        "provider": "jira",
        "displayName": "Cross-Team Initiatives",
        "strategy": "filtered",
        "config": {
          "containers": [
            {
              "id": "PROJECT-ALPHA",
              "subOrganizations": ["Team 1 Board", "Team 2 Board"],
              "filters": {
                "includeLabels": ["initiative-x"],
                "statusCategories": ["To Do", "In Progress"]
              }
            },
            {
              "id": "PROJECT-BETA",
              "subOrganizations": ["Platform Board"]
            }
          ]
        }
      }
    }
  }
}
```

**GitHub Multi-Repo**:
```json
{
  "sync": {
    "profiles": {
      "frontend-work": {
        "provider": "github",
        "displayName": "Frontend Across Repos",
        "strategy": "filtered",
        "config": {
          "containers": [
            {
              "id": "myorg/web-app",
              "subOrganizations": ["Frontend Board", "UI Components"],
              "filters": {
                "includeLabels": ["frontend"],
                "milestones": ["v2.0"]
              }
            },
            {
              "id": "myorg/mobile-app",
              "subOrganizations": ["Mobile Frontend Board"]
            }
          ]
        }
      }
    }
  }
}
```

**ADO Multi-Project**:
```json
{
  "sync": {
    "profiles": {
      "platform-services": {
        "provider": "ado",
        "displayName": "Platform & Services",
        "strategy": "filtered",
        "config": {
          "containers": [
            {
              "id": "Platform",
              "filters": {
                "areaPaths": ["Platform\\Core", "Platform\\Infrastructure"],
                "workItemTypes": ["User Story", "Bug"]
              }
            },
            {
              "id": "Services",
              "filters": {
                "areaPaths": ["Services\\API"],
                "iterationPaths": ["Sprint 24", "Sprint 25"]
              }
            }
          ]
        }
      }
    }
  }
}
```

---

## Phase 5: Testing & Release

### 5.1 Unit Tests

**Coverage Target**: 90%

**Files**:
- `tests/unit/sync/sync-profile-validation.test.ts` (schema validation)
- `tests/unit/sync/jira-hierarchical-jql.test.ts` (JQL building)
- `tests/unit/sync/github-hierarchical-query.test.ts` (GraphQL building)
- `tests/unit/sync/ado-hierarchical-wiql.test.ts` (WIQL building)

### 5.2 Integration Tests

**Coverage Target**: 85%

**Files**:
- `tests/integration/jira/hierarchical-sync.test.ts`
- `tests/integration/github/hierarchical-sync.test.ts`
- `tests/integration/ado/hierarchical-sync.test.ts`

### 5.3 E2E Tests

**Coverage Target**: 100% (critical path)

**File**: `tests/e2e/init-wizard-hierarchical.spec.ts`

**Test Cases**:
1. Init with Simple strategy (backward compatibility)
2. Init with Filtered strategy (Jira, 2 projects, 3 boards)
3. Init with Custom strategy (raw JQL)
4. Verify generated config.json correctness

### 5.4 Release Process

**Steps**:
1. Run all tests: `npm test && npm run test:integration && npm run test:e2e`
2. Update `CHANGELOG.md` with v0.10.0 notes
3. Bump version: `npm version minor` (0.9.3 → 0.10.0)
4. Build: `npm run build`
5. Test locally: `npm link && cd /tmp/test-project && specweave init`
6. Commit: `git commit -m "feat: hierarchical external sync (v0.10.0)"`
7. Tag: `git tag v0.10.0`
8. Push: `git push origin develop --tags`
9. Publish: `npm publish --access public`
10. Create GitHub release with changelog

---

## Backward Compatibility

### Migration Strategy

**Existing Profiles** (strategy not specified):
```json
{
  "provider": "jira",
  "config": {
    "container": "PROJECT-A"
  }
}
```

**Auto-migrated to**:
```json
{
  "provider": "jira",
  "strategy": "simple",  // ← Added automatically
  "config": {
    "container": "PROJECT-A"
  }
}
```

**No user action required**: Migration happens transparently

### Testing Backward Compatibility

**Test**: Load existing config without `strategy` field
**Expected**: Auto-default to `'simple'` strategy
**File**: `tests/unit/sync/backward-compatibility.test.ts`

---

## Performance Considerations

### Rate Limiting

**Existing system** (from Increment 0011):
- Pre-flight validation checks rate limits
- Estimates API calls based on time range
- Warns if sync may exceed limits

**Enhancement for hierarchical**:
- Estimate calls PER CONTAINER
- Sum across all containers
- Warn if total exceeds threshold

**Example**:
```
Container 1: 150 API calls
Container 2: 200 API calls
Container 3: 100 API calls
Total: 450 API calls (within 5000/hour limit ✅)
```

### Pagination

**Existing**: Each provider client handles pagination

**No change needed**: Hierarchical queries still use same pagination logic

---

## Success Metrics

### Development Metrics

- ✅ 90%+ test coverage
- ✅ Zero breaking changes (100% backward compatible)
- ✅ All tests passing (unit + integration + E2E)

### User Metrics (Post-Release)

- ✅ <10% of users read docs before successful setup (wizard is intuitive)
- ✅ <5% support tickets about hierarchical sync (good UX)
- ✅ 50%+ increase in docs views for external-sync section

---

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Provider API changes | High | Low | Mock all API calls in tests |
| Performance degradation | Medium | Medium | Rate limit validation, pagination |
| User confusion | Medium | Medium | Clear wizard, decision tree docs |
| Backward compatibility | High | Low | Auto-migration, extensive testing |

---

## Post-Release Tasks

1. Monitor GitHub issues for bug reports
2. Track user adoption (analytics on init command usage)
3. Gather feedback on wizard UX
4. Plan Increment 0016 based on user feedback

---

**Implementation Ready**: All phases planned, ready to execute autonomously
