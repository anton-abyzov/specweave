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
**Status**: [ ] pending
**Model**: opus

**Description**: Create TypeScript module that analyzes prompts and extracts discrete features.

**Test**: Given "Build e-commerce with auth, products, cart, checkout" → When analyzing → Then extracts 4 features

**Acceptance**:
- [ ] Create src/core/auto/prompt-chunker.ts
- [ ] Implement extractFeatures() using NLP patterns
- [ ] Identify feature boundaries (and, with, including, etc.)
- [ ] Estimate complexity per feature
- [ ] Export for use in setup-auto.sh

---

### T-009: Implement increment planning algorithm
**User Story**: US-001
**Satisfies ACs**: AC-US1-02, AC-US1-03
**Status**: [ ] pending
**Model**: opus

**Description**: Group features into right-sized increments (5-15 tasks) with dependency tracking.

**Test**: Given 4 features with varying complexity → When planning → Then creates 2-4 increments

**Acceptance**:
- [ ] Target 5-15 tasks per increment
- [ ] Prefer single deliverable per increment
- [ ] Identify dependencies (auth before checkout)
- [ ] Order increments by dependency
- [ ] Return IncrementPlan[] with descriptions

---

### T-010: Add user approval step for increment plan
**User Story**: US-001
**Satisfies ACs**: AC-US1-04, AC-US1-05
**Status**: [ ] pending
**Model**: opus

**Description**: Before creating increments, show plan to user and get approval.

**Test**: Given increment plan → When showing to user → Then waits for approval/modification

**Acceptance**:
- [ ] Display plan with increment names and task estimates
- [ ] Show dependencies between increments
- [ ] Allow user to approve, modify, or cancel
- [ ] Support --yes flag to skip approval
- [ ] Log approved plan

---

### T-011: Integrate chunking into /sw:auto command
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-05
**Status**: [ ] pending
**Model**: opus

**Description**: Update auto.md command and setup-auto.sh to use chunking when big prompt provided.

**Test**: Given /sw:auto "big feature" → When executing → Then chunks before setup

**Acceptance**:
- [ ] Detect when prompt (not increment ID) is provided
- [ ] Call prompt-chunker for analysis
- [ ] Create increments via /sw:increment
- [ ] Queue created increments in session
- [ ] Update auto.md documentation

---

## Phase 4: E2E Coverage Manifest (P1)

### T-012: Create E2E coverage manifest generator
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02
**Status**: [ ] pending
**Model**: opus

**Description**: Auto-generate manifest from project routes (Next.js, React Router, etc.).

**Test**: Given Next.js app with /pages → When generating → Then manifest includes all routes

**Acceptance**:
- [ ] Detect framework (Next.js pages/app, React Router, etc.)
- [ ] Extract all routes from file structure
- [ ] Create .specweave/state/e2e-manifest.json
- [ ] Mark routes as tested: false initially
- [ ] Support manual routes.json override

---

### T-013: Track route coverage during test runs
**User Story**: US-004
**Satisfies ACs**: AC-US4-02, AC-US4-03
**Status**: [ ] pending
**Model**: opus

**Description**: Update manifest as E2E tests execute and visit routes.

**Test**: Given E2E test visiting /login → When parsing output → Then manifest marks /login as tested

**Acceptance**:
- [ ] Parse playwright output for page.goto() calls
- [ ] Update manifest with tested routes
- [ ] Track which viewports tested each route
- [ ] Persist updated manifest

---

### T-014: Add manifest check to stop hook
**User Story**: US-004
**Satisfies ACs**: AC-US4-05, AC-US4-06
**Status**: [ ] pending
**Model**: opus

**Description**: Stop hook blocks completion if E2E coverage manifest is incomplete.

**Test**: Given manifest with 3/5 routes tested → When checking → Then blocks with coverage gap

**Acceptance**:
- [ ] Load manifest from .specweave/state/
- [ ] Calculate coverage percentage
- [ ] Block if coverage < threshold (configurable, default 80%)
- [ ] Include untested routes in block message
- [ ] Skip check if no manifest (non-UI project)

---

## Phase 5: Multi-Viewport Enforcement (P1)

### T-015: Detect viewport configuration
**User Story**: US-005
**Satisfies ACs**: AC-US5-01
**Status**: [ ] pending
**Model**: opus

**Description**: Parse playwright.config.ts to detect configured viewports/projects.

**Test**: Given config with mobile, tablet, desktop → When parsing → Then returns viewport list

**Acceptance**:
- [ ] Parse playwright.config.ts/js
- [ ] Extract projects with viewport settings
- [ ] Identify mobile (<=480), tablet (<=768), desktop (>768)
- [ ] Cache results for stop hook

---

### T-016: Verify viewport coverage in stop hook
**User Story**: US-005
**Satisfies ACs**: AC-US5-02, AC-US5-03, AC-US5-04
**Status**: [ ] pending
**Model**: opus

**Description**: Stop hook verifies tests ran on all required viewports.

**Test**: Given config with 3 viewports but only 2 tested → When checking → Then blocks

