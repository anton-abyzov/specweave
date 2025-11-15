---
increment: 0029-cicd-failure-detection-auto-fix
total_tasks: 38
completed_tasks: 0
test_mode: standard
coverage_target: 85%
---

# Implementation Tasks: CI/CD Failure Detection & Claude Auto-Fix System

**Spec**: [SPEC-029](../../docs/internal/specs/default/spec-0029-cicd-failure-detection-auto-fix.md)
**Plan**: [plan.md](plan.md)

**Architecture**:
- [ADR-0031: GitHub Actions Polling vs Webhooks](../../docs/internal/architecture/adr/0031-github-actions-polling-vs-webhooks.md)
- [ADR-0032: Haiku vs Sonnet for Log Parsing](../../docs/internal/architecture/adr/0032-haiku-vs-sonnet-for-log-parsing.md)
- [ADR-0033: Auto-Apply vs Manual Review](../../docs/internal/architecture/adr/0033-auto-apply-vs-manual-review-for-fixes.md)

---

## Phase 1: Core Monitoring Infrastructure (Week 1-2)

### T-001: Implement Workflow Monitor Core

**User Story**: US-001
**Acceptance Criteria**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04
**Priority**: P1
**Estimate**: 6 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** SpecWeave is monitoring GitHub Actions workflows
- **When** a workflow run completes with failure status
- **Then** the failure is detected within 2 minutes
- **And** workflow metadata is stored in local state
- **And** duplicate notifications are prevented

**Test Cases**:
1. **Unit**: `tests/unit/cicd/workflow-monitor.test.ts`
   - testPollsGitHubAPIEvery60Seconds(): Polling loop works correctly
   - testDetectsWorkflowFailures(): Filters for failure status
   - testProcessesFailureOnlyOnce(): Deduplication logic
   - testHandlesAPIFailuresGracefully(): Retry and error handling
   - testStoresWorkflowMetadata(): State persistence
   - **Coverage Target**: 90%

2. **Integration**: `tests/integration/cicd/workflow-monitor-integration.test.ts`
   - testGitHubAPIPolling(): Real API calls with mocks
   - testStatePersistence(): Load/save state across restarts
   - **Coverage Target**: 85%

**Overall Coverage Target**: 88%

**Implementation**:
1. Create file: `src/core/cicd/workflow-monitor.ts`
2. Implement `WorkflowMonitor` class with polling loop
3. Add `poll()` method: fetch workflow runs from GitHub API
4. Add `processFailure()` method: handle detected failures
5. Add `start()` / `stop()` methods: control polling lifecycle
6. Integrate with existing GitHub client (`plugins/specweave-github/lib/github-client-v2.ts`)
7. Write unit tests (5 tests)
8. Write integration tests (2 tests)
9. Run tests: `npm test workflow-monitor` (should pass: 7/7)
10. Verify coverage: `npm run coverage` (should be ≥88%)

**Dependencies**: Existing GitHub client (ADR-0022)

---

### T-002: Implement State Manager

**User Story**: US-001
**Acceptance Criteria**: AC-US1-03, AC-US1-04
**Priority**: P1
**Estimate**: 4 hours
**Status**: [ ] pending
**Dependencies**: T-001

**Test Plan**:
- **Given** workflow status data needs persistence
- **When** state is saved to disk
- **Then** state file is created in `.specweave/state/cicd-monitor.json`
- **And** state can be loaded on restart
- **And** processed runs are tracked for deduplication

**Test Cases**:
1. **Unit**: `tests/unit/cicd/state-manager.test.ts`
   - testSavesStateToJSON(): File creation and format
   - testLoadsStateFromJSON(): Deserialization
   - testMarksRunAsProcessed(): Deduplication tracking
   - testHandlesMissingStateFile(): Initial state creation
   - testHandlesCorruptedState(): Error recovery
   - **Coverage Target**: 92%

**Overall Coverage Target**: 92%

**Implementation**:
1. Create file: `src/core/cicd/state-manager.ts`
2. Define `CICDState` interface (workflows, lastPoll, processedRuns)
3. Implement `load()` method: read from JSON file
4. Implement `save()` method: write to JSON file
5. Implement `markProcessed()` / `hasProcessed()`: deduplication
6. Add error handling for corrupted state files
7. Write unit tests (5 tests)
8. Run tests: `npm test state-manager` (should pass: 5/5)
9. Verify coverage: `npm run coverage` (should be ≥92%)

---

### T-003: Implement Log Extractor (GitHub API)

**User Story**: US-005
**Acceptance Criteria**: AC-US5-01, AC-US5-02, AC-US5-03, AC-US5-04
**Priority**: P1
**Estimate**: 5 hours
**Status**: [ ] pending
**Dependencies**: T-001

**Test Plan**:
- **Given** a workflow run has failed
- **When** logs are extracted from GitHub
- **Then** last 500 lines of failure logs are retrieved
- **And** ANSI color codes are stripped
- **And** sensitive data (tokens, secrets) is redacted

**Test Cases**:
1. **Unit**: `tests/unit/cicd/log-extractor.test.ts`
   - testExtractsLast500Lines(): Log truncation
   - testStripsANSICodes(): Color code removal
   - testRedactsSensitiveData(): Secret redaction (tokens, API keys)
   - testIdentifiesErrorLines(): Error pattern matching
   - testExtractsStackTraces(): Stack trace detection
   - **Coverage Target**: 90%

2. **Integration**: `tests/integration/cicd/log-extraction-integration.test.ts`
   - testGitHubAPILogDownload(): Real log retrieval
   - testMultiJobLogExtraction(): Multiple job logs
   - **Coverage Target**: 85%

**Overall Coverage Target**: 88%

**Implementation**:
1. Create file: `src/core/cicd/log-extractor.ts`
2. Implement `extractLogs()` method: download from GitHub API
3. Add `stripANSI()` utility: remove color codes
4. Add `redactSecrets()` utility: mask sensitive data
5. Add `extractErrorLines()`: identify error patterns
6. Add `extractStackTraces()`: parse stack traces
7. Write unit tests (5 tests)
8. Write integration tests (2 tests)
9. Run tests: `npm test log-extractor` (should pass: 7/7)
10. Verify coverage: `npm run coverage` (should be ≥88%)

**Security**: Must redact: GITHUB_TOKEN, API keys, passwords, AWS credentials

---

