# Implementation Plan: Enhanced External Tool Import

**Increment**: 0048-external-tool-import-enhancement
**Feature**: FS-048 - Enhanced External Tool Import with Smart Pagination & CLI-First Defaults
**Status**: Planned
**Priority**: P1 (High)

---

## Architecture Overview

**Complete Architecture**: [System Design](../../docs/internal/architecture/system-design.md)

**Key Architectural Decisions**:
- [ADR-0050: Three-Tier Dependency Loading Architecture](../../docs/internal/architecture/adr/0050-three-tier-dependency-loading.md)
- [ADR-0051: Smart Caching with TTL (24-Hour Cache)](../../docs/internal/architecture/adr/0051-smart-caching-with-ttl.md)
- [ADR-0052: CLI-First Defaults and Smart Pagination](../../docs/internal/architecture/adr/0052-cli-first-defaults-and-smart-pagination.md)
- [ADR-0053: Progress Tracking and Cancelation Handling](../../docs/internal/architecture/adr/0053-progress-tracking-and-cancelation.md)

---

## Executive Summary

### Problem Statement

Current external tool integration (JIRA, Azure DevOps) has severe performance and UX issues:
- **Init time**: 2-5 minutes for 100+ projects (timeout errors common)
- **API calls**: 200-350 calls during init (hits rate limits)
- **UX**: Tedious manual selection (45/50 projects = 45 keystrokes)
- **Hidden features**: "Select all" requires discovering `<a>` keyboard shortcut

### Solution Architecture

**Four-Component Solution**:

1. **Three-Tier Dependency Loading** (ADR-0050)
   - Tier 1 (Init): Metadata only (< 5 seconds)
   - Tier 2 (On-Demand): Lazy loading on first sync
   - Tier 3 (Bulk): Optional pre-load command

2. **Smart Caching with TTL** (ADR-0051)
   - 24-hour cache for project lists and dependencies
   - 90% reduction in API calls during normal workflow
   - Offline work support (24-hour window)

3. **CLI-First Defaults** (ADR-0052)
   - Upfront strategy choice: "Import all" vs "Select specific" vs "Manual"
   - Default: "Import all" (CLI power user philosophy)
   - Smart pagination: 50-project limit during init

4. **Progress Tracking** (ADR-0053)
   - Real-time progress bars with ETA calculation
   - Graceful Ctrl+C cancelation (save state)
   - Resume capability for interrupted operations

### Success Metrics

**Performance**:
- ✅ Init time: < 30 seconds (currently 2-5 minutes)
- ✅ Zero timeout errors (currently frequent)
- ✅ API call reduction: 90% (cache hit rate)

**UX**:
- ✅ Keystroke reduction: 80% (deselect 5/50 vs select 45/50)
- ✅ Adoption: 90% users choose "Import all" default

---

## Technology Stack Summary

### Core Technologies

- **Language**: TypeScript 5.x (ESM modules)
- **Runtime**: Node.js 20 LTS
- **CLI Framework**: Inquirer.js (prompts), Ora (spinners), Chalk (colors)
- **HTTP Client**: Native `fetch()` (Node 18+)
- **File I/O**: Native `fs` module (no fs-extra dependency - ADR-0048)

### External APIs

**JIRA**:
- **Cloud**: REST API v3 (`/rest/api/3/project/search`)
- **Server/Data Center**: REST API v2 (`/rest/api/2/project/search`)
- **Rate Limit**: 3600 requests/hour
- **Authentication**: Basic Auth (email + API token)

**Azure DevOps**:
- **API Version**: 7.0
- **Endpoints**:
  - Projects: `/_apis/projects?$top=50`
  - Area Paths: `/wit/classificationnodes/areas?$depth=10`
  - Teams: `/_apis/teams`
- **Rate Limit**: 200 requests/user/hour
- **Authentication**: Personal Access Token (PAT)

### Cache Infrastructure

**Storage**:
- **Location**: `.specweave/cache/`
- **Format**: JSON files with ISO-8601 timestamps
- **TTL**: 24 hours (configurable via `JIRA_CACHE_TTL_HOURS`)
- **Size**: ~1-5MB per 50 projects

**Cache Files**:
```
.specweave/cache/
  ├── jira-projects.json              # Tier 1: Project list
  ├── jira-BACKEND-deps.json          # Tier 2: Dependencies
  ├── ado-projects.json               # Tier 1: ADO projects
  ├── ado-PLATFORM-deps.json          # Tier 2: ADO dependencies
  └── import-state.json               # Resume state
```

---

## Component Architecture

### 1. Three-Tier Dependency Loader

