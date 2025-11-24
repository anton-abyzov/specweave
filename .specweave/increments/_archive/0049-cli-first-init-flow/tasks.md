---
total_tasks: 28
completed: 28
by_user_story:
  US-001: 6
  US-002: 6
  US-003: 6
  US-004: 6
  US-005: 4
test_mode: test-after
coverage_target: 85
---

# Tasks: CLI-First Init Flow with Smart Pagination

**Increment**: 0049-cli-first-init-flow
**Feature**: FS-049 - CLI-First Init Flow (Phase 2)
**Status**: Planned
**Priority**: P1 (High)

---

## User Story: US-001 - Smart Pagination During Init (50-Project Limit)

**Linked ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04, AC-US1-05, AC-US1-06
**Tasks**: 6 total, 0 completed

### T-001: Implement ProjectCountFetcher Component

**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Priority**: P1 (High)
**Estimated Effort**: 4 hours
**Status**: [x] completed

**Test Plan**:
- **Given** a JIRA Cloud instance with 127 accessible projects
- **When** getProjectCount() is called with valid credentials
- **Then** it should return total count in < 1 second
- **And** only call the count-only API endpoint (maxResults=0)

**Test Cases**:
1. **Unit**: `tests/unit/cli/helpers/project-count-fetcher.test.ts`
   - testGetProjectCountJiraCloud(): JIRA Cloud count check returns total
   - testGetProjectCountJiraServer(): JIRA Server count check with header
   - testGetProjectCountAdo(): Azure DevOps count check returns total
   - testGetProjectCountTimeout(): Timeout triggers retry with backoff
   - testGetProjectCountAuthFailure(): Auth error returns error message
   - testGetProjectCountNetworkError(): Network error triggers retry
   - **Coverage Target**: 90%

2. **Integration**: `tests/integration/cli/init-flow/count-check.test.ts`
   - testCountCheckBeforeProjectLoad(): Count check happens before full load
   - testCountDisplayedToUser(): Total count displayed in console
   - testCountCheckPerformance(): Count check completes < 1 second
   - **Coverage Target**: 85%

**Overall Coverage Target**: 88%

**Implementation**:
1. Create file: `src/cli/helpers/project-count-fetcher.ts`
2. Implement `getProjectCount()` function with provider detection (JIRA Cloud/Server/ADO)
3. Add JIRA Cloud API call: `GET /rest/api/3/project/search?maxResults=0`
4. Add JIRA Server API call: `GET /rest/api/2/project?maxResults=0` (count in header)
5. Add Azure DevOps API call: `GET /_apis/projects?$top=0`
6. Add retry logic with exponential backoff (1s, 2s, 4s)
7. Add error handling (auth failure, timeout, network error)
8. Write unit tests (6 tests)
9. Run unit tests: `npm test project-count-fetcher.test` (should pass: 6/6)
10. Write integration tests (3 tests)
11. Run integration tests: `npm test count-check.test` (should pass: 3/3)
12. Verify coverage: `npm run coverage` (should be ≥88%)

---

### T-002: Add Smart Pagination to AsyncProjectLoader

**User Story**: US-001
**Satisfies ACs**: AC-US1-03, AC-US1-04
**Priority**: P0 (Critical)
**Estimated Effort**: 6 hours
**Status**: [x] completed

**Test Plan**:
- **Given** a JIRA instance with 127 projects
- **When** AsyncProjectLoader fetches projects with default batch size
- **Then** it should load first 50 projects synchronously
- **And** fetch remaining 77 projects asynchronously with progress tracking

**Test Cases**:
1. **Unit**: `tests/unit/cli/helpers/project-fetcher.test.ts`
   - testBatchSizeDefault50(): Default batch size is 50 projects
   - testFirstBatchSynchronous(): First batch loads synchronously
   - testRemainingBatchesAsync(): Remaining batches fetched asynchronously
   - testPaginationParameters(): Correct startAt and maxResults values
   - testLastBatchPartial(): Last batch handles partial size correctly
   - testBatchCalculation(): Correct number of batches calculated
   - **Coverage Target**: 92%

2. **Integration**: `tests/integration/cli/init-flow/batch-fetching.test.ts`
   - testSmartPaginationFlow(): Full flow with 127 mock projects
   - testFirst50LoadedQuickly(): First 50 projects load < 5 seconds
   - testAsyncFetchWithProgress(): Async fetch shows progress updates
   - testBatchSequencing(): Batches fetched in correct order
   - **Coverage Target**: 87%

**Overall Coverage Target**: 90%

**Implementation**:
1. Create file: `src/cli/helpers/project-fetcher.ts`
2. Implement `AsyncProjectLoader` class with batch fetching
3. Add `fetchBatch(offset, limit)` method with pagination parameters
4. Add logic to load first 50 projects synchronously
5. Add async loop for remaining batches (offset += 50)
6. Calculate total batches: `Math.ceil(totalCount / batchSize)`
7. Handle partial last batch: `Math.min(batchSize, totalCount - offset)`
8. Write unit tests (6 tests)
9. Run unit tests: `npm test project-fetcher.test` (should pass: 6/6)
10. Write integration tests (4 tests)
11. Run integration tests: `npm test batch-fetching.test` (should pass: 4/4)
12. Verify coverage: `npm run coverage` (should be ≥90%)

---

### T-003: Implement Performance Benchmark for Init Time

**User Story**: US-001
**Satisfies ACs**: AC-US1-05
**Priority**: P0 (Critical)
**Estimated Effort**: 5 hours
**Status**: [x] completed

**Test Plan**:
- **Given** a mock JIRA instance with 100 projects
- **When** full init flow is executed
- **Then** initialization should complete in < 30 seconds
- **And** P95 latency should be < 30 seconds across 10 runs

**Test Cases**:
1. **Performance**: `tests/performance/init-flow/performance-benchmarks.test.ts`
   - testInitTime50Projects(): 50 projects → < 10 seconds
   - testInitTime100Projects(): 100 projects → < 30 seconds
   - testInitTime500Projects(): 500 projects → < 2 minutes
   - testP95Latency(): P95 latency < 30 seconds (10 runs)
   - testAPICallCount(): API calls ≤ 12 for 500 projects
   - **Coverage Target**: 95%

