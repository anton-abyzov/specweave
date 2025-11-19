---
increment: 0045-living-docs-external-sync
title: 'Sync All Increments by Default'
priority: P1
status: planning
type: feature
created: 2025-11-19T00:00:00.000Z
test_mode: TDD
coverage_target: 90
parent_increment: 0043-spec-md-desync-fix
origin: scope_change_2025-11-19
---

# Sync All Increments by Default

## Overview

**Purpose**: Make `/specweave:sync-docs` sync ALL non-archived increments by default, improving developer experience and ensuring all increments are kept in sync with living docs.

**Scope**: Enhancement to existing sync-docs command to batch-process all increments instead of requiring manual per-increment syncing.

---

## Background

**Current Workflow** (Manual):
```bash
# Sync each increment individually
$ /specweave:sync-docs update 0040
✅ Synced 0040

$ /specweave:sync-docs update 0041
✅ Synced 0041

$ /specweave:sync-docs update 0042
✅ Synced 0042

# Or use --all flag (not exposed in command)
$ npx specweave sync-specs --all
```

**Desired Workflow** (Automatic):
```bash
# One command syncs everything!
$ /specweave:sync-docs
🔄 Syncing all increments...

📚 Syncing 0040-vitest-living-docs-mock-fixes → FS-040...
   ✅ Synced 3 tasks to US-001
✅ Synced 0040 → FS-040

📚 Syncing 0041-living-docs-test-fixes → FS-041...
   ✅ Synced 2 tasks to US-001
✅ Synced 0041 → FS-041

📚 Syncing 0042-test-infrastructure-cleanup → FS-042...
   ✅ Synced 5 tasks to US-002
✅ Synced 0042 → FS-042

✅ Sync complete: 15 increments synced, 0 failed
```

**Why This Matters**:
- **Developer Experience**: One command syncs all increments, no manual iteration needed
- **Living Docs Freshness**: All increments stay synchronized automatically
- **Reduced Errors**: Eliminates risk of forgetting to sync individual increments
- **Batch Processing**: More efficient than running sync commands individually

---

## User Story

### US-001: Sync All Increments by Default (Priority: P1)

**As a** developer working with SpecWeave
**I want** `/specweave:sync-docs` to sync all non-archived increments by default
**So that** I don't have to manually sync each increment and all living docs stay up to date

**Acceptance Criteria**:

- [ ] **AC-US1-01**: `/specweave:sync-docs` without arguments syncs all increments with spec.md
  - **Tests**: Integration test - create 3 increments → run command → verify all synced
  - **Priority**: P1

- [ ] **AC-US1-02**: Sync excludes `_archive` directory and other non-increment folders
  - **Tests**: Integration test - create `_archive` and `_backup` dirs → verify excluded
  - **Priority**: P1

- [ ] **AC-US1-03**: `/specweave:sync-docs <increment-id>` still syncs specific increment (backward compat)
  - **Tests**: Integration test - run with specific ID → verify only that increment synced
  - **Priority**: P1

- [ ] **AC-US1-04**: Command shows progress for each increment being synced
  - **Tests**: Integration test - verify console output shows progress for each increment
  - **Priority**: P2

- [ ] **AC-US1-05**: Command shows summary with success/failure counts
  - **Tests**: Integration test - verify summary shows "X synced, Y failed"
  - **Priority**: P2

- [ ] **AC-US1-06**: Failures in one increment don't stop sync of other increments
  - **Tests**: Integration test - create increment with invalid spec → verify others still sync
  - **Priority**: P1

- [ ] **AC-US1-07**: `--dry-run` flag works with sync-all mode
  - **Tests**: Integration test - run with --dry-run → verify no files created
  - **Priority**: P2

---

## Implementation Notes

**Two Implementation Options**:

### Option 1: Make "All" the Default (Recommended)

Update `sync-specs.ts` to default to `all: true` when no increment ID is provided:

```typescript
export async function syncSpecs(args: string[]): Promise<void> {
  const parsedArgs = parseArgs(args);
  const projectRoot = process.cwd();
  const sync = new LivingDocsSync(projectRoot);

  // NEW: Default to --all if no increment ID provided
  const shouldSyncAll = parsedArgs.all || !parsedArgs.incrementId;

  if (shouldSyncAll) {
    // Sync all increments
    console.log('🔄 Syncing all increments...\n');
    const increments = await findAllSyncableIncrements(projectRoot);
    // ... batch sync logic
  } else {
    // Sync specific increment
    // ... existing single sync logic
  }
}
```

### Option 2: Add Explicit --all Flag to Command

Update `specweave-sync-docs.md` to support passing `--all` flag:

```bash
$ /specweave:sync-docs --all   # Sync all increments
$ /specweave:sync-docs 0042    # Sync specific increment (existing behavior)
```

**Recommended: Option 1** - Better DX, one command does the right thing automatically.