**Reference**: ADR-0050

#### Component Diagram

```
┌─────────────────────────────────────────┐
│ JiraDependencyLoader                    │
├─────────────────────────────────────────┤
│ + loadProjectMetadata(max: 50)         │  ← Tier 1: Init
│ + loadProjectDependencies(key: string) │  ← Tier 2: On-Demand
│ + preloadAllDependencies(keys[])       │  ← Tier 3: Bulk
│ - isCacheValid(path, ttl)              │  ← Cache validation
└─────────────────────────────────────────┘
         │
         ├─── Uses ───▶ CacheManager (ADR-0051)
         │
         └─── Uses ───▶ JiraClient (existing)
```

#### Implementation Files

**New Files**:
1. `src/integrations/jira/jira-dependency-loader.ts`
   - Three-tier loading logic
   - Cache integration
   - Parallel batch loading (Tier 3)

2. `src/integrations/ado/ado-dependency-loader.ts`
   - ADO equivalent of JIRA loader
   - Area path handling

3. `src/core/cache/cache-manager.ts`
   - Generic TTL-based cache
   - Atomic writes, corruption handling
   - Shared by JIRA and ADO loaders

**Modified Files**:
1. `src/cli/helpers/issue-tracker/jira.ts`
   - Replace `autoDiscoverJiraProjects()` with Tier 1 loading
   - Add `fetchProjectCount()` helper
   - Add `promptImportStrategy()` upfront choice

2. `src/cli/helpers/issue-tracker/ado.ts`
   - Same pattern as JIRA (consistency)

3. `src/cli/commands/sync.ts`
   - Add Tier 2 loading on first sync
   - Check cache before API call

#### API Contract

```typescript
export interface Project {
  key: string;           // "BACKEND"
  name: string;          // "Backend Services"
  type: string;          // "software", "agile", "cmmi"
  lead: {
    displayName: string;
    accountId: string;
  };
}

export interface DependencyCache {
  projectKey: string;
  boards: Board[];       // JIRA boards or ADO area paths
  components: Component[];
  versions: Version[];
  lastUpdated: string;   // ISO-8601
}

export class JiraDependencyLoader {
  /**
   * Tier 1: Load project metadata only (< 5 seconds)
   * @param maxProjects - Limit initial load (default: 50)
   * @returns Project metadata (no dependencies)
   */
  async loadProjectMetadata(maxProjects: number = 50): Promise<Project[]>

  /**
   * Tier 2: Load dependencies for specific project (2-5 seconds)
   * @param projectKey - JIRA project key (e.g., "BACKEND")
   * @returns Cached or fresh dependencies
   */
  async loadProjectDependencies(projectKey: string): Promise<DependencyCache>

  /**
   * Tier 3: Bulk pre-load all projects (1-2 minutes)
   * @param projectKeys - All configured project keys
   * @param options - Progress tracking options
   */
  async preloadAllDependencies(
    projectKeys: string[],
    options?: { showProgress?: boolean; cancelHandler?: CancelationHandler }
  ): Promise<void>
}
```

#### Performance Targets

| Tier | Operation | Target Time | API Calls | Cache |
|------|-----------|-------------|-----------|-------|
| 1 | Init | < 5 seconds | 1 (batch) | 24h TTL |
| 2 | First sync | 2-5 seconds | 4-7 per project | 24h TTL |
| 3 | Bulk pre-load | 1-2 minutes | 200-350 (throttled) | 24h TTL |

---

### 2. Smart Caching System

**Reference**: ADR-0051

#### Cache Manager Architecture

```
┌─────────────────────────────────────────┐
│ CacheManager                            │
├─────────────────────────────────────────┤
│ + get<T>(key: string): T | null         │
│ + set<T>(key: string, data: T): void    │
│ + delete(key: string): void             │
│ + clearAll(): void                      │
│ - isValid(cache): boolean               │  ← TTL validation
│ - getCachePath(key): string             │
└─────────────────────────────────────────┘
         │
         └─── Used by ───▶ JiraDependencyLoader
                      └───▶ AdoDependencyLoader
```

#### Cache File Format

```typescript
interface CachedData<T> {
  data: T;                  // Actual payload
  lastUpdated: string;      // ISO-8601 timestamp
  ttlHours?: number;        // Optional override (default: 24)
  metadata?: {
    source: string;         // 'api' | 'manual-refresh'
    requestCount?: number;  // How many API calls to generate
  };
}
```

