---
increment: 0148-autonomous-execution-auto
status: active
phases:
  - foundation
  - stop-hook
  - commands
  - orchestration
  - gates
  - integration
estimated_tasks: 42
---

# Implementation Tasks

## Phase 1: Foundation

### T-001: Create session state types and manager
**User Story**: US-001
**Satisfies ACs**: AC-US1-02, AC-US1-08
**Status**: [x] completed
**Priority**: P1
**Model Hint**: opus

**Description**: Implement `src/core/auto/session-state.ts` with AutoSession interface and SessionStateManager class.

**Test Plan**:
- Given a new session, When save() is called, Then state file is created at `.specweave/state/auto-session.json`
- Given an existing session, When load() is called, Then session is deserialized correctly
- Given a corrupted state file, When load() is called, Then null is returned and error is logged

**Files**:
- `src/core/auto/session-state.ts` (create)
- `src/core/auto/types.ts` (create)
- `tests/unit/auto/session-state.test.ts` (create)

---

### T-002: Create auto configuration loader
**User Story**: US-002
**Satisfies ACs**: AC-US2-03, AC-US2-04
**Status**: [x] completed
**Priority**: P1
**Model Hint**: haiku

**Description**: Implement configuration loading from `.specweave/config.json` with sensible defaults.

**Test Plan**:
- Given no auto config, When loadAutoConfig() is called, Then defaults are returned
- Given partial config, When loaded, Then missing fields use defaults
- Given invalid config, When loaded, Then error is thrown with clear message

**Files**:
- `src/core/auto/config.ts` (create)
- `tests/unit/auto/config.test.ts` (create)

---

### T-003: Create auto logger infrastructure
**User Story**: US-009
**Satisfies ACs**: AC-US9-01
**Status**: [x] completed
**Priority**: P1
**Model Hint**: haiku

**Description**: Implement structured logging for auto sessions.

**Test Plan**:
- Given a session, When logIteration() is called, Then JSON entry is appended to log file
- Given multiple log calls, When generateSummary() is called, Then aggregate stats are correct

**Files**:
- `src/core/auto/logger.ts` (create)
- `tests/unit/auto/logger.test.ts` (create)

---

### T-004: Create auto index exports
**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [x] completed
**Priority**: P1
**Model Hint**: haiku

**Description**: Create main index.ts that exports all auto modules.

**Files**:
- `src/core/auto/index.ts` (create)

---

## Phase 2: Stop Hook Implementation

### T-005: Create stop-auto.sh hook script
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-03, AC-US1-04
**Status**: [x] completed
**Priority**: P1
**Model Hint**: opus

**Description**: Implement the Stop Hook that creates the feedback loop for auto.

**Test Plan**:
- Given no session file, When hook runs, Then `{"decision": "approve"}` is returned
- Given active session, When hook runs, Then iteration is incremented and block is returned
- Given completed session, When hook runs, Then approve is returned

**Files**:
- `plugins/specweave/hooks/stop-auto.sh` (create)

---

### T-006: Implement completion promise detection
**User Story**: US-001
**Satisfies ACs**: AC-US1-06
**Status**: [x] completed
**Priority**: P1
**Model Hint**: sonnet

**Description**: Parse transcript to detect completion promise in Claude's output.

**Test Plan**:
- Given transcript with `<auto-complete>DONE</auto-complete>`, When parsed, Then completion is detected
- Given transcript without promise, When parsed, Then no completion detected
- Given malformed transcript, When parsed, Then error is handled gracefully

**Files**:
- `plugins/specweave/hooks/stop-auto.sh` (modify)
- `tests/integration/auto/stop-hook.test.ts` (create)

---

### T-007: Implement max iterations safety
**User Story**: US-001
**Satisfies ACs**: AC-US1-07
**Status**: [x] completed
**Priority**: P1
**Model Hint**: haiku

**Description**: Add iteration limit enforcement in stop hook.

**Test Plan**:
- Given iteration 100 and max 100, When hook runs, Then session is completed
- Given iteration 50 and max 100, When hook runs, Then execution continues

**Files**:
- `plugins/specweave/hooks/stop-auto.sh` (modify)

---

### T-008: Implement stop_hook_active detection
**User Story**: US-001
**Satisfies ACs**: AC-US1-04
**Status**: [x] completed
**Priority**: P1
**Model Hint**: sonnet

**Description**: Detect when Stop Hook is already active to prevent infinite nesting.

**Test Plan**:
- Given stop_hook_active=true in input, When hook runs, Then appropriate action is taken

**Files**:
- `plugins/specweave/hooks/stop-auto.sh` (modify)

