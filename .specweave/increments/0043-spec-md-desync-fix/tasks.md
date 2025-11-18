---
increment: 0043-spec-md-desync-fix
total_tasks: 12
completed_tasks: 0
test_mode: TDD
coverage_target: 90%
---

# Implementation Tasks

## Phase 1: Core Implementation (SpecFrontmatterUpdater Class)

### T-001: Create SpecFrontmatterUpdater class with updateStatus() method

**User Story**: US-002
**Acceptance Criteria**: AC-US2-01, AC-US2-04
**Priority**: P1
**Estimate**: 4 hours
**Status**: [ ] pending

**Test Plan (Embedded)**:

**BDD Scenarios**:
- **Given** an increment with spec.md containing `status: active`
- **When** SpecFrontmatterUpdater.updateStatus(id, "completed") is called
- **Then** spec.md YAML frontmatter should be updated to `status: completed`
- **And** all other frontmatter fields should remain unchanged
- **And** the update should use atomic write (temp file → rename)

**Test Cases**:
1. **Unit Tests** (`tests/unit/increment/spec-frontmatter-updater.test.ts`):
   - ✓ updateStatus() updates status field in spec.md frontmatter
   - ✓ updateStatus() preserves all other frontmatter fields (title, priority, created, etc.)
   - ✓ updateStatus() handles missing status field gracefully (adds it)
   - ✓ updateStatus() uses atomic write (writes to .tmp, then renames)
   - ✓ updateStatus() validates status against IncrementStatus enum
   - ✓ updateStatus() throws SpecUpdateError if spec.md missing
   - ✓ updateStatus() throws SpecUpdateError if YAML parsing fails
   - ✓ updateStatus() preserves field order in frontmatter
   - **Coverage Target**: 95%

**Traceability**:
- AC-US2-01: Dual-file update (spec.md part) implemented
- AC-US2-04: Status field matches IncrementStatus enum values

**Files Created**:
- `src/core/increment/spec-frontmatter-updater.ts`
- `tests/unit/increment/spec-frontmatter-updater.test.ts`

**Implementation Steps**:
1. Create `src/core/increment/spec-frontmatter-updater.ts`
2. Import `gray-matter` for YAML frontmatter parsing
3. Define `SpecUpdateError` class extending Error
4. Implement `updateStatus(incrementId, status)` method:
   - Build path to spec.md: `.specweave/increments/{id}/spec.md`
   - Read spec.md content via fs-extra
   - Parse YAML frontmatter using gray-matter
   - Update `status` field with new value
   - Validate status against IncrementStatus enum
   - Stringify updated frontmatter + content
   - Write to temp file: `spec.md.tmp`
   - Rename temp file to `spec.md` (atomic)
5. Add comprehensive error handling (file not found, parse errors)
6. Write 8 unit tests (TDD: write tests first!)
7. Run tests: `npm run test:unit spec-frontmatter-updater` (should pass: 8/8)
8. Verify coverage: `npm run test:coverage` (should be ≥95%)

**TDD Workflow**:
1. 📝 Write all 8 tests above (should fail initially)
2. ❌ Run tests: `npm run test:unit spec-frontmatter-updater` (0/8 passing)
3. ✅ Implement updateStatus() method (steps 1-5 above)
4. 🟢 Run tests: `npm run test:unit spec-frontmatter-updater` (8/8 passing)
5. ♻️ Refactor if needed (maintain green tests)
6. ✅ Final check: Coverage ≥95%

---

### T-002: Add readStatus() and validate() helper methods to SpecFrontmatterUpdater

**User Story**: US-002
**Acceptance Criteria**: AC-US2-04
**Priority**: P1
**Estimate**: 2 hours
**Status**: [ ] pending

**Test Plan (Embedded)**:

**BDD Scenarios**:
- **Given** an increment with spec.md containing `status: active`
- **When** SpecFrontmatterUpdater.readStatus(id) is called
- **Then** it should return IncrementStatus.ACTIVE
- **And** if spec.md is missing, it should return null
- **And** if status field is invalid, validate() should throw error