### T-004: Create CLI Command - cicd start

**User Story**: US-001
**Acceptance Criteria**: AC-US1-01
**Priority**: P1
**Estimate**: 3 hours
**Status**: [ ] pending
**Dependencies**: T-001, T-002

**Test Plan**:
- **Given** user runs `specweave cicd start`
- **When** command executes
- **Then** workflow monitoring starts
- **And** polling loop begins every 60 seconds
- **And** user sees success message

**Test Cases**:
1. **Unit**: `tests/unit/cli/cicd-start.test.ts`
   - testStartsMonitoring(): Monitoring process starts
   - testValidatesGitHubCLI(): Checks `gh` CLI availability
   - testLoadsConfig(): Reads `.specweave/config.json`
   - **Coverage Target**: 85%

2. **E2E**: `tests/e2e/cicd/start-command.spec.ts`
   - userCanStartMonitoring(): Full CLI workflow
   - **Coverage Target**: 100%

**Overall Coverage Target**: 90%

**Implementation**:
1. Create file: `src/cli/commands/cicd/start.ts`
2. Implement command: `specweave cicd start`
3. Add validation: check GitHub CLI availability
4. Instantiate `WorkflowMonitor` and call `start()`
5. Display status message
6. Write unit tests (3 tests)
7. Write E2E test (1 test)
8. Run tests: `npm test cicd-start` (should pass: 4/4)

---

### T-005: Create CLI Command - cicd stop

**User Story**: US-001
**Acceptance Criteria**: AC-US1-01
**Priority**: P1
**Estimate**: 2 hours
**Status**: [ ] pending
**Dependencies**: T-004

**Test Plan**:
- **Given** workflow monitoring is running
- **When** user runs `specweave cicd stop`
- **Then** polling loop stops
- **And** state is saved
- **And** user sees confirmation message

**Test Cases**:
1. **Unit**: `tests/unit/cli/cicd-stop.test.ts`
   - testStopsMonitoring(): Polling stops
   - testSavesStateOnStop(): Persistence
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Create file: `src/cli/commands/cicd/stop.ts`
2. Implement command: `specweave cicd stop`
3. Call `monitor.stop()`
4. Save state
5. Write unit tests (2 tests)
6. Run tests: `npm test cicd-stop` (should pass: 2/2)

---

### T-006: Create CLI Command - cicd status

**User Story**: US-001
**Acceptance Criteria**: AC-US1-03
**Priority**: P1
**Estimate**: 3 hours
**Status**: [ ] pending
**Dependencies**: T-002

**Test Plan**:
- **Given** monitoring has processed workflows
- **When** user runs `specweave cicd status`
- **Then** current monitoring status is displayed
- **And** recent failures are listed
- **And** last poll time is shown

**Test Cases**:
1. **Unit**: `tests/unit/cli/cicd-status.test.ts`
   - testDisplaysCurrentStatus(): Status rendering
   - testListsRecentFailures(): Failure summary
   - testHandlesNoState(): Empty state message
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Create file: `src/cli/commands/cicd/status.ts`
2. Implement command: `specweave cicd status`
3. Load state from `StateManager`
4. Format and display status
5. Write unit tests (3 tests)
6. Run tests: `npm test cicd-status` (should pass: 3/3)

---

### T-007: Create CLI Command - cicd list-failures

**User Story**: US-002, US-003, US-004
**Acceptance Criteria**: AC-US2-01, AC-US3-01, AC-US4-01
**Priority**: P1
**Estimate**: 3 hours
**Status**: [ ] pending
**Dependencies**: T-002

**Test Plan**:
- **Given** multiple workflow failures have been detected
- **When** user runs `specweave cicd list-failures`
- **Then** all recent failures are listed
- **And** each failure shows: workflow name, run ID, timestamp
- **And** failure type is indicated (DORA, test, build, dependency)

**Test Cases**:
1. **Unit**: `tests/unit/cli/cicd-list-failures.test.ts`
   - testListsAllFailures(): Complete list rendering
   - testFormatsTimestamps(): Human-readable dates
   - testShowsFailureTypes(): Type classification
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Create file: `src/cli/commands/cicd/list-failures.ts`
2. Implement command: `specweave cicd list-failures`
3. Load failure data from state
4. Format and display table
5. Write unit tests (3 tests)
6. Run tests: `npm test cicd-list-failures` (should pass: 3/3)

---

## Phase 2: AI Analysis & Fix Generation (Week 3-4)

### T-008: Implement Haiku Log Extractor (AI)

**User Story**: US-005, US-006
**Acceptance Criteria**: AC-US5-02, AC-US6-01, AC-US6-04
**Priority**: P1
**Estimate**: 6 hours
**Status**: [ ] pending
**Dependencies**: T-003

**Test Plan**:
- **Given** raw failure logs from GitHub
- **When** Haiku is invoked for extraction
- **Then** structured error data is returned
- **And** error type is classified (build, test, dependency, etc.)
- **And** cost is < $0.003 per extraction

**Test Cases**:
1. **Unit**: `tests/unit/cicd/haiku-extractor.test.ts`
   - testExtractsTypeScriptErrors(): Build error parsing
   - testExtractsTestFailures(): Test failure parsing
   - testExtractsDependencyErrors(): Dependency conflict parsing
   - testCalculatesConfidence(): Confidence scoring
   - testCostTracking(): Cost per extraction
   - **Coverage Target**: 90%

2. **Integration**: `tests/integration/cicd/haiku-extraction-integration.test.ts`
   - testRealAnthropicAPICall(): Live Haiku API
   - testCostUnderBudget(): Verify < $0.003
   - **Coverage Target**: 85%

**Overall Coverage Target**: 88%

**Implementation**:
1. Create file: `src/core/cicd/haiku-extractor.ts`
2. Define `ErrorExtraction` interface
3. Implement `extract()` method: call Haiku API
4. Build extraction prompt template
5. Parse JSON response
6. Add cost tracking
7. Write unit tests (5 tests)
8. Write integration tests (2 tests)
9. Run tests: `npm test haiku-extractor` (should pass: 7/7)
10. Verify coverage and cost: `npm run coverage` (≥88%, cost < $0.003)

**Model**: Claude 3.5 Haiku ($0.25/MTok input, $1.25/MTok output)

---

### T-009: Implement Sonnet Root Cause Analyzer

