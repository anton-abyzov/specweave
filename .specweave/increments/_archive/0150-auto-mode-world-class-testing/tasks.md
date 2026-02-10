# Tasks: Auto Mode World-Class Testing

## Phase 1: Stop Hook Test Result Parsing (P0)

### T-001: Implement test result parser function
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-04, AC-US2-05
**Status**: [x] completed
**Model**: opus

**Description**: Create `parse_test_results()` function in stop-auto.sh that accurately parses test output from multiple frameworks.

**Test**: Given transcript with "5 passed, 2 failed" → When parsing → Then returns {passed: 5, failed: 2}

**Acceptance**:
- [x] Parses vitest output: "Tests: 5 passed, 2 failed"
- [x] Parses jest output: "Tests: 5 passed, 2 failed, 7 total"
- [x] Parses playwright output: "5 passed (10s)" and "2 failed"
- [x] Parses pytest output: "5 passed, 2 failed in 3.2s"
- [x] Parses go test output: "PASS" / "FAIL"
- [x] Returns accurate counts for mixed results

---

### T-002: Implement failure detail extractor
**User Story**: US-002
**Satisfies ACs**: AC-US2-02
**Status**: [x] completed
**Model**: opus

**Description**: Create `extract_failure_details()` function that extracts specific test name, file:line, and error message from transcript.

**Test**: Given transcript with failing test → When extracting → Then returns {file, line, testName, error, expected, received}

**Acceptance**:
- [x] Extracts file path from stack trace
- [x] Extracts line number
- [x] Extracts test name/description
- [x] Extracts error message
- [x] Extracts expected vs received values (if available)
- [x] Handles multiple failure formats (vitest, jest, playwright)

---

### T-003: Replace weak grep with proper result verification
**User Story**: US-002
**Satisfies ACs**: AC-US2-03
**Status**: [x] completed
**Model**: opus

**Description**: Replace current grep-based test detection with actual result parsing. Block completion on ANY test failure.

**Test**: Given transcript with 158 pass + 3 fail → When stop hook runs → Then blocks with failure details

**Acceptance**:
- [x] Removes old "grep for command" logic
- [x] Uses parse_test_results() for actual counts
- [x] Blocks if failed > 0 (not just >3)
- [x] Includes accurate counts in block message

---

## Phase 2: Self-Healing Test Loop (P0)

### T-004: Add testRetryCount to session state
**User Story**: US-003
**Satisfies ACs**: AC-US3-01
**Status**: [x] completed
**Model**: opus

**Description**: Extend SessionState interface and stop hook to track retry attempts per task.

**Test**: Given session with retryCount=0 → When test fails → Then retryCount increments to 1

**Acceptance**:
- [x] Add testRetryCount field to session JSON
- [x] Add currentTaskId field to track which task is being retried
- [x] Initialize to 0 on session start
- [x] Increment on each test failure
- [x] Persist to auto-session.json

---

### T-005: Implement self-healing block prompt
**User Story**: US-003
**Satisfies ACs**: AC-US3-02, AC-US3-04
**Status**: [x] completed
**Model**: opus

**Description**: Create rich failure prompt that includes specific error details and fix instructions.

**Test**: Given test failure in auth.spec.ts:45 → When creating prompt → Then includes file:line, error, and fix instruction

**Acceptance**:
- [x] Prompt includes attempt count (e.g., "attempt 2/3")
- [x] Prompt includes extracted failure details
- [x] Prompt includes specific fix instruction
- [x] Prompt is injected via systemMessage in block response
- [x] Failure is logged to auto-iterations.log

---

### T-006: Implement retry exhaustion → human gate
**User Story**: US-003
**Satisfies ACs**: AC-US3-03, AC-US3-05
**Status**: [x] completed
**Model**: opus

**Description**: After 3 failed attempts, stop retrying and pause for human review.

**Test**: Given retryCount=3 → When test fails again → Then session pauses with human gate

