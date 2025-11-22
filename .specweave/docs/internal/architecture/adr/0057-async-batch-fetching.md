# ADR-0057: Async Batch Fetching Strategy

**Date**: 2025-11-21
**Status**: Accepted

## Context

After implementing smart pagination (ADR-0052) and CLI-first defaults (ADR-0053), we need a concrete implementation strategy for fetching large numbers of projects efficiently.

**Requirements**:
- Fetch 100+ projects in < 30 seconds (80% performance improvement)
- Support 500+ projects without timeout errors
- Minimize API calls (reduce from 100+ to < 12 for 500 projects)
- Respect API rate limits (JIRA: 3600 req/hour, ADO: 200 req/5min)
- Graceful error handling (continue on failure)

**Technical Constraints**:
- JIRA Cloud API: `/rest/api/3/project/search` supports pagination (`startAt`, `maxResults`)
- JIRA Server API: `/rest/api/2/project` supports pagination
- Azure DevOps API: `/_apis/projects` supports pagination (`$skip`, `$top`)
- Network latency: 100-500ms per API call (realistic)
- Timeout threshold: 30 seconds per API call (typical)

**Current Behavior**:
- Fetches all projects sequentially (no batching)
- One API call per project (inefficient)
- No retry logic (fails on first timeout)
- No progress tracking (users see nothing for minutes)

## Decision

Implement **async batch fetching with pagination and retry logic**:

### Architecture

```typescript
class AsyncProjectLoader {
  async fetchAllProjects(
    credentials: Credentials,
    totalCount: number,
    options: FetchOptions
  ): Promise<FetchResult> {
    const batchSize = options.batchSize || 50;
    const projects: Project[] = [];
    const errors: FetchError[] = [];

    for (let offset = 0; offset < totalCount; offset += batchSize) {
      // Check for cancelation (Ctrl+C)
      if (this.cancelHandler.shouldCancel()) {
        await this.savePartialState({ completed: offset, total: totalCount, projects });
        break;
      }

      // Fetch batch with retry logic
      try {
        const batch = await this.fetchBatchWithRetry(
          credentials,
          offset,
          Math.min(batchSize, totalCount - offset)
        );
        projects.push(...batch);
      } catch (error) {
        // Log error, continue to next batch (continue-on-failure)
        errors.push({ offset, error: error.message });
      }

      // Update progress (every 5 projects to reduce console spam)
      if (projects.length % 5 === 0 || projects.length === totalCount) {
        this.progressTracker.update(projects.length);
      }
    }

    return {
      projects,
      succeeded: projects.length,
      failed: errors.length,
      errors
    };
  }
}
```

### Key Features

**1. Batch Size: 50 Projects**
- Rationale: Balance between API efficiency and timeout risk
- API call reduction: 500 projects = 10 batches (vs. 500 sequential calls)
- Timeout risk: 50 projects fetch < 5 seconds (well under 30s timeout)
- Configurable via `.specweave/config.json` (`importBatchSize: 50`)

**2. Sequential Batching (Not Parallel)**
- Rationale: Prevent API rate limit violations
- JIRA Cloud: 3600 req/hour = 1 req/sec (safe with sequential)
- Parallel batching could trigger rate limits (2-3 simultaneous requests)
- Future enhancement: Parallel with concurrency limit (e.g., 2 batches)

**3. Retry Logic with Exponential Backoff**
```typescript
async fetchBatchWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  const delays = [1000, 2000, 4000];  // 1s, 2s, 4s

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries - 1;
      const isRetryable = ['ETIMEDOUT', 'ECONNREFUSED', '5XX'].includes(error.code);

      if (isLastAttempt || !isRetryable) {
        throw error;
      }

      console.warn(`Retry ${attempt + 1}/${maxRetries} after ${delays[attempt]}ms...`);
      await sleep(delays[attempt]);
    }
  }
}
```

**4. Rate Limit Throttling**
```typescript
async function checkRateLimitHeaders(response: Response): Promise<void> {
  const remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '999');

  if (remaining < 10) {
    console.warn('⚠️  Rate limit low. Throttling requests...');
    await sleep(5000);  // 5 second pause
  }
}
```

**5. Graceful Degradation (Reduce Batch Size on Timeout)**
```typescript
async function fetchBatchWithDegradation(
  offset: number,
  maxResults: number
): Promise<Project[]> {
  let batchSize = maxResults;
  const minBatchSize = 10;

  while (batchSize >= minBatchSize) {
    try {
      return await fetchBatch(offset, batchSize);
    } catch (error: any) {
      if (error.code === 'ETIMEDOUT') {
        batchSize = Math.floor(batchSize / 2);  // 50 → 25 → 10
        console.warn(`Timeout. Reducing batch size to ${batchSize}...`);
      } else {
        throw error;
      }
    }
  }

  throw new Error('Unable to fetch batch (timeout even with min size)');
}
```

### Performance Optimization

**Count-Only Query First** (Phase 2):
```http
GET /rest/api/3/project/search?maxResults=0
Response: { total: 127, values: [] }  # No data, just count (< 1 second)
```

