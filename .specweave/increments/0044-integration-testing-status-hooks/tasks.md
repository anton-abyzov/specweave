---
increment: 0044-integration-testing-status-hooks
total_tasks: 6
completed_tasks: 0
test_mode: TDD
coverage_target: 95%
parent_increment: 0043-spec-md-desync-fix
---

# Implementation Tasks

## Overview

This increment validates the spec.md desync fix from increment 0043 works correctly in production scenarios. All tasks are test-focused (no production code changes).

**Test Strategy**: Three-layer validation (Unit tests complete in 0043, this increment covers layers 2-3):
- Layer 2: Integration tests (component interactions)
- Layer 3: E2E tests (full user workflows)
- Performance + Manual validation

---

## Phase 1: Test Infrastructure & Integration Tests (Day 1)

### T-013: Test Status Line Hook Reads Updated spec.md

**User Story**: US-001, US-003
**Acceptance Criteria**: AC-US1-03, AC-US3-01
**Priority**: P1
**Estimate**: 3 hours
**Status**: [ ] pending
**Model Hint**: ⚡ haiku (straightforward integration test)

**Test Plan**:
- **Given** an active increment with status="active" in spec.md
- **When** the increment is closed via MetadataManager.updateStatus()
- **Then** the status line hook should read "completed" from spec.md (not stale "active")
- **And** the status line cache should exclude the completed increment

**Test Cases**:
1. **Integration**: `tests/integration/hooks/status-line-hook.test.ts`
   - testHookReadsStatusFromSpecMd(): Hook reads spec.md after updateStatus()
   - testHookExcludesCompletedIncrements(): Completed increments not shown in status line
   - testHookHandlesMissingSpecMd(): Hook doesn't crash on missing spec.md
   - testHookPerformance(): Hook execution completes in < 500ms
   - **Coverage Target**: 95%

**Overall Coverage Target**: 95%

**Implementation**:
1. Create test utilities directory: `tests/integration/test-utils/`
2. Implement `HookTestHarness` class:
   - Execute bash hooks in isolated test environment
   - Read status line cache (`.specweave/state/status-line.json`)
   - Capture hook output (stdout, stderr, exitCode, duration)
3. Implement `IncrementFactory` class:
   - Create test increments programmatically
   - Generate spec.md with custom frontmatter
   - Generate metadata.json with custom fields
4. Create test file: `tests/integration/hooks/status-line-hook.test.ts`
5. Write test: "reads status from spec.md after updateStatus()"
   - Arrange: Create test increment with status="active"
   - Act: Close increment via MetadataManager.updateStatus()
   - Execute status line hook via HookTestHarness
   - Assert: Hook reads "completed" from spec.md
6. Write test: "excludes completed increments from status line"
   - Arrange: Create 2 increments, close one
   - Act: Execute status line hook
   - Assert: Only active increment shown in cache
7. Write test: "handles missing spec.md gracefully"
   - Arrange: Delete spec.md after creating increment
   - Act: Execute status line hook
   - Assert: Hook exits 0, logs warning
8. Write test: "hook execution completes in < 500ms"
   - Arrange: Create 10 test increments
   - Act: Execute hook and measure duration
   - Assert: Duration < 500ms
9. Run tests: `npm test tests/integration/hooks/status-line-hook.test.ts` (should pass: 4/4)
10. Verify coverage: `npm run coverage -- --include=tests/integration/hooks/` (should be ≥95%)

**TDD Workflow** (TDD mode enabled):
1. 📝 Write all 4 tests above (should fail initially if hook has bugs)
2. ❌ Run tests: `npm test status-line-hook.test` (expect failures if integration bugs exist)
3. ✅ Fix any integration bugs discovered by tests
4. 🟢 Run tests: `npm test status-line-hook.test` (4/4 passing)
5. ♻️ Refactor test utilities if needed
6. ✅ Final check: Coverage ≥95%

**Validation**:
- All 4 integration tests passing
- Hook reads spec.md (not metadata.json) - verified by test mocking
- Coverage ≥95%
- Performance target met (< 500ms)

**Dependencies**:
- Increment 0043 merged to develop
- SpecFrontmatterUpdater class functional
- Status line hook script exists: `plugins/specweave/hooks/lib/update-status-line.sh`

---

### T-014: Test /specweave:done Updates spec.md

**User Story**: US-001
**Acceptance Criteria**: AC-US1-01, AC-US1-02
**Priority**: P1
**Estimate**: 3 hours
**Status**: [ ] pending
**Model Hint**: ⚡ haiku (straightforward command integration test)

