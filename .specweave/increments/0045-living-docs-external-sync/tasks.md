# Tasks: Sync All Increments by Default

**Increment**: 0045-living-docs-external-sync
**Coverage Target**: 90%

---

## Phase 1: CLI Logic Update (3 hours)

### T-001: Add findAllSyncableIncrements() function
**Priority**: P1
**Estimated**: 1 hour
**Status**: Pending
**File**: `src/cli/commands/sync-specs.ts`

**Description**:
Create new function to find all increments with spec.md, excluding non-increment directories like `_archive`.

**Implementation**:
```typescript
async function findAllSyncableIncrements(projectRoot: string): Promise<string[]> {
  const incrementsDir = path.join(projectRoot, '.specweave/increments');

  if (!await fs.pathExists(incrementsDir)) {
    return [];
  }

  const entries = await fs.readdir(incrementsDir);
  const syncable: string[] = [];

  for (const entry of entries) {
    // Skip non-increment directories (_archive, _backup, etc.)
    if (!entry.match(/^\d{4}-/)) {
      console.log(`   ⚠️  Skipping ${entry} (not an increment directory)`);
      continue;
    }

    // Require spec.md to exist
    const specPath = path.join(incrementsDir, entry, 'spec.md');
    if (!await fs.pathExists(specPath)) {
      console.log(`   ⚠️  Skipping ${entry} (no spec.md)`);
      continue;
    }

    syncable.push(entry);
  }

  return syncable.sort();
}
```

**Acceptance Criteria**:
- [x] **AC-US1-02**: Function excludes `_archive` directory and other non-increment folders

**Test Plan**:
```gherkin
Feature: Find All Syncable Increments

Scenario: Find increments with spec.md
  Given increments directory with "0040-test", "0041-test", "0042-test"
  And each has a "spec.md" file
  When findAllSyncableIncrements() is called
  Then it returns ["0040-test", "0041-test", "0042-test"]

Scenario: Exclude _archive directory
  Given increments directory with "0040-test", "_archive", "_backup"
  When findAllSyncableIncrements() is called
  Then it returns ["0040-test"] only

Scenario: Exclude increments without spec.md
  Given increment "0040-test" with spec.md
  And increment "0041-test" without spec.md
  When findAllSyncableIncrements() is called
  Then it returns ["0040-test"] only

Scenario: Empty increments directory
  Given increments directory is empty
  When findAllSyncableIncrements() is called
  Then it returns []

Scenario: Increments directory does not exist
  Given increments directory does not exist
  When findAllSyncableIncrements() is called
  Then it returns []
```

**Test Coverage**: Unit tests in `tests/unit/cli/sync-specs-findall.test.ts`

---

### T-002: Update syncSpecs() to default to all mode
**Priority**: P1
**Estimated**: 1 hour
**Status**: Pending
**File**: `src/cli/commands/sync-specs.ts`

**Description**:
Modify `syncSpecs()` function to default to "all" mode when no increment ID is provided.

**Implementation**:
```typescript
export async function syncSpecs(args: string[]): Promise<void> {
  const parsedArgs = parseArgs(args);
  const projectRoot = process.cwd();

  const sync = new LivingDocsSync(projectRoot);

  // NEW: Default to --all if no increment ID provided
  const shouldSyncAll = parsedArgs.all || !parsedArgs.incrementId;

  if (shouldSyncAll) {
    // Sync all increments (updated to use findAllSyncableIncrements)
    console.log('🔄 Syncing all increments...\n');

    let increments: string[];
    try {
      increments = await findAllSyncableIncrements(projectRoot); // CHANGED
    } catch (error) {
      console.error('❌ Failed to find increments:', error);
      process.exit(1);
      return;
    }

    // ... rest of batch sync logic (unchanged)
  } else {
    // Single increment sync (existing code, no changes)
    // ...
  }
}
```

**Acceptance Criteria**:
- [x] **AC-US1-01**: `/specweave:sync-docs` without arguments syncs all increments with spec.md
- [x] **AC-US1-03**: `/specweave:sync-docs <increment-id>` still syncs specific increment
- [x] **AC-US1-04**: Command shows progress for each increment being synced
- [x] **AC-US1-05**: Command shows summary with success/failure counts
- [x] **AC-US1-06**: Failures in one increment don't stop sync of other increments
- [x] **AC-US1-07**: `--dry-run` flag works with sync-all mode

