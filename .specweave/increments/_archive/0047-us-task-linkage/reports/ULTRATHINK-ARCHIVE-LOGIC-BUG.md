# ULTRATHINK: Archive Logic Still Broken!

**Date**: 2025-11-20
**User Feedback**: "archive logic still works incorrectly!!"
**Test**: Archived increment 0040

---

## What Happened

User archived increment 0040:

```
Archive Summary
✅ Successfully archived: 0040-vitest-living-docs-mock-fixes

Automatic Feature Archiving
- Detected that FS-040 has all increments archived
- Moved FS-040 from active features to _features/_archive/

Active Features Remaining
- FS-047: 1 active increment
- FS-043: 1 active increment
```

**User's Complaint**: Only 2 active features, but should be 7!

---

## The Expectation vs Reality

### Before Archive
- **Active Increments**: 8 (0040-0047)
- **Active Features**: 3 (FS-040, FS-043, FS-047)
- **Expected**: 8 features
- **Gap**: 5 missing features ❌

### After Archiving 0040
- **Active Increments**: 7 (0041-0047)
- **Active Features**: 2 (FS-043, FS-047)
- **Expected**: 7 features
- **Gap**: 5 missing features ❌

**Status**: STILL BROKEN! Archiving didn't create missing features!

---

## Root Cause Analysis

### What We Fixed (Incomplete!)

We added auto-inference to **restore logic**:
```typescript
// ✅ FIXED: Restore now auto-infers feature ID
private async updateReferencesOnRestore(increment: string) {
  const featureId = await this.getFeatureIdForIncrement(increment, content);
  // Will use inferred FS-041 if no explicit linkage!
}
```

**But we FORGOT to fix archive logic!**

### What's Still Broken

The **archive logic** doesn't auto-create features:
```typescript
// ❌ BROKEN: Archive only handles the INCREMENT being archived
private async updateReferences(increment: string) {
  // This calls FeatureArchiver.archiveFeatures()
  // Which only ARCHIVES existing features
  // It does NOT CREATE missing features!
}
```

---

## The Problem: Archive vs Create

### Current Archive Logic

```typescript
// feature-archiver.ts:127-207
private async identifyFeaturesToArchive(): Promise<ArchiveOperation[]> {
  // 1. Get ALL features (from _features/ folder)
  const features = await this.getAllFeatures();

  // 2. For each EXISTING feature, check if should archive
  for (const featureId of features) {
    const linkedIncrements = await this.getLinkedIncrements(featureId);
    const allIncrementsArchived = linkedIncrements.every(inc =>
      archivedIncrements.includes(inc)
    );

    if (allIncrementsArchived) {
      // Archive this feature
    }
  }
}
```

**What's missing**: This only processes EXISTING features!

It NEVER creates new features for active increments that don't have them yet!

---

## The Missing Logic: Feature Creation

### What Should Happen

When archiving ANY increment:

```
Step 1: Archive the increment
  0040-vitest-living-docs-mock-fixes → _archive/

Step 2: Sync ALL active increments to living docs
  For each active increment (0041-0047):
    - Get feature ID (explicit or inferred)
    - Check if feature exists in _features/
    - If NOT exists → CREATE IT!
    - If exists and all increments archived → ARCHIVE IT!

Step 3: Archive orphaned features
  For each existing feature:
    - If all increments archived → ARCHIVE IT!
```

### Current Behavior (Broken!)

```
Step 1: Archive the increment ✅
  0040-vitest-living-docs-mock-fixes → _archive/

Step 2: Archive existing features ⚠️
  For each EXISTING feature:
    - FS-040: all increments archived → archive ✅
    - FS-043: has active increment → keep ✅
    - FS-047: has active increment → keep ✅

Step 3: Skip missing features ❌
  NO CHECK for missing features!
  FS-041, FS-042, FS-044, FS-045, FS-046 never created!
```

---

## The Fix: Ensure Features on Archive

### New Algorithm