**Acceptance**:
- [x] Check retryCount >= 3 before blocking
- [x] Set session status to "paused"
- [x] Set pauseReason to "test_failures_exhausted"
- [x] Include all 3 attempts in pause message
- [x] Approve exit to allow human intervention

---

### T-007: Reset retry counter on task completion
**User Story**: US-003
**Satisfies ACs**: AC-US3-06
**Status**: [x] completed
**Model**: opus

**Description**: When tests pass and task completes, reset retry counter for next task.

**Test**: Given retryCount=2 → When all tests pass → Then retryCount resets to 0

**Acceptance**:
- [x] Detect task completion (tasks.md updated)
- [x] Reset testRetryCount to 0
- [x] Update currentTaskId to next task
- [x] Log successful completion

---

## Phase 3: Intelligent Prompt Chunking (P0)

### T-008: Create prompt-chunker module
**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [x] completed
**Model**: opus

**Description**: Create TypeScript module that analyzes prompts and extracts discrete features.

**Test**: Given "Build e-commerce with auth, products, cart, checkout" → When analyzing → Then extracts 4 features

**Acceptance**:
- [x] Create src/core/auto/prompt-chunker.ts
- [x] Implement extractFeatures() using NLP patterns
- [x] Identify feature boundaries (and, with, including, etc.)
- [x] Estimate complexity per feature
- [x] Export for use in setup-auto.sh

---

### T-009: Implement increment planning algorithm
**User Story**: US-001
**Satisfies ACs**: AC-US1-02, AC-US1-03
**Status**: [x] completed
**Model**: opus

**Description**: Group features into right-sized increments (5-15 tasks) with dependency tracking.

**Test**: Given 4 features with varying complexity → When planning → Then creates 2-4 increments

**Acceptance**:
- [x] Target 5-15 tasks per increment
- [x] Prefer single deliverable per increment
- [x] Identify dependencies (auth before checkout)
- [x] Order increments by dependency
- [x] Return IncrementPlan[] with descriptions

---

### T-010: Add user approval step for increment plan
**User Story**: US-001
**Satisfies ACs**: AC-US1-04, AC-US1-05
**Status**: [x] completed
**Model**: opus

**Description**: Before creating increments, show plan to user and get approval.

**Test**: Given increment plan → When showing to user → Then waits for approval/modification

**Acceptance**:
- [x] Display plan with increment names and task estimates
- [x] Show dependencies between increments
- [x] Allow user to approve, modify, or cancel
- [x] Support --yes flag to skip approval
- [x] Log approved plan

---

### T-011: Integrate chunking into /sw:auto command
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-05
**Status**: [x] completed
**Model**: opus

**Description**: Update auto.md command and setup-auto.sh to use chunking when big prompt provided.

**Test**: Given /sw:auto "big feature" → When executing → Then chunks before setup

**Acceptance**:
- [x] Detect when prompt (not increment ID) is provided
- [x] Call prompt-chunker for analysis
- [x] Create increments via /sw:increment
- [x] Queue created increments in session
- [x] Update auto.md documentation

---

## Phase 4: E2E Coverage Manifest (P1)

### T-012: Create E2E coverage manifest generator
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02
**Status**: [x] completed
**Model**: opus

**Description**: Auto-generate manifest from project routes (Next.js, React Router, etc.).

**Test**: Given Next.js app with /pages → When generating → Then manifest includes all routes

**Acceptance**:
- [x] Detect framework (Next.js pages/app, React Router, etc.)
- [x] Extract all routes from file structure
- [x] Create .specweave/state/e2e-manifest.json
- [x] Mark routes as tested: false initially
- [x] Support manual routes.json override

---

### T-013: Track route coverage during test runs
**User Story**: US-004
**Satisfies ACs**: AC-US4-02, AC-US4-03
**Status**: [x] completed
**Model**: opus

**Description**: Update manifest as E2E tests execute and visit routes.