**User Story**: US-006, US-008
**Acceptance Criteria**: AC-US6-02, AC-US6-03, AC-US8-01, AC-US8-02
**Priority**: P1
**Estimate**: 8 hours
**Status**: [ ] pending
**Dependencies**: T-008

**Test Plan**:
- **Given** structured error extraction from Haiku
- **When** Sonnet is invoked for analysis
- **Then** root cause is identified
- **And** fix proposal with code changes is generated
- **And** analysis completes in < 30 seconds
- **And** cost is < $0.08 per analysis

**Test Cases**:
1. **Unit**: `tests/unit/cicd/sonnet-analyzer.test.ts`
   - testAnalyzesTypeScriptError(): Type error fix
   - testAnalyzesTestFailure(): Test fix proposal
   - testAnalyzesDependencyConflict(): Version resolution
   - testGeneratesFixWithConfidence(): Confidence scoring
   - testLoadsAffectedFiles(): File content loading
   - testCostTracking(): Cost per analysis
   - **Coverage Target**: 92%

2. **Integration**: `tests/integration/cicd/sonnet-analysis-integration.test.ts`
   - testRealAnthropicAPICall(): Live Sonnet API
   - testCostUnderBudget(): Verify < $0.08
   - testLatencyUnder30s(): Performance check
   - **Coverage Target**: 85%

**Overall Coverage Target**: 90%

**Implementation**:
1. Create file: `src/core/cicd/sonnet-analyzer.ts`
2. Define `FixProposal` interface
3. Implement `analyze()` method: call Sonnet API
4. Add `loadAffectedFiles()`: read file contents
5. Add `getRecentDiff()`: git diff for context
6. Build analysis prompt template
7. Parse JSON response
8. Add cost tracking
9. Write unit tests (6 tests)
10. Write integration tests (3 tests)
11. Run tests: `npm test sonnet-analyzer` (should pass: 9/9)
12. Verify coverage, cost, latency: `npm run coverage` (≥90%, cost < $0.08, latency < 30s)

**Model**: Claude Sonnet 4.0 ($3/MTok input, $15/MTok output)

---

### T-010: Implement Analysis Orchestrator (Two-Phase Pipeline)

**User Story**: US-006
**Acceptance Criteria**: AC-US6-02, AC-US6-04
**Priority**: P1
**Estimate**: 5 hours
**Status**: [ ] pending
**Dependencies**: T-008, T-009

**Test Plan**:
- **Given** failure logs need analysis
- **When** orchestrator is invoked
- **Then** Haiku extraction runs first
- **And** Sonnet analysis runs second
- **And** fallback to Sonnet-only if Haiku fails
- **And** total cost is < $0.10 per failure

**Test Cases**:
1. **Unit**: `tests/unit/cicd/analysis-orchestrator.test.ts`
   - testTwoPhaseFlow(): Haiku → Sonnet
   - testFallbackToSonnetOnly(): Error handling
   - testTotalCostTracking(): Combined cost
   - testLowConfidenceHandling(): Retry logic
   - **Coverage Target**: 90%

2. **Integration**: `tests/integration/cicd/full-analysis-pipeline.test.ts`
   - testEndToEndAnalysis(): Real failure → fix proposal
   - testCostUnderBudget(): Verify < $0.10
   - **Coverage Target**: 90%

**Overall Coverage Target**: 90%

**Implementation**:
1. Create file: `src/core/cicd/analysis-orchestrator.ts`
2. Implement `analyzeFull()` method: coordinate phases
3. Add fallback logic for low confidence extraction
4. Add cost aggregation
5. Write unit tests (4 tests)
6. Write integration tests (2 tests)
7. Run tests: `npm test analysis-orchestrator` (should pass: 6/6)
8. Verify coverage and cost: `npm run coverage` (≥90%, cost < $0.10)

---

### T-011: Implement Cost Tracker

**User Story**: US-006
**Acceptance Criteria**: AC-US6-04, AC-NFR2-01
**Priority**: P1
**Estimate**: 4 hours
**Status**: [ ] pending
**Dependencies**: T-008, T-009, T-010

**Test Plan**:
- **Given** Claude API calls are made
- **When** cost tracker records usage
- **Then** per-analysis cost is calculated
- **And** alerts are triggered if > $0.10
- **And** weekly/monthly reports are available

**Test Cases**:
1. **Unit**: `tests/unit/cicd/cost-tracker.test.ts`
   - testTracksCostPerPhase(): Haiku + Sonnet tracking
   - testCalculatesHaikuCost(): Pricing accuracy
   - testCalculatesSonnetCost(): Pricing accuracy
   - testAlertsOnBudgetExceed(): Threshold warnings
   - testGeneratesCostReport(): Summary generation
   - **Coverage Target**: 90%

**Overall Coverage Target**: 90%

**Implementation**:
1. Create file: `src/core/cicd/cost-tracker.ts`
2. Implement `track()` method: record API usage
3. Implement `calculateCost()`: apply pricing
4. Add alert logic for > $0.10
5. Add report generation
6. Write unit tests (5 tests)
7. Run tests: `npm test cost-tracker` (should pass: 5/5)
8. Verify coverage: `npm run coverage` (≥90%)

---

### T-012: Handle TypeScript Build Failures

**User Story**: US-011
**Acceptance Criteria**: AC-US11-01
**Priority**: P1
**Estimate**: 5 hours
**Status**: [ ] pending
**Dependencies**: T-009

**Test Plan**:
- **Given** TypeScript compilation error in logs
- **When** Sonnet analyzes the failure
- **Then** type error fix is proposed
- **And** import statements are corrected if needed
- **And** fix confidence is > 0.8 for common errors

**Test Cases**:
1. **Unit**: `tests/unit/cicd/typescript-fix-handler.test.ts`
   - testFixesTypeError(): Type mismatch correction
   - testFixesMissingImport(): Import addition
   - testFixesWrongTypeAnnotation(): Type annotation fix
   - **Coverage Target**: 88%

**Overall Coverage Target**: 88%

**Implementation**:
1. Extend `sonnet-analyzer.ts` with TypeScript-specific handling
2. Add TypeScript error pattern detection
3. Add fix templates for common errors
4. Write unit tests (3 tests)
5. Run tests: `npm test typescript-fix-handler` (should pass: 3/3)
6. Verify coverage: `npm run coverage` (≥88%)

---

### T-013: Handle Test Failures

