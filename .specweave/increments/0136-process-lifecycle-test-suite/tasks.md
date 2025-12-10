---
increment: 0136-process-lifecycle-test-suite
title: "Implementation Tasks - Automated Test Suite"
status: planned
estimated_tasks: 7
estimated_weeks: 1-2
phases:
  - ci-setup
  - e2e-tests
  - performance
  - beta-testing
---

# Implementation Tasks

## Phase 1: CI Matrix Setup

### T-001: Create GitHub Actions Workflow for Cross-Platform Tests
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04, AC-US1-05, AC-US1-06
**Status**: [x] completed
**Completed**: 2025-12-09
**Estimated Time**: 2 hours
**Model Hint**: ⚡ Haiku (CI configuration, clear YAML structure)

**Implementation**:
Create `.github/workflows/process-lifecycle-tests.yml`:
- Matrix strategy: [ubuntu-latest, macos-latest, windows-latest]
- Install Node.js 18+
- Run `npm run test:lifecycle` (executes unit + integration tests)
- Run platform-specific validation script
- Upload test results as artifacts
- Fail build if any platform fails

**Test Plan**:
```gherkin
Feature: CI Matrix Cross-Platform Tests
  Scenario: Workflow runs on all platforms
    Given a pull request is created
    When GitHub Actions triggers the workflow
    Then tests should run on ubuntu-latest
    And tests should run on macos-latest
    And tests should run on windows-latest
    And all platform jobs should report status

  Scenario: Platform-specific utilities validated
    Given the CI workflow is running on macOS
    When platform tests execute
    Then "stat -f %m" command should work for timestamps
    And "kill -0 <pid>" should work for process checks
    And "osascript" should work for notifications

  Scenario: Build fails on platform-specific bug
    Given a platform-specific bug exists (e.g., Windows path issue)
    When tests run on windows-latest
    Then the build should fail
    And PR checks should show failure status
    And error logs should be available

  Scenario: Test results visible in PR
    Given tests complete successfully
    When viewing the PR
    Then GitHub checks should show green checkmarks
    And test summary should be visible
    And individual test results accessible via artifacts
```

**Files**:
- `.github/workflows/process-lifecycle-tests.yml` (new)
- `package.json` (add `test:lifecycle` script)
- `tests/scripts/ci-platform-test.sh` (new helper)

**Test Coverage**:
- Unit tests: Validate workflow YAML syntax with `actionlint`
- Integration test: Trigger workflow manually, verify all platforms pass
- Acceptance test: Create PR, confirm checks appear correctly

---

## Phase 2: E2E Test Infrastructure

### T-002: Create E2E Test - Normal Session Lifecycle
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04, AC-US2-05, AC-US2-06
**Status**: [x] completed
**Completed**: 2025-12-09
**Estimated Time**: 3 hours
**Model Hint**: 💎 Opus (complex async flows, timing-sensitive)

**Implementation**:
Create `tests/e2e/normal-session-lifecycle.e2e.ts`:
- Use Vitest for test framework
- Create mock Claude Code session (spawn Node process)
- Verify registry entry created within 5s
- Verify heartbeat process running
- Wait 30s, verify heartbeat updates
- Terminate session normally (SIGTERM)
- Verify cleanup completes within 10s
- Check no zombie processes remain

Create `tests/helpers/mock-session.ts`:
- `createMockSession()` - spawns test session
- `waitForRegistry()` - polls until session appears
- `verifyHeartbeat()` - checks heartbeat updates
- `cleanupSession()` - terminates and verifies cleanup

