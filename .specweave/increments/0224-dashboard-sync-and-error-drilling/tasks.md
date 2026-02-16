# Tasks: Fix Dashboard Sync Health & Error Drilling

## Phase 1: Sync Fixes

### T-001: Fix ImportCoordinator metadata write on 0 items
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [x] completed
**Test**: Given import completes with 0 items → When enableSyncMetadata is true → Then metadata written with lastSyncResult: 'success' and lastImportCount: 0

### T-002: Rework enrichSyncPlatforms() status logic
**User Story**: US-001 | **Satisfies ACs**: AC-US1-02 | **Status**: [x] completed
**Test**: Given platform configured + lastSyncResult: 'success' with 0 items → When status enriched → Then connectionStatus: 'connected'

### T-003: Add POST /api/sync/verify endpoint
**User Story**: US-001 | **Satisfies ACs**: AC-US1-03 | **Status**: [x] completed
**Test**: Given GitHub configured → When POST /api/sync/verify?platform=github → Then validates token and updates sync-metadata.json

### T-004: Fix Retry Sync button to call verify endpoint
**User Story**: US-001 | **Satisfies ACs**: AC-US1-03 | **Status**: [x] completed
**Test**: Given sync_failed platform → When Retry clicked → Then calls /api/sync/verify for that platform

### T-005: Show richer sync status with diagnostics
**User Story**: US-001 | **Satisfies ACs**: AC-US1-04 | **Status**: [x] completed
**Test**: Given platform with error → When rendered → Then shows diagnostic message in card

## Phase 2: Error Fixes

### T-007: Rebuild server and verify errors page
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01 | **Status**: [x] completed
**Test**: Given rebuilt server → When ErrorsPage loads → Then totalErrors > 0

### T-009: Add getErrorTimeline() to ClaudeLogParser
**User Story**: US-002 | **Satisfies ACs**: AC-US2-02 | **Status**: [x] completed
**Test**: Given errors in logs → When getErrorTimeline(5) called → Then returns bucketed data with counts per 5min

### T-010: Add /api/errors/timeline endpoint + types
**User Story**: US-002 | **Satisfies ACs**: AC-US2-02 | **Status**: [x] completed
**Test**: Given errors exist → When GET /api/errors/timeline?bucket=5 → Then returns ErrorTimelineBucket[]

### T-011: Enhance ErrorsPage Timeline tab with density chart
**User Story**: US-002 | **Satisfies ACs**: AC-US2-02, AC-US2-03 | **Status**: [x] completed
**Test**: Given bucketed data → When Timeline tab rendered → Then CSS bar chart visible with clickable buckets

### T-012: Add diagnostic logging to ClaudeLogParser
**User Story**: US-002 | **Satisfies ACs**: AC-US2-04 | **Status**: [x] completed
**Test**: Given parser initialized → When scanning sessions → Then logs dir path, file count, error count

## Phase 3: Verification

### T-013: Build, test, verify end-to-end
**Status**: [x] completed
**Test**: Given all changes → When npm run rebuild && npm test → Then build succeeds and tests pass (18,047 passed, 2 pre-existing LSP e2e failures)
