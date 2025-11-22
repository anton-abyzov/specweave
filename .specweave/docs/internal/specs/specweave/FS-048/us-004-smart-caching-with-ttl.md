---
id: US-004
feature: FS-048
title: "Smart Caching with TTL (24-Hour Cache)"
status: proposed
priority: P1
created: 2025-11-21
---

# US-004: Smart Caching with TTL (24-Hour Cache)

**GitHub Project**: https://github.com/anton-abyzov/specweave/issues/706

**Feature**: [FS-048 - Enhanced External Tool Import](../../../_features/FS-048/FEATURE.md)

## User Story

**As a** developer running `specweave sync` multiple times per day
**I want** project metadata cached with 24-hour expiry
**So that** I avoid redundant API calls and respect rate limits

## Business Value

- **Performance**: 90% reduction in API calls during normal development
- **Reliability**: Avoid JIRA/ADO rate limit errors (3600 req/hour)
- **Offline Work**: Cached data enables sync without internet (for 24 hours)

## Acceptance Criteria

### AC-US4-01: 24-Hour TTL for Project List
- **Priority**: P1
- **Testable**: Yes (unit test)
- **Description**: Project list cached for 24 hours after init
- **Cache File**: `.specweave/cache/jira-projects.json`
- **Structure**:
  ```json
  {
    "projects": [...],
    "lastUpdated": "2025-11-21T10:00:00Z"
  }
  ```
- **Validation**: Cache hit if `lastUpdated` < 24 hours ago

### AC-US4-02: Per-Project Dependency Cache
- **Priority**: P1
- **Testable**: Yes (unit test)
- **Description**: Dependencies cached per-project with 24-hour TTL
- **Cache Files**:
  - `.specweave/cache/jira-BACKEND-deps.json`
  - `.specweave/cache/jira-FRONTEND-deps.json`
- **Structure**:
  ```json
  {
    "projectKey": "BACKEND",
    "boards": [...],
    "components": [...],
    "versions": [...],
    "lastUpdated": "2025-11-21T10:30:00Z"
  }
  ```
- **Validation**: Each project has separate cache file

### AC-US4-03: Cache Validation on Startup
- **Priority**: P1
- **Testable**: Yes (integration test)
- **Description**: Check cache timestamps on every command execution
- **Behavior**:
  - If cache < 24 hours old → use cache
  - If cache > 24 hours old → re-fetch from API
  - If cache missing → fetch from API
  - If cache corrupted → delete cache, fetch from API
- **Validation**: Unit tests for all 4 scenarios

### AC-US4-04: Manual Refresh Command
- **Priority**: P2
- **Testable**: Yes (E2E test)
- **Description**: Manual cache refresh bypasses TTL
- **Command**: `/specweave-jira:refresh-cache`
- **Options**:
  - `--all` - Refresh all caches (projects + dependencies)
  - `--projects` - Refresh project list only
  - `--project BACKEND` - Refresh specific project dependencies
- **Validation**: Cache `lastUpdated` timestamp updated after command

### AC-US4-05: Respect API Rate Limits
- **Priority**: P0
- **Testable**: Yes (integration test with mock API)
- **Description**: Don't refresh cache if rate limit hit
- **Behavior**:
  - Check `X-RateLimit-Remaining` header
  - If < 10 requests remaining → skip refresh, use stale cache
  - If 429 error → exponential backoff, use stale cache
- **Validation**: Stale cache used when rate limit hit

## Technical Implementation

### Cache Directory Structure

```
.specweave/
  └── cache/
      ├── jira-projects.json              # Tier 1: Project list
      ├── jira-BACKEND-deps.json          # Tier 2: BACKEND dependencies
      ├── jira-FRONTEND-deps.json         # Tier 2: FRONTEND dependencies
      ├── jira-MOBILE-deps.json           # Tier 2: MOBILE dependencies
      ├── ado-projects.json               # ADO project list
      ├── ado-PLATFORM-deps.json          # ADO dependencies
      └── .gitignore                      # Ignore all cache files
```

### Cache Manager (New Module)

