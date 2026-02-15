# Tasks: Fix investigation/debugging routing gap in detect-intent

## Phase 1: RED — Failing Tests

### T-001: Write failing tests for LLM investigation classification
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03 | **Status**: [x] completed
**Test**: Given buildDetectionPrompt() output → When checking for investigation keywords → Then "investigate", "debug", "troubleshoot" appear in NEVER-use-none list AND investigation example exists

### T-003: Write failing tests for keyword fallback (all categories)
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02 | **Status**: [x] completed
**Test**: Given keyword fallback regex → When testing investigation/analysis/optimization/security/devops/data prompts → Then all match; When testing pure questions → Then none match

## Phase 2: GREEN — Implementation

### T-002: Update LLM detection prompt
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03 | **Status**: [x] completed
**Test**: Given updated LLM prompt → When T-001 tests run → Then all pass

### T-004: Expand keyword regex + refine question exclusion + error-state detection
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04 | **Status**: [x] completed
**Test**: Given updated hook → When T-003 tests run → Then all pass

## Phase 3: REFACTOR — Verification

### T-005: Verify all tests pass, rebuild, manual verification
**User Story**: US-001, US-002 | **Satisfies ACs**: All | **Status**: [x] completed
**Test**: Given all changes → When npm test + npm run rebuild → Then zero failures; When manual detect-intent tests run → Then correct routing