**Example**:
```json
{
  "data": {
    "projects": [
      { "key": "BACKEND", "name": "Backend Services" }
    ]
  },
  "lastUpdated": "2025-11-21T10:00:00Z",
  "ttlHours": 24,
  "metadata": {
    "source": "api",
    "requestCount": 1
  }
}
```

#### Cache Operations

**Read Flow**:
```typescript
async get<T>(key: string): Promise<T | null> {
  // 1. Check existence
  if (!existsSync(cachePath)) return null;

  // 2. Read and parse JSON
  try {
    const cache = await readJsonFile(cachePath);
  } catch (error) {
    // Corrupted cache → delete, return null
    await this.delete(key);
    return null;
  }

  // 3. Validate TTL
  if (!this.isValid(cache)) {
    await this.delete(key);  // Expired
    return null;
  }

  // 4. Return data
  return cache.data as T;
}
```

**Write Flow** (Atomic):
```typescript
async set<T>(key: string, data: T): Promise<void> {
  const cache = {
    data,
    lastUpdated: new Date().toISOString()
  };

  // Atomic write: temp file → rename
  const tempPath = `${cachePath}.tmp`;
  await writeJsonFile(tempPath, cache);
  await fs.rename(tempPath, cachePath);  // Atomic on POSIX
}
```

#### Rate Limit Integration

```typescript
class RateLimitChecker {
  static shouldProceed(response: Response): boolean {
    const remaining = parseInt(
      response.headers.get('X-RateLimit-Remaining') || '100'
    );

    if (remaining < 10) {
      console.warn('⚠️ Rate limit low, using stale cache');
      return false;  // Use stale cache instead of refreshing
    }

    return true;
  }

  static async handleRateLimitError(error: any): Promise<void> {
    if (error.status === 429) {
      const retryAfter = error.headers?.get('Retry-After') || 60;
      console.error(`❌ Rate limit exceeded. Retry after ${retryAfter}s.`);
      console.log('   Using stale cache (if available)...');
    }
  }
}
```

#### Cache Maintenance Commands

**Manual Refresh**:
```bash
# Refresh all caches
/specweave-jira:refresh-cache --all

# Refresh specific project
/specweave-jira:refresh-cache --project BACKEND

# Refresh project list only
/specweave-jira:refresh-cache --projects-only
```

**Cleanup**:
```bash
# Delete cache older than 7 days
/specweave:cleanup-cache --older-than 7d

# Delete all cache
/specweave:cleanup-cache --all

# Show cache statistics
/specweave:cache-stats
```

---

### 3. CLI-First Init Flow

**Reference**: ADR-0052

#### Upfront Strategy Prompt

```
Found 127 accessible projects. How would you like to import?

1. ✨ Import all 127 projects (recommended for full sync)     [DEFAULT]
2. 📋 Select specific projects (interactive checkbox)
3. ✏️  Enter project keys manually (comma-separated)

[Use arrow keys to navigate, Enter to confirm]
```

**Implementation**:
```typescript
async function promptImportStrategy(projectCount: number): Promise<string> {
  if (projectCount <= 1) {
    return 'all';  // Auto-select single project
  }

  const { importStrategy } = await inquirer.prompt({
    type: 'list',
    name: 'importStrategy',
    message: `Found ${projectCount} accessible projects. How would you like to import?`,
    choices: [
      {
        name: `✨ Import all ${projectCount} projects (recommended)`,
        value: 'all',
        short: 'Import all'
      },
      {
        name: '📋 Select specific projects',
        value: 'specific',
        short: 'Select specific'
      },
      {
        name: '✏️ Enter project keys manually',
        value: 'manual',
        short: 'Manual entry'
      }
    ],
    default: 'all'  // CLI-first default
  });

  return importStrategy;
}
```

#### Smart Pagination Flow

```typescript
async function autoDiscoverJiraProjects(credentials: JiraCredentials): Promise<string[]> {
  // Step 1: Fetch count (fast, lightweight)
  const projectCount = await fetchProjectCount(credentials);
  // API: /rest/api/3/project/search?maxResults=0
  // Time: ~500ms

  if (projectCount === 0) {
    console.log('⚠️ No accessible projects found.');
    return [];
  }

  // Step 2: Prompt strategy
  const strategy = await promptImportStrategy(projectCount);

  // Step 3: Route based on choice
  switch (strategy) {
    case 'all':
      return await fetchAllProjectsAsync(credentials, projectCount);
      // Batches of 50, progress bar, cancelation support

    case 'specific':
      return await selectSpecificProjects(credentials);
      // All checkboxes CHECKED by default

    case 'manual':
      return await promptManualProjectKeys();
      // Comma-separated input, validation
  }
}
```