**Increment Discovery Logic**:

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
      continue;
    }

    // Require spec.md to exist
    const specPath = path.join(incrementsDir, entry, 'spec.md');
    if (await fs.pathExists(specPath)) {
      syncable.push(entry);
    }
  }

  return syncable.sort();
}
```

**Key Differences from Current `findCompletedIncrements()`**:
- ✅ Syncs ALL increments with spec.md (not just completed)
- ✅ Excludes `_archive`, `_backup`, and other non-increment dirs (via regex)
- ✅ Sorts alphabetically for consistent ordering

---

## Technical Approach

### Phase 1: Update CLI Logic

**File**: `src/cli/commands/sync-specs.ts`

Changes:
1. Add `findAllSyncableIncrements()` function (similar to `findCompletedIncrements()` but without status filter)
2. Update `syncSpecs()` to default to "all" mode when no increment ID provided
3. Keep backward compatibility: specific increment ID still works
4. Add progress reporting for batch sync

### Phase 2: Update Command Documentation

**File**: `plugins/specweave/commands/specweave-sync-docs.md`

Changes:
1. Update "STEP 1: Parse Arguments" to mention new default behavior
2. Update examples to show sync-all as default
3. Document backward compatibility (specific ID still works)
4. Add troubleshooting section

### Phase 3: Update Tests

**New Tests** (`tests/integration/commands/sync-specs-all.test.ts`):
- Test sync-all with multiple increments
- Test exclusion of `_archive` directory
- Test sync-all with some invalid increments (should continue)
- Test backward compat (specific ID still works)
- Test dry-run mode with sync-all

### Phase 4: Documentation Updates

Update user-facing docs:
- Command reference: Document new default behavior
- Migration guide: Explain change from single → all
- Examples: Show common use cases

---

## Test Strategy

**Integration Tests** (`tests/integration/commands/sync-specs-all.test.ts`):
- Test sync-all with 3 increments → verify all synced
- Test exclusion of `_archive` directory → verify not synced
- Test sync-all with invalid spec.md → verify continues with others
- Test backward compat: specific ID → verify only that one synced
- Test dry-run mode → verify no files created
- Test progress output → verify shows each increment
- Test summary output → verify shows counts

**Unit Tests** (`tests/unit/cli/sync-specs-args.test.ts`):
- Test arg parsing with no args → defaults to all
- Test arg parsing with increment ID → single mode
- Test arg parsing with --all flag → all mode
- Test findAllSyncableIncrements() → returns correct list
- Test increment filtering → excludes non-matching dirs

**Coverage Target**: 90%+

---

## Success Criteria

**All 7 ACs must pass**

**Functional**:
- ✅ `/specweave:sync-docs` without args syncs all increments with spec.md
- ✅ Excludes `_archive` and other non-increment directories
- ✅ `/specweave:sync-docs <id>` still works (backward compat)
- ✅ Progress shown for each increment
- ✅ Summary shows success/failure counts
- ✅ Failures don't stop other increments from syncing

**Non-Functional**:
- Performance: Batch sync completes in reasonable time (< 5s for 50 increments)
- Reliability: 100% success rate for valid increments
- Maintainability: Clear, testable code

---

## Dependencies

**Required**:
- ✅ Living docs sync working (`LivingDocsSync` class) - Already implemented
- ✅ `sync-specs.ts` CLI command exists - Already implemented
- ✅ Command `specweave-sync-docs.md` exists - Already implemented

**No New Dependencies**: This is a pure enhancement to existing functionality

---

## Migration Notes

**Backward Compatibility**:
- ✅ `/specweave:sync-docs <increment-id>` still works exactly as before
- ✅ `--all` flag still works (becomes default when no ID)
- ✅ No breaking changes to API or command interface

**Behavior Change**:
- **Before**: `/specweave:sync-docs` → syncs latest completed increment
- **After**: `/specweave:sync-docs` → syncs all increments with spec.md
- **Rationale**: More useful default, reduces manual work

**Migration Guide**:
```bash
# Old way (still works):
/specweave:sync-docs update 0042

# New way (easier):
/specweave:sync-docs    # Syncs everything!
```

---

## Related Documentation

**Parent Increment**: `.specweave/increments/0043-spec-md-desync-fix/`
- Builds on the living docs sync infrastructure completed in 0043

**Command Reference**:
- `plugins/specweave/commands/specweave-sync-docs.md` - Command definition
- `.specweave/docs/public/guides/command-reference-by-priority.md` - User docs

**Architecture**:
- `src/cli/commands/sync-specs.ts` - CLI implementation
- `src/core/living-docs/living-docs-sync.ts` - Core sync logic

---

## Estimated Effort

**Total**: 1-2 days (8-16 hours)

**Breakdown**:
- CLI logic update: 3 hours
- Command docs update: 1 hour
- Integration tests: 3 hours
- User documentation: 1 hour
- Testing & validation: 2 hours

**Low effort because**:
- `--all` flag already exists in CLI
- Just changing default behavior
- No new classes or complex logic needed

---

**Status**: Planning
**Next Steps**: Create plan.md → Create tasks.md → Implement changes → Test → Complete
**Priority**: P1 (improves DX significantly)

---

**Created**: 2025-11-19
**Scope Change**: Original scope (external tool sync) was already implemented in 0043. Repurposed to focus on sync-all default behavior enhancement.
