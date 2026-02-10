# Tasks - 0196 Auto Mode v5 Stop Hook Simplification

## Phase 1: RED - Write Failing Tests

### T-001: [RED] Write integration tests for simplified stop hook
**User Story**: US-001, US-002, US-004 | **Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04, AC-US1-05, AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04, AC-US4-01, AC-US4-02, AC-US4-03 | **Status**: [x] completed
**Test**: Given a temp directory with .specweave structure → When hook is invoked via execSync → Then JSON decision matches expected (approve/block) for each scenario
**File**: `tests/integration/hooks/stop-auto-v5.test.ts` (29 tests)

### T-002: [RED] Write unit tests for hook helper behavior
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02 | **Status**: [x] completed
**Test**: Given various tasks.md/spec.md content → When hook counts pending tasks/ACs → Then counts are correct
**File**: `tests/unit/hooks/stop-auto-v5-helpers.test.ts` (17 tests)

## Phase 2: GREEN - Implement Simplified Hook

### T-003: [GREEN] Implement simplified stop-auto-v5.sh (~175 lines)
**User Story**: US-001, US-002 | **Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04, AC-US1-05, AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04 | **Status**: [x] completed
**Depends On**: T-001, T-002
**Test**: Given the integration tests from T-001 → When run against new hook → Then all 46 tests pass
**File**: `plugins/specweave/hooks/stop-auto-v5.sh` (166 lines)

### T-004: [GREEN] Wire up new hook in hooks.json
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [x] completed
**Depends On**: T-003
**Test**: Given hooks.json references stop-auto-v5.sh → When Claude Code loads hooks → Then new hook is active
**Files**: `plugins/specweave/hooks/hooks.json` (timeout 120s → 15s), legacy hook archived

## Phase 3: GREEN - Documentation

### T-005: [GREEN] Rewrite SKILL.md completion conditions section
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03 | **Status**: [x] completed
**Depends On**: T-003
**Test**: Given SKILL.md → When read → Then no claims about auto-heal, no absurd defaults, accurate hook description
**File**: `plugins/specweave/skills/auto/SKILL.md`

### T-006: [GREEN] Update auto-status and cancel-auto skills
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01 | **Status**: [x] completed
**Depends On**: T-003
**Note**: No changes needed - neither skill references removed features

## Phase 4: REFACTOR - Cleanup

### T-007: [REFACTOR] Remove skipped tests and archive legacy hook
**User Story**: US-004 | **Satisfies ACs**: AC-US4-02 | **Status**: [x] completed
**Depends On**: T-003, T-004
**Files**: Legacy hook → `_archive/stop-auto-v4-legacy.sh`

### T-008: [REFACTOR] Update ADR-0225 with implementation status
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01 | **Status**: [x] completed
**Depends On**: T-003
**File**: `.specweave/docs/internal/architecture/adr/0225-auto-mode-simplification.md` (status: Accepted)

## Phase 5: Verification

### T-009: Run all tests and manual verification
**User Story**: US-001, US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-03 | **Status**: [x] completed
**Depends On**: T-001 through T-008
**Test**: All 56 tests pass (46 new + 2 existing + 8 stop-auto-logging). Manual block→approve flow verified.