#### Checkbox Default State (CLI-First)

```typescript
async function selectSpecificProjects(credentials: JiraCredentials): Promise<string[]> {
  const allProjects = await fetchAllProjects(credentials);

  console.log('💡 All projects selected by default. Deselect unwanted with <space>, toggle all with <a>\n');

  const { selectedProjects } = await inquirer.prompt({
    type: 'checkbox',
    name: 'selectedProjects',
    message: 'Select projects (all selected by default - deselect unwanted):',
    choices: allProjects.map(p => ({
      name: `${p.key} - ${p.name}`,
      value: p.key,
      checked: true  // ← ALL CHECKED BY DEFAULT
    })),
    validate: (selected) => selected.length > 0 || 'Select at least one project'
  });

  return selectedProjects;
}
```

#### Safety Confirmation (Large Imports)

```typescript
if (projectCount > 100) {
  const { confirm } = await inquirer.prompt({
    type: 'confirm',
    name: 'confirm',
    message: `Import all ${projectCount} projects? This may take 1-2 minutes.`,
    default: false  // Safe default
  });

  if (!confirm) {
    console.log('⏭️  Import cancelled. Choose "Select specific" to filter projects.\n');
    return await promptImportStrategy(projectCount);
  }
}
```

---

### 4. Progress Tracking System

**Reference**: ADR-0053

#### Progress Tracker Component

```
┌─────────────────────────────────────────┐
│ ProgressTracker                         │
├─────────────────────────────────────────┤
│ + update(item, status)                  │
│ + finish()                              │
│ - renderProgressBar(percentage)         │
│ - getEta()                              │  ← Linear extrapolation
│ - getElapsedTime()                      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ CancelationHandler                      │
├─────────────────────────────────────────┤
│ + shouldCancel(): boolean               │
│ - handleCancelation()                   │  ← SIGINT listener
│ - saveState(state)                      │
└─────────────────────────────────────────┘
```

#### Visual Output Format

```
Importing projects... 47/127 (37%) [=============>          ] [47s elapsed, ~2m remaining]
✅ BACKEND (completed)
✅ FRONTEND (completed)
⏳ MOBILE (loading dependencies...)
```

**Components**:
- **Counter**: `47/127` - Absolute progress
- **Percentage**: `(37%)` - Relative progress
- **ASCII Bar**: `[=============>          ]` - Visual indicator (30 chars)
- **Time**: `[47s elapsed, ~2m remaining]` - Time tracking
- **Status**: `✅ Success | ⏳ In Progress | ❌ Error`

#### Usage Example

```typescript
const tracker = new ProgressTracker({
  total: 127,
  label: 'Importing projects',
  showEta: true,
  updateInterval: 5  // Update every 5 items
});

const cancelHandler = new CancelationHandler(async (state) => {
  await saveImportState(state);
});

for (const project of projects) {
  // Check cancelation
  if (cancelHandler.shouldCancel()) {
    await saveState({ succeeded, failed, skipped });
    break;
  }

  try {
    await importProject(project);
    tracker.update(project.key, 'success');
    succeeded.push(project.key);
  } catch (error) {
    console.error(`❌ ${project.key}: ${(error as Error).message}`);
    tracker.update(project.key, 'error');
    failed.push({ key: project.key, error: (error as Error).message });
  }
}

tracker.finish();
```

#### Resume State Format

```typescript
interface ImportState {
  operation: string;       // "jira-import-projects"
  total: number;           // 127
  completed: number;       // 47
  succeeded: string[];     // ["BACKEND", "FRONTEND", ...]
  failed: Array<{          // Failed projects with errors
    key: string;
    error: string;
  }>;
  skipped: string[];       // Archived, inaccessible
  lastProject: string;     // "MOBILE"
  timestamp: string;       // ISO-8601
}
```

**Storage**: `.specweave/cache/import-state.json`

**Expiration**: 24 hours (force fresh start if stale)

---

## Data Models

### Project Metadata (Tier 1)

```typescript
interface Project {
  key: string;              // Unique identifier (e.g., "BACKEND")
  name: string;             // Human-readable name
  type: string;             // "software", "agile", "cmmi", "safe", "business"
  lead: {
    displayName: string;
    accountId: string;
    emailAddress?: string;
  };
  status?: string;          // "active", "archived"
  description?: string;
}
```

### Project Dependencies (Tier 2)

