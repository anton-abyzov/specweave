# Tasks: Dashboard Real-Time SSE Fix

## Phase 1: Server-Side Fixes

### T-001: Fix SSEManager destroyed connection cleanup
**User Story**: US-004 | **Satisfies ACs**: AC-US4-02 | **Status**: [x] completed
**Test**: Given destroyed connections in Set → When broadcast called → Then destroyed connections removed from Set

### T-002: Fix FileWatcher late-file detection
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01 | **Status**: [x] completed
**Test**: Given watched file missing at startup → When file created later → Then watcher detects changes to it

### T-003: Write server-side tests
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-02 | **Status**: [x] completed
**Test**: Unit tests for SSEManager and FileWatcher edge cases

## Phase 2: Shared SSE Infrastructure

### T-004: Create SSEContext and SSEProvider
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01 | **Status**: [x] completed
**Test**: Given SSEProvider wraps app → When multiple components subscribe → Then only one EventSource exists

### T-005: Create useSSEEvent and useSSEStatus hooks
**User Story**: US-002 | **Satisfies ACs**: AC-US2-03 | **Status**: [x] completed
**Test**: Given useSSEEvent('increment-update', cb) → When event fires → Then callback invoked with data

### T-006: Inject SSEProvider into App.tsx
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01 | **Status**: [x] completed
**Test**: Given App renders → When inspecting EventSource connections → Then exactly 1 connection exists

## Phase 3: Migrate Existing Consumers

### T-007: Migrate ErrorsPage to useSSEEvent
**User Story**: US-002 | **Satisfies ACs**: AC-US2-02 | **Status**: [x] completed
**Test**: Given ErrorsPage rendered → When error-detected SSE event → Then data refreshes

### T-008: Migrate OverviewPage to useSSEEvent
**User Story**: US-002 | **Satisfies ACs**: AC-US2-02 | **Status**: [x] completed
**Test**: Given OverviewPage rendered → When activity SSE event → Then live feed updates

### T-009: Migrate ActivityPage to useSSEEvent
**User Story**: US-002 | **Satisfies ACs**: AC-US2-02 | **Status**: [x] completed
**Test**: Given ActivityPage rendered → When activity SSE event → Then event stream updates

### T-010: Migrate Sidebar to useSSEEvent + useSSEStatus
**User Story**: US-002 | **Satisfies ACs**: AC-US2-02, AC-US2-03 | **Status**: [x] completed
**Test**: Given Sidebar rendered → When notification SSE event → Then badge count updates

## Phase 4: Wire Up Missing Pages

### T-011: Add SSE to IncrementsPage
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-03 | **Status**: [x] completed
**Test**: Given IncrementsPage rendered → When increment metadata changes → Then table updates within 1s

### T-012: Add SSE to IncrementDetailPage
**User Story**: US-001 | **Satisfies ACs**: AC-US1-02, AC-US1-03 | **Status**: [x] completed
**Test**: Given viewing increment detail → When that increment changes → Then detail refreshes

### T-013: Add SSE to AnalyticsPage
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01 | **Status**: [x] completed

### T-014: Add SSE to CostsPage
**User Story**: US-003 | **Satisfies ACs**: AC-US3-02 | **Status**: [x] completed

### T-015: Add SSE to SyncPage
**User Story**: US-003 | **Satisfies ACs**: AC-US3-03 | **Status**: [x] completed

### T-016: Add SSE to NotificationsPage
**User Story**: US-003 | **Satisfies ACs**: AC-US3-04 | **Status**: [x] completed

### T-017: Add SSE to ConfigPage
**User Story**: US-003 | **Satisfies ACs**: AC-US3-05 | **Status**: [x] completed

## Phase 5: Cleanup

### T-018: Remove old useSSE hook
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01 | **Status**: [x] completed
**Test**: Given all consumers migrated → When useSSE.ts removed → Then build passes

### T-019: Build and test verification
**User Story**: US-001, US-002, US-003, US-004 | **Status**: [x] completed
**Test**: npm run rebuild && npm test passes clean