**Test Plan**:
```gherkin
Feature: Normal Session Lifecycle E2E
  Scenario: Complete session lifecycle
    Given a clean test environment
    When I start a mock Claude Code session
    Then within 5 seconds:
      - Session should be registered in registry
      - Registry should have valid session_id
      - Heartbeat process should be running

    When I wait for 30 seconds of simulated work
    Then:
      - Heartbeat should update at least 5 times
      - Session status should remain "active"
      - No errors in session log

    When I terminate the session with SIGTERM
    Then within 10 seconds:
      - SessionEnd hook should fire
      - All child processes should be killed
      - Session should be removed from registry
      - No zombie processes matching session pattern

  Scenario: Registry state validation
    Given a mock session is running
    When I read the registry
    Then it should contain exactly 1 session entry
    And entry should have all required fields:
      - session_id (string)
      - pid (number, matches session PID)
      - start_time (ISO-8601)
      - last_heartbeat (ISO-8601, recent)
      - child_pids (array)
      - type ("claude-code")

  Scenario: Heartbeat timing accuracy
    Given a mock session with heartbeat
    When I measure heartbeat intervals over 30 seconds
    Then average interval should be 5 seconds ±1s
    And no intervals should be >10 seconds (missed heartbeats)
```

**Files**:
- `tests/e2e/normal-session-lifecycle.e2e.ts` (new)
- `tests/helpers/mock-session.ts` (new)
- `tests/helpers/test-utils.ts` (new - registry reading, process checking)

**Test Coverage**:
- Unit tests: Test helper functions in isolation
- E2E test: Full lifecycle validation
- Acceptance: Matches AC-US2-01 through AC-US2-06

---

### T-003: Create E2E Test - Crash Recovery
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04, AC-US3-05, AC-US3-06
**Status**: [x] completed
**Completed**: 2025-12-09
**Estimated Time**: 4 hours
**Model Hint**: 💎 Opus (crash scenarios, race conditions, timing-sensitive)

**Implementation**:
Create `tests/e2e/crash-recovery.e2e.ts`:
- Start mock session with heartbeat
- Kill session with SIGKILL (simulates crash)
- Verify heartbeat detects parent death within 5s
- Verify heartbeat self-terminates
- Wait 70s for cleanup service to run
- Verify all zombies cleaned up
- Check cleanup.log for actions
- Verify notification sent (if >3 processes)

Create `tests/helpers/crash-simulator.ts`:
- `simulateCrash(sessionPid)` - sends SIGKILL
- `waitForOrphanDetection()` - polls for cleanup
- `verifyCleanupLog()` - parses cleanup.log
- `checkZombieProcesses()` - finds remaining zombies by pattern

**Test Plan**:
```gherkin
Feature: Crash Recovery E2E
  Scenario: Session crashes and auto-recovers
    Given a Claude Code session with PID 12345
    And heartbeat process running (PID 12346)
    And processor daemon running (PID 12347)

    When I kill PID 12345 with SIGKILL (simulate crash)
    Then:
      - SessionEnd hook does NOT fire (crash prevents it)
      - Session registry still contains entry (no clean exit)

    When 5 seconds pass
    Then:
      - Heartbeat detects parent death (kill -0 12345 fails)
      - Heartbeat removes session from registry
      - Heartbeat self-terminates (PID 12346 exits)

    When 70 seconds pass (cleanup service 60s interval + buffer)
    Then:
      - Cleanup service detects stale processor (PID 12347)
      - Processor is killed with SIGTERM → SIGKILL
      - cleanup.log contains cleanup action

    And finally:
      - No processes matching "claude.*12345"
      - No processes matching "heartbeat.*session-12345"
      - No processes matching "processor.*session-12345"

  Scenario: Cleanup logging verification
    Given a session that crashed
    When cleanup service runs
    Then cleanup.log should contain:
      - "[INFO] Cleaning up stale session: session-12345-..."
      - "[INFO] Killed process 12347 (SIGKILL)"
      - "[INFO] Removed session: session-12345-..."
    And timestamp should be within last 2 minutes

  Scenario: Multiple child process cleanup
    Given a session with 5 child processes
    When session crashes (SIGKILL)
    And cleanup service runs
    Then all 5 child PIDs should be killed
    And cleanup.log should list all 5 PIDs
    And no child processes should remain

  Scenario: Graceful degradation on PID mismatch
    Given a stale session entry with non-existent PID
    When cleanup service tries to kill the PID
    Then it should handle "no such process" error gracefully
    And still remove the session from registry
    And log a warning (not error)
```