---

## Phase 3: Command Implementation

### T-009: Create setup-auto.sh script
**User Story**: US-002
**Satisfies ACs**: AC-US2-07
**Status**: [x] completed
**Priority**: P1
**Model Hint**: opus

**Description**: Create initialization script that sets up auto session state.

**Test Plan**:
- Given valid arguments, When script runs, Then session file is created
- Given missing required arg, When script runs, Then error message is shown

**Files**:
- `plugins/specweave/scripts/setup-auto.sh` (create)

---

### T-010: Create auto.md command definition
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02
**Status**: [x] completed
**Priority**: P1
**Model Hint**: opus

**Description**: Create the /sw:auto command skill definition.

**Files**:
- `plugins/specweave/commands/auto.md` (create)

---

### T-011: Implement --max-iterations option
**User Story**: US-002
**Satisfies ACs**: AC-US2-03
**Status**: [x] completed
**Priority**: P2
**Model Hint**: haiku

**Description**: Add max iterations argument parsing.

**Files**:
- `plugins/specweave/scripts/setup-auto.sh` (modify)

---

### T-012: Implement --max-hours option
**User Story**: US-002
**Satisfies ACs**: AC-US2-04
**Status**: [x] completed
**Priority**: P2
**Model Hint**: haiku

**Description**: Add max hours time limit argument.

**Files**:
- `plugins/specweave/scripts/setup-auto.sh` (modify)

---

### T-013: Implement --dry-run option
**User Story**: US-002
**Satisfies ACs**: AC-US2-06
**Status**: [x] completed
**Priority**: P2
**Model Hint**: haiku

**Description**: Add dry-run mode that shows what would happen.

**Files**:
- `plugins/specweave/scripts/setup-auto.sh` (modify)

---

### T-014: Implement cost estimation
**User Story**: US-002
**Satisfies ACs**: AC-US2-08
**Status**: [x] completed
**Priority**: P2
**Model Hint**: sonnet

**Description**: Calculate and display estimated cost before starting.

**Files**:
- `src/core/auto/cost-estimator.ts` (create)
- `plugins/specweave/commands/auto.md` (modify)

---

### T-015: Create cancel-auto.md command
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02
**Status**: [x] completed
**Priority**: P1
**Model Hint**: opus

**Description**: Create the /sw:cancel-auto command.

**Files**:
- `plugins/specweave/commands/cancel-auto.md` (create)
- `plugins/specweave/scripts/cancel-auto.sh` (create)

---

### T-016: Generate cancellation summary report
**User Story**: US-003
**Satisfies ACs**: AC-US3-03, AC-US3-04
**Status**: [x] completed
**Priority**: P2
**Model Hint**: sonnet

**Description**: Generate summary report when canceling session.

**Files**:
- `src/core/auto/report-generator.ts` (create)
- `plugins/specweave/scripts/cancel-auto.sh` (modify)

---

### T-017: Create auto-status.md command
**User Story**: US-010
**Satisfies ACs**: AC-US10-01, AC-US10-02, AC-US10-03
**Status**: [x] completed
**Priority**: P2
**Model Hint**: opus

**Description**: Create the /sw:auto-status command.

**Files**:
- `plugins/specweave/commands/auto-status.md` (create)
- `plugins/specweave/scripts/auto-status.sh` (create)

---

## Phase 4: Multi-Increment Orchestration

### T-018: Create increment queue manager
**User Story**: US-004
**Satisfies ACs**: AC-US4-01
**Status**: [x] completed
**Priority**: P1
**Model Hint**: opus

**Description**: Implement IncrementQueueManager class.

**Test Plan**:
- Given queue [A, B, C], When getCurrentIncrement() called, Then A is returned
- Given A completed, When moveToNext() called, Then B becomes current

**Files**:
- `src/core/auto/increment-queue.ts` (create)
- `tests/unit/auto/increment-queue.test.ts` (create)

---

### T-019: Implement dependency validation
**User Story**: US-004
**Satisfies ACs**: AC-US4-04
**Status**: [x] completed
**Priority**: P1
**Model Hint**: sonnet

**Description**: Validate increment dependencies before starting.

**Test Plan**:
- Given increment B depends on A (not done), When validated, Then false returned
- Given increment B depends on A (done), When validated, Then true returned

**Files**:
- `src/core/auto/increment-queue.ts` (modify)

---

### T-020: Implement WIP limit checking
**User Story**: US-004
**Satisfies ACs**: AC-US4-03
**Status**: [x] completed
**Priority**: P1
**Model Hint**: haiku

**Description**: Check WIP limits before starting new increment.