**User Story**: US-010
**Acceptance Criteria**: AC-US10-01, AC-US10-03
**Priority**: P1
**Estimate**: 5 hours
**Status**: [ ] pending
**Dependencies**: T-009

**Test Plan**:
- **Given** test failure in logs (expected vs actual)
- **When** Sonnet analyzes the failure
- **Then** test fix OR implementation fix is proposed
- **And** fix explanation includes reasoning
- **And** confidence reflects ambiguity

**Test Cases**:
1. **Unit**: `tests/unit/cicd/test-fix-handler.test.ts`
   - testFixesTestAssertionError(): Assertion correction
   - testProposesImplementationFix(): Code fix instead of test fix
   - testHandlesAmbiguousCase(): Multiple fix options
   - **Coverage Target**: 88%

**Overall Coverage Target**: 88%

**Implementation**:
1. Extend `sonnet-analyzer.ts` with test failure handling
2. Add assertion error pattern detection
3. Add logic to distinguish test bug vs implementation bug
4. Write unit tests (3 tests)
5. Run tests: `npm test test-fix-handler` (should pass: 3/3)
6. Verify coverage: `npm run coverage` (≥88%)

---

### T-014: Handle Dependency Update Failures

**User Story**: US-009
**Acceptance Criteria**: AC-US9-01, AC-US9-02
**Priority**: P1
**Estimate**: 5 hours
**Status**: [ ] pending
**Dependencies**: T-009

**Test Plan**:
- **Given** dependency conflict in logs
- **When** Sonnet analyzes the failure
- **Then** compatible version range is proposed
- **And** breaking changes are identified
- **And** migration steps are provided

**Test Cases**:
1. **Unit**: `tests/unit/cicd/dependency-fix-handler.test.ts`
   - testFixesVersionConflict(): Version range correction
   - testIdentifiesBreakingChanges(): Breaking change detection
   - testProposesCompatibleVersions(): Semver logic
   - **Coverage Target**: 88%

**Overall Coverage Target**: 88%

**Implementation**:
1. Extend `sonnet-analyzer.ts` with dependency handling
2. Add version conflict pattern detection
3. Add semver compatibility logic
4. Write unit tests (3 tests)
5. Run tests: `npm test dependency-fix-handler` (should pass: 3/3)
6. Verify coverage: `npm run coverage` (≥88%)

---

### T-015: Create CLI Command - cicd fix propose

**User Story**: US-008, US-012
**Acceptance Criteria**: AC-US8-01, AC-US12-01, AC-US12-02
**Priority**: P1
**Estimate**: 4 hours
**Status**: [ ] pending
**Dependencies**: T-010

**Test Plan**:
- **Given** user runs `specweave cicd fix propose <run-id>`
- **When** command executes
- **Then** fix proposal is generated
- **And** side-by-side diff is shown
- **And** affected files are listed
- **And** confidence score is displayed

**Test Cases**:
1. **Unit**: `tests/unit/cli/cicd-fix-propose.test.ts`
   - testGeneratesFixProposal(): Proposal creation
   - testDisplaysDiff(): Diff rendering
   - testShowsConfidence(): Score display
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Create file: `src/cli/commands/cicd/fix-propose.ts`
2. Implement command: `specweave cicd fix propose <run-id>`
3. Call `analysisOrchestrator.analyzeFull()`
4. Format and display fix proposal
5. Write unit tests (3 tests)
6. Run tests: `npm test cicd-fix-propose` (should pass: 3/3)

---

## Phase 3: Fix Application & Verification (Week 5)

### T-016: Implement Safety Validator (Safety Gates)

**User Story**: US-021
**Acceptance Criteria**: AC-US21-01, AC-US21-02, AC-US21-03
**Priority**: P1
**Estimate**: 6 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** fix proposal is generated
- **When** safety validator evaluates it
- **Then** safety gate decision is returned (autoApply: true/false)
- **And** reason for decision is provided
- **And** warnings are listed

**Test Cases**:
1. **Unit**: `tests/unit/cicd/safety-validator.test.ts`
   - testRejectsLowConfidence(): Confidence threshold
   - testRejectsCriticalFiles(): Workflow/config files
   - testRejectsMultiFileChanges(): Too many files
   - testRejectsTestChanges(): Test file modifications
   - testAllowsHighConfidenceSingleFile(): Pass all gates
   - **Coverage Target**: 95%

**Overall Coverage Target**: 95%

**Implementation**:
1. Create file: `src/core/cicd/safety-validator.ts`
2. Define `SafetyGate` interface
3. Implement `evaluate()` method: run all gates
4. Add `checkCriticalFiles()`: pattern matching
5. Add `checkConfidence()`: threshold check
6. Add `checkMultiFile()`: file count check
7. Write unit tests (5 tests)
8. Run tests: `npm test safety-validator` (should pass: 5/5)
9. Verify coverage: `npm run coverage` (≥95%)

---

### T-017: Implement Rollback Manager (Backup & Restore)

**User Story**: US-013, US-015
**Acceptance Criteria**: AC-US13-02, AC-US13-03, AC-US15-02
**Priority**: P1
**Estimate**: 5 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** fix is about to be applied
- **When** backup is created
- **Then** original file contents are stored
- **And** backup is persisted to disk
- **And** rollback command can restore original state

**Test Cases**:
1. **Unit**: `tests/unit/cicd/rollback-manager.test.ts`
   - testCreatesBackup(): Backup creation
   - testRollsBackSingleFile(): Single file restore
   - testRollsBackMultipleFiles(): Multi-file restore
   - testListsAvailableBackups(): Backup enumeration
   - testHandlesCorruptedBackup(): Error recovery
   - **Coverage Target**: 92%

**Overall Coverage Target**: 92%

**Implementation**:
1. Create file: `src/core/cicd/rollback-manager.ts`
2. Define `FixBackup` interface
3. Implement `createBackup()`: save original files
4. Implement `rollback()`: restore from backup
5. Implement `listBackups()`: enumerate backups
6. Write unit tests (5 tests)
7. Run tests: `npm test rollback-manager` (should pass: 5/5)
8. Verify coverage: `npm run coverage` (≥92%)

---

### T-018: Implement Fix Applicator

**User Story**: US-013
**Acceptance Criteria**: AC-US13-01, AC-US13-04
**Priority**: P1
**Estimate**: 6 hours
**Status**: [ ] pending
**Dependencies**: T-016, T-017