**Files**:
- `tests/e2e/crash-recovery.e2e.ts` (new)
- `tests/helpers/crash-simulator.ts` (new)
- `tests/helpers/log-parser.ts` (new - parse cleanup.log, session logs)

**Test Coverage**:
- E2E test: Crash detection and cleanup
- Edge cases: Non-existent PIDs, missing logs
- Acceptance: Matches AC-US3-01 through AC-US3-06

---

### T-004: Create E2E Test - Multiple Concurrent Sessions
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04, AC-US4-05, AC-US4-06
**Status**: [x] completed
**Completed**: 2025-12-09
**Estimated Time**: 3 hours
**Model Hint**: 💎 Opus (concurrency, coordination, race conditions)

**Implementation**:
Create `tests/e2e/multiple-sessions.e2e.ts`:
- Start 3 mock sessions simultaneously (Promise.all)
- Verify all 3 register successfully
- Verify only 1 watchdog daemon running
- Check registry has 3 unique session_ids
- Terminate middle session, verify others unaffected
- Terminate remaining sessions
- Verify watchdog exits after last session

Create `tests/helpers/concurrent-sessions.ts`:
- `startMultipleSessions(count)` - spawns N sessions
- `countWatchdogs()` - finds active watchdog processes
- `verifyRegistryIntegrity()` - validates JSON, no duplicates
- `terminateSession(index)` - kills specific session

**Test Plan**:
```gherkin
Feature: Multiple Concurrent Sessions E2E
  Scenario: Three concurrent sessions
    Given a clean test environment
    When I start 3 Claude Code sessions simultaneously
    Then all 3 sessions should register successfully
    And registry should contain exactly 3 session entries
    And each session should have unique session_id
    And registry JSON should remain valid (no corruption)

  Scenario: Watchdog coordination
    Given 3 active sessions
    When I check running watchdog daemons
    Then only 1 watchdog process should be running
    And watchdog should be registered in registry
    And watchdog heartbeat should be updating

  Scenario: Independent session termination
    Given 3 active sessions (session-1, session-2, session-3)
    When I terminate session-2 (middle one)
    Then:
      - Session-2 should be removed from registry
      - Session-1 and session-3 should remain active
      - Watchdog should continue running
      - Registry should have 2 entries

  Scenario: Watchdog lifecycle
    Given 3 active sessions
    And 1 watchdog daemon running
    When I terminate session-1 and session-2
    Then:
      - Watchdog continues running (session-3 still active)
    When I terminate session-3 (last session)
    Then:
      - Watchdog detects no active sessions
      - Watchdog self-terminates within 10 seconds
      - No watchdog processes remain

  Scenario: Registry concurrency validation
    Given 3 sessions updating heartbeats simultaneously
    When heartbeats occur over 1 minute (60 updates total)
    Then:
      - Registry JSON should remain valid after all updates
      - All 3 sessions should have recent heartbeat times
      - No session data should be lost
      - No file corruption detected
```

**Files**:
- `tests/e2e/multiple-sessions.e2e.ts` (new)
- `tests/helpers/concurrent-sessions.ts` (new)
- `tests/helpers/watchdog-monitor.ts` (new - track watchdog state)

**Test Coverage**:
- Concurrency test: 3 simultaneous sessions
- Coordination test: Single watchdog validation
- Acceptance: Matches AC-US4-01 through AC-US4-06

---

## Phase 3: Performance Benchmarking

### T-005: Create Performance Benchmark Suite
**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03, AC-US5-04, AC-US5-05, AC-US5-06
**Status**: [x] completed
**Completed**: 2025-12-09
**Estimated Time**: 3 hours
**Model Hint**: ⚡ Haiku (measurement scripts, data collection)

**Implementation**:
Create `tests/performance/session-registry-bench.ts`:
- Measure registry update latency (1000 iterations)
- Measure lock acquisition time
- Measure cleanup service scan time (10, 50, 100 sessions)
- Output JSON with metrics

Create `tests/performance/heartbeat-overhead-bench.sh`:
- Start heartbeat process
- Measure CPU % over 5 minutes (using `ps` or `top`)
- Measure memory (MB) over 5 minutes
- Output CSV with timestamp, CPU, memory