**Overall Coverage Target**: 95%

**Implementation**:
1. Create file: `tests/performance/init-flow/performance-benchmarks.test.ts`
2. Implement `runPerformanceBenchmark()` helper function
3. Add timing measurement: `Date.now()` before/after init
4. Mock JIRA API responses for 50, 100, 500 projects
5. Calculate P95 latency: Sort results, take 95th percentile
6. Validate API call count: Track all API requests
7. Add performance assertions: `expect(elapsed).toBeLessThan(30000)`
8. Run performance tests: `npm run test:performance` (should pass: 5/5)
9. Generate performance report: `tests/performance/init-flow/PERFORMANCE-REPORT.md`
10. Verify target metrics: 80% improvement vs. baseline

---

### T-004: Add Cancelation Support with State Persistence

**User Story**: US-001
**Satisfies ACs**: AC-US1-06
**Priority**: P1 (High)
**Estimated Effort**: 6 hours
**Status**: [x] completed

**Test Plan**:
- **Given** an in-progress batch fetch of 127 projects
- **When** user presses Ctrl+C at 50% completion
- **Then** partial progress should be saved to `.specweave/cache/import-state.json`
- **And** clean exit with summary displayed (no errors)

**Test Cases**:
1. **Unit**: `tests/unit/cli/helpers/cancelation-handler.test.ts`
   - testSIGINTDetection(): SIGINT handler registers correctly
   - testStatePersistence(): State saved to file atomically
   - testStateTTL(): Expired state (> 24h) prompts fresh start
   - testDoubleCtrlC(): Second Ctrl+C forces immediate exit
   - testCleanupCallback(): Cleanup callback executed on cancel
   - **Coverage Target**: 90%

2. **Integration**: `tests/integration/cli/init-flow/cancelation-resume.test.ts`
   - testCancelationFlow(): Full cancelation flow with state save
   - testPartialProgressSaved(): State contains correct project count
   - testResumeSuggested(): Resume command displayed to user
   - testCleanExit(): Exit code 0 (no errors)
   - **Coverage Target**: 85%

**Overall Coverage Target**: 88%

**Implementation**:
1. Create file: `src/cli/helpers/cancelation-handler.ts`
2. Implement `CancelationHandler` class with SIGINT registration
3. Add `shouldCancel()` method to check cancelation flag
4. Add `saveState()` method with atomic file writes (temp → rename)
5. Add state TTL validation: Check timestamp, reject if > 24 hours
6. Implement double Ctrl+C detection (force exit)
7. Add cleanup callback: `onCleanup(() => { saveState() })`
8. Create `.specweave/cache/` directory if missing
9. Write unit tests (5 tests)
10. Run unit tests: `npm test cancelation-handler.test` (should pass: 5/5)
11. Write integration tests (4 tests)
12. Run integration tests: `npm test cancelation-resume.test` (should pass: 4/4)
13. Verify coverage: `npm run coverage` (should be ≥88%)

---

### T-005: Update JIRA Helper to Integrate Count Check

**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Priority**: P1 (High)
**Estimated Effort**: 3 hours
**Status**: [x] completed

**Test Plan**:
- **Given** user is running `specweave init` with JIRA
- **When** credentials are validated
- **Then** project count check should run immediately after auth
- **And** total count should be displayed before strategy prompt

**Test Cases**:
1. **Unit**: `tests/unit/cli/helpers/issue-tracker/jira.test.ts`
   - testCountCheckAfterAuth(): Count check happens after credential validation
   - testCountDisplayed(): Count shown in console output
   - testCountCheckError(): Error handling if count check fails
   - **Coverage Target**: 85%

2. **Integration**: `tests/integration/cli/init-flow/jira-integration.test.ts`
   - testFullJiraInitFlow(): Complete JIRA init with count check
   - testCountCheckTiming(): Count check completes < 1 second
   - **Coverage Target**: 80%

**Overall Coverage Target**: 83%

**Implementation**:
1. Modify file: `src/cli/helpers/issue-tracker/jira.ts`
2. Add `getProjectCount()` call after `validateJiraCredentials()`
3. Display count to user: `console.log(chalk.cyan(`Found ${total} accessible projects`))`
4. Store count in variable for strategy prompt
5. Add error handling: Show warning if count check fails
6. Update unit tests (3 new tests)
7. Run unit tests: `npm test jira.test` (should pass: 3/3 new tests)
8. Update integration tests (2 new tests)
9. Run integration tests: `npm test jira-integration.test` (should pass: 2/2)
10. Verify coverage: `npm run coverage` (should be ≥83%)

---

### T-006: Add End-to-End Test for Smart Pagination

**User Story**: US-001
**Satisfies ACs**: AC-US1-03, AC-US1-04, AC-US1-05
**Priority**: P1 (High)
**Estimated Effort**: 4 hours
**Status**: [x] completed

**Test Plan**:
- **Given** a full SpecWeave init flow with 100 mock projects
- **When** user selects "Import all" strategy
- **Then** initialization should complete < 30 seconds
- **And** all 100 projects should be imported successfully

**Test Cases**:
1. **E2E**: `tests/e2e/init-flow/smart-pagination.spec.ts`
   - testInitCompletes30Seconds(): Full init < 30 seconds for 100 projects
   - testProgressShown(): Progress bar displayed during async fetch
   - testAllProjectsImported(): All 100 projects imported successfully
   - **Coverage Target**: 70%

**Overall Coverage Target**: 70%

**Implementation**:
1. Create file: `tests/e2e/init-flow/smart-pagination.spec.ts`
2. Set up Playwright test environment
3. Mock JIRA API responses for 100 projects
4. Simulate user entering credentials
5. Simulate user selecting "Import all" strategy
6. Measure elapsed time: `Date.now()` before/after
7. Assert: `expect(elapsed).toBeLessThan(30000)`
8. Assert: All 100 projects in `.specweave/config.json`
9. Run E2E test: `npm run test:e2e smart-pagination` (should pass: 3/3)
10. Verify E2E coverage: 70% (critical path only)

