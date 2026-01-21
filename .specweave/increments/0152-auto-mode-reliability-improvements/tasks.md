# Tasks: Auto Mode Reliability Improvements

## Implementation Tasks

### T-001: Add Xcode/iOS Test Parsing
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04
**Status**: [x] completed

Add Xcode and Swift test output parsing to stop-auto.sh.

**Test**: Given xcodebuild test output with "Executed 10 tests, with 2 failures" → When parse_test_results runs → Then returns {passed:8, failed:2, framework:"xcode"}

---

### T-002: Add Generic Exit Code Detection
**User Story**: US-007
**Satisfies ACs**: AC-US7-01, AC-US7-02, AC-US7-03, AC-US7-04
**Status**: [x] completed

Implement generic test result detection based on exit codes and universal patterns.

**Test**: Given unknown test framework with exit code 1 → When parse_test_results runs → Then returns {testsRun:true, failed:1, framework:"generic"}

---

### T-003: Implement Failure Classification System
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04, AC-US4-05
**Status**: [x] completed

Create intelligent failure classification with different handling strategies.

**Test**: Given "ECONNREFUSED" error → When classify_failure runs → Then returns "transient" and triggers immediate retry

---

### T-004: Add Command Timeout Handling
**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03, AC-US5-04
**Status**: [x] completed

Implement timeout wrapper for test commands with configurable limits.

**Test**: Given test command running >10 minutes → When timeout triggers → Then command killed gracefully and timeout logged

---

### T-005: Implement Context Size Estimation
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-04
**Status**: [x] completed

Add context size estimation based on transcript file size.

**Test**: Given transcript file of 700KB → When estimate_context_size runs → Then returns ~175000 tokens and flags "near_limit"

---

### T-006: Add Compaction Trigger Logic
**User Story**: US-001
**Satisfies ACs**: AC-US1-02, AC-US1-03
**Status**: [x] completed

Trigger /compact command when context threshold exceeded, with state preservation.

**Test**: Given context estimate >150k tokens → When stop hook runs → Then outputs compaction request in system message

---

### T-007: Implement Heartbeat Mechanism
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-04
**Status**: [x] completed

Add heartbeat file updates during active auto mode execution.

**Test**: Given active auto session → When 30 seconds pass → Then heartbeat.json timestamp updated

---

### T-008: Implement Watchdog Detection
**User Story**: US-002
**Satisfies ACs**: AC-US2-02, AC-US2-03
**Status**: [x] completed

Add watchdog logic to detect stale sessions with no recent heartbeat.

**Test**: Given heartbeat >5 minutes old → When stop hook checks → Then logs warning and marks session as potentially stale

---

### T-009: Implement Task-Level Checkpoints
**User Story**: US-006
**Satisfies ACs**: AC-US6-01, AC-US6-02, AC-US6-03, AC-US6-04
**Status**: [x] completed

Add checkpoint file creation/cleanup at task boundaries.

**Test**: Given task T-003 starting → When checkpoint created → Then file contains task ID, timestamp, and context

---

### T-010: Write E2E Tests for Xcode Parsing
**User Story**: US-008
**Satisfies ACs**: AC-US8-03
**Status**: [x] completed

Create E2E test for Xcode test output parsing.

**Test**: Given sample Xcode output file → When test runs stop-auto.sh → Then correctly parses results

---

### T-011: Write E2E Tests for Failure Classification
**User Story**: US-008
**Satisfies ACs**: AC-US8-04
**Status**: [x] completed

Create E2E test for failure classification system.

**Test**: Given various error patterns → When classification runs → Then each error correctly categorized

---

### T-012: Write E2E Tests for Timeout Handling
**User Story**: US-008
**Satisfies ACs**: AC-US8-05
**Status**: [x] completed

Create E2E test for command timeout handling.

**Test**: Given slow command exceeding timeout → When wrapper runs → Then command terminated and logged

---

### T-013: Write E2E Tests for Context Management
**User Story**: US-008
**Satisfies ACs**: AC-US8-01
**Status**: [x] completed

Create E2E test for context size estimation and compaction trigger.

**Test**: Given large transcript file → When stop hook runs → Then compaction triggered

---

### T-014: Write E2E Tests for Watchdog
**User Story**: US-008
**Satisfies ACs**: AC-US8-02
**Status**: [x] completed

Create E2E test for watchdog mechanism.

**Test**: Given stale heartbeat → When watchdog checks → Then stale session detected

---

### T-015: Write E2E Tests for Checkpoints
**User Story**: US-008
**Satisfies ACs**: AC-US8-06
**Status**: [x] completed

Create E2E test for task-level checkpoints.

**Test**: Given checkpoint file exists → When resume logic runs → Then partial task detected

---

### T-016: Write E2E Tests for Generic Framework Detection
**User Story**: US-008
**Satisfies ACs**: AC-US8-07
**Status**: [x] completed

Create E2E test for generic test framework detection.

**Test**: Given unknown framework output → When parse_test_results runs → Then uses exit code fallback

---

### T-017: Update Documentation
**User Story**: US-001, US-002, US-003, US-004, US-005, US-006, US-007
**Satisfies ACs**: All
**Status**: [x] completed

Update auto.md command documentation with new features.

**Test**: Given documentation → When reviewed → Then all new features documented

---

### T-018: Integration Testing
**User Story**: US-008
**Satisfies ACs**: All
**Status**: [x] completed

Run full integration test of all improvements together.

**Test**: Given all improvements implemented → When auto mode runs on test project → Then all features work together
