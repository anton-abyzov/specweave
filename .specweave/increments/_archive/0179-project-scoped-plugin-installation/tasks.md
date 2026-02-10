# Tasks: Project-Scoped Plugin Installation

## Phase 1: Configuration Schema

### T-001: [RED] Write failing tests for plugin scope config types
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Status**: [x] completed
**Test**: Given config with plugins.lspScope="project" → When parsed → Then scope value is "project"

### T-002: [GREEN] Add plugin scope config types and parsing
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Depends On**: T-001
**Status**: [x] completed

### T-003: [REFACTOR] Clean up config parsing code
**User Story**: US-001
**Depends On**: T-002
**Status**: [x] completed

## Phase 2: Hook Implementation

### T-004: [RED] Write failing tests for scope flag application in hook
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-03
**Status**: [x] completed
**Test**: Given LSP plugin install → When hook runs → Then `--scope project` flag is included

### T-005: [GREEN] Update user-prompt-submit.sh to apply scope flags
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US1-04
**Depends On**: T-004
**Status**: [x] completed

### T-006: [REFACTOR] Extract scope helper functions
**User Story**: US-002
**Depends On**: T-005
**Status**: [x] completed

## Phase 3: Documentation

### T-007: Update CLAUDE.md with plugin scopes section
**User Story**: US-003
**Satisfies ACs**: AC-US3-01
**Status**: [x] completed

### T-008: Document config schema for plugin scopes
**User Story**: US-003
**Satisfies ACs**: AC-US3-03
**Status**: [x] completed

## Phase 4: Integration & E2E Tests

### T-009: [RED] Write integration test for scope config reading
**User Story**: US-001, US-002
**Status**: [x] completed
**Test**: Given config.json with plugins.lspScope → When hook parses → Then correct scope used

### T-010: [GREEN] Ensure integration tests pass
**User Story**: US-001, US-002
**Depends On**: T-009
**Status**: [x] completed

### T-011: Run full test suite and fix any failures
**User Story**: US-001, US-002, US-003
**Status**: [x] completed

### T-012: Update existing tests affected by scope changes
**User Story**: US-001, US-002
**Status**: [x] completed

---

## Progress Summary
- Total Tasks: 12
- Completed: 12
- In Progress: 0
- Pending: 0
