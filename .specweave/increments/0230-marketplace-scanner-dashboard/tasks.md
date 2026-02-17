---
increment: 0230-marketplace-scanner-dashboard
total_tasks: 17
completed_tasks: 0
by_user_story:
  US-001: { total: 4, completed: 0 }
  US-002: { total: 4, completed: 0 }
  US-003: { total: 5, completed: 0 }
  US-004: { total: 4, completed: 0 }
---

# Tasks: Marketplace Scanner Dashboard

## Phase 1: Core Types & Queue

### User Story: US-002 - Submission Queue

**Linked ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04, AC-US2-05
**Tasks**: 4 total, 0 completed

#### T-001: Add marketplace-scan JobType to background types

**User Story**: US-001 | **Satisfies ACs**: AC-US1-05
**Status**: [ ] pending

**Test Plan**:
- **Given** `src/core/background/types.ts`
- **When** JobType union is checked
- **Then** it includes `'marketplace-scan'` with `MarketplaceScanJobConfig` interface

**Implementation**:
1. Edit `src/core/background/types.ts` — add `'marketplace-scan'` to `JobType` union
2. Add `MarketplaceScanJobConfig` interface with searchTopics, searchFilenames, maxResultsPerScan, intervalMinutes, checkpoint
3. Add to `JobConfig` union type

---

#### T-002: Create submission queue types

**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02
**Status**: [ ] pending

**Test Plan**:
- **Given** `src/core/fabric/submission-queue-types.ts`
- **When** imported
- **Then** exports SubmissionStatus, SkillSubmission, SubmissionInsights, ScannerStatus, GitHubRepoInfo

**Implementation**:
1. Create `src/core/fabric/submission-queue-types.ts`
2. Define `SubmissionStatus` type: discovered | queued | scanning | tier1_passed | tier1_failed | tier2_pending | verified | rejected
3. Define `SkillSubmission` interface with id, repoFullName, repoUrl, skillPath, author, stars, status, tier1Result, tier2Result, timestamps
4. Define `SubmissionInsights`, `ScannerStatus`, `GitHubRepoInfo` interfaces

---

#### T-003: Write failing tests for SubmissionQueue (TDD RED)

**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-04, AC-US2-05
**Status**: [ ] pending

**Test Plan**:
- **Given** test file `tests/unit/core/fabric/submission-queue.test.ts`
- **When** tests run
- **Then** all tests FAIL (no implementation)

**Test Cases**:
1. **Unit**: `tests/unit/core/fabric/submission-queue.test.ts`
   - addSubmission_createsEntryWithDiscoveredStatus()
   - addSubmission_deduplicatesByRepoFullName()
   - updateStatus_transitionsCorrectly()
   - approve_setsVerifiedStatus()
   - reject_setsRejectedStatusWithReason()
   - getSubmissions_filtersByStatus()
   - getSubmissions_paginatesCorrectly()
   - load_recoversFromCorruptedJson()
   - save_createsBackupBeforeWrite()
   - getInsights_aggregatesCorrectly()
   - **Coverage Target**: 90%

---

#### T-004: Implement SubmissionQueue class (TDD GREEN)

**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04, AC-US2-05
**Status**: [ ] pending

**Test Plan**:
- **Given** SubmissionQueue class
- **When** addSubmission() called with GitHubRepoInfo
- **Then** creates entry with 'discovered' status, persists to JSON file, creates backup

**Implementation**:
1. Create `src/core/fabric/submission-queue.ts`
2. Implement file locking (reuse pattern from BackgroundJobManager)
3. Implement addSubmission() with dedup check by repoFullName
4. Implement status transitions with validation
5. Implement backup/recovery: write .bak before save, validate JSON on load
6. Implement getSubmissions() with filtering and pagination
7. Implement approve()/reject() with reason tracking
8. Implement getInsights() for analytics aggregation
9. Run tests — all should pass

---

## Phase 2: Scanner Worker

### User Story: US-001 - GitHub Scanner Worker

**Linked ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04, AC-US1-05
**Tasks**: 4 total, 0 completed

#### T-005: Add launchMarketplaceScanJob to job-launcher

**User Story**: US-001 | **Satisfies ACs**: AC-US1-05
**Status**: [ ] pending

**Test Plan**:
- **Given** `src/core/background/job-launcher.ts`
- **When** launchMarketplaceScanJob() called with config
- **Then** creates job via jobManager, writes config to job dir, spawns detached worker process

