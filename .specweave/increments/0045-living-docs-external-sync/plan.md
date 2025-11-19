# Implementation Plan: Sync All Increments by Default

**Increment**: 0045-living-docs-external-sync
**Title**: Sync All Increments by Default
**Priority**: P1
**Estimated Effort**: 1-2 days (8-16 hours)

---

## Overview

This increment enhances `/specweave:sync-docs` to sync ALL non-archived increments by default, improving developer experience by eliminating the need to manually sync each increment individually.

**Key Insight**: The `--all` flag already exists in `sync-specs.ts` - we're just changing the default behavior when no increment ID is provided.

---

## Architecture

### Current Flow
```
User: /specweave:sync-docs
  ↓
Command detects no args
  ↓
Finds latest completed increment
  ↓
Syncs single increment
  ↓
✅ Done (1 increment synced)
```

### New Flow
```
User: /specweave:sync-docs
  ↓
Command detects no args → Default to "all" mode
  ↓
Finds all increments with spec.md
  ↓
Syncs each increment (batch processing)
  ↓
✅ Done (15 increments synced)
```

### Backward Compatibility
```
User: /specweave:sync-docs 0042
  ↓
Command detects specific ID → Single mode
  ↓
Syncs only 0042
  ↓
✅ Done (1 increment synced, same as before)
```

---

## Implementation Strategy

### Phase 1: CLI Logic Update (3 hours)

**File**: `src/cli/commands/sync-specs.ts`

**Change 1**: Add `findAllSyncableIncrements()` function
- Similar to existing `findCompletedIncrements()` but WITHOUT status filter
- Filters by regex `/^\d{4}-/` to exclude `_archive`, `_backup`, etc.
- Requires `spec.md` to exist
- Returns sorted list

**Change 2**: Update `syncSpecs()` to default to "all" mode
```typescript
const shouldSyncAll = parsedArgs.all || !parsedArgs.incrementId;

if (shouldSyncAll) {
  // Use findAllSyncableIncrements() instead of findCompletedIncrements()
  const increments = await findAllSyncableIncrements(projectRoot);
  // ... rest of batch sync logic (already exists)
} else {
  // Single increment sync (existing code, no changes)
}
```

**Key Decision**: Use `findAllSyncableIncrements()` instead of `findCompletedIncrements()` to sync ALL increments, not just completed ones. This ensures in-progress increments are also synced to living docs.

---

### Phase 2: Command Documentation Update (1 hour)

**File**: `plugins/specweave/commands/specweave-sync-docs.md`

**Changes**:
1. Update STEP 1 to document new default behavior
2. Update STEP 2B to mention batch processing
3. Add new examples showing sync-all as default
4. Document backward compatibility (specific ID still works)

**No changes to command logic** - the command just calls `syncSpecs()`, which handles the new behavior automatically.

---

### Phase 3: Integration Tests (3 hours)

**New Test File**: `tests/integration/commands/sync-specs-all.test.ts`

**Test Cases**:
1. **T-001**: Sync all with 3 increments → verify all synced
2. **T-002**: Sync excludes `_archive` directory → verify not synced
3. **T-003**: Sync with invalid spec.md → verify continues with others
4. **T-004**: Backward compat with specific ID → verify only that one synced
5. **T-005**: Dry-run mode → verify no files created
6. **T-006**: Progress output → verify shows each increment
7. **T-007**: Summary output → verify shows counts

**Test Structure**:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createIsolatedTestDir } from '../../test-utils/isolated-test-dir';
import { syncSpecs } from '../../../src/cli/commands/sync-specs.js';