```typescript
interface DependencyCache {
  projectKey: string;
  boards: Board[];
  components: Component[];
  versions: Version[];
  teams?: Team[];           // ADO only
  areaPaths?: AreaPath[];   // ADO only
  lastUpdated: string;
}

interface Board {
  id: number;
  name: string;
  type: string;             // "scrum", "kanban"
  location?: {
    projectKey: string;
  };
}

interface Component {
  id: string;
  name: string;
  description?: string;
  lead?: {
    displayName: string;
  };
}

interface Version {
  id: string;
  name: string;
  released: boolean;
  releaseDate?: string;
}

// ADO-specific
interface AreaPath {
  id: string;
  name: string;
  path: string;             // "Platform/Backend/API"
  children: AreaPath[];
}
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (Days 1-3)

**Goal**: Cache manager, dependency loader foundation

**Tasks**:
1. Create `CacheManager` class with TTL validation (ADR-0051)
2. Create `JiraDependencyLoader` with Tier 1 loading (ADR-0050)
3. Add `fetchProjectCount()` helper to JIRA client
4. Write unit tests for cache TTL validation
5. Write unit tests for Tier 1 loading

**Deliverables**:
- ✅ `src/core/cache/cache-manager.ts`
- ✅ `src/integrations/jira/jira-dependency-loader.ts`
- ✅ Unit tests: 90%+ coverage

**Acceptance Criteria**:
- Cache correctly validates 24-hour TTL
- Tier 1 loading fetches project metadata only (< 5 seconds)
- Corrupted cache auto-deleted, fallback to API works

---

### Phase 2: CLI-First Init Flow (Days 4-6)

**Goal**: Upfront strategy prompt, smart pagination

**Tasks**:
1. Implement `promptImportStrategy()` upfront choice (ADR-0052)
2. Implement `fetchAllProjectsAsync()` with batching
3. Modify checkbox defaults to `checked: true`
4. Add safety confirmation for large imports (> 100 projects)
5. Update JIRA init flow to use new prompts
6. Write integration tests for init flow

**Deliverables**:
- ✅ Modified `src/cli/helpers/issue-tracker/jira.ts`
- ✅ Modified `plugins/specweave-jira/lib/project-selector.ts`
- ✅ Integration tests for init flow

**Acceptance Criteria**:
- Upfront choice prompt appears with 3 options
- "Import all" is default (pre-selected)
- Checkbox mode has all projects checked by default
- Init completes < 30 seconds for 100 projects

---

### Phase 3: Progress Tracking (Days 7-9)

**Goal**: Real-time progress bars, cancelation handling

**Tasks**:
1. Create `ProgressTracker` class with ETA calculation (ADR-0053)
2. Create `CancelationHandler` with SIGINT listener
3. Implement resume state persistence
4. Integrate progress tracking into async fetch flow
5. Add `--resume` flag to import commands
6. Write integration tests for cancelation/resume

**Deliverables**:
- ✅ `src/core/progress/progress-tracker.ts`
- ✅ `src/core/progress/cancelation-handler.ts`
- ✅ `src/core/progress/import-state-manager.ts`
- ✅ Integration tests for cancelation

**Acceptance Criteria**:
- Progress bar updates every 5 items
- Ctrl+C saves state gracefully
- `--resume` continues from last checkpoint
- Final summary shows succeeded/failed/skipped counts

---

### Phase 4: Tier 2/3 Dependency Loading (Days 10-12)

**Goal**: On-demand and bulk dependency loading

**Tasks**:
1. Implement Tier 2 loading in `loadProjectDependencies()`
2. Integrate Tier 2 into first sync operation
3. Create `/specweave-jira:preload-dependencies` command (Tier 3)
4. Add progress tracking to Tier 3 bulk loading
5. Implement rate limit handling (respect X-RateLimit headers)
6. Write integration tests for all 3 tiers

**Deliverables**:
- ✅ Completed `JiraDependencyLoader` (all 3 tiers)
- ✅ `plugins/specweave-jira/commands/preload-dependencies.ts`
- ✅ Modified `src/cli/commands/sync.ts` (Tier 2 integration)
- ✅ Integration tests for dependency loading

**Acceptance Criteria**:
- First sync loads dependencies (Tier 2) in 2-5 seconds
- Second sync uses cache (0 API calls)
- Tier 3 command loads 50 projects in 1-2 minutes
- Rate limits respected (pause if < 10 requests remaining)

---

### Phase 5: ADO Integration (Days 13-15)

**Goal**: Apply same patterns to Azure DevOps

**Tasks**:
1. Create `AdoDependencyLoader` (mirror JIRA structure)
2. Implement ADO area path mapping (hierarchical)
3. Add ADO-specific Tier 2 dependencies (teams, area paths)
4. Create `/specweave-ado:preload-dependencies` command
5. Update ADO init flow with same upfront choice
6. Write integration tests for ADO

**Deliverables**:
- ✅ `src/integrations/ado/ado-dependency-loader.ts`
- ✅ `src/integrations/ado/area-path-mapper.ts`
- ✅ `plugins/specweave-ado/commands/preload-dependencies.ts`
- ✅ Modified `src/cli/helpers/issue-tracker/ado.ts`
- ✅ Integration tests for ADO

**Acceptance Criteria**:
- ADO init flow matches JIRA (consistency)
- Area paths mapped correctly (top-level, two-level, full tree)
- ADO Tier 2/3 loading works same as JIRA
- Cache shared between JIRA and ADO loaders

---

### Phase 6: Cache Maintenance Commands (Days 16-17)

**Goal**: Manual cache refresh, cleanup, statistics

**Tasks**:
1. Create `/specweave-jira:refresh-cache` command
2. Create `/specweave-ado:refresh-cache` command
3. Create `/specweave:cleanup-cache` command
4. Create `/specweave:cache-stats` command
5. Write E2E tests for maintenance commands

**Deliverables**:
- ✅ `plugins/specweave-jira/commands/refresh-cache.ts`
- ✅ `plugins/specweave-ado/commands/refresh-cache.ts`
- ✅ `src/cli/commands/cleanup-cache.ts`
- ✅ `src/cli/commands/cache-stats.ts`
- ✅ E2E tests for commands

**Acceptance Criteria**:
- Manual refresh bypasses TTL, forces API fetch
- Cleanup deletes cache > 7 days old
- Stats show cache size, file count, oldest cache
- All commands tested in E2E

---

### Phase 7: Performance Testing & Optimization (Days 18-20)

**Goal**: Validate < 30 second init target, optimize bottlenecks

**Tasks**:
1. Performance test with real JIRA instance (50, 100, 500 projects)
2. Measure API call counts, cache hit rates
3. Profile bottlenecks (JSON parsing, file I/O, network)
4. Optimize hot paths (parallel API calls, streaming JSON)
5. Validate zero timeout errors in 100 consecutive runs
6. Document performance benchmarks

**Deliverables**:
- ✅ Performance test suite
- ✅ Benchmark report (init time, API calls, cache hits)
- ✅ Optimization commits (if needed)
- ✅ Performance documentation

**Acceptance Criteria**:
- Init time < 30 seconds for 100 projects (95th percentile)
- Zero timeout errors in 100 consecutive runs
- Cache hit rate > 90% during normal workflow
- Documented performance benchmarks

---

## Security Considerations

### API Token Handling

**Storage**:
- Tokens stored in `.env` file (project-specific)
- `.env` added to `.gitignore` (prevent accidental commit)
- No hardcoded tokens in code (enforce via pre-commit hook)

**Transmission**:
- HTTPS only (no plain HTTP for API calls)
- Basic Auth header: `Authorization: Basic base64(email:token)`
- Tokens never logged (sanitize log output)

**Validation**:
- Token format validation before API calls
- Graceful error handling for invalid tokens
- Clear error messages (don't expose token in logs)

### Rate Limit Compliance

**JIRA Cloud**:
- Rate limit: 3600 requests/hour (1 req/sec average)
- Header: `X-RateLimit-Remaining`
- Strategy: Pause refresh if < 10 requests remaining

**Azure DevOps**:
- Rate limit: 200 requests/user/hour
- Header: `Retry-After` (429 errors)
- Strategy: Exponential backoff on 429 errors

**Implementation**:
```typescript
class RateLimitChecker {
  static shouldProceed(response: Response): boolean {
    const remaining = parseInt(
      response.headers.get('X-RateLimit-Remaining') || '100'
    );

    if (remaining < 10) {
      console.warn('⚠️ Rate limit low, using stale cache');
      return false;
    }

    return true;
  }
}
```

### Cache Security

**File Permissions**:
- Cache files: `0600` (owner read/write only)
- Cache directory: `0700` (owner access only)
- No world-readable cache data

**Data Sanitization**:
- No sensitive data in cache (no passwords, tokens)
- Project metadata only (keys, names, types)
- Dependencies (boards, components) are non-sensitive

**Cache Integrity**:
- JSON validation on read (catch malformed data)
- Atomic writes (temp file → rename)
- Automatic cleanup of corrupted cache

---

## Testing Strategy

### Unit Tests (90%+ Coverage)

**Cache Manager**:
- ✅ TTL validation (expired vs valid)
- ✅ Corrupted JSON handling
- ✅ Atomic write operations
- ✅ Cache hit/miss scenarios

**Dependency Loader**:
- ✅ Tier 1 loading (metadata only)
- ✅ Tier 2 loading (dependencies)
- ✅ Tier 3 loading (bulk)
- ✅ Cache integration

**Progress Tracker**:
- ✅ Progress bar rendering
- ✅ ETA calculation (various scenarios)
- ✅ Final summary formatting

### Integration Tests

**Init Flow**:
- ✅ Upfront strategy prompt (3 choices)
- ✅ "Import all" async fetch with progress
- ✅ Checkbox mode (all checked by default)
- ✅ Manual entry validation

**Dependency Loading**:
- ✅ Tier 1 during init (< 5 seconds)
- ✅ Tier 2 on first sync (cache miss → API call)
- ✅ Tier 2 on second sync (cache hit → no API call)
- ✅ Tier 3 bulk pre-load (progress tracking)

**Cancelation/Resume**:
- ✅ Ctrl+C saves state correctly
- ✅ Resume continues from last checkpoint
- ✅ State expires after 24 hours

**Cache Maintenance**:
- ✅ Manual refresh bypasses TTL
- ✅ Cleanup deletes old cache
- ✅ Stats show accurate metrics

### E2E Tests (Playwright)

**Full Init Workflow**:
- ✅ User runs `specweave init`
- ✅ Upfront choice prompt appears
- ✅ "Import all" selected by default
- ✅ Progress bar shows during fetch
- ✅ Init completes < 30 seconds
- ✅ Multi-project folders created

**Cancelation Workflow**:
- ✅ User starts bulk import
- ✅ User presses Ctrl+C mid-import
- ✅ Progress saved message shown
- ✅ User runs `--resume` flag
- ✅ Import continues from last position

**Cache Workflow**:
- ✅ First sync makes API calls
- ✅ Second sync uses cache (fast)
- ✅ Manual refresh updates cache
- ✅ Stats command shows metrics

### Performance Tests

**Benchmarks**:
- ✅ Init time vs project count (50, 100, 200, 500)
- ✅ API call count per operation
- ✅ Cache hit rate during normal workflow
- ✅ Memory usage during bulk operations

**Targets**:
- Init: < 30 seconds for 100 projects (95th percentile)
- First sync: 2-5 seconds per project
- Cache hit rate: > 90% during development
- Zero timeout errors: 100 consecutive runs

---

## Migration & Backward Compatibility

### Existing Projects (Already Initialized)

**Behavior**:
- No change required (backward compatible)
- Existing `.env` config works as-is
- Cache will be populated on next sync

**Optional Enhancement**:
```bash
# Re-run init to add more projects
specweave init .

