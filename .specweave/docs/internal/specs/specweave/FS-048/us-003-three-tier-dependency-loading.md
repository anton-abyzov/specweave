---
id: US-003
feature: FS-048
title: "Three-Tier Dependency Loading (Init/On-Demand/Bulk)"
status: proposed
priority: P1
created: 2025-11-21
---

# US-003: Three-Tier Dependency Loading (Init/On-Demand/Bulk)

**Feature**: [FS-048 - Enhanced External Tool Import](../../../_features/FS-048/FEATURE.md)

## User Story

**As a** developer initializing SpecWeave with 50 JIRA projects
**I want** dependencies loaded lazily (on first sync)
**So that** init completes in < 5 seconds instead of waiting 2 minutes for 200+ API calls

## Business Value

- **Performance**: 90% init time reduction (2 minutes → < 5 seconds)
- **Scalability**: Support 500+ project instances without timeout
- **Flexibility**: Users choose when to pre-load dependencies (optional bulk command)

## Acceptance Criteria

### AC-US3-01: Tier 1 - Metadata Only During Init
- **Priority**: P0
- **Testable**: Yes (integration test)
- **Description**: Init loads project metadata only (name, key, type)
- **Data Loaded**:
  - Project key (e.g., "BACKEND")
  - Project name (e.g., "Backend Services")
  - Project type (Agile, CMMI, SAFe)
  - Lead name (for display)
- **Data NOT Loaded**:
  - Boards (JIRA)
  - Area paths (ADO)
  - Components, versions, sprints
- **Validation**: Init API calls < 5 (batch project fetch only)

### AC-US3-02: Tier 2 - On-Demand Loading (First Sync)
- **Priority**: P1
- **Testable**: Yes (integration test)
- **Description**: Dependencies loaded when user first syncs a project
- **Trigger**: `/specweave:sync` or `/specweave:increment` for specific project
- **Behavior**:
  - Show spinner: "Loading BACKEND dependencies..."
  - Fetch boards, area paths, components (4-7 API calls)
  - Cache results for 24 hours
  - Next sync uses cache (no API calls)
- **Validation**: First sync makes 4-7 calls, second sync makes 0 calls (cache hit)

### AC-US3-03: Tier 3 - Bulk Pre-Load Command
- **Priority**: P2
- **Testable**: Yes (E2E test)
- **Description**: Optional command to pre-load all dependencies
- **Command**: `/specweave-jira:preload-dependencies`
- **Use Case**: Offline work, batch sync preparation
- **Behavior**:
  - Load dependencies for ALL configured projects
  - Show progress: "Pre-loading... 12/50 projects (24%)"
  - Cancelable (Ctrl+C saves partial progress)
  - Cache persists for 24 hours
- **Validation**: Command loads all dependencies, cache validated

### AC-US3-04: Cache Persistence (24-Hour TTL)
- **Priority**: P1
- **Testable**: Yes (unit test)
- **Description**: Tier 2/3 dependencies cached with 24-hour expiry
- **Cache Files**:
  - `.specweave/cache/jira-projects.json` (Tier 1 - project list)
  - `.specweave/cache/jira-BACKEND-deps.json` (Tier 2/3 - per-project deps)
- **TTL Validation**:
  - Check `lastUpdated` timestamp
  - If > 24 hours → re-fetch
  - If < 24 hours → use cache
- **Validation**: Cache hit rate > 90% during normal development

## Technical Implementation

### Architecture Diagram

```
┌─────────────────────────────────────────────┐
│ specweave init                              │
│ ↓                                           │
│ Tier 1: Fetch project metadata (1 API call)│
│   - Project key, name, type, lead          │
│   - Time: < 5 seconds                       │
│   - Cache: .specweave/cache/jira-projects.json│
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ /specweave:sync (First time for BACKEND)   │
│ ↓                                           │
│ Tier 2: Fetch BACKEND dependencies         │
│   - Boards (JIRA_BOARDS_BACKEND)           │
│   - Components, versions (if needed)        │
│   - Time: 2-5 seconds                       │
│   - Cache: .specweave/cache/jira-BACKEND-deps.json│
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ /specweave-jira:preload-dependencies       │
│ ↓                                           │
│ Tier 3: Bulk pre-load all projects         │
│   - Iterate all configured projects         │
│   - Fetch dependencies in parallel          │
│   - Time: 1-2 minutes (50 projects)         │
│   - Cache: All .specweave/cache/jira-*-deps.json│
└─────────────────────────────────────────────┘
```