**Files**:
- `src/core/auto/increment-queue.ts` (modify)

---

### T-021: Implement --increments option
**User Story**: US-004
**Satisfies ACs**: AC-US4-05
**Status**: [x] completed
**Priority**: P2
**Model Hint**: haiku

**Description**: Add explicit increment queue argument.

**Files**:
- `plugins/specweave/scripts/setup-auto.sh` (modify)

---

### T-022: Implement --all-backlog option
**User Story**: US-004
**Satisfies ACs**: AC-US4-06
**Status**: [x] completed
**Priority**: P2
**Model Hint**: sonnet

**Description**: Process all backlog items in priority order.

**Files**:
- `plugins/specweave/scripts/setup-auto.sh` (modify)
- `src/core/auto/increment-queue.ts` (modify)

---

### T-023: Generate per-increment completion reports
**User Story**: US-004
**Satisfies ACs**: AC-US4-07, AC-US4-08
**Status**: [x] completed
**Priority**: P2
**Model Hint**: sonnet

**Description**: Generate reports after each increment and final session summary.

**Files**:
- `src/core/auto/report-generator.ts` (modify)

---

## Phase 5: Test-Driven Gates

### T-024: Create test gate module
**User Story**: US-005
**Satisfies ACs**: AC-US5-01
**Status**: [x] completed
**Priority**: P1
**Model Hint**: opus

**Description**: Implement TestGate class for test enforcement.

**Test Plan**:
- Given all tests pass, When runGate() called, Then passed=true
- Given test failures, When runGate() called, Then passed=false with details

**Files**:
- `src/core/auto/test-gate.ts` (create)
- `tests/unit/auto/test-gate.test.ts` (create)

---

### T-025: Implement test failure fix attempts
**User Story**: US-005
**Satisfies ACs**: AC-US5-02
**Status**: [x] completed
**Priority**: P1
**Model Hint**: opus

**Description**: Attempt to fix failing tests (up to 3 retries).

**Files**:
- `src/core/auto/test-gate.ts` (modify)

---

### T-026: Implement human intervention escalation
**User Story**: US-005
**Satisfies ACs**: AC-US5-03
**Status**: [x] completed
**Priority**: P1
**Model Hint**: sonnet

**Description**: Escalate to human after 3 failed fix attempts.

**Files**:
- `src/core/auto/test-gate.ts` (modify)

---

### T-027: Implement coverage threshold enforcement
**User Story**: US-005
**Satisfies ACs**: AC-US5-06
**Status**: [x] completed
**Priority**: P2
**Model Hint**: sonnet

**Description**: Block if coverage drops below threshold.

**Files**:
- `src/core/auto/test-gate.ts` (modify)

---

### T-028: Implement Playwright E2E integration
**User Story**: US-005
**Satisfies ACs**: AC-US5-08
**Status**: [x] completed
**Priority**: P2
**Model Hint**: opus

**Description**: Detect and run Playwright E2E tests.

**Files**:
- `src/core/auto/test-gate.ts` (modify)

---

## Phase 6: Human Gates

### T-029: Create human gate detector
**User Story**: US-006
**Satisfies ACs**: AC-US6-01, AC-US6-02
**Status**: [x] completed
**Priority**: P1
**Model Hint**: opus

**Description**: Implement HumanGateDetector with pattern matching.

**Test Plan**:
- Given content "npm run deploy", When detectGate() called, Then deploy gate returned
- Given content "npm run build", When detectGate() called, Then null returned

**Files**:
- `src/core/auto/human-gate.ts` (create)
- `tests/unit/auto/human-gate.test.ts` (create)

---

### T-030: Implement approval request flow
**User Story**: US-006
**Satisfies ACs**: AC-US6-03, AC-US6-04
**Status**: [x] completed
**Priority**: P1
**Model Hint**: opus

**Description**: Create approval request and wait mechanism.

**Files**:
- `src/core/auto/human-gate.ts` (modify)

---

### T-031: Implement approval timeout
**User Story**: US-006
**Satisfies ACs**: AC-US6-05
**Status**: [x] completed
**Priority**: P2
**Model Hint**: haiku

**Description**: Timeout after configurable period (default: 30 min).

**Files**:
- `src/core/auto/human-gate.ts` (modify)

---

### T-032: Implement --skip-gates option
**User Story**: US-006
**Satisfies ACs**: AC-US6-07
**Status**: [x] completed
**Priority**: P3
**Model Hint**: haiku

**Description**: Pre-approve specific operations via command line.

**Files**:
- `plugins/specweave/scripts/setup-auto.sh` (modify)

---