---

## User Story: US-002 - CLI-First Defaults (Import All by Default)

**Linked ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04, AC-US2-05, AC-US2-06
**Tasks**: 6 total, 0 completed

### T-007: Implement ImportStrategyPrompter Component

**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-04
**Priority**: P1 (High)
**Estimated Effort**: 5 hours
**Status**: [x] completed

**Test Plan**:
- **Given** a JIRA instance with 127 total projects
- **When** strategy prompt is displayed
- **Then** "Import all" should be the default selection (recommended)
- **And** clear instructions should be shown to the user

**Test Cases**:
1. **Unit**: `tests/unit/cli/helpers/import-strategy-prompter.test.ts`
   - testDefaultStrategyImportAll(): "Import all" is default choice
   - testStrategyOptions(): Three options shown (import-all, select-specific, manual-entry)
   - testInstructionText(): Instructions displayed clearly
   - testPromptBeforeLoad(): Strategy prompt appears before project load
   - testManualEntryInput(): Manual entry accepts comma-separated keys
   - testManualEntryValidation(): Invalid format rejected with error message
   - **Coverage Target**: 88%

2. **Integration**: `tests/integration/cli/init-flow/strategy-selection.test.ts`
   - testImportAllStrategy(): Full flow with "Import all" selected
   - testSelectSpecificStrategy(): Full flow with "Select specific"
   - testManualEntryStrategy(): Full flow with manual entry
   - **Coverage Target**: 82%

**Overall Coverage Target**: 85%

**Implementation**:
1. Create file: `src/cli/helpers/import-strategy-prompter.ts`
2. Implement `promptImportStrategy()` function with Inquirer.js
3. Add three strategy options: import-all (default), select-specific, manual-entry
4. Add instruction text: "All projects selected by default. Deselect unwanted..."
5. Add manual entry prompt: "Enter project keys (comma-separated):"
6. Add validation for manual entry: `/^[A-Z0-9_,-]+$/i`
7. Return `StrategyPromptResult` with strategy and optional projectKeys
8. Write unit tests (6 tests)
9. Run unit tests: `npm test import-strategy-prompter.test` (should pass: 6/6)
10. Write integration tests (3 tests)
11. Run integration tests: `npm test strategy-selection.test` (should pass: 3/3)
12. Verify coverage: `npm run coverage` (should be ≥85%)

---

### T-008: Add Safety Confirmation for Large Imports

**User Story**: US-002
**Satisfies ACs**: AC-US2-05
**Priority**: P1 (High)
**Estimated Effort**: 3 hours
**Status**: [x] completed (integrated in ImportStrategyPrompter)

**Test Plan**:
- **Given** a JIRA instance with 127 projects (> 100 threshold)
- **When** user selects "Import all" strategy
- **Then** safety confirmation prompt should appear
- **And** default should be "No" (safe default)

**Test Cases**:
1. **Unit**: `tests/unit/cli/helpers/import-strategy-prompter.test.ts`
   - testSafetyConfirmationShown(): Confirmation shown if count > 100
   - testSafetyConfirmationNotShown(): No confirmation if count ≤ 100
   - testSafetyDefaultNo(): Default answer is "No" (safe)
   - testSafetyDeclined(): User can decline and return to strategy selection
   - **Coverage Target**: 90%

2. **Integration**: `tests/integration/cli/init-flow/safety-confirmation.test.ts`
   - testSafetyConfirmationFlow(): Full flow with confirmation prompt
   - testEstimatedTimeDisplayed(): Estimated time shown in confirmation
   - **Coverage Target**: 85%

**Overall Coverage Target**: 88%

**Implementation**:
1. Modify file: `src/cli/helpers/import-strategy-prompter.ts`
2. Add safety confirmation prompt (Inquirer.js confirm type)
3. Show confirmation only if: `totalCount > 100 && strategy === 'import-all'`
4. Set default to `false` (safe default prevents accidents)
5. Display estimated time: `~${Math.ceil(totalCount / 50) * 5}s`
6. If user declines: Return to strategy selection (loop prompt)
7. Update unit tests (4 new tests)
8. Run unit tests: `npm test import-strategy-prompter.test` (should pass: 4/4 new tests)
9. Write integration tests (2 tests)
10. Run integration tests: `npm test safety-confirmation.test` (should pass: 2/2)
11. Verify coverage: `npm run coverage` (should be ≥88%)

---

### T-009: Update ProjectSelector with Pre-Checked Checkboxes

**User Story**: US-002
**Satisfies ACs**: AC-US2-03
**Priority**: P1 (High)
**Estimated Effort**: 3 hours
**Status**: [x] completed

**Test Plan**:
- **Given** user selects "Select specific" strategy with 50 projects
- **When** checkbox prompt is displayed
- **Then** all checkboxes should be checked by default (`checked: true`)
- **And** user can deselect unwanted projects with spacebar

**Test Cases**:
1. **Unit**: `tests/unit/plugins/project-selector.test.ts`
   - testDefaultCheckedTrue(): All items have `checked: true` by default
   - testDeselectionWorkflow(): User can deselect items with spacebar
   - testToggleAllShortcut(): `<a>` shortcut toggles all items
   - **Coverage Target**: 85%

2. **Integration**: `tests/integration/cli/init-flow/checkbox-mode.test.ts`
   - testCheckboxModePreChecked(): Checkbox mode shows all checked
   - testDeselectionFlow(): User deselects 5 projects, 45 remain
   - **Coverage Target**: 80%

**Overall Coverage Target**: 83%

**Implementation**:
1. Modify file: `plugins/specweave-jira/lib/project-selector.ts`
2. Update checkbox prompt: Set `checked: true` for all items
3. Add instruction message: "All selected by default. Deselect with <space>, toggle all with <a>"
4. Test deselection workflow manually
5. Update unit tests (3 new tests)
6. Run unit tests: `npm test project-selector.test` (should pass: 3/3 new tests)
7. Write integration tests (2 tests)
8. Run integration tests: `npm test checkbox-mode.test` (should pass: 2/2)
9. Verify coverage: `npm run coverage` (should be ≥83%)

