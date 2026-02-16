# Tasks: 0206-universal-external-sync-fix

## Phase 1: Fix ProjectService Silent Drop

### T-001: [RED] Write failing tests for ProjectService fallback chain
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02 | **Status**: [x] completed
**Test**: Given spec.md has no project field → When emitIncrementEvent fires → Then requestSync is called (not silently dropped)

### T-002: [GREEN] Fix getProjectForIncrement() with fallback chain
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02 | **Status**: [x] completed
**Depends On**: T-001

### T-003: [GREEN] Add increment.sync case to emitIncrementEvent()
**User Story**: US-001, US-004 | **Satisfies ACs**: AC-US1-03, AC-US4-02 | **Status**: [x] completed
**Depends On**: T-002

## Phase 2: Universal Auto-Create

### T-004: [RED] Write failing tests for universal auto-create
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03 | **Status**: [x] completed

### T-005: [GREEN] Create universal-auto-create.ts module
**User Story**: US-002 | **Satisfies ACs**: AC-US2-03, AC-US2-04 | **Status**: [x] completed
**Depends On**: T-004

### T-006: [GREEN] Create universal-auto-create-dispatcher.sh
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02 | **Status**: [x] completed
**Depends On**: T-005

### T-007: [GREEN] Wire universal dispatcher into post-tool-use.sh
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01 | **Status**: [x] completed
**Depends On**: T-006

## Phase 3: Explicit Closure on Done

### T-008: [RED] Write failing tests for closeIncrementIssues()
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01 | **Status**: [x] completed

### T-009: [GREEN] Add closeIncrementIssues() to ac-progress-sync.ts
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-03 | **Status**: [x] completed
**Depends On**: T-008

### T-010: [GREEN] Wire explicit closure into post-tool-use.sh
**User Story**: US-003 | **Satisfies ACs**: AC-US3-02 | **Status**: [x] completed
**Depends On**: T-009

## Phase 4: Fix Queued Events

### T-011: Fix stop-sync.sh to preserve event type from pending.jsonl
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01 | **Status**: [x] completed

## Phase 5: Integration Tests

### T-012: Rewrite universal-external-sync.test.ts for new architecture
**User Story**: US-005 | **Satisfies ACs**: AC-US5-04 | **Status**: [x] completed

### T-013: [REFACTOR] Run all tests and verify coverage
**User Story**: US-005 | **Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03, AC-US5-04 | **Status**: [x] completed
