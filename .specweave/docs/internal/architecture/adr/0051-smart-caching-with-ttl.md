# ADR-0051: Smart Caching with TTL (24-Hour Cache)

**Date**: 2025-11-21
**Status**: Accepted

## Context

External tool synchronization (JIRA, Azure DevOps) makes frequent API calls that:
- Cause rate limit errors (JIRA: 3600 req/hour, ADO: 200 req/hour)
- Slow down normal development workflow (2-5 seconds per sync)
- Break offline work scenarios (no internet = no sync)
- Waste API quota on unchanged data (boards rarely change)

**Current Behavior** (No Caching):
- Every sync makes 4-7 API calls per project
- 10 syncs/day × 5 projects × 5 calls = 250 API calls/day
- Hits rate limits frequently during batch operations
- No offline work capability

**User Pain Points**:
- "Why is sync so slow?" - Every sync fetches dependencies
- "Rate limit exceeded" - Legitimate syncs blocked by quota
- "Can't sync without WiFi" - No offline capability
- "Boards rarely change" - Wasteful API calls for static data

## Decision

Implement smart caching with 24-hour TTL (Time-To-Live):

### Cache Architecture

**Two-Layer Caching**:
1. **Project List Cache**: All accessible projects (Tier 1 - ADR-0050)
2. **Dependency Cache**: Per-project dependencies (Tier 2 - ADR-0050)

**Cache Directory Structure**:
```
.specweave/
  └── cache/
      ├── jira-projects.json              # Project list (24h TTL)
      ├── jira-BACKEND-deps.json          # BACKEND dependencies (24h TTL)
      ├── jira-FRONTEND-deps.json         # FRONTEND dependencies (24h TTL)
      ├── ado-projects.json               # ADO project list (24h TTL)
      ├── ado-PLATFORM-deps.json          # ADO dependencies (24h TTL)
      └── .gitignore                      # Ignore all cache files
```

### Cache TTL Strategy

**24-Hour Default TTL** (configurable):
- Balance between freshness and performance
- Most changes (board renames, components) seen within 1 day
- Reduces API calls by 90% during normal development
- Long enough for multi-day offline work

**Why 24 Hours?**
- **Not 1 Hour**: Too frequent refreshes, minimal performance gain
- **Not 1 Week**: Stale data risk (boards renamed, components deleted)
- **Not Infinite**: Cache invalidation becomes critical issue
- **24 Hours**: Sweet spot for development workflow (daily standup cycle)

**Configurable via Environment**:
```bash
# .env or shell
JIRA_CACHE_TTL_HOURS=24        # Default (recommended)
JIRA_CACHE_TTL_HOURS=12        # More frequent updates
JIRA_CACHE_TTL_HOURS=72        # Longer for stable projects
```

### Cache Validation Logic

```typescript
interface CachedData<T> {
  data: T;
  lastUpdated: string;  // ISO-8601 timestamp
}

class CacheManager {
  async get<T>(key: string): Promise<T | null> {
    // 1. Check if cache file exists
    if (!existsSync(cachePath)) return null;

    // 2. Read and parse JSON
    const cache = await readJsonFile(cachePath);

    // 3. Validate TTL
    if (!this.isValid(cache)) {
      await this.delete(key);  // Expired, delete
      return null;
    }

    // 4. Return cached data
    return cache.data as T;
  }

  private isValid(cache: CachedData<any>): boolean {
    const cacheAge = Date.now() - new Date(cache.lastUpdated).getTime();
    const ttlMs = this.options.ttlHours * 60 * 60 * 1000;
    return cacheAge < ttlMs;
  }
}
```

### Cache Hit Rate Optimization

**Goal**: > 90% cache hit rate during normal development

**Strategies**:
1. **Separate TTLs by Data Type**:
   - Project list: 24 hours (changes infrequently)
   - Dependencies: 24 hours (configurable per data type)
   - User-specific data: 1 hour (changes frequently)

2. **Smart Refresh Triggers**:
   - Automatic: On sync errors (404 board not found)
   - Manual: `/specweave-jira:refresh-cache` command
   - Scheduled: Optional nightly refresh (cron job)

3. **Partial Refresh**:
   - Refresh single project: `/specweave-jira:refresh-cache --project BACKEND`
   - Refresh all: `/specweave-jira:refresh-cache --all`

### API Rate Limit Integration

**Don't Refresh Cache if Rate Limit Hit**:
```typescript
class RateLimitChecker {
  static shouldProceed(response: Response): boolean {
    const remaining = parseInt(
      response.headers.get('X-RateLimit-Remaining') || '100'
    );

    if (remaining < 10) {
      console.warn('⚠️ Rate limit low, using stale cache');
      return false;  // Use stale cache instead
    }

    return true;
  }
}
```

**Exponential Backoff on 429 Errors**:
```typescript
async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || 60;
        console.log(`Rate limit hit, retrying after ${retryAfter}s...`);
        await sleep(retryAfter * 1000);
        continue;
      }

      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000);  // Exponential backoff
    }
  }

  throw new Error('Max retries exceeded');
}
```

## Alternatives Considered

### Alternative 1: No Caching (Always Fresh)

- **Pros**: Always up-to-date data, no cache invalidation complexity
- **Cons**: Hits rate limits, slow syncs, no offline work
- **Why not**: Poor developer experience, breaks legitimate workflows

### Alternative 2: Infinite TTL (Cache Forever)