---

### T-010: Add Manual Entry Option for Project Keys

**User Story**: US-002
**Satisfies ACs**: AC-US2-06
**Priority**: P2 (Nice-to-have)
**Estimated Effort**: 2 hours
**Status**: [x] completed (integrated in ImportStrategyPrompter)

**Test Plan**:
- **Given** user selects "Manual entry" strategy
- **When** prompted to enter project keys
- **Then** comma-separated input should be accepted (e.g., "BACKEND,FRONTEND,MOBILE")
- **And** invalid format should be rejected with clear error message

**Test Cases**:
1. **Unit**: `tests/unit/cli/helpers/import-strategy-prompter.test.ts`
   - testManualEntryAcceptsValidInput(): Valid comma-separated keys accepted
   - testManualEntryRejectsInvalidFormat(): Invalid format rejected
   - testManualEntryTrimsWhitespace(): Whitespace trimmed from keys
   - **Coverage Target**: 85%

2. **Integration**: `tests/integration/cli/init-flow/manual-entry.test.ts`
   - testManualEntryFlow(): Full flow with manual project key input
   - testManualEntryValidation(): Validation error shown for invalid input
   - **Coverage Target**: 80%

**Overall Coverage Target**: 83%

**Implementation**:
1. Already implemented in T-007 (ImportStrategyPrompter)
2. Add unit tests for manual entry validation (3 tests)
3. Run unit tests: `npm test import-strategy-prompter.test` (should pass: 3/3 new tests)
4. Write integration tests (2 tests)
5. Run integration tests: `npm test manual-entry.test` (should pass: 2/2)
6. Verify coverage: `npm run coverage` (should be ≥83%)

---

### T-011: Update Init Command to Integrate Strategy Selection

**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02
**Priority**: P1 (High)
**Estimated Effort**: 4 hours
**Status**: [x] completed

**Test Plan**:
- **Given** user is running `specweave init` with JIRA
- **When** project count check completes
- **Then** strategy selection prompt should appear immediately
- **And** workflow should branch based on selected strategy

**Test Cases**:
1. **Integration**: `tests/integration/cli/init-flow/init-command-integration.test.ts`
   - testStrategySelectionIntegration(): Strategy prompt after count check
   - testImportAllBranch(): "Import all" triggers async batch fetch
   - testSelectSpecificBranch(): "Select specific" shows checkbox UI
   - testManualEntryBranch(): "Manual entry" accepts project keys
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Modify file: `src/cli/commands/init.ts`
2. Add call to `promptImportStrategy()` after project count check
3. Branch logic based on strategy:
   - `import-all`: Call `AsyncProjectLoader.fetchAllProjects()`
   - `select-specific`: Load first 50 projects, show checkbox UI
   - `manual-entry`: Use provided project keys directly
4. Update integration tests (4 tests)
5. Run integration tests: `npm test init-command-integration.test` (should pass: 4/4)
6. Verify coverage: `npm run coverage` (should be ≥85%)

---

### T-012: Add E2E Test for CLI-First Defaults

**User Story**: US-002
**Satisfies ACs**: AC-US2-02, AC-US2-03
**Priority**: P1 (High)
**Estimated Effort**: 3 hours
**Status**: [x] completed

**Test Plan**:
- **Given** a full SpecWeave init flow
- **When** strategy prompt is shown
- **Then** "Import all" should be highlighted as default
- **And** all checkboxes should be checked if "Select specific" chosen

**Test Cases**:
1. **E2E**: `tests/e2e/init-flow/cli-first-defaults.spec.ts`
   - testDefaultStrategyHighlighted(): "Import all" is default in UI
   - testCheckboxesPreChecked(): All checkboxes checked by default
   - testInstructionsVisible(): Instructions visible without scrolling
   - **Coverage Target**: 70%

**Overall Coverage Target**: 70%

**Implementation**:
1. Create file: `tests/e2e/init-flow/cli-first-defaults.spec.ts`
2. Set up Playwright test environment
3. Simulate full init flow with strategy selection
4. Assert default strategy is "Import all"
5. Simulate "Select specific" choice
6. Assert all checkboxes are checked
7. Run E2E test: `npm run test:e2e cli-first-defaults` (should pass: 3/3)
8. Verify E2E coverage: 70% (critical UX path)

---

## User Story: US-003 - Progress Tracking with Real-Time Feedback

**Linked ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04, AC-US3-05, AC-US3-06
**Tasks**: 6 total, 0 completed

### T-013: Implement ProgressTracker Component

**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03
**Priority**: P1 (High)
**Estimated Effort**: 6 hours
**Status**: [x] completed

**Test Plan**:
- **Given** a batch fetch of 127 projects
- **When** AsyncProjectLoader fetches each batch
- **Then** progress bar should update every 5 projects
- **And** ETA should be calculated using rolling average of last 10 items

**Test Cases**:
1. **Unit**: `tests/unit/cli/helpers/progress-tracker.test.ts`
   - testProgressPercentageCalculation(): Correct percentage (47/127 = 37%)
   - testETACalculationRollingAverage(): ETA based on last 10 items
   - testUpdateThrottling(): Updates only every 5 projects
   - testProgressBarRendering(): ASCII progress bar renders correctly
   - testFinalSummary(): Final summary shows succeeded/failed/skipped
   - testElapsedTime(): Elapsed time tracked accurately
   - **Coverage Target**: 90%

2. **Integration**: `tests/integration/cli/init-flow/progress-tracking.test.ts`
   - testProgressUpdatesVisibility(): Progress updates visible in console
   - testETAAccuracy(): ETA within ±20% of actual time
   - testNoFlickering(): Console updates don't flicker
   - **Coverage Target**: 85%

**Overall Coverage Target**: 88%