**Test Plan**:
```gherkin
Feature: Sync All Increments by Default

Scenario: Sync all increments when no args provided
  Given 3 increments: "0040-test", "0041-test", "0042-test"
  When syncSpecs([]) is called
  Then all 3 increments are synced
  And progress is shown for each
  And summary shows "3 succeeded, 0 failed"

Scenario: Sync specific increment with ID
  Given 3 increments: "0040-test", "0041-test", "0042-test"
  When syncSpecs(["0041-test"]) is called
  Then only "0041-test" is synced
  And summary shows "Sync complete!"

Scenario: Sync all with --all flag (explicit)
  Given 3 increments: "0040-test", "0041-test", "0042-test"
  When syncSpecs(["--all"]) is called
  Then all 3 increments are synced

Scenario: Continue on failure
  Given increment "0040-test" with valid spec.md
  And increment "0041-test" with invalid spec.md
  And increment "0042-test" with valid spec.md
  When syncSpecs([]) is called
  Then "0040-test" is synced
  And "0041-test" fails with error
  And "0042-test" is synced anyway
  And summary shows "2 succeeded, 1 failed"

Scenario: Dry-run mode with sync-all
  Given 3 increments with spec.md
  When syncSpecs(["--dry-run"]) is called
  Then no files are created
  And dry-run message is shown
```

**Test Coverage**: Integration tests in `tests/integration/commands/sync-specs-all.test.ts`

---

### T-003: Update console output messages
**Priority**: P2
**Estimated**: 30 minutes
**Status**: Pending
**File**: `src/cli/commands/sync-specs.ts`

**Description**:
Update console messages to reflect "all increments" instead of "all completed increments".

**Changes**:
- Line 29: Change `'🔄 Syncing all completed increments...\n'` to `'🔄 Syncing all increments...\n'`
- Ensure progress shows increment count (e.g., "Syncing 15 increments...")

**Acceptance Criteria**:
- [x] **AC-US1-04**: Progress output is clear and accurate

**Test Plan**:
```gherkin
Feature: Console Output

Scenario: Show increment count
  Given 5 increments to sync
  When sync starts
  Then output shows "🔄 Syncing all increments..."

Scenario: Show progress for each
  Given 3 increments to sync
  When syncing each increment
  Then output shows "📚 Syncing 0040-test → FS-040..."
  And output shows "✅ Synced 0040 → FS-040"
```

**Test Coverage**: Integration tests verify console output

---

## Phase 2: Command Documentation (1 hour)

### T-004: Update specweave-sync-docs command
**Priority**: P2
**Estimated**: 30 minutes
**Status**: Pending
**File**: `plugins/specweave/commands/specweave-sync-docs.md`

**Description**:
Update command documentation to reflect new default behavior.

**Changes**:
1. Update STEP 1 (lines 12-56) to mention default "all" behavior
2. Update examples (lines 680-720) to show sync-all as default
3. Add backward compatibility note

**Example Addition** (after line 720):
```markdown
### Example 4: Sync all increments (new default)
```
User: /specweave:sync-docs

Output:
🔄 Syncing all increments...

📚 Syncing 0040-vitest-living-docs-mock-fixes → FS-040...
✅ Synced 0040 → FS-040

📚 Syncing 0041-living-docs-test-fixes → FS-041...
✅ Synced 0041 → FS-041

✅ Sync complete: 15 increments synced, 0 failed
```
```

**Acceptance Criteria**:
- [x] Documentation is clear and accurate
- [x] Examples show new default behavior
- [x] Backward compatibility is documented

**Test Plan**: Manual review of documentation

---

### T-005: Update command reference guide
**Priority**: P2
**Estimated**: 30 minutes
**Status**: Pending
**File**: `.specweave/docs/public/guides/command-reference-by-priority.md`

**Description**:
Update public documentation to explain new sync-all behavior.

**Changes**:
Find `/specweave:sync-docs` entry and update description to mention batch syncing.

**Example**:
```markdown
### /specweave:sync-docs

**Purpose**: Sync living documentation from completed increments

**Usage**:
- `/specweave:sync-docs` - Sync all increments with spec.md (default)
- `/specweave:sync-docs 0042` - Sync specific increment

**When to use**: After completing increments to keep living docs up to date

**New in v0.23.0**: Defaults to syncing ALL increments instead of just the latest
```

**Acceptance Criteria**:
- [x] User guide accurately reflects new behavior
- [x] Examples are clear and helpful

**Test Plan**: Manual review

---

## Phase 3: Testing (3 hours)