**Test Cases**:
1. **Unit Tests** (`tests/unit/increment/spec-frontmatter-updater.test.ts`):
   - ✓ readStatus() reads status from spec.md frontmatter
   - ✓ readStatus() returns null if spec.md missing
   - ✓ readStatus() returns null if status field missing
   - ✓ validate() returns true for valid IncrementStatus enum value
   - ✓ validate() throws validation error for invalid status value
   - **Coverage Target**: 95%

**Traceability**:
- AC-US2-04: Status validation ensures enum correctness

**Files Modified**:
- `src/core/increment/spec-frontmatter-updater.ts` (add methods)
- `tests/unit/increment/spec-frontmatter-updater.test.ts` (add tests)

**Implementation Steps**:
1. Add `readStatus(incrementId): Promise<IncrementStatus | null>` method:
   - Read spec.md file
   - Parse frontmatter
   - Return status value (or null if missing)
2. Add `validate(incrementId): Promise<boolean>` method:
   - Call readStatus()
   - Check if status is valid IncrementStatus enum value
   - Throw error if invalid
3. Write 5 unit tests (TDD: write tests first!)
4. Run tests: `npm run test:unit spec-frontmatter-updater` (should pass: 13/13 total)
5. Verify coverage: `npm run test:coverage` (should be ≥95%)

**TDD Workflow**:
1. 📝 Write all 5 tests above (should fail)
2. ❌ Run tests: `npm run test:unit spec-frontmatter-updater` (0/5 passing new tests)
3. ✅ Implement readStatus() and validate() methods
4. 🟢 Run tests: `npm run test:unit spec-frontmatter-updater` (13/13 passing total)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥95%

---

## Phase 2: MetadataManager Enhancement (Atomic Dual-Write)

### T-003: Modify MetadataManager.updateStatus() to sync spec.md with rollback

**User Story**: US-002
**Acceptance Criteria**: AC-US2-01, AC-US2-02, AC-US2-03
**Priority**: P1
**Estimate**: 5 hours
**Status**: [ ] pending

**Test Plan (Embedded)**:

**BDD Scenarios**:
- **Given** an increment with metadata.json and spec.md both having `status: "active"`
- **When** MetadataManager.updateStatus(id, "completed") is called
- **Then** metadata.json should be updated to `status: "completed"`
- **And** spec.md frontmatter should be updated to `status: completed`
- **And** if spec.md update fails, metadata.json should be rolled back
- **And** active increment cache should be updated

**Test Cases**:
1. **Unit Tests** (`tests/unit/increment/metadata-manager-spec-sync.test.ts`):
   - ✓ updateStatus() updates both metadata.json and spec.md
   - ✓ updateStatus() rolls back metadata.json if spec.md update fails
   - ✓ All status transitions (active→completed, active→paused, etc.) update spec.md
   - ✓ updateStatus() preserves existing spec.md frontmatter fields
   - ✓ updateStatus() updates active increment cache after spec.md sync
   - ✓ updateStatus() throws MetadataError with rollback context on failure
   - **Coverage Target**: 95%

2. **Integration Tests** (`tests/integration/core/increment-status-sync.test.ts`):
   - ✓ End-to-end status update with real files
   - ✓ Rollback behavior with filesystem errors (simulate spec.md write failure)
   - ✓ Concurrent update handling (last-write-wins)
   - **Coverage Target**: 90%

**Traceability**:
- AC-US2-01: Dual-file update (metadata.json + spec.md) implemented
- AC-US2-02: Sync validation (rollback on failure) verified
- AC-US2-03: All status transitions update spec.md

**Files Modified**:
- `src/core/increment/metadata-manager.ts`

**Files Created**:
- `tests/unit/increment/metadata-manager-spec-sync.test.ts`
- `tests/integration/core/increment-status-sync.test.ts`

**Implementation Steps**:
1. Open `src/core/increment/metadata-manager.ts`
2. Locate `updateStatus()` method (lines 268-324)
3. Add backup of original metadata at start:
   ```typescript
   const originalMetadata = { ...metadata };
   ```
4. After `this.write(incrementId, metadata)` (metadata.json update), add:
   ```typescript
   try {
     await SpecFrontmatterUpdater.updateStatus(incrementId, newStatus);
   } catch (error) {
     // Rollback: Restore metadata.json
     this.write(incrementId, originalMetadata);
     throw new MetadataError(
       `Failed to update spec.md, rolled back metadata.json: ${error.message}`,
       incrementId,
       error
     );
   }
   ```