**Implementation**:
1. Edit `src/core/background/job-launcher.ts`
2. Add `MarketplaceScanLaunchOptions` interface
3. Add `launchMarketplaceScanJob()` following `launchCloneJob()` pattern
4. Worker path: `src/cli/workers/marketplace-scanner-worker.ts`

---

#### T-006: Implement marketplace scanner worker

**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04, AC-US1-05
**Status**: [ ] pending

**Test Plan**:
- **Given** worker running with searchTopics=['claude-code-skill']
- **When** GitHub Search API returns repos
- **Then** new repos added to SubmissionQueue with dedup check

**Implementation**:
1. Create `src/cli/workers/marketplace-scanner-worker.ts` with `#!/usr/bin/env node`
2. Parse argv for jobId, projectPath (clone-worker pattern)
3. Write PID file, setup SIGTERM handler
4. Implement scan loop: GitHub Search -> parse results -> dedup -> add to queue
5. Rate limiting: parse X-RateLimit-* headers, backoff when remaining < 5
6. Checkpoint: save lastCursor + seenRepos after each scan
7. Sleep intervalMinutes between scans
8. Use native fetch() for GitHub API calls

---

#### T-007: Write worker tests

**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04
**Status**: [ ] pending

**Test Plan**:
- **Given** mocked GitHub API and mocked SubmissionQueue
- **When** worker scan loop executes
- **Then** discovers repos, deduplicates, writes checkpoints, respects rate limits

**Test Cases**:
1. **Unit**: `tests/unit/cli/workers/marketplace-scanner-worker.test.ts`
   - scanGitHub_discoversReposFromSearchResults()
   - scanGitHub_deduplicatesAgainstExisting()
   - scanGitHub_appliesBackoffOnRateLimit()
   - scanGitHub_writesCheckpointAfterScan()
   - scanGitHub_resumesFromCheckpoint()
   - scanGitHub_handlesApiErrors()
   - **Coverage Target**: 85%

---

#### T-008: Add marketplace config schema

**User Story**: US-001 | **Satisfies ACs**: AC-US1-05
**Status**: [ ] pending

**Test Plan**:
- **Given** `.specweave/config.json` with marketplace.scanner section
- **When** scanner reads config
- **Then** uses configured intervalMinutes, searchTopics, searchFilenames

**Implementation**:
1. Scanner worker reads marketplace config on startup
2. Defaults: intervalMinutes=60, searchTopics=['claude-code-skill','specweave-plugin'], searchFilenames=['SKILL.md'], maxResultsPerScan=100

---

## Phase 3: Dashboard Server

### User Story: US-004 - Marketplace API Routes

**Linked ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04, AC-US4-05
**Tasks**: 4 total, 0 completed

#### T-009: Add SSE event types and file watcher target

**User Story**: US-003 | **Satisfies ACs**: AC-US3-05
**Status**: [ ] pending

**Test Plan**:
- **Given** `src/dashboard/types.ts` and `src/dashboard/server/file-watcher.ts`
- **When** SSEEventType union checked
- **Then** includes 'marketplace-scan', 'submission-update', 'verification-complete'

**Implementation**:
1. Edit `src/dashboard/types.ts` — add 3 event types to SSEEventType union
2. Edit `src/dashboard/server/file-watcher.ts` — add file target for `.specweave/state/skill-submissions.json`
3. Add event-to-category mapping entries

---

#### T-010: Implement MarketplaceAggregator

**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-04
**Status**: [ ] pending

**Test Plan**:
- **Given** MarketplaceAggregator with projectPath
- **When** getScannerStatus() called
- **Then** returns worker health from BackgroundJobManager state

**Test Cases**:
1. **Unit**: `tests/unit/dashboard/marketplace-aggregator.test.ts`
   - getScannerStatus_readsFromJobManager()
   - getQueue_delegatesToSubmissionQueue()
   - getVerifiedSkills_filtersCorrectly()
   - getInsights_aggregatesTimeline()
   - **Coverage Target**: 85%

**Implementation**:
1. Create `src/dashboard/server/data/marketplace-aggregator.ts`
2. Constructor takes projectPath, initializes SubmissionQueue
3. getScannerStatus(): read job state from BackgroundJobManager
4. getQueue(filter): delegate to SubmissionQueue.getSubmissions()
5. getVerifiedSkills(): filter for status=verified
6. getInsights(): aggregate discovery timeline, pass/fail rates, tier distribution