```typescript
private async updateReferences(increment: string): Promise<void> {
  // 1. FIRST: Ensure all active increments have features
  await this.ensureAllActiveFeaturesExist();

  // 2. THEN: Archive features that should be archived
  const result = await featureArchiver.archiveFeatures({...});
}

private async ensureAllActiveFeaturesExist(): Promise<void> {
  // Get all active increments
  const activeIncrements = await this.getIncrements();

  for (const increment of activeIncrements) {
    // Get feature ID (explicit or inferred)
    const specPath = path.join(this.incrementsDir, increment, 'spec.md');
    const content = await fs.readFile(specPath, 'utf-8');
    const featureId = await this.getFeatureIdForIncrement(increment, content);

    if (!featureId) continue; // Can't infer, skip

    // Check if feature exists
    const featurePath = path.join(this.rootDir, '.specweave/docs/internal/specs/_features', featureId);

    if (!await fs.pathExists(featurePath)) {
      // CREATE missing feature!
      await this.createFeature(featureId, increment);
    }
  }
}

private async createFeature(featureId: string, fromIncrement: string): Promise<void> {
  const featurePath = path.join(this.rootDir, '.specweave/docs/internal/specs/_features', featureId);

  console.log(`📦 Creating feature ${featureId} (from increment ${fromIncrement})...`);

  await fs.ensureDir(featurePath);
  await fs.writeFile(
    path.join(featurePath, 'FEATURE.md'),
    `# ${featureId}\n\nAuto-generated from increment ${fromIncrement}.\n`,
    'utf-8'
  );

  console.log(`✅ Created feature ${featureId}`);
}
```

---

## Test Case: Archive 0040

### Expected Behavior

```bash
$ /specweave:archive 0040

Step 1: Archive increment 0040
  ✅ 0040-vitest-living-docs-mock-fixes → _archive/

Step 2: Ensure all active increments have features
  Checking 0041-living-docs-test-fixes...
    ❌ Feature FS-041 doesn't exist
    📦 Creating feature FS-041...
    ✅ Created FS-041

  Checking 0042-test-infrastructure-cleanup...
    ❌ Feature FS-042 doesn't exist (has FS-25-11-18, but should create FS-042 too? or skip?)
    📦 Creating feature FS-042...
    ✅ Created FS-042

  Checking 0043-spec-md-desync-fix...
    ✅ Feature FS-043 exists (skip)

  Checking 0044-integration-testing-status-hooks...
    ❌ Feature FS-044 doesn't exist
    📦 Creating feature FS-044...
    ✅ Created FS-044

  Checking 0045-living-docs-external-sync...
    ❌ Feature FS-045 doesn't exist
    📦 Creating feature FS-045...
    ✅ Created FS-045

  Checking 0046-console-elimination...
    ❌ Feature FS-046 doesn't exist
    📦 Creating feature FS-046...
    ✅ Created FS-046

  Checking 0047-us-task-linkage...
    ✅ Feature FS-047 exists (skip)

Step 3: Archive orphaned features
  ✓ FS-040: all increments archived → archive
  ✅ Archived feature FS-040

Final State:
  Active Increments: 7 (0041-0047)
  Active Features: 7 (FS-041, FS-042, FS-043, FS-044, FS-045, FS-046, FS-047) ✅
  Archived Features: 1 (FS-040)
```

### Current Behavior (WRONG!)

```bash
$ /specweave:archive 0040

Step 1: Archive increment 0040 ✅
  0040-vitest-living-docs-mock-fixes → _archive/

Step 2: Archive existing features ⚠️
  ✓ FS-040: all increments archived → archive

Final State:
  Active Increments: 7 (0041-0047)
  Active Features: 2 (FS-043, FS-047) ❌ SHOULD BE 7!
  Archived Features: 1 (FS-040)
  Missing Features: 5 (FS-041, FS-042, FS-044, FS-045, FS-046) ❌
```

---

## Why This Wasn't Obvious

The auto-inference we added was ONLY in:
- `updateReferencesOnRestore()` ✅ (handles restore)

We FORGOT to add it in:
- `updateReferences()` ❌ (handles archive)

The archive logic delegates to `FeatureArchiver.archiveFeatures()`, which only processes EXISTING features. It never creates new ones!

---

## The Real Fix

We need to add feature creation logic to the archive flow:

```typescript
// increment-archiver.ts
private async updateReferences(increment: string): Promise<void> {
  try {
    this.logger.info(`🔄 Reorganizing living docs after archiving ${increment}...`);

    // ===== NEW: Ensure all active increments have features =====
    await this.ensureAllActiveFeaturesExist();
    // ===========================================================

    // Existing: Archive features that should be archived
    const { FeatureArchiver } = await import('../living-docs/feature-archiver.js');
    const featureArchiver = new FeatureArchiver(this.rootDir);

    const result = await featureArchiver.archiveFeatures({...});

    // Existing: Log results
  }
}
```

---

## Implementation Checklist

- [ ] Add `ensureAllActiveFeaturesExist()` method to IncrementArchiver
- [ ] Add `createFeature()` helper method
- [ ] Call `ensureAllActiveFeaturesExist()` in `updateReferences()` BEFORE archiving
- [ ] Add logging for feature creation
- [ ] Test: Archive 0041 → verify FS-041 created
- [ ] Test: Archive all → verify all features created/archived correctly

---

## Next Steps

1. Implement `ensureAllActiveFeaturesExist()` in IncrementArchiver
2. Call it in `updateReferences()` before archiving features
3. Rebuild and test by restoring 0040, then archiving it again
4. Verify all 8 features exist (7 active + 1 archived)