- **Pros**: Maximum performance, zero API calls after first fetch
- **Cons**: Stale data breaks sync when boards/components change
- **Why not**: Cache invalidation becomes critical (hard to detect changes)

### Alternative 3: Conditional Requests (ETag/Last-Modified)

- **Pros**: Server determines freshness, perfect accuracy
- **Cons**: JIRA/ADO APIs don't support ETags consistently
- **Why not**: Not reliable across all endpoints

### Alternative 4: Polling with Short TTL (5 Minutes)

- **Pros**: More up-to-date data than 24 hours
- **Cons**: Frequent API calls defeat caching purpose
- **Why not**: Doesn't solve rate limit or offline problems

## Consequences

### Positive

- ✅ **90% reduction in API calls**: Normal workflow uses cache extensively
- ✅ **Rate limit compliance**: Fewer calls = lower risk of 429 errors
- ✅ **Offline work enabled**: 24-hour cache supports day-long offline sessions
- ✅ **Faster syncs**: Cache hit = instant (no network latency)
- ✅ **Configurable TTL**: Teams can adjust based on their change frequency

### Negative

- ❌ **Stale data risk**: Changes take up to 24 hours to propagate
- ❌ **Cache corruption**: Malformed JSON requires error handling
- ❌ **Storage overhead**: ~1-5MB per 50 projects (acceptable)
- ❌ **Cache invalidation complexity**: Manual refresh needed for urgent changes

### Neutral

- ⚖️ **Manual refresh available**: Users can force update when needed
- ⚖️ **Auto-refresh on errors**: 404 errors trigger cache refresh
- ⚖️ **Configurable TTL**: Balance freshness vs performance per team

## Risks & Mitigations

### Risk 1: Cache Corruption (Malformed JSON)

**Problem**: Write interrupted, cache file corrupted

**Mitigation**:
- Atomic writes: Write to temp file, rename on success
- JSON validation: Catch parse errors on read
- Automatic cleanup: Delete corrupted cache, fallback to API
- Error logging: Track corruption events in `.specweave/logs/cache-errors.log`

### Risk 2: Stale Data Breaks Sync

**Problem**: Board deleted in JIRA but cache shows it exists

**Mitigation**:
- Auto-refresh on 404 errors: Detect missing resources, refresh cache
- User notification: "Board BACKEND-Board not found, refreshing cache..."
- Manual refresh: `/specweave-jira:refresh-cache` available
- Shorter TTL option: `JIRA_CACHE_TTL_HOURS=6` for fast-changing projects

### Risk 3: Disk Space Exhaustion

**Problem**: Cache files accumulate over time (500 projects = ~50MB)

**Mitigation**:
- Automatic cleanup: Delete cache > 7 days old during init
- Manual cleanup: `/specweave:cleanup-cache --older-than 7d`
- Size monitoring: Warn if cache directory > 100MB
- Compression: gzip cache files > 1MB (future enhancement)

### Risk 4: Race Conditions (Concurrent Writes)

**Problem**: Multiple processes writing same cache file simultaneously

**Mitigation**:
- File locking: Use `fs.open()` with exclusive flag
- Unique temp files: Write to `{cache-key}-{timestamp}.tmp`
- Last-write-wins: Accept that concurrent writes may lose data
- **Note**: Rare in practice (single-user dev environment)

## Cache Maintenance Commands

### Refresh Cache (Manual)

```bash
# Refresh all caches
/specweave-jira:refresh-cache --all

# Refresh specific project
/specweave-jira:refresh-cache --project BACKEND

# Refresh project list only (not dependencies)
/specweave-jira:refresh-cache --projects-only
```

### Cleanup Cache (Maintenance)

```bash
# Delete cache older than 7 days
/specweave:cleanup-cache --older-than 7d

# Delete all cache (force refresh)
/specweave:cleanup-cache --all

# Show cache statistics
/specweave:cache-stats
# Output:
#   Cache directory: .specweave/cache
#   Total files: 52
#   Total size: 4.3 MB
#   Oldest cache: jira-LEGACY-deps.json (9 days old)
```

## Related Decisions

- **ADR-0050**: Three-Tier Dependency Loading (cache used in Tier 2/3)
- **ADR-0053**: Progress Tracking and Cancelation (cache used during bulk operations)

## Implementation Notes

### Files to Create

1. `src/core/cache/cache-manager.ts` - Generic TTL-based cache manager
2. `src/core/cache/rate-limit-checker.ts` - Rate limit integration
3. `src/cli/commands/cleanup-cache.ts` - Cache maintenance command
4. `src/cli/commands/cache-stats.ts` - Cache statistics command

### Files to Modify

1. `src/integrations/jira/jira-dependency-loader.ts` - Use CacheManager
2. `src/integrations/ado/ado-dependency-loader.ts` - Use CacheManager
3. `plugins/specweave-jira/commands/refresh-cache.ts` - Manual refresh
4. `plugins/specweave-ado/commands/refresh-cache.ts` - Manual refresh

### Cache File Format

```typescript
// Generic cache wrapper
interface CachedData<T> {
  data: T;                      // Actual payload
  lastUpdated: string;          // ISO-8601 timestamp
  ttlHours?: number;            // Optional override (default: 24)
  metadata?: {                  // Optional metadata
    source: string;             // 'api' | 'manual-refresh'
    requestCount?: number;      // How many API calls to generate
  };
}
```

---

**Created**: 2025-11-21
**Author**: Architect Agent
**Status**: Accepted (FS-048 implementation)