```typescript
// src/core/cache/cache-manager.ts (NEW)

export interface CacheOptions {
  ttlHours?: number;           // Default: 24
  autoRefresh?: boolean;       // Default: false
  respectRateLimit?: boolean;  // Default: true
}

export class CacheManager {
  private cacheDir: string;
  private options: CacheOptions;

  constructor(cacheDir: string, options: CacheOptions = {}) {
    this.cacheDir = cacheDir;
    this.options = {
      ttlHours: options.ttlHours ?? 24,
      autoRefresh: options.autoRefresh ?? false,
      respectRateLimit: options.respectRateLimit ?? true
    };
  }

  /**
   * Get cached data (validate TTL)
   */
  async get<T>(key: string): Promise<T | null> {
    const cachePath = this.getCachePath(key);

    if (!existsSync(cachePath)) {
      return null;  // Cache miss
    }

    try {
      const cache = await readJsonFile(cachePath);

      // Validate TTL
      if (!this.isValid(cache)) {
        await this.delete(key);  // Expired, delete cache
        return null;
      }

      return cache.data as T;
    } catch (error) {
      // Corrupted cache, delete and return null
      await this.delete(key);
      return null;
    }
  }

  /**
   * Set cache with timestamp
   */
  async set<T>(key: string, data: T): Promise<void> {
    const cachePath = this.getCachePath(key);
    const cache = {
      data,
      lastUpdated: new Date().toISOString()
    };

    await mkdirpSync(path.dirname(cachePath));
    await writeJsonFile(cachePath, cache);
  }

  /**
   * Validate cache TTL
   */
  private isValid(cache: any): boolean {
    if (!cache.lastUpdated) return false;

    const cacheAge = Date.now() - new Date(cache.lastUpdated).getTime();
    const ttlMs = this.options.ttlHours! * 60 * 60 * 1000;

    return cacheAge < ttlMs;
  }

  /**
   * Delete cache file
   */
  async delete(key: string): Promise<void> {
    const cachePath = this.getCachePath(key);
    if (existsSync(cachePath)) {
      await fs.unlink(cachePath);
    }
  }

  /**
   * Clear all caches
   */
  async clearAll(): Promise<void> {
    if (existsSync(this.cacheDir)) {
      const files = await fs.readdir(this.cacheDir);
      await Promise.all(files.map(f => fs.unlink(path.join(this.cacheDir, f))));
    }
  }

  /**
   * Get cache file path
   */
  private getCachePath(key: string): string {
    return path.join(this.cacheDir, `${key}.json`);
  }
}
```

### Rate Limit Checker (New Module)

```typescript
// src/integrations/jira/rate-limit-checker.ts (NEW)

export class RateLimitChecker {
  /**
   * Check if API call should proceed (rate limit check)
   */
  static shouldProceed(response: Response): boolean {
    const remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '100');
    const resetTime = response.headers.get('X-RateLimit-Reset');

    if (remaining < 10) {
      console.warn('⚠️  Rate limit low (< 10 requests remaining)');
      console.warn('   Using cached data, refresh will retry after:', resetTime);
      return false;
    }

    return true;
  }

  /**
   * Handle 429 error (rate limit exceeded)
   */
  static async handleRateLimitError(error: any): Promise<void> {
    if (error.status === 429) {
      const retryAfter = error.headers?.get('Retry-After') || 60;
      console.error(`❌ Rate limit exceeded. Retry after ${retryAfter} seconds.`);
      console.log('   Using stale cache (if available)...');
    }
  }
}
```

## Test Cases

### TC-US4-01: 24-Hour TTL Validation (Unit Test)
```typescript
test('should use cache if < 24 hours old', async () => {
  const cache = new CacheManager('.specweave/cache', { ttlHours: 24 });

  // Set cache
  await cache.set('jira-projects', { projects: [...] });

  // Get cache (should hit)
  const data = await cache.get('jira-projects');
  expect(data).not.toBeNull();
  expect(data.projects.length).toBeGreaterThan(0);
});

test('should invalidate cache after 24 hours', async () => {
  const cache = new CacheManager('.specweave/cache', { ttlHours: 24 });

  // Mock old cache (25 hours ago)
  const oldCache = {
    data: { projects: [...] },
    lastUpdated: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
  };
  await writeJsonFile('.specweave/cache/jira-projects.json', oldCache);

  // Get cache (should miss due to TTL)
  const data = await cache.get('jira-projects');
  expect(data).toBeNull();
});
```