**Implementation**:
1. Create file: `src/cli/helpers/progress-tracker.ts`
2. Implement `ProgressTracker` class with state tracking
3. Add `update(item, status)` method with throttling (every 5 items)
4. Calculate percentage: `(completed / total) * 100`
5. Calculate ETA: Rolling average of last 10 items' processing time
6. Render ASCII progress bar: `[=============>          ] 37%`
7. Add `finish()` method to show final summary
8. Track elapsed time using `Date.now()`
9. Write unit tests (6 tests)
10. Run unit tests: `npm test progress-tracker.test` (should pass: 6/6)
11. Write integration tests (3 tests)
12. Run integration tests: `npm test progress-tracking.test` (should pass: 3/3)
13. Verify coverage: `npm run coverage` (should be ≥88%)

---

### T-014: Add Error Logging to Import Errors File

**User Story**: US-003
**Satisfies ACs**: AC-US3-05
**Priority**: P1 (High)
**Estimated Effort**: 3 hours
**Status**: [x] completed (integrated in AsyncProjectLoader)

**Test Plan**:
- **Given** batch fetch encounters 5 errors during import
- **When** AsyncProjectLoader completes
- **Then** all errors should be logged to `.specweave/logs/import-errors.log`
- **And** each error should include timestamp, project key, error message, and suggestion

**Test Cases**:
1. **Unit**: `tests/unit/cli/helpers/project-fetcher.test.ts`
   - testErrorLogging(): Errors logged to file with correct format
   - testErrorSuggestions(): Actionable suggestions included
   - testLogFilePath(): Log file created at correct path
   - **Coverage Target**: 85%

2. **Integration**: `tests/integration/cli/init-flow/error-logging.test.ts`
   - testErrorsLoggedDuringImport(): Errors logged during import
   - testLogFileContents(): Log file contains all expected errors
   - **Coverage Target**: 80%

**Overall Coverage Target**: 83%

**Implementation**:
1. Modify file: `src/cli/helpers/project-fetcher.ts`
2. Add error logging function: `logError(error: FetchError)`
3. Create `.specweave/logs/` directory if missing
4. Log format: `[timestamp] PROJECT-KEY: Error message (suggestion)`
5. Append errors to `.specweave/logs/import-errors.log`
6. Add error suggestion mapping (403 → permissions, 404 → deleted, etc.)
7. Write unit tests (3 tests)
8. Run unit tests: `npm test project-fetcher.test` (should pass: 3/3 new tests)
9. Write integration tests (2 tests)
10. Run integration tests: `npm test error-logging.test` (should pass: 2/2)
11. Verify coverage: `npm run coverage` (should be ≥83%)

---

### T-015: Implement Continue-on-Failure Error Handling

**User Story**: US-003
**Satisfies ACs**: AC-US3-06
**Priority**: P1 (High)
**Estimated Effort**: 4 hours
**Status**: [x] completed (integrated in AsyncProjectLoader)

**Test Plan**:
- **Given** batch fetch with 100 projects, 5 have permission errors
- **When** AsyncProjectLoader encounters errors
- **Then** it should continue fetching remaining 95 projects
- **And** final summary should show 95 succeeded, 5 failed

**Test Cases**:
1. **Unit**: `tests/unit/cli/helpers/project-fetcher.test.ts`
   - testContinueOnSingleFailure(): Single failure doesn't stop batch
   - testMultipleFailuresHandled(): Multiple failures tracked correctly
   - testFinalSummaryAccurate(): Summary shows correct counts
   - **Coverage Target**: 88%

2. **Integration**: `tests/integration/cli/init-flow/continue-on-failure.test.ts`
   - testContinueOnFailureFlow(): Full flow with 5 failures out of 100
   - testPartialSuccess(): 95 projects imported successfully
   - **Coverage Target**: 85%

**Overall Coverage Target**: 87%

**Implementation**:
1. Modify file: `src/cli/helpers/project-fetcher.ts`
2. Wrap `fetchBatch()` calls in try-catch blocks
3. On error: Log error, increment failed count, continue loop
4. Track succeeded, failed, skipped counts separately
5. Don't throw errors up to caller (continue-on-failure)
6. Return `FetchResult` with all counts: succeeded, failed, skipped, errors
7. Write unit tests (3 tests)
8. Run unit tests: `npm test project-fetcher.test` (should pass: 3/3 new tests)
9. Write integration tests (2 tests)
10. Run integration tests: `npm test continue-on-failure.test` (should pass: 2/2)
11. Verify coverage: `npm run coverage` (should be ≥87%)

---

### T-016: Add Final Summary Display

**User Story**: US-003
**Satisfies ACs**: AC-US3-04
**Priority**: P1 (High)
**Estimated Effort**: 2 hours
**Status**: [x] completed (integrated in ProgressTracker)

**Test Plan**:
- **Given** batch fetch completes with 98 succeeded, 5 failed, 24 skipped
- **When** AsyncProjectLoader finishes
- **Then** final summary should display all counts clearly
- **And** suggest user check error log if failures occurred

**Test Cases**:
1. **Unit**: `tests/unit/cli/helpers/progress-tracker.test.ts`
   - testFinalSummaryFormat(): Summary formatted correctly
   - testErrorLogSuggestion(): Suggestion shown if failures > 0
   - testSuccessMessage(): Success message shown if no failures
   - **Coverage Target**: 85%

2. **Integration**: `tests/integration/cli/init-flow/final-summary.test.ts`
   - testFinalSummaryDisplay(): Summary displayed after import
   - testErrorLogSuggestion(): Error log path shown to user
   - **Coverage Target**: 80%

**Overall Coverage Target**: 83%

**Implementation**:
1. Modify file: `src/cli/helpers/progress-tracker.ts`
2. Add `finish()` method to display final summary
3. Format: `✅ Imported 98/127, 5 failed, 24 skipped`
4. If failures > 0: Show suggestion to check `.specweave/logs/import-errors.log`
5. Display elapsed time: `Completed in 28s`
6. Write unit tests (3 tests)
7. Run unit tests: `npm test progress-tracker.test` (should pass: 3/3 new tests)
8. Write integration tests (2 tests)
9. Run integration tests: `npm test final-summary.test` (should pass: 2/2)
10. Verify coverage: `npm run coverage` (should be ≥83%)

