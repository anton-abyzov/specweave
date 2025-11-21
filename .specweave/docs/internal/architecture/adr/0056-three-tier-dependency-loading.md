# ADR-0056: Three-Tier Dependency Loading Architecture

**Date**: 2025-11-21
**Status**: Accepted

## Context

SpecWeave's current external tool integration (JIRA, Azure DevOps) loads all project dependencies during `specweave init`, causing severe performance issues:

**Current Behavior**:
- 50 projects × 4-7 API calls each = 200-350 API calls during init
- Init time: 2-5 minutes for 100+ project instances
- Timeout errors on large instances (500+ projects)
- API rate limits hit frequently (JIRA: 3600 req/hour, ADO: 200 req/hour)

**Why Dependencies Are Expensive**:
- **Boards** (JIRA): `/rest/agile/1.0/board?projectKeyOrId=BACKEND` - 1 API call
- **Components**: `/rest/api/3/project/BACKEND/components` - 1 API call
- **Versions**: `/rest/api/3/project/BACKEND/versions` - 1 API call
- **Area Paths** (ADO): `/wit/classificationnodes/areas?$depth=10` - 1 API call
- **Teams** (ADO): `/_apis/teams` - 1 API call

**User Impact**:
- DevOps engineers wait 2-5 minutes during setup → Poor first impression
- Timeouts cause init failures → Manual retry loops
- Rate limits block legitimate sync operations → Workflow disruption

## Decision

Implement three-tier dependency loading architecture:

### Tier 1: Init - Metadata Only (< 5 seconds)

**Data Loaded**:
- Project key (e.g., "BACKEND")
- Project name (e.g., "Backend Services")
- Project type (Agile, CMMI, SAFe, Software, Business)
- Lead name (for display)

**Data NOT Loaded**:
- Boards, area paths, components, versions, sprints
- Team assignments, custom fields, workflows

**API Calls**: 1 batch request per platform
- JIRA: `/rest/api/3/project/search?maxResults=50`
- ADO: `/_apis/projects?$top=50`

**Performance Target**: < 5 seconds for 50 projects

### Tier 2: On-Demand - Lazy Loading (2-5 seconds per project)

**Trigger**: First sync operation for a project
- `/specweave:sync` for specific project
- `/specweave:increment` targeting project

**Data Loaded**:
- Boards (JIRA) or area paths (ADO)
- Components, versions, teams
- Project-specific configuration

**API Calls**: 4-7 per project (only when needed)

**Cache**: Results cached for 24 hours in `.specweave/cache/{platform}-{PROJECT}-deps.json`

**Performance Target**: 2-5 seconds per project (first sync only)

### Tier 3: Bulk Pre-Load - Optional Command (1-2 minutes for 50 projects)

**Trigger**: Manual command execution
- `/specweave-jira:preload-dependencies`
- `/specweave-ado:preload-dependencies`

**Use Case**: Offline work preparation, batch sync readiness

**Data Loaded**: All dependencies for ALL configured projects

**API Calls**: 200-350 (batched, throttled)

**Progress Tracking**: Real-time progress bar, cancelation support

**Performance Target**: 1-2 minutes for 50 projects

## Implementation Architecture

### Cache Structure

```
.specweave/
  └── cache/
      ├── jira-projects.json              # Tier 1: Project list (24h TTL)
      ├── jira-BACKEND-deps.json          # Tier 2: BACKEND dependencies (24h TTL)
      ├── jira-FRONTEND-deps.json         # Tier 2: FRONTEND dependencies (24h TTL)
      ├── ado-projects.json               # Tier 1: ADO project list (24h TTL)
      ├── ado-PLATFORM-deps.json          # Tier 2: ADO dependencies (24h TTL)
      └── import-state.json               # Tier 3: Resume state (24h TTL)
```

### Cache File Format

```typescript
// Tier 1: Project List Cache
{
  "projects": [
    {
      "key": "BACKEND",
      "name": "Backend Services",
      "type": "software",
      "lead": { "displayName": "John Doe" }
    }
  ],
  "lastUpdated": "2025-11-21T10:00:00Z"
}

// Tier 2: Project Dependencies Cache
{
  "projectKey": "BACKEND",
  "boards": [
    { "id": 1, "name": "BACKEND Board" }
  ],
  "components": [
    { "id": 10001, "name": "API" }
  ],
  "versions": [
    { "id": 10100, "name": "v1.0.0" }
  ],
  "lastUpdated": "2025-11-21T10:30:00Z"
}
```

### Dependency Loader API

```typescript
export class JiraDependencyLoader {
  // Tier 1: Load project metadata only (init)
  async loadProjectMetadata(maxProjects: number = 50): Promise<Project[]>

  // Tier 2: Load dependencies for specific project (on-demand)
  async loadProjectDependencies(projectKey: string): Promise<DependencyCache>

  // Tier 3: Bulk pre-load all projects (optional)
  async preloadAllDependencies(projectKeys: string[]): Promise<void>

  // Cache validation (24-hour TTL)
  private async isCacheValid(cachePath: string, ttlHours: number): Promise<boolean>
}
```

## Alternatives Considered

### Alternative 1: Eager Loading (Current Implementation)