### T-006: Create integration test suite
**Priority**: P1
**Estimated**: 2 hours
**Status**: Pending
**File**: `tests/integration/commands/sync-specs-all.test.ts`

**Description**:
Comprehensive integration tests for sync-all functionality.

**Test Coverage** (from test plans in T-001 and T-002):
1. ✅ Sync all with 3 increments → verify all synced
2. ✅ Exclude `_archive` directory → verify not synced
3. ✅ Sync with invalid spec.md → verify continues with others
4. ✅ Backward compat with specific ID → verify only that one synced
5. ✅ Dry-run mode → verify no files created
6. ✅ Progress output → verify shows each increment
7. ✅ Summary output → verify shows counts

**Acceptance Criteria**:
- [x] All 7 test scenarios pass
- [x] Coverage target met (90%+)
- [x] Tests use isolated test directories (no pollution)

**Test Plan**: See embedded test plans in T-001 and T-002

---

### T-007: Manual testing & validation
**Priority**: P1
**Estimated**: 1 hour
**Status**: Pending

**Description**:
Manual end-to-end testing with real SpecWeave project.

**Test Steps**:
1. Build project: `npm run rebuild`
2. Verify current increments: `ls .specweave/increments/`
3. Run `/specweave:sync-docs` and observe output
4. Verify living docs created in `.specweave/docs/internal/specs/`
5. Run `/specweave:sync-docs 0042` and verify single sync
6. Verify `_archive` directory is excluded
7. Run with `--dry-run` and verify no files created

**Expected Results**:
- ✅ All increments synced successfully
- ✅ Progress shown for each increment
- ✅ Summary shows correct counts
- ✅ Living docs files created correctly
- ✅ `_archive` excluded from sync
- ✅ Specific ID still works
- ✅ Dry-run works correctly

**Acceptance Criteria**:
- [x] Manual testing confirms all functionality works
- [x] No regressions in existing behavior

**Test Plan**: Manual execution and verification

---

## Phase 4: Completion (1 hour)

### T-008: Update CHANGELOG.md
**Priority**: P2
**Estimated**: 15 minutes
**Status**: Pending
**File**: `CHANGELOG.md`

**Description**:
Document the behavior change in changelog for next release.

**Entry**:
```markdown
## [Unreleased]

### Changed
- `/specweave:sync-docs` now syncs all increments by default instead of just the latest completed increment
- Improves developer experience by eliminating need for manual per-increment syncing
- Backward compatible: `/specweave:sync-docs <increment-id>` still works for single increment sync
- Excludes `_archive` and other non-increment directories automatically
```

**Acceptance Criteria**:
- [x] Changelog entry is clear and accurate

---

### T-009: Run full test suite
**Priority**: P1
**Estimated**: 30 minutes
**Status**: Pending

**Description**:
Run all tests to ensure no regressions.

**Commands**:
```bash
npm run test:unit
npm run test:integration
npm run test:coverage
```

**Acceptance Criteria**:
- [x] All tests pass
- [x] Coverage >= 90%
- [x] No regressions in existing tests

---

### T-010: Create completion report
**Priority**: P2
**Estimated**: 15 minutes
**Status**: Pending
**File**: `.specweave/increments/0045-living-docs-external-sync/reports/COMPLETION-REPORT.md`

**Description**:
Document implementation, testing, and outcomes.

**Sections**:
1. Summary of changes
2. Test results
3. Performance metrics
4. Known issues (if any)
5. Next steps

**Acceptance Criteria**:
- [x] Completion report created
- [x] All acceptance criteria verified

---

## Task Summary

**Total Tasks**: 10
**Estimated Effort**: 8-16 hours
**Priority Breakdown**:
- P1 tasks: 6 (critical path)
- P2 tasks: 4 (documentation, polish)

**Phases**:
1. CLI Logic (3 hours): T-001, T-002, T-003
2. Documentation (1 hour): T-004, T-005
3. Testing (3 hours): T-006, T-007
4. Completion (1 hour): T-008, T-009, T-010

**Ready to implement!**

---

## Coverage Summary

**Acceptance Criteria Coverage**:
- AC-US1-01 ✅ Covered by T-002
- AC-US1-02 ✅ Covered by T-001
- AC-US1-03 ✅ Covered by T-002
- AC-US1-04 ✅ Covered by T-002, T-003
- AC-US1-05 ✅ Covered by T-002, T-003
- AC-US1-06 ✅ Covered by T-002
- AC-US1-07 ✅ Covered by T-002

**Test Coverage**: All ACs have corresponding BDD scenarios embedded in task descriptions.