---

### T-017: Integrate ProgressTracker with AsyncProjectLoader

**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03
**Priority**: P1 (High)
**Estimated Effort**: 3 hours
**Status**: [x] completed (integrated in AsyncProjectLoader)

**Test Plan**:
- **Given** AsyncProjectLoader is fetching 127 projects
- **When** each batch completes
- **Then** ProgressTracker should update with completed items
- **And** progress bar should render every 5 projects

**Test Cases**:
1. **Integration**: `tests/integration/cli/init-flow/progress-integration.test.ts`
   - testProgressTrackerIntegration(): ProgressTracker updates during fetch
   - testThrottledUpdates(): Updates only every 5 projects
   - testETADisplayed(): ETA shown during long imports
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Modify file: `src/cli/helpers/project-fetcher.ts`
2. Initialize ProgressTracker in `fetchAllProjects()` method
3. Call `progressTracker.update(project.key, 'success')` after each batch item
4. Call `progressTracker.finish()` when loop completes
5. Update integration tests (3 tests)
6. Run integration tests: `npm test progress-integration.test` (should pass: 3/3)
7. Verify coverage: `npm run coverage` (should be ≥85%)

---

### T-018: Add E2E Test for Progress Tracking

**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-04
**Priority**: P1 (High)
**Estimated Effort**: 3 hours
**Status**: [x] completed

**Test Plan**:
- **Given** a full init flow with 100 projects
- **When** AsyncProjectLoader fetches projects
- **Then** progress bar should be visible in console
- **And** final summary should show accurate counts

**Test Cases**:
1. **E2E**: `tests/e2e/init-flow/progress-tracking.spec.ts`
   - testProgressBarVisible(): Progress bar visible during import
   - testFinalSummaryShown(): Final summary displayed after completion
   - testETAShown(): ETA visible during long imports
   - **Coverage Target**: 70%

**Overall Coverage Target**: 70%

**Implementation**:
1. Create file: `tests/e2e/init-flow/progress-tracking.spec.ts`
2. Set up Playwright test environment
3. Simulate full init flow with 100 mock projects
4. Assert progress bar visible in console output
5. Assert final summary displays correct counts
6. Run E2E test: `npm run test:e2e progress-tracking` (should pass: 3/3)
7. Verify E2E coverage: 70% (critical UX path)

---

## User Story: US-004 - Graceful Cancelation Support

**Linked ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04, AC-US4-05, AC-US4-06
**Tasks**: 6 total, 0 completed

### T-019: Implement SIGINT Handler Registration

**User Story**: US-004
**Satisfies ACs**: AC-US4-01
**Priority**: P1 (High)
**Estimated Effort**: 3 hours
**Status**: [x] completed (integrated in T-004 CancelationHandler)

**Test Plan**:
- **Given** AsyncProjectLoader is running batch fetch
- **When** SIGINT signal is sent (Ctrl+C)
- **Then** CancelationHandler should detect signal
- **And** shouldCancel() should return true

**Test Cases**:
1. **Unit**: `tests/unit/cli/helpers/cancelation-handler.test.ts`
   - testSIGINTHandlerRegistration(): Handler registered on process
   - testSIGINTDetection(): Handler detects SIGINT signal
   - testShouldCancelReturnsTrue(): shouldCancel() returns true after SIGINT
   - testDoubleCtrlCForceExit(): Second SIGINT forces immediate exit
   - **Coverage Target**: 90%

**Overall Coverage Target**: 90%

**Implementation**:
1. Already implemented in T-004 (CancelationHandler component)
2. Add unit tests for SIGINT registration (4 tests)
3. Run unit tests: `npm test cancelation-handler.test` (should pass: 4/4 new tests)
4. Verify coverage: `npm run coverage` (should be ≥90%)

---

### T-020: Implement State Persistence to Cache File

**User Story**: US-004
**Satisfies ACs**: AC-US4-02
**Priority**: P1 (High)
**Estimated Effort**: 4 hours
**Status**: [x] completed (integrated in T-004 CancelationHandler)

**Test Plan**:
- **Given** batch fetch is 50% complete (50/100 projects)
- **When** user presses Ctrl+C
- **Then** state should be saved to `.specweave/cache/import-state.json`
- **And** state should include: total, completed, succeeded, failed, remaining, errors

**Test Cases**:
1. **Unit**: `tests/unit/cli/helpers/cancelation-handler.test.ts`
   - testStateSaveStructure(): State has all required fields
   - testAtomicFileWrite(): Temp file → rename pattern used
   - testStateLoadAfterSave(): State can be loaded after save
   - **Coverage Target**: 88%

2. **Integration**: `tests/integration/cli/init-flow/state-persistence.test.ts`
   - testStatePersistenceFlow(): Full flow with state save
   - testStateFileContents(): State file contains correct data
   - **Coverage Target**: 85%

**Overall Coverage Target**: 87%

**Implementation**:
1. Already implemented in T-004 (CancelationHandler component)
2. Add unit tests for state persistence (3 tests)
3. Run unit tests: `npm test cancelation-handler.test` (should pass: 3/3 new tests)
4. Write integration tests (2 tests)
5. Run integration tests: `npm test state-persistence.test` (should pass: 2/2)
6. Verify coverage: `npm run coverage` (should be ≥87%)

---

### T-021: Implement Clean Exit with Summary

**User Story**: US-004
**Satisfies ACs**: AC-US4-03, AC-US4-04
**Priority**: P1 (High)
**Estimated Effort**: 2 hours
**Status**: [x] completed (integrated in CancelationHandler)

**Test Plan**:
- **Given** user presses Ctrl+C during batch fetch
- **When** cancelation cleanup completes
- **Then** clean exit with summary should occur (exit code 0)
- **And** resume command should be suggested to user