### TC-US4-02: Per-Project Cache (Integration Test)
```typescript
test('should cache dependencies per project', async () => {
  const cache = new CacheManager('.specweave/cache');

  // Cache BACKEND dependencies
  await cache.set('jira-BACKEND-deps', { boards: [...] });

  // Cache FRONTEND dependencies
  await cache.set('jira-FRONTEND-deps', { boards: [...] });

  // Verify separate cache files
  expect(existsSync('.specweave/cache/jira-BACKEND-deps.json')).toBe(true);
  expect(existsSync('.specweave/cache/jira-FRONTEND-deps.json')).toBe(true);
});
```

### TC-US4-03: Cache Validation on Startup (Integration Test)
```typescript
test('should validate cache on every command', async () => {
  const cache = new CacheManager('.specweave/cache');

  // Set cache
  await cache.set('jira-projects', { projects: [...] });

  // Simulate command execution
  const loader = new JiraDependencyLoader(mockClient, '.specweave/cache');
  const projects = await loader.loadProjectMetadata();

  // Verify no API call (cache hit)
  expect(mockClient.callCount).toBe(0);
});
```

### TC-US4-04: Manual Refresh Command (E2E Test)
```typescript
test('should refresh cache on manual command', async ({ page }) => {
  await page.goto('/');

  // Set old cache
  await page.evaluate(() => {
    localStorage.setItem('jira-projects-lastUpdated',
      new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString()  // 20 hours old
    );
  });

  // Run refresh command
  await page.getByRole('button', { name: 'Refresh Cache' }).click();

  // Verify cache updated
  const newTimestamp = await page.evaluate(() =>
    localStorage.getItem('jira-projects-lastUpdated')
  );

  expect(new Date(newTimestamp).getTime()).toBeGreaterThan(Date.now() - 60000);  // < 1 min old
});
```

### TC-US4-05: Rate Limit Handling (Integration Test)
```typescript
test('should use stale cache when rate limit hit', async () => {
  const mockClient = createMockJiraClient();

  // Mock 429 response (rate limit exceeded)
  mockClient.getProjects = vi.fn().mockRejectedValue({
    status: 429,
    headers: { get: () => '60' }  // Retry after 60 seconds
  });

  // Set stale cache (25 hours old)
  const cache = new CacheManager('.specweave/cache');
  await cache.set('jira-projects', { projects: [...] });

  // Try to load (should use stale cache instead of failing)
  const loader = new JiraDependencyLoader(mockClient, '.specweave/cache');
  const projects = await loader.loadProjectMetadata();

  expect(projects).not.toBeNull();  // Stale cache used
  expect(projects.length).toBeGreaterThan(0);
});
```

## Dependencies

- **US-003**: Three-Tier Dependency Loading (uses cache infrastructure)
- **Existing**: `src/utils/fs-native.js` (file I/O utilities)

## Risks & Mitigations

### Risk: Cache Corruption
- **Problem**: Malformed JSON breaks cache
- **Mitigation**:
  - Validate JSON on read (catch parse errors)
  - Delete corrupted cache automatically
  - Log errors to `.specweave/logs/cache-errors.log`

### Risk: Stale Data (Missed Updates)
- **Problem**: 24-hour TTL may miss critical changes
- **Mitigation**:
  - Configurable TTL: `JIRA_CACHE_TTL_HOURS=12`
  - Manual refresh: `/specweave-jira:refresh-cache`
  - Auto-refresh on sync errors (404, 401)

---

**Implementation Tasks**: See increment plan
**Related User Stories**: US-003 (Three-Tier Loading), US-005 (Import Commands)