**Test Plan**:
- **Given** fix proposal is approved
- **When** applicator applies changes
- **Then** all file changes are written
- **And** backup is created first
- **And** git commit is created (optional)
- **And** desktop notification is sent

**Test Cases**:
1. **Unit**: `tests/unit/cicd/fix-applicator.test.ts`
   - testAppliesSingleFileChange(): File modification
   - testAppliesMultipleFileChanges(): Multi-file modification
   - testCreatesGitCommit(): Git integration
   - testSendsNotification(): Desktop notification
   - testRollsBackOnError(): Error handling
   - **Coverage Target**: 90%

2. **Integration**: `tests/integration/cicd/fix-application-integration.test.ts`
   - testAppliesRealFix(): File system integration
   - testGitCommitCreation(): Git integration
   - **Coverage Target**: 85%

**Overall Coverage Target**: 88%

**Implementation**:
1. Create file: `src/core/cicd/fix-applicator.ts`
2. Implement `apply()` method: write file changes
3. Add `createGitCommit()`: git integration
4. Add `sendNotification()`: desktop notification
5. Integrate with `RollbackManager`
6. Write unit tests (5 tests)
7. Write integration tests (2 tests)
8. Run tests: `npm test fix-applicator` (should pass: 7/7)
9. Verify coverage: `npm run coverage` (≥88%)

---

### T-019: Implement Verification Manager (Workflow Re-run)

**User Story**: US-015
**Acceptance Criteria**: AC-US15-01, AC-US15-02, AC-US15-03
**Priority**: P1
**Estimate**: 6 hours
**Status**: [ ] pending
**Dependencies**: T-018

**Test Plan**:
- **Given** fix has been applied
- **When** verification manager is invoked
- **Then** workflow is re-run on GitHub
- **And** system polls for completion
- **And** success/failure is reported
- **And** rollback is triggered if workflow still fails

**Test Cases**:
1. **Unit**: `tests/unit/cicd/verification-manager.test.ts`
   - testRerunsWorkflow(): GitHub API call
   - testWaitsForCompletion(): Polling logic
   - testHandlesTimeout(): Timeout after 10 minutes
   - testTriggersRollbackOnFailure(): Rollback integration
   - testTracksSuccessRate(): Metrics tracking
   - **Coverage Target**: 92%

2. **Integration**: `tests/integration/cicd/verification-integration.test.ts`
   - testRealWorkflowRerun(): Live GitHub API
   - testRollbackOnFailedVerification(): End-to-end rollback
   - **Coverage Target**: 85%

**Overall Coverage Target**: 90%

**Implementation**:
1. Create file: `src/core/cicd/verification-manager.ts`
2. Implement `verify()` method: rerun workflow
3. Implement `waitForCompletion()`: poll for status
4. Add timeout logic (10 minutes)
5. Integrate with `RollbackManager` for failed verifications
6. Write unit tests (5 tests)
7. Write integration tests (2 tests)
8. Run tests: `npm test verification-manager` (should pass: 7/7)
9. Verify coverage: `npm run coverage` (≥90%)

---

### T-020: Create CLI Command - cicd fix apply

**User Story**: US-013
**Acceptance Criteria**: AC-US13-01
**Priority**: P1
**Estimate**: 4 hours
**Status**: [ ] pending
**Dependencies**: T-018

**Test Plan**:
- **Given** fix proposal exists
- **When** user runs `specweave cicd fix apply <fix-id>`
- **Then** fix is applied
- **And** backup is created
- **And** verification is triggered (optional)
- **And** user sees confirmation

**Test Cases**:
1. **Unit**: `tests/unit/cli/cicd-fix-apply.test.ts`
   - testAppliesFix(): Fix application
   - testCreatesBackup(): Backup creation
   - testTriggersVerification(): Verification flow
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Create file: `src/cli/commands/cicd/fix-apply.ts`
2. Implement command: `specweave cicd fix apply <fix-id>`
3. Call `safetyValidator.evaluate()` and `fixApplicator.apply()`
4. Trigger verification if configured
5. Write unit tests (3 tests)
6. Run tests: `npm test cicd-fix-apply` (should pass: 3/3)

---

### T-021: Create CLI Command - cicd fix preview

**User Story**: US-012
**Acceptance Criteria**: AC-US12-01, AC-US12-02
**Priority**: P1
**Estimate**: 3 hours
**Status**: [ ] pending
**Dependencies**: T-015

**Test Plan**:
- **Given** fix proposal exists
- **When** user runs `specweave cicd fix preview <fix-id>`
- **Then** side-by-side diff is displayed
- **And** affected files are listed
- **And** confidence score is shown

**Test Cases**:
1. **Unit**: `tests/unit/cli/cicd-fix-preview.test.ts`
   - testDisplaysDiff(): Diff rendering
   - testShowsAffectedFiles(): File list
   - testShowsConfidence(): Score display
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Create file: `src/cli/commands/cicd/fix-preview.ts`
2. Implement command: `specweave cicd fix preview <fix-id>`
3. Load fix proposal from state
4. Render side-by-side diff
5. Write unit tests (3 tests)
6. Run tests: `npm test cicd-fix-preview` (should pass: 3/3)

---

### T-022: Create CLI Command - cicd fix rollback

**User Story**: US-013
**Acceptance Criteria**: AC-US13-03
**Priority**: P1
**Estimate**: 3 hours
**Status**: [ ] pending
**Dependencies**: T-017

**Test Plan**:
- **Given** fix has been applied
- **When** user runs `specweave cicd fix rollback <fix-id>`
- **Then** original files are restored
- **And** user sees confirmation
- **And** rollback is logged

**Test Cases**:
1. **Unit**: `tests/unit/cli/cicd-fix-rollback.test.ts`
   - testRollsBackFix(): Rollback execution
   - testDisplaysConfirmation(): User feedback
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Create file: `src/cli/commands/cicd/fix-rollback.ts`
2. Implement command: `specweave cicd fix rollback <fix-id>`
3. Call `rollbackManager.rollback()`
4. Display confirmation
5. Write unit tests (2 tests)
6. Run tests: `npm test cicd-fix-rollback` (should pass: 2/2)

---

### T-023: Implement Desktop Notifications