Create `tests/performance/baselines.json`:
- Define expected performance thresholds from 0128
- Example: `{ "registry_update_latency_ms": { "p50": 5, "p95": 15, "p99": 25 } }`

Create `tests/performance/compare-to-baseline.ts`:
- Read current benchmark results
- Compare to baselines.json
- Fail if >20% regression detected
- Output comparison report

**Test Plan**:
```gherkin
Feature: Performance Benchmarking
  Scenario: Registry update latency
    Given a registry with 100 sessions
    When I update heartbeat 1000 times
    Then average latency should be <5ms (p50)
    And p95 latency should be <15ms
    And p99 latency should be <25ms
    And no updates should fail

  Scenario: Heartbeat process overhead
    Given a running heartbeat process
    When I measure CPU and memory over 5 minutes
    Then average CPU usage should be <1%
    And average memory usage should be <10MB
    And no spikes >2% CPU or >20MB memory

  Scenario: Cleanup service scalability
    Given a registry with 100 sessions (50 stale, 50 active)
    When cleanup service scans the registry
    Then scan time should be <500ms
    And cleanup of 50 stale sessions should complete <2s
    And active sessions should not be affected

  Scenario: Baseline comparison
    Given current benchmark results
    When compared to baselines
    Then no metric should be >20% slower
    And report should show green (pass) or red (fail)
    And failing metrics should be highlighted

  Scenario: Historical tracking
    Given benchmark results from multiple runs
    When I generate a trend report
    Then I should see latency over time (CSV or JSON)
    And detect gradual degradation (e.g., 5% slower per month)
```

**Files**:
- `tests/performance/session-registry-bench.ts` (new)
- `tests/performance/heartbeat-overhead-bench.sh` (new)
- `tests/performance/cleanup-service-bench.sh` (new)
- `tests/performance/baselines.json` (new)
- `tests/performance/compare-to-baseline.ts` (new)
- `tests/performance/README.md` (usage instructions)

**Test Coverage**:
- Unit tests: Validate benchmark scripts run without errors
- Acceptance: Matches AC-US5-01 through AC-US5-06

---

## Phase 4: Beta Testing Infrastructure

### T-006: Create Beta Testing Tools and Documentation
**User Story**: US-006
**Satisfies ACs**: AC-US6-01, AC-US6-02, AC-US6-03, AC-US6-04, AC-US6-05, AC-US6-06
**Status**: [x] completed
**Completed**: 2025-12-09
**Estimated Time**: 3 hours
**Model Hint**: ⚡ Haiku (documentation, scripting)

**Implementation**:
Create `scripts/beta/collect-metrics.sh`:
- Count cleanup events from cleanup.log
- Count notifications sent
- Count errors in session logs
- Measure zombie process incidents
- Output JSON summary

Create `docs/beta-testing-guide.md`:
- Prerequisites (SpecWeave installed, platforms)
- Installation instructions
- How to enable metrics collection
- What to look for during testing
- How to report issues

Create `docs/beta-feedback-template.md`:
- System info (OS, Node version, SpecWeave version)
- Questions:
  - Manual cleanups needed? (target: 0)
  - False positive notifications? (target: <3)
  - Performance impact noticed? (target: none)
  - Bugs encountered? (target: 0 critical)
  - Overall satisfaction (1-5 scale)

Create `scripts/beta/analyze-metrics.sh`:
- Read metrics from all beta testers
- Aggregate statistics
- Generate beta report markdown
- Highlight issues requiring fixes

**Test Plan**:
```gherkin
Feature: Beta Testing Infrastructure
  Scenario: Metrics collection
    Given a developer is beta testing for 1 week
    When they run collect-metrics.sh
    Then it should output:
      - Total cleanup events (number)
      - Total notifications sent (number)
      - Error count (number)
      - Zombie incidents (number)
      - Uptime (hours)

  Scenario: Deployment on multiple platforms
    Given beta testing guide
    When deploying to macOS, Linux, Windows
    Then all 3 deployments should succeed
    And metrics collection should work on all platforms

  Scenario: Feedback collection
    Given 3 beta testers (1 per platform)
    When they complete feedback template
    Then all required fields should be filled
    And satisfaction scores should be recorded

  Scenario: Analysis report generation
    Given metrics from 3 beta testers
    When running analyze-metrics.sh
    Then it should generate a report with:
      - Aggregate statistics (avg cleanups, notifications, errors)
      - Platform breakdown
      - Critical issues list
      - Go/no-go recommendation
```