---

#### T-011: Register marketplace API routes

**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04, AC-US4-05
**Status**: [ ] pending

**Test Plan**:
- **Given** dashboard server running
- **When** GET /api/marketplace/queue?status=verified called
- **Then** returns paginated list of verified submissions

**Implementation**:
1. Edit `src/dashboard/server/dashboard-server.ts`
2. Import MarketplaceAggregator, initialize per project
3. Register 9 routes: scanner/status, scanner/start, scanner/stop, queue, queue/:id, queue/:id/approve, queue/:id/reject, verified, insights
4. Start/stop routes use launchMarketplaceScanJob() and killJob()

---

#### T-012: Write server route tests

**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03
**Status**: [ ] pending

**Test Plan**:
- **Given** mocked MarketplaceAggregator
- **When** API routes called
- **Then** returns correct response format

**Test Cases**:
1. **Unit**: `tests/unit/dashboard/marketplace-routes.test.ts`
   - GET_scannerStatus_returnsHealth()
   - GET_queue_returnsPaginated()
   - GET_queue_filtersByStatus()
   - POST_approve_updatesSubmission()
   - POST_reject_updatesWithReason()
   - POST_scannerStart_launchesJob()
   - **Coverage Target**: 80%

---

## Phase 4: Dashboard Client

### User Story: US-003 - Marketplace Dashboard Page

**Linked ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04, AC-US3-05
**Tasks**: 5 total, 0 completed

#### T-013: Add SSE event types to client SSEContext

**User Story**: US-003 | **Satisfies ACs**: AC-US3-05
**Status**: [ ] pending

**Test Plan**:
- **Given** `src/dashboard/client/src/contexts/SSEContext.tsx`
- **When** EVENT_TYPES array checked
- **Then** includes 'marketplace-scan', 'submission-update', 'verification-complete'

**Implementation**:
1. Edit SSEContext.tsx — add 3 event types to EVENT_TYPES array

---

#### T-014: Create MarketplacePage component

**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04, AC-US3-05
**Status**: [ ] pending

**Test Plan**:
- **Given** MarketplacePage rendered
- **When** no scanner running
- **Then** shows onboarding CTA with Start Scanner button
- **When** scanner active with queue data
- **Then** shows Scanner Status KPIs, filterable Queue table, Verified gallery, Insights charts

**Implementation**:
1. Create `src/dashboard/client/src/pages/MarketplacePage.tsx`
2. Scanner Status section: KpiCards for health, last scan, repos count, rate limit. Start/Stop via useCommand
3. Queue section: filterable table (status, tier, date), approve/reject buttons, pagination
4. Verified Skills section: card gallery with security scores, author, stars
5. Insights section: BarChart for timeline, StatusDonut for pass/fail, KpiCards for totals
6. Wire useSSEEvent('submission-update', refetch) for real-time
7. Onboarding CTA for empty state

---

#### T-015: Add route and navigation

**User Story**: US-003 | **Satisfies ACs**: AC-US3-06
**Status**: [ ] pending

**Test Plan**:
- **Given** App.tsx and Sidebar.tsx
- **When** navigating to /marketplace
- **Then** renders MarketplacePage with nav item highlighted

**Implementation**:
1. Edit `src/dashboard/client/src/App.tsx` — import MarketplacePage, add Route
2. Edit `src/dashboard/client/src/components/layout/Sidebar.tsx` — add Marketplace nav item

---

#### T-016: Build and test dashboard client

**User Story**: US-003 | **Satisfies ACs**: AC-US3-01 through AC-US3-05
**Status**: [ ] pending

**Test Plan**:
- **Given** all client changes
- **When** `npm run rebuild` executed
- **Then** builds without errors

---

#### T-017: End-to-end verification

**User Story**: US-001, US-002, US-003, US-004 | **Satisfies ACs**: all
**Status**: [ ] pending

**Test Plan**:
- **Given** full system
- **When** scanner started via dashboard
- **Then** queue populates, SSE events fire, dashboard shows real-time updates

**Implementation**:
1. `npm test` — all tests pass
2. `npm run rebuild` — clean build
3. Verify scanner creates job via BackgroundJobManager
4. Verify queue entries in skill-submissions.json
5. Verify /marketplace page renders all 4 sections