5. Import SpecFrontmatterUpdater at top of file
6. Change method signature to `static async updateStatus(...)`
7. Update all callers of updateStatus() to use await (grep for callers)
8. Write 6 unit tests (metadata-manager-spec-sync.test.ts) - TDD!
9. Write 3 integration tests (increment-status-sync.test.ts) - TDD!
10. Run unit tests: `npm run test:unit metadata-manager-spec-sync` (should pass: 6/6)
11. Run integration tests: `npm run test:integration increment-status-sync` (should pass: 3/3)
12. Verify coverage: `npm run test:coverage` (should be ≥95% for unit, ≥90% for integration)

**TDD Workflow**:
1. 📝 Write all 9 tests above (6 unit + 3 integration) - should fail
2. ❌ Run tests: `npm test` (0/9 passing)
3. ✅ Implement spec.md sync with rollback (steps 1-7)
4. 🟢 Run tests: `npm test` (9/9 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥90%

---

## Phase 3: Validation & Repair Tools

### T-004: Create validation command to detect spec.md/metadata.json desyncs

**User Story**: US-004
**Acceptance Criteria**: AC-US4-01
**Priority**: P2
**Estimate**: 3 hours
**Status**: [ ] pending

**Test Plan (Embedded)**:

**BDD Scenarios**:
- **Given** 50 increments with 2 desyncs (metadata.json ≠ spec.md)
- **When** validation command is executed
- **Then** it should scan all increments
- **And** it should detect and report 2 desyncs with severity levels
- **And** it should output a summary report

**Test Cases**:
1. **Unit Tests** (`tests/unit/increment/validate-status-sync.test.ts`):
   - ✓ detectDesyncs() scans all increments and finds mismatches
   - ✓ calculateSeverity() assigns correct severity (CRITICAL, HIGH, MEDIUM, LOW)
   - ✓ formatReport() generates human-readable output
   - ✓ Command exits with code 1 if desyncs found, 0 if all synced
   - **Coverage Target**: 92%

2. **Integration Tests** (`tests/integration/core/increment-status-sync.test.ts`):
   - ✓ Validation command detects manually created desyncs
   - ✓ Validation command reports correct count and details
   - **Coverage Target**: 88%

**Traceability**:
- AC-US4-01: Validation script scans and detects desyncs

**Files Created**:
- `src/cli/commands/validate-status-sync.ts`
- `tests/unit/increment/validate-status-sync.test.ts`

**Implementation Steps**:
1. Create `src/cli/commands/validate-status-sync.ts`
2. Implement `validateStatusSync()` function:
   - Get all increments via MetadataManager.getAll()
   - For each increment:
     - Read metadata.status
     - Read spec.md status via SpecFrontmatterUpdater.readStatus()
     - Compare values
     - If mismatch, add to desyncs array with severity
   - Return ValidationReport object
3. Implement `calculateSeverity()` helper:
   - CRITICAL: metadata="completed", spec="active"
   - HIGH: metadata="active", spec="completed"
   - MEDIUM: metadata="paused", spec="active"
   - LOW: other mismatches
4. Implement `formatReport()` to output human-readable summary
5. Add CLI command in package.json scripts
6. Write 4 unit tests - TDD!
7. Add 2 integration tests to existing file
8. Run tests: `npm run test:unit validate-status-sync` (should pass: 4/4)
9. Run integration tests: `npm run test:integration increment-status-sync` (should pass: 5/5 total)
10. Manual test: `npx specweave validate-status-sync` (should find 0038, 0041 desyncs)

**TDD Workflow**:
1. 📝 Write all 6 tests above (4 unit + 2 integration) - should fail
2. ❌ Run tests: `npm test` (0/6 passing)
3. ✅ Implement validation command (steps 1-5)
4. 🟢 Run tests: `npm test` (6/6 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥90%

---

### T-005: Create repair script to fix existing desyncs

**User Story**: US-004
**Acceptance Criteria**: AC-US4-02, AC-US4-03
**Priority**: P2
**Estimate**: 4 hours
**Status**: [ ] pending

**Test Plan (Embedded)**:

**BDD Scenarios**:
- **Given** an increment with desync (metadata.json="completed", spec.md="active")
- **When** repair script is executed for that increment
- **Then** spec.md should be updated to match metadata.json
- **And** a backup should be created before update
- **And** the change should be logged to audit log

**Test Cases**:
1. **Unit Tests** (`tests/unit/increment/repair-status-desync.test.ts`):
   - ✓ repairStatusDesync() updates spec.md to match metadata.json
   - ✓ repairStatusDesync() creates backup before repair
   - ✓ repairStatusDesync() writes to audit log
   - ✓ repairStatusDesync() supports dry-run mode (no actual changes)
   - ✓ repairStatusDesync() returns ALREADY_SYNCED if no desync
   - ✓ repairStatusDesync() supports --all flag to repair all desyncs
   - **Coverage Target**: 93%

2. **Integration Tests** (`tests/integration/core/increment-status-sync.test.ts`):
   - ✓ Repair script fixes manually created desync
   - ✓ Repair script creates backup file
   - ✓ Re-validation after repair shows 0 desyncs
   - **Coverage Target**: 88%

**Traceability**:
- AC-US4-02: Repair script updates spec.md to match metadata.json
- AC-US4-03: Repair script logs all changes

**Files Created**:
- `src/cli/commands/repair-status-desync.ts`
- `tests/unit/increment/repair-status-desync.test.ts`

**Implementation Steps**:
1. Create `src/cli/commands/repair-status-desync.ts`
2. Implement `repairStatusDesync(incrementId, options)` function:
   - Read metadata.status and spec.md status
   - If synced, return ALREADY_SYNCED
   - If desync detected:
     - Create backup: `spec.md.backup-{timestamp}`
     - If dry-run, return DRY_RUN with preview
     - Otherwise, call SpecFrontmatterUpdater.updateStatus()
     - Log to `.specweave/logs/status-desync-repair-{timestamp}.json`
     - Return REPAIRED with details
3. Implement `repairAllDesyncs()` helper using validation results
4. Add CLI argument parsing (commander or yargs):
   - `repair-status-desync <incrementId>` - Repair specific
   - `repair-status-desync --all` - Repair all
   - `repair-status-desync --dry-run` - Preview only
   - `repair-status-desync --no-backup` - Skip backup
5. Add to package.json scripts
6. Write 6 unit tests - TDD!
7. Add 3 integration tests to existing file
8. Run tests: `npm run test:unit repair-status-desync` (should pass: 6/6)
9. Run integration tests: `npm run test:integration increment-status-sync` (should pass: 8/8 total)
10. Manual test: `npx specweave repair-status-desync 0038 --dry-run`

**TDD Workflow**:
1. 📝 Write all 9 tests above (6 unit + 3 integration) - should fail
2. ❌ Run tests: `npm test` (0/9 passing)
3. ✅ Implement repair script (steps 1-5)
4. 🟢 Run tests: `npm test` (9/9 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥90%

---

## Phase 4: Integration with Commands & Hooks

### T-006: Verify /specweave:done command updates spec.md

**User Story**: US-001
**Acceptance Criteria**: AC-US1-01, AC-US1-02
**Priority**: P1
**Estimate**: 2 hours
**Status**: [ ] pending

**Test Plan (Embedded)**:

**BDD Scenarios**:
- **Given** an active increment 0042 with all tasks completed
- **When** /specweave:done 0042 is executed
- **Then** metadata.json should be updated to status="completed"
- **And** spec.md frontmatter should be updated to status: completed
- **And** active increment cache should be cleared
- **And** status line should NOT show 0042 as active

**Test Cases**:
1. **Integration Tests** (`tests/integration/core/increment-status-sync.test.ts`):
   - ✓ /specweave:done updates spec.md frontmatter
   - ✓ Status line excludes completed increment after /specweave:done
   - **Coverage Target**: 90%

2. **E2E Tests** (`tests/e2e/increment-closure.test.ts`):
   - ✓ Full workflow: create increment → complete tasks → /specweave:done → verify spec.md
   - ✓ Multiple increments: close 0038 → verify status line shows next active
   - **Coverage Target**: 100% (critical path)

**Traceability**:
- AC-US1-01: Status line updates to next active increment after closure
- AC-US1-02: Status line never shows completed increments

**Files Created**:
- `tests/e2e/increment-closure.test.ts`

**Implementation Steps**:
1. No code changes needed (MetadataManager enhancement in T-003 covers this)
2. Write 2 integration tests in existing file
3. Write 2 E2E tests (Playwright) - TDD!
4. Run integration tests: `npm run test:integration increment-status-sync` (should pass: 10/10 total)
5. Run E2E tests: `npm run test:e2e increment-closure` (should pass: 2/2)
6. Manual test: Create test increment → /specweave:done → verify spec.md updated

**TDD Workflow**:
1. 📝 Write all 4 tests above (2 integration + 2 E2E) - should fail
2. ❌ Run tests: `npm test` (0/4 passing new tests)
3. ✅ No implementation needed (already done in T-003)
4. 🟢 Run tests: `npm test` (4/4 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage 100% for E2E

---

### T-007: Verify /specweave:pause and /specweave:resume update spec.md

**User Story**: US-002
**Acceptance Criteria**: AC-US2-03
**Priority**: P1
**Estimate**: 2 hours
**Status**: [ ] pending

**Test Plan (Embedded)**:

**BDD Scenarios**:
- **Given** an active increment 0042
- **When** /specweave:pause 0042 is executed
- **Then** spec.md frontmatter should be updated to status: paused
- **And** when /specweave:resume 0042 is executed
- **Then** spec.md frontmatter should be updated to status: active

**Test Cases**:
1. **Integration Tests** (`tests/integration/core/increment-status-sync.test.ts`):
   - ✓ /specweave:pause updates spec.md to status: paused
   - ✓ /specweave:resume updates spec.md to status: active
   - ✓ /specweave:abandon updates spec.md to status: abandoned
   - **Coverage Target**: 90%

**Traceability**:
- AC-US2-03: All status transitions update spec.md

**Implementation Steps**:
1. No code changes needed (MetadataManager enhancement covers all transitions)
2. Write 3 integration tests
3. Run tests: `npm run test:integration increment-status-sync` (should pass: 13/13 total)
4. Manual test: /specweave:pause 0042 → verify spec.md updated
5. Manual test: /specweave:resume 0042 → verify spec.md updated

**TDD Workflow**:
1. 📝 Write all 3 tests above - should fail
2. ❌ Run tests: `npm run test:integration` (0/3 passing new tests)
3. ✅ No implementation needed (already done in T-003)
4. 🟢 Run tests: `npm run test:integration` (3/3 passing)
5. ✅ Final check: Coverage ≥90%

---

### T-008: Verify status line hook reads updated spec.md correctly

**User Story**: US-003
**Acceptance Criteria**: AC-US3-01
**Priority**: P1
**Estimate**: 2 hours
**Status**: [ ] pending

**Test Plan (Embedded)**:

**BDD Scenarios**:
- **Given** increment 0038 with spec.md status: completed
- **When** status line hook (update-status-line.sh) executes
- **Then** it should read status="completed" from spec.md
- **And** it should exclude 0038 from active increments list
- **And** status line should show next active increment (0042)

**Test Cases**:
1. **Integration Tests** (`tests/integration/core/increment-status-sync.test.ts`):
   - ✓ Status line hook reads spec.md and finds correct status
   - ✓ Status line hook excludes completed increments
   - ✓ Status line hook includes only active/in-progress increments
   - **Coverage Target**: 88%

**Traceability**:
- AC-US3-01: Status line hook reads correct status from spec.md

**Files Modified**: None (hook already reads spec.md)

**Implementation Steps**:
1. No code changes needed (hook already correct)
2. Write 3 integration tests to verify hook behavior
3. Run tests: `npm run test:integration increment-status-sync` (should pass: 16/16 total)
4. Manual test: Run hook directly → verify reads spec.md:
   ```bash
   bash plugins/specweave/hooks/lib/update-status-line.sh
   cat .specweave/state/status-line.json
   ```

**TDD Workflow**:
1. 📝 Write all 3 tests above - should fail
2. ❌ Run tests: `npm run test:integration` (0/3 passing new tests)
3. ✅ No implementation needed (hook already correct)
4. 🟢 Run tests: `npm run test:integration` (3/3 passing)
5. ✅ Final check: Coverage ≥88%

---

### T-009: Verify living docs sync hooks read updated spec.md

**User Story**: US-003
**Acceptance Criteria**: AC-US3-02, AC-US3-03
**Priority**: P2
**Estimate**: 2 hours
**Status**: [ ] pending

**Test Plan (Embedded)**:

**BDD Scenarios**:
- **Given** increment 0042 completed with spec.md status: completed
- **When** living docs sync hooks execute
- **Then** they should read status="completed" from spec.md
- **And** GitHub sync should close associated issue
- **And** JIRA/ADO sync should transition ticket to done

**Test Cases**:
1. **Integration Tests** (`tests/integration/external-tools/github-sync.test.ts`):
   - ✓ GitHub sync reads completed status from spec.md and closes issue
   - ✓ JIRA sync reads completed status from spec.md and transitions ticket
   - **Coverage Target**: 85%

**Traceability**:
- AC-US3-02: Living docs sync hooks read spec.md frontmatter
- AC-US3-03: GitHub sync closes issue when spec.md shows completed

**Files Modified**: None (hooks already read spec.md)

**Implementation Steps**:
1. No code changes needed (hooks already correct)
2. Write 2 integration tests in external-tools suite
3. Run tests: `npm run test:integration github-sync` (should pass: 2/2)
4. Manual test: Mock GitHub sync → verify reads spec.md

**TDD Workflow**:
1. 📝 Write all 2 tests above - should fail
2. ❌ Run tests: `npm run test:integration` (0/2 passing new tests)
3. ✅ No implementation needed (hooks already correct)
4. 🟢 Run tests: `npm run test:integration` (2/2 passing)
5. ✅ Final check: Coverage ≥85%

---

## Phase 5: Pre-Deployment & Documentation

### T-010: Run validation script on current codebase and repair desyncs

**User Story**: US-004
**Acceptance Criteria**: AC-US4-01, AC-US4-02, AC-US4-03
**Priority**: P1
**Estimate**: 1 hour
**Status**: [ ] pending

**Test Plan**: Manual validation (non-automated task)

**Validation**:
- Manual run: `npx specweave validate-status-sync` → verify finds 0038, 0041
- Manual run: `npx specweave repair-status-desync --all --dry-run` → verify shows correct changes
- Manual run: `npx specweave repair-status-desync --all` → verify repairs applied
- Manual run: `npx specweave validate-status-sync` → verify 0 desyncs
- Check audit log: `.specweave/logs/status-desync-repair-*.json` exists and contains repairs
- Check backups: `0038/spec.md.backup-*` and `0041/spec.md.backup-*` exist

**Traceability**:
- AC-US4-01: Validation finds existing desyncs
- AC-US4-02: Repair fixes desyncs
- AC-US4-03: Audit log created

**Implementation Steps**:
1. Run validation: `npx specweave validate-status-sync`
2. Review detected desyncs (expect 0038, 0041)
3. Run repair dry-run: `npx specweave repair-status-desync --all --dry-run`
4. Review changes (verify metadata.json values will be copied to spec.md)
5. Run repair: `npx specweave repair-status-desync --all`
6. Verify backups created: `ls .specweave/increments/*/spec.md.backup-*`
7. Verify audit log: `cat .specweave/logs/status-desync-repair-*.json`
8. Re-run validation: `npx specweave validate-status-sync` (expect 0 desyncs)
9. Commit repaired spec.md files

---

### T-011: Write ADR-0043 (Spec Frontmatter Sync Strategy)

**User Story**: US-002
**Acceptance Criteria**: AC-US2-01 (documentation)
**Priority**: P2
**Estimate**: 1 hour
**Status**: [ ] pending

**Test Plan**: N/A (documentation task)

**Validation**:
- Manual review: Grammar, clarity, completeness
- Covers all key decisions (atomic dual-write, rollback, source of truth)
- Includes rationale and consequences for each decision
- References spec.md and plan.md

**Traceability**:
- Documents architectural decisions made in this increment

**Implementation Steps**:
1. Create `.specweave/docs/internal/architecture/adr/0043-spec-frontmatter-sync-strategy.md`
2. Document Decision 1: Atomic dual-write strategy
3. Document Decision 2: Rollback on failure
4. Document Decision 3: metadata.json as source for repair
5. Document Decision 4: Separate SpecFrontmatterUpdater class
6. Document Decision 5: Use gray-matter library
7. Add rationale and consequences for each
8. Review for clarity and completeness

---

### T-012: Update CHANGELOG.md and create migration guide

**User Story**: US-002
**Acceptance Criteria**: AC-US2-01 (documentation)
**Priority**: P2
**Estimate**: 1 hour
**Status**: [ ] pending

**Test Plan**: N/A (documentation task)

**Validation**:
- CHANGELOG.md updated with bug fix entry
- Migration guide explains validation and repair process
- No breaking changes documented (backward compatible)

**Traceability**:
- User-facing documentation for this bug fix

**Implementation Steps**:
1. Update `CHANGELOG.md`:
   - Add entry under "Bug Fixes" section
   - Describe issue: "Fixed spec.md desync on increment closure"
   - Mention validation and repair tools
   - Note: No breaking changes
2. Create `.specweave/increments/0043-spec-md-desync-fix/reports/MIGRATION-GUIDE.md`:
   - Pre-deployment: Run validation and repair
   - Post-deployment: Monitoring and verification
   - Rollback instructions if needed
3. Review for clarity

---

## Test Coverage Summary

### Overall Coverage Target: 90%+

**Critical Paths** (95%+ coverage):
- SpecFrontmatterUpdater class (T-001, T-002)
- MetadataManager.updateStatus() enhancement (T-003)

**Core Functionality** (90%+ coverage):
- Validation command (T-004)
- Repair script (T-005)
- Status transitions (T-006, T-007)

**Integration Flows** (85%+ coverage):
- Status line hook integration (T-008)
- Living docs sync integration (T-009)

### Test Breakdown

| Test Level | File | Tests | Coverage Target |
|------------|------|-------|-----------------|
| **Unit** | spec-frontmatter-updater.test.ts | 13 | 95% |
| **Unit** | metadata-manager-spec-sync.test.ts | 6 | 95% |
| **Unit** | validate-status-sync.test.ts | 4 | 92% |
| **Unit** | repair-status-desync.test.ts | 6 | 93% |
| **Integration** | increment-status-sync.test.ts | 16 | 88% |
| **Integration** | github-sync.test.ts | 2 | 85% |
| **E2E** | increment-closure.test.ts | 2 | 100% |
| **Total** | | **49 tests** | **90%+** |

### AC-ID Coverage Matrix

| AC-ID | Description | Covered By Tasks |
|-------|-------------|------------------|
| AC-US1-01 | Status line updates to next active | T-006 |
| AC-US1-02 | Status line never shows completed | T-006 |
| AC-US1-03 | Status line hook reads correct status | T-008 |
| AC-US2-01 | Dual-file update implemented | T-001, T-003 |
| AC-US2-02 | Sync validation (rollback) | T-003 |
| AC-US2-03 | All transitions update spec.md | T-003, T-007 |
| AC-US2-04 | Status matches enum values | T-001, T-002 |
| AC-US3-01 | Status line hook reads spec.md | T-008 |
| AC-US3-02 | Living docs hooks read spec.md | T-009 |
| AC-US3-03 | GitHub sync closes issue | T-009 |
| AC-US4-01 | Validation finds desyncs | T-004, T-010 |
| AC-US4-02 | Repair fixes desyncs | T-005, T-010 |
| AC-US4-03 | Repair logs changes | T-005, T-010 |

**All 13 AC-IDs covered** ✅

---

## Completion Criteria

**Code Complete**:
- [ ] All 12 tasks completed
- [ ] All 49 tests passing
- [ ] Coverage ≥90% overall
- [ ] No regression in existing tests

**Quality Gates**:
- [ ] All AC-IDs verified
- [ ] Performance: status update < 10ms
- [ ] Manual testing complete
- [ ] Existing desyncs repaired (0038, 0041)

**Documentation Complete**:
- [ ] ADR-0043 written
- [ ] CHANGELOG.md updated
- [ ] Migration guide created
- [ ] Code comments added

**Deployment Ready**:
- [ ] Pre-deployment backup created
- [ ] Rollback plan documented
- [ ] CI validation job configured
- [ ] Team notified of changes

---

**Last Updated**: 2025-11-18
**Status**: Planning Complete (ready for /specweave:do)
**Estimated Total Effort**: 29 hours (~4 days)
