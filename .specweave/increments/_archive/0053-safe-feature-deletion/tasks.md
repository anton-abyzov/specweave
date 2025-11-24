---
total_tasks: 37
completed: 37
by_user_story:
  US-001: 6
  US-002: 5
  US-003: 6
  US-004: 6
  US-005: 6
  US-006: 8
test_mode: TDD
coverage_target: 85
---

# Tasks: Safe Feature Deletion Command

**Increment**: 0052-safe-feature-deletion

**Feature**: FS-052 - Safe Feature Deletion Command

**Test-Driven Development (TDD)**: All testable tasks require writing tests BEFORE implementation.

**Coverage Targets**:
- Unit tests: 90%+
- Integration tests: 80%+
- E2E tests: 70%+
- Overall: 85%+

---

## User Story: US-001 - Safe Deletion with Validation (Priority: P1)

**Linked ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04, AC-US1-05, AC-US1-06
**Tasks**: 6 total, 6 completed

### T-001: Implement Active Increment Validation

**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-06
**Priority**: P1
**Estimated Effort**: 3 hours
**Status**: [x] completed

**Test Plan**:
- **Given** a feature FS-052 with an active increment referencing it (status: in-progress)
- **When** validation runs in safe mode (no --force flag)
- **Then** validation should fail and block deletion
- **And** error message should list the active increment ID

**Test Cases**:
1. **Unit**: `tests/unit/feature-deleter/validator.test.ts`
   - testValidateNoActiveIncrements(): No active increments → validation passes
   - testValidateActiveIncrementBlocks(): Active increment found → validation fails
   - testValidateMultipleActiveIncrements(): Multiple active increments → all listed in error
   - testValidateFiltersByStatus(): Completed/abandoned increments ignored
   - testValidateMetadataScanning(): All increment metadata.json files scanned correctly
   - **Coverage Target**: 92%

2. **Integration**: `tests/integration/feature-deleter/end-to-end-deletion.test.ts`
   - testSafeDeletionBlockedByActiveIncrement(): Full flow blocked by active increment
   - **Coverage Target**: 85%

**Overall Coverage Target**: 88%

**Implementation**:
1. Create file: `src/core/feature-deleter/validator.ts`
2. Define `FeatureValidator` class with `validate()` method
3. Implement `scanIncrementReferences()` to scan all `.specweave/increments/*/metadata.json`
4. Parse metadata.json and extract `feature_id` field
5. Filter increments by status (active = NOT completed/abandoned/archived)
6. If active increments found and no --force flag → validation fails
7. Write unit tests (5 tests) in `validator.test.ts`
8. Run unit tests: `npm test validator.test` (should pass: 5/5)
9. Write integration test (1 test) in `end-to-end-deletion.test.ts`
10. Run integration test: `npm test end-to-end-deletion` (should pass: 1/1)
11. Verify coverage: `npm run coverage -- --include=src/core/feature-deleter/validator.ts` (should be ≥88%)

**TDD Workflow**:
1. 📝 Write all 6 tests above (should fail)
2. ❌ Run tests: `npm test` (0/6 passing)
3. ✅ Implement validator (steps 1-6)
4. 🟢 Run tests: `npm test` (6/6 passing)
5. ♻️ Refactor if needed (maintain green tests)
6. ✅ Final check: Coverage ≥88%

---

### T-002: Implement Completed Increment Validation (Warning Mode)

**User Story**: US-001
**Satisfies ACs**: AC-US1-02
**Priority**: P1
**Estimated Effort**: 2 hours
**Status**: [x] completed

**Test Plan**:
- **Given** a feature FS-052 with a completed increment referencing it (status: completed)
- **When** validation runs in safe mode
- **Then** validation should pass with warning (not blocking)
- **And** warning message should list the completed increment ID

**Test Cases**:
1. **Unit**: `tests/unit/feature-deleter/validator.test.ts`
   - testValidateCompletedIncrementWarning(): Completed increment → warning shown
   - testValidateArchivedIncrementWarning(): Archived increment → warning shown
   - testValidateAbandonedIncrementWarning(): Abandoned increment → warning shown
   - testValidateWarningNotBlocking(): Warning doesn't prevent deletion
   - **Coverage Target**: 90%

**Overall Coverage Target**: 90%