**Test Cases**:
1. **Unit**: `tests/unit/cli/helpers/cancelation-handler.test.ts`
   - testCleanExitCode(): Exit code is 0 after cancelation
   - testSummaryDisplayed(): Summary shows completed count
   - testResumeCommandSuggested(): Resume command shown to user
   - **Coverage Target**: 85%

2. **Integration**: `tests/integration/cli/init-flow/clean-exit.test.ts`
   - testCleanExitFlow(): Full flow with clean exit
   - testResumeCommandFormat(): Resume command format is correct
   - **Coverage Target**: 80%

**Overall Coverage Target**: 83%

**Implementation**:
1. Modify file: `src/cli/helpers/cancelation-handler.ts`
2. Display summary: `⚠️ Operation canceled. Imported 47/127 projects (37% complete)`
3. Suggest resume: `Resume with: /specweave-jira:import-projects --resume`
4. Ensure exit code 0: `process.exit(0)`
5. Write unit tests (3 tests)
6. Run unit tests: `npm test cancelation-handler.test` (should pass: 3/3 new tests)
7. Write integration tests (2 tests)
8. Run integration tests: `npm test clean-exit.test` (should pass: 2/2)
9. Verify coverage: `npm run coverage` (should be ≥83%)

---

### T-022: Implement Resume Capability

**User Story**: US-004
**Satisfies ACs**: AC-US4-05
**Priority**: P2 (Nice-to-have)
**Estimated Effort**: 5 hours
**Status**: [x] completed (integrated in CancelationHandler)

**Test Plan**:
- **Given** saved state from previous canceled import
- **When** user runs `/specweave-jira:import-projects --resume`
- **Then** import should continue from saved position
- **And** no duplicate projects should be imported

**Test Cases**:
1. **Unit**: `tests/unit/cli/helpers/cancelation-handler.test.ts`
   - testResumeFromSavedState(): Resume continues from correct position
   - testNoDuplicates(): No duplicate projects imported
   - testRemainingProjectsOnly(): Only remaining projects fetched
   - **Coverage Target**: 88%

2. **Integration**: `tests/integration/cli/init-flow/resume-capability.test.ts`
   - testFullResumeFlow(): Cancel at 50%, resume, complete 100%
   - testResumeClearsState(): State cleared after successful resume
   - **Coverage Target**: 85%

**Overall Coverage Target**: 87%

**Implementation**:
1. Modify file: `src/cli/helpers/project-fetcher.ts`
2. Add `resumeFromState()` method to AsyncProjectLoader
3. Load state from `.specweave/cache/import-state.json`
4. Validate state: Check timestamp (< 24 hours), version compatibility
5. Resume from `state.remaining` projects only (skip completed)
6. Clear state file after successful completion
7. Write unit tests (3 tests)
8. Run unit tests: `npm test cancelation-handler.test` (should pass: 3/3 new tests)
9. Write integration tests (2 tests)
10. Run integration tests: `npm test resume-capability.test` (should pass: 2/2)
11. Verify coverage: `npm run coverage` (should be ≥87%)

---

### T-023: Add State TTL Validation (24 Hours)

**User Story**: US-004
**Satisfies ACs**: AC-US4-06
**Priority**: P2 (Nice-to-have)
**Estimated Effort**: 2 hours
**Status**: [x] completed (integrated in CancelationHandler)

**Test Plan**:
- **Given** saved state from 25 hours ago (> 24 hour TTL)
- **When** user attempts to resume
- **Then** state should be rejected as expired
- **And** user should be prompted to start fresh import

**Test Cases**:
1. **Unit**: `tests/unit/cli/helpers/cancelation-handler.test.ts`
   - testStateExpired(): State rejected if > 24 hours old
   - testStateFresh(): State accepted if < 24 hours old
   - testExpiredStatePrompt(): User prompted for fresh import
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Modify file: `src/cli/helpers/cancelation-handler.ts`
2. Add TTL validation: `Date.now() - state.timestamp > 24 * 60 * 60 * 1000`
3. If expired: Delete state file, prompt fresh import
4. If fresh: Proceed with resume
5. Write unit tests (3 tests)
6. Run unit tests: `npm test cancelation-handler.test` (should pass: 3/3 new tests)
7. Verify coverage: `npm run coverage` (should be ≥85%)

---

### T-024: Add E2E Test for Cancelation and Resume

**User Story**: US-004
**Satisfies ACs**: AC-US4-02, AC-US4-03, AC-US4-05
**Priority**: P1 (High)
**Estimated Effort**: 4 hours
**Status**: [x] completed

**Test Plan**:
- **Given** a full init flow with 100 projects
- **When** user presses Ctrl+C at 50% completion
- **Then** state should be saved and summary displayed
- **And** resume should complete remaining 50 projects

**Test Cases**:
1. **E2E**: `tests/e2e/init-flow/cancelation-resume.spec.ts`
   - testCancelationSavesState(): Ctrl+C saves state correctly
   - testSummaryDisplayed(): Summary shown after cancelation
   - testResumeCompletes(): Resume completes remaining projects
   - **Coverage Target**: 70%

**Overall Coverage Target**: 70%

**Implementation**:
1. Create file: `tests/e2e/init-flow/cancelation-resume.spec.ts`
2. Set up Playwright test environment
3. Simulate full init flow with 100 mock projects
4. Simulate Ctrl+C at 50% completion
5. Assert state file exists and contains correct data
6. Simulate resume command
7. Assert remaining 50 projects imported
8. Run E2E test: `npm run test:e2e cancelation-resume` (should pass: 3/3)
9. Verify E2E coverage: 70% (critical path)

---

## User Story: US-005 - Batch Fetching with Pagination

**Linked ACs**: AC-US5-01, AC-US5-02, AC-US5-03, AC-US5-04, AC-US5-05, AC-US5-06
**Tasks**: 4 total, 0 completed

### T-025: Implement Retry Logic with Exponential Backoff

**User Story**: US-005
**Satisfies ACs**: AC-US5-03
**Priority**: P1 (High)
**Estimated Effort**: 4 hours
**Status**: [x] completed (integrated in AsyncProjectLoader)