### T-033: Add never-auto-approve rules
**User Story**: US-006
**Satisfies ACs**: AC-US6-08
**Status**: [x] completed
**Priority**: P1
**Model Hint**: sonnet

**Description**: Ensure critical operations are never auto-approved.

**Files**:
- `src/core/auto/human-gate.ts` (modify)

---

## Phase 7: Circuit Breakers

### T-034: Create circuit breaker implementation
**User Story**: US-008
**Satisfies ACs**: AC-US8-01
**Status**: [x] completed
**Priority**: P1
**Model Hint**: opus

**Description**: Implement CircuitBreaker class.

**Test Plan**:
- Given 3 failures, When next call made, Then circuit opens
- Given circuit open for 5 min, When call made, Then half-open test

**Files**:
- `src/core/auto/circuit-breaker.ts` (create)
- `tests/unit/auto/circuit-breaker.test.ts` (create)

---

### T-035: Create service-specific breakers
**User Story**: US-008
**Satisfies ACs**: AC-US8-02
**Status**: [x] completed
**Priority**: P1
**Model Hint**: sonnet

**Description**: Create breakers for GitHub, JIRA, ADO.

**Files**:
- `src/core/auto/circuit-breaker.ts` (modify)

---

### T-036: Implement retry queue
**User Story**: US-008
**Satisfies ACs**: AC-US8-03
**Status**: [x] completed
**Priority**: P2
**Model Hint**: sonnet

**Description**: Queue operations when circuit is open for later retry.

**Files**:
- `src/core/auto/circuit-breaker.ts` (modify)

---

### T-037: Implement rate limit detection
**User Story**: US-008
**Satisfies ACs**: AC-US8-05
**Status**: [x] completed
**Priority**: P2
**Model Hint**: sonnet

**Description**: Parse rate limit headers and pause accordingly.

**Files**:
- `src/core/auto/circuit-breaker.ts` (modify)

---

### T-038: Implement circuit breaker logging
**User Story**: US-008
**Satisfies ACs**: AC-US8-06
**Status**: [x] completed
**Priority**: P2
**Model Hint**: haiku

**Description**: Log all circuit state transitions.

**Files**:
- `src/core/auto/circuit-breaker.ts` (modify)

---

## Phase 8: Sync Integration

### T-039: Create sync checkpoint module
**User Story**: US-009
**Satisfies ACs**: AC-US9-01, AC-US9-02, AC-US9-03
**Status**: [x] completed
**Priority**: P1
**Model Hint**: opus

**Description**: Implement SyncCheckpoint with batching.

**Files**:
- `src/core/auto/sync-checkpoint.ts` (create)

---

### T-040: Implement force sync on completion
**User Story**: US-009
**Satisfies ACs**: AC-US9-05
**Status**: [x] completed
**Priority**: P1
**Model Hint**: haiku

**Description**: Force sync before session ends.

**Files**:
- `src/core/auto/sync-checkpoint.ts` (modify)

---

### T-041: Integrate with existing /sw:next command
**User Story**: US-007
**Satisfies ACs**: AC-US7-04, AC-US7-05
**Status**: [x] completed
**Priority**: P1
**Model Hint**: opus

**Description**: Modify /sw:next to detect auto and add --auto flag.

**Files**:
- `plugins/specweave/commands/next.md` (modify)

---

### T-042: Integration testing - full auto workflow
**User Story**: US-007
**Satisfies ACs**: AC-US7-01, AC-US7-02, AC-US7-03, AC-US7-06, AC-US7-07
**Status**: [x] completed
**Priority**: P1
**Model Hint**: opus

**Description**: Create E2E test for complete auto workflow.

**Test Plan**:
- Given 3-task increment, When auto runs, Then all tasks completed, increment closed, docs synced

**Files**:
- `tests/e2e/auto/full-workflow.spec.ts` (create)

---

## Summary

| Phase | Tasks | Priority P1 | Priority P2 | Priority P3 |
|-------|-------|-------------|-------------|-------------|
| Foundation | 4 | 4 | 0 | 0 |
| Stop Hook | 4 | 4 | 0 | 0 |
| Commands | 9 | 3 | 6 | 0 |
| Orchestration | 6 | 3 | 3 | 0 |
| Test Gates | 5 | 3 | 2 | 0 |
| Human Gates | 5 | 3 | 1 | 1 |
| Circuit Breakers | 5 | 2 | 3 | 0 |
| Sync Integration | 4 | 4 | 0 | 0 |
| **Total** | **42** | **26** | **15** | **1** |

**Estimated Timeline**: 3-4 weeks (P1 first, P2 second sprint, P3 backlog)
