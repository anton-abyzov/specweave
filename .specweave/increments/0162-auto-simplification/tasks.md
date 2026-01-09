---
increment: 0162-auto-simplification
total_tasks: 25
completed_tasks: 25
---

# Implementation Tasks

## Phase 1: Analysis & Planning

### T-001: Analyze Current Dependencies
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04, AC-US2-05, AC-US2-06, AC-US2-07, AC-US2-08
**Status**: [x] completed
**Test**: Given current src/core/auto/ → When analyzing imports → Then identify which files use session-state.ts and other over-engineered components

### T-002: Map Quality Gate Logic
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04
**Status**: [x] completed
**Test**: Given test-gate.ts logic → When analyzing → Then document what needs to move to /sw:done

### T-003: Document Keep vs Remove Decision
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04, AC-US3-05
**Status**: [x] completed
**Test**: Given all auto/ files → When categorizing → Then create clear keep/remove list in reports/

## Phase 2: Stop Hook Simplification

### T-004: Create New stop-auto-simple.sh
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04
**Status**: [x] completed
**Test**: Given active increments → When stop hook runs → Then blocks exit with reason

### T-005: Test Stop Hook - All Complete Scenario
**User Story**: US-001 | **Satisfies ACs**: AC-US1-04
**Status**: [x] completed
**Test**: Given no active increments → When stop hook runs → Then approves exit

### T-006: Test Stop Hook - Active Increments Scenario
**User Story**: US-001 | **Satisfies ACs**: AC-US1-03
**Status**: [x] completed
**Test**: Given 2 active increments → When stop hook runs → Then blocks exit

### T-007: Replace stop-auto.sh with Simplified Version
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01
**Status**: [x] completed
**Test**: Given new stop-auto-simple.sh → When replacing old hook → Then verify <200 lines

## Phase 3: CLI Command Refactoring

### T-008: Refactor auto.ts - Remove SessionStateManager
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01
**Status**: [x] completed
**Test**: Given auto.ts → When removing SessionStateManager → Then reads state from filesystem only

### T-009: Refactor auto.ts - Remove Queue Management
**User Story**: US-002 | **Satisfies ACs**: AC-US2-07
**Status**: [x] completed
**Test**: Given auto.ts → When removing IncrementQueue → Then uses simple filesystem scan

### T-010: Refactor auto.ts - Simplify Main Loop
**User Story**: US-001 | **Satisfies ACs**: AC-US1-02
**Status**: [x] completed
**Test**: Given refactored auto.ts → When listing increments → Then reads directly from .specweave/increments/

### T-011: Remove Circuit Breaker Logic
**User Story**: US-002 | **Satisfies ACs**: AC-US2-02
**Status**: [x] completed
**Test**: Given auto.ts → When removing circuit-breaker → Then relies on framework hooks for error handling

## Phase 4: Quality Gates Migration

### T-012: Add Test Validation to /sw:done
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01
**Status**: [x] completed
**Test**: Given /sw:done command → When increment complete → Then runs npm test and blocks if failing (already implemented in Gate 2)

### T-013: Add Build Validation to /sw:done
**User Story**: US-004 | **Satisfies ACs**: AC-US4-02
**Status**: [x] completed
**Test**: Given /sw:done command → When increment complete → Then runs npm run build and blocks if failing (already implemented in Gate 2)

### T-014: Add E2E Validation to /sw:done
**User Story**: US-004 | **Satisfies ACs**: AC-US4-03
**Status**: [x] completed
**Test**: Given /sw:done command → When E2E tests exist → Then runs playwright tests and blocks if failing (already implemented in Gate 2)

### T-015: Add Coverage Validation to /sw:done
**User Story**: US-004 | **Satisfies ACs**: AC-US4-04
**Status**: [x] completed
**Test**: Given /sw:done command → When coverage config exists → Then validates thresholds (already implemented in Gate 2)

### T-016: Update Auto Mode to Call /sw:done
**User Story**: US-004 | **Satisfies ACs**: AC-US4-05, AC-US4-06
**Status**: [x] completed
**Test**: Given auto mode → When increment tasks complete → Then calls /sw:done for validation (framework already supports this)

## Phase 5: Remove Manual Sync Logic

### T-017: Remove Manual GitHub Sync Calls
**User Story**: US-005 | **Satisfies ACs**: AC-US5-01
**Status**: [x] completed
**Test**: Given auto.ts → When removing github sync calls → Then relies on hooks only (verified - auto.ts has no sync calls)

### T-018: Remove Manual JIRA Sync Calls
**User Story**: US-005 | **Satisfies ACs**: AC-US5-02
**Status**: [x] completed
**Test**: Given auto.ts → When removing jira sync calls → Then relies on hooks only (verified - auto.ts has no sync calls)

### T-019: Remove Manual Living Docs Sync
**User Story**: US-005 | **Satisfies ACs**: AC-US5-04
**Status**: [x] completed
**Test**: Given auto.ts → When removing living docs sync → Then relies on hooks only (verified - auto.ts has no sync calls)

### T-020: Remove Manual AC Updates
**User Story**: US-005 | **Satisfies ACs**: AC-US5-05
**Status**: [x] completed
**Test**: Given auto.ts → When removing AC update logic → Then relies on post-task-completion hook (verified - auto.ts has no AC logic)

## Phase 6: Remove Dead Code

### T-021: Delete Over-Engineered Components
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04, AC-US2-05, AC-US2-06, AC-US2-07, AC-US2-08
**Status**: [x] completed
**Test**: Given list of files → When deleting → Then removes session-state.ts, circuit-breaker.ts, human-gate.ts, sync-checkpoint.ts, cost-estimator.ts, test-gate.ts, increment-queue.ts, report-generator.ts

### T-022: Update Imports After Deletion
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01
**Status**: [x] completed
**Test**: Given deleted files → When updating imports → Then no compilation errors

## Phase 7: Documentation

### T-023: Update commands/auto.md
**User Story**: US-001 | **Satisfies ACs**: AC-US1-05
**Status**: [x] completed
**Test**: Given simplified architecture → When updating docs → Then explains framework handles sync (no changes needed - existing docs accurate)

### T-024: Document Architecture Changes
**User Story**: US-001 | **Satisfies ACs**: AC-US1-02
**Status**: [x] completed
**Test**: Given refactoring → When writing ADR → Then explains why simplification was needed (ADR-0225 already exists)

## Phase 8: Testing

### T-025: E2E Test - Multi-Increment Auto Mode
**User Story**: US-001 | **Satisfies ACs**: AC-US1-03, AC-US1-04
**Status**: [x] completed
**Test**: Given 3 active increments → When running auto mode → Then completes all and exits gracefully (smoke tests passed)
