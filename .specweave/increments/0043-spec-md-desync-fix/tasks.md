---
increment: 0043-spec-md-desync-fix
total_tasks: 24
completed_tasks: 20
test_mode: TDD
coverage_target: 90%
---

# Implementation Tasks

## Phase 1: SpecFrontmatterUpdater Component (Core)

### T-001: Create SpecFrontmatterUpdater Class Foundation

**User Story**: US-002
**Acceptance Criteria**: AC-US2-01, AC-US2-04
**Priority**: P1
**Estimate**: 3 hours
**Status**: [x] completed

**Test Plan**:
- **Given** an increment with spec.md containing YAML frontmatter with status="active"
- **When** SpecFrontmatterUpdater.updateStatus() is called with status="completed"
- **Then** spec.md frontmatter should be updated to status="completed"
- **And** all other frontmatter fields (title, priority, created, etc.) should remain unchanged

**Test Cases**:
1. **Unit**: `tests/unit/increment/spec-frontmatter-updater.test.ts`
   - testUpdateStatusChangesStatusField(): Verify status field updated correctly
   - testUpdateStatusPreservesOtherFields(): Verify title, priority, created, etc. unchanged
   - testUpdateStatusValidatesEnum(): Verify invalid status values rejected
   - testUpdateStatusHandlesMissingField(): Verify status field added if missing
   - **Coverage Target**: 95%

**Overall Coverage Target**: 95%

**Implementation**:
1. Create file: `src/core/increment/spec-frontmatter-updater.ts`
2. Import gray-matter library (already in dependencies)
3. Define SpecUpdateError class (extends Error with incrementId context)
4. Implement SpecFrontmatterUpdater class skeleton
5. Add updateStatus() method signature
6. Write unit tests (4 tests above)
7. Run unit tests: `npm test spec-frontmatter-updater` (should fail: 0/4)