**User Story**: US-018
**Acceptance Criteria**: AC-US18-01, AC-US18-02, AC-US18-03
**Priority**: P2
**Estimate**: 4 hours
**Status**: [ ] pending
**Dependencies**: T-018

**Test Plan**:
- **Given** workflow failure is detected or fix is applied
- **When** notification is triggered
- **Then** desktop notification is displayed
- **And** notification includes: workflow name, failure reason, fix status
- **And** notification links to CLI command

**Test Cases**:
1. **Unit**: `tests/unit/cicd/notification-manager.test.ts`
   - testSendsFailureNotification(): Failure alert
   - testSendsFixProposedNotification(): Fix ready alert
   - testSendsFixAppliedNotification(): Fix applied alert
   - testHandlesUnavailableNotifier(): Error handling
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Create file: `src/core/cicd/notification-manager.ts`
2. Integrate `node-notifier` package
3. Implement `notify()` method: send notification
4. Add platform detection (macOS, Linux, Windows)
5. Write unit tests (4 tests)
6. Run tests: `npm test notification-manager` (should pass: 4/4)
7. Verify coverage: `npm run coverage` (≥85%)

**Dependencies**: `node-notifier` (new NPM package)

---

### T-024: Add Configuration Schema for Auto-Fix Settings

**User Story**: US-020, US-021
**Acceptance Criteria**: AC-US20-01, AC-US21-01, AC-US21-02
**Priority**: P1
**Estimate**: 3 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** user configures auto-fix settings
- **When** config is validated
- **Then** schema validation passes
- **And** default values are applied if missing
- **And** invalid values are rejected

**Test Cases**:
1. **Unit**: `tests/unit/config/cicd-config-schema.test.ts`
   - testValidatesMonitoredWorkflows(): Workflow filter validation
   - testValidatesAutoFixMode(): Mode enum validation
   - testValidatesCriticalFiles(): File pattern validation
   - testAppliesDefaults(): Default value application
   - **Coverage Target**: 90%

**Overall Coverage Target**: 90%

**Implementation**:
1. Update `src/core/schemas/specweave-config.schema.json`
2. Add `cicd` section with auto-fix settings
3. Add validation rules
4. Update `ConfigManager` to load CICD settings
5. Write unit tests (4 tests)
6. Run tests: `npm test cicd-config-schema` (should pass: 4/4)

---

## Phase 4: Intelligence & Learning (Week 6-7)

### T-025: Implement Pattern Database (SQLite)

**User Story**: US-016
**Acceptance Criteria**: AC-US16-01
**Priority**: P2
**Estimate**: 5 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** failures and fixes are being tracked
- **When** pattern database is initialized
- **Then** SQLite database is created
- **And** tables are created: failures, fixes, patterns
- **And** data can be inserted and queried

**Test Cases**:
1. **Unit**: `tests/unit/cicd/pattern-database.test.ts`
   - testCreatesDatabase(): Database initialization
   - testInsertsFailure(): Failure record insertion
   - testInsertsFix(): Fix record insertion
   - testQueriesPatterns(): Pattern retrieval
   - **Coverage Target**: 88%

**Overall Coverage Target**: 88%

**Implementation**:
1. Create file: `src/core/cicd/pattern-database.ts`
2. Define database schema (failures, fixes, patterns tables)
3. Implement `init()` method: create database
4. Implement `insertFailure()` / `insertFix()`: data insertion
5. Implement `queryPatterns()`: pattern retrieval
6. Write unit tests (4 tests)
7. Run tests: `npm test pattern-database` (should pass: 4/4)

**Dependencies**: `better-sqlite3` (new NPM package)

---

### T-026: Implement Pattern Learner

**User Story**: US-016
**Acceptance Criteria**: AC-US16-02, AC-US16-03
**Priority**: P2
**Estimate**: 6 hours
**Status**: [ ] pending
**Dependencies**: T-025

**Test Plan**:
- **Given** historical failure and fix data
- **When** pattern learner analyzes data
- **Then** recurring patterns are detected
- **And** similar failures are matched
- **And** previously successful fixes are suggested

**Test Cases**:
1. **Unit**: `tests/unit/cicd/pattern-learner.test.ts`
   - testDetectsRecurringPattern(): Pattern matching
   - testCalculatesSimilarity(): Failure similarity scoring
   - testSuggestsPreviousFix(): Historical fix suggestion
   - testTracksSuccessRate(): Fix effectiveness tracking
   - **Coverage Target**: 88%

**Overall Coverage Target**: 88%

**Implementation**:
1. Create file: `src/core/cicd/pattern-learner.ts`
2. Implement `detectPattern()`: identify recurring failures
3. Implement `calculateSimilarity()`: error text comparison
4. Implement `suggestFix()`: historical fix lookup
5. Write unit tests (4 tests)
6. Run tests: `npm test pattern-learner` (should pass: 4/4)
7. Verify coverage: `npm run coverage` (≥88%)

---

### T-027: Implement Flaky Test Detector

**User Story**: US-017
**Acceptance Criteria**: AC-US17-01, AC-US17-02, AC-US17-03
**Priority**: P2
**Estimate**: 5 hours
**Status**: [ ] pending
**Dependencies**: T-025

**Test Plan**:
- **Given** test failure history in database
- **When** flaky test detector analyzes data
- **Then** tests with intermittent failures are flagged
- **And** flakiness score is calculated (failure rate)
- **And** root causes are suggested

**Test Cases**:
1. **Unit**: `tests/unit/cicd/flaky-test-detector.test.ts`
   - testDetectsFlakyTest(): Intermittent failure detection
   - testCalculatesFlakiness(): Failure rate calculation
   - testSuggestsRootCauses(): Cause analysis
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Create file: `src/core/cicd/flaky-test-detector.ts`
2. Implement `detectFlaky()`: analyze test history
3. Implement `calculateFlakiness()`: failure rate
4. Implement `suggestCauses()`: common flakiness causes
5. Write unit tests (3 tests)
6. Run tests: `npm test flaky-test-detector` (should pass: 3/3)
7. Verify coverage: `npm run coverage` (≥85%)

---

### T-028: Implement Report Generator

**User Story**: US-019
**Acceptance Criteria**: AC-US19-01, AC-US19-02
**Priority**: P2
**Estimate**: 5 hours
**Status**: [ ] pending
**Dependencies**: T-025, T-026