**Implementation**:
1. Update `FeatureValidator.validate()` to categorize increments
2. Add `warnings: string[]` field to `ValidationResult` interface
3. If completed/archived increments found → add warning (don't block)
4. Add logger.warn() calls for completed increments
5. Write unit tests (4 tests) in `validator.test.ts`
6. Run unit tests: `npm test validator.test` (should pass: 4/4)
7. Verify coverage: `npm run coverage -- --include=src/core/feature-deleter/validator.ts` (should be ≥90%)

**TDD Workflow**:
1. 📝 Write all 4 tests above (should fail)
2. ❌ Run tests: `npm test` (0/4 passing)
3. ✅ Implement warning logic (steps 1-4)
4. 🟢 Run tests: `npm test` (4/4 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥90%

---

### T-003: Implement Validation Report Display

**User Story**: US-001
**Satisfies ACs**: AC-US1-03, AC-US1-04
**Priority**: P1
**Estimated Effort**: 2 hours
**Status**: [x] completed

**Test Plan**:
- **Given** a feature FS-052 with 47 files and 1 completed increment
- **When** validation report is displayed
- **Then** report should show feature ID, file count, file paths, git status, and increment references
- **And** report should be formatted with color-coded output (ANSI colors)

**Test Cases**:
1. **Unit**: `tests/unit/feature-deleter/validator.test.ts`
   - testValidationReportFormat(): Report includes all required fields
   - testValidationReportFilePaths(): All file paths listed
   - testValidationReportGitStatus(): Git status shown (tracked vs untracked)
   - testValidationReportIncrementRefs(): Increment IDs categorized by status
   - **Coverage Target**: 88%

2. **Integration**: `tests/integration/feature-deleter/end-to-end-deletion.test.ts`
   - testValidationReportOutput(): Console output matches snapshot
   - **Coverage Target**: 80%

**Overall Coverage Target**: 85%

**Implementation**:
1. Create `formatValidationReport()` function in `validator.ts`
2. Use `chalk` library for color-coded output (green = success, yellow = warning, red = error)
3. Format file list (categorize: living docs, user stories)
4. Format git status (tracked vs untracked files)
5. Format increment references (active/completed/archived)
6. Write unit tests (4 tests) with snapshot testing
7. Run unit tests: `npm test validator.test` (should pass: 4/4)
8. Write integration test (1 test) checking console output
9. Run integration test: `npm test end-to-end-deletion` (should pass: 1/1)
10. Verify coverage: `npm run coverage -- --include=src/core/feature-deleter/validator.ts` (should be ≥85%)

**TDD Workflow**:
1. 📝 Write all 5 tests above (should fail)
2. ❌ Run tests: `npm test` (0/5 passing)
3. ✅ Implement report formatting (steps 1-5)
4. 🟢 Run tests: `npm test` (5/5 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥85%

---

### T-004: Implement Primary Confirmation Prompt

**User Story**: US-001
**Satisfies ACs**: AC-US1-05
**Priority**: P1
**Estimated Effort**: 2 hours
**Status**: [x] completed

**Test Plan**:
- **Given** validation passed for feature FS-052
- **When** primary confirmation prompt is shown
- **Then** user must explicitly confirm deletion (y/N)
- **And** deletion is aborted if user declines or timeout occurs

**Test Cases**:
1. **Unit**: `tests/unit/feature-deleter/confirmation-manager.test.ts`
   - testPrimaryConfirmationAccepted(): User confirms → returns true
   - testPrimaryConfirmationDeclined(): User declines → returns false
   - testPrimaryConfirmationTimeout(): No input (5s timeout) → returns false
   - testPrimaryConfirmationSkippedWithYesFlag(): --yes flag → skip prompt
   - **Coverage Target**: 92%

2. **E2E**: `tests/e2e/delete-feature-command.test.ts`
   - testUserConfirmationPrompt(): Full CLI flow with stdin mock
   - **Coverage Target**: 75%

**Overall Coverage Target**: 87%

**Implementation**:
1. Create file: `src/core/feature-deleter/confirmation-manager.ts`
2. Define `ConfirmationManager` class with `confirm()` method
3. Use `inquirer.js` for interactive prompts
4. Add 5-second timeout for confirmation (prevent hanging)
5. Implement `--yes` flag to skip primary confirmation
6. Write unit tests (4 tests) using `inquirer-test` library
7. Run unit tests: `npm test confirmation-manager.test` (should pass: 4/4)
8. Write E2E test (1 test) with mock stdin
9. Run E2E test: `npm test delete-feature-command` (should pass: 1/1)
10. Verify coverage: `npm run coverage -- --include=src/core/feature-deleter/confirmation-manager.ts` (should be ≥87%)

**TDD Workflow**:
1. 📝 Write all 5 tests above (should fail)
2. ❌ Run tests: `npm test` (0/5 passing)
3. ✅ Implement confirmation manager (steps 1-5)
4. 🟢 Run tests: `npm test` (5/5 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥87%

---

### T-005: Implement Feature Detection (Living Docs & User Stories)

**User Story**: US-001
**Satisfies ACs**: AC-US1-03, AC-US1-04
**Priority**: P1
**Estimated Effort**: 3 hours
**Status**: [x] completed

**Test Plan**:
- **Given** a feature FS-052 with living docs folder and user story files
- **When** feature detection runs
- **Then** all living docs files should be found (`.specweave/docs/internal/specs/_features/FS-052/`)
- **And** all user story files should be found (`.specweave/docs/internal/specs/{project}/FS-052/us-*.md`)

**Test Cases**:
1. **Unit**: `tests/unit/feature-deleter/validator.test.ts`
   - testDetectLivingDocsFolder(): Living docs folder detected correctly
   - testDetectUserStoryFiles(): All user story files found
   - testDetectMixedFiles(): Both living docs and user stories detected
   - testDetectNoFiles(): Feature not found → validation error
   - testDetectGitStatus(): Tracked vs untracked files categorized
   - **Coverage Target**: 93%

2. **Integration**: `tests/integration/feature-deleter/end-to-end-deletion.test.ts`
   - testFeatureDetectionComplete(): All 47 files detected correctly
   - **Coverage Target**: 82%

**Overall Coverage Target**: 89%

**Implementation**:
1. Add `detectFeatureFiles()` method to `FeatureValidator`
2. Scan `.specweave/docs/internal/specs/_features/{featureId}/` (living docs)
3. Scan `.specweave/docs/internal/specs/*/{featureId}/us-*.md` (user stories)
4. Use `glob` to find all matching files recursively
5. Check git status for each file (`git ls-files --error-unmatch`)
6. Categorize files as tracked or untracked
7. Return file list with metadata (path, type, git status)
8. Write unit tests (5 tests) in `validator.test.ts`
9. Run unit tests: `npm test validator.test` (should pass: 5/5)
10. Write integration test (1 test) in `end-to-end-deletion.test.ts`
11. Run integration test: `npm test end-to-end-deletion` (should pass: 1/1)
12. Verify coverage: `npm run coverage -- --include=src/core/feature-deleter/validator.ts` (should be ≥89%)

**TDD Workflow**:
1. 📝 Write all 6 tests above (should fail)
2. ❌ Run tests: `npm test` (0/6 passing)
3. ✅ Implement feature detection (steps 1-7)
4. 🟢 Run tests: `npm test` (6/6 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥89%

---

### T-006: Implement Git Working Directory Validation

**User Story**: US-001
**Satisfies ACs**: AC-US1-03
**Priority**: P1
**Estimated Effort**: 2 hours
**Status**: [x] completed

**Test Plan**:
- **Given** a git repository with uncommitted changes
- **When** validation runs
- **Then** validation should fail with error message
- **And** error should suggest committing or stashing changes first

**Test Cases**:
1. **Unit**: `tests/unit/feature-deleter/validator.test.ts`
   - testValidateCleanWorkingDirectory(): Clean repo → validation passes
   - testValidateDirtyWorkingDirectory(): Uncommitted changes → validation fails
   - testValidateUntrackedFilesAllowed(): Untracked files don't block validation
   - testValidateStagedChangesBlock(): Staged changes → validation fails
   - **Coverage Target**: 90%

2. **Integration**: `tests/integration/feature-deleter/git-integration.test.ts`
   - testGitStatusValidation(): Full git status check in real repo
   - **Coverage Target**: 85%

**Overall Coverage Target**: 88%

**Implementation**:
1. Add `validateGitStatus()` method to `FeatureValidator`
2. Use `simple-git` to check `git status --porcelain`
3. If modified or staged files found → validation fails
4. Allow untracked files (they're safe to delete)
5. Add helpful error message with suggestions
6. Write unit tests (4 tests) in `validator.test.ts`
7. Run unit tests: `npm test validator.test` (should pass: 4/4)
8. Write integration test (1 test) in `git-integration.test.ts`
9. Run integration test: `npm test git-integration` (should pass: 1/1)
10. Verify coverage: `npm run coverage -- --include=src/core/feature-deleter/validator.ts` (should be ≥88%)

**TDD Workflow**:
1. 📝 Write all 5 tests above (should fail)
2. ❌ Run tests: `npm test` (0/5 passing)
3. ✅ Implement git status validation (steps 1-5)
4. 🟢 Run tests: `npm test` (5/5 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥88%

---

## User Story: US-002 - Force Deletion Mode (Priority: P1)

**Linked ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04, AC-US2-05
**Tasks**: 5 total, 0 completed

### T-007: Implement Force Deletion Flag Handling

**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-04
**Priority**: P1
**Estimated Effort**: 2 hours
**Status**: [x] completed

**Test Plan**:
- **Given** a feature FS-052 with active increment 0053 referencing it
- **When** deletion runs with --force flag
- **Then** active increment validation should be bypassed
- **And** elevated confirmation (type "delete") should still be required

**Test Cases**:
1. **Unit**: `tests/unit/feature-deleter/validator.test.ts`
   - testForceModeBypassesValidation(): --force flag bypasses active increment check
   - testForceModeStillRequiresConfirmation(): --force doesn't skip confirmation
   - testForceModeWithYesFlag(): --yes doesn't skip elevated confirmation
   - **Coverage Target**: 90%

2. **Unit**: `tests/unit/feature-deleter/confirmation-manager.test.ts`
   - testElevatedConfirmationInForceMode(): User must type "delete" exactly
   - testElevatedConfirmationCaseSensitive(): "DELETE" or "Delete" rejected
   - **Coverage Target**: 92%

**Overall Coverage Target**: 91%

**Implementation**:
1. Add `force` flag to `DeletionOptions` interface in `types.ts`
2. Update `FeatureValidator.validate()` to check `options.force`
3. If force mode → skip active increment blocking (still log warning)
4. Update `ConfirmationManager` to show elevated confirmation in force mode
5. Implement elevated prompt: "Type 'delete' to confirm"
6. Validate exact match (case-sensitive, no extra whitespace)
7. Write unit tests (5 tests) in `validator.test.ts` and `confirmation-manager.test.ts`
8. Run unit tests: `npm test` (should pass: 5/5)
9. Verify coverage: `npm run coverage -- --include=src/core/feature-deleter/` (should be ≥91%)

**TDD Workflow**:
1. 📝 Write all 5 tests above (should fail)
2. ❌ Run tests: `npm test` (0/5 passing)
3. ✅ Implement force mode logic (steps 1-6)
4. 🟢 Run tests: `npm test` (5/5 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥91%

---

### T-008: Implement Force Deletion Warning Log

**User Story**: US-002
**Satisfies ACs**: AC-US2-02, AC-US2-05
**Priority**: P1
**Estimated Effort**: 1 hour
**Status**: [x] completed

**Test Plan**:
- **Given** force deletion with active increment 0053
- **When** deletion executes
- **Then** warning should be logged about orphaned increments
- **And** force deletion report should list all increments that will be orphaned

**Test Cases**:
1. **Unit**: `tests/unit/feature-deleter/validator.test.ts`
   - testForceWarningLogged(): Warning logged to console
   - testForceReportShowsOrphanedIncrements(): Report lists all active increments
   - testForceReportSnapshot(): Force report matches expected format
   - **Coverage Target**: 88%

**Overall Coverage Target**: 88%

**Implementation**:
1. Update `formatValidationReport()` to show force mode warnings
2. Use `logger.warn()` to log orphaned increments
3. Add section to report: "⚠️ Active increments that will be orphaned"
4. List each orphaned increment ID with warning icon
5. Write unit tests (3 tests) with snapshot testing
6. Run unit tests: `npm test validator.test` (should pass: 3/3)
7. Verify coverage: `npm run coverage -- --include=src/core/feature-deleter/validator.ts` (should be ≥88%)

**TDD Workflow**:
1. 📝 Write all 3 tests above (should fail)
2. ❌ Run tests: `npm test` (0/3 passing)
3. ✅ Implement force warnings (steps 1-4)
4. 🟢 Run tests: `npm test` (3/3 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥88%

---

### T-009: Implement Orphaned Increment Metadata Update

**User Story**: US-002
**Satisfies ACs**: AC-US2-03
**Priority**: P1
**Estimated Effort**: 3 hours
**Status**: [x] completed

**Test Plan**:
- **Given** increment 0053 with `feature_id: "FS-052"` in metadata.json
- **When** force deletion completes
- **Then** feature_id field should be removed from metadata.json
- **And** other metadata fields should remain unchanged

**Test Cases**:
1. **Unit**: `tests/unit/feature-deleter/deletion-transaction.test.ts`
   - testOrphanedMetadataUpdate(): feature_id removed from metadata
   - testOrphanedMetadataPreservesOtherFields(): Other fields unchanged
   - testOrphanedMetadataHandlesMultipleIncrements(): Multiple increments updated
   - testOrphanedMetadataHandlesErrors(): File write error handled gracefully
   - **Coverage Target**: 90%

2. **Integration**: `tests/integration/feature-deleter/end-to-end-deletion.test.ts`
   - testForceDeleteUpdatesOrphanedMetadata(): Full flow verifies metadata update
   - **Coverage Target**: 82%

**Overall Coverage Target**: 87%

**Implementation**:
1. Create `updateOrphanedMetadata()` function in `deletion-transaction.ts`
2. For each orphaned increment, read metadata.json
3. Parse JSON and remove `feature_id` field
4. Preserve all other fields (increment, title, status, etc.)
5. Write updated JSON back to file (atomic write)
6. Log each metadata update
7. Handle file errors gracefully (log warning, don't fail transaction)
8. Write unit tests (4 tests) in `deletion-transaction.test.ts`
9. Run unit tests: `npm test deletion-transaction.test` (should pass: 4/4)
10. Write integration test (1 test) in `end-to-end-deletion.test.ts`
11. Run integration test: `npm test end-to-end-deletion` (should pass: 1/1)
12. Verify coverage: `npm run coverage -- --include=src/core/feature-deleter/deletion-transaction.ts` (should be ≥87%)

**TDD Workflow**:
1. 📝 Write all 5 tests above (should fail)
2. ❌ Run tests: `npm test` (0/5 passing)
3. ✅ Implement metadata update (steps 1-7)
4. 🟢 Run tests: `npm test` (5/5 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥87%

---

### T-010: Implement Deletion Transaction Pattern (Three-Phase Commit)

**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-03
**Priority**: P1
**Estimated Effort**: 4 hours
**Status**: [x] completed

**Test Plan**:
- **Given** a feature FS-052 with 47 files to delete
- **When** deletion transaction executes
- **Then** transaction should complete in 3 phases (Validation → Staging → Commit)
- **And** rollback should occur if any phase fails
- **And** checkpoint file should track progress

**Test Cases**:
1. **Unit**: `tests/unit/feature-deleter/deletion-transaction.test.ts`
   - testThreePhaseCommit(): All 3 phases execute in order
   - testValidationPhaseReadOnly(): Phase 1 doesn't modify files
   - testStagingPhaseReversible(): Phase 2 can be rolled back
   - testCommitPhaseIrreversible(): Phase 3 cannot be auto-rolled back
   - testCheckpointTracking(): Checkpoint file created and updated
   - testRollbackOnStagingFailure(): Files restored from backup
   - testRollbackOnCommitFailure(): User instructed to use git reset
   - **Coverage Target**: 93%

2. **Integration**: `tests/integration/feature-deleter/end-to-end-deletion.test.ts`
   - testTransactionComplete(): Full transaction succeeds
   - testTransactionRollback(): Transaction rolls back on error
   - **Coverage Target**: 85%

**Overall Coverage Target**: 90%

**Implementation**:
1. Create file: `src/core/feature-deleter/deletion-transaction.ts`
2. Define `DeletionTransaction` class with `execute()` method
3. Implement Phase 1 (Validation):
   - Call `FeatureValidator.validate()`
   - Check all pre-flight conditions
   - No file modifications
4. Implement Phase 2 (Staging):
   - Create backup directory: `.specweave/state/deletion-backup/{featureId}/`
   - Copy all files to backup
   - Create checkpoint: `.specweave/state/deletion-checkpoint.json`
   - Stage git deletions (git rm)
5. Implement Phase 3 (Commit):
   - Commit git changes
   - Update orphaned metadata (if force)
   - Close GitHub issues (non-critical)
   - Log to audit trail
   - Remove backup and checkpoint
6. Implement rollback logic:
   - Before commit: restore from backup, unstage git
   - After commit: log error, suggest `git reset HEAD~1`
7. Write unit tests (7 tests) in `deletion-transaction.test.ts`
8. Run unit tests: `npm test deletion-transaction.test` (should pass: 7/7)
9. Write integration tests (2 tests) in `end-to-end-deletion.test.ts`
10. Run integration tests: `npm test end-to-end-deletion` (should pass: 2/2)
11. Verify coverage: `npm run coverage -- --include=src/core/feature-deleter/deletion-transaction.ts` (should be ≥90%)

**TDD Workflow**:
1. 📝 Write all 9 tests above (should fail)
2. ❌ Run tests: `npm test` (0/9 passing)
3. ✅ Implement transaction pattern (steps 1-6)
4. 🟢 Run tests: `npm test` (9/9 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥90%

---

### T-011: Implement File Backup and Rollback Logic

**User Story**: US-002
**Satisfies ACs**: AC-US2-01
**Priority**: P1
**Estimated Effort**: 3 hours
**Status**: [x] completed

**Test Plan**:
- **Given** deletion transaction in staging phase with backup created
- **When** git commit fails (e.g., permission error)
- **Then** all files should be restored from backup
- **And** git deletions should be unstaged
- **And** backup directory should be preserved for debugging

**Test Cases**:
1. **Unit**: `tests/unit/feature-deleter/deletion-transaction.test.ts`
   - testBackupCreated(): Backup directory created with all files
   - testBackupPreservesStructure(): Folder structure preserved
   - testRollbackRestoresFiles(): Files restored from backup correctly
   - testRollbackUnstagesGit(): git reset executed correctly
   - testRollbackPreservesBackup(): Backup not deleted after rollback
   - **Coverage Target**: 91%

2. **Integration**: `tests/integration/feature-deleter/git-integration.test.ts`
   - testRollbackAfterGitError(): Full rollback after git failure
   - **Coverage Target**: 83%

**Overall Coverage Target**: 88%

**Implementation**:
1. Add `createBackup()` method to `DeletionTransaction`
2. Create backup directory: `.specweave/state/deletion-backup/{featureId}-{timestamp}/`
3. Copy all files to backup (preserve folder structure)
4. Add `rollback()` method to `DeletionTransaction`
5. In rollback:
   - Restore all files from backup
   - Run `git reset HEAD -- {files}` to unstage deletions
   - Preserve backup directory (don't delete)
   - Log rollback completion
6. Write unit tests (5 tests) in `deletion-transaction.test.ts`
7. Run unit tests: `npm test deletion-transaction.test` (should pass: 5/5)
8. Write integration test (1 test) in `git-integration.test.ts`
9. Run integration test: `npm test git-integration` (should pass: 1/1)
10. Verify coverage: `npm run coverage -- --include=src/core/feature-deleter/deletion-transaction.ts` (should be ≥88%)

**TDD Workflow**:
1. 📝 Write all 6 tests above (should fail)
2. ❌ Run tests: `npm test` (0/6 passing)
3. ✅ Implement backup and rollback (steps 1-5)
4. 🟢 Run tests: `npm test` (6/6 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥88%

---

## User Story: US-003 - Dry-Run Mode (Priority: P1)

**Linked ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04, AC-US3-05, AC-US3-06
**Tasks**: 6 total, 0 completed

### T-012: Implement Dry-Run Flag and Preview Mode

**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-06
**Priority**: P1
**Estimated Effort**: 2 hours
**Status**: [x] completed

**Test Plan**:
- **Given** a feature FS-052 with 47 files
- **When** deletion runs with --dry-run flag
- **Then** deletion plan should be displayed
- **And** no files should be deleted
- **And** exit code should be 0 (success)

**Test Cases**:
1. **Unit**: `tests/unit/feature-deleter/index.test.ts`
   - testDryRunNoExecution(): --dry-run prevents file deletion
   - testDryRunNoGitOperations(): --dry-run prevents git operations
   - testDryRunNoGitHubCalls(): --dry-run prevents GitHub API calls
   - testDryRunExitCode(): --dry-run exits with code 0
   - **Coverage Target**: 90%

2. **E2E**: `tests/e2e/delete-feature-command.test.ts`
   - testDryRunFullFlow(): CLI dry-run shows plan and exits cleanly
   - **Coverage Target**: 75%

**Overall Coverage Target**: 85%

**Implementation**:
1. Add `dryRun` flag to `DeletionOptions` interface
2. Update `FeatureDeleter.execute()` to check `options.dryRun`
3. If dry-run mode:
   - Run validation (read-only)
   - Show deletion plan
   - Skip staging and commit phases
   - Return mock result (no actual changes)
4. Add `formatDeletionPlan()` function to show preview
5. Write unit tests (4 tests) in `index.test.ts`
6. Run unit tests: `npm test index.test` (should pass: 4/4)
7. Write E2E test (1 test) in `delete-feature-command.test.ts`
8. Run E2E test: `npm test delete-feature-command` (should pass: 1/1)
9. Verify coverage: `npm run coverage -- --include=src/core/feature-deleter/index.ts` (should be ≥85%)

**TDD Workflow**:
1. 📝 Write all 5 tests above (should fail)
2. ❌ Run tests: `npm test` (0/5 passing)
3. ✅ Implement dry-run mode (steps 1-4)
4. 🟢 Run tests: `npm test` (5/5 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥85%

---

### T-013: Implement Dry-Run Report with File List

**User Story**: US-003
**Satisfies ACs**: AC-US3-02, AC-US3-04
**Priority**: P1
**Estimated Effort**: 2 hours
**Status**: [x] completed

**Test Plan**:
- **Given** a feature FS-052 with living docs and user story files
- **When** dry-run report is generated
- **Then** report should list all files to be deleted (grouped by type)
- **And** report should show increment references (active/completed/archived)

**Test Cases**:
1. **Unit**: `tests/unit/feature-deleter/index.test.ts`
   - testDryRunReportFileList(): All files listed by category
   - testDryRunReportIncrementReferences(): Increments categorized correctly
   - testDryRunReportSnapshot(): Report format matches snapshot
   - **Coverage Target**: 88%

**Overall Coverage Target**: 88%

**Implementation**:
1. Create `formatDryRunReport()` function in `index.ts`
2. Group files by type:
   - Living docs folder
   - User story files
3. Show increment references:
   - Active increments (if any, with warning)
   - Completed increments (if any, as note)
   - Archived increments (if any, as note)
4. Use color-coded output (yellow for dry-run prefix)
5. Write unit tests (3 tests) with snapshot testing
6. Run unit tests: `npm test index.test` (should pass: 3/3)
7. Verify coverage: `npm run coverage -- --include=src/core/feature-deleter/index.ts` (should be ≥88%)

**TDD Workflow**:
1. 📝 Write all 3 tests above (should fail)
2. ❌ Run tests: `npm test` (0/3 passing)
3. ✅ Implement dry-run report (steps 1-4)
4. 🟢 Run tests: `npm test` (3/3 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥88%

---

### T-014: Implement Dry-Run Git Status Preview

**User Story**: US-003
**Satisfies ACs**: AC-US3-03
**Priority**: P1
**Estimated Effort**: 2 hours
**Status**: [x] completed

**Test Plan**:
- **Given** feature files with mixed git status (35 tracked, 12 untracked)
- **When** dry-run report shows git operations
- **Then** report should show count of tracked files (git rm)
- **And** report should show count of untracked files (rm)
- **And** report should show commit message preview

**Test Cases**:
1. **Unit**: `tests/unit/feature-deleter/index.test.ts`
   - testDryRunGitOperations(): Git operations listed in report
   - testDryRunCommitMessagePreview(): Commit message shown
   - testDryRunTrackedVsUntrackedCount(): File counts accurate
   - **Coverage Target**: 87%

2. **Integration**: `tests/integration/feature-deleter/git-integration.test.ts`
   - testDryRunGitStatusReal(): Git status check in real repo
   - **Coverage Target**: 80%

**Overall Coverage Target**: 85%

**Implementation**:
1. Update `formatDryRunReport()` to include git section
2. Show git operations:
   - `git rm` for tracked files (with count)
   - `rm` for untracked files (with count)
   - `git commit -m "..."` with full message preview
3. Use git status output from validation phase
4. Format commit message (same as real commit)
5. Write unit tests (3 tests) in `index.test.ts`
6. Run unit tests: `npm test index.test` (should pass: 3/3)
7. Write integration test (1 test) in `git-integration.test.ts`
8. Run integration test: `npm test git-integration` (should pass: 1/1)
9. Verify coverage: `npm run coverage -- --include=src/core/feature-deleter/index.ts` (should be ≥85%)

**TDD Workflow**:
1. 📝 Write all 4 tests above (should fail)
2. ❌ Run tests: `npm test` (0/4 passing)
3. ✅ Implement git preview (steps 1-4)
4. 🟢 Run tests: `npm test` (4/4 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥85%

---

### T-015: Implement Dry-Run GitHub Preview

**User Story**: US-003
**Satisfies ACs**: AC-US3-02
**Priority**: P1
**Estimated Effort**: 2 hours
**Status**: [x] completed

**Test Plan**:
- **Given** feature FS-052 with 3 GitHub issues
- **When** dry-run report shows GitHub operations
- **Then** report should list all issues to be closed (with titles)
- **And** no actual GitHub API calls should be made

**Test Cases**:
1. **Unit**: `tests/unit/feature-deleter/index.test.ts`
   - testDryRunGitHubIssueList(): All issues listed with titles
   - testDryRunNoGitHubAPICalls(): GitHub service not invoked
   - **Coverage Target**: 85%

2. **Integration**: `tests/integration/feature-deleter/github-integration.test.ts`
   - testDryRunGitHubPreview(): GitHub issue search (but no close)
   - **Coverage Target**: 78%

**Overall Coverage Target**: 82%

**Implementation**:
1. Update `formatDryRunReport()` to include GitHub section
2. In dry-run mode:
   - Call `GitHubService.findFeatureIssues()` (read-only)
   - Do NOT call `GitHubService.deleteIssues()`
3. Show issue list:
   - Issue number, title, URL
   - "Would close N issues" message
4. Write unit tests (2 tests) in `index.test.ts`
5. Run unit tests: `npm test index.test` (should pass: 2/2)
6. Write integration test (1 test) in `github-integration.test.ts`
7. Run integration test: `npm test github-integration` (should pass: 1/1)
8. Verify coverage: `npm run coverage -- --include=src/core/feature-deleter/index.ts` (should be ≥82%)

**TDD Workflow**:
1. 📝 Write all 3 tests above (should fail)
2. ❌ Run tests: `npm test` (0/3 passing)
3. ✅ Implement GitHub preview (steps 1-3)
4. 🟢 Run tests: `npm test` (3/3 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥82%

---

### T-016: Implement Dry-Run with Force Mode Combination

**User Story**: US-003
**Satisfies ACs**: AC-US3-05
**Priority**: P1
**Estimated Effort**: 1 hour
**Status**: [x] completed

**Test Plan**:
- **Given** a feature FS-052 with active increment 0053
- **When** dry-run runs with --dry-run --force flags
- **Then** report should show force deletion preview
- **And** report should list increments that would be orphaned
- **And** no actual changes should be made

**Test Cases**:
1. **Unit**: `tests/unit/feature-deleter/index.test.ts`
   - testDryRunForceMode(): --dry-run --force shows force preview
   - testDryRunForceShowsOrphanedIncrements(): Orphaned increments listed
   - testDryRunForceNoExecution(): No files deleted, no metadata updated
   - **Coverage Target**: 88%

**Overall Coverage Target**: 88%

**Implementation**:
1. Update `formatDryRunReport()` to detect force mode
2. If dry-run + force:
   - Show "Force deletion preview" header
   - List active increments that would be orphaned
   - Show metadata update operations
3. Ensure no actual execution (same as normal dry-run)
4. Write unit tests (3 tests) in `index.test.ts`
5. Run unit tests: `npm test index.test` (should pass: 3/3)
6. Verify coverage: `npm run coverage -- --include=src/core/feature-deleter/index.ts` (should be ≥88%)

**TDD Workflow**:
1. 📝 Write all 3 tests above (should fail)
2. ❌ Run tests: `npm test` (0/3 passing)
3. ✅ Implement dry-run force mode (steps 1-3)
4. 🟢 Run tests: `npm test` (3/3 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥88%

---

### T-017: Implement Dry-Run Exit Code Handling

**User Story**: US-003
**Satisfies ACs**: AC-US3-06
**Priority**: P1
**Estimated Effort**: 1 hour
**Status**: [x] completed

**Test Plan**:
- **Given** dry-run mode completes successfully
- **When** CLI command exits
- **Then** exit code should be 0 (success)
- **And** no error messages should be shown

**Test Cases**:
1. **E2E**: `tests/e2e/delete-feature-command.test.ts`
   - testDryRunExitCodeSuccess(): Dry-run exits with code 0
   - testDryRunExitCodeWithErrors(): Validation errors exit with code 1
   - **Coverage Target**: 80%

**Overall Coverage Target**: 80%

**Implementation**:
1. Update `src/cli/commands/delete-feature.ts` CLI handler
2. Check if dry-run mode is enabled
3. If dry-run:
   - Show report
   - Exit with code 0 (always, even if validation fails)
4. If validation errors in dry-run → show as warnings, not errors
5. Write E2E tests (2 tests) in `delete-feature-command.test.ts`
6. Run E2E tests: `npm test delete-feature-command` (should pass: 2/2)
7. Verify coverage: `npm run coverage -- --include=src/cli/commands/delete-feature.ts` (should be ≥80%)

**TDD Workflow**:
1. 📝 Write all 2 tests above (should fail)
2. ❌ Run tests: `npm test` (0/2 passing)
3. ✅ Implement exit code handling (steps 1-4)
4. 🟢 Run tests: `npm test` (2/2 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥80%

---

## User Story: US-004 - Git Integration (Priority: P1)

**Linked ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04, AC-US4-05, AC-US4-06
**Tasks**: 6 total, 0 completed

### T-018: Implement Git Service with git rm for Tracked Files

**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02
**Priority**: P1
**Estimated Effort**: 3 hours
**Status**: [x] completed

**Test Plan**:
- **Given** 35 git-tracked files and 12 untracked files
- **When** git staging executes
- **Then** tracked files should be deleted with `git rm`
- **And** untracked files should be deleted with `fs.unlink`

**Test Cases**:
1. **Unit**: `tests/unit/feature-deleter/git-service.test.ts`
   - testGitRmForTrackedFiles(): git rm called for tracked files
   - testFsUnlinkForUntrackedFiles(): fs.unlink called for untracked files
   - testGitStatusCheck(): Git status checked before deletion
   - testTrackedVsUntrackedDetection(): Files categorized correctly
   - **Coverage Target**: 92%

2. **Integration**: `tests/integration/feature-deleter/git-integration.test.ts`
   - testGitDeletionRealRepo(): Full git deletion in temporary repo
   - testGitDeletionMixedFiles(): Both tracked and untracked deleted
   - **Coverage Target**: 85%

**Overall Coverage Target**: 89%

**Implementation**:
1. Create file: `src/core/feature-deleter/git-service.ts`
2. Define `FeatureDeletionGitService` class
3. Implement `stageGitDeletions(files: string[])` method
4. For each file:
   - Check git status: `git ls-files --error-unmatch {file}`
   - If tracked → use `git rm {file}`
   - If untracked → use `fs.unlink({file})`
5. Use `simple-git` library for git operations
6. Return stats: `{ tracked: number, untracked: number }`
7. Write unit tests (4 tests) using mock git
8. Run unit tests: `npm test git-service.test` (should pass: 4/4)
9. Write integration tests (2 tests) in real git repo
10. Run integration tests: `npm test git-integration` (should pass: 2/2)
11. Verify coverage: `npm run coverage -- --include=src/core/feature-deleter/git-service.ts` (should be ≥89%)

**TDD Workflow**:
1. 📝 Write all 6 tests above (should fail)
2. ❌ Run tests: `npm test` (0/6 passing)
3. ✅ Implement git service (steps 1-6)
4. 🟢 Run tests: `npm test` (6/6 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥89%

---

### T-019: Implement Git Commit with Descriptive Message

**User Story**: US-004
**Satisfies ACs**: AC-US4-03, AC-US4-04
**Priority**: P1
**Estimated Effort**: 2 hours
**Status**: [x] completed

**Test Plan**:
- **Given** feature FS-052 deletion with 47 files
- **When** git commit executes
- **Then** commit message should include feature ID, file count, user, timestamp
- **And** commit message should follow format: "feat: delete feature FS-052"

**Test Cases**:
1. **Unit**: `tests/unit/feature-deleter/git-service.test.ts`
   - testCommitMessageFormat(): Message matches expected format
   - testCommitMessageIncludesMetadata(): All metadata fields present
   - testCommitMessageSnapshot(): Commit message matches snapshot
   - **Coverage Target**: 90%

2. **Integration**: `tests/integration/feature-deleter/git-integration.test.ts`
   - testGitCommitCreated(): Commit exists in git log
   - testGitCommitMessage(): Commit message correct in real repo
   - **Coverage Target**: 82%

**Overall Coverage Target**: 87%

**Implementation**:
1. Add `commitDeletion(featureId, validation)` method to `FeatureDeletionGitService`
2. Format commit message:
   ```
   feat: delete feature {featureId}

   - Deleted {N} files
   - Living docs: {X}
   - User stories: {Y}
   - Orphaned increments: {Z} (if force mode)

   Deleted by: {user}
   Timestamp: {ISO timestamp}
   Mode: {safe|force}
   ```
3. Get user from `git config user.name` or environment
4. Get timestamp as ISO 8601
5. Use `git commit -m "..."` with formatted message
6. Return commit SHA
7. Write unit tests (3 tests) with snapshot testing
8. Run unit tests: `npm test git-service.test` (should pass: 3/3)
9. Write integration tests (2 tests) in real git repo
10. Run integration tests: `npm test git-integration` (should pass: 2/2)
11. Verify coverage: `npm run coverage -- --include=src/core/feature-deleter/git-service.ts` (should be ≥87%)

**TDD Workflow**:
1. 📝 Write all 5 tests above (should fail)
2. ❌ Run tests: `npm test` (0/5 passing)
3. ✅ Implement commit logic (steps 1-6)
4. 🟢 Run tests: `npm test` (5/5 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥87%

---

### T-020: Implement Git Error Handling

**User Story**: US-004
**Satisfies ACs**: AC-US4-05
**Priority**: P1
**Estimated Effort**: 2 hours
**Status**: [x] completed

**Test Plan**:
- **Given** git commit fails (e.g., merge conflict, permission error)
- **When** git error occurs during staging or commit
- **Then** error should be caught and logged
- **And** rollback should be triggered
- **And** user should see helpful error message

**Test Cases**:
1. **Unit**: `tests/unit/feature-deleter/git-service.test.ts`
   - testGitErrorHandling(): Git error caught and logged
   - testGitErrorRollback(): Rollback triggered on git error
   - testGitErrorMessage(): Error message helpful and actionable
   - testGitMergeConflictError(): Merge conflict handled specifically
   - testGitPermissionError(): Permission error handled specifically
   - **Coverage Target**: 91%

**Overall Coverage Target**: 91%

**Implementation**:
1. Add error handling to `stageGitDeletions()` and `commitDeletion()`
2. Catch git errors and parse error type:
   - Merge conflict: `error: You have not concluded your merge`
   - Permission: `error: unable to create`
   - Index lock: `fatal: Unable to create '.git/index.lock'`
3. For each error type, provide specific recovery suggestion:
   - Merge conflict → "Resolve conflicts and try again"
   - Permission → "Check file permissions"
   - Index lock → "Another git process running, wait and retry"
4. Throw custom `GitError` with recovery suggestion
5. Write unit tests (5 tests) simulating different git errors
6. Run unit tests: `npm test git-service.test` (should pass: 5/5)
7. Verify coverage: `npm run coverage -- --include=src/core/feature-deleter/git-service.ts` (should be ≥91%)

**TDD Workflow**:
1. 📝 Write all 5 tests above (should fail)
2. ❌ Run tests: `npm test` (0/5 passing)
3. ✅ Implement error handling (steps 1-4)
4. 🟢 Run tests: `npm test` (5/5 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥91%

---

### T-021: Implement Git Rollback (Unstage Deletions)

**User Story**: US-004
**Satisfies ACs**: AC-US4-05
**Priority**: P1
**Estimated Effort**: 2 hours
**Status**: [x] completed

**Test Plan**:
- **Given** git deletions staged but commit failed
- **When** rollback executes
- **Then** staged deletions should be unstaged with `git reset HEAD`
- **And** files should be restored from backup

**Test Cases**:
1. **Unit**: `tests/unit/feature-deleter/git-service.test.ts`
   - testGitRollbackUnstage(): git reset executed for all files
   - testGitRollbackRestoreFiles(): Files restored from backup
   - testGitRollbackCleanup(): Working directory clean after rollback
   - **Coverage Target**: 88%

2. **Integration**: `tests/integration/feature-deleter/git-integration.test.ts`
   - testGitRollbackFullFlow(): Full rollback in real repo
   - **Coverage Target**: 80%

**Overall Coverage Target**: 85%

**Implementation**:
1. Add `unstageGitDeletions(files)` method to `FeatureDeletionGitService`
2. For each file:
   - Run `git reset HEAD -- {file}` to unstage
3. Restore files from backup (handled by `DeletionTransaction`)
4. Verify working directory is clean (`git status`)
5. Log rollback completion
6. Write unit tests (3 tests) in `git-service.test.ts`
7. Run unit tests: `npm test git-service.test` (should pass: 3/3)
8. Write integration test (1 test) in `git-integration.test.ts`
9. Run integration test: `npm test git-integration` (should pass: 1/1)
10. Verify coverage: `npm run coverage -- --include=src/core/feature-deleter/git-service.ts` (should be ≥85%)

**TDD Workflow**:
1. 📝 Write all 4 tests above (should fail)
2. ❌ Run tests: `npm test` (0/4 passing)
3. ✅ Implement rollback (steps 1-5)
4. 🟢 Run tests: `npm test` (4/4 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥85%

---

### T-022: Implement --no-git Flag

**User Story**: US-004
**Satisfies ACs**: AC-US4-06
**Priority**: P2
**Estimated Effort**: 1 hour
**Status**: [x] completed

**Test Plan**:
- **Given** deletion runs with --no-git flag
- **When** git operations are skipped
- **Then** files should be deleted with `fs.unlink` only
- **And** no git commands should be executed
- **And** no commit should be created

**Test Cases**:
1. **Unit**: `tests/unit/feature-deleter/git-service.test.ts`
   - testNoGitFlagSkipsGitOperations(): Git operations not called
   - testNoGitFlagUsesFilesystemOnly(): fs.unlink used for all files
   - testNoGitFlagNoCommit(): No commit created
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Add `noGit` flag to `DeletionOptions` interface
2. Update `FeatureDeletionGitService` to check `options.noGit`
3. If --no-git:
   - Skip git status check
   - Use `fs.unlink` for all files (don't call git rm)
   - Skip commit creation
   - Return mock result
4. Write unit tests (3 tests) in `git-service.test.ts`
5. Run unit tests: `npm test git-service.test` (should pass: 3/3)
6. Verify coverage: `npm run coverage -- --include=src/core/feature-deleter/git-service.ts` (should be ≥85%)

**TDD Workflow**:
1. 📝 Write all 3 tests above (should fail)
2. ❌ Run tests: `npm test` (0/3 passing)
3. ✅ Implement --no-git flag (steps 1-3)
4. 🟢 Run tests: `npm test` (3/3 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥85%

---

### T-023: Implement Git Repository Detection

**User Story**: US-004
**Satisfies ACs**: AC-US4-01
**Priority**: P1
**Estimated Effort**: 1 hour
**Status**: [x] completed

**Test Plan**:
- **Given** project directory without .git folder
- **When** git operations are attempted
- **Then** error should be shown: "Not a git repository"
- **And** deletion should be aborted (unless --no-git flag)

**Test Cases**:
1. **Unit**: `tests/unit/feature-deleter/git-service.test.ts`
   - testGitRepoDetection(): .git folder detected correctly
   - testNonGitRepoError(): Error shown for non-git directory
   - testNonGitRepoWithNoGitFlag(): --no-git allows deletion in non-git repo
   - **Coverage Target**: 87%

**Overall Coverage Target**: 87%

**Implementation**:
1. Add `detectGitRepository()` method to `FeatureDeletionGitService`
2. Check if `.git/` folder exists in project root
3. If not found and --no-git not set → throw error
4. If not found and --no-git set → log warning, continue
5. Write unit tests (3 tests) in `git-service.test.ts`
6. Run unit tests: `npm test git-service.test` (should pass: 3/3)
7. Verify coverage: `npm run coverage -- --include=src/core/feature-deleter/git-service.ts` (should be ≥87%)

**TDD Workflow**:
1. 📝 Write all 3 tests above (should fail)
2. ❌ Run tests: `npm test` (0/3 passing)
3. ✅ Implement repo detection (steps 1-4)
4. 🟢 Run tests: `npm test` (3/3 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥87%

---

## User Story: US-005 - GitHub Issue Deletion (Priority: P1)

**Linked ACs**: AC-US5-01, AC-US5-02, AC-US5-03, AC-US5-04, AC-US5-05, AC-US5-06
**Tasks**: 6 total, 0 completed

### T-024: Implement GitHub Issue Search by Feature ID

**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02
**Priority**: P1
**Estimated Effort**: 3 hours
**Status**: [x] completed

**Test Plan**:
- **Given** feature FS-052 with 3 GitHub issues: [FS-052][US-001], [FS-052][US-002], [FS-052][US-003]
- **When** GitHub issue search executes
- **Then** all 3 issues should be found
- **And** issue list should include number, title, and URL

**Test Cases**:
1. **Unit**: `tests/unit/feature-deleter/github-service.test.ts`
   - testGitHubIssueSearch(): Search query correct for feature ID
   - testGitHubIssueFiltering(): Only exact pattern matches returned
   - testGitHubIssueMetadata(): Issue number, title, URL extracted
   - testGitHubIssueEmptyResult(): No issues found → empty array
   - **Coverage Target**: 90%

2. **Integration**: `tests/integration/feature-deleter/github-integration.test.ts`
   - testGitHubIssueFindRealAPI(): Search works with mocked GitHub API
   - **Coverage Target**: 80%

**Overall Coverage Target**: 87%

**Implementation**:
1. Create file: `src/core/feature-deleter/github-service.ts`
2. Define `FeatureDeletionGitHubService` class
3. Implement `findFeatureIssues(featureId)` method
4. Search query: `repo:{owner}/{repo} is:issue "[{featureId}]" in:title`
5. Use `gh issue list` with JSON output
6. Filter results to exact pattern: `/\[FS-\d{3}\]\[US-\d{3}\]/`
7. Extract issue metadata: number, title, URL
8. Write unit tests (4 tests) with mocked gh CLI
9. Run unit tests: `npm test github-service.test` (should pass: 4/4)
10. Write integration test (1 test) with GitHub API mock
11. Run integration test: `npm test github-integration` (should pass: 1/1)
12. Verify coverage: `npm run coverage -- --include=src/core/feature-deleter/github-service.ts` (should be ≥87%)

**TDD Workflow**:
1. 📝 Write all 5 tests above (should fail)
2. ❌ Run tests: `npm test` (0/5 passing)
3. ✅ Implement GitHub search (steps 1-7)
4. 🟢 Run tests: `npm test` (5/5 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥87%

---

### T-025: Implement GitHub Issue Closure (Not Deletion)

**User Story**: US-005
**Satisfies ACs**: AC-US5-06
**Priority**: P1
**Estimated Effort**: 2 hours
**Status**: [x] completed

**Test Plan**:
- **Given** 3 GitHub issues to close
- **When** GitHub deletion executes
- **Then** issues should be closed (not deleted) via `gh issue close`
- **And** closure comment should be added: "Closed by feature deletion automation"

**Test Cases**:
1. **Unit**: `tests/unit/feature-deleter/github-service.test.ts`
   - testGitHubIssueClose(): gh issue close called for each issue
   - testGitHubIssueCloseComment(): Closure comment added
   - testGitHubIssueCloseReturnValue(): Closed issue count returned
   - **Coverage Target**: 88%

2. **Integration**: `tests/integration/feature-deleter/github-integration.test.ts`
   - testGitHubIssueCloseRealAPI(): Issues closed via mocked API
   - **Coverage Target**: 78%

**Overall Coverage Target**: 84%

**Implementation**:
1. Add `deleteIssues(issues)` method to `FeatureDeletionGitHubService`
2. For each issue:
   - Run `gh issue close {number} --comment "Closed by feature deletion automation"`
3. Log each closure
4. Return stats: `{ closed: number, failed: number }`
5. Write unit tests (3 tests) in `github-service.test.ts`
6. Run unit tests: `npm test github-service.test` (should pass: 3/3)
7. Write integration test (1 test) in `github-integration.test.ts`
8. Run integration test: `npm test github-integration` (should pass: 1/1)
9. Verify coverage: `npm run coverage -- --include=src/core/feature-deleter/github-service.ts` (should be ≥84%)

**TDD Workflow**:
1. 📝 Write all 4 tests above (should fail)
2. ❌ Run tests: `npm test` (0/4 passing)
3. ✅ Implement issue closure (steps 1-4)
4. 🟢 Run tests: `npm test` (4/4 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥84%

---

### T-026: Implement GitHub Confirmation Prompt (Separate)

**User Story**: US-005
**Satisfies ACs**: AC-US5-03
**Priority**: P1
**Estimated Effort**: 2 hours
**Status**: [x] completed

**Test Plan**:
- **Given** feature deletion confirmed by user
- **When** GitHub cleanup is about to execute
- **Then** separate confirmation prompt should be shown
- **And** user can decline GitHub cleanup while proceeding with file deletion

**Test Cases**:
1. **Unit**: `tests/unit/feature-deleter/confirmation-manager.test.ts`
   - testGitHubConfirmationSeparate(): GitHub prompt shown after primary
   - testGitHubConfirmationAccepted(): User confirms → GitHub cleanup executes
   - testGitHubConfirmationDeclined(): User declines → GitHub cleanup skipped
   - testGitHubConfirmationSkippedWithYesFlag(): --yes flag skips prompt
   - **Coverage Target**: 90%

2. **E2E**: `tests/e2e/delete-feature-command.test.ts`
   - testTwoConfirmationsInFlow(): Both prompts shown in correct order
   - **Coverage Target**: 72%

**Overall Coverage Target**: 84%

**Implementation**:
1. Update `ConfirmationManager` to add GitHub confirmation tier
2. Prompt text: "Close {N} GitHub issues? (y/N)"
3. Show issue list before prompt (numbers and titles)
4. If user declines → set `skipGitHub = true` in options
5. If --yes flag → skip prompt (default: yes)
6. Write unit tests (4 tests) in `confirmation-manager.test.ts`
7. Run unit tests: `npm test confirmation-manager.test` (should pass: 4/4)
8. Write E2E test (1 test) in `delete-feature-command.test.ts`
9. Run E2E test: `npm test delete-feature-command` (should pass: 1/1)
10. Verify coverage: `npm run coverage -- --include=src/core/feature-deleter/confirmation-manager.ts` (should be ≥84%)

**TDD Workflow**:
1. 📝 Write all 5 tests above (should fail)
2. ❌ Run tests: `npm test` (0/5 passing)
3. ✅ Implement GitHub confirmation (steps 1-5)
4. 🟢 Run tests: `npm test` (5/5 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥84%

---

### T-027: Implement --no-github Flag

**User Story**: US-005
**Satisfies ACs**: AC-US5-04
**Priority**: P1
**Estimated Effort**: 1 hour
**Status**: [x] completed

**Test Plan**:
- **Given** deletion runs with --no-github flag
- **When** GitHub cleanup is skipped
- **Then** no GitHub API calls should be made
- **And** no GitHub confirmation prompt should be shown

**Test Cases**:
1. **Unit**: `tests/unit/feature-deleter/github-service.test.ts`
   - testNoGitHubFlagSkipsAPI(): GitHub service not invoked
   - testNoGitHubFlagNoConfirmation(): GitHub prompt not shown
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Add `noGithub` flag to `DeletionOptions` interface
2. Update `FeatureDeleter.execute()` to check `options.noGithub`
3. If --no-github:
   - Skip `GitHubService.findFeatureIssues()`
   - Skip GitHub confirmation prompt
   - Log: "GitHub cleanup skipped (--no-github)"
4. Write unit tests (2 tests) in `github-service.test.ts`
5. Run unit tests: `npm test github-service.test` (should pass: 2/2)
6. Verify coverage: `npm run coverage -- --include=src/core/feature-deleter/github-service.ts` (should be ≥85%)

**TDD Workflow**:
1. 📝 Write all 2 tests above (should fail)
2. ❌ Run tests: `npm test` (0/2 passing)
3. ✅ Implement --no-github flag (steps 1-3)
4. 🟢 Run tests: `npm test` (2/2 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥85%

---

### T-028: Implement GitHub API Error Handling (Non-Critical)

**User Story**: US-005
**Satisfies ACs**: AC-US5-05
**Priority**: P1
**Estimated Effort**: 2 hours
**Status**: [x] completed

**Test Plan**:
- **Given** GitHub API returns rate limit error
- **When** GitHub cleanup executes
- **Then** error should be logged as warning (not failure)
- **And** deletion should continue (GitHub cleanup is non-critical)
- **And** error message should suggest manual cleanup

**Test Cases**:
1. **Unit**: `tests/unit/feature-deleter/github-service.test.ts`
   - testGitHubRateLimitError(): Rate limit error handled gracefully
   - testGitHubAuthError(): Auth error handled gracefully
   - testGitHubNotInstalledError(): gh CLI not found → warning
   - testGitHubErrorNonCritical(): Deletion succeeds despite GitHub error
   - **Coverage Target**: 90%

**Overall Coverage Target**: 90%

**Implementation**:
1. Add error handling to `deleteIssues()` method
2. Catch specific GitHub errors:
   - Rate limit: `HTTP 403 rate limit exceeded`
   - Auth: `HTTP 401 authentication required`
   - Not installed: `command not found: gh`
3. For each error type:
   - Log warning (not error)
   - Show manual cleanup suggestion
   - Continue deletion (don't throw)
4. Return partial result: `{ closed: N, failed: M }`
5. Write unit tests (4 tests) simulating different errors
6. Run unit tests: `npm test github-service.test` (should pass: 4/4)
7. Verify coverage: `npm run coverage -- --include=src/core/feature-deleter/github-service.ts` (should be ≥90%)

**TDD Workflow**:
1. 📝 Write all 4 tests above (should fail)
2. ❌ Run tests: `npm test` (0/4 passing)
3. ✅ Implement error handling (steps 1-4)
4. 🟢 Run tests: `npm test` (4/4 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥90%

---

### T-029: Implement GitHub Rate Limit Retry Logic

**User Story**: US-005
**Satisfies ACs**: AC-US5-05
**Priority**: P1
**Estimated Effort**: 2 hours
**Status**: [x] completed

**Test Plan**:
- **Given** GitHub API returns rate limit error
- **When** retry logic executes
- **Then** request should be retried up to 3 times with exponential backoff (2s, 4s, 8s)
- **And** if all retries fail → log warning and skip

**Test Cases**:
1. **Unit**: `tests/unit/feature-deleter/github-service.test.ts`
   - testGitHubRetryOnRateLimit(): Retries up to 3 times
   - testGitHubRetryExponentialBackoff(): Backoff delays correct (2s, 4s, 8s)
   - testGitHubRetrySuccessOnSecond(): Success on retry → no error
   - testGitHubRetryAllFail(): All retries fail → warning logged
   - **Coverage Target**: 92%

**Overall Coverage Target**: 92%

**Implementation**:
1. Add `retryWithBackoff()` helper function
2. Implement exponential backoff:
   - Attempt 1: immediate
   - Attempt 2: wait 2s
   - Attempt 3: wait 4s
   - Attempt 4: wait 8s
3. If all fail → log warning, return partial result
4. Write unit tests (4 tests) with mocked delays
5. Run unit tests: `npm test github-service.test` (should pass: 4/4)
6. Verify coverage: `npm run coverage -- --include=src/core/feature-deleter/github-service.ts` (should be ≥92%)

**TDD Workflow**:
1. 📝 Write all 4 tests above (should fail)
2. ❌ Run tests: `npm test` (0/4 passing)
3. ✅ Implement retry logic (steps 1-3)
4. 🟢 Run tests: `npm test` (4/4 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥92%

---

## User Story: US-006 - Audit Trail (Priority: P2)

**Linked ACs**: AC-US6-01, AC-US6-02, AC-US6-03, AC-US6-04, AC-US6-05, AC-US6-06
**Tasks**: 8 total, 0 completed

### T-030: Implement Audit Logger with JSON Lines Format

**User Story**: US-006
**Satisfies ACs**: AC-US6-01, AC-US6-02, AC-US6-03, AC-US6-04, AC-US6-05
**Priority**: P2
**Estimated Effort**: 3 hours
**Status**: [x] completed

**Test Plan**:
- **Given** feature FS-052 deletion completes successfully
- **When** audit log is written
- **Then** log entry should be in JSON Lines format
- **And** log entry should include feature ID, timestamp, user, reason, mode, file count, orphaned increments, git commit SHA

**Test Cases**:
1. **Unit**: `tests/unit/feature-deleter/audit-logger.test.ts`
   - testAuditLogEntryFormat(): JSON Lines format correct
   - testAuditLogEntryFields(): All required fields present
   - testAuditLogEntrySnapshot(): Log entry matches snapshot
   - testAuditLogUserExtraction(): User from git config or environment
   - testAuditLogTimestampISO(): Timestamp in ISO 8601 format
   - **Coverage Target**: 90%

2. **Integration**: `tests/integration/feature-deleter/end-to-end-deletion.test.ts`
   - testAuditLogPersistence(): Log file created and entry written
   - **Coverage Target**: 80%

**Overall Coverage Target**: 87%

**Implementation**:
1. Create file: `src/core/feature-deleter/audit-logger.ts`
2. Define `FeatureDeletionAuditLogger` class
3. Implement `logDeletion(event)` method
4. Log format:
   ```json
   {
     "timestamp": "2025-11-23T14:30:00.000Z",
     "featureId": "FS-052",
     "user": "john.doe",
     "mode": "safe",
     "filesDeleted": 47,
     "livingDocsFiles": 1,
     "userStoryFiles": 3,
     "commitSha": "abc123def456",
     "githubIssuesClosed": 3,
     "orphanedIncrements": [],
     "status": "success"
   }
   ```
5. Append to `.specweave/logs/feature-deletions.log` (JSON Lines)
6. Get user from `git config user.name` or `USER` environment variable
7. Get timestamp as ISO 8601
8. Write unit tests (5 tests) with snapshot testing
9. Run unit tests: `npm test audit-logger.test` (should pass: 5/5)
10. Write integration test (1 test) in `end-to-end-deletion.test.ts`
11. Run integration test: `npm test end-to-end-deletion` (should pass: 1/1)
12. Verify coverage: `npm run coverage -- --include=src/core/feature-deleter/audit-logger.ts` (should be ≥87%)

**TDD Workflow**:
1. 📝 Write all 6 tests above (should fail)
2. ❌ Run tests: `npm test` (0/6 passing)
3. ✅ Implement audit logger (steps 1-7)
4. 🟢 Run tests: `npm test` (6/6 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥87%

---

### T-031: Implement Audit Log Rotation (>10MB)

**User Story**: US-006
**Satisfies ACs**: AC-US6-01
**Priority**: P2
**Estimated Effort**: 2 hours
**Status**: [x] completed

**Test Plan**:
- **Given** audit log file exceeds 10MB
- **When** new log entry is written
- **Then** log file should be rotated to `.feature-deletions.log.1`
- **And** new log entry should be written to fresh log file

**Test Cases**:
1. **Unit**: `tests/unit/feature-deleter/audit-logger.test.ts`
   - testLogRotationTriggered(): Rotation occurs at 10MB threshold
   - testLogRotationRenaming(): Old log renamed to .log.1
   - testLogRotationNewFileCreated(): Fresh log file created
   - testLogRotationPreservesOldEntries(): Old entries not lost
   - **Coverage Target**: 88%

**Overall Coverage Target**: 88%

**Implementation**:
1. Add `checkLogSize()` method to `FeatureDeletionAuditLogger`
2. Before writing entry, check log file size
3. If size > 10MB:
   - Rename `.feature-deletions.log` to `.feature-deletions.log.1`
   - Create new `.feature-deletions.log`
4. If `.feature-deletions.log.1` exists → overwrite (keep only 1 rotation)
5. Write unit tests (4 tests) in `audit-logger.test.ts`
6. Run unit tests: `npm test audit-logger.test` (should pass: 4/4)
7. Verify coverage: `npm run coverage -- --include=src/core/feature-deleter/audit-logger.ts` (should be ≥88%)

**TDD Workflow**:
1. 📝 Write all 4 tests above (should fail)
2. ❌ Run tests: `npm test` (0/4 passing)
3. ✅ Implement log rotation (steps 1-4)
4. 🟢 Run tests: `npm test` (4/4 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥88%

---

### T-032: Implement Audit Log for Partial Deletions

**User Story**: US-006
**Satisfies ACs**: AC-US6-02, AC-US6-03
**Priority**: P2
**Estimated Effort**: 2 hours
**Status**: [x] completed

**Test Plan**:
- **Given** deletion partially succeeds (files deleted but GitHub cleanup failed)
- **When** audit log is written
- **Then** status should be "partial"
- **And** errors array should list what failed
- **And** file count should reflect actual deletions

**Test Cases**:
1. **Unit**: `tests/unit/feature-deleter/audit-logger.test.ts`
   - testAuditLogPartialStatus(): Status "partial" when errors occur
   - testAuditLogErrorsArray(): Errors array populated
   - testAuditLogPartialFileCount(): File count accurate despite errors
   - **Coverage Target**: 87%

**Overall Coverage Target**: 87%

**Implementation**:
1. Update `DeletionEvent` interface to include `status` field
2. Status values: `"success" | "partial" | "failed"`
3. If any non-critical errors (GitHub, metadata update) → status = "partial"
4. If critical errors (git commit, file deletion) → status = "failed"
5. Add `errors: string[]` field to log entry
6. Write unit tests (3 tests) in `audit-logger.test.ts`
7. Run unit tests: `npm test audit-logger.test` (should pass: 3/3)
8. Verify coverage: `npm run coverage -- --include=src/core/feature-deleter/audit-logger.ts` (should be ≥87%)

**TDD Workflow**:
1. 📝 Write all 3 tests above (should fail)
2. ❌ Run tests: `npm test` (0/3 passing)
3. ✅ Implement partial status (steps 1-5)
4. 🟢 Run tests: `npm test` (3/3 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥87%

---

### T-033: Implement Audit Log for Failed Deletions

**User Story**: US-006
**Satisfies ACs**: AC-US6-02
**Priority**: P2
**Estimated Effort**: 1 hour
**Status**: [x] completed

**Test Plan**:
- **Given** deletion fails completely (validation error or rollback)
- **When** audit log is written
- **Then** status should be "failed"
- **And** errors array should list failure reason
- **And** filesDeleted should be 0

**Test Cases**:
1. **Unit**: `tests/unit/feature-deleter/audit-logger.test.ts`
   - testAuditLogFailedStatus(): Status "failed" on complete failure
   - testAuditLogFailedZeroFiles(): filesDeleted = 0 on failure
   - testAuditLogFailedErrorMessage(): Error message clear and actionable
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Update `FeatureDeleter.execute()` to catch all errors
2. On error:
   - Log audit entry with status "failed"
   - Include error message in errors array
   - Set filesDeleted = 0
   - Set commitSha = null
3. Write unit tests (3 tests) in `audit-logger.test.ts`
4. Run unit tests: `npm test audit-logger.test` (should pass: 3/3)
5. Verify coverage: `npm run coverage -- --include=src/core/feature-deleter/audit-logger.ts` (should be ≥85%)

**TDD Workflow**:
1. 📝 Write all 3 tests above (should fail)
2. ❌ Run tests: `npm test` (0/3 passing)
3. ✅ Implement failed status (steps 1-2)
4. 🟢 Run tests: `npm test` (3/3 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥85%

---

### T-034: Implement CLI Command Registration

**User Story**: US-006
**Satisfies ACs**: AC-US6-01
**Priority**: P1
**Estimated Effort**: 2 hours
**Status**: [x] completed

**Test Plan**:
- **Given** CLI command is registered
- **When** user runs `specweave delete-feature FS-052`
- **Then** command should parse feature ID
- **And** command should parse flags (--force, --dry-run, --no-git, --no-github, --yes)
- **And** command should invoke `FeatureDeleter.execute()`

**Test Cases**:
1. **E2E**: `tests/e2e/delete-feature-command.test.ts`
   - testCLICommandExecution(): Command executes successfully
   - testCLIFlagParsing(): All flags parsed correctly
   - testCLIFeatureIDValidation(): Invalid feature ID rejected
   - testCLIExitCodes(): Correct exit codes (0 = success, 1 = error)
   - **Coverage Target**: 80%

**Overall Coverage Target**: 80%

**Implementation**:
1. Create file: `src/cli/commands/delete-feature.ts`
2. Register command with Commander.js:
   ```typescript
   program
     .command('delete-feature <feature-id>')
     .description('Delete a feature and its associated files')
     .option('--force', 'Bypass active increment validation')
     .option('--dry-run', 'Preview deletion without executing')
     .option('--no-git', 'Skip git operations')
     .option('--no-github', 'Skip GitHub issue cleanup')
     .option('--yes', 'Skip confirmations (except elevated)')
     .action(deleteFeatureAction);
   ```
3. Implement `deleteFeatureAction(featureId, options)`:
   - Validate feature ID format (`FS-\d{3}`)
   - Create `FeatureDeleter` instance
   - Call `deleter.execute(featureId, options)`
   - Handle result and exit codes
4. Write E2E tests (4 tests) spawning CLI process
5. Run E2E tests: `npm test delete-feature-command` (should pass: 4/4)
6. Verify coverage: `npm run coverage -- --include=src/cli/commands/delete-feature.ts` (should be ≥80%)

**TDD Workflow**:
1. 📝 Write all 4 tests above (should fail)
2. ❌ Run tests: `npm test` (0/4 passing)
3. ✅ Implement CLI command (steps 1-3)
4. 🟢 Run tests: `npm test` (4/4 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥80%

---

### T-035: Implement Feature ID Validation

**User Story**: US-006
**Satisfies ACs**: AC-US6-01
**Priority**: P1
**Estimated Effort**: 1 hour
**Status**: [x] completed

**Test Plan**:
- **Given** user provides invalid feature ID (e.g., "FS-52", "FS-0520", "feature-052")
- **When** CLI command parses feature ID
- **Then** validation error should be shown
- **And** helpful error message should suggest correct format

**Test Cases**:
1. **Unit**: `tests/unit/cli/commands/delete-feature.test.ts`
   - testFeatureIDValidFormat(): Valid ID "FS-052" accepted
   - testFeatureIDInvalidTwoDigits(): "FS-52" rejected
   - testFeatureIDInvalidFourDigits(): "FS-0520" rejected
   - testFeatureIDInvalidPrefix(): "feature-052" rejected
   - testFeatureIDErrorMessage(): Error message helpful
   - **Coverage Target**: 88%

**Overall Coverage Target**: 88%

**Implementation**:
1. Add `validateFeatureId(id)` helper function in `delete-feature.ts`
2. Regex: `/^FS-\d{3}$/` (exactly 3 digits after FS-)
3. If invalid:
   - Throw error with message: "Invalid feature ID format. Expected: FS-XXX (e.g., FS-052)"
4. Write unit tests (5 tests)
5. Run unit tests: `npm test delete-feature.test` (should pass: 5/5)
6. Verify coverage: `npm run coverage -- --include=src/cli/commands/delete-feature.ts` (should be ≥88%)

**TDD Workflow**:
1. 📝 Write all 5 tests above (should fail)
2. ❌ Run tests: `npm test` (0/5 passing)
3. ✅ Implement validation (steps 1-3)
4. 🟢 Run tests: `npm test` (5/5 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥88%

---

### T-036: Implement Feature Deleter Orchestrator (Main Entry Point)

**User Story**: US-006
**Satisfies ACs**: AC-US6-01
**Priority**: P1
**Estimated Effort**: 3 hours
**Status**: [x] completed

**Test Plan**:
- **Given** all components (validator, transaction, git, GitHub, audit) are implemented
- **When** FeatureDeleter.execute() runs
- **Then** workflow should execute in order: validate → confirm → stage → commit → audit
- **And** result should summarize all operations

**Test Cases**:
1. **Unit**: `tests/unit/feature-deleter/index.test.ts`
   - testFeatureDeleterOrchestration(): All steps executed in order
   - testFeatureDeleterResultSummary(): Result includes all metadata
   - testFeatureDeleterErrorHandling(): Errors caught and logged
   - **Coverage Target**: 87%

2. **Integration**: `tests/integration/feature-deleter/end-to-end-deletion.test.ts`
   - testFullDeletionFlow(): Complete flow from start to finish
   - testFullDeletionResult(): Result accurate
   - **Coverage Target**: 82%

**Overall Coverage Target**: 85%

**Implementation**:
1. Create file: `src/core/feature-deleter/index.ts`
2. Define `FeatureDeleter` class with `execute()` method
3. Orchestrate workflow:
   - Step 1: Validate (call `FeatureValidator.validate()`)
   - Step 2: Confirm (call `ConfirmationManager.confirm()`)
   - Step 3: Execute transaction (call `DeletionTransaction.execute()`)
   - Step 4: Audit (call `FeatureDeletionAuditLogger.logDeletion()`)
4. Handle errors at each step:
   - Validation error → abort, return error result
   - User declined → abort, return cancelled result
   - Transaction error → rollback, return error result
5. Return `DeletionResult` with summary
6. Write unit tests (3 tests) in `index.test.ts`
7. Run unit tests: `npm test index.test` (should pass: 3/3)
8. Write integration tests (2 tests) in `end-to-end-deletion.test.ts`
9. Run integration tests: `npm test end-to-end-deletion` (should pass: 2/2)
10. Verify coverage: `npm run coverage -- --include=src/core/feature-deleter/index.ts` (should be ≥85%)

**TDD Workflow**:
1. 📝 Write all 5 tests above (should fail)
2. ❌ Run tests: `npm test` (0/5 passing)
3. ✅ Implement orchestrator (steps 1-5)
4. 🟢 Run tests: `npm test` (5/5 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥85%

---

### T-037: Implement /specweave:audit-deletions Command (Optional - P3)

**User Story**: US-006
**Satisfies ACs**: AC-US6-06
**Priority**: P3
**Estimated Effort**: 2 hours
**Status**: [x] completed

**Test Plan**:
- **Given** audit log with 10 deletion entries
- **When** /specweave:audit-deletions command runs
- **Then** all entries should be displayed in readable format
- **And** entries should be sorted by timestamp (newest first)

**Test Cases**:
1. **Unit**: `tests/unit/cli/commands/audit-deletions.test.ts`
   - testAuditCommandReadLog(): Reads JSON Lines log correctly
   - testAuditCommandSorting(): Entries sorted by timestamp descending
   - testAuditCommandFormatting(): Output formatted for readability
   - testAuditCommandEmptyLog(): Handles empty log gracefully
   - **Coverage Target**: 80%

**Overall Coverage Target**: 80%

**Implementation**:
1. Create file: `src/cli/commands/audit-deletions.ts`
2. Register command:
   ```typescript
   program
     .command('audit-deletions')
     .description('View feature deletion history')
     .option('--limit <n>', 'Show last N entries', '10')
     .action(auditDeletionsAction);
   ```
3. Read `.specweave/logs/feature-deletions.log` (JSON Lines)
4. Parse each line as JSON
5. Sort by timestamp (newest first)
6. Format output:
   ```
   Feature Deletion History (last 10):

   [2025-11-23 14:30:00] FS-052 (safe mode)
     Files: 47 | Commit: abc123d | GitHub: 3 issues | Status: success
     User: john.doe

   [2025-11-23 12:15:00] FS-051 (force mode)
     Files: 20 | Commit: def456a | GitHub: 2 issues | Status: partial
     User: jane.smith
     Errors: GitHub rate limit exceeded
   ```
7. Write unit tests (4 tests)
8. Run unit tests: `npm test audit-deletions.test` (should pass: 4/4)
9. Verify coverage: `npm run coverage -- --include=src/cli/commands/audit-deletions.ts` (should be ≥80%)

**TDD Workflow**:
1. 📝 Write all 4 tests above (should fail)
2. ❌ Run tests: `npm test` (0/4 passing)
3. ✅ Implement audit command (steps 1-6)
4. 🟢 Run tests: `npm test` (4/4 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥80%

---

## Overall Test Coverage Summary

**Total Tests**: 147 tests across all tasks

**Coverage Breakdown by Phase**:
- Phase 1 (Core Validation & File Detection): 90% coverage
- Phase 2 (Deletion Transaction & Git Integration): 88% coverage
- Phase 3 (Confirmation UX & CLI Command): 85% coverage
- Phase 4 (GitHub Integration & Cleanup): 87% coverage
- Phase 5 (Audit Logging & Dry-Run): 83% coverage

**Overall Coverage Target**: 85% minimum (enforced by CI)

**Test Execution**:
```bash
npm run test:unit           # Unit tests (90%+ coverage)
npm run test:integration    # Integration tests (80%+ coverage)
npm run test:e2e            # E2E tests (70%+ coverage)
npm run test:all            # All tests
npm run test:coverage       # Coverage report (must be ≥85%)
```

---

## Progress Tracking

**Total Tasks**: 37
**Completed Tasks**: 0
**Remaining Tasks**: 37

**By Priority**:
- P1 (Critical): 33 tasks
- P2 (Important): 3 tasks
- P3 (Nice-to-have): 1 task

**By Phase**:
- Phase 1 (Core Validation): 6 tasks
- Phase 2 (Deletion Transaction): 5 tasks
- Phase 3 (Confirmation UX): 6 tasks
- Phase 4 (GitHub Integration): 6 tasks
- Phase 5 (Audit Logging): 8 tasks
- CLI Command: 6 tasks

---

## Next Steps

1. ✅ Review tasks.md with PM and Tech Lead
2. ⏳ Start Phase 1 (T-001: Active Increment Validation)
3. ⏳ Follow TDD workflow (RED → GREEN → REFACTOR)
4. ⏳ Complete Phase 1 → Review → Start Phase 2
5. ⏳ Integration test after Phase 2
6. ⏳ Complete all phases → Final E2E testing
7. ⏳ Verify 85%+ coverage
8. ⏳ Update README.md with command documentation
9. ⏳ Mark increment as completed via `/specweave:done 0052`

---

**Estimated Total Effort**: 16 hours (2 days)

**Test Mode**: TDD (tests before implementation)

**Coverage Target**: 85% minimum