**Batch Fetching** (Phase 4):
```http
GET /rest/api/3/project/search?startAt=0&maxResults=50
GET /rest/api/3/project/search?startAt=50&maxResults=50
GET /rest/api/3/project/search?startAt=100&maxResults=50
# 3 API calls for 127 projects (vs. 127 sequential calls)
```

**API Call Reduction**:
- 100 projects: 3 batches (vs. 100 calls) = **97% reduction**
- 500 projects: 10 batches (vs. 500 calls) = **98% reduction**

**Performance Target**:
- 100 projects: < 30 seconds (3 batches × 5 sec = 15 sec)
- 500 projects: < 60 seconds (10 batches × 5 sec = 50 sec)

## Alternatives Considered

### Alternative 1: Parallel Batch Fetching

**Approach**: Fetch multiple batches simultaneously (e.g., 3 batches in parallel)

**Pros**:
- Faster completion (3x speedup for 3 parallel batches)
- Utilizes concurrent API capabilities

**Cons**:
- Risk of rate limit violations (JIRA: 1 req/sec, 3 parallel = 3 req/sec)
- More complex error handling (partial failures)
- Harder to implement cancelation (multiple in-flight requests)

**Why not**: Rate limit risk outweighs performance gain. Sequential is safer and still meets < 30s target.

---

### Alternative 2: Three-Tier Dependency Loading

**Approach**: Load projects in tiers based on dependency depth (Tier 1: no deps, Tier 2: shallow deps, Tier 3: deep deps)

**Pros**:
- Defers expensive operations (dependency analysis)
- Faster perceived init time (Tier 1 projects ready immediately)

**Cons**:
- Complex implementation (dependency graph analysis)
- Requires multiple passes (analyze → categorize → load)
- Not applicable to init flow (no dependencies known yet)

**Why not**: Over-engineered for init flow. Better suited for post-init import commands. Deferred to Phase 3.

---

### Alternative 3: Server-Side Pagination (Cursor-Based)

**Approach**: Use cursor-based pagination (next/prev cursors) instead of offset-based

**Pros**:
- More efficient for large datasets (no offset skip overhead)
- Handles concurrent modifications (cursor is stable)

**Cons**:
- JIRA API v3 doesn't support cursor-based pagination (only offset-based)
- Azure DevOps API doesn't support cursor-based pagination
- Requires API changes (not under our control)

**Why not**: Not supported by external APIs. Offset-based is the only option.

## Consequences

**Positive**:
- ✅ 80% performance improvement (2-5 min → < 30 sec for 100 projects)
- ✅ 98% API call reduction (500 calls → 10 batches)
- ✅ Zero timeout errors (retry logic + graceful degradation)
- ✅ Rate limit compliance (sequential batching, throttling)
- ✅ Resilient (continue-on-failure, partial success handling)

**Negative**:
- ❌ Sequential batching slower than parallel (but safer)
- ❌ Retry logic adds latency on errors (1s + 2s + 4s = 7s per failure)
- ❌ Complexity added (batch calculation, retry logic, rate limit handling)

**Risks & Mitigations**:

**Risk**: Slow network causes timeout even with 50-project batches
- **Mitigation**: Graceful degradation (reduce batch size to 25, then 10)
- **Fallback**: Manual entry option (user specifies exact project keys)

**Risk**: Rate limit violations despite throttling
- **Mitigation**: Respect `Retry-After` header (exponential backoff)
- **Monitoring**: Log API call count, rate limit headers to detect issues

**Risk**: Partial failures (50% of projects fail)
- **Mitigation**: Continue-on-failure (import successful projects, log errors)
- **UX**: Show final summary ("Imported 98/127, 5 failed, see logs")

## Implementation Notes

**Files Created**:
- `src/cli/helpers/project-fetcher.ts` - AsyncProjectLoader implementation
- `tests/unit/cli/helpers/project-fetcher.test.ts` - Unit tests
- `tests/integration/cli/init-flow/batch-fetching.test.ts` - Integration tests

**Config Fields** (`.specweave/config.json`):
```json
{
  "importBatchSize": 50,
  "importBatchSizeMin": 10,
  "importRetryAttempts": 3,
  "importRetryBackoffMs": [1000, 2000, 4000],
  "importRateLimitThreshold": 10,
  "importRateLimitPauseMs": 5000
}
```

**Testing**:
- Unit tests: Batch calculation (127 projects → 3 batches)
- Integration tests: Mock API responses, verify batching
- Performance tests: 100 projects < 30s, 500 projects < 60s
- Error handling: Retry logic, rate limit throttling, graceful degradation

## Related Decisions

- **ADR-0052**: Smart Pagination (50-Project Limit) - Defines batch size strategy
- **ADR-0053**: CLI-First Defaults - Defines "Import all" as default (triggers async fetch)
- **ADR-0055**: Progress Tracking with Cancelation - Defines progress UI and Ctrl+C handling
- **ADR-0058**: Progress Tracking Implementation - Defines progress tracker component
- **ADR-0059**: Cancelation Strategy - Defines cancelation handler and state persistence