**Test Plan**:
- **Given** an active increment with all tasks complete and ACs checked
- **When** the `/specweave:done` command is executed
- **Then** both metadata.json and spec.md should be updated to status="completed"
- **And** the status line should update to the next active increment

**Test Cases**:
1. **Integration**: `tests/integration/commands/done-command.test.ts`
   - testDoneCommandUpdatesMetadataAndSpecMd(): Both files updated atomically
   - testDoneCommandTriggersStatusLineUpdate(): Status line switches to next increment
   - testDoneCommandValidatesACs(): Closure fails if ACs unchecked
   - testDoneCommandRollbackOnFailure(): Metadata NOT changed if spec.md update fails
   - **Coverage Target**: 95%

**Overall Coverage Target**: 95%

**Implementation**:
1. Create test file: `tests/integration/commands/done-command.test.ts`
2. Implement `executeCommand()` test utility:
   - Execute SpecWeave commands in isolated test environment
   - Capture command output and exit code
   - Support both success and failure scenarios
3. Write test: "updates both metadata.json and spec.md"
   - Arrange: Create test increment with all tasks complete
   - Act: Execute `/specweave:done` command
   - Assert: Both files show status="completed"
4. Write test: "triggers status line update after closure"
   - Arrange: Create 2 active increments
   - Act: Close first increment
   - Execute status line hook
   - Assert: Status line shows second increment
5. Write test: "validates all ACs checked before closure"
   - Arrange: Create increment with unchecked ACs
   - Act: Try to close increment
   - Assert: Closure fails with validation error
   - Verify: Status NOT changed (still "active")
6. Write test: "rollback metadata.json if spec.md update fails"
   - Arrange: Make spec.md read-only (simulate failure)
   - Act: Try to close increment
   - Assert: Command throws error
   - Verify: metadata.json NOT changed (rollback successful)
7. Run tests: `npm test tests/integration/commands/done-command.test.ts` (should pass: 4/4)
8. Verify coverage: `npm run coverage -- --include=tests/integration/commands/` (should be ≥95%)

**TDD Workflow** (TDD mode enabled):
1. 📝 Write all 4 tests above (should fail if command integration broken)
2. ❌ Run tests: `npm test done-command.test` (expect failures if integration bugs exist)
3. ✅ Fix any integration bugs discovered by tests
4. 🟢 Run tests: `npm test done-command.test` (4/4 passing)
5. ♻️ Refactor test utilities if needed
6. ✅ Final check: Coverage ≥95%

**Validation**:
- All 4 integration tests passing
- Command updates both files atomically
- Validation prevents incomplete closures
- Rollback works on failures
- Coverage ≥95%

**Dependencies**:
- T-013 complete (HookTestHarness and IncrementFactory utilities exist)
- `/specweave:done` command exists in `plugins/specweave/commands/`
- MetadataManager.updateStatus() functional

---

## Phase 2: E2E Tests (Day 2)

### T-020: Write E2E Test (Full Increment Lifecycle)

**User Story**: US-001, US-003
**Acceptance Criteria**: AC-US1-01, AC-US1-02, AC-US3-03
**Priority**: P1
**Estimate**: 4 hours
**Status**: [ ] pending
**Model Hint**: 🧠 sonnet (complex E2E scenario with Playwright)

**Test Plan**:
- **Given** a fresh SpecWeave environment
- **When** a user creates an increment, works on it, and closes it
- **Then** the full lifecycle should work end-to-end without desync
- **And** status line should update correctly at each stage

**Test Cases**:
1. **E2E**: `tests/e2e/increment-lifecycle.spec.ts`
   - testFullLifecycle(): Create → close → verify status line updates
   - testMultiIncrementWorkflow(): Close 0001 → status line shows 0002
   - testHookAutoTriggers(): Hook executes automatically after closure
   - **Coverage Target**: 100% (critical user path)

**Overall Coverage Target**: 100%

**Implementation**:
1. Create E2E test utilities: `tests/e2e/test-utils/claude-command-executor.ts`
   - Execute Claude Code commands in Playwright tests
   - Wait for async hook completion
   - Capture command output
2. Create test file: `tests/e2e/increment-lifecycle.spec.ts`
3. Write test: "complete workflow: create → close → status line updates"
   - Step 1: Create new increment via `/specweave:increment "E2E Test"`
   - Step 2: Verify spec.md created with status="planning"
   - Step 3: Complete all tasks (simulate work)
   - Step 4: Close increment via `/specweave:done`
   - Step 5: Verify spec.md updated to status="completed"
   - Step 6: Verify metadata.json updated
   - Step 7: Verify status line excludes completed increment