**Test**: Given E2E test visiting /login → When parsing output → Then manifest marks /login as tested

**Acceptance**:
- [x] Parse playwright output for page.goto() calls
- [x] Update manifest with tested routes
- [x] Track which viewports tested each route
- [x] Persist updated manifest

---

### T-014: Add manifest check to stop hook
**User Story**: US-004
**Satisfies ACs**: AC-US4-05, AC-US4-06
**Status**: [x] completed
**Model**: opus

**Description**: Stop hook blocks completion if E2E coverage manifest is incomplete.

**Test**: Given manifest with 3/5 routes tested → When checking → Then blocks with coverage gap

**Acceptance**:
- [x] Load manifest from .specweave/state/
- [x] Calculate coverage percentage
- [x] Block if coverage < threshold (configurable, default 80%)
- [x] Include untested routes in block message
- [x] Skip check if no manifest (non-UI project)

---

## Phase 5: Multi-Viewport Enforcement (P1)

### T-015: Detect viewport configuration
**User Story**: US-005
**Satisfies ACs**: AC-US5-01
**Status**: [x] completed
**Model**: opus

**Description**: Parse playwright.config.ts to detect configured viewports/projects.

**Test**: Given config with mobile, tablet, desktop → When parsing → Then returns viewport list

**Acceptance**:
- [x] Parse playwright.config.ts/js
- [x] Extract projects with viewport settings
- [x] Identify mobile (<=480), tablet (<=768), desktop (>768)
- [x] Cache results for stop hook

---

### T-016: Verify viewport coverage in stop hook
**User Story**: US-005
**Satisfies ACs**: AC-US5-02, AC-US5-03, AC-US5-04
**Status**: [x] completed
**Model**: opus

**Description**: Stop hook verifies tests ran on all required viewports.

**Test**: Given config with 3 viewports but only 2 tested → When checking → Then blocks

**Acceptance**:
- [x] Parse test output for viewport indicators
- [x] Compare against required viewports
- [x] Block if any viewport missing
- [x] Include missing viewports in block message

---

## Phase 6: UI/UX Quality Gates (P2)

### T-017: Add accessibility audit to completion check
**User Story**: US-006
**Satisfies ACs**: AC-US6-01, AC-US6-02
**Status**: [x] completed
**Model**: opus

**Description**: Run axe-core audit and block on critical accessibility violations.

**Test**: Given page with missing alt text → When auditing → Then blocks with violation

**Acceptance**:
- [x] Detect if @axe-core/playwright installed
- [x] Parse accessibility results from output
- [x] Block on "critical" or "serious" violations
- [x] Allow "moderate" and "minor" with warning
- [x] Include violation details in block message

---

### T-018: Check for console errors in E2E output
**User Story**: US-006
**Satisfies ACs**: AC-US6-03
**Status**: [x] completed
**Model**: opus

**Description**: Parse E2E test output for console errors and block if found.

**Test**: Given E2E output with console.error → When checking → Then blocks

**Acceptance**:
- [x] Parse for "console.error" patterns
- [x] Parse for uncaught exceptions
- [x] Exclude expected/handled errors
- [x] Block on unexpected console errors
- [x] Include error messages in block

---

### T-019: Verify loading/error/empty states tested
**User Story**: US-006
**Satisfies ACs**: AC-US6-04, AC-US6-05, AC-US6-06
**Status**: [x] completed
**Model**: opus

**Description**: Check that E2E tests cover loading, error, and empty states.

**Test**: Given E2E tests → When analyzing → Then verifies state coverage

**Acceptance**:
- [x] Detect loading state tests (skeleton, spinner)
- [x] Detect error state tests (error boundary, 404, 500)
- [x] Detect empty state tests (no data, no results)
- [x] Warn if states not tested (not block)
- [x] Include in coverage report

---

## Phase 7: Increment Queue Transition (P1)