### Files to Create/Modify

1. **`src/integrations/jira/jira-dependency-loader.ts`** (NEW)
   - Three-tier loading logic
   - Cache management (read/write/validate TTL)
   - Parallel batch loading (Tier 3)

2. **`src/cli/helpers/issue-tracker/jira.ts`**
   - Modify `autoDiscoverJiraProjects()` to load Tier 1 only
   - Add validation logic (check cache before API call)

3. **`src/cli/commands/sync.ts`**
   - Add Tier 2 loading on first sync
   - Check cache, load if missing

4. **`plugins/specweave-jira/commands/preload-dependencies.ts`** (NEW)
   - Implement `/specweave-jira:preload-dependencies` command
   - Bulk loading with progress tracking

### Code Changes (Pseudocode)

```typescript
// src/integrations/jira/jira-dependency-loader.ts (NEW)

export interface DependencyCache {
  projectKey: string;
  boards: any[];
  components: any[];
  versions: any[];
  lastUpdated: string;  // ISO-8601 timestamp
}

export class JiraDependencyLoader {
  private client: JiraClient;
  private cacheDir: string;

  constructor(client: JiraClient, cacheDir: string) {
    this.client = client;
    this.cacheDir = cacheDir;
  }

  /**
   * Tier 1: Load project metadata only (init)
   */
  async loadProjectMetadata(maxProjects: number = 50): Promise<any[]> {
    const cachePath = path.join(this.cacheDir, 'jira-projects.json');

    // Check cache (24-hour TTL)
    if (await this.isCacheValid(cachePath, 24)) {
      console.log('✅ Using cached project list');
      return await readJsonFile(cachePath);
    }

    console.log('🔍 Fetching project metadata...');

    // Fetch from API (Tier 1 - metadata only)
    const projects = await this.client.getProjects({ maxResults: maxProjects });

    // Cache for 24 hours
    await writeJsonFile(cachePath, { projects, lastUpdated: new Date().toISOString() });

    return projects;
  }

  /**
   * Tier 2: Load dependencies for specific project (on-demand)
   */
  async loadProjectDependencies(projectKey: string): Promise<DependencyCache> {
    const cachePath = path.join(this.cacheDir, `jira-${projectKey}-deps.json`);

    // Check cache (24-hour TTL)
    if (await this.isCacheValid(cachePath, 24)) {
      console.log(`✅ Using cached dependencies for ${projectKey}`);
      return await readJsonFile(cachePath);
    }

    console.log(`🔍 Loading ${projectKey} dependencies...`);

    // Fetch dependencies (4-7 API calls)
    const [boards, components, versions] = await Promise.all([
      this.client.getBoards(projectKey),
      this.client.getComponents(projectKey),
      this.client.getVersions(projectKey)
    ]);

    const deps: DependencyCache = {
      projectKey,
      boards,
      components,
      versions,
      lastUpdated: new Date().toISOString()
    };

    // Cache for 24 hours
    await writeJsonFile(cachePath, deps);

    return deps;
  }

  /**
   * Tier 3: Bulk pre-load all projects (optional command)
   */
  async preloadAllDependencies(projectKeys: string[]): Promise<void> {
    console.log(`📦 Pre-loading dependencies for ${projectKeys.length} projects...\n`);

    let completed = 0;

    for (const projectKey of projectKeys) {
      try {
        await this.loadProjectDependencies(projectKey);
        completed++;
        console.log(`✅ ${projectKey} (${completed}/${projectKeys.length})`);
      } catch (error) {
        console.error(`❌ ${projectKey}: ${(error as Error).message}`);
      }
    }

    console.log(`\n✅ Pre-loaded ${completed}/${projectKeys.length} projects`);
  }

  /**
   * Check if cache is valid (within TTL hours)
   */
  private async isCacheValid(cachePath: string, ttlHours: number): Promise<boolean> {
    if (!existsSync(cachePath)) return false;

    const cache = await readJsonFile(cachePath);
    if (!cache.lastUpdated) return false;

    const cacheAge = Date.now() - new Date(cache.lastUpdated).getTime();
    const ttlMs = ttlHours * 60 * 60 * 1000;

    return cacheAge < ttlMs;
  }
}
```