**Files**:
- `scripts/beta/collect-metrics.sh` (new)
- `scripts/beta/analyze-metrics.sh` (new)
- `docs/beta-testing-guide.md` (new)
- `docs/beta-feedback-template.md` (new)
- `docs/beta-testing-checklist.md` (new)

**Test Coverage**:
- Unit tests: Validate scripts run without errors
- Integration test: Run metrics collection on test data
- Acceptance: Matches AC-US6-01 through AC-US6-06

---

## Phase 5: Integration & Validation

### T-007: Integrate Tests into CI and Validate End-to-End
**User Story**: All
**Satisfies ACs**: Multiple
**Status**: [x] completed
**Completed**: 2025-12-09
**Estimated Time**: 2 hours
**Model Hint**: ⚡ Haiku (integration, validation)

**Implementation**:
- Add `test:e2e` script to package.json
- Add `test:performance` script to package.json
- Update CI workflow to run all test suites
- Create test summary badge for README
- Run full test suite locally on all platforms
- Validate all ACs from US-001 through US-006

**Test Plan**:
```gherkin
Feature: Full Test Suite Integration
  Scenario: All tests pass locally
    Given all test files created
    When I run "npm run test:lifecycle"
    Then:
      - Unit tests should pass (25 session-registry tests)
      - E2E tests should pass (3 scenarios)
      - Performance benchmarks should complete
      - No test failures

  Scenario: CI workflow runs all tests
    Given a pull request is created
    When GitHub Actions triggers
    Then CI should run:
      - Unit tests
      - E2E tests
      - Performance benchmarks
      - Platform validation
    And all jobs should pass on all platforms

  Scenario: Test coverage validation
    Given test suite execution
    When coverage is measured
    Then coverage should be >80%
    And all critical paths should be covered

  Scenario: Acceptance criteria validation
    Given spec.md with 6 user stories
    When reviewing test suite
    Then all 36 ACs should be covered by tests
    And each AC should map to specific test case
```

**Files**:
- `package.json` (update scripts section)
- `.github/workflows/process-lifecycle-tests.yml` (update)
- `tests/acceptance/ac-coverage-check.ts` (new - validates AC coverage)

**Test Coverage**:
- Integration test: Full suite execution
- Coverage check: >80% target
- Acceptance: All 36 ACs validated

---

## Summary

**Total Tasks**: 7
**Estimated Effort**: 1-2 weeks (16 hours implementation + 1 week passive beta)

**Critical Path**:
1. CI Matrix Setup (T-001) → 2 hours
2. E2E Tests (T-002, T-003, T-004) → 10 hours
3. Performance Benchmarks (T-005) → 3 hours
4. Beta Testing Setup (T-006) → 3 hours
5. Integration (T-007) → 2 hours

**Dependencies**:
- All tasks depend on increment 0128 being completed ✅
- T-002, T-003, T-004 can run in parallel
- T-005 can run in parallel with E2E tests
- T-007 depends on T-001 through T-006 completion

**Risks**:
- Platform-specific test failures (mitigate: test locally before CI)
- Flaky E2E tests (mitigate: use polling with timeouts, no hard sleeps)
- CI runtime too long (mitigate: parallelize, cache dependencies)

## Test Mode

**Test Mode**: test-after (from config)
**Coverage Target**: 80%

**Test Strategy**:
1. Implement test infrastructure first (T-001)
2. Implement E2E tests (T-002, T-003, T-004)
3. Run tests to validate implementation
4. Add performance benchmarks (T-005)
5. Setup beta testing (T-006)
6. Validate coverage >80% (T-007)