### T-020: Implement increment completion transition
**User Story**: US-007
**Satisfies ACs**: AC-US7-01, AC-US7-02
**Status**: [x] completed
**Model**: opus

**Description**: When current increment completes, auto-transition to next in queue.

**Test**: Given queue [0001, 0002] with 0001 complete → When transitioning → Then starts 0002

**Acceptance**:
- [x] Detect all tasks complete for current increment
- [x] Move current to completedIncrements array
- [x] Pop next from incrementQueue
- [x] Update currentIncrement
- [x] Log transition

---

### T-021: Add transition summary to stop hook
**User Story**: US-007
**Satisfies ACs**: AC-US7-03
**Status**: [x] completed
**Model**: opus

**Description**: Include summary of completed increment when transitioning.

**Test**: Given completed increment → When transitioning → Then shows summary

**Acceptance**:
- [x] Count completed tasks
- [x] Count passed tests
- [x] Calculate duration
- [x] Include in block message for next increment
- [x] Save summary to logs

---

### T-022: Handle failed increment without blocking queue
**User Story**: US-007
**Satisfies ACs**: AC-US7-04
**Status**: [x] completed
**Model**: opus

**Description**: If increment fails (human gate), allow skipping to continue queue.

**Test**: Given failed increment → When user approves skip → Then continues to next

**Acceptance**:
- [x] Add skip option to human gate
- [x] Move failed to failedIncrements array
- [x] Continue to next in queue
- [x] Log failure reason
- [x] Include failed summary in final report

---

## Phase 8: Testing & Documentation

### T-023: Add integration tests for test result parsing
**User Story**: US-002
**Satisfies ACs**: AC-US2-05
**Status**: [x] completed
**Model**: opus

**Description**: Create comprehensive tests for all test framework outputs.

**Test**: Given sample outputs from all frameworks → When parsing → Then accurate results

**Acceptance**:
- [x] Test vitest output parsing
- [x] Test jest output parsing
- [x] Test playwright output parsing
- [x] Test pytest output parsing
- [x] Test go test output parsing
- [x] Test mixed/complex outputs

---

### T-024: Add integration tests for self-healing loop
**User Story**: US-003
**Satisfies ACs**: AC-US3-01 to AC-US3-06
**Status**: [x] completed
**Model**: opus

**Description**: Test full self-healing loop behavior.

**Test**: Given failing tests → When loop runs 3x → Then escalates to human

**Acceptance**:
- [x] Test retry counter increment
- [x] Test failure prompt generation
- [x] Test human gate after 3 failures
- [x] Test retry counter reset on success
- [x] Test multiple tasks with different retry counts

---

### T-025: Update auto.md documentation
**User Story**: US-001
**Satisfies ACs**: AC-US1-01 to AC-US1-05
**Status**: [x] completed
**Model**: opus

**Description**: Update command documentation with new features.

**Acceptance**:
- [x] Document intelligent chunking behavior
- [x] Document self-healing loop
- [x] Document E2E coverage manifest
- [x] Document quality gates
- [x] Add examples for each feature

---

## Summary

| Phase | Tasks | Priority | Status |
|-------|-------|----------|--------|
| 1. Test Result Parsing | T-001 to T-003 | P0 | Pending |
| 2. Self-Healing Loop | T-004 to T-007 | P0 | Pending |
| 3. Intelligent Chunking | T-008 to T-011 | P0 | Pending |
| 4. E2E Coverage Manifest | T-012 to T-014 | P1 | Pending |
| 5. Multi-Viewport | T-015 to T-016 | P1 | Pending |
| 6. UI/UX Quality Gates | T-017 to T-019 | P2 | Pending |
| 7. Increment Transition | T-020 to T-022 | P1 | Pending |
| 8. Testing & Docs | T-023 to T-025 | P0 | Pending |

**Total Tasks**: 25
**P0 (Critical)**: 14
**P1 (High)**: 8
**P2 (Medium)**: 3
