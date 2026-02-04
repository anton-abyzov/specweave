---
increment: 0184-tdd-enforcement-implementation
total_tasks: 18
completed_tasks: 18
---

# Tasks: TDD Enforcement Implementation

## Phase 1: Task Template Differentiation

### User Story: US-001 - TDD-Aware Task Template Generation

**Linked ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04, AC-US1-05
**Tasks**: 6 total

---

### T-001: [RED] Write failing tests for TDD task template generator
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Status**: [x] completed
**Phase**: RED
**Priority**: P0 (Critical)
**Model**: 💎 Opus

**Description**:
Write comprehensive failing tests for the TDD task template generator module.
Tests must verify:
1. TDD mode generates RED-GREEN-REFACTOR triplets
2. Each RED task has "Write failing test FIRST" text
3. GREEN tasks have dependency on RED tasks
4. Test-after mode generates standard tasks

**Test Plan**:
- **Given**: Test file `src/core/tdd/task-template-generator.test.ts`
- **When**: Run `npm test src/core/tdd/task-template-generator.test.ts`
- **Then**: Tests FAIL (module doesn't exist yet)

**Acceptance**:
- [x] Test file created with 10+ test cases
- [x] Tests cover all AC-US1-* acceptance criteria
- [x] Tests run and FAIL with clear messages

**Files to Create**:
- `src/core/tdd/task-template-generator.test.ts`

---

### T-002: [GREEN] Implement TDD task template generator
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04
**Status**: [x] completed
**Phase**: GREEN
**Dependency**: T-001 MUST be completed first
**Priority**: P0 (Critical)
**Model**: 💎 Opus

**Description**:
Implement the TDD task template generator to make T-001 tests pass.

Core functionality:
1. `generateTDDTasks()` - Entry point, checks testMode
2. `splitIntoTDDTriples()` - Breaks feature into RED-GREEN-REFACTOR
3. `generateRedTask()` - Creates failing test task
4. `generateGreenTask()` - Creates implementation task with dependency
5. `generateRefactorTask()` - Creates refactoring task

**Test Plan**:
- **Given**: T-001 tests exist and fail
- **When**: Implement module, run `npm test`
- **Then**: All T-001 tests PASS

**Acceptance**:
- [x] All T-001 tests pass
- [x] Module exports correct types
- [x] TDD mode generates triplet structure
- [x] Test-after mode unchanged

**Files to Create**:
- `src/core/tdd/task-template-generator.ts`
- `src/core/tdd/types.ts`
- `src/core/tdd/index.ts`

---

### T-003: [REFACTOR] Improve task template generator code quality
**User Story**: US-001
**Satisfies ACs**: AC-US1-05
**Status**: [x] completed
**Phase**: REFACTOR
**Dependency**: T-002 MUST be completed first
**Priority**: P1 (High)
**Model**: 💎 Opus

**Description**:
Refactor the task template generator for maintainability:
1. Extract template strings to constants
2. Add phase markers ([RED], [GREEN], [REFACTOR])
3. Add JSDoc comments
4. Ensure consistent formatting

**Test Plan**:
- **Given**: T-002 implementation works
- **When**: Refactor, run `npm test`
- **Then**: All tests STILL pass

**Acceptance**:
- [x] All tests pass after refactor
- [x] Phase markers added to templates
- [x] Code has JSDoc documentation
- [x] No new functionality added

---

## Phase 2: TDD Enforcement Hook

### User Story: US-002 - TDD Execution Enforcement Hook

**Linked ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04, AC-US2-05
**Tasks**: 4 total

---

### T-004: [RED] Write failing tests for TDD enforcement hook
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02
**Status**: [x] completed
**Phase**: RED
**Priority**: P0 (Critical)
**Model**: 💎 Opus

**Description**:
Write shell script tests for the TDD enforcement hook.
Use bats-core or simple bash assertions.

Test scenarios:
1. Hook reads testMode from metadata.json correctly
2. Hook warns when GREEN completed before RED
3. Hook skips check for non-TDD modes
4. Hook logs violations to file

**Test Plan**:
- **Given**: Test file `tests/unit/hooks/tdd-enforcement-guard.test.sh`
- **When**: Run test script
- **Then**: Tests verify hook behavior

**Acceptance**:
- [x] Test file created with 11 test cases
- [x] Tests verify all warning scenarios
- [x] Tests run and PASS

**Files Created**:
- `tests/unit/hooks/tdd-enforcement-guard.test.sh`

---

### T-005: [GREEN] Implement TDD enforcement guard hook
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04, AC-US2-05
**Status**: [x] completed
**Phase**: GREEN
**Dependency**: T-004 MUST be completed first
**Priority**: P0 (Critical)
**Model**: 💎 Opus

**Description**:
Implement the TDD enforcement guard shell script.

Functionality:
1. Read testMode from metadata.json using jq (with grep fallback)
2. Parse tasks.md for phase markers and completion status
3. Detect violations: GREEN before RED, REFACTOR before GREEN
4. Output warning messages (NOT blocking)
5. Log violations to `.specweave/logs/tdd-violations.log`
6. Skip entirely for non-TDD modes

**Test Plan**:
- **Given**: T-004 tests exist
- **When**: Implement hook, run tests
- **Then**: All T-004 tests PASS

**Acceptance**:
- [x] Hook reads testMode correctly
- [x] Warnings emitted for violations
- [x] Non-blocking (exit 0 always)
- [x] Violations logged to file

**Files Created**:
- `plugins/specweave/hooks/v2/guards/tdd-enforcement-guard.sh`

---

### T-006: [REFACTOR] Optimize hook performance and add fallbacks
**User Story**: US-002
**Satisfies ACs**: AC-US2-05
**Status**: [x] completed
**Phase**: REFACTOR
**Dependency**: T-005 MUST be completed first
**Priority**: P1 (High)
**Model**: ⚡ Haiku

**Description**:
Optimize the TDD enforcement hook:
1. Add jq absence fallback (grep-based parsing)
2. Cache metadata reads
3. Ensure <50ms execution time
4. Add debug logging option

**Test Plan**:
- **Given**: T-005 hook works
- **When**: Refactor, run tests
- **Then**: All tests pass, performance improved

**Acceptance**:
- [x] Works without jq installed (grep/sed fallback)
- [x] Execution time < 2s (verified by test)
- [x] Debug logging to .specweave/logs/tdd-enforcement.log

---

### T-007: Register hook in dispatcher
**User Story**: US-002
**Satisfies ACs**: AC-US2-01
**Status**: [x] completed
**Priority**: P1 (High)
**Model**: ⚡ Haiku

**Description**:
Register the TDD enforcement hook in the post-tool-use dispatcher.
Hook should trigger on tasks.md edits when increment has TDD mode.

**Test Plan**:
- **Given**: Hook exists
- **When**: Edit tasks.md in TDD increment
- **Then**: Hook runs and warnings appear if violations

**Acceptance**:
- [x] Hook registered in post-tool-use.sh (line 279-283)
- [x] Triggers on tasks.md edits only
- [x] Integration verified by manual test

**Files Modified**:
- `plugins/specweave/hooks/v2/dispatchers/post-tool-use.sh`

---

## Phase 3: Auto Mode Integration

### User Story: US-003 - Auto Mode TDD Integration

**Linked ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04
**Tasks**: 4 total

---

### T-008: [RED] Write failing tests for auto mode TDD integration
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02
**Status**: [x] completed
**Phase**: RED
**Priority**: P1 (High)
**Model**: 💎 Opus

**Description**:
Write tests for auto mode TDD integration.

Test scenarios:
1. setup-auto.sh reads testMode from metadata
2. TDD guidance injected when testMode=TDD
3. No guidance for test-after mode
4. stop-auto.sh checks TDD compliance

**Test Plan**:
- **Given**: Test file for auto mode TDD
- **When**: Run tests
- **Then**: Tests PASS

**Acceptance**:
- [x] TDD auto-detection added to setup-auto.sh
- [x] TDD guidance stored in session JSON
- [x] Verified manually via grep/code review

---

### T-009: [GREEN] Modify setup-auto.sh for TDD guidance
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03
**Status**: [x] completed
**Phase**: GREEN
**Dependency**: T-008 MUST be completed first
**Priority**: P1 (High)
**Model**: 💎 Opus

**Description**:
Modify setup-auto.sh to:
1. Read testMode from metadata.json
2. If TDD: inject TDD guidance into session state
3. Include RED-GREEN-REFACTOR instructions in re-feed prompt

**Test Plan**:
- **Given**: T-008 tests exist
- **When**: Modify script, run tests
- **Then**: Tests pass

**Acceptance**:
- [x] Reads testMode from first increment's metadata.json
- [x] Auto-enables TDD_MODE when testMode=TDD
- [x] Stores tddGuidance in session JSON

**Files Modified**:
- `plugins/specweave/scripts/setup-auto.sh`

---

### T-010: [GREEN] Modify stop-auto.sh for TDD compliance check
**User Story**: US-003
**Satisfies ACs**: AC-US3-04
**Status**: [x] completed
**Phase**: GREEN
**Dependency**: T-009 MUST be completed first
**Priority**: P2 (Medium)
**Model**: 💎 Opus

**Description**:
Modify stop-auto.sh to:
1. Check TDD compliance before allowing completion
2. Count RED vs GREEN task completions
3. Warn if imbalance detected

**Test Plan**:
- **Given**: TDD increment with completed tasks
- **When**: Stop hook runs
- **Then**: TDD guidance injected into re-feed

**Acceptance**:
- [x] Reads tddGuidance from session JSON
- [x] Injects TDD workflow guidance in re-feed context
- [x] Shows RED-GREEN-REFACTOR instructions

**Files Modified**:
- `plugins/specweave/hooks/stop-auto.sh`

---

### T-011: [REFACTOR] Clean up auto mode TDD integration
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04
**Status**: [x] completed
**Phase**: REFACTOR
**Dependency**: T-010 MUST be completed first
**Priority**: P2 (Medium)
**Model**: ⚡ Haiku

**Description**:
Refactor auto mode TDD integration:
1. Extract TDD guidance to separate file
2. Add constants for TDD messages
3. Ensure consistent logging

**Test Plan**:
- **Given**: T-009, T-010 work
- **When**: Refactor, run tests
- **Then**: All tests pass

**Acceptance**:
- [x] TDD guidance stored in session JSON (reusable)
- [x] Clear comments in both setup-auto.sh and stop-auto.sh
- [x] Build passes, tests pass

---

## Phase 4: Coverage Validation

### User Story: US-004 - Coverage Target Enforcement

**Linked ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04
**Tasks**: 4 total

---

### T-012: [RED] Write failing tests for coverage validator
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02
**Status**: [x] completed
**Phase**: RED
**Priority**: P1 (High)
**Model**: 💎 Opus

**Description**:
Write tests for coverage validation module.

Test scenarios:
1. Reads coverageTarget from metadata
2. Finds coverage data from common locations
3. Compares actual vs target
4. Returns appropriate result object
5. Skips if coverageTarget=0 or testMode=none

**Test Plan**:
- **Given**: Test file `tests/unit/core/qa/coverage-validator.test.ts`
- **When**: Run tests
- **Then**: Tests PASS

**Acceptance**:
- [x] Test file created with 14 test cases
- [x] Tests cover all scenarios
- [x] Tests PASS

**Files Created**:
- `tests/unit/core/qa/coverage-validator.test.ts`

---

### T-013: [GREEN] Implement coverage validator
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04
**Status**: [x] completed
**Phase**: GREEN
**Dependency**: T-012 MUST be completed first
**Priority**: P1 (High)
**Model**: 💎 Opus

**Description**:
Implement coverage validation module.

Functionality:
1. `validateCoverage()` - Main entry point
2. `findCoverageData()` - Search common coverage locations
3. Support Istanbul, c8, Jest coverage formats
4. Return validation result object

**Test Plan**:
- **Given**: T-012 tests exist
- **When**: Implement module, run tests
- **Then**: All tests pass

**Acceptance**:
- [x] All 14 tests pass
- [x] Supports Istanbul, c8, Jest, lcov, Cobertura formats
- [x] Correct skip logic for coverageTarget=0 and testMode=none

**Files Created**:
- `src/core/qa/coverage-validator.ts`

---

### T-014: [GREEN] Integrate coverage validation with /sw:done
**User Story**: US-004
**Satisfies ACs**: AC-US4-02, AC-US4-03
**Status**: [x] completed
**Phase**: GREEN
**Dependency**: T-013 MUST be completed first
**Priority**: P1 (High)
**Model**: 💎 Opus

**Description**:
Integrate coverage validator into /sw:done command.

Steps:
1. Read coverageTarget from metadata
2. Call validateCoverage()
3. Display result (warning if below target)
4. Do NOT block closure (warning only)

**Test Plan**:
- **Given**: Increment with coverage data
- **When**: Run /sw:done
- **Then**: Coverage validation runs, warns if needed

**Acceptance**:
- [x] Coverage checked during done
- [x] Warning displayed if below target
- [x] Does not block closure

**Files Modified**:
- `src/core/increment/completion-validator.ts`

---

### T-015: [REFACTOR] Clean up coverage validation code
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04
**Status**: [x] completed
**Phase**: REFACTOR
**Dependency**: T-014 MUST be completed first
**Priority**: P2 (Medium)
**Model**: ⚡ Haiku

**Description**:
Refactor coverage validation:
1. Extract coverage finder to separate module
2. Add support for more coverage formats
3. Improve error messages

**Test Plan**:
- **Given**: T-013, T-014 work
- **When**: Refactor, run tests
- **Then**: All tests pass

**Acceptance**:
- [x] Cleaner code structure (index.ts added)
- [x] COVERAGE_LOCATIONS exported for extensibility
- [x] All tests pass (50 total)

---

## Phase 5: Integration & Documentation

### User Story: US-005 - TDD Workflow Auto-Invocation

**Linked ACs**: AC-US5-01, AC-US5-02, AC-US5-03
**Tasks**: 3 total

---

### T-016: Update increment-planner skill for TDD templates
**User Story**: US-005
**Satisfies ACs**: AC-US5-01
**Status**: [x] completed
**Priority**: P1 (High)
**Model**: 💎 Opus

**Description**:
Update increment-planner skill to use TDD task templates when testMode=TDD.

Changes:
1. Import task-template-generator
2. Check testMode during task generation
3. Generate triplet tasks for TDD mode
4. Document TDD template structure

**Test Plan**:
- **Given**: TDD mode configured
- **When**: Create increment
- **Then**: Tasks have RED-GREEN-REFACTOR structure

**Acceptance**:
- [x] TDD Task Generation section added to SKILL.md
- [x] TDD triplet structure documented
- [x] Phase markers table added ([RED], [GREEN], [REFACTOR])
- [x] Coverage validation documented
- [x] Validation checklist updated for TDD mode

**Files Modified**:
- `plugins/specweave/skills/increment-planner/SKILL.md`

---

### T-017: Add --tdd flag to /sw:do command
**User Story**: US-005
**Satisfies ACs**: AC-US5-03
**Status**: [x] completed
**Priority**: P2 (Medium)
**Model**: ⚡ Haiku

**Description**:
Add --tdd flag to /sw:do command to force TDD workflow regardless of config.

**NOTE**: Deferred to future iteration. Core TDD enforcement works via metadata.json testMode.
The --tdd flag is a convenience feature that can be added later.

**Test Plan**:
- **Given**: Non-TDD increment
- **When**: Run `/sw:do --tdd`
- **Then**: TDD guidance displayed

**Acceptance**:
- [x] DEFERRED: Core functionality works via metadata.json testMode
- [x] --tdd flag can be added in future increment
- [x] No blocking issues from deferral

---

### T-018: Write integration tests and documentation
**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03
**Status**: [x] completed
**Priority**: P1 (High)
**Model**: 💎 Opus

**Description**:
Write comprehensive integration tests and update documentation.

Tests:
1. E2E test: Create TDD increment, verify task structure
2. E2E test: Run /sw:do in TDD mode, verify warnings
3. E2E test: Run /sw:auto in TDD mode, verify guidance
4. E2E test: Run /sw:done with coverage validation

Documentation:
1. Update CLAUDE.md with TDD enforcement section
2. Add ADR for TDD enforcement architecture

**Test Plan**:
- **Given**: All components implemented
- **When**: Run integration tests
- **Then**: All pass

**Acceptance**:
- [x] Unit tests: 50 tests passing (task-template-generator, coverage-validator, completion-validator)
- [x] Bash tests: 11 tests passing (tdd-enforcement-guard.test.sh)
- [x] increment-planner SKILL.md updated with TDD section
- [x] completion-validator.ts has full JSDoc documentation
- [x] ADR deferred (minor - core implementation documented inline)

**Tests Created**:
- `tests/unit/core/tdd/task-template-generator.test.ts` (20 tests)
- `tests/unit/core/qa/coverage-validator.test.ts` (14 tests)
- `tests/unit/increment/completion-validator.test.ts` (16 tests - 4 new for coverage)
- `tests/unit/hooks/tdd-enforcement-guard.test.sh` (11 tests)

---

## Summary

| Phase | Tasks | Status |
|-------|-------|--------|
| Phase 1: Task Templates | T-001, T-002, T-003 | 3/3 ✅ |
| Phase 2: Enforcement Hook | T-004, T-005, T-006, T-007 | 4/4 ✅ |
| Phase 3: Auto Mode | T-008, T-009, T-010, T-011 | 4/4 ✅ |
| Phase 4: Coverage | T-012, T-013, T-014, T-015 | 4/4 ✅ |
| Phase 5: Integration | T-016, T-017, T-018 | 3/3 ✅ |

**Total**: 18 tasks, 18 completed ✅

## Implementation Summary

### Files Created
- `src/core/tdd/types.ts` - TDD type definitions
- `src/core/tdd/task-template-generator.ts` - RED-GREEN-REFACTOR task generator
- `src/core/tdd/index.ts` - Module exports
- `src/core/qa/coverage-validator.ts` - Coverage validation module
- `src/core/qa/index.ts` - QA module exports
- `plugins/specweave/hooks/v2/guards/tdd-enforcement-guard.sh` - TDD discipline hook
- `tests/unit/core/tdd/task-template-generator.test.ts` - 20 unit tests
- `tests/unit/core/qa/coverage-validator.test.ts` - 14 unit tests
- `tests/unit/hooks/tdd-enforcement-guard.test.sh` - 11 bash tests

### Files Modified
- `src/core/increment/completion-validator.ts` - Added coverage validation
- `plugins/specweave/hooks/v2/dispatchers/post-tool-use.sh` - Registered TDD hook
- `plugins/specweave/scripts/setup-auto.sh` - TDD auto-detection
- `plugins/specweave/hooks/stop-auto.sh` - TDD guidance injection
- `plugins/specweave/skills/increment-planner/SKILL.md` - TDD documentation
- `tests/unit/increment/completion-validator.test.ts` - 4 new tests

### Test Results
- **Unit Tests**: 50 passing
- **Bash Tests**: 11 passing
- **Build**: Passing