**Test Plan**:
- **Given** failure and fix history
- **When** report generator creates weekly report
- **Then** markdown report is generated
- **And** report includes: total failures, fix success rate, common failure types
- **And** report includes trends and recommendations

**Test Cases**:
1. **Unit**: `tests/unit/cicd/report-generator.test.ts`
   - testGeneratesWeeklyReport(): Report creation
   - testIncludesMetrics(): Metrics accuracy
   - testFormatsMarkdown(): Markdown formatting
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Create file: `src/core/cicd/report-generator.ts`
2. Implement `generateWeeklyReport()`: create report
3. Add metrics calculation (success rate, failure types)
4. Add markdown formatting
5. Write unit tests (3 tests)
6. Run tests: `npm test report-generator` (should pass: 3/3)
7. Verify coverage: `npm run coverage` (≥85%)

---

### T-029: Create CLI Command - cicd report

**User Story**: US-019
**Acceptance Criteria**: AC-US19-01, AC-US19-02
**Priority**: P2
**Estimate**: 3 hours
**Status**: [ ] pending
**Dependencies**: T-028

**Test Plan**:
- **Given** user runs `specweave cicd report [--days 7]`
- **When** command executes
- **Then** failure report is displayed
- **And** report can be saved to file
- **And** time range is configurable

**Test Cases**:
1. **Unit**: `tests/unit/cli/cicd-report.test.ts`
   - testGeneratesReport(): Report generation
   - testFiltersByTimeRange(): Date filtering
   - testSavesToFile(): File output
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Create file: `src/cli/commands/cicd/report.ts`
2. Implement command: `specweave cicd report [--days 7]`
3. Call `reportGenerator.generateWeeklyReport()`
4. Display or save report
5. Write unit tests (3 tests)
6. Run tests: `npm test cicd-report` (should pass: 3/3)

---

### T-030: Create CLI Command - cicd costs

**User Story**: US-006
**Acceptance Criteria**: AC-NFR2-01
**Priority**: P2
**Estimate**: 3 hours
**Status**: [ ] pending
**Dependencies**: T-011

**Test Plan**:
- **Given** user runs `specweave cicd costs`
- **When** command executes
- **Then** cost dashboard is displayed
- **And** costs are broken down by phase (extraction, analysis)
- **And** budget utilization is shown

**Test Cases**:
1. **Unit**: `tests/unit/cli/cicd-costs.test.ts`
   - testDisplaysCostDashboard(): Dashboard rendering
   - testBreaksDownCosts(): Phase breakdown
   - testShowsBudgetUtilization(): Budget calculation
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Create file: `src/cli/commands/cicd/costs.ts`
2. Implement command: `specweave cicd costs`
3. Load cost data from `CostTracker`
4. Format and display dashboard
5. Write unit tests (3 tests)
6. Run tests: `npm test cicd-costs` (should pass: 3/3)

---

## Integration & E2E Testing (Week 6-7)

### T-031: E2E Test - Full Auto-Fix Workflow

**User Story**: All
**Acceptance Criteria**: All critical path ACs
**Priority**: P1
**Estimate**: 8 hours
**Status**: [ ] pending
**Dependencies**: All Phase 1-3 tasks

**Test Plan**:
- **Given** SpecWeave is monitoring workflows
- **When** workflow fails → analyzed → fix proposed → auto-applied → verified
- **Then** entire flow completes successfully
- **And** workflow passes after fix
- **And** total time is < 5 minutes

**Test Cases**:
1. **E2E**: `tests/e2e/cicd/full-auto-fix-workflow.spec.ts`
   - testTypeScriptBuildErrorAutoFix(): Build error fix flow
   - testTestFailureAutoFix(): Test failure fix flow
   - testDependencyConflictAutoFix(): Dependency fix flow
   - **Coverage Target**: 100% (critical paths)

**Overall Coverage Target**: 100%

**Implementation**:
1. Create test repository: `anton-abyzov/specweave-test`
2. Add intentionally failing workflows
3. Write E2E test suite (3 scenarios)
4. Run E2E tests: `npm run test:e2e cicd` (should pass: 3/3)
5. Verify end-to-end latency < 5 minutes

**Test Infrastructure**: Dedicated GitHub repository for testing

---

### T-032: E2E Test - Manual Review Workflow

**User Story**: US-012, US-013
**Acceptance Criteria**: AC-US12-01, AC-US13-01
**Priority**: P1
**Estimate**: 5 hours
**Status**: [ ] pending
**Dependencies**: T-031

**Test Plan**:
- **Given** auto-fix is disabled (manual mode)
- **When** workflow fails → analyzed → fix proposed
- **Then** user reviews fix → manually applies → workflow passes

**Test Cases**:
1. **E2E**: `tests/e2e/cicd/manual-review-workflow.spec.ts`
   - testManualReviewAndApply(): User-driven flow
   - testManualReviewAndReject(): User rejects fix
   - **Coverage Target**: 100%

**Overall Coverage Target**: 100%

**Implementation**:
1. Write E2E test suite (2 scenarios)
2. Run E2E tests: `npm run test:e2e cicd-manual` (should pass: 2/2)

---

### T-033: E2E Test - Rollback on Failed Verification

**User Story**: US-015
**Acceptance Criteria**: AC-US15-02
**Priority**: P1
**Estimate**: 5 hours
**Status**: [ ] pending
**Dependencies**: T-031

**Test Plan**:
- **Given** fix is auto-applied
- **When** verification re-runs workflow and it still fails
- **Then** fix is rolled back automatically
- **And** user is notified
- **And** original files are restored

**Test Cases**:
1. **E2E**: `tests/e2e/cicd/rollback-workflow.spec.ts`
   - testAutoRollbackOnFailedVerification(): Rollback flow
   - **Coverage Target**: 100%

**Overall Coverage Target**: 100%

**Implementation**:
1. Write E2E test (1 scenario)
2. Run E2E test: `npm run test:e2e cicd-rollback` (should pass: 1/1)

---

### T-034: Integration Test - GitHub API Rate Limiting

**User Story**: US-001
**Acceptance Criteria**: AC-NFR2-02, AC-NFR3-02
**Priority**: P1
**Estimate**: 4 hours
**Status**: [ ] pending
**Dependencies**: T-001

**Test Plan**:
- **Given** GitHub API has rate limits
- **When** monitoring makes many API calls
- **Then** rate limit is not exceeded
- **And** conditional requests reduce API usage
- **And** exponential backoff is used on errors

