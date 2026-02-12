# Tasks - 0202-cli-coverage-to-50

## Phase 1: Cleanup Obsolete Tests

### T-001: Delete obsolete skipped test files
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01 | **Status**: [ ] pending
**Action**: Delete keyword-detector.test.ts (57 skipped, feature replaced by LLM), multi-project/switching.test.ts (feature removed v0.33.0), living-docs-sync-bidirectional.test.ts (API removed)

## Phase 2: CLI Command Unit Tests (Biggest Coverage Impact)

### T-002: [RED] Write unit tests for status command
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [ ] pending
**Test**: Given initialized project → When handleStatusCommand() called → Then outputs increment status info

### T-003: [GREEN] Make status command tests pass
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [ ] pending
**Depends On**: T-002

### T-004: [RED] Write unit tests for save command
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [ ] pending
**Test**: Given specweave project → When handleSaveCommand() called → Then commits and optionally pushes

### T-005: [GREEN] Make save command tests pass
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [ ] pending
**Depends On**: T-004

### T-006: [RED] Write unit tests for doctor command
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [ ] pending
**Test**: Given project → When handleDoctorCommand() called → Then returns health checks as JSON or text

### T-007: [GREEN] Make doctor command tests pass
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [ ] pending
**Depends On**: T-006

### T-008: [RED] Write unit tests for analytics, context, list commands
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [ ] pending
**Test**: Given project → When each command handler called → Then correct output produced

### T-009: [GREEN] Make analytics/context/list tests pass
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [ ] pending
**Depends On**: T-008

### T-010: [RED] Write unit tests for auto, auto-status, cancel-auto commands
**User Story**: US-001 | **Satisfies ACs**: AC-US1-02 | **Status**: [ ] pending
**Test**: Given auto mode state → When command handler called → Then session marker managed correctly

### T-011: [GREEN] Make auto command tests pass
**User Story**: US-001 | **Satisfies ACs**: AC-US1-02 | **Status**: [ ] pending
**Depends On**: T-010

### T-012: [RED] Write unit tests for validate-jira, export-skills, decision-log
**User Story**: US-001 | **Satisfies ACs**: AC-US1-03 | **Status**: [ ] pending
**Test**: Given config with sync settings → When each handler called → Then validates/exports/logs correctly

### T-013: [GREEN] Make validate-jira/export-skills/decision-log tests pass
**User Story**: US-001 | **Satisfies ACs**: AC-US1-03 | **Status**: [ ] pending
**Depends On**: T-012

## Phase 3: E2E Smoke Tests

### T-014: [RED] Write e2e tests for status, list, context, doctor --json
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02 | **Status**: [ ] pending
**Test**: Given initialized project (isolated HOME) → When CLI spawned → Then correct output and exit code

### T-015: [GREEN] Make e2e smoke tests pass
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02 | **Status**: [ ] pending
**Depends On**: T-014

## Phase 4: Coverage Gates

### T-016: Raise coverage gates in vitest.config.ts to new actuals
**Satisfies ACs**: AC-US1-04, AC-US1-05, AC-US1-06, AC-US1-07, AC-US3-02 | **Status**: [ ] pending
**Depends On**: T-003, T-005, T-007, T-009, T-011, T-013, T-015

### T-017: [REFACTOR] Verify all tests pass, clean up test code
**Status**: [ ] pending
**Depends On**: T-001 through T-016