## Test Cases

### TC-US3-01: Tier 1 - Metadata Only (Integration Test)
```typescript
test('should load only metadata during init (Tier 1)', async () => {
  const loader = new JiraDependencyLoader(mockClient, '.specweave/cache');

  const projects = await loader.loadProjectMetadata(50);

  // Verify only metadata loaded
  expect(projects.length).toBeLessThanOrEqual(50);
  expect(projects[0]).toHaveProperty('key');
  expect(projects[0]).toHaveProperty('name');
  expect(projects[0]).not.toHaveProperty('boards');  // NOT loaded yet
});
```

### TC-US3-02: Tier 2 - On-Demand Loading (Integration Test)
```typescript
test('should load dependencies on first sync (Tier 2)', async () => {
  const loader = new JiraDependencyLoader(mockClient, '.specweave/cache');

  // First sync - loads from API
  const deps1 = await loader.loadProjectDependencies('BACKEND');
  expect(deps1.boards.length).toBeGreaterThan(0);

  // Second sync - uses cache (no API call)
  const apiCallsBefore = mockClient.callCount;
  const deps2 = await loader.loadProjectDependencies('BACKEND');
  expect(mockClient.callCount).toBe(apiCallsBefore);  // No new API calls
  expect(deps2).toEqual(deps1);  // Same data
});
```

### TC-US3-03: Tier 3 - Bulk Pre-Load (E2E Test)
```typescript
test('should pre-load all dependencies (Tier 3)', async () => {
  const loader = new JiraDependencyLoader(mockClient, '.specweave/cache');

  const projectKeys = ['BACKEND', 'FRONTEND', 'MOBILE'];

  await loader.preloadAllDependencies(projectKeys);

  // Verify all cached
  for (const key of projectKeys) {
    const cachePath = path.join('.specweave/cache', `jira-${key}-deps.json`);
    expect(existsSync(cachePath)).toBe(true);
  }
});
```

### TC-US3-04: Cache TTL Validation (Unit Test)
```typescript
test('should invalidate cache after 24 hours', async () => {
  const loader = new JiraDependencyLoader(mockClient, '.specweave/cache');

  // Create cache with old timestamp (25 hours ago)
  const oldCache = {
    projectKey: 'BACKEND',
    boards: [],
    lastUpdated: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
  };

  await writeJsonFile('.specweave/cache/jira-BACKEND-deps.json', oldCache);

  // Load dependencies (should re-fetch due to expired cache)
  const apiCallsBefore = mockClient.callCount;
  await loader.loadProjectDependencies('BACKEND');
  expect(mockClient.callCount).toBeGreaterThan(apiCallsBefore);  // New API calls
});
```

## Dependencies

- **US-001**: Smart Pagination (Tier 1 loading)
- **US-004**: Smart Caching (cache infrastructure)
- **Existing**: `src/integrations/jira/jira-client.ts` (API calls)

## Risks & Mitigations

### Risk: Cache Corruption
- **Problem**: Corrupted JSON cache causes failures
- **Mitigation**:
  - Validate JSON on read (catch parse errors)
  - Fallback to API fetch if cache invalid
  - Log corruption errors to `.specweave/logs/cache-errors.log`

### Risk: Stale Cache (Missed Updates)
- **Problem**: 24-hour TTL may miss board/component changes
- **Mitigation**:
  - Manual refresh command: `/specweave-jira:refresh-cache`
  - Automatic refresh on sync errors (404 board not found)
  - Configurable TTL: `JIRA_CACHE_TTL_HOURS=12`

---

**Implementation Tasks**: See increment plan
**Related User Stories**: US-004 (Smart Caching), US-005 (Import Commands)