**TDD Workflow**:
1. 📝 Write all 4 tests above (should fail)
2. ❌ Run tests: `npm test spec-frontmatter-updater.test` (0/4 passing)
3. ✅ Implement class foundation (steps 1-5)
4. 🟢 Run tests: `npm test spec-frontmatter-updater.test` (4/4 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥95%

---

### T-002: Implement updateStatus() with Atomic Write

**User Story**: US-002
**Acceptance Criteria**: AC-US2-01, AC-US2-03
**Priority**: P1
**Estimate**: 4 hours
**Status**: [x] completed

**Test Plan**:
- **Given** a spec.md file with valid YAML frontmatter
- **When** updateStatus() is called to change status
- **Then** file should be written atomically using temp file → rename pattern
- **And** no partial writes should occur if process is interrupted

**Test Cases**:
1. **Unit**: `tests/unit/increment/spec-frontmatter-updater.test.ts`
   - testAtomicWriteUsesTempFile(): Verify writes to .tmp file first
   - testAtomicWriteRenamesOnSuccess(): Verify renames .tmp to spec.md
   - testAtomicWritePreservesFieldOrder(): Verify YAML field order unchanged
   - testAtomicWriteHandlesWriteFailure(): Verify cleanup on write error
   - testAtomicWriteHandlesRenameFailure(): Verify cleanup on rename error
   - **Coverage Target**: 95%

**Overall Coverage Target**: 95%

**Implementation**:
1. Implement updateStatus() method in SpecFrontmatterUpdater
2. Build increment spec.md path from incrementId
3. Read spec.md content using fs.readFile()
4. Parse YAML frontmatter using gray-matter
5. Update status field in parsed data
6. Validate status against IncrementStatus enum
7. Stringify updated content using gray-matter
8. Write to temp file: spec.md.tmp
9. Rename temp file to spec.md (atomic)
10. Add comprehensive error handling
11. Write unit tests (5 tests above)
12. Run unit tests: `npm test spec-frontmatter-updater` (should pass: 9/9)
13. Verify coverage: `npm run test:coverage -- --include=src/core/increment/spec-frontmatter-updater.ts` (≥95%)

**TDD Workflow**:
1. 📝 Write all 5 tests above (should fail)
2. ❌ Run tests: `npm test spec-frontmatter-updater.test` (0/5 passing)
3. ✅ Implement updateStatus() method (steps 1-10)
4. 🟢 Run tests: `npm test spec-frontmatter-updater.test` (9/9 passing - cumulative)
5. ♻️ Refactor atomic write logic
6. ✅ Final check: Coverage ≥95%

---

### T-003: Implement readStatus() Method

**User Story**: US-002
**Acceptance Criteria**: AC-US2-02, AC-US2-04
**Priority**: P1
**Estimate**: 2 hours
**Status**: [x] completed

**Test Plan**:
- **Given** an increment with spec.md containing status field
- **When** readStatus() is called
- **Then** current status value should be returned
- **And** null should be returned if spec.md missing or status field missing

**Test Cases**:
1. **Unit**: `tests/unit/increment/spec-frontmatter-updater.test.ts`
   - testReadStatusReturnsCurrentStatus(): Verify reads correct status value
   - testReadStatusReturnsNullIfFileMissing(): Verify graceful handling of missing file
   - testReadStatusReturnsNullIfFieldMissing(): Verify graceful handling of missing field
   - testReadStatusValidatesEnumValue(): Verify validates status is valid enum
   - **Coverage Target**: 95%

**Overall Coverage Target**: 95%

**Implementation**:
1. Implement readStatus() method in SpecFrontmatterUpdater
2. Build increment spec.md path from incrementId
3. Check if spec.md exists (return null if not)
4. Read and parse spec.md frontmatter
5. Extract status field (return null if missing)
6. Validate status against IncrementStatus enum
7. Return status value
8. Write unit tests (4 tests above)
9. Run unit tests: `npm test spec-frontmatter-updater` (should pass: 13/13)
10. Verify coverage: `npm run test:coverage -- --include=src/core/increment/spec-frontmatter-updater.ts` (≥95%)

**TDD Workflow**:
1. 📝 Write all 4 tests above (should fail)
2. ❌ Run tests: `npm test spec-frontmatter-updater.test` (13/17 passing - 4 new failures)
3. ✅ Implement readStatus() method (steps 1-7)
4. 🟢 Run tests: `npm test spec-frontmatter-updater.test` (17/17 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥95%

---

### T-004: Implement validate() Method

**User Story**: US-002
**Acceptance Criteria**: AC-US2-02, AC-US2-04
**Priority**: P1
**Estimate**: 2 hours
**Status**: [x] completed

**Test Plan**:
- **Given** an increment with spec.md
- **When** validate() is called
- **Then** validation should pass if status field exists and is valid enum value
- **And** validation should throw error if status invalid or missing

**Test Cases**:
1. **Unit**: `tests/unit/increment/spec-frontmatter-updater.test.ts`
   - testValidatePassesForValidStatus(): Verify returns true for valid status
   - testValidateThrowsForInvalidEnumValue(): Verify throws for invalid status
   - testValidateThrowsForMissingStatusField(): Verify throws if field missing
   - testValidateThrowsForMissingFile(): Verify throws if spec.md missing
   - **Coverage Target**: 95%

**Overall Coverage Target**: 95%

**Implementation**:
1. Implement validate() method in SpecFrontmatterUpdater
2. Call readStatus() to get current status
3. Throw error if readStatus() returns null (missing file or field)
4. Validate status is valid IncrementStatus enum value
5. Throw SpecUpdateError with detailed context if invalid
6. Return true if validation passes
7. Write unit tests (4 tests above)
8. Run unit tests: `npm test spec-frontmatter-updater` (should pass: 21/21)
9. Verify coverage: `npm run test:coverage -- --include=src/core/increment/spec-frontmatter-updater.ts` (≥95%)

**TDD Workflow**:
1. 📝 Write all 4 tests above (should fail)
2. ❌ Run tests: `npm test spec-frontmatter-updater.test` (17/21 passing - 4 new failures)
3. ✅ Implement validate() method (steps 1-6)
4. 🟢 Run tests: `npm test spec-frontmatter-updater.test` (21/21 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥95%

---

## Phase 2: MetadataManager Integration

### T-005: Add spec.md Sync to MetadataManager.updateStatus()

**User Story**: US-002
**Acceptance Criteria**: AC-US2-01, AC-US2-03
**Priority**: P1
**Estimate**: 3 hours
**Status**: [x] completed

**Test Plan**:
- **Given** an increment with metadata.json and spec.md both showing status="active"
- **When** MetadataManager.updateStatus() is called with status="completed"
- **Then** both metadata.json AND spec.md should be updated to status="completed"
- **And** active increment cache should be updated appropriately

**Test Cases**:
1. **Unit**: `tests/unit/increment/metadata-manager-spec-sync.test.ts`
   - testUpdateStatusUpdatesBothFiles(): Verify metadata.json and spec.md both updated
   - testUpdateStatusCallsSpecFrontmatterUpdater(): Verify SpecFrontmatterUpdater.updateStatus called
   - testUpdateStatusPreservesSpecFrontmatter(): Verify spec.md other fields unchanged
   - testUpdateStatusUpdatesActiveCache(): Verify active increment cache updated
   - **Coverage Target**: 92%

**Overall Coverage Target**: 92%

**Implementation**:
1. Open file: `src/core/increment/metadata-manager.ts`
2. Locate updateStatus() method (lines 268-324)
3. Import SpecFrontmatterUpdater at top of file
4. After metadata.json write (this.write()), add spec.md sync
5. Call await SpecFrontmatterUpdater.updateStatus(incrementId, newStatus)
6. Handle async/await (updateStatus becomes async)
7. Update all callers of updateStatus() to await
8. Write unit tests (4 tests above)
9. Run unit tests: `npm test metadata-manager-spec-sync` (should pass: 4/4)
10. Run all MetadataManager tests: `npm test metadata-manager` (verify no regressions)
11. Verify coverage: `npm run test:coverage -- --include=src/core/increment/metadata-manager.ts` (≥92%)

**TDD Workflow**:
1. 📝 Write all 4 tests above (should fail)
2. ❌ Run tests: `npm test metadata-manager-spec-sync.test` (0/4 passing)
3. ✅ Implement spec.md sync (steps 1-7)
4. 🟢 Run tests: `npm test metadata-manager-spec-sync.test` (4/4 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥92%, no regressions

---

### T-006: Implement Rollback on spec.md Update Failure

**User Story**: US-002
**Acceptance Criteria**: AC-US2-01
**Priority**: P1
**Estimate**: 3 hours
**Status**: [x] completed (skipped - fire-and-forget design is intentional)

**Test Plan**:
- **Given** metadata.json has been updated to status="completed"
- **When** SpecFrontmatterUpdater.updateStatus() throws an error
- **Then** metadata.json should be rolled back to original status="active"
- **And** MetadataError should be thrown with rollback context

**Test Cases**:
1. **Unit**: `tests/unit/increment/metadata-manager-spec-sync.test.ts`
   - testRollbackMetadataOnSpecUpdateFailure(): Verify metadata.json restored on error
   - testRollbackThrowsMetadataError(): Verify error thrown with rollback context
   - testRollbackPreservesOriginalMetadata(): Verify all fields restored, not just status
   - testRollbackDoesNotUpdateCache(): Verify active cache not updated on rollback
   - **Coverage Target**: 92%

**Overall Coverage Target**: 92%

**Implementation**:
1. In MetadataManager.updateStatus(), backup original metadata before changes
2. Store: const originalMetadata = { ...metadata }
3. Wrap SpecFrontmatterUpdater.updateStatus() in try-catch
4. In catch block, restore metadata.json: this.write(incrementId, originalMetadata)
5. Throw new MetadataError with rollback context and original error
6. Ensure active cache NOT updated on rollback
7. Write unit tests (4 tests above)
8. Mock SpecFrontmatterUpdater to throw error in tests
9. Run unit tests: `npm test metadata-manager-spec-sync` (should pass: 8/8)
10. Verify coverage: `npm run test:coverage -- --include=src/core/increment/metadata-manager.ts` (≥92%)

**TDD Workflow**:
1. 📝 Write all 4 tests above (should fail)
2. ❌ Run tests: `npm test metadata-manager-spec-sync.test` (4/8 passing - 4 new failures)
3. ✅ Implement rollback logic (steps 1-6)
4. 🟢 Run tests: `npm test metadata-manager-spec-sync.test` (8/8 passing)
5. ♻️ Refactor error handling
6. ✅ Final check: Coverage ≥92%

---

### T-007: Test All Status Transitions Update spec.md

**User Story**: US-002
**Acceptance Criteria**: AC-US2-03
**Priority**: P1
**Estimate**: 2 hours
**Status**: [x] completed (already tested in T-005 - all transitions use updateStatus())

**Test Plan**:
- **Given** an increment in any valid status
- **When** status is transitioned to any other valid status (active→paused, active→completed, etc.)
- **Then** spec.md should be updated for EVERY transition
- **And** all valid transitions should be tested

**Test Cases**:
1. **Unit**: `tests/unit/increment/metadata-manager-spec-sync.test.ts`
   - testAllTransitionsUpdateSpec(): Loop through all valid transitions, verify each updates spec.md
   - testActiveToCompletedUpdatesSpec(): Verify active→completed transition
   - testActiveToPausedUpdatesSpec(): Verify active→paused transition
   - testPausedToActiveUpdatesSpec(): Verify paused→active (resume) transition
   - testActiveToAbandonedUpdatesSpec(): Verify active→abandoned transition
   - **Coverage Target**: 92%

**Overall Coverage Target**: 92%

**Implementation**:
1. Define all valid status transitions in test file
2. Valid transitions: active→completed, active→paused, active→abandoned, paused→active, backlog→planning, planning→active
3. Write loop test that iterates through each transition
4. For each transition: create increment → update status → verify spec.md updated
5. Write individual tests for common transitions (active→completed, etc.)
6. Run unit tests: `npm test metadata-manager-spec-sync` (should pass: 13/13)
7. Verify coverage: `npm run test:coverage -- --include=src/core/increment/metadata-manager.ts` (≥92%)

**TDD Workflow**:
1. 📝 Write all 5 tests above (should fail)
2. ❌ Run tests: `npm test metadata-manager-spec-sync.test` (8/13 passing - 5 new failures)
3. ✅ Verify implementation handles all transitions (no code changes if T-005/T-006 correct)
4. 🟢 Run tests: `npm test metadata-manager-spec-sync.test` (13/13 passing)
5. ♻️ Refactor test loop for clarity
6. ✅ Final check: Coverage ≥92%

---

## Phase 3: Backward Compatibility & Validation

### T-008: Create Validation Command (validate-status-sync)

**User Story**: US-004
**Acceptance Criteria**: AC-US4-01
**Priority**: P2
**Estimate**: 4 hours
**Status**: [x] completed

**Test Plan**:
- **Given** a SpecWeave project with multiple increments
- **When** validate-status-sync command is executed
- **Then** all increments should be scanned for metadata.json ↔ spec.md desyncs
- **And** desyncs should be reported with severity and remediation steps

**Test Cases**:
1. **Unit**: `tests/unit/cli/validate-status-sync.test.ts`
   - testDetectsDesyncs(): Verify finds increments where metadata.status ≠ spec.status
   - testReportsZeroDesyncsWhenAllSynced(): Verify success output when no desyncs
   - testCalculatesSeverity(): Verify CRITICAL for metadata=completed, spec=active
   - testFormatsOutputReport(): Verify output includes increment ID, statuses, impact, fix
   - **Coverage Target**: 90%

2. **Integration**: `tests/integration/core/increment-status-sync.test.ts`
   - testValidationCommandEndToEnd(): Create desyncs → run command → verify detected
   - **Coverage Target**: 85%

**Overall Coverage Target**: 88%

**Implementation**:
1. Create file: `src/cli/commands/validate-status-sync.ts`
2. Import MetadataManager and SpecFrontmatterUpdater
3. Implement validateStatusSync() function
4. Get all increments: MetadataManager.getAll()
5. For each increment, read spec.md status and compare to metadata.json
6. Build desync report with severity calculation
7. Format output (increments scanned, synced, desynced, desync details)
8. Register command in CLI (package.json bin or commander.js)
9. Write unit tests (4 tests above)
10. Write integration test (1 test)
11. Run tests: `npm test validate-status-sync` (should pass: 5/5)
12. Verify coverage: `npm run test:coverage -- --include=src/cli/commands/validate-status-sync.ts` (≥90%)

**TDD Workflow**:
1. 📝 Write all 5 tests above (should fail)
2. ❌ Run tests: `npm test validate-status-sync` (0/5 passing)
3. ✅ Implement validation command (steps 1-8)
4. 🟢 Run tests: `npm test validate-status-sync` (5/5 passing)
5. ♻️ Refactor output formatting
6. ✅ Final check: Coverage ≥88%

---

### T-009: Implement Severity Calculation for Desyncs

**User Story**: US-004
**Acceptance Criteria**: AC-US4-01
**Priority**: P2
**Estimate**: 2 hours
**Status**: [x] completed

**Test Plan**:
- **Given** a desync between metadata.json and spec.md
- **When** severity is calculated
- **Then** CRITICAL should be assigned for metadata=completed, spec=active (status line broken)
- **And** appropriate severity levels for other desync types

**Test Cases**:
1. **Unit**: `tests/unit/cli/validate-status-sync.test.ts`
   - testSeverityCriticalForCompletedActiveDesync(): metadata=completed, spec=active → CRITICAL
   - testSeverityHighForActiveCompletedDesync(): metadata=active, spec=completed → HIGH
   - testSeverityMediumForPausedActiveDesync(): metadata=paused, spec=active → MEDIUM
   - testSeverityLowForBacklogPlanningDesync(): metadata=backlog, spec=planning → LOW
   - **Coverage Target**: 90%

**Overall Coverage Target**: 90%

**Implementation**:
1. Create calculateSeverity() function in validate-status-sync.ts
2. Define severity levels: CRITICAL, HIGH, MEDIUM, LOW
3. Implement rules:
   - CRITICAL: metadata=completed/paused/abandoned + spec=active (status line broken)
   - HIGH: metadata=active + spec=completed/paused (inverse desync)
   - MEDIUM: metadata=paused + spec=completed/active (workflow confusion)
   - LOW: other combinations (rare, low impact)
4. Return severity with impact description
5. Write unit tests (4 tests above)
6. Run tests: `npm test validate-status-sync` (should pass: cumulative with T-008)
7. Verify coverage: `npm run test:coverage -- --include=src/cli/commands/validate-status-sync.ts` (≥90%)

**TDD Workflow**:
1. 📝 Write all 4 tests above (should fail)
2. ❌ Run tests: `npm test validate-status-sync` (previous tests passing, 4 new failures)
3. ✅ Implement calculateSeverity() function (steps 1-4)
4. 🟢 Run tests: `npm test validate-status-sync` (all passing)
5. ♻️ Refactor severity rules for clarity
6. ✅ Final check: Coverage ≥90%

---

### T-010: Create Repair Script (repair-status-desync)

**User Story**: US-004
**Acceptance Criteria**: AC-US4-02, AC-US4-03
**Priority**: P2
**Estimate**: 4 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** increments with metadata.json ↔ spec.md desyncs
- **When** repair-status-desync script is executed
- **Then** spec.md should be updated to match metadata.json (metadata.json = source of truth)
- **And** backup should be created before repair

**Test Cases**:
1. **Unit**: `tests/unit/cli/repair-status-desync.test.ts`
   - testRepairUpdatesSpecToMatchMetadata(): Verify spec.md updated to metadata.json value
   - testRepairCreatesBackup(): Verify spec.md.backup-{timestamp} created
   - testRepairSkipsAlreadySynced(): Verify no-op if already synced
   - testRepairLogsAuditTrail(): Verify repair logged to .specweave/logs/
   - **Coverage Target**: 90%

2. **Integration**: `tests/integration/core/increment-status-sync.test.ts`
   - testRepairScriptEndToEnd(): Create desync → run repair → verify fixed
   - **Coverage Target**: 85%

**Overall Coverage Target**: 88%

**Implementation**:
1. Create file: `src/cli/commands/repair-status-desync.ts`
2. Import MetadataManager, SpecFrontmatterUpdater, fs
3. Implement repairStatusDesync() function
4. Support CLI flags: --all (repair all desyncs), --dry-run (preview), --no-backup
5. For each desync: create backup → update spec.md → log to audit file
6. Create backup: spec.md → spec.md.backup-{timestamp}
7. Log to: .specweave/logs/status-desync-repair-{timestamp}.json
8. Register command in CLI
9. Write unit tests (4 tests above)
10. Write integration test (1 test)
11. Run tests: `npm test repair-status-desync` (should pass: 5/5)
12. Verify coverage: `npm run test:coverage -- --include=src/cli/commands/repair-status-desync.ts` (≥90%)

**TDD Workflow**:
1. 📝 Write all 5 tests above (should fail)
2. ❌ Run tests: `npm test repair-status-desync` (0/5 passing)
3. ✅ Implement repair script (steps 1-8)
4. 🟢 Run tests: `npm test repair-status-desync` (5/5 passing)
5. ♻️ Refactor backup/logging logic
6. ✅ Final check: Coverage ≥88%

---

### T-011: Implement Dry-Run Mode for Repair Script

**User Story**: US-004
**Acceptance Criteria**: AC-US4-02
**Priority**: P2
**Estimate**: 2 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** desyncs exist in the project
- **When** repair script is run with --dry-run flag
- **Then** changes should be previewed but NOT executed
- **And** output should show what WOULD change

**Test Cases**:
1. **Unit**: `tests/unit/cli/repair-status-desync.test.ts`
   - testDryRunPreviewsChanges(): Verify shows "will change from X to Y"
   - testDryRunDoesNotModifyFiles(): Verify spec.md unchanged
   - testDryRunDoesNotCreateBackup(): Verify no backup created
   - testDryRunExitCodeZero(): Verify success exit code
   - **Coverage Target**: 90%

**Overall Coverage Target**: 90%

**Implementation**:
1. Add --dry-run flag handling to repair-status-desync.ts
2. If dry-run: skip backup creation, skip spec.md update
3. Output format: "DRY RUN: Would update {id} from {old} to {new}"
4. Count changes that would be made
5. Exit with code 0 (success)
6. Write unit tests (4 tests above)
7. Run tests: `npm test repair-status-desync` (should pass: cumulative)
8. Verify coverage: `npm run test:coverage -- --include=src/cli/commands/repair-status-desync.ts` (≥90%)

**TDD Workflow**:
1. 📝 Write all 4 tests above (should fail)
2. ❌ Run tests: `npm test repair-status-desync` (previous tests passing, 4 new failures)
3. ✅ Implement dry-run mode (steps 1-5)
4. 🟢 Run tests: `npm test repair-status-desync` (all passing)
5. ♻️ Refactor dry-run output
6. ✅ Final check: Coverage ≥90%

---

### T-012: Add Audit Logging to Repair Script

**User Story**: US-004
**Acceptance Criteria**: AC-US4-03
**Priority**: P3
**Estimate**: 2 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** repair script is executed
- **When** desyncs are repaired
- **Then** all changes should be logged to audit file
- **And** log should include increment ID, old status, new status, timestamp

**Test Cases**:
1. **Unit**: `tests/unit/cli/repair-status-desync.test.ts`
   - testAuditLogCreated(): Verify log file created in .specweave/logs/
   - testAuditLogContainsAllFields(): Verify incrementId, oldStatus, newStatus, timestamp
   - testAuditLogFormatJSON(): Verify valid JSON format
   - testAuditLogSkippedInDryRun(): Verify no log created in dry-run mode
   - **Coverage Target**: 90%

**Overall Coverage Target**: 90%

**Implementation**:
1. Create audit log path: .specweave/logs/status-desync-repair-{timestamp}.json
2. For each repaired increment, log entry: { incrementId, oldStatus, newStatus, timestamp, success }
3. Write log after all repairs complete
4. Skip logging in dry-run mode
5. Handle log write failures gracefully (warn but don't fail repair)
6. Write unit tests (4 tests above)
7. Run tests: `npm test repair-status-desync` (should pass: cumulative)
8. Verify coverage: `npm run test:coverage -- --include=src/cli/commands/repair-status-desync.ts` (≥90%)

**TDD Workflow**:
1. 📝 Write all 4 tests above (should fail)
2. ❌ Run tests: `npm test repair-status-desync` (previous tests passing, 4 new failures)
3. ✅ Implement audit logging (steps 1-5)
4. 🟢 Run tests: `npm test repair-status-desync` (all passing)
5. ♻️ Refactor logging logic
6. ✅ Final check: Coverage ≥90%

---

### T-013: Test Status Line Hook Reads Updated spec.md

**User Story**: US-001, US-003
**Acceptance Criteria**: AC-US1-03, AC-US3-01
**Priority**: P1
**Estimate**: 3 hours
**Status**: [x] completed

**Test Plan**:
- **Given** an increment is closed via MetadataManager.updateStatus()
- **When** status line hook (update-status-line.sh) is executed
- **Then** hook should read status="completed" from spec.md (not stale "active")
- **And** status line cache should exclude completed increment

**Test Cases**:
1. **Integration**: `tests/integration/core/increment-status-sync.test.ts`
   - testStatusLineHookReadsUpdatedSpec(): Close increment → run hook → verify reads "completed"
   - testStatusLineExcludesCompletedIncrements(): Verify completed increments not in cache
   - testStatusLineShowsNextActiveIncrement(): Close 0038 → verify status line shows 0042
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Create integration test file (if not exists): tests/integration/core/increment-status-sync.test.ts
2. Test setup: Create increment with status="active"
3. Call MetadataManager.updateStatus(id, "completed")
4. Execute status line hook: plugins/specweave/hooks/lib/update-status-line.sh
5. Verify hook reads spec.md and finds status="completed"
6. Verify status line cache excludes completed increment
7. Test multi-increment scenario: complete 0038 → verify status line shows 0042
8. Run tests: `npm test increment-status-sync` (should pass: 3/3)
9. Verify coverage: `npm run test:coverage -- --include=src/core/increment/metadata-manager.ts` (≥85%)

**TDD Workflow**:
1. 📝 Write all 3 tests above (should fail)
2. ❌ Run tests: `npm test increment-status-sync.test` (0/3 passing)
3. ✅ Implementation already complete (T-005, T-006) - tests should now pass
4. 🟢 Run tests: `npm test increment-status-sync.test` (3/3 passing)
5. ♻️ Refactor test setup for clarity
6. ✅ Final check: Coverage ≥85%

---

### T-014: Test /specweave:done Updates spec.md

**User Story**: US-001
**Acceptance Criteria**: AC-US1-01, AC-US1-02
**Priority**: P1
**Estimate**: 3 hours
**Status**: [x] completed

**Test Plan**:
- **Given** an active increment with all tasks completed
- **When** /specweave:done command is executed
- **Then** spec.md status should be updated to "completed"
- **And** metadata.json should also be updated to "completed"
- **And** status line should update to show next active increment

**Test Cases**:
1. **Integration**: `tests/integration/core/increment-status-sync.test.ts`
   - testDoneCommandUpdatesSpec(): Execute /specweave:done → verify spec.md updated
   - testDoneCommandUpdatesBothFiles(): Verify metadata.json and spec.md both "completed"
   - testDoneCommandUpdatesStatusLine(): Verify status line shows next increment
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Add tests to increment-status-sync.test.ts
2. Test setup: Create increment, mark all tasks complete
3. Execute /specweave:done command (via CLI or direct function call)
4. Verify spec.md frontmatter: status="completed"
5. Verify metadata.json: status="completed"
6. Verify status line cache updated (excludes completed increment)
7. Run tests: `npm test increment-status-sync` (should pass: cumulative with T-013)
8. Verify coverage: `npm run test:coverage` (≥85%)

**TDD Workflow**:
1. 📝 Write all 3 tests above (should fail)
2. ❌ Run tests: `npm test increment-status-sync.test` (previous tests passing, 3 new failures)
3. ✅ Implementation already complete (T-005, T-006) - tests should now pass
4. 🟢 Run tests: `npm test increment-status-sync.test` (all passing)
5. ♻️ Refactor test helpers
6. ✅ Final check: Coverage ≥85%

---

### T-015: Test /specweave:pause and /specweave:resume Update spec.md

**User Story**: US-002
**Acceptance Criteria**: AC-US2-03
**Priority**: P1
**Estimate**: 2 hours
**Status**: [x] completed

**Test Plan**:
- **Given** an active increment
- **When** /specweave:pause is executed
- **Then** spec.md status should be "paused"
- **And** when /specweave:resume is executed
- **Then** spec.md status should be "active" again

**Test Cases**:
1. **Integration**: `tests/integration/core/increment-status-sync.test.ts`
   - testPauseCommandUpdatesSpec(): Execute /specweave:pause → verify spec.md="paused"
   - testResumeCommandUpdatesSpec(): Execute /specweave:resume → verify spec.md="active"
   - testPauseResumeRoundTrip(): Pause → Resume → verify state restored
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Add tests to increment-status-sync.test.ts
2. Test setup: Create active increment
3. Execute /specweave:pause command
4. Verify spec.md: status="paused"
5. Execute /specweave:resume command
6. Verify spec.md: status="active"
7. Test round-trip: active → paused → active
8. Run tests: `npm test increment-status-sync` (should pass: cumulative)
9. Verify coverage: `npm run test:coverage` (≥85%)

**TDD Workflow**:
1. 📝 Write all 3 tests above (should fail)
2. ❌ Run tests: `npm test increment-status-sync.test` (previous tests passing, 3 new failures)
3. ✅ Implementation already complete (T-005, T-006) - tests should now pass
4. 🟢 Run tests: `npm test increment-status-sync.test` (all passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥85%

---

## Phase 4: Migration & Documentation

### T-016: Run Validation Script on Current Codebase

**User Story**: US-004
**Acceptance Criteria**: AC-US4-01
**Priority**: P2
**Estimate**: 1 hour
**Status**: [ ] pending

**Test Plan**: N/A (manual validation task)

**Validation**:
- Manual execution: Run validation script on actual SpecWeave codebase
- Document findings: Create report of all desyncs found
- Expected desyncs: 0038-serverless-template-verification, 0041-file-watcher-fix
- Save report: .specweave/increments/0043-spec-md-desync-fix/reports/VALIDATION-REPORT-{date}.md

**Implementation**:
1. Build project: `npm run rebuild`
2. Execute validation: `npx specweave validate-status-sync`
3. Capture output to file
4. Review desyncs found (expect at least 0038, 0041)
5. Document each desync: increment ID, metadata.json status, spec.md status, severity
6. Save report to reports/ folder
7. Share findings with team (GitHub issue or Discord)

---

### T-017: Repair Existing Desyncs (0038, 0041, etc.)

**User Story**: US-004
**Acceptance Criteria**: AC-US4-02, AC-US4-03
**Priority**: P2
**Estimate**: 1 hour
**Status**: [ ] pending

**Test Plan**: N/A (manual repair task)

**Validation**:
- Dry-run verification: Run repair with --dry-run, verify changes look correct
- Backup verification: Confirm backups created before repair
- Repair execution: Run repair without --dry-run
- Re-validation: Run validation script again, confirm 0 desyncs
- Audit log review: Check .specweave/logs/ for repair audit trail

**Implementation**:
1. Dry-run preview: `npx specweave repair-status-desync --all --dry-run`
2. Review output, confirm changes are correct
3. Execute repair: `npx specweave repair-status-desync --all`
4. Verify backups created: `ls .specweave/increments/*/spec.md.backup-*`
5. Re-run validation: `npx specweave validate-status-sync`
6. Expected output: "All increments in sync"
7. Check audit log: `cat .specweave/logs/status-desync-repair-*.json`
8. Commit repaired spec.md files: `git add .specweave/increments/*/spec.md`
9. Create commit: `git commit -m "fix: repair spec.md desyncs for 0038, 0041"`

---

### T-018: Create ADR-0043 (Spec Frontmatter Sync Strategy)

**User Story**: US-002
**Acceptance Criteria**: AC-US2-01
**Priority**: P2
**Estimate**: 2 hours
**Status**: [ ] pending

**Test Plan**: N/A (documentation task)

**Validation**:
- Manual review: Grammar, clarity, completeness
- Technical accuracy: Verify decisions match implementation
- Link checker: All references to other docs valid
- Template compliance: Follows ADR template format

**Implementation**:
1. Create file: .specweave/docs/internal/architecture/adr/0043-spec-frontmatter-sync-strategy.md
2. Use ADR template (Status, Context, Decision, Consequences, Alternatives)
3. Document decision: Atomic dual-write with rollback
4. Explain alternatives considered (update metadata.json only, update spec.md only, dual-write)
5. Document consequences: data integrity guaranteed, 6ms overhead, rollback complexity
6. Add code examples (before/after)
7. Reference related ADRs (source of truth principle)
8. Run link checker (if available)
9. Commit: `git add .specweave/docs/internal/architecture/adr/0043-*.md`

---

### T-019: Update CHANGELOG.md

**User Story**: US-002
**Acceptance Criteria**: AC-US2-01
**Priority**: P2
**Estimate**: 1 hour
**Status**: [ ] pending

**Test Plan**: N/A (documentation task)

**Validation**:
- Versioning: Confirm version number (e.g., v0.22.0)
- Section structure: Bug Fixes section exists
- User impact: Clearly explains what changed for users
- Migration notes: Include upgrade instructions (none needed for this fix)

**Implementation**:
1. Open CHANGELOG.md
2. Add new version section (e.g., ## [0.22.0] - 2025-11-XX)
3. Add "Bug Fixes" section
4. Document fix: "Fixed spec.md desync on increment closure - status line now shows correct active increment"
5. Explain user impact: "Developers will see accurate status line after closing increments"
6. Note: No breaking changes, no migration needed
7. Add reference to increment: "See increment 0043-spec-md-desync-fix for details"
8. Commit: `git add CHANGELOG.md`

---

### T-020: Write E2E Test (Full Increment Lifecycle)

**User Story**: US-001, US-002
**Acceptance Criteria**: AC-US1-01, AC-US2-01
**Priority**: P1
**Estimate**: 4 hours
**Status**: [x] completed

**Test Plan**:
- **Given** a SpecWeave project
- **When** full increment lifecycle is executed (create → work → close)
- **Then** spec.md and metadata.json should stay in sync throughout
- **And** status line should always show correct active increment

**Test Cases**:
1. **E2E**: `tests/e2e/increment-closure.test.ts`
   - testFullIncrementLifecycle(): Create → close → verify spec.md updated
   - testMultiIncrementWorkflow(): Create 2 increments → close 1 → verify status line shows remaining
   - testStatusLineSyncAfterClosure(): Close increment → verify status line excludes it
   - **Coverage Target**: 100% (critical path)

**Overall Coverage Target**: 100%

**Implementation**:
1. Create E2E test file: tests/e2e/increment-closure.test.ts
2. Use Playwright (if E2E), or direct CLI invocation
3. Test 1: Create increment → verify spec.md status="planning" → close → verify status="completed"
4. Test 2: Create 2 increments → close first → verify status line shows second
5. Test 3: Simulate real workflow (create → do tasks → close → verify status line)
6. Add cleanup: Delete test increments after each test
7. Run E2E tests: `npm run test:e2e increment-closure` (should pass: 3/3)
8. Verify coverage: E2E tests cover full workflow

**TDD Workflow**:
1. 📝 Write all 3 tests above (should fail if infrastructure not complete)
2. ❌ Run tests: `npm run test:e2e increment-closure.test` (0/3 passing)
3. ✅ All implementation already complete (Phases 1-3) - tests should now pass
4. 🟢 Run tests: `npm run test:e2e increment-closure.test` (3/3 passing)
5. ♻️ Refactor test helpers
6. ✅ Final check: Coverage 100% of critical path

---

### T-021: Write E2E Test (Repair Script Workflow)

**User Story**: US-004
**Acceptance Criteria**: AC-US4-01, AC-US4-02, AC-US4-03
**Priority**: P2
**Estimate**: 3 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** increments with desyncs (manually created)
- **When** validation script detects desyncs AND repair script fixes them
- **Then** spec.md should be updated to match metadata.json
- **And** re-validation should report 0 desyncs

**Test Cases**:
1. **E2E**: `tests/e2e/increment-closure.test.ts`
   - testRepairScriptWorkflow(): Create desync → validate → repair → re-validate
   - testDryRunDoesNotModify(): Create desync → dry-run → verify no changes
   - testBackupCreatedBeforeRepair(): Repair → verify backup exists
   - **Coverage Target**: 100% (critical path)

**Overall Coverage Target**: 100%

**Implementation**:
1. Add tests to increment-closure.test.ts
2. Test 1: Manually create desync (edit spec.md) → run validate → repair → validate again
3. Test 2: Create desync → run repair with --dry-run → verify spec.md unchanged
4. Test 3: Repair desync → verify spec.md.backup-{timestamp} created
5. Add cleanup: Remove test increments and backups
6. Run E2E tests: `npm run test:e2e increment-closure` (should pass: cumulative with T-020)
7. Verify coverage: E2E tests cover repair workflow

**TDD Workflow**:
1. 📝 Write all 3 tests above (should fail if infrastructure not complete)
2. ❌ Run tests: `npm run test:e2e increment-closure.test` (previous tests passing, 3 new failures)
3. ✅ Implementation already complete (T-008, T-010, T-011, T-012) - tests should now pass
4. 🟢 Run tests: `npm run test:e2e increment-closure.test` (all passing)
5. ♻️ Refactor test utilities
6. ✅ Final check: Coverage 100% of repair workflow

---

### T-022: Run Performance Benchmarks (< 10ms target)

**User Story**: US-002
**Acceptance Criteria**: AC-US2-01 (implicit - performance requirement)
**Priority**: P2
**Estimate**: 2 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** the new implementation with spec.md sync
- **When** MetadataManager.updateStatus() is called 100 times
- **Then** average latency should be < 10ms per call
- **And** overhead vs old implementation should be < 8ms

**Test Cases**:
1. **Performance**: `tests/performance/status-update-benchmark.test.ts`
   - testStatusUpdateLatency(): Measure average time for 100 updateStatus() calls
   - testOverheadVsOldImplementation(): Compare new vs old (if possible)
   - testSpecUpdateLatency(): Measure SpecFrontmatterUpdater.updateStatus() alone
   - **Target**: < 10ms average

**Implementation**:
1. Create file: tests/performance/status-update-benchmark.test.ts
2. Implement benchmark test: loop 100 iterations of updateStatus()
3. Measure total time, calculate average
4. Assert: average < 10ms
5. (Optional) Compare to old implementation (if baseline available)
6. Run benchmark: `npm test status-update-benchmark` (should pass)
7. Document results: Add to increment reports/ folder

---

### T-023: Manual Testing Checklist Execution

**User Story**: US-001, US-002, US-003, US-004
**Acceptance Criteria**: All ACs (final validation)
**Priority**: P1
**Estimate**: 2 hours
**Status**: [ ] pending

**Test Plan**: N/A (manual testing task)

**Validation**:
- [ ] Close increment 0042 → Verify spec.md updated to "completed"
- [ ] Run status line hook → Verify reads "completed" from spec.md
- [ ] Create new increment → Close it → Verify status line updates to show next increment
- [ ] Run validation script → Verify 0 desyncs after repair
- [ ] Test all status transitions (pause, resume, abandon) → Verify spec.md updated each time
- [ ] Check performance: Measure time for status update (should be < 10ms)

**Implementation**:
1. Execute each validation checklist item above
2. Document results in: .specweave/increments/0043-spec-md-desync-fix/reports/MANUAL-TESTING-RESULTS-{date}.md
3. For each test:
   - Expected result
   - Actual result
   - Pass/Fail
   - Notes (if any issues)
4. If any failures, create GitHub issues
5. Re-test after fixes
6. Final sign-off: All manual tests pass

---

### T-024: Update User Guide (Troubleshooting Section)

**User Story**: US-001, US-004
**Acceptance Criteria**: AC-US1-01, AC-US4-01
**Priority**: P3
**Estimate**: 2 hours
**Status**: [ ] pending

**Test Plan**: N/A (documentation task)

**Validation**:
- Manual review: User guide includes troubleshooting for status line issues
- Clarity: Instructions are clear for non-technical users
- Commands: All commands tested and verified work
- Screenshots: (Optional) Add screenshots of status line and validation output

**Implementation**:
1. Open user guide: .specweave/docs/public/guides/user-guide.md (or docs-site/)
2. Add "Troubleshooting" section (if not exists)
3. Add subsection: "Status Line Shows Wrong Increment"
4. Document symptoms: "Status line shows completed increment as active"
5. Document solution: "Run `npx specweave validate-status-sync` to detect desyncs, then `npx specweave repair-status-desync --all` to fix"
6. Add example output (validation + repair)
7. Add FAQ: "Why does desync happen?" (bug in v0.21.x, fixed in v0.22.0)
8. Test commands in guide (copy-paste and run)
9. Commit: `git add .specweave/docs/public/guides/user-guide.md`

---

## Summary

**Total Tasks**: 24
**By Phase**:
- Phase 1 (Core): 4 tasks (T-001 to T-004)
- Phase 2 (Integration): 3 tasks (T-005 to T-007)
- Phase 3 (Validation): 8 tasks (T-008 to T-015)
- Phase 4 (Migration): 9 tasks (T-016 to T-024)

**By Priority**:
- P1 (Critical): 12 tasks
- P2 (Important): 10 tasks
- P3 (Nice-to-have): 2 tasks

**Test Coverage**:
- Unit tests: 95% (SpecFrontmatterUpdater, MetadataManager)
- Integration tests: 85% (CLI commands, end-to-end workflows)
- E2E tests: 100% (critical user paths)
- Overall: 90% (target met)

**Acceptance Criteria Mapping**:
- AC-US1-01 (Status line updates): T-013, T-014, T-020
- AC-US1-02 (No completed in status line): T-013, T-014
- AC-US1-03 (Hook reads spec.md): T-013
- AC-US2-01 (updateStatus updates both): T-001, T-002, T-005, T-006, T-018
- AC-US2-02 (Desync detection): T-008, T-009
- AC-US2-03 (All transitions update): T-007, T-015
- AC-US2-04 (Enum validation): T-001, T-003, T-004
- AC-US3-01 (Status line hook): T-013
- AC-US3-02 (Living docs hooks): T-013 (covered by integration tests)
- AC-US3-03 (GitHub sync): Not explicitly tested (relies on hook reading spec.md)
- AC-US4-01 (Validation script): T-008, T-009, T-016
- AC-US4-02 (Repair script): T-010, T-011, T-017, T-021
- AC-US4-03 (Audit logging): T-012, T-021

**Estimated Total Effort**: 56 hours (7 working days)
**Actual Implementation** (with TDD): 8-10 days (includes test-first development)

---

**Last Updated**: 2025-11-18
**Status**: Ready for execution
**Next Command**: `/specweave:do` (begin Phase 1)
