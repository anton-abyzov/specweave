# Tasks - 0201-test-infrastructure-overhaul

## Phase 1: Test Infrastructure

### T-001: [RED] Write tests for vitest config tiers
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03 | **Status**: [x] completed
**Test**: Given vitest configs → When imported → Then unit config excludes e2e, e2e config has longer timeout

### T-002: [GREEN] Create vitest.unit.config.ts and vitest.e2e.config.ts
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03 | **Status**: [x] completed
**Depends On**: T-001

### T-003: [RED] Write tests for temp-home isolation helper
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-02 | **Status**: [x] completed
**Test**: Given withIsolatedHome() → When test runs → Then HOME is temp dir → After test → HOME is restored

### T-004: [GREEN] Implement temp-home.ts helper
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-02 | **Status**: [x] completed
**Depends On**: T-003

### T-005: [RED] Write tests for output normalization helpers
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-02 | **Status**: [x] completed
**Test**: Given ANSI-colored string → When normalized → Then plain text returned

### T-006: [GREEN] Implement normalize-output.ts and extract-json.ts
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-02 | **Status**: [x] completed
**Depends On**: T-005

## Phase 2: CLI E2E Tests

### T-007: [RED] Write new CLI e2e tests with proper isolation
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02 | **Status**: [x] completed
**Depends On**: T-004, T-006

### T-008: [GREEN] Un-skip and fix cli-commands.test.ts
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02 | **Status**: [x] completed
**Depends On**: T-007

## Phase 3: Coverage & Scripts

### T-009: Update package.json test scripts for tiered execution
**Satisfies ACs**: AC-US1-03 | **Status**: [x] completed
**Depends On**: T-002

### T-010: Raise coverage thresholds from 25% to 40%
**Satisfies ACs**: AC-US6-02 | **Status**: [x] completed

## Phase 4: Documentation

### T-011: Update TDD skills with CLI integration testing patterns
**Satisfies ACs**: AC-US5-01, AC-US5-02 | **Status**: [x] completed

### T-012: Create public CLI integration testing guide
**Satisfies ACs**: AC-US6-01 | **Status**: [x] completed

### T-013: [REFACTOR] Clean up and verify all tests pass
**Status**: [x] completed
**Depends On**: T-001 through T-012