→ Detected existing JIRA config (2 projects)
→ Do you want to:
  1. Keep existing (skip)
  2. Add more projects (merge)
  3. Replace all (reconfigure)
```

### New Projects

**Behavior**:
- Get enhanced flow automatically
- Upfront strategy choice
- Smart pagination (50-project limit)
- Three-tier dependency loading

**First-Time Experience**:
```bash
$ specweave init .

Found 127 accessible projects. How would you like to import?
1. ✨ Import all 127 projects (recommended)     [DEFAULT]
2. 📋 Select specific projects
3. ✏️ Enter project keys manually

[User selects "Import all"]

Importing projects... 127/127 (100%) ✅
✅ Init complete! (28 seconds)

Created 127 project folders in .specweave/docs/internal/specs/
```

---

## Known Limitations & Future Enhancements

### Limitations

1. **Linear ETA Calculation**: Assumes uniform processing time (inaccurate if variance high)
   - **Future**: Use rolling average (last 10 items) for better accuracy

2. **No Server-Side Filtering**: Filters applied client-side after fetching all projects
   - **Future**: Use JQL search for server-side filtering (reduce API response size)

3. **Single-User Concurrency**: Cache may race if multiple processes access simultaneously
   - **Future**: Add file locking or use SQLite for cache

4. **Fixed 24-Hour TTL**: Not optimal for all data types (some change less frequently)
   - **Future**: Separate TTLs (project list: 7 days, dependencies: 24 hours)

### Future Enhancements

**Phase 2 (Post-MVP)**:

1. **Smart Filtering** (US-008)
   - Active projects only
   - By type (Agile, CMMI, SAFe)
   - Custom JQL queries
   - Saved filter presets

2. **Incremental Import** (US-005)
   - `/specweave-jira:import-projects` post-init
   - Merge with existing projects (no duplicates)
   - Resume support for interrupted imports

3. **ADO Area Path Mapping** (US-006)
   - Hierarchical area path discovery
   - Granularity selection (top-level, two-level, full tree)
   - Bidirectional sync (ADO ↔ SpecWeave)

4. **Compression**:
   - gzip cache files > 1MB
   - Reduce disk space by 60-80%

5. **Background Refresh**:
   - Optional nightly cache refresh (cron job)
   - Auto-update project list weekly

---

## Success Metrics (Validation)

### Performance Metrics

| Metric | Baseline (Current) | Target | Measurement Method |
|--------|-------------------|--------|-------------------|
| Init time (100 projects) | 2-5 minutes | < 30 seconds | Performance test suite |
| API calls (init) | 200-350 | < 10 | Mock API call counter |
| Cache hit rate | 0% (no cache) | > 90% | Cache statistics tracking |
| Timeout errors | Frequent | Zero | 100 consecutive runs |
| Memory usage | N/A | < 100MB | Node.js heap profiler |

### UX Metrics

| Metric | Baseline | Target | Measurement Method |
|--------|----------|--------|-------------------|
| Keystroke reduction | 0% | 80% | User testing (select 45/50) |
| Default adoption | N/A | 90% | Telemetry (% choosing "Import all") |
| User satisfaction | N/A | 8/10+ | Post-release survey |

### Reliability Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Zero init failures | 100% success rate | 100 consecutive init runs |
| Resume success rate | 95%+ | Integration tests |
| Cache corruption rate | < 0.1% | Production monitoring |

---

## Implementation Risks & Mitigations

### Risk 1: API Rate Limits During Testing

**Problem**: Frequent testing hits JIRA/ADO rate limits

**Mitigation**:
- Mock API clients for unit/integration tests
- Real API only for E2E tests (limited runs)
- Use test JIRA instance (separate rate limit)

### Risk 2: Cache Corruption in Production

**Problem**: Interrupted writes corrupt cache files

**Mitigation**:
- Atomic writes (temp file → rename)
- JSON validation on read (auto-delete if invalid)
- Fallback to API fetch if cache unavailable

### Risk 3: Performance Regression

**Problem**: New features slow down init

**Mitigation**:
- Continuous performance testing (CI/CD)
- Benchmark suite runs on every commit
- Fail build if init time > 35 seconds (100 projects)

### Risk 4: User Confusion (Behavior Change)

**Problem**: Existing users expect old UX

**Mitigation**:
- Comprehensive release notes
- Migration guide with examples
- Temporary backward compatibility flag: `SPECWEAVE_USE_LEGACY_INIT=true`
- In-app notification on first run

---

## Related Documentation

### Architecture (Living Docs)

- [ADR-0050: Three-Tier Dependency Loading](../../docs/internal/architecture/adr/0050-three-tier-dependency-loading.md)
- [ADR-0051: Smart Caching with TTL](../../docs/internal/architecture/adr/0051-smart-caching-with-ttl.md)
- [ADR-0052: CLI-First Defaults and Smart Pagination](../../docs/internal/architecture/adr/0052-cli-first-defaults-and-smart-pagination.md)
- [ADR-0053: Progress Tracking and Cancelation](../../docs/internal/architecture/adr/0053-progress-tracking-and-cancelation.md)
- [System Design](../../docs/internal/architecture/system-design.md)

### Feature Specifications (PM Strategy)

- [FS-048 Feature Spec](../../docs/internal/specs/_features/FS-048/FEATURE.md)
- [US-001: Smart Pagination](../../docs/internal/specs/specweave/FS-048/us-001-smart-pagination-during-init.md)
- [US-002: CLI-First Defaults](../../docs/internal/specs/specweave/FS-048/us-002-cli-first-defaults.md)
- [US-003: Three-Tier Loading](../../docs/internal/specs/specweave/FS-048/us-003-three-tier-dependency-loading.md)
- [US-004: Smart Caching](../../docs/internal/specs/specweave/FS-048/us-004-smart-caching-with-ttl.md)
- [US-007: Progress Tracking](../../docs/internal/specs/specweave/FS-048/us-007-progress-tracking.md)

### Existing Code

- `src/cli/helpers/issue-tracker/jira.ts` - Current auto-discovery
- `src/integrations/jira/jira-client.ts` - JIRA API client
- `src/integrations/jira/jira-hierarchy-mapper.ts` - Universal hierarchy mapping
- `plugins/specweave-jira/lib/project-selector.ts` - Existing checkbox UI

---

**Created**: 2025-11-21
**Author**: Architect Agent
**Estimated Duration**: 20 days
**Status**: Ready for Test-Aware Planner