4. Write test: "multi-increment workflow: close 0001 → status line shows 0002"
   - Step 1: Create two increments
   - Step 2: Close first increment
   - Step 3: Verify status line switches to second increment
   - Step 4: Verify first increment spec.md is "completed"
   - Step 5: Verify second increment still "active" or "planning"
5. Write test: "hook triggers automatically after increment closure"
   - Step 1: Create and close increment
   - Step 2: Monitor hook log file for execution
   - Step 3: Verify hook executed (log size increased)
   - Step 4: Verify hook log contains increment ID
6. Run E2E tests: `npm run test:e2e increment-lifecycle.spec` (should pass: 3/3)
7. Verify critical path coverage: 100% of user workflows tested

**TDD Workflow** (TDD mode enabled):
1. 📝 Write all 3 E2E tests above (complex, may reveal integration issues)
2. ❌ Run tests: `npm run test:e2e increment-lifecycle` (expect failures if workflow broken)
3. ✅ Fix any workflow bugs discovered by tests
4. 🟢 Run tests: `npm run test:e2e increment-lifecycle` (3/3 passing)
5. ♻️ Refactor E2E utilities if needed
6. ✅ Final check: Coverage 100% of critical paths

**Validation**:
- All 3 E2E tests passing
- Full user workflow validated end-to-end
- Status line updates correctly at each stage
- Hooks trigger automatically
- 100% critical path coverage

**Dependencies**:
- Playwright configured (already exists in project)
- T-013 and T-014 complete (integration tests passing)
- `/specweave:increment` and `/specweave:done` commands functional

---

### T-021: Write E2E Test (Repair Script Workflow)

**User Story**: US-001
**Acceptance Criteria**: AC-US1-02 (verification)
**Priority**: P2
**Estimate**: 3 hours
**Status**: [ ] pending
**Model Hint**: 🧠 sonnet (complex E2E scenario with desync creation)

**Test Plan**:
- **Given** an increment with manually created desync (metadata.json vs spec.md mismatch)
- **When** the validation and repair scripts are executed
- **Then** desync should be detected, reported, and repaired
- **And** re-validation should confirm 0 desyncs

**Test Cases**:
1. **E2E**: `tests/e2e/validation-repair.spec.ts`
   - testRepairScriptFixesDesync(): Create desync → repair → validate
   - testValidationDetectsMultipleDesyncs(): 3 desyncs detected and repaired
   - **Coverage Target**: 100% (critical validation/repair paths)

**Overall Coverage Target**: 100%

**Implementation**:
1. Create test file: `tests/e2e/validation-repair.spec.ts`
2. Implement `createDesync()` test utility:
   - Update metadata.json WITHOUT updating spec.md
   - Simulate real-world desync scenario
3. Write test: "repair script fixes existing desync"
   - Step 1: Create test increment
   - Step 2: Manually create desync (metadata="completed", spec="active")
   - Step 3: Run validation command: `npx specweave validate-status-sync`
   - Step 4: Verify desync detected in output
   - Step 5: Run repair script (dry-run): `--dry-run` flag
   - Step 6: Verify dry-run shows changes without executing
   - Step 7: Run repair script (real): `npx specweave repair-status-desync`
   - Step 8: Verify spec.md updated to "completed"
   - Step 9: Re-run validation: Should show "All increments in sync"
4. Write test: "validation detects multiple desyncs"
   - Step 1: Create 3 increments with desyncs
   - Step 2: Run validation: Should detect all 3
   - Step 3: Repair all: `--all` flag
   - Step 4: Re-validate: Should show 0 desyncs
5. Run E2E tests: `npm run test:e2e validation-repair.spec` (should pass: 2/2)
6. Verify validation/repair coverage: 100%

