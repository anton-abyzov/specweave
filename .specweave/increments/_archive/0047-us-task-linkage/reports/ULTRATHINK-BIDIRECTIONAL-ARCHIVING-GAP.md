# ULTRATHINK: Bidirectional Archiving Gap Analysis

**Date**: 2025-11-20
**Incident**: Living docs features remain in `_archive` after restoring increments
**Severity**: P0 (Critical) - Breaks consistency between increments and living docs

---

## The Problem

User reports that features remain in `.specweave/docs/internal/specs/_features/_archive/` even after restoring increments from `.specweave/increments/_archive/`.

**Example**:
- Increment `0040-vitest-living-docs-mock-fixes` is archived
- Feature `FS-040` is automatically moved to `_features/_archive/` (correct!)
- User restores increment: `/specweave:restore 0040`
- **BUG**: `FS-040` remains in `_features/_archive/` (should be moved back!)

---

## Root Cause Analysis

### Archiving Flow (WORKS CORRECTLY)

```typescript
// src/core/increment/increment-archiver.ts:252-288
async archiveIncrement(increment: string): Promise<void> {
  // 1. Move increment to archive
  await fs.move(sourcePath, targetPath);

  // 2. Update living docs (line 287)
  await this.updateReferences(increment);
}

// src/core/increment/increment-archiver.ts:319-363
async updateReferences(increment: string): Promise<void> {
  const { FeatureArchiver } = await import('../living-docs/feature-archiver.js');
  const featureArchiver = new FeatureArchiver(this.rootDir);

  // Archive features when all increments archived
  const result = await featureArchiver.archiveFeatures({
    forceArchiveWhenAllIncrementsArchived: true
  });

  // ✅ This correctly archives FS-XXX when all its increments are archived
}
```

**Result**: When archiving increment → living docs are automatically synchronized ✅

### Restore Flow (BROKEN!)

```typescript
// src/core/increment/increment-archiver.ts:401-442
async restore(increment: string): Promise<void> {
  // 1. Check for duplicates
  // 2. Move increment from archive back to active
  await fs.move(sourcePath, targetPath);

  // 3. Clear cache
  const { IncrementNumberManager } = await import('../increment-utils.js');
  IncrementNumberManager.clearCache();

  // ❌ MISSING: No living docs sync!
  // ❌ MISSING: No check if feature should be restored
  // ❌ MISSING: No link updates
}
```

**Result**: When restoring increment → living docs are NOT synchronized ❌

---

## The Gap: Unidirectional Sync

| Operation | Increment Action | Living Docs Sync | Status |
|-----------|------------------|------------------|--------|
| **Archive** | Move to `_archive/` | ✅ Auto-archive feature if all increments archived | Working |
| **Restore** | Move to active | ❌ NO sync - feature stays in `_archive/` | **BROKEN** |

**Key Insight**: The archiving flow has bidirectional awareness, but the restore flow is unidirectional!

---

## Why This Happens

### Design Assumption (INCORRECT)

The original `IncrementArchiver.restore()` assumed:
- Restoring an increment is a **temporary operation** (for reference/debugging)
- User will re-archive the increment when done
- Living docs should remain in archive to avoid churn

**Reality**:
- Users restore increments to **resume work** (not just reference)
- Expect features to be visible in active living docs again
- Want full bidirectional consistency (archive ↔ restore)

---

## Impact Analysis

### User Experience Impact

1. **Confusion**: User sees increment in active folder, but feature in archive folder
2. **Lost Context**: Living docs show feature as "archived" when it's actually active
3. **Sync Drift**: Increments and living docs become desynchronized
4. **Manual Cleanup**: User must manually move feature folders (error-prone)

### Technical Impact

1. **Broken Links**: Links to `_features/FS-XXX/` become stale (point to archive)
2. **Stale Docs**: Documentation shows incorrect archive status
3. **Duplicate Risk**: If user creates new increment for same feature, duplicate folders
4. **Cascade Failures**: Other tools (GitHub sync, JIRA) see inconsistent state

---

## Correct Behavior (Bidirectional Sync)

### When Restoring Increment

```
/specweave:restore 0040

Step 1: Restore increment
  .specweave/increments/_archive/0040-xxx/ → .specweave/increments/0040-xxx/

Step 2: Check increment's feature (from spec.md frontmatter)
  feature_id: FS-040

Step 3: Check if feature is archived
  .specweave/docs/internal/specs/_features/_archive/FS-040/ exists? YES

Step 4: Restore feature from archive
  _features/_archive/FS-040/ → _features/FS-040/
  specweave/_archive/FS-040/ → specweave/FS-040/ (project-specific)

Step 5: Update links
  /_features/_archive/FS-040/ → /_features/FS-040/
  /specweave/_archive/FS-040/ → /specweave/FS-040/

Result: ✅ Increment and feature both in active state (synchronized!)
```

---

## Solution: Restore with Living Docs Sync

### Implementation Strategy