**Acceptance**:
- [ ] Parse test output for viewport indicators
- [ ] Compare against required viewports
- [ ] Block if any viewport missing
- [ ] Include missing viewports in block message

---

## Phase 6: UI/UX Quality Gates (P2)

### T-017: Add accessibility audit to completion check
**User Story**: US-006
**Satisfies ACs**: AC-US6-01, AC-US6-02
**Status**: [ ] pending
**Model**: opus

**Description**: Run axe-core audit and block on critical accessibility violations.

**Test**: Given page with missing alt text → When auditing → Then blocks with violation

**Acceptance**:
- [ ] Detect if @axe-core/playwright installed
- [ ] Parse accessibility results from output
- [ ] Block on "critical" or "serious" violations
- [ ] Allow "moderate" and "minor" with warning
- [ ] Include violation details in block message

---

### T-018: Check for console errors in E2E output
**User Story**: US-006
**Satisfies ACs**: AC-US6-03
**Status**: [ ] pending
**Model**: opus

**Description**: Parse E2E test output for console errors and block if found.

**Test**: Given E2E output with console.error → When checking → Then blocks

**Acceptance**:
- [ ] Parse for "console.error" patterns
- [ ] Parse for uncaught exceptions
- [ ] Exclude expected/handled errors
- [ ] Block on unexpected console errors
- [ ] Include error messages in block

---

### T-019: Verify loading/error/empty states tested
**User Story**: US-006
**Satisfies ACs**: AC-US6-04, AC-US6-05, AC-US6-06
**Status**: [ ] pending
**Model**: opus

**Description**: Check that E2E tests cover loading, error, and empty states.

**Test**: Given E2E tests → When analyzing → Then verifies state coverage

**Acceptance**:
- [ ] Detect loading state tests (skeleton, spinner)
- [ ] Detect error state tests (error boundary, 404, 500)
- [ ] Detect empty state tests (no data, no results)
- [ ] Warn if states not tested (not block)
- [ ] Include in coverage report

---

## Phase 7: Increment Queue Transition (P1)

### T-020: Implement increment completion transition
**User Story**: US-007
**Satisfies ACs**: AC-US7-01, AC-US7-02
**Status**: [ ] pending
**Model**: opus

**Description**: When current increment completes, auto-transition to next in queue.

**Test**: Given queue [0001, 0002] with 0001 complete → When transitioning → Then starts 0002

**Acceptance**:
- [ ] Detect all tasks complete for current increment
- [ ] Move current to completedIncrements array
- [ ] Pop next from incrementQueue
- [ ] Update currentIncrement
- [ ] Log transition

---

### T-021: Add transition summary to stop hook
**User Story**: US-007
**Satisfies ACs**: AC-US7-03
**Status**: [ ] pending
**Model**: opus

**Description**: Include summary of completed increment when transitioning.

**Test**: Given completed increment → When transitioning → Then shows summary

**Acceptance**:
- [ ] Count completed tasks
- [ ] Count passed tests
- [ ] Calculate duration
- [ ] Include in block message for next increment
- [ ] Save summary to logs

---

### T-022: Handle failed increment without blocking queue
**User Story**: US-007
**Satisfies ACs**: AC-US7-04
**Status**: [ ] pending
**Model**: opus

**Description**: If increment fails (human gate), allow skipping to continue queue.

**Test**: Given failed increment → When user approves skip → Then continues to next

**Acceptance**:
- [ ] Add skip option to human gate
- [ ] Move failed to failedIncrements array
- [ ] Continue to next in queue
- [ ] Log failure reason
- [ ] Include failed summary in final report

---

## Phase 8: Testing & Documentation

### T-023: Add integration tests for test result parsing
**User Story**: US-002
**Satisfies ACs**: AC-US2-05
**Status**: [ ] pending
**Model**: opus

**Description**: Create comprehensive tests for all test framework outputs.

**Test**: Given sample outputs from all frameworks → When parsing → Then accurate results

**Acceptance**:
- [ ] Test vitest output parsing
- [ ] Test jest output parsing
- [ ] Test playwright output parsing
- [ ] Test pytest output parsing
- [ ] Test go test output parsing
- [ ] Test mixed/complex outputs

---

### T-024: Add integration tests for self-healing loop
**User Story**: US-003
**Satisfies ACs**: AC-US3-01 to AC-US3-06
**Status**: [ ] pending
**Model**: opus

**Description**: Test full self-healing loop behavior.

**Test**: Given failing tests → When loop runs 3x → Then escalates to human

**Acceptance**:
- [ ] Test retry counter increment
- [ ] Test failure prompt generation
- [ ] Test human gate after 3 failures
- [ ] Test retry counter reset on success
- [ ] Test multiple tasks with different retry counts

---

### T-025: Update auto.md documentation
**User Story**: US-001
**Satisfies ACs**: AC-US1-01 to AC-US1-05
**Status**: [ ] pending
**Model**: opus

**Description**: Update command documentation with new features.

**Acceptance**:
- [ ] Document intelligent chunking behavior
- [ ] Document self-healing loop
- [ ] Document E2E coverage manifest
- [ ] Document quality gates
- [ ] Add examples for each feature

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