**TDD Workflow** (TDD mode enabled):
1. 📝 Write both E2E tests above (validates repair workflow)
2. ❌ Run tests: `npm run test:e2e validation-repair` (expect failures if scripts broken)
3. ✅ Fix any validation/repair bugs discovered by tests
4. 🟢 Run tests: `npm run test:e2e validation-repair` (2/2 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage 100% of validation/repair paths

**Validation**:
- Both E2E tests passing
- Validation script detects desyncs correctly
- Repair script fixes desyncs without data loss
- Dry-run mode works (no unintended changes)
- 100% validation/repair coverage

**Dependencies**:
- T-020 complete (E2E utilities exist)
- Validation script exists: `npx specweave validate-status-sync`
- Repair script exists: `npx specweave repair-status-desync`

---

## Phase 3: Performance & Manual Testing (Day 2-3)

### T-022: Run Performance Benchmarks (< 10ms target)

**User Story**: N/A (non-functional requirement)
**Acceptance Criteria**: Performance targets from ADR-0043
**Priority**: P2
**Estimate**: 2 hours
**Status**: [ ] pending
**Model Hint**: ⚡ haiku (straightforward benchmark tests)

**Test Plan**:
- **Given** the spec.md sync implementation from increment 0043
- **When** performance benchmarks are executed
- **Then** all operations should meet target latencies
- **And** no performance regression from pre-0043 baseline

**Test Cases**:
1. **Performance**: `tests/performance/status-update-benchmark.test.ts`
   - testStatusUpdateLatency(): Average < 10ms (100 iterations)
   - testSpecMdReadLatency(): Average < 2ms (100 iterations)
   - testStatusLineHookLatency(): Execution < 500ms (10 increments)
   - **Coverage Target**: 100% (all performance-critical operations)

**Overall Coverage Target**: 100%

**Implementation**:
1. Create test file: `tests/performance/status-update-benchmark.test.ts`
2. Write benchmark: "status update overhead < 10ms"
   - Warm-up run (1 iteration)
   - Benchmark: 100 iterations of updateStatus()
   - Measure: performance.now() before/after each iteration
   - Calculate: Average, p95, p99 latency
   - Assert: Average < 10ms, p95 < 15ms, p99 < 20ms
3. Write benchmark: "spec.md read latency < 2ms"
   - Benchmark: 100 iterations of SpecFrontmatterUpdater.readStatus()
   - Measure: performance.now() before/after each iteration
   - Calculate: Average latency
   - Assert: Average < 2ms
4. Write benchmark: "status line hook execution < 500ms"
   - Arrange: Create 10 test increments (stress test)
   - Benchmark: Execute status line hook via HookTestHarness
   - Measure: Hook execution duration
   - Assert: Duration < 500ms
5. Run performance tests: `npm run test:performance` (should pass: 3/3)
6. Generate performance report: Save to `reports/performance-report.md`
7. Compare against baseline (pre-0043): Verify no regression

**TDD Workflow** (TDD mode enabled):
1. 📝 Write all 3 benchmark tests above (establishes performance baselines)
2. ❌ Run tests: `npm run test:performance` (may fail if targets not met)
3. ✅ Optimize if needed (but implementation already complete in 0043)
4. 🟢 Run tests: `npm run test:performance` (3/3 passing)
5. ♻️ Document results in performance report
6. ✅ Final check: All targets met

**Validation**:
- All 3 benchmark tests passing
- Status update: < 10ms average ✅
- Spec.md read: < 2ms average ✅
- Hook execution: < 500ms ✅
- Performance report generated

**Performance Report**:
```markdown
# Performance Report - Increment 0044

## Benchmark Results

| Operation | Target | Actual | Status |
|-----------|--------|--------|--------|
| Status update (avg) | < 10ms | X.XXms | ✅/❌ |
| Status update (p95) | < 15ms | X.XXms | ✅/❌ |
| Status update (p99) | < 20ms | X.XXms | ✅/❌ |
| spec.md read (avg) | < 2ms | X.XXms | ✅/❌ |
| Hook execution | < 500ms | XXXms | ✅/❌ |

## Regression Check

Compared to pre-0043 baseline: [NO REGRESSION / REGRESSION DETECTED]
```

**Dependencies**:
- T-013 complete (HookTestHarness utility exists)
- All unit tests from 0043 passing (implementation stable)

---

### T-023: Manual Testing Checklist Execution

**User Story**: US-001, US-003
**Acceptance Criteria**: All ACs (human validation)
**Priority**: P1
**Estimate**: 2 hours
**Status**: [ ] pending
**Model Hint**: ⚡ haiku (checklist creation and execution)

**Test Plan**: N/A (manual testing task)

**Validation**:
- Manual review: All checklist items tested by human
- Edge cases: Corrupt files, permissions, concurrent updates
- Performance: Perceived speed (< 50ms feels instant)
- Regression: All existing workflows still work

**Manual Testing Checklist**:

Create file: `.specweave/increments/0044-integration-testing-status-hooks/reports/manual-testing-checklist.md`

**Checklist Contents**:
```markdown
# Manual Testing Checklist - Increment 0044

**Tester**: _______________________
**Date**: _______________________
**Environment**: macOS / Linux / Windows

## Status Line Tests

- [ ] Create new increment → Verify status line shows it
- [ ] Close increment → Verify status line updates to next active
- [ ] Close all increments → Verify status line shows "No active increments"
- [ ] Create multiple increments → Verify status line shows oldest (first created)
- [ ] Refresh Claude Code → Verify status line persists correctly

## Hook Integration Tests

- [ ] Close increment → Verify `post-increment-completion.sh` fires
- [ ] Complete task → Verify `post-task-completion.sh` fires
- [ ] Sync living docs → Verify `post-spec-sync.sh` fires
- [ ] All hooks read spec.md (not metadata.json) → Verify in logs

## /specweave:done Command Tests

- [ ] Close increment with all ACs checked → Success
- [ ] Try to close increment with unchecked ACs → Validation error
- [ ] Try to close increment with incomplete tasks → Warning (proceed with confirmation)
- [ ] Close increment → Verify both metadata.json and spec.md updated
- [ ] Close increment → Verify active increment cache updated

## Validation and Repair Tests

- [ ] Run `validate-status-sync` on clean codebase → 0 desyncs
- [ ] Manually create desync → Validation detects it
- [ ] Run repair script (dry-run) → Shows changes without executing
- [ ] Run repair script (real) → Fixes desync
- [ ] Re-run validation → 0 desyncs

## Multi-Increment Tests

- [ ] Create 3 increments → Verify all show in `openCount`
- [ ] Close 1st increment → Verify status line switches to 2nd
- [ ] Close 2nd increment → Verify status line switches to 3rd
- [ ] Close 3rd increment → Verify status line shows "No active increments"

## Edge Cases

- [ ] Delete spec.md manually → Hooks handle gracefully (log warning)
- [ ] Corrupt spec.md YAML → Validation detects corruption
- [ ] Make spec.md read-only → updateStatus() rollback works
- [ ] Concurrent status updates → No corruption (last write wins)

## Performance Tests

- [ ] Status update completes in < 50ms (perceived as instant)
- [ ] Status line hook completes in < 1 second
- [ ] Validation scan (50 increments) completes in < 5 seconds

## Regression Tests

- [ ] All existing unit tests still pass
- [ ] All existing integration tests still pass
- [ ] No performance degradation from 0043 baseline

---

**Overall Result**: ☐ PASS   ☐ FAIL

**Notes**:
_______________________________________________________________________
_______________________________________________________________________

**Blocker Issues**:
_______________________________________________________________________

**Sign-off**: _______________________   Date: _______________________
```

**Implementation**:
1. Create checklist file: `reports/manual-testing-checklist.md`
2. Execute all checklist items (estimated 2 hours)
3. Document results:
   - Pass: Check the box ✅
   - Fail: Document issue in "Notes" section
   - Blocker: Document in "Blocker Issues" section
4. If any failures:
   - Create bug tickets
   - Fix issues
   - Re-test failed items
5. Sign off when all items pass

**Validation**:
- All checklist items checked ✅
- No blocker issues
- Sign-off complete
- Any non-blocker issues documented for future increments

**Dependencies**:
- T-013, T-014, T-020, T-021, T-022 complete (all automated tests passing)
- SpecWeave installed and functional
- Claude Code running

---

## Summary

**Total Tasks**: 6
**Total Effort**: 17 hours (2-3 days)

**Task Breakdown**:
- **Integration Tests**: T-013, T-014 (6 hours)
- **E2E Tests**: T-020, T-021 (7 hours)
- **Performance Tests**: T-022 (2 hours)
- **Manual Testing**: T-023 (2 hours)

**Coverage Targets**:
- Integration: 95%+
- E2E: 100% (critical paths)
- Performance: 100% (all benchmarks)
- Manual: 100% (all checklist items)

**Success Criteria**:
- ✅ All 6 tasks complete
- ✅ All automated tests passing
- ✅ Performance targets met
- ✅ Manual checklist signed off
- ✅ Zero regressions from increment 0043

**Next Steps After Completion**:
1. Run full test suite: `npm run test:all`
2. Verify coverage: `npm run test:coverage`
3. Create completion report: `reports/COMPLETION-REPORT.md`
4. Execute `/specweave:done 0044` (close increment)
5. Merge to develop branch

---

**Test Mode**: TDD (Test-Driven Development)
**Coverage Target**: 95% (integration/performance), 100% (E2E/manual)
**Parent Increment**: 0043-spec-md-desync-fix
**Estimated Timeline**: 2-3 days (17 hours total)