**Option A: Mirror archiving logic (RECOMMENDED)**

Add `updateReferencesOnRestore()` to `IncrementArchiver.restore()`:

```typescript
async restore(increment: string): Promise<void> {
  // Existing: Move increment from archive
  await fs.move(sourcePath, targetPath);

  // NEW: Sync living docs on restore
  await this.updateReferencesOnRestore(increment);

  // Existing: Clear cache
  IncrementNumberManager.clearCache();
}

async updateReferencesOnRestore(increment: string): Promise<void> {
  // 1. Parse spec.md to get feature_id
  const specPath = path.join(this.incrementsDir, increment, 'spec.md');
  const content = await fs.readFile(specPath, 'utf-8');
  const featureIdMatch = content.match(/^feature_id:\s*["']?([^"'\n]+)["']?$/m);

  if (!featureIdMatch) return; // No feature linkage, skip

  const featureId = featureIdMatch[1].trim();

  // 2. Check if feature is in archive
  const archivePath = path.join(this.rootDir, '.specweave/docs/internal/specs/_features/_archive', featureId);

  if (!await fs.pathExists(archivePath)) return; // Not archived, skip

  // 3. Restore feature from archive
  const { FeatureArchiver } = await import('../living-docs/feature-archiver.js');
  const featureArchiver = new FeatureArchiver(this.rootDir);

  await featureArchiver.restoreFeature(featureId);

  console.log(`✅ Restored feature ${featureId} from archive (linked to ${increment})`);
}
```

**Option B: Manual user step (NOT RECOMMENDED)**

Force users to run:
```bash
/specweave:restore 0040
/specweave:restore-feature FS-040  # ❌ Manual step, error-prone!
```

**Verdict**: Option A is superior (automatic, consistent, user-friendly)

---

## Testing Strategy

### Test Case 1: Single Increment Archive/Restore

```bash
# Setup: Create feature with 1 increment
feature_id: FS-999
increment: 0999-test-feature

# Archive increment
/specweave:archive 0999
# Expected: FS-999 moved to _features/_archive/ ✅

# Restore increment
/specweave:restore 0999
# Expected: FS-999 moved back to _features/ ✅ (NEW!)
```

### Test Case 2: Multi-Increment Feature (Partial Restore)

```bash
# Setup: Feature with 3 increments
feature_id: FS-999
increments: 0999-a, 1000-b, 1001-c

# Archive all increments
/specweave:archive 0999 1000 1001
# Expected: FS-999 moved to _features/_archive/ ✅

# Restore ONE increment
/specweave:restore 0999
# Expected: FS-999 moved back to _features/ ✅ (because 0999 is now active!)
```

### Test Case 3: Feature Already Active (No-Op)

```bash
# Setup: Restore increment when feature is already active
feature_id: FS-999 (already in _features/)
increment: 0999 (in _archive/)

# Restore increment
/specweave:restore 0999
# Expected: Feature stays in _features/ (no duplicate, no error) ✅
```

### Test Case 4: Link Updates

```bash
# Setup: Documents reference archived feature
README.md contains: [Feature](/_features/_archive/FS-999/FEATURE.md)

# Restore increment
/specweave:restore 0999
# Expected: Link updated to /_features/FS-999/FEATURE.md ✅
```

---

## Implementation Checklist

- [ ] Add `updateReferencesOnRestore()` to `IncrementArchiver`
- [ ] Parse spec.md frontmatter to extract `feature_id`
- [ ] Check if feature exists in `_features/_archive/`
- [ ] Call `FeatureArchiver.restoreFeature()` if archived
- [ ] Update all links (via `restoreFeature()` existing logic)
- [ ] Add unit tests (4 test cases above)
- [ ] Add integration test (full archive/restore cycle)
- [ ] Update `/specweave:restore` command documentation
- [ ] Add logging for clarity ("Restored feature FS-XXX linked to increment")

---

## Acceptance Criteria

**AC-1**: When restoring an increment, its linked feature MUST be restored from archive if present

**AC-2**: When restoring an increment, all links to the feature MUST be updated from archive paths to active paths

**AC-3**: When restoring an increment whose feature is already active, NO duplicate folders are created

**AC-4**: When restoring one increment of a multi-increment feature, the feature MUST be restored (any active increment = active feature)

**AC-5**: Restore command MUST display clear logging showing which features were restored

---

## Related Issues

- **FS-047** (US-Task Linkage): This fix enables proper task-level traceability
- **FS-033** (Duplicate Prevention): Ensures no duplicate features after restore
- **Archive Reorganization**: Completes the bidirectional sync architecture

---

## Conclusion

**Current State**: Unidirectional sync (archive works, restore broken)
**Target State**: Bidirectional sync (archive + restore both work)
**Fix Complexity**: Low (reuse existing `FeatureArchiver.restoreFeature()`)
**Impact**: High (fixes major UX confusion, restores consistency)

**Next Step**: Implement `updateReferencesOnRestore()` in `IncrementArchiver.restore()`