**Test Cases**:
1. **Integration**: `tests/integration/cicd/rate-limiting.test.ts`
   - testStaysWithinRateLimits(): Quota tracking
   - testConditionalRequests(): 304 response handling
   - testExponentialBackoff(): Retry logic
   - **Coverage Target**: 90%

**Overall Coverage Target**: 90%

**Implementation**:
1. Write integration tests (3 tests)
2. Run tests: `npm run test:integration cicd-rate-limiting` (should pass: 3/3)
3. Verify API usage < 2% of quota

---

### T-035: Integration Test - Claude API Cost Validation

**User Story**: US-006
**Acceptance Criteria**: AC-US6-04, AC-NFR2-01
**Priority**: P1
**Estimate**: 4 hours
**Status**: [ ] pending
**Dependencies**: T-008, T-009, T-010

**Test Plan**:
- **Given** multiple failures are analyzed
- **When** Claude API costs are tracked
- **Then** average cost per analysis is < $0.10
- **And** no single analysis exceeds $0.15
- **And** cost dashboard is accurate

**Test Cases**:
1. **Integration**: `tests/integration/cicd/cost-validation.test.ts`
   - testAverageCostUnderBudget(): Cost averaging
   - testMaxCostNotExceeded(): Worst-case cost
   - testCostTrackingAccuracy(): Dashboard verification
   - **Coverage Target**: 90%

**Overall Coverage Target**: 90%

**Implementation**:
1. Write integration tests (3 tests)
2. Run tests: `npm run test:integration cicd-cost` (should pass: 3/3)
3. Verify average cost < $0.10

---

## Documentation & Polish (Week 7)

### T-036: Write User Documentation

**User Story**: All
**Acceptance Criteria**: N/A (documentation)
**Priority**: P2
**Estimate**: 6 hours
**Status**: [ ] pending
**Dependencies**: All tasks

**Validation**:
- Manual review: Clarity, completeness, accuracy
- Code examples: All examples tested
- Link checker: All links work

**Implementation**:
1. Create user guide: `.specweave/docs/public/guides/cicd-auto-fix-guide.md`
2. Document configuration options
3. Add usage examples for all CLI commands
4. Add troubleshooting section
5. Add FAQ section
6. Run link checker: `npm run check-links`
7. Review with team

---

### T-037: Create Architecture Diagrams

**User Story**: All
**Acceptance Criteria**: N/A (documentation)
**Priority**: P2
**Estimate**: 4 hours
**Status**: [ ] pending
**Dependencies**: All tasks

**Validation**:
- Manual review: Diagram accuracy
- Mermaid syntax: Valid and renders correctly

**Implementation**:
1. Create failure detection flow diagram (already exists: see plan.md)
2. Create auto-fix architecture diagram (already exists: see plan.md)
3. Add component interaction diagram
4. Add sequence diagrams for key workflows
5. Export to SVG: `npm run generate-diagram-svgs`
6. Review with team

**Files**: `.specweave/docs/internal/architecture/diagrams/cicd/`

---

### T-038: Update CHANGELOG.md

**User Story**: All
**Acceptance Criteria**: N/A (documentation)
**Priority**: P1
**Estimate**: 2 hours
**Status**: [ ] pending
**Dependencies**: All tasks

**Validation**:
- Manual review: Completeness, formatting

**Implementation**:
1. Add increment 0029 section to CHANGELOG.md
2. List all new features:
   - CI/CD failure detection
   - Claude-powered auto-fix
   - Three auto-apply modes
   - Rollback mechanism
   - Pattern learning
   - Cost tracking
3. List all new CLI commands
4. Add migration notes (if any)
5. Review with team

---

## Summary Statistics

**Total Tasks**: 38
**By Phase**:
- Phase 1 (Core Monitoring): 7 tasks
- Phase 2 (AI Analysis): 8 tasks
- Phase 3 (Fix Application): 9 tasks
- Phase 4 (Intelligence): 6 tasks
- Integration/E2E: 5 tasks
- Documentation: 3 tasks

**By Priority**:
- P1 (Critical): 29 tasks (76%)
- P2 (High): 9 tasks (24%)

**Test Coverage Targets**:
- Unit tests: 80-95% (average: 88%)
- Integration tests: 85-90% (average: 87%)
- E2E tests: 100% (critical paths only)
- **Overall**: 85%

**Time Estimate**: 170 hours (7 weeks)

**Cost Budget**: < $0.10 per failure analysis
**Expected Cost**: $0.015 per failure (6.7x under budget)

---

## Critical Dependencies

**External**:
- GitHub Actions API (REST)
- Anthropic Claude API (Haiku 3.5 + Sonnet 4.0)
- GitHub CLI (`gh` command)

**Internal**:
- ADR-0022: GitHub Sync Architecture
- ADR-0026: GitHub API Validation
- ADR-0031: Polling Architecture
- ADR-0032: Two-Phase AI Analysis
- ADR-0033: Safety Gates

**NPM Packages (New)**:
- `node-notifier` (desktop notifications)
- `better-sqlite3` (pattern database)

---

## Success Metrics

**At Completion**:
- [ ] Fix success rate > 70%
- [ ] Average cost per analysis < $0.10
- [ ] Detection latency < 2 minutes
- [ ] All unit tests passing (≥85% coverage)
- [ ] All integration tests passing (≥85% coverage)
- [ ] All E2E tests passing (100% critical paths)
- [ ] Documentation complete and reviewed

**Week 8 (Post-Launch)**:
- [ ] Real-world fix success rate tracked
- [ ] User feedback collected
- [ ] Cost dashboard shows actual usage
- [ ] Pattern learning improving accuracy

---

## Risk Mitigation

**High Priority Risks**:
1. **Claude analysis quality**: Mitigated by confidence scores, safety gates, rollback
2. **GitHub rate limiting**: Mitigated by conditional requests, 1-2% quota usage
3. **False positives**: Mitigated by verification re-runs, auto-rollback
4. **Cost overruns**: Mitigated by two-phase approach, cost tracking, $0.015 average

**Medium Priority Risks**:
- Verification timeout: 10-minute timeout, retry logic
- Workflow re-run failures: Manual fallback always available
- Complex multi-file fixes: Safety gates block auto-apply

---

**Next Steps**: Begin Phase 1 implementation (T-001 through T-007)