**Test Plan**:
- **Given** API call fails with network timeout
- **When** AsyncProjectLoader retries
- **Then** it should retry 3 times with exponential backoff (1s, 2s, 4s)
- **And** throw error only after all retries exhausted

**Test Cases**:
1. **Unit**: `tests/unit/cli/helpers/project-fetcher.test.ts`
   - testRetryLogicBackoff(): Retry delays are 1s, 2s, 4s
   - testRetryMaxAttempts(): Max 3 retry attempts
   - testRetrySuccessOnSecondAttempt(): Success on retry stops further attempts
   - testRetryableErrors(): Network/timeout errors trigger retry
   - testNonRetryableErrors(): 4XX errors don't trigger retry
   - **Coverage Target**: 92%

**Overall Coverage Target**: 92%

**Implementation**:
1. Modify file: `src/cli/helpers/project-fetcher.ts`
2. Implement `fetchBatchWithRetry()` helper function
3. Add retry loop: 3 attempts with delays [1000, 2000, 4000]
4. Classify retryable errors: ETIMEDOUT, ECONNREFUSED, 5XX, 429
5. Non-retryable: 4XX (except 429), auth failures
6. Log retry attempts: `console.warn('⚠️ Retry 1/3 after 1s...')`
7. Write unit tests (5 tests)
8. Run unit tests: `npm test project-fetcher.test` (should pass: 5/5 new tests)
9. Verify coverage: `npm run coverage` (should be ≥92%)

---

### T-026: Add Rate Limit Handling

**User Story**: US-005
**Satisfies ACs**: AC-US5-04
**Priority**: P1 (High)
**Estimated Effort**: 3 hours
**Status**: [x] completed (integrated in AsyncProjectLoader)

**Test Plan**:
- **Given** API response with `X-RateLimit-Remaining: 5` header
- **When** AsyncProjectLoader checks rate limit
- **Then** it should throttle (pause) if remaining < 10
- **And** resume after delay specified in `Retry-After` header

**Test Cases**:
1. **Unit**: `tests/unit/cli/helpers/project-fetcher.test.ts`
   - testRateLimitDetection(): Rate limit detected from header
   - testRateLimitThrottling(): Throttle applied if < 10 requests remaining
   - testRetryAfterHeader(): Delay respects `Retry-After` header
   - **Coverage Target**: 88%

**Overall Coverage Target**: 88%

**Implementation**:
1. Modify file: `src/cli/helpers/project-fetcher.ts`
2. Check `X-RateLimit-Remaining` header after each API call
3. If `remaining < 10`: Pause for `Retry-After` seconds (or default 5s)
4. Log throttling: `console.warn('⚠️ Rate limit threshold reached. Pausing 5s...')`
5. Resume after delay
6. Write unit tests (3 tests)
7. Run unit tests: `npm test project-fetcher.test` (should pass: 3/3 new tests)
8. Verify coverage: `npm run coverage` (should be ≥88%)

---

### T-027: Implement Graceful Degradation (Reduce Batch Size on Timeout)

**User Story**: US-005
**Satisfies ACs**: AC-US5-05
**Priority**: P2 (Nice-to-have)
**Estimated Effort**: 3 hours
**Status**: [x] completed (integrated in AsyncProjectLoader)

**Test Plan**:
- **Given** batch fetch with 50 projects times out
- **When** AsyncProjectLoader retries fail
- **Then** batch size should be reduced to 25 projects
- **And** if 25 still times out, reduce to 10 projects (fallback)

**Test Cases**:
1. **Unit**: `tests/unit/cli/helpers/project-fetcher.test.ts`
   - testBatchSizeReduction(): Batch size reduced on timeout (50 → 25 → 10)
   - testFallbackBatchSize(): Minimum batch size is 10
   - testGracefulDegradationFlow(): Full flow with degradation
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Modify file: `src/cli/helpers/project-fetcher.ts`
2. Track current batch size: Start at 50
3. On timeout after retries: Reduce batch size by 50% (50 → 25 → 10)
4. Minimum batch size: 10 projects (don't reduce below this)
5. Log degradation: `console.warn('⚠️ Reducing batch size to 25 due to timeout')`
6. Continue fetch with reduced batch size
7. Write unit tests (3 tests)
8. Run unit tests: `npm test project-fetcher.test` (should pass: 3/3 new tests)
9. Verify coverage: `npm run coverage` (should be ≥85%)

---

### T-028: Add Performance Test for Zero Timeout Errors

**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-06
**Priority**: P0 (Critical)
**Estimated Effort**: 4 hours
**Status**: [x] completed

**Test Plan**:
- **Given** mock JIRA instance with 500 projects
- **When** full init flow is executed 100 times
- **Then** zero timeout errors should occur (100% success rate)
- **And** all batches should complete successfully with correct pagination

**Test Cases**:
1. **Performance**: `tests/performance/init-flow/reliability-benchmarks.test.ts`
   - testZeroTimeoutErrors(): 100 runs with 500 projects, 0 timeouts
   - testBatchSuccessRate(): 100% batch success rate
   - testReliabilityUnder500Projects(): All batches complete successfully
   - testPaginationParametersCorrect(): All batches use correct startAt/maxResults
   - **Coverage Target**: 95%

**Overall Coverage Target**: 95%

**Implementation**:
1. Create file: `tests/performance/init-flow/reliability-benchmarks.test.ts`
2. Implement stress test: 100 runs with 500 mock projects
3. Track timeout errors: Count ETIMEDOUT, ECONNREFUSED errors
4. Track batch success rate: `(successful batches / total batches) * 100`
5. Verify pagination: Check startAt and maxResults for each batch
6. Assert: `expect(timeoutErrors).toBe(0)`
7. Assert: `expect(successRate).toBe(100)`
8. Assert: Pagination parameters correct for all batches
9. Run performance test: `npm run test:performance reliability-benchmarks` (should pass: 4/4)
10. Generate reliability report: `tests/performance/init-flow/RELIABILITY-REPORT.md`
11. Verify target: 100% success rate

---

**End of Tasks**