describe('Sync Specs - All Mode', () => {
  let testDir: string;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const isolated = await createIsolatedTestDir('sync-specs-all');
    testDir = isolated.testDir;
    cleanup = isolated.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  it('T-001: syncs all increments when no args provided', async () => {
    // Create test increments
    // Run syncSpecs([])
    // Verify all synced
  });

  // ... more tests
});
```

---

### Phase 4: Documentation Updates (1 hour)

**Files to Update**:
1. `.specweave/docs/public/guides/command-reference-by-priority.md`
   - Update `/specweave:sync-docs` entry
   - Document new default behavior
   - Add examples

2. `CHANGELOG.md` (when releasing)
   - Document behavior change
   - Provide migration examples

---

## Task Breakdown

### T-001: Add findAllSyncableIncrements() function
**Estimated**: 1 hour
**File**: `src/cli/commands/sync-specs.ts`
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

**Tests**: Unit tests in `tests/unit/cli/sync-specs-args.test.ts`

---

### T-002: Update syncSpecs() to default to all mode
**Estimated**: 1 hour
**File**: `src/cli/commands/sync-specs.ts`
**Changes**:
1. Change condition from `if (parsedArgs.all)` to `if (parsedArgs.all || !parsedArgs.incrementId)`
2. Call `findAllSyncableIncrements()` instead of `findCompletedIncrements()`
3. Update console output to say "Syncing all increments..." instead of "Syncing all completed increments..."

**Tests**: Integration tests verify behavior

---

### T-003: Update command documentation
**Estimated**: 30 minutes
**File**: `plugins/specweave/commands/specweave-sync-docs.md`
**Changes**:
- Line 18-20: Add note about default behavior
- Line 681-720: Update examples to show new default

---

### T-004: Create integration tests
**Estimated**: 2 hours
**File**: `tests/integration/commands/sync-specs-all.test.ts`
**Covers**: All 7 test cases listed in Phase 3

---

### T-005: Update user documentation
**Estimated**: 30 minutes
**File**: `.specweave/docs/public/guides/command-reference-by-priority.md`
**Changes**: Document new behavior with examples

---

### T-006: Manual testing & validation
**Estimated**: 1 hour
**Steps**:
1. Build project: `npm run rebuild`
2. Create test increments in `.specweave/increments/`
3. Run `/specweave:sync-docs` and verify output
4. Run `/specweave:sync-docs 0042` and verify backward compat
5. Verify `_archive` is excluded
6. Check living docs files created correctly

---

## Risk Assessment

### Low Risk
- ✅ Minimal code changes (mostly reusing existing logic)
- ✅ No new dependencies
- ✅ Backward compatible (specific ID still works)
- ✅ `--all` flag already exists and is tested

### Potential Issues
1. **Performance**: Syncing many increments could be slow
   - **Mitigation**: Show progress for each increment, add dry-run for testing

2. **Breaking change**: Users expecting old behavior (sync latest)
   - **Mitigation**: Well-documented, clear migration guide, specific ID still works

3. **Test coverage**: Need comprehensive tests for all edge cases
   - **Mitigation**: 7 test cases cover all scenarios

---

## Acceptance Criteria Mapping

| AC | Task | Phase |
|----|------|-------|
| AC-US1-01 | T-001, T-002 | Phase 1 |
| AC-US1-02 | T-001 | Phase 1 |
| AC-US1-03 | T-002 | Phase 1 |
| AC-US1-04 | T-002 | Phase 1 |
| AC-US1-05 | T-002 | Phase 1 |
| AC-US1-06 | T-002 | Phase 1 |
| AC-US1-07 | T-002 | Phase 1 |

All ACs covered by implementation tasks.

---

## Success Metrics

**Before**:
- Syncing 10 increments: 10 manual commands, ~5 minutes
- Risk of missing increments: High
- User experience: Tedious

**After**:
- Syncing 10 increments: 1 command, ~30 seconds
- Risk of missing increments: Zero
- User experience: Delightful

---

## Next Steps

1. **Implement**: Execute tasks T-001 through T-006 in order
2. **Test**: Run all tests (unit + integration)
3. **Validate**: Manual testing with real increments
4. **Document**: Update user-facing docs
5. **Complete**: Mark increment as done

**Ready to start implementation!**
