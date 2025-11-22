---
total_tasks: 72
completed: 7
by_user_story:
  US-001: 10
  US-002: 8
  US-004: 12
  US-005: 10
  US-006: 12
  US-007: 10
  US-008: 10
test_mode: test-after
coverage_target: 85
---

# Tasks: Enhanced External Tool Import - Phase 1b-7

## User Story: US-004 - Smart Caching with TTL (24-Hour Cache)

**Linked ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04, AC-US4-05
**Tasks**: 12 total, 0 completed

### T-001: Implement CacheManager with TTL Validation

**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03
**Status**: [x] completed
**Priority**: P0 (Critical)
**Estimated Effort**: 6 hours

**Description**: Create CacheManager class with 24-hour TTL validation, atomic writes, corruption handling, and separate project/dependency caching.

**Test Plan** (Embedded):
- **Coverage Target**: 95%
- **Framework**: Vitest + Node.js fs

**Given-When-Then Scenarios**:

#### TC-001: Valid Cache Hit (Within TTL)
**Given** cached project list exists (age < 24 hours)
**When** `get('jira-projects')` is called
**Then** return cached data without API call
**And** log cache hit with TTL remaining

#### TC-002: Expired Cache Miss (Beyond TTL)
**Given** cached project list exists (age > 24 hours)
**When** `get('jira-projects')` is called
**Then** return null (cache miss)
**And** delete expired cache file automatically

#### TC-003: Cache Corruption Handling
**Given** corrupted cache file (malformed JSON)
**When** `get('jira-projects')` is called
**Then** catch parse error, delete corrupted file
**And** return null (fallback to API)
**And** log error to `.specweave/logs/cache-errors.log`

#### TC-004: Atomic Write (No Corruption)
**Given** cache write in progress
**When** process interrupted mid-write (SIGINT)
**Then** temp file remains, final file unchanged
**And** no corrupted cache file exists

#### TC-005: Per-Project Cache Separation
**Given** multiple projects (BACKEND, FRONTEND)
**When** caching dependencies for each
**Then** create separate files (`jira-BACKEND-deps.json`, `jira-FRONTEND-deps.json`)
**And** each file has independent TTL

**Implementation**:
1. Create `src/core/cache/cache-manager.ts` with CacheManager class
2. Implement `get<T>(key: string): Promise<T | null>` with TTL validation
3. Implement `set<T>(key: string, data: T): Promise<void>` with atomic writes
4. Implement `delete(key: string): Promise<void>` for cleanup
5. Implement `clearAll(): Promise<void>` for bulk deletion
6. Add TTL validation logic: `isValid(cache: CachedData<any>): boolean`
7. Add corruption detection and auto-recovery
8. Write unit tests: 10 test cases (coverage target: 95%)
9. Test atomic writes with SIGINT simulation
10. Test TTL edge cases (exactly 24 hours, 24 hours + 1ms)
11. Test concurrent reads/writes (race conditions)

**Files Affected**:
- `src/core/cache/cache-manager.ts` (NEW)
- `tests/unit/core/cache/cache-manager.test.ts` (NEW)

---

### T-002: Implement Rate Limit Checker

**User Story**: US-004
**Satisfies ACs**: AC-US4-05
**Status**: [x] completed
**Priority**: P0 (Critical)
**Estimated Effort**: 4 hours

**Description**: Create RateLimitChecker to detect API rate limits, handle 429 errors, and use stale cache when rate limit hit.

**Test Plan** (Embedded):
- **Coverage Target**: 90%
- **Framework**: Vitest + Sinon (HTTP mocks)

**Given-When-Then Scenarios**:

#### TC-006: Low Rate Limit (Use Stale Cache)
**Given** API response has `X-RateLimit-Remaining: 5`
**When** `shouldProceed(response)` is called
**Then** return false (don't make API call)
**And** log warning: "Rate limit low (< 10 requests remaining)"

#### TC-007: Normal Rate Limit (Proceed)
**Given** API response has `X-RateLimit-Remaining: 100`
**When** `shouldProceed(response)` is called
**Then** return true (safe to proceed)

#### TC-008: 429 Error Handling (Exponential Backoff)
**Given** API returns 429 status with `Retry-After: 60`
**When** `handleRateLimitError(error)` is called
**Then** log error with retry time
**And** suggest using stale cache

**Implementation**:
1. Create `src/core/cache/rate-limit-checker.ts`
2. Implement `shouldProceed(response: Response): boolean`
3. Implement `handleRateLimitError(error: any): Promise<void>`
4. Add header parsing: `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`
5. Write unit tests: 6 test cases (coverage target: 90%)
6. Test JIRA-specific headers (Cloud vs Server)
7. Test ADO-specific headers

**Files Affected**:
- `src/core/cache/rate-limit-checker.ts` (NEW)
- `tests/unit/core/cache/rate-limit-checker.test.ts` (NEW)

---

### T-003: Integrate CacheManager into JiraDependencyLoader

**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03
**Status**: [x] completed
**Priority**: P1 (High)
**Estimated Effort**: 5 hours

**Description**: Integrate CacheManager into existing JiraDependencyLoader to cache project lists and dependencies with 24-hour TTL.

**Test Plan** (Embedded):
- **Coverage Target**: 85%
- **Framework**: Vitest + Integration tests

**Given-When-Then Scenarios**:

#### TC-009: Cache Hit (No API Call)
**Given** cached project list exists (valid TTL)
**When** `loadProjectMetadata()` is called
**Then** return cached data
**And** make zero API calls
**And** log cache hit

#### TC-010: Cache Miss (Fresh API Call)
**Given** no cached project list exists
**When** `loadProjectMetadata()` is called
**Then** fetch from API
**And** cache result with current timestamp
**And** log cache miss

#### TC-011: Cache Expired (Refresh)
**Given** cached data is 25 hours old (expired)
**When** `loadProjectMetadata()` is called
**Then** fetch fresh data from API
**And** update cache with new timestamp

**Implementation**:
1. Modify `src/integrations/jira/jira-dependency-loader.ts`
2. Add CacheManager constructor injection
3. Update `loadProjectMetadata()` to check cache first
4. Update `loadDependencies(projectKey)` to cache per-project dependencies
5. Add cache invalidation on 404 errors (missing resource)
6. Add rate limit integration (use stale cache if limit hit)
7. Write integration tests: 8 test cases (coverage target: 85%)
8. Test cache with real JIRA API (optional, requires credentials)

**Files Affected**:
- `src/integrations/jira/jira-dependency-loader.ts` (MODIFY)
- `tests/integration/jira/jira-dependency-loader-cache.test.ts` (NEW)

---

### T-004: Integrate CacheManager into AdoDependencyLoader

**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03
**Status**: [x] completed
**Priority**: P1 (High)
**Estimated Effort**: 5 hours

**Description**: Integrate CacheManager into AdoDependencyLoader for ADO project and area path caching (same pattern as JIRA).

**Test Plan** (Embedded):
- **Coverage Target**: 85%
- **Framework**: Vitest + Integration tests

**Given-When-Then Scenarios**:

#### TC-012: ADO Project Cache Hit
**Given** cached ADO project list exists (valid TTL)
**When** `loadProjectMetadata()` is called
**Then** return cached data
**And** make zero API calls

#### TC-013: ADO Area Path Cache
**Given** area paths cached for project PLATFORM
**When** `loadAreaPaths(PLATFORM)` is called
**Then** return cached area paths
**And** validate TTL (< 24 hours)

**Implementation**:
1. Modify `src/integrations/ado/ado-dependency-loader.ts`
2. Add CacheManager constructor injection
3. Update `loadProjectMetadata()` to use cache
4. Update `loadAreaPaths(project)` to cache area path tree
5. Add rate limit handling (ADO: 200 req/hour)
6. Write integration tests: 8 test cases (coverage target: 85%)

**Files Affected**:
- `src/integrations/ado/ado-dependency-loader.ts` (MODIFY)
- `tests/integration/ado/ado-dependency-loader-cache.test.ts` (NEW)

---

### T-005: Create `/specweave-jira:refresh-cache` Command

**User Story**: US-004
**Satisfies ACs**: AC-US4-04
**Status**: [x] completed
**Priority**: P2 (Should Have)
**Estimated Effort**: 4 hours

**Description**: Create manual cache refresh command for JIRA with options: `--all`, `--projects`, `--project <key>`.

**Test Plan** (Embedded):
- **Coverage Target**: 80%
- **Framework**: Vitest + E2E tests

**Given-When-Then Scenarios**:

#### TC-014: Refresh All Caches
**Given** stale caches for projects and dependencies
**When** `/specweave-jira:refresh-cache --all` is executed
**Then** refresh all project list and dependency caches
**And** update `lastUpdated` timestamps

#### TC-015: Refresh Specific Project
**Given** stale cache for project BACKEND
**When** `/specweave-jira:refresh-cache --project BACKEND` is executed
**Then** refresh only BACKEND dependencies
**And** leave other caches unchanged

**Implementation**:
1. Create `plugins/specweave-jira/commands/refresh-cache.ts`
2. Implement CLI argument parsing (`--all`, `--projects`, `--project <key>`)
3. Call CacheManager to delete and re-fetch caches
4. Show progress: "Refreshing BACKEND... ✅"
5. Write E2E tests: 5 test cases (coverage target: 80%)

**Files Affected**:
- `plugins/specweave-jira/commands/refresh-cache.ts` (NEW)
- `tests/e2e/commands/refresh-cache-jira.test.ts` (NEW)

---

### T-006: Create `/specweave-ado:refresh-cache` Command

**User Story**: US-004
**Satisfies ACs**: AC-US4-04
**Status**: [x] completed
**Priority**: P2 (Should Have)
**Estimated Effort**: 3 hours

**Description**: Create manual cache refresh command for ADO (same pattern as JIRA).

**Test Plan** (Embedded):
- **Coverage Target**: 80%
- **Framework**: Vitest + E2E tests

**Given-When-Then Scenarios**:

#### TC-016: ADO Refresh All
**Given** stale ADO caches
**When** `/specweave-ado:refresh-cache --all` is executed
**Then** refresh all ADO caches
**And** show summary

**Implementation**:
1. Create `plugins/specweave-ado/commands/refresh-cache.ts`
2. Implement same CLI pattern as JIRA
3. Write E2E tests: 4 test cases (coverage target: 80%)

**Files Affected**:
- `plugins/specweave-ado/commands/refresh-cache.ts` (NEW)
- `tests/e2e/commands/refresh-cache-ado.test.ts` (NEW)

---

### T-007: Create `/specweave:cleanup-cache` Maintenance Command

**User Story**: US-004
**Satisfies ACs**: AC-US4-03
**Status**: [x] completed
**Priority**: P2 (Should Have)
**Estimated Effort**: 3 hours

**Description**: Create cache cleanup command to delete old caches (> 7 days) and show cache statistics.

**Test Plan** (Embedded):
- **Coverage Target**: 80%
- **Framework**: Vitest

**Given-When-Then Scenarios**:

#### TC-017: Delete Old Caches
**Given** cache files older than 7 days exist
**When** `/specweave:cleanup-cache --older-than 7d` is executed
**Then** delete old caches
**And** keep caches < 7 days old
**And** show count: "Deleted 12 old cache files"

#### TC-018: Show Cache Stats
**Given** multiple cache files exist
**When** `/specweave:cache-stats` is executed
**Then** show total files, total size, oldest cache
**And** show per-provider breakdown (JIRA, ADO)

**Implementation**:
1. Create `src/cli/commands/cleanup-cache.ts`
2. Implement `--older-than` flag parsing (7d, 14d, 30d)
3. Implement `--all` flag (delete all caches)
4. Create `src/cli/commands/cache-stats.ts` for statistics
5. Write unit tests: 6 test cases (coverage target: 80%)

**Files Affected**:
- `src/cli/commands/cleanup-cache.ts` (NEW)
- `src/cli/commands/cache-stats.ts` (NEW)
- `tests/unit/commands/cleanup-cache.test.ts` (NEW)

---

### T-008: Add Cache Directory to .gitignore

**User Story**: US-004
**Satisfies ACs**: AC-US4-01
**Status**: [x] completed
**Priority**: P0 (Critical)
**Estimated Effort**: 1 hour

**Description**: Create `.specweave/cache/.gitignore` to prevent cache files from being committed.

**Test Plan** (Embedded):
- **Coverage Target**: N/A (no code, manual validation)

**Validation**:
- Manual review: `.gitignore` syntax correct
- Git check: Cached files ignored by `git status`
- Build check: Cache directory created automatically

**Implementation**:
1. Create `.specweave/cache/.gitignore` with content: `*`
2. Add cache directory creation to init flow
3. Verify gitignore works with test repo

**Files Affected**:
- `.specweave/cache/.gitignore` (NEW)
- `src/cli/commands/init.ts` (MODIFY - create cache dir)

---

### T-009: Document Cache Architecture in ADR

**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03
**Status**: [x] completed
**Priority**: P2 (Should Have)
**Estimated Effort**: 2 hours

**Description**: Update ADR-0051 with implementation details, file format, and usage examples.

**Test Plan**: N/A (documentation task)

**Validation**:
- Manual review: Grammar, clarity, completeness
- Link checker: All links work
- Build check: Markdown renders correctly

**Implementation**:
1. Update `.specweave/docs/internal/architecture/adr/0051-smart-caching-with-ttl.md`
2. Add "Implementation Notes" section with actual file paths
3. Add usage examples for CacheManager
4. Add troubleshooting section for common issues

**Files Affected**:
- `.specweave/docs/internal/architecture/adr/0051-smart-caching-with-ttl.md` (MODIFY)

---

### T-010: Integration Test: Full Cache Workflow

**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04
**Status**: [x] completed
**Priority**: P1 (High)
**Estimated Effort**: 4 hours

**Description**: Create comprehensive integration test covering full cache lifecycle: miss → set → hit → expire → refresh.

**Test Plan** (Embedded):
- **Coverage Target**: 100% (integration test)
- **Framework**: Vitest + Real filesystem

**Given-When-Then Scenarios**:

#### TC-019: Full Cache Lifecycle
**Given** clean cache directory (no caches)
**When** executing full workflow:
1. Load projects (cache miss, API call)
2. Load projects again (cache hit, no API call)
3. Wait 25 hours (simulate TTL expiry)
4. Load projects again (cache miss, refresh)
**Then** verify correct behavior at each step
**And** verify API call counts: 2 calls total (miss + refresh)

**Implementation**:
1. Create `tests/integration/cache/full-workflow.test.ts`
2. Test cache miss → cache hit → expiry → refresh flow
3. Test manual refresh via command
4. Test rate limit handling with cache fallback
5. Test corruption recovery
6. Mock time for TTL testing (use `vi.useFakeTimers()`)

**Files Affected**:
- `tests/integration/cache/full-workflow.test.ts` (NEW)

---

### T-011: Performance Test: Cache Hit Rate Validation

**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02
**Status**: [x] completed
**Priority**: P1 (High)
**Estimated Effort**: 3 hours

**Description**: Create performance test to validate > 90% cache hit rate during normal development.

**Test Plan** (Embedded):
- **Coverage Target**: N/A (performance validation)
- **Framework**: Vitest + Performance metrics

**Given-When-Then Scenarios**:

#### TC-020: Cache Hit Rate > 90%
**Given** 100 sync operations over 8-hour period
**When** measuring cache hits vs misses
**Then** cache hit rate should be > 90%
**And** API call count should be < 10 (vs 500+ without cache)

**Implementation**:
1. Create `tests/performance/cache-hit-rate.test.ts`
2. Simulate 100 sync operations
3. Measure cache hits, misses, API calls
4. Calculate hit rate percentage
5. Assert hit rate > 90%

**Files Affected**:
- `tests/performance/cache-hit-rate.test.ts` (NEW)

---

### T-012: Update CLI Helper Modules with Cache Support
**Status**: [x] completed

**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02
**Status**: [x] completed
**Priority**: P1 (High)
**Estimated Effort**: 4 hours

**Description**: Update `src/cli/helpers/issue-tracker/jira.ts` and `ado.ts` to use CacheManager during init.

**Test Plan** (Embedded):
- **Coverage Target**: 85%
- **Framework**: Vitest + Integration tests

**Given-When-Then Scenarios**:

#### TC-021: Init with Cached Projects
**Given** cached project list from previous init
**When** running `specweave init` again
**Then** use cached projects (no API call)
**And** show message: "Using cached project list (24h TTL)"

**Implementation**:
1. Modify `src/cli/helpers/issue-tracker/jira.ts`
2. Add CacheManager usage in `autoDiscoverJiraProjects()`
3. Modify `src/cli/helpers/issue-tracker/ado.ts`
4. Add cache support in `autoDiscoverAdoProjects()`
5. Write integration tests: 6 test cases (coverage target: 85%)

**Files Affected**:
- `src/cli/helpers/issue-tracker/jira.ts` (MODIFY)
- `src/cli/helpers/issue-tracker/ado.ts` (MODIFY)
- `tests/integration/cli/helpers/cache-integration.test.ts` (NEW)

---

## User Story: US-007 - Progress Tracking (Batch Loading with Cancel)

**Linked ACs**: AC-US7-01, AC-US7-02, AC-US7-03, AC-US7-04, AC-US7-05, AC-US7-06
**Tasks**: 10 total, 0 completed

### T-013: Implement ProgressTracker Core Module
**Status**: [x] completed

**User Story**: US-007
**Satisfies ACs**: AC-US7-01, AC-US7-02, AC-US7-03
**Status**: [x] completed
**Priority**: P0 (Critical)
**Estimated Effort**: 5 hours

**Description**: Create ProgressTracker class with ASCII progress bar, ETA calculation, and project-level status display.

**Test Plan** (Embedded):
- **Coverage Target**: 90%
- **Framework**: Vitest

**Given-When-Then Scenarios**:

#### TC-022: Progress Bar Rendering
**Given** 47 of 127 projects completed
**When** `update('BACKEND', 'success')` is called
**Then** render progress bar: `[=============>          ] (37%)`
**And** show elapsed time and ETA

#### TC-023: ETA Calculation (Linear Extrapolation)
**Given** 10 projects completed in 30 seconds (3s/project)
**When** calculating ETA for remaining 90 projects
**Then** ETA should be ~4.5 minutes (90 × 3s)

#### TC-024: Project-Level Status Display
**Given** mixed success/error/pending status
**When** updating progress
**Then** show: `✅ BACKEND (completed)`, `❌ FAILED-PROJ (error)`, `⏳ MOBILE (loading...)`

**Implementation**:
1. Create `src/core/progress/progress-tracker.ts` with ProgressTracker class
2. Implement `update(item: string, status: 'pending' | 'success' | 'error'): void`
3. Implement `finish(succeeded: number, failed: number, skipped: number): void`
4. Implement `renderProgressBar(percentage: number): string` (ASCII bar, 30 chars)
5. Implement `getElapsedTime(): string` (human-readable: 2m 34s)
6. Implement `getEta(): string` (linear extrapolation)
7. Write unit tests: 10 test cases (coverage target: 90%)
8. Test edge cases: 0%, 100%, ETA with variable timing

**Files Affected**:
- `src/core/progress/progress-tracker.ts` (NEW)
- `tests/unit/core/progress/progress-tracker.test.ts` (NEW)

---

### T-014: Implement CancelationHandler Core Module
**Status**: [x] completed

**User Story**: US-007
**Satisfies ACs**: AC-US7-04
**Status**: [x] completed
**Priority**: P0 (Critical)
**Estimated Effort**: 4 hours

**Description**: Create CancelationHandler to intercept Ctrl+C (SIGINT), save partial progress, and exit gracefully.

**Test Plan** (Embedded):
- **Coverage Target**: 90%
- **Framework**: Vitest + SIGINT simulation

**Given-When-Then Scenarios**:

#### TC-025: Graceful Cancelation (Single Ctrl+C)
**Given** import in progress (50/127 projects)
**When** Ctrl+C pressed (SIGINT received)
**Then** save import state to `.specweave/cache/import-state.json`
**And** show message: "Progress saved. Run with --resume to continue."
**And** exit with code 0

#### TC-026: Force Exit (Double Ctrl+C)
**Given** first Ctrl+C already handled
**When** second Ctrl+C pressed within 2 seconds
**Then** exit immediately with code 1 (force exit)
**And** log warning: "Forced exit (progress may be lost)"

**Implementation**:
1. Create `src/core/progress/cancelation-handler.ts`
2. Implement SIGINT listener: `process.on('SIGINT', ...)`
3. Implement `shouldCancel(): boolean` (polling flag)
4. Implement `handleCancelation(): Promise<void>` with state saving
5. Add double Ctrl+C force exit logic (2-second window)
6. Write unit tests: 6 test cases (coverage target: 90%)
7. Test SIGINT simulation with mock process

**Files Affected**:
- `src/core/progress/cancelation-handler.ts` (NEW)
- `tests/unit/core/progress/cancelation-handler.test.ts` (NEW)

---

### T-015: Create ImportState Data Structure

**User Story**: US-007
**Satisfies ACs**: AC-US7-04, AC-US7-05
**Status**: [x] completed
**Priority**: P1 (High)
**Estimated Effort**: 3 hours

**Description**: Define ImportState interface and create save/load utilities for resume capability.

**Test Plan** (Embedded):
- **Coverage Target**: 85%
- **Framework**: Vitest

**Given-When-Then Scenarios**:

#### TC-027: Save Import State
**Given** import interrupted at 50/127 projects
**When** `saveImportState(state)` is called
**Then** write state to `.specweave/cache/import-state.json`
**And** include: total, completed, succeeded, failed, errors array

#### TC-028: Load Import State
**Given** saved import state exists
**When** `loadImportState()` is called
**Then** return parsed state object
**And** validate state structure

#### TC-029: State Expiry (24-Hour TTL)
**Given** import state is 25 hours old
**When** `loadImportState()` is called
**Then** return null (expired)
**And** delete stale state file

**Implementation**:
1. Create `src/core/progress/import-state.ts`
2. Define `ImportState` interface (total, completed, succeeded, failed, errors, timestamp, canceled)
3. Implement `saveImportState(state: ImportState): Promise<void>`
4. Implement `loadImportState(): Promise<ImportState | null>`
5. Implement `deleteImportState(): Promise<void>`
6. Add TTL validation (24 hours)
7. Write unit tests: 8 test cases (coverage target: 85%)

**Files Affected**:
- `src/core/progress/import-state.ts` (NEW)
- `tests/unit/core/progress/import-state.test.ts` (NEW)

---

### T-016: Integrate Progress Tracking into JIRA Batch Operations
**Status**: [x] completed

**User Story**: US-007
**Satisfies ACs**: AC-US7-01, AC-US7-02, AC-US7-03, AC-US7-04
**Status**: [x] completed
**Priority**: P1 (High)
**Estimated Effort**: 5 hours

**Description**: Integrate ProgressTracker and CancelationHandler into JIRA batch project loading (`fetchAllProjectsAsync`).

**Test Plan** (Embedded):
- **Coverage Target**: 85%
- **Framework**: Vitest + Integration tests

**Given-When-Then Scenarios**:

#### TC-030: Progress Tracking During Batch Load
**Given** fetching 200 JIRA projects in batches
**When** batch operation executes
**Then** show progress bar updating every 5 projects
**And** show ETA based on current rate

#### TC-031: Cancelation During Batch Load
**Given** batch load in progress (50/200 projects)
**When** Ctrl+C pressed
**Then** save partial state (50 projects loaded)
**And** exit gracefully
**And** suggest resume command

**Implementation**:
1. Modify `src/cli/helpers/issue-tracker/jira.ts`
2. Add ProgressTracker to `fetchAllProjectsAsync()`
3. Add CancelationHandler for Ctrl+C support
4. Update progress every 5 projects (reduce console spam)
5. Save state on cancelation
6. Write integration tests: 7 test cases (coverage target: 85%)

**Files Affected**:
- `src/cli/helpers/issue-tracker/jira.ts` (MODIFY)
- `tests/integration/cli/helpers/jira-progress.test.ts` (NEW)

---

### T-017: Integrate Progress Tracking into ADO Batch Operations
**Status**: [x] completed

**User Story**: US-007
**Satisfies ACs**: AC-US7-01, AC-US7-02, AC-US7-03, AC-US7-04
**Status**: [x] completed
**Priority**: P1 (High)
**Estimated Effort**: 4 hours

**Description**: Integrate ProgressTracker and CancelationHandler into ADO batch operations (same pattern as JIRA).

**Test Plan** (Embedded):
- **Coverage Target**: 85%
- **Framework**: Vitest + Integration tests

**Given-When-Then Scenarios**:

#### TC-032: ADO Batch Load Progress
**Given** fetching 150 ADO projects
**When** batch operation executes
**Then** show progress bar
**And** handle Ctrl+C gracefully

**Implementation**:
1. Modify `src/cli/helpers/issue-tracker/ado.ts`
2. Add ProgressTracker and CancelationHandler
3. Write integration tests: 6 test cases (coverage target: 85%)

**Files Affected**:
- `src/cli/helpers/issue-tracker/ado.ts` (MODIFY)
- `tests/integration/cli/helpers/ado-progress.test.ts` (NEW)

---

### T-018: Implement Error Handling (Continue on Failure)
**Status**: [x] completed

**User Story**: US-007
**Satisfies ACs**: AC-US7-05
**Status**: [ ] pending
**Priority**: P1 (High)
**Estimated Effort**: 4 hours

**Description**: Add error handling to batch operations: log errors, continue processing, report summary at end.

**Test Plan** (Embedded):
- **Coverage Target**: 85%
- **Framework**: Vitest + Integration tests

**Given-When-Then Scenarios**:

#### TC-033: Continue on Single Project Failure
**Given** importing 100 projects, project 50 fails (403 error)
**When** batch import continues
**Then** log error for project 50
**And** continue importing remaining 50 projects
**And** show final summary: "98/100 succeeded, 2 failed"

#### TC-034: Error Logging to File
**Given** 5 projects fail during import
**When** batch completes
**Then** write errors to `.specweave/logs/import-errors.log`
**And** include timestamp, project key, error message

**Implementation**:
1. Create `src/core/progress/error-logger.ts`
2. Implement `logError(project: string, error: Error): void`
3. Modify batch operations to catch errors per-project (don't stop batch)
4. Write errors to `.specweave/logs/import-errors.log`
5. Write unit tests: 6 test cases (coverage target: 85%)

**Files Affected**:
- `src/core/progress/error-logger.ts` (NEW)
- `src/cli/helpers/issue-tracker/jira.ts` (MODIFY)
- `src/cli/helpers/issue-tracker/ado.ts` (MODIFY)
- `tests/unit/core/progress/error-logger.test.ts` (NEW)

---

### T-019: Implement Final Summary Report
**Status**: [x] completed

**User Story**: US-007
**Satisfies ACs**: AC-US7-06
**Status**: [ ] pending
**Priority**: P1 (High)
**Estimated Effort**: 3 hours

**Description**: Create comprehensive summary report after batch operations: succeeded/failed/skipped counts, error details, total time.

**Test Plan** (Embedded):
- **Coverage Target**: 80%
- **Framework**: Vitest

**Given-When-Then Scenarios**:

#### TC-035: Summary Report Format
**Given** batch import complete (98 succeeded, 2 failed, 24 skipped)
**When** `finish()` is called
**Then** show summary:
```
✅ Import Complete!

Imported: 98 projects
Failed: 2 projects (see .specweave/logs/import-errors.log)
  ❌ PROJECT-123: 403 Forbidden (check permissions)
  ❌ PROJECT-456: 404 Not Found (project deleted?)
Skipped: 24 projects (archived)

Total time: 2m 34s
```

**Implementation**:
1. Modify `src/core/progress/progress-tracker.ts`
2. Enhance `finish()` method with detailed summary
3. Add error details (from error log)
4. Add total time calculation
5. Write unit tests: 5 test cases (coverage target: 80%)

**Files Affected**:
- `src/core/progress/progress-tracker.ts` (MODIFY)
- `tests/unit/core/progress/progress-tracker.test.ts` (MODIFY)

---

### T-020: Add Progress Throttling (Update Every 5 Projects)
**Status**: [x] completed

**User Story**: US-007
**Satisfies ACs**: AC-US7-01
**Status**: [ ] pending
**Priority**: P2 (Should Have)
**Estimated Effort**: 2 hours

**Description**: Implement progress update throttling to reduce console spam (update every N projects, not every project).

**Test Plan** (Embedded):
- **Coverage Target**: 85%
- **Framework**: Vitest

**Given-When-Then Scenarios**:

#### TC-036: Throttled Progress Updates
**Given** processing 100 projects with throttle interval = 5
**When** batch executes
**Then** show progress updates 20 times (100 / 5)
**And** always show first and last project

**Implementation**:
1. Modify `src/core/progress/progress-tracker.ts`
2. Add `updateInterval` option (default: 5)
3. Implement throttling logic (only update every N items)
4. Always update on first and last item
5. Write unit tests: 4 test cases (coverage target: 85%)

**Files Affected**:
- `src/core/progress/progress-tracker.ts` (MODIFY)
- `tests/unit/core/progress/progress-tracker.test.ts` (MODIFY)

---

### T-021: E2E Test: Full Progress Workflow with Cancelation

**User Story**: US-007
**Satisfies ACs**: AC-US7-01, AC-US7-02, AC-US7-03, AC-US7-04, AC-US7-05, AC-US7-06
**Status**: [ ] pending
**Priority**: P1 (High)
**Estimated Effort**: 5 hours

**Description**: Create comprehensive E2E test covering full progress tracking workflow including cancelation and resume.

**Test Plan** (Embedded):
- **Coverage Target**: 100% (E2E test)
- **Framework**: Playwright

**Given-When-Then Scenarios**:

#### TC-037: Full Progress Workflow
**Given** starting batch import of 100 projects
**When** executing full workflow:
1. Start import
2. Observe progress bar updates
3. Press Ctrl+C at 50%
4. Verify state saved
5. Resume import
6. Complete remaining 50%
**Then** verify all steps successful
**And** verify final summary accurate

**Implementation**:
1. Create `tests/e2e/progress/full-workflow.test.ts`
2. Test progress bar rendering (visual validation)
3. Test Ctrl+C handling (SIGINT simulation)
4. Test resume from saved state
5. Test error handling and summary report

**Files Affected**:
- `tests/e2e/progress/full-workflow.test.ts` (NEW)

---

### T-022: Performance Test: Progress Overhead < 5%

**User Story**: US-007
**Satisfies ACs**: AC-US7-01
**Status**: [ ] pending
**Priority**: P1 (High)
**Estimated Effort**: 3 hours

**Description**: Validate that progress tracking adds < 5% overhead to batch operations.

**Test Plan** (Embedded):
- **Coverage Target**: N/A (performance validation)
- **Framework**: Vitest + Performance metrics

**Given-When-Then Scenarios**:

#### TC-038: Progress Overhead Validation
**Given** importing 100 projects with/without progress tracking
**When** measuring execution time
**Then** overhead should be < 5% (< 3 seconds for 60-second baseline)

**Implementation**:
1. Create `tests/performance/progress-overhead.test.ts`
2. Measure baseline (no progress tracking)
3. Measure with progress tracking
4. Calculate overhead percentage
5. Assert overhead < 5%

**Files Affected**:
- `tests/performance/progress-overhead.test.ts` (NEW)

---

## User Story: US-001 - Smart Pagination During Init (50-Project Limit)

**Linked ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04, AC-US1-05
**Tasks**: 10 total, 0 completed

### T-023: Implement fetchProjectCount (Lightweight API Call)

**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [ ] pending
**Priority**: P0 (Critical)
**Estimated Effort**: 3 hours

**Description**: Create lightweight API call to fetch project count without fetching all project data (JIRA: `maxResults=0`).

**Test Plan** (Embedded):
- **Coverage Target**: 90%
- **Framework**: Vitest + HTTP mocks

**Given-When-Then Scenarios**:

#### TC-039: JIRA Cloud Project Count
**Given** JIRA Cloud instance with 127 projects
**When** `fetchProjectCount(credentials)` is called
**Then** make API call: `GET /rest/api/3/project/search?maxResults=0`
**And** return count: 127
**And** API response size < 1KB (no project data)

#### TC-040: JIRA Server Project Count
**Given** JIRA Server instance with 200 projects
**When** `fetchProjectCount(credentials)` is called
**Then** make API call: `GET /rest/api/2/project/search?maxResults=0`
**And** return count: 200

#### TC-041: ADO Project Count
**Given** ADO instance with 80 projects
**When** `fetchProjectCount(credentials)` is called
**Then** make API call: `GET /_apis/projects?$top=0`
**And** return count: 80

**Implementation**:
1. Modify `src/cli/helpers/issue-tracker/jira.ts`
2. Add `fetchProjectCount(credentials: JiraCredentials): Promise<number>`
3. Use `maxResults=0` for lightweight count-only query
4. Modify `src/cli/helpers/issue-tracker/ado.ts`
5. Add `fetchProjectCount(credentials: AdoCredentials): Promise<number>`
6. Write unit tests: 6 test cases (coverage target: 90%)
7. Test both JIRA Cloud/Server and ADO

**Files Affected**:
- `src/cli/helpers/issue-tracker/jira.ts` (MODIFY)
- `src/cli/helpers/issue-tracker/ado.ts` (MODIFY)
- `tests/unit/cli/helpers/fetch-project-count.test.ts` (NEW)

---

### T-024: Implement promptImportStrategy (Upfront Choice)

**User Story**: US-001
**Satisfies ACs**: AC-US1-02
**Status**: [ ] pending
**Priority**: P0 (Critical)
**Estimated Effort**: 4 hours

**Description**: Create upfront import strategy prompt with 3 choices: "Import all", "Select specific", "Manual entry".

**Test Plan** (Embedded):
- **Coverage Target**: 85%
- **Framework**: Vitest + Integration tests

**Given-When-Then Scenarios**:

#### TC-042: Strategy Prompt Display
**Given** project count = 127
**When** `promptImportStrategy(127)` is called
**Then** show prompt:
```
Found 127 accessible projects. How would you like to import?

1. ✨ Import all 127 projects (recommended)
2. 📋 Select specific projects
3. ✏️  Enter project keys manually
```
**And** default to option 1 (CLI-first philosophy)

#### TC-043: Single Project Auto-Select
**Given** project count = 1
**When** `promptImportStrategy(1)` is called
**Then** return 'all' without prompt (auto-select single project)

**Implementation**:
1. Modify `src/cli/helpers/issue-tracker/jira.ts`
2. Add `promptImportStrategy(projectCount: number): Promise<string>`
3. Use `inquirer.prompt()` with list type
4. Add default: 'all' (CLI-first default)
5. Skip prompt if projectCount === 1 (auto-select)
6. Write integration tests: 5 test cases (coverage target: 85%)

**Files Affected**:
- `src/cli/helpers/issue-tracker/jira.ts` (MODIFY)
- `tests/integration/cli/helpers/prompt-import-strategy.test.ts` (NEW)

---

### T-025: Implement 50-Project Batch Fetching

**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-03
**Status**: [ ] pending
**Priority**: P0 (Critical)
**Estimated Effort**: 5 hours

**Description**: Implement batch fetching with 50-project limit, pagination support, and async fetch for "Import all".

**Test Plan** (Embedded):
- **Coverage Target**: 90%
- **Framework**: Vitest + Integration tests

**Given-When-Then Scenarios**:

#### TC-044: Batch Fetch (50-Project Limit)
**Given** total project count = 200
**When** `fetchProjectBatch(credentials, offset=0, limit=50)` is called
**Then** fetch first 50 projects
**And** use JIRA API: `?startAt=0&maxResults=50`

#### TC-045: Async Fetch All (Paginated)
**Given** total project count = 200, user chose "Import all"
**When** `fetchAllProjectsAsync(credentials, 200)` is called
**Then** fetch in batches: 0-49, 50-99, 100-149, 150-199
**And** show progress: "Fetching projects... 50/200 (25%)"
**And** return all 200 projects

#### TC-046: Cancelation During Async Fetch
**Given** fetching 200 projects, at 100/200
**When** Ctrl+C pressed
**Then** save partial progress (100 projects)
**And** suggest resume

**Implementation**:
1. Modify `src/cli/helpers/issue-tracker/jira.ts`
2. Add `fetchProjectBatch(credentials, offset, limit): Promise<any[]>`
3. Add `fetchAllProjectsAsync(credentials, totalCount): Promise<string[]>`
4. Integrate ProgressTracker (from US-007)
5. Integrate CancelationHandler (from US-007)
6. Write integration tests: 8 test cases (coverage target: 90%)

**Files Affected**:
- `src/cli/helpers/issue-tracker/jira.ts` (MODIFY)
- `tests/integration/cli/helpers/batch-fetching.test.ts` (NEW)

---

### T-026: Integrate Smart Pagination into autoDiscoverJiraProjects

**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Status**: [ ] pending
**Priority**: P0 (Critical)
**Estimated Effort**: 5 hours

**Description**: Integrate smart pagination into existing `autoDiscoverJiraProjects()` function with new flow.

**Test Plan** (Embedded):
- **Coverage Target**: 85%
- **Framework**: Vitest + Integration tests

**Given-When-Then Scenarios**:

#### TC-047: New Init Flow with Pagination
**Given** JIRA instance with 127 projects
**When** `autoDiscoverJiraProjects()` is called
**Then** execute flow:
1. Fetch count: 127
2. Prompt strategy: "Import all" (default selected)
3. Fetch all projects in batches (50, 50, 27)
4. Show progress bar
5. Return project keys

#### TC-048: Select Specific Flow
**Given** user chooses "Select specific"
**When** init continues
**Then** fetch first 50 projects
**And** show checkbox UI (all checked by default - US-002)

**Implementation**:
1. Modify `src/cli/helpers/issue-tracker/jira.ts`
2. Refactor `autoDiscoverJiraProjects()` to use new flow:
   - Step 1: fetchProjectCount()
   - Step 2: promptImportStrategy()
   - Step 3: Route based on choice
3. Handle "Import all" → fetchAllProjectsAsync()
4. Handle "Select specific" → selectSpecificProjects()
5. Handle "Manual entry" → promptManualProjectKeys()
6. Write integration tests: 10 test cases (coverage target: 85%)

**Files Affected**:
- `src/cli/helpers/issue-tracker/jira.ts` (MODIFY)
- `tests/integration/cli/helpers/auto-discover-jira.test.ts` (NEW)

---

### T-027: Integrate Smart Pagination into autoDiscoverAdoProjects

**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Status**: [ ] pending
**Priority**: P1 (High)
**Estimated Effort**: 4 hours

**Description**: Integrate smart pagination into ADO project discovery (same pattern as JIRA).

**Test Plan** (Embedded):
- **Coverage Target**: 85%
- **Framework**: Vitest + Integration tests

**Given-When-Then Scenarios**:

#### TC-049: ADO Init Flow
**Given** ADO instance with 80 projects
**When** `autoDiscoverAdoProjects()` is called
**Then** follow same flow as JIRA (count → prompt → fetch)

**Implementation**:
1. Modify `src/cli/helpers/issue-tracker/ado.ts`
2. Refactor `autoDiscoverAdoProjects()` with new flow
3. Write integration tests: 8 test cases (coverage target: 85%)

**Files Affected**:
- `src/cli/helpers/issue-tracker/ado.ts` (MODIFY)
- `tests/integration/cli/helpers/auto-discover-ado.test.ts` (NEW)

---

### T-028: Add Safety Confirmation for Large Imports (> 100 Projects)

**User Story**: US-001
**Satisfies ACs**: AC-US1-02
**Status**: [ ] pending
**Priority**: P1 (High)
**Estimated Effort**: 3 hours

**Description**: Add safety confirmation prompt when importing > 100 projects to prevent accidental bulk imports.

**Test Plan** (Embedded):
- **Coverage Target**: 85%
- **Framework**: Vitest + Integration tests

**Given-When-Then Scenarios**:

#### TC-050: Safety Confirmation Prompt
**Given** user chose "Import all" for 500 projects
**When** proceeding with import
**Then** show confirmation:
```
⚠️  You're about to import 500 projects.
This will create 500 project folders and fetch metadata.

Import all 500 projects? (y/N)
```
**And** default to "No" (safe default)

#### TC-051: User Cancels Large Import
**Given** safety confirmation shown
**When** user presses "N"
**Then** return to import strategy prompt
**And** allow user to choose "Select specific" instead

**Implementation**:
1. Modify `src/cli/helpers/issue-tracker/jira.ts`
2. Add confirmation prompt if projectCount > 100
3. Default to "No" (safe default)
4. Allow re-selection of strategy if canceled
5. Write integration tests: 5 test cases (coverage target: 85%)

**Files Affected**:
- `src/cli/helpers/issue-tracker/jira.ts` (MODIFY)
- `tests/integration/cli/helpers/safety-confirmation.test.ts` (NEW)

---

### T-029: Performance Test: Init Time < 30 Seconds (100 Projects)

**User Story**: US-001
**Satisfies ACs**: AC-US1-04
**Status**: [ ] pending
**Priority**: P0 (Critical)
**Estimated Effort**: 4 hours

**Description**: Create performance test to validate init completes in < 30 seconds for 100+ project instances.

**Test Plan** (Embedded):
- **Coverage Target**: N/A (performance validation)
- **Framework**: Vitest + Performance metrics

**Given-When-Then Scenarios**:

#### TC-052: Init Performance < 30s (100 Projects)
**Given** JIRA instance with 100 projects
**When** running `specweave init` with "Import all"
**Then** init completes in < 30 seconds (95th percentile)
**And** no timeout errors
**And** all 100 projects imported

#### TC-053: Init Performance < 60s (500 Projects)
**Given** JIRA instance with 500 projects
**When** running `specweave init` with "Import all"
**Then** init completes in < 60 seconds
**And** show progress bar with accurate ETA

**Implementation**:
1. Create `tests/performance/init-time.test.ts`
2. Mock JIRA API with realistic latency (50-100ms per project)
3. Measure init time for 50, 100, 500 projects
4. Assert < 30 seconds for 100 projects
5. Assert < 60 seconds for 500 projects
6. Run 10 iterations, use 95th percentile

**Files Affected**:
- `tests/performance/init-time.test.ts` (NEW)

---

### T-030: E2E Test: Full Init Flow with 127 Projects

**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04
**Status**: [ ] pending
**Priority**: P1 (High)
**Estimated Effort**: 5 hours

**Description**: Create comprehensive E2E test for full init flow with realistic 127-project scenario.

**Test Plan** (Embedded):
- **Coverage Target**: 100% (E2E test)
- **Framework**: Playwright

**Given-When-Then Scenarios**:

#### TC-054: Full Init Flow (Import All)
**Given** JIRA instance with 127 projects
**When** running init:
1. Select JIRA as issue tracker
2. Enter credentials
3. See count: "Found 127 projects"
4. Select "Import all" (default)
5. Observe progress bar
6. Wait for completion
**Then** init completes successfully
**And** 127 project folders created
**And** time < 30 seconds

**Implementation**:
1. Create `tests/e2e/init/smart-pagination.test.ts`
2. Mock JIRA API with 127 projects
3. Test full init flow end-to-end
4. Verify progress bar updates
5. Verify all projects imported

**Files Affected**:
- `tests/e2e/init/smart-pagination.test.ts` (NEW)

---

### T-031: Integration Test: Zero Timeout Errors (100 Consecutive Runs)

**User Story**: US-001
**Satisfies ACs**: AC-US1-05
**Status**: [ ] pending
**Priority**: P0 (Critical)
**Estimated Effort**: 3 hours

**Description**: Validate zero timeout errors during init with 100 consecutive runs.

**Test Plan** (Embedded):
- **Coverage Target**: N/A (reliability validation)
- **Framework**: Vitest + Stress testing

**Given-When-Then Scenarios**:

#### TC-055: Zero Timeout Errors (100 Runs)
**Given** mock JIRA instance with 100 projects
**When** running init 100 times consecutively
**Then** zero timeout errors
**And** all 100 runs complete successfully

**Implementation**:
1. Create `tests/integration/stress/timeout-errors.test.ts`
2. Run init 100 times with mock API
3. Count timeout errors (should be 0)
4. Log failures for debugging

**Files Affected**:
- `tests/integration/stress/timeout-errors.test.ts` (NEW)

---

### T-032: Update ADR-0052 with Implementation Details

**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Status**: [ ] pending
**Priority**: P2 (Should Have)
**Estimated Effort**: 2 hours

**Description**: Update ADR-0052 with actual implementation details, code snippets, and test results.

**Test Plan**: N/A (documentation task)

**Validation**:
- Manual review: Grammar, clarity, completeness
- Link checker: All links work
- Build check: Markdown renders correctly

**Implementation**:
1. Update `.specweave/docs/internal/architecture/adr/0052-smart-pagination-50-project-limit.md`
2. Add "Implementation Notes" section with actual code
3. Add performance test results (init times for 50, 100, 500 projects)
4. Add troubleshooting section

**Files Affected**:
- `.specweave/docs/internal/architecture/adr/0052-smart-pagination-50-project-limit.md` (MODIFY)

---

## User Story: US-002 - CLI-First Defaults (Select All by Default)

**Linked ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04
**Tasks**: 8 total, 0 completed

### T-033: Change Import Strategy Default to "Import All"

**User Story**: US-002
**Satisfies ACs**: AC-US2-01
**Status**: [ ] pending
**Priority**: P1 (High)
**Estimated Effort**: 2 hours

**Description**: Modify import strategy prompt to default to "Import all" (CLI-first philosophy).

**Test Plan** (Embedded):
- **Coverage Target**: 85%
- **Framework**: Vitest + Integration tests

**Given-When-Then Scenarios**:

#### TC-056: Default to "Import All"
**Given** import strategy prompt shown
**When** user presses Enter without selection
**Then** "Import all" option selected (default)
**And** proceed with bulk import

**Implementation**:
1. Modify `src/cli/helpers/issue-tracker/jira.ts`
2. Change `default: 'all'` in `promptImportStrategy()`
3. Already implemented in T-024 (just verify)
4. Write integration tests: 3 test cases (coverage target: 85%)

**Files Affected**:
- `src/cli/helpers/issue-tracker/jira.ts` (VERIFY)
- `tests/integration/cli/helpers/default-import-all.test.ts` (NEW)

---

### T-034: Change Checkbox Defaults to `checked: true`

**User Story**: US-002
**Satisfies ACs**: AC-US2-02
**Status**: [ ] pending
**Priority**: P1 (High)
**Estimated Effort**: 3 hours

**Description**: Modify project selector checkbox UI to default all projects to checked (CLI-first UX).

**Test Plan** (Embedded):
- **Coverage Target**: 85%
- **Framework**: Vitest + Integration tests

**Given-When-Then Scenarios**:

#### TC-057: All Checkboxes Checked by Default
**Given** "Select specific" option chosen
**When** checkbox UI displayed
**Then** all 50 projects checked by default
**And** user deselects unwanted projects (Space key)

#### TC-058: Deselection Workflow (5 Keystrokes)
**Given** 50 projects shown, all checked
**When** user deselects 5 projects (Space × 5)
**Then** 45 projects remain selected
**And** total keystrokes: 5 (vs 45 without defaults)

**Implementation**:
1. Modify `src/cli/helpers/issue-tracker/jira.ts`
2. Change `selectSpecificProjects()` checkbox defaults: `checked: true`
3. Add instruction message: "All selected by default - deselect unwanted"
4. Modify `plugins/specweave-jira/lib/project-selector.ts` (same change)
5. Write integration tests: 5 test cases (coverage target: 85%)

**Files Affected**:
- `src/cli/helpers/issue-tracker/jira.ts` (MODIFY)
- `plugins/specweave-jira/lib/project-selector.ts` (MODIFY)
- `tests/integration/cli/helpers/checkbox-defaults.test.ts` (NEW)

---

### T-035: Add Clear Deselection Instructions

**User Story**: US-002
**Satisfies ACs**: AC-US2-03
**Status**: [ ] pending
**Priority**: P2 (Should Have)
**Estimated Effort**: 2 hours

**Description**: Add clear instructions explaining deselection workflow and `<a>` toggle shortcut.

**Test Plan** (Embedded):
- **Coverage Target**: N/A (visual validation)

**Validation**:
- Manual review: Instructions clear and visible
- User testing: Users understand workflow
- E2E test: Instructions displayed

**Implementation**:
1. Modify `src/cli/helpers/issue-tracker/jira.ts`
2. Add instruction message before checkbox prompt:
   ```
   💡 All projects selected by default.
      Deselect unwanted with <space>, toggle all with <a>
   ```
3. Add to prompt message: "Select projects (all selected by default - deselect unwanted):"
4. Write E2E test to verify message displayed

**Files Affected**:
- `src/cli/helpers/issue-tracker/jira.ts` (MODIFY)
- `tests/e2e/init/deselection-instructions.test.ts` (NEW)

---

### T-036: Implement `<a>` Toggle Shortcut (Easy Override)

**User Story**: US-002
**Satisfies ACs**: AC-US2-04
**Status**: [ ] pending
**Priority**: P2 (Should Have)
**Estimated Effort**: 3 hours

**Description**: Ensure `<a>` toggle shortcut works correctly in checkbox mode (toggle all checked → unchecked).

**Test Plan** (Embedded):
- **Coverage Target**: 80%
- **Framework**: Vitest + Integration tests

**Given-When-Then Scenarios**:

#### TC-059: Toggle All (Deselect All)
**Given** all 50 projects checked by default
**When** user presses `<a>`
**Then** all 50 projects unchecked
**And** user can manually select wanted projects (Space key)

#### TC-060: Toggle All (Re-Select All)
**Given** all 50 projects unchecked (after `<a>` toggle)
**When** user presses `<a>` again
**Then** all 50 projects re-checked

**Implementation**:
1. Verify `<a>` toggle works in `inquirer` checkbox mode
2. Test toggle behavior in integration tests
3. Document shortcut in instructions

**Files Affected**:
- `src/cli/helpers/issue-tracker/jira.ts` (VERIFY)
- `tests/integration/cli/helpers/toggle-shortcut.test.ts` (NEW)

---

### T-037: E2E Test: Keystroke Comparison (80% Reduction)

**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02
**Status**: [ ] pending
**Priority**: P1 (High)
**Estimated Effort**: 3 hours

**Description**: Create E2E test to validate 80% keystroke reduction for typical use case (import 45/50 projects).

**Test Plan** (Embedded):
- **Coverage Target**: 100% (E2E test)
- **Framework**: Playwright

**Given-When-Then Scenarios**:

#### TC-061: Keystroke Comparison (Old vs New)
**Given** 50 projects available
**When** importing 45/50 projects:
- **Old UX**: 45 keystrokes (select 45 projects)
- **New UX**: 5 keystrokes (deselect 5 projects)
**Then** keystroke reduction: 80%

**Implementation**:
1. Create `tests/e2e/ux/keystroke-reduction.test.ts`
2. Simulate old UX (all unchecked): count keystrokes to select 45
3. Simulate new UX (all checked): count keystrokes to deselect 5
4. Calculate reduction percentage
5. Assert reduction ≥ 80%

**Files Affected**:
- `tests/e2e/ux/keystroke-reduction.test.ts` (NEW)

---

### T-038: Update ADR-0053 with Implementation Details

**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03
**Status**: [ ] pending
**Priority**: P2 (Should Have)
**Estimated Effort**: 2 hours

**Description**: Update ADR-0053 with actual keystroke reduction metrics and user feedback.

**Test Plan**: N/A (documentation task)

**Validation**:
- Manual review: Grammar, clarity, completeness
- Link checker: All links work

**Implementation**:
1. Update `.specweave/docs/internal/architecture/adr/0053-cli-first-defaults-philosophy.md`
2. Add "Implementation Notes" with actual code snippets
3. Add keystroke comparison table with test results
4. Add user feedback (if available)

**Files Affected**:
- `.specweave/docs/internal/architecture/adr/0053-cli-first-defaults-philosophy.md` (MODIFY)

---

### T-039: Apply CLI-First Defaults to ADO Init Flow

**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02
**Status**: [ ] pending
**Priority**: P1 (High)
**Estimated Effort**: 3 hours

**Description**: Apply same CLI-first defaults to ADO init flow for consistency.

**Test Plan** (Embedded):
- **Coverage Target**: 85%
- **Framework**: Vitest + Integration tests

**Given-When-Then Scenarios**:

#### TC-062: ADO Import Strategy Default
**Given** ADO init flow
**When** import strategy prompt shown
**Then** default to "Import all"
**And** checkbox mode defaults to all checked

**Implementation**:
1. Modify `src/cli/helpers/issue-tracker/ado.ts`
2. Apply same defaults as JIRA
3. Write integration tests: 5 test cases (coverage target: 85%)

**Files Affected**:
- `src/cli/helpers/issue-tracker/ado.ts` (MODIFY)
- `tests/integration/cli/helpers/ado-cli-defaults.test.ts` (NEW)

---

### T-040: User Feedback Collection (Optional - Post-Launch)

**User Story**: US-002
**Satisfies ACs**: AC-US2-01
**Status**: [ ] pending
**Priority**: P2 (Nice to Have)
**Estimated Effort**: 2 hours

**Description**: (Optional) Collect user feedback on CLI-first defaults after launch to validate assumptions.

**Test Plan**: N/A (post-launch feedback)

**Validation**:
- User surveys: "Did you use 'Import all'?" (expect 80%+ Yes)
- Analytics: Track import strategy selection distribution
- Feedback: Collect qualitative feedback on UX

**Implementation**:
1. Add optional telemetry to track import strategy selection
2. Create survey for user feedback (Google Forms or similar)
3. Analyze results after 30 days post-launch
4. Update ADR-0053 with actual usage data

**Files Affected**:
- (Optional telemetry code if implemented)

---

## User Story: US-005 - Dedicated Import Commands (Post-Init Flexibility)

**Linked ACs**: AC-US5-01, AC-US5-02, AC-US5-03, AC-US5-04, AC-US5-05, AC-US5-06, AC-US5-07
**Tasks**: 10 total, 0 completed

### T-041: Create `/specweave-jira:import-projects` Command Structure

**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-03, AC-US5-04
**Status**: [ ] pending
**Priority**: P2 (Should Have)
**Estimated Effort**: 6 hours

**Description**: Create dedicated import command for adding JIRA projects post-init with filtering and merge support.

**Test Plan** (Embedded):
- **Coverage Target**: 85%
- **Framework**: Vitest + Integration tests

**Given-When-Then Scenarios**:

#### TC-063: Post-Init Import (Merge with Existing)
**Given** existing projects: BACKEND, FRONTEND (in .env)
**When** `/specweave-jira:import-projects` executed
**Then** fetch available projects
**And** show only new projects (exclude BACKEND, FRONTEND)
**And** prompt for selection
**And** merge selected with existing (no duplicates)

#### TC-064: Filter Active Projects Only
**Given** 500 total projects (450 active, 50 archived)
**When** `/specweave-jira:import-projects --filter active` executed
**Then** show only 450 active projects
**And** preview: "Filters will load ~450 projects (down from 500)"

**Implementation**:
1. Create `plugins/specweave-jira/commands/import-projects.ts`
2. Define `ImportProjectsOptions` interface (filter, jql, resume, dryRun)
3. Implement `importProjectsCommand(options: ImportProjectsOptions)`
4. Read existing projects from `.env` (JIRA_PROJECTS)
5. Fetch available projects from API
6. Apply filters (active, type, lead, jql)
7. Show preview with count
8. Prompt for confirmation
9. Merge selected with existing (updateEnvFile)
10. Write integration tests: 10 test cases (coverage target: 85%)

**Files Affected**:
- `plugins/specweave-jira/commands/import-projects.ts` (NEW)
- `tests/integration/commands/import-projects-jira.test.ts` (NEW)

---

### T-042: Implement Smart Filtering (Active, Type, Lead, JQL)

**User Story**: US-005
**Satisfies ACs**: AC-US5-04
**Status**: [ ] pending
**Priority**: P2 (Should Have)
**Estimated Effort**: 5 hours

**Description**: Implement filtering logic for project imports: active only, by type, by lead, custom JQL.

**Test Plan** (Embedded):
- **Coverage Target**: 90%
- **Framework**: Vitest + Unit tests

**Given-When-Then Scenarios**:

#### TC-065: Filter Active Projects
**Given** 100 projects (80 active, 20 archived)
**When** `applyFilters(projects, { active: true })` called
**Then** return 80 active projects
**And** archived projects excluded

#### TC-066: Filter by Project Type (Agile)
**Given** 100 projects (50 Agile, 30 CMMI, 20 Business)
**When** `applyFilters(projects, { type: 'agile' })` called
**Then** return 50 Agile projects

#### TC-067: Custom JQL Filter
**Given** JQL: `project in (BACKEND, FRONTEND) AND status != Archived`
**When** `filterByJql(jql)` called
**Then** execute JIRA search API
**And** return matching projects (BACKEND, FRONTEND)

**Implementation**:
1. Create `src/integrations/jira/filter-processor.ts`
2. Implement `FilterProcessor` class
3. Implement `applyFilters(projects, options): Promise<any[]>`
4. Implement `filterActive(projects): any[]`
5. Implement `filterByType(projects, types): any[]`
6. Implement `filterByLead(projects, lead): any[]`
7. Implement `filterByJql(jql): Promise<any[]>` (JIRA search API)
8. Write unit tests: 12 test cases (coverage target: 90%)

**Files Affected**:
- `src/integrations/jira/filter-processor.ts` (NEW)
- `tests/unit/integrations/jira/filter-processor.test.ts` (NEW)

---

### T-043: Implement Resume Support (ImportState)

**User Story**: US-005
**Satisfies ACs**: AC-US5-05
**Status**: [ ] pending
**Priority**: P2 (Should Have)
**Estimated Effort**: 4 hours

**Description**: Implement resume capability for interrupted imports using ImportState (from US-007).

**Test Plan** (Embedded):
- **Coverage Target**: 85%
- **Framework**: Vitest + Integration tests

**Given-When-Then Scenarios**:

#### TC-068: Resume Interrupted Import
**Given** import interrupted at 25/50 projects (state saved)
**When** `/specweave-jira:import-projects --resume` executed
**Then** load import state
**And** skip first 25 projects (already imported)
**And** import remaining 25 projects
**And** merge with existing

**Implementation**:
1. Modify `plugins/specweave-jira/commands/import-projects.ts`
2. Add `--resume` flag handling
3. Load ImportState from `.specweave/cache/import-state.json`
4. Skip already-imported projects
5. Continue from last checkpoint
6. Write integration tests: 6 test cases (coverage target: 85%)

**Files Affected**:
- `plugins/specweave-jira/commands/import-projects.ts` (MODIFY)
- `tests/integration/commands/import-resume-jira.test.ts` (NEW)

---

### T-044: Implement Dry-Run Mode (Preview)

**User Story**: US-005
**Satisfies ACs**: AC-US5-07
**Status**: [ ] pending
**Priority**: P2 (Should Have)
**Estimated Effort**: 3 hours

**Description**: Implement dry-run mode to preview import without making changes.

**Test Plan** (Embedded):
- **Coverage Target**: 85%
- **Framework**: Vitest + Integration tests

**Given-When-Then Scenarios**:

#### TC-069: Dry-Run Preview
**Given** 50 new projects available
**When** `/specweave-jira:import-projects --dry-run` executed
**Then** show preview:
```
Dry run: The following projects would be imported:
  ✨ MOBILE (Agile, lead: John Doe)
  ✨ INFRA (Software, lead: Jane Smith)
  ⏭️ LEGACY (archived - skipped)

Total: 2 projects would be imported
```
**And** make no changes to .env or config files

**Implementation**:
1. Modify `plugins/specweave-jira/commands/import-projects.ts`
2. Add `--dry-run` flag handling
3. Skip actual import if dry-run enabled
4. Show preview with project details
5. Write integration tests: 4 test cases (coverage target: 85%)

**Files Affected**:
- `plugins/specweave-jira/commands/import-projects.ts` (MODIFY)
- `tests/integration/commands/import-dry-run-jira.test.ts` (NEW)

---

### T-045: Implement Progress Tracking for Import Commands

**User Story**: US-005
**Satisfies ACs**: AC-US5-06
**Status**: [ ] pending
**Priority**: P1 (High)
**Estimated Effort**: 4 hours

**Description**: Integrate ProgressTracker and CancelationHandler into import commands (reuse from US-007).

**Test Plan** (Embedded):
- **Coverage Target**: 85%
- **Framework**: Vitest + Integration tests

**Given-When-Then Scenarios**:

#### TC-070: Progress During Import
**Given** importing 50 projects
**When** import executes
**Then** show progress bar: "Importing projects... 12/50 (24%)"
**And** show project-level status: "✅ BACKEND", "⏳ MOBILE"

#### TC-071: Cancelation During Import
**Given** import in progress (25/50 projects)
**When** Ctrl+C pressed
**Then** save import state
**And** show: "Use --resume to continue"

**Implementation**:
1. Modify `plugins/specweave-jira/commands/import-projects.ts`
2. Add ProgressTracker instantiation
3. Add CancelationHandler for Ctrl+C
4. Integrate with importProjectsWithProgress() helper
5. Write integration tests: 6 test cases (coverage target: 85%)

**Files Affected**:
- `plugins/specweave-jira/commands/import-projects.ts` (MODIFY)
- `tests/integration/commands/import-progress-jira.test.ts` (NEW)

---

### T-046: Create `/specweave-ado:import-projects` Command

**User Story**: US-005
**Satisfies ACs**: AC-US5-02, AC-US5-03
**Status**: [ ] pending
**Priority**: P2 (Should Have)
**Estimated Effort**: 5 hours

**Description**: Create dedicated import command for ADO (same pattern as JIRA).

**Test Plan** (Embedded):
- **Coverage Target**: 85%
- **Framework**: Vitest + Integration tests

**Given-When-Then Scenarios**:

#### TC-072: ADO Post-Init Import
**Given** existing ADO projects: PLATFORM
**When** `/specweave-ado:import-projects` executed
**Then** fetch available projects
**And** show only new projects
**And** merge selected with existing

**Implementation**:
1. Create `plugins/specweave-ado/commands/import-projects.ts`
2. Implement same pattern as JIRA import command
3. Apply ADO-specific filtering (area paths)
4. Write integration tests: 8 test cases (coverage target: 85%)

**Files Affected**:
- `plugins/specweave-ado/commands/import-projects.ts` (NEW)
- `tests/integration/commands/import-projects-ado.test.ts` (NEW)

---

### T-047: Implement Saved Filter Presets

**User Story**: US-005
**Satisfies ACs**: AC-US5-04
**Status**: [ ] pending
**Priority**: P2 (Nice to Have)
**Estimated Effort**: 4 hours

**Description**: Implement saved filter presets for commonly-used filter combinations (e.g., `--preset production`).

**Test Plan** (Embedded):
- **Coverage Target**: 80%
- **Framework**: Vitest + Integration tests

**Given-When-Then Scenarios**:

#### TC-073: Use Saved Preset
**Given** preset "production" defined in config:
```json
{
  "jira": {
    "filterPresets": {
      "production": {
        "filter": "active",
        "type": "agile",
        "jql": "project NOT IN (TEST, SANDBOX)"
      }
    }
  }
}
```
**When** `/specweave-jira:import-projects --preset production` executed
**Then** apply preset filters
**And** show preview with filtered projects

**Implementation**:
1. Modify `src/integrations/jira/filter-processor.ts`
2. Add `loadPreset(presetName): FilterOptions` method
3. Read presets from `.specweave/config.json`
4. Merge preset with CLI options
5. Write integration tests: 5 test cases (coverage target: 80%)

**Files Affected**:
- `src/integrations/jira/filter-processor.ts` (MODIFY)
- `.specweave/config.json` (MODIFY - add filterPresets section)
- `tests/integration/commands/filter-presets.test.ts` (NEW)

---

### T-048: E2E Test: Full Import Command Workflow

**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-03, AC-US5-04, AC-US5-05, AC-US5-06, AC-US5-07
**Status**: [ ] pending
**Priority**: P1 (High)
**Estimated Effort**: 5 hours

**Description**: Create comprehensive E2E test for full import command workflow.

**Test Plan** (Embedded):
- **Coverage Target**: 100% (E2E test)
- **Framework**: Playwright

**Given-When-Then Scenarios**:

#### TC-074: Full Import Command Flow
**Given** existing projects: BACKEND, FRONTEND
**When** executing full workflow:
1. Run `/specweave-jira:import-projects --filter active`
2. See preview (45 new projects)
3. Confirm import
4. Observe progress bar
5. Press Ctrl+C at 50%
6. Resume with `--resume`
7. Complete remaining 50%
8. Verify merged projects in .env
**Then** verify all steps successful

**Implementation**:
1. Create `tests/e2e/commands/import-full-workflow.test.ts`
2. Test dry-run mode
3. Test filtering
4. Test cancelation and resume
5. Test merge with existing projects

**Files Affected**:
- `tests/e2e/commands/import-full-workflow.test.ts` (NEW)

---

### T-049: Update .env Management Utilities

**User Story**: US-005
**Satisfies ACs**: AC-US5-03
**Status**: [ ] pending
**Priority**: P1 (High)
**Estimated Effort**: 3 hours

**Description**: Create/update .env management utilities for atomic updates and merge operations.

**Test Plan** (Embedded):
- **Coverage Target**: 90%
- **Framework**: Vitest + Unit tests

**Given-When-Then Scenarios**:

#### TC-075: Atomic .env Update
**Given** existing .env file
**When** `updateEnvFile(key, value)` called
**Then** write to temp file first
**And** rename temp → .env (atomic)
**And** backup .env → .env.backup

#### TC-076: Merge Project Lists (No Duplicates)
**Given** existing: `JIRA_PROJECTS=BACKEND,FRONTEND`
**And** new projects: `MOBILE,INFRA,BACKEND` (BACKEND duplicate)
**When** merging
**Then** result: `JIRA_PROJECTS=BACKEND,FRONTEND,MOBILE,INFRA`
**And** no duplicates

**Implementation**:
1. Create `src/utils/env-manager.ts`
2. Implement `updateEnvFile(key: string, value: string): Promise<void>`
3. Implement `mergeProjectList(existing: string[], new: string[]): string[]`
4. Implement atomic write (temp file + rename)
5. Implement backup (.env.backup)
6. Write unit tests: 8 test cases (coverage target: 90%)

**Files Affected**:
- `src/utils/env-manager.ts` (NEW)
- `tests/unit/utils/env-manager.test.ts` (NEW)

---

### T-050: Document Import Commands in User Guide

**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02
**Status**: [ ] pending
**Priority**: P2 (Should Have)
**Estimated Effort**: 2 hours

**Description**: Document `/specweave-jira:import-projects` and `/specweave-ado:import-projects` commands in user guide.

**Test Plan**: N/A (documentation task)

**Validation**:
- Manual review: Grammar, clarity, completeness
- Build check: Markdown renders correctly
- Example validation: All command examples work

**Implementation**:
1. Update `.specweave/docs/public/guides/user-guide.md`
2. Add "Post-Init Project Import" section
3. Add usage examples for each flag (--filter, --jql, --resume, --dry-run)
4. Add troubleshooting section

**Files Affected**:
- `.specweave/docs/public/guides/user-guide.md` (MODIFY)

---

## User Story: US-006 - Azure DevOps Area Path Mapping (Hierarchical Sub-Projects)

**Linked ACs**: AC-US6-01, AC-US6-02, AC-US6-03, AC-US6-04, AC-US6-05, AC-US6-06
**Tasks**: 12 total, 0 completed

### T-051: Implement AreaPathMapper Core Module

**User Story**: US-006
**Satisfies ACs**: AC-US6-01, AC-US6-03, AC-US6-04, AC-US6-05
**Status**: [ ] pending
**Priority**: P1 (High)
**Estimated Effort**: 6 hours

**Description**: Create AreaPathMapper class to fetch, parse, and map ADO area paths to SpecWeave project IDs.

**Test Plan** (Embedded):
- **Coverage Target**: 90%
- **Framework**: Vitest + HTTP mocks

**Given-When-Then Scenarios**:

#### TC-077: Fetch Area Path Tree (Recursive)
**Given** ADO project "Platform"
**When** `fetchAreaPaths('Platform')` called
**Then** make API call: `GET /_apis/wit/classificationnodes/areas?$depth=10`
**And** return recursive tree structure
**And** parse: Platform → Backend → API, Database, Services

#### TC-078: Map Area Path to Project ID (Kebab-Case)
**Given** area path: `Platform/Backend/API`
**When** `mapToProjectId('Platform/Backend/API')` called
**Then** return: `backend-api` (kebab-case, exclude root)

#### TC-079: Map Area Path to Project ID (Root)
**Given** area path: `Platform`
**When** `mapToProjectId('Platform')` called
**Then** return: `platform`

**Implementation**:
1. Create `src/integrations/ado/area-path-mapper.ts`
2. Define `AreaPathNode` interface (id, name, path, level, children)
3. Implement `fetchAreaPaths(project: string): Promise<AreaPathNode>`
4. Implement `parseAreaPathTree(node, level, parentPath): AreaPathNode` (recursive)
5. Implement `mapToProjectId(areaPath: string): string` (kebab-case conversion)
6. Implement `flattenAreaPaths(root, granularity): AreaPathNode[]`
7. Write unit tests: 10 test cases (coverage target: 90%)

**Files Affected**:
- `src/integrations/ado/area-path-mapper.ts` (NEW)
- `tests/unit/integrations/ado/area-path-mapper.test.ts` (NEW)

---

### T-052: Implement Granularity Selection (Top-Level, Two-Level, Full Tree)

**User Story**: US-006
**Satisfies ACs**: AC-US6-02, AC-US6-03, AC-US6-04, AC-US6-05
**Status**: [ ] pending
**Priority**: P1 (High)
**Estimated Effort**: 5 hours

**Description**: Implement granularity flattening logic to extract area paths at specific levels.

**Test Plan** (Embedded):
- **Coverage Target**: 90%
- **Framework**: Vitest + Unit tests

**Given-When-Then Scenarios**:

#### TC-080: Flatten Top-Level Only
**Given** area path tree with 10 nodes (3 top-level)
**When** `flattenAreaPaths(root, 'top-level')` called
**Then** return 3 nodes (Backend, Frontend, Infrastructure)

#### TC-081: Flatten Two-Level
**Given** area path tree with 10 nodes (8 two-level)
**When** `flattenAreaPaths(root, 'two-level')` called
**Then** return 8 nodes (Backend-API, Backend-Database, Frontend-Web, etc.)

#### TC-082: Flatten Full Tree
**Given** area path tree with 10 nodes (all levels)
**When** `flattenAreaPaths(root, 'full-tree')` called
**Then** return all 10 nodes

**Implementation**:
1. Modify `src/integrations/ado/area-path-mapper.ts`
2. Implement `getNodesByLevel(node, targetLevel): AreaPathNode[]` (recursive)
3. Implement `getAllNodes(node): AreaPathNode[]` (recursive flatten)
4. Write unit tests: 8 test cases (coverage target: 90%)

**Files Affected**:
- `src/integrations/ado/area-path-mapper.ts` (MODIFY)
- `tests/unit/integrations/ado/area-path-flattening.test.ts` (NEW)

---

### T-053: Implement promptAreaPathGranularity (User Choice)

**User Story**: US-006
**Satisfies ACs**: AC-US6-02
**Status**: [ ] pending
**Priority**: P1 (High)
**Estimated Effort**: 4 hours

**Description**: Create prompt for user to select area path granularity during ADO init.

**Test Plan** (Embedded):
- **Coverage Target**: 85%
- **Framework**: Vitest + Integration tests

**Given-When-Then Scenarios**:

#### TC-083: Granularity Prompt Display
**Given** area path tree with 10 nodes (3 top-level, 8 two-level)
**When** `promptAreaPathGranularity(areaPaths)` called
**Then** show prompt:
```
How would you like to map Azure DevOps area paths?

1. 📁 Top-level only (3 projects)
2. 📁📁 Two-level (8 projects)
3. 📁🌳 Full tree (10 projects)
4. ✏️  Custom (select specific paths)
```
**And** default to option 1 (top-level - safe default)

**Implementation**:
1. Modify `src/cli/helpers/issue-tracker/ado.ts`
2. Add `promptAreaPathGranularity(areaPaths: AreaPathNode): Promise<AreaPathGranularity>`
3. Use `inquirer.prompt()` with list type
4. Show counts for each option
5. Write integration tests: 5 test cases (coverage target: 85%)

**Files Affected**:
- `src/cli/helpers/issue-tracker/ado.ts` (MODIFY)
- `tests/integration/cli/helpers/ado-granularity-prompt.test.ts` (NEW)

---

### T-054: Integrate Area Path Mapping into ADO Init Flow

**User Story**: US-006
**Satisfies ACs**: AC-US6-01, AC-US6-02, AC-US6-03, AC-US6-04
**Status**: [ ] pending
**Priority**: P1 (High)
**Estimated Effort**: 6 hours

**Description**: Integrate AreaPathMapper into ADO init flow to create project folders based on area paths.

**Test Plan** (Embedded):
- **Coverage Target**: 85%
- **Framework**: Vitest + Integration tests

**Given-When-Then Scenarios**:

#### TC-084: ADO Init with Top-Level Mapping
**Given** ADO project "Platform" with area paths
**When** init executes with "top-level" granularity
**Then** fetch area paths
**And** flatten to top-level (3 projects)
**And** create folders:
  - `.specweave/docs/internal/specs/backend/`
  - `.specweave/docs/internal/specs/frontend/`
  - `.specweave/docs/internal/specs/infrastructure/`
**And** save mappings to .env:
  - `ADO_AREA_PATH_BACKEND_ID=2`
  - `ADO_AREA_PATH_BACKEND=Platform/Backend`

**Implementation**:
1. Modify `src/cli/helpers/issue-tracker/ado.ts`
2. Add area path fetching after credentials validation
3. Prompt for granularity
4. Flatten area paths based on choice
5. Create project folders for each area path
6. Save area path mappings to .env (ID + path)
7. Write integration tests: 8 test cases (coverage target: 85%)

**Files Affected**:
- `src/cli/helpers/issue-tracker/ado.ts` (MODIFY)
- `tests/integration/cli/helpers/ado-area-path-init.test.ts` (NEW)

---

### T-055: Implement Area Path Rename Detection

**User Story**: US-006
**Satisfies ACs**: AC-US6-06
**Status**: [ ] pending
**Priority**: P2 (Should Have)
**Estimated Effort**: 5 hours

**Description**: Implement rename detection by storing area path IDs (not names) and comparing during sync.

**Test Plan** (Embedded):
- **Coverage Target**: 85%
- **Framework**: Vitest + Integration tests

**Given-When-Then Scenarios**:

#### TC-085: Detect Area Path Rename
**Given** area path ID=2 was "Platform/Backend/API"
**And** .env has: `ADO_AREA_PATH_BACKEND_API_ID=2`, `ADO_AREA_PATH_BACKEND_API=Platform/Backend/API`
**When** syncing and API returns ID=2 with name "Platform/Backend/REST"
**Then** detect rename (ID same, name different)
**And** prompt: "Area path renamed: API → REST. Update SpecWeave project? (Y/n)"

**Implementation**:
1. Create `src/integrations/ado/area-path-sync.ts`
2. Implement `detectAreaPathRenames(storedPaths, currentPaths): RenameDetection[]`
3. Compare area path IDs (not names)
4. Prompt user for confirmation if renames detected
5. Update .env and rename project folders if user confirms
6. Write integration tests: 6 test cases (coverage target: 85%)

**Files Affected**:
- `src/integrations/ado/area-path-sync.ts` (NEW)
- `tests/integration/integrations/ado/area-path-renames.test.ts` (NEW)

---

### T-056: Implement Bidirectional Sync (ADO ↔ SpecWeave)

**User Story**: US-006
**Satisfies ACs**: AC-US6-06
**Status**: [ ] pending
**Priority**: P2 (Should Have)
**Estimated Effort**: 6 hours

**Description**: Implement bidirectional sync: new area paths in ADO create SpecWeave projects, new SpecWeave projects create area paths.

**Test Plan** (Embedded):
- **Coverage Target**: 80%
- **Framework**: Vitest + Integration tests

**Given-When-Then Scenarios**:

#### TC-086: New Area Path in ADO (ADO → SpecWeave)
**Given** new area path created in ADO: `Platform/Backend/Microservices`
**When** sync executes
**Then** detect new area path
**And** prompt: "New area path detected: Microservices. Create SpecWeave project? (Y/n)"
**And** create folder: `.specweave/docs/internal/specs/backend-microservices/`

#### TC-087: New SpecWeave Project (SpecWeave → ADO)
**Given** new project folder created: `.specweave/docs/internal/specs/backend-graphql/`
**When** sync executes
**Then** detect new project
**And** prompt: "New project: backend-graphql. Create ADO area path? (Y/n)"
**And** create area path: `Platform/Backend/GraphQL`

**Implementation**:
1. Modify `src/integrations/ado/area-path-sync.ts`
2. Implement `detectNewAreaPaths(storedPaths, currentPaths): AreaPathNode[]`
3. Implement `detectNewProjects(existingProjects, folders): string[]`
4. Prompt user for confirmation
5. Create area paths via ADO API if confirmed
6. Write integration tests: 7 test cases (coverage target: 80%)

**Files Affected**:
- `src/integrations/ado/area-path-sync.ts` (MODIFY)
- `tests/integration/integrations/ado/bidirectional-sync.test.ts` (NEW)

---

### T-057: Handle Area Path Deletions (Orphaned Projects)

**User Story**: US-006
**Satisfies ACs**: AC-US6-06
**Status**: [ ] pending
**Priority**: P2 (Should Have)
**Estimated Effort**: 4 hours

**Description**: Detect area path deletions in ADO and prompt to archive orphaned SpecWeave projects.

**Test Plan** (Embedded):
- **Coverage Target**: 80%
- **Framework**: Vitest + Integration tests

**Given-When-Then Scenarios**:

#### TC-088: Detect Area Path Deletion
**Given** area path ID=5 ("Platform/Backend/Legacy") deleted in ADO
**And** .env has: `ADO_AREA_PATH_BACKEND_LEGACY_ID=5`
**When** sync executes
**Then** detect deletion (ID no longer exists in API)
**And** prompt: "Area path deleted: Legacy. Archive SpecWeave project? (Y/n)"
**And** move folder to `.specweave/archive/backend-legacy/` if confirmed

**Implementation**:
1. Modify `src/integrations/ado/area-path-sync.ts`
2. Implement `detectDeletedAreaPaths(storedPaths, currentPaths): number[]` (returns IDs)
3. Prompt user for confirmation
4. Move project folder to archive directory
5. Update .env (remove deleted area path mapping)
6. Write integration tests: 5 test cases (coverage target: 80%)

**Files Affected**:
- `src/integrations/ado/area-path-sync.ts` (MODIFY)
- `tests/integration/integrations/ado/area-path-deletions.test.ts` (NEW)

---

### T-058: Handle Area Path Naming Conflicts

**User Story**: US-006
**Satisfies ACs**: AC-US6-03, AC-US6-04
**Status**: [ ] pending
**Priority**: P2 (Should Have)
**Estimated Effort**: 3 hours

**Description**: Handle naming conflicts when multiple area paths map to same project ID (e.g., Frontend/API and Backend/API both → "api").

**Test Plan** (Embedded):
- **Coverage Target**: 85%
- **Framework**: Vitest + Unit tests

**Given-When-Then Scenarios**:

#### TC-089: Naming Conflict Detection
**Given** area paths: `Platform/Frontend/API` and `Platform/Backend/API`
**When** mapping to project IDs
**Then** detect conflict (both map to "api")
**And** disambiguate: `frontend-api` and `backend-api`

#### TC-090: Collision with Suffix
**Given** area paths: `Platform/Backend/API` and `Platform/Backend-API` (hyphen in name)
**When** mapping to project IDs
**Then** both map to `backend-api` (collision)
**And** append suffix: `backend-api` and `backend-api-2`
**And** warn user: "Project ID collision detected: backend-api-2"

**Implementation**:
1. Modify `src/integrations/ado/area-path-mapper.ts`
2. Implement collision detection logic
3. Disambiguate by including parent in project ID
4. Add suffix (-2, -3) if still colliding
5. Write unit tests: 6 test cases (coverage target: 85%)

**Files Affected**:
- `src/integrations/ado/area-path-mapper.ts` (MODIFY)
- `tests/unit/integrations/ado/naming-conflicts.test.ts` (NEW)

---

### T-059: E2E Test: Full ADO Area Path Workflow

**User Story**: US-006
**Satisfies ACs**: AC-US6-01, AC-US6-02, AC-US6-03, AC-US6-06
**Status**: [ ] pending
**Priority**: P1 (High)
**Estimated Effort**: 5 hours

**Description**: Create comprehensive E2E test for ADO area path mapping workflow.

**Test Plan** (Embedded):
- **Coverage Target**: 100% (E2E test)
- **Framework**: Playwright

**Given-When-Then Scenarios**:

#### TC-091: Full ADO Init with Area Paths
**Given** ADO instance with hierarchical area paths
**When** executing init:
1. Select Azure DevOps
2. Enter credentials
3. Fetch area paths (10 nodes)
4. Select "Top-level only" (3 projects)
5. Create project folders
6. Verify folders created
7. Verify .env mappings correct
**Then** verify all steps successful

**Implementation**:
1. Create `tests/e2e/init/ado-area-paths.test.ts`
2. Mock ADO API with area path tree
3. Test granularity selection
4. Test folder creation
5. Test rename detection (future sync)

**Files Affected**:
- `tests/e2e/init/ado-area-paths.test.ts` (NEW)

---

### T-060: Update ADR-0054 with Implementation Details

**User Story**: US-006
**Satisfies ACs**: AC-US6-01, AC-US6-02
**Status**: [ ] pending
**Priority**: P2 (Should Have)
**Estimated Effort**: 2 hours

**Description**: Update ADR-0054 with actual implementation details and code snippets.

**Test Plan**: N/A (documentation task)

**Validation**:
- Manual review: Grammar, clarity, completeness
- Link checker: All links work

**Implementation**:
1. Update `.specweave/docs/internal/architecture/adr/0054-ado-area-path-mapping.md`
2. Add "Implementation Notes" with actual code
3. Add .env format examples
4. Add troubleshooting section

**Files Affected**:
- `.specweave/docs/internal/architecture/adr/0054-ado-area-path-mapping.md` (MODIFY)

---

### T-061: Integration Test: Area Path Tree Parsing (Real ADO API)

**User Story**: US-006
**Satisfies ACs**: AC-US6-01
**Status**: [ ] pending
**Priority**: P1 (High)
**Estimated Effort**: 4 hours

**Description**: Create integration test with real ADO API to validate area path tree parsing.

**Test Plan** (Embedded):
- **Coverage Target**: N/A (integration validation)
- **Framework**: Vitest + Real ADO API (optional)

**Given-When-Then Scenarios**:

#### TC-092: Real ADO API Test
**Given** real ADO credentials (optional, skip if unavailable)
**When** fetching area paths from real ADO instance
**Then** verify tree structure correct
**And** verify all nodes parsed
**And** verify granularity flattening works

**Implementation**:
1. Create `tests/integration/integrations/ado/real-api.test.ts`
2. Test with real ADO instance (if credentials available)
3. Otherwise, use comprehensive mock
4. Validate tree parsing accuracy

**Files Affected**:
- `tests/integration/integrations/ado/real-api.test.ts` (NEW)

---

### T-062: Document ADO Area Path Mapping in User Guide

**User Story**: US-006
**Satisfies ACs**: AC-US6-01, AC-US6-02
**Status**: [ ] pending
**Priority**: P2 (Should Have)
**Estimated Effort**: 2 hours

**Description**: Document ADO area path mapping in user guide with examples.

**Test Plan**: N/A (documentation task)

**Validation**:
- Manual review: Grammar, clarity, completeness
- Build check: Markdown renders correctly

**Implementation**:
1. Update `.specweave/docs/public/guides/user-guide.md`
2. Add "Azure DevOps Area Path Mapping" section
3. Add examples for each granularity level
4. Add troubleshooting section

**Files Affected**:
- `.specweave/docs/public/guides/user-guide.md` (MODIFY)

---

## User Story: US-008 - Smart Filtering (Active Projects, Custom JQL)

**Linked ACs**: AC-US8-01, AC-US8-02, AC-US8-03, AC-US8-04, AC-US8-05, AC-US8-06
**Tasks**: 10 total, 0 completed

### T-063: Implement FilterProcessor Core Module

**User Story**: US-008
**Satisfies ACs**: AC-US8-01, AC-US8-02, AC-US8-03, AC-US8-04
**Status**: [ ] pending
**Priority**: P2 (Should Have)
**Estimated Effort**: 6 hours

**Description**: Create FilterProcessor class with active, type, lead, and JQL filtering support. (Already partially implemented in T-042, complete here)

**Test Plan** (Embedded):
- **Coverage Target**: 90%
- **Framework**: Vitest + Integration tests

**Given-When-Then Scenarios**:

#### TC-093: Filter Active Projects
**Given** 100 projects (80 active, 20 archived)
**When** `applyFilters(projects, { active: true })` called
**Then** return 80 active projects

#### TC-094: Filter by Multiple Types
**Given** 100 projects (50 Agile, 30 CMMI, 20 Business)
**When** `applyFilters(projects, { type: ['agile', 'cmmi'] })` called
**Then** return 80 projects (50 Agile + 30 CMMI)

#### TC-095: Filter by Lead Email
**Given** 100 projects, 12 led by john.doe@example.com
**When** `applyFilters(projects, { lead: 'john.doe@example.com' })` called
**Then** return 12 projects

#### TC-096: Custom JQL Filter
**Given** JQL: `project in (BACKEND, FRONTEND) AND status != Archived`
**When** `filterByJql(jql)` called
**Then** execute JIRA search API
**And** return matching projects (BACKEND, FRONTEND)

**Implementation**:
1. Complete `src/integrations/jira/filter-processor.ts` (from T-042)
2. Add multiple type filtering
3. Add lead filtering (match email, accountId, displayName)
4. Add JQL filtering with JIRA search API
5. Write integration tests: 12 test cases (coverage target: 90%)

**Files Affected**:
- `src/integrations/jira/filter-processor.ts` (COMPLETE from T-042)
- `tests/integration/integrations/jira/filter-processor-full.test.ts` (NEW)

---

### T-064: Implement Filter Preview (Before Import)

**User Story**: US-008
**Satisfies ACs**: AC-US8-05
**Status**: [ ] pending
**Priority**: P1 (High)
**Estimated Effort**: 3 hours

**Description**: Create filter preview to show what will be imported before executing.

**Test Plan** (Embedded):
- **Coverage Target**: 85%
- **Framework**: Vitest + Integration tests

**Given-When-Then Scenarios**:

#### TC-097: Preview Filtered Projects
**Given** filters: active=true, type='agile'
**And** 500 total projects, 45 match filters
**When** `showPreview(filteredProjects, options)` called
**Then** show:
```
📋 Filter Preview:
   ✓ Active projects only
   ✓ Project type: agile

📊 45 projects will be imported (down from 500)
```

**Implementation**:
1. Modify `src/integrations/jira/filter-processor.ts`
2. Implement `showPreview(projects: any[], options: FilterOptions): void`
3. Show active filters
4. Show count comparison (filtered vs total)
5. Write integration tests: 4 test cases (coverage target: 85%)

**Files Affected**:
- `src/integrations/jira/filter-processor.ts` (MODIFY)
- `tests/integration/integrations/jira/filter-preview.test.ts` (NEW)

---

### T-065: Implement Saved Filter Presets

**User Story**: US-008
**Satisfies ACs**: AC-US8-06
**Status**: [ ] pending
**Priority**: P2 (Should Have)
**Estimated Effort**: 4 hours

**Description**: Implement saved filter presets in `.specweave/config.json` for reusable filter combinations. (Already partially implemented in T-047, complete here)

**Test Plan** (Embedded):
- **Coverage Target**: 80%
- **Framework**: Vitest + Integration tests

**Given-When-Then Scenarios**:

#### TC-098: Load Preset from Config
**Given** preset "production" defined in config
**When** `loadPreset('production')` called
**Then** return filter options: `{ active: true, type: 'agile', jql: '...' }`

#### TC-099: Merge Preset with CLI Options
**Given** preset "production" with `active: true`
**And** CLI options: `{ type: 'cmmi' }`
**When** merging
**Then** result: `{ active: true, type: 'cmmi' }` (CLI overrides)

**Implementation**:
1. Complete `src/integrations/jira/filter-processor.ts` (from T-047)
2. Add preset loading from `.specweave/config.json`
3. Add CLI option merging (CLI overrides preset)
4. Write integration tests: 5 test cases (coverage target: 80%)

**Files Affected**:
- `src/integrations/jira/filter-processor.ts` (COMPLETE from T-047)
- `tests/integration/integrations/jira/filter-presets-full.test.ts` (NEW)

---

### T-066: Integrate Filtering into Init Flow

**User Story**: US-008
**Satisfies ACs**: AC-US8-01, AC-US8-02, AC-US8-05
**Status**: [ ] pending
**Priority**: P1 (High)
**Estimated Effort**: 5 hours

**Description**: Integrate smart filtering into init flow with upfront filter prompt.

**Test Plan** (Embedded):
- **Coverage Target**: 85%
- **Framework**: Vitest + Integration tests

**Given-When-Then Scenarios**:

#### TC-100: Init with Filtering
**Given** JIRA instance with 500 projects
**When** init executes
**Then** prompt: "Apply filters before loading projects? (Y/n)"
**And** if Yes → show filter options (active, type, lead, JQL)
**And** show preview: "Filters will load ~45 projects (down from 500)"
**And** proceed with filtered list

**Implementation**:
1. Modify `src/cli/helpers/issue-tracker/jira.ts`
2. Add filter prompt before project count fetch
3. Apply filters before showing import strategy
4. Show preview with count comparison
5. Write integration tests: 6 test cases (coverage target: 85%)

**Files Affected**:
- `src/cli/helpers/issue-tracker/jira.ts` (MODIFY)
- `tests/integration/cli/helpers/init-with-filters.test.ts` (NEW)

---

### T-067: Integrate Filtering into Import Commands

**User Story**: US-008
**Satisfies ACs**: AC-US8-01, AC-US8-02, AC-US8-04
**Status**: [ ] pending
**Priority**: P1 (High)
**Estimated Effort**: 4 hours

**Description**: Integrate smart filtering into `/specweave-jira:import-projects` command.

**Test Plan** (Embedded):
- **Coverage Target**: 85%
- **Framework**: Vitest + Integration tests

**Given-When-Then Scenarios**:

#### TC-101: Import with Filters
**Given** existing projects: BACKEND, FRONTEND
**When** `/specweave-jira:import-projects --filter active --type agile` executed
**Then** fetch all available projects
**And** apply filters (active, agile)
**And** exclude existing projects (BACKEND, FRONTEND)
**And** show preview
**And** prompt for confirmation

**Implementation**:
1. Modify `plugins/specweave-jira/commands/import-projects.ts`
2. Add filter options to CLI arguments
3. Apply FilterProcessor before showing selection
4. Write integration tests: 5 test cases (coverage target: 85%)

**Files Affected**:
- `plugins/specweave-jira/commands/import-projects.ts` (MODIFY)
- `tests/integration/commands/import-with-filters.test.ts` (NEW)

---

### T-068: Implement JQL Validation (Client-Side)

**User Story**: US-008
**Satisfies ACs**: AC-US8-04
**Status**: [ ] pending
**Priority**: P2 (Should Have)
**Estimated Effort**: 3 hours

**Description**: Add basic JQL syntax validation to catch errors before API call.

**Test Plan** (Embedded):
- **Coverage Target**: 80%
- **Framework**: Vitest + Unit tests

**Given-When-Then Scenarios**:

#### TC-102: Valid JQL Syntax
**Given** JQL: `project in (BACKEND, FRONTEND) AND status = "In Progress"`
**When** `validateJql(jql)` called
**Then** return `{ valid: true }`

#### TC-103: Invalid JQL Syntax (Unclosed Quote)
**Given** JQL: `project in (BACKEND, FRONTEND) AND status = "In Progress`
**When** `validateJql(jql)` called
**Then** return `{ valid: false, error: 'Unclosed quote at position 58' }`

#### TC-104: Invalid JQL Syntax (Missing Closing Paren)
**Given** JQL: `project in (BACKEND, FRONTEND AND status = "Open"`
**When** `validateJql(jql)` called
**Then** return `{ valid: false, error: 'Missing closing parenthesis' }`

**Implementation**:
1. Create `src/integrations/jira/jql-validator.ts`
2. Implement basic JQL syntax validation (quotes, parentheses, operators)
3. Implement `validateJql(jql: string): { valid: boolean; error?: string }`
4. Write unit tests: 8 test cases (coverage target: 80%)

**Files Affected**:
- `src/integrations/jira/jql-validator.ts` (NEW)
- `tests/unit/integrations/jira/jql-validator.test.ts` (NEW)

---

### T-069: Handle Complex JQL Performance (Warnings)

**User Story**: US-008
**Satisfies ACs**: AC-US8-04
**Status**: [ ] pending
**Priority**: P2 (Should Have)
**Estimated Effort**: 3 hours

**Description**: Add warnings for complex JQL queries that may be slow or timeout.

**Test Plan** (Embedded):
- **Coverage Target**: 75%
- **Framework**: Vitest + Unit tests

**Given-When-Then Scenarios**:

#### TC-105: Expensive JQL Warning
**Given** JQL: `project in projectsWhereIssuesCreatedInLast1Year()`
**When** `validateJql(jql)` called
**Then** return `{ valid: true, warning: 'This JQL may be slow (scans 100,000+ issues)' }`
**And** suggest alternative: "Consider using --filter active instead"

**Implementation**:
1. Modify `src/integrations/jira/jql-validator.ts`
2. Add expensive JQL pattern detection (e.g., `projectsWhereIssues...`, `issuesIn...`)
3. Return warnings (not errors)
4. Suggest simpler alternatives
5. Write unit tests: 5 test cases (coverage target: 75%)

**Files Affected**:
- `src/integrations/jira/jql-validator.ts` (MODIFY)
- `tests/unit/integrations/jira/jql-performance.test.ts` (NEW)

---

### T-070: E2E Test: Full Filtering Workflow

**User Story**: US-008
**Satisfies ACs**: AC-US8-01, AC-US8-04, AC-US8-05, AC-US8-06
**Status**: [ ] pending
**Priority**: P1 (High)
**Estimated Effort**: 5 hours

**Description**: Create comprehensive E2E test for full filtering workflow.

**Test Plan** (Embedded):
- **Coverage Target**: 100% (E2E test)
- **Framework**: Playwright

**Given-When-Then Scenarios**:

#### TC-106: Full Filtering Flow (Init)
**Given** JIRA instance with 500 projects
**When** executing init with filters:
1. Choose to apply filters
2. Select "Active only" + "Agile type"
3. See preview: "45 projects (down from 500)"
4. Confirm
5. Import filtered projects
**Then** verify only 45 projects imported
**And** all are active and Agile

#### TC-107: Full Filtering Flow (Import Command)
**Given** existing projects: BACKEND, FRONTEND
**When** running `/specweave-jira:import-projects --filter active --jql "project in (MOBILE, INFRA)"`
**Then** apply filters
**And** show preview
**And** import filtered projects

**Implementation**:
1. Create `tests/e2e/filtering/full-workflow.test.ts`
2. Test init with filters
3. Test import command with filters
4. Test JQL filtering
5. Test saved presets

**Files Affected**:
- `tests/e2e/filtering/full-workflow.test.ts` (NEW)

---

### T-071: Performance Test: JQL Execution Time

**User Story**: US-008
**Satisfies ACs**: AC-US8-04
**Status**: [ ] pending
**Priority**: P2 (Should Have)
**Estimated Effort**: 3 hours

**Description**: Validate JQL execution time < 30 seconds for complex queries.

**Test Plan** (Embedded):
- **Coverage Target**: N/A (performance validation)
- **Framework**: Vitest + Performance metrics

**Given-When-Then Scenarios**:

#### TC-108: JQL Performance Validation
**Given** complex JQL: `project in (BACKEND, FRONTEND, MOBILE) AND status != Archived AND assignee in membersOf("developers")`
**When** executing JQL filter
**Then** execution time < 30 seconds
**And** no timeout errors

**Implementation**:
1. Create `tests/performance/jql-execution.test.ts`
2. Mock JIRA API with realistic latency
3. Measure JQL execution time
4. Assert < 30 seconds
5. Test timeout handling (60-second timeout)

**Files Affected**:
- `tests/performance/jql-execution.test.ts` (NEW)

---

### T-072: Document Smart Filtering in User Guide

**User Story**: US-008
**Satisfies ACs**: AC-US8-01, AC-US8-04, AC-US8-06
**Status**: [ ] pending
**Priority**: P2 (Should Have)
**Estimated Effort**: 2 hours

**Description**: Document smart filtering features in user guide with examples.

**Test Plan**: N/A (documentation task)

**Validation**:
- Manual review: Grammar, clarity, completeness
- Build check: Markdown renders correctly
- Example validation: All filter examples work

**Implementation**:
1. Update `.specweave/docs/public/guides/user-guide.md`
2. Add "Smart Filtering" section
3. Add examples for each filter type (active, type, lead, JQL)
4. Add saved preset examples
5. Add troubleshooting section

**Files Affected**:
- `.specweave/docs/public/guides/user-guide.md` (MODIFY)

---

## Summary

**Total Tasks**: 72
**Estimated Total Effort**: ~290 hours (approx 7-8 weeks for 1 developer)

**Coverage Targets**:
- Core modules (CacheManager, ProgressTracker, CancelationHandler, AreaPathMapper): 90-95%
- Integration modules (JIRA/ADO loaders, filter processors): 85-90%
- CLI helpers: 85%
- Commands: 80%
- Overall: 85%+

**Test Breakdown**:
- Unit tests: ~35 test files (140+ test cases)
- Integration tests: ~25 test files (100+ test cases)
- E2E tests: ~10 test files (30+ scenarios)
- Performance tests: ~5 test files (validation metrics)

**Phase Sequencing** (20 days):
- Phase 1 (Days 1-3): US-004 Core Infrastructure (T-001 to T-012)
- Phase 2 (Days 4-6): US-001 CLI-First Init Flow (T-023 to T-032)
- Phase 3 (Days 7-9): US-007 Progress Tracking (T-013 to T-022)
- Phase 4 (Days 10-12): US-002 CLI-First Defaults (T-033 to T-040)
- Phase 5 (Days 13-15): US-006 ADO Integration (T-051 to T-062)
- Phase 6 (Days 16-17): US-005 Cache Maintenance (T-041 to T-050)
- Phase 7 (Days 18-20): US-008 Performance Testing (T-063 to T-072)