- **Pros**: All data available immediately, no lazy loading complexity
- **Cons**: 2-5 minute init time, timeout errors, rate limit issues
- **Why not**: Violates user expectation of fast init (< 30 seconds)

### Alternative 2: No Caching (Always Fetch)

- **Pros**: Always fresh data, no cache invalidation complexity
- **Cons**: Every sync makes 4-7 API calls, hits rate limits frequently
- **Why not**: Poor developer experience during normal workflow

### Alternative 3: Infinite TTL (Cache Forever)

- **Pros**: Maximum performance, zero API calls after init
- **Cons**: Stale data (boards renamed, components added/removed)
- **Why not**: Breaks sync when external data changes

### Alternative 4: One-Week TTL (Instead of 24 Hours)

- **Pros**: Fewer cache refreshes, better performance
- **Cons**: Project list changes less frequently than dependencies
- **Why not**: Partially adopted - project list gets 24h, dependencies can be configured longer

## Consequences

### Positive

- ✅ **80% init time reduction**: 2-5 minutes → < 30 seconds
- ✅ **Zero timeout errors**: Tier 1 loading is fast (< 5 seconds)
- ✅ **Rate limit compliance**: 90% fewer API calls during normal workflow
- ✅ **Offline work support**: Cached dependencies enable sync without internet (24 hours)
- ✅ **Scalability**: Supports 500+ project instances without performance degradation
- ✅ **User control**: Tier 3 allows users to pre-load when convenient

### Negative

- ❌ **Cache invalidation complexity**: Must track TTL, handle corruption, validate on read
- ❌ **Stale data risk**: 24-hour TTL may miss board renames, component changes
- ❌ **Storage overhead**: Cache files consume disk space (typically < 10MB for 50 projects)
- ❌ **First-sync latency**: Tier 2 loading adds 2-5 seconds to first sync per project

### Neutral

- ⚖️ **Configurable TTL**: Users can adjust via `JIRA_CACHE_TTL_HOURS=12` env var
- ⚖️ **Manual refresh**: `/specweave-jira:refresh-cache` bypasses TTL when needed
- ⚖️ **Auto-refresh on errors**: 404/401 errors trigger automatic cache refresh

## Risks & Mitigations

### Risk 1: Cache Corruption (Malformed JSON)

**Problem**: Corrupted cache file breaks dependency loading

**Mitigation**:
- Validate JSON on read (try/catch parse errors)
- Delete corrupted cache automatically
- Fallback to API fetch if cache invalid
- Log errors to `.specweave/logs/cache-errors.log`

### Risk 2: Stale Cache (Missed Updates)

**Problem**: Board renamed in JIRA but cache shows old name

**Mitigation**:
- 24-hour TTL ensures updates seen within 1 day
- Manual refresh command: `/specweave-jira:refresh-cache`
- Automatic refresh on sync errors (404 board not found)
- Configurable TTL: `JIRA_CACHE_TTL_HOURS=6` for frequent changes

### Risk 3: Disk Space Exhaustion

**Problem**: Large instances (500+ projects) generate large cache files

**Mitigation**:
- Cache cleanup command: `/specweave:cleanup-cache --older-than 7d`
- Automatic cleanup: Delete cache > 7 days old during init
- Compression: Use gzip for cache files if > 1MB
- Monitoring: Warn if cache directory > 100MB

### Risk 4: API Rate Limits During Bulk Pre-Load

**Problem**: Tier 3 loading 500 projects hits rate limits

**Mitigation**:
- Throttling: 5 concurrent requests max (configurable)
- Respect `X-RateLimit-Remaining` header (pause if < 10)
- Exponential backoff on 429 errors
- Progress tracking: Show "Rate limit hit, pausing for 60s..."
- Resume capability: Save state, continue later

## Related Decisions

- **ADR-0051**: Smart Caching with TTL (24-Hour Cache)
- **ADR-0052**: CLI-First Defaults and Smart Pagination
- **ADR-0053**: Progress Tracking and Cancelation Handling

## Implementation Notes

### Files to Create

1. `src/core/cache/cache-manager.ts` - Generic cache manager (TTL validation)
2. `src/integrations/jira/jira-dependency-loader.ts` - Three-tier loading logic
3. `src/integrations/ado/ado-dependency-loader.ts` - ADO equivalent
4. `plugins/specweave-jira/commands/preload-dependencies.ts` - Tier 3 command
5. `plugins/specweave-ado/commands/preload-dependencies.ts` - ADO Tier 3 command

### Files to Modify

1. `src/cli/helpers/issue-tracker/jira.ts` - Use Tier 1 during init
2. `src/cli/helpers/issue-tracker/ado.ts` - Use Tier 1 during init
3. `src/cli/commands/sync.ts` - Add Tier 2 loading on first sync

### Migration Path

**Existing Projects** (already initialized):
- No change required (backward compatible)
- Cache will be populated on next sync
- Optional: Run `/specweave-jira:preload-dependencies` to populate cache

**New Projects**:
- Get three-tier loading automatically
- Init completes in < 30 seconds
- First sync per project takes 2-5 seconds (dependency loading)

---

**Created**: 2025-11-21
**Author**: Architect Agent
**Status**: Accepted (FS-048 implementation)
