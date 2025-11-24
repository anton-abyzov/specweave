# ULTRATHINK: Auto-Feature Inference from Increment Numbers

**Issue**: Only 3 out of 8 increments synced to living docs
**Root Cause**: Missing `feature_id`/`epic` fields in spec.md frontmatter
**Expected**: ALL increments should have features in living docs (0040-0047 → FS-040-047)

---

## The Discovery

```bash
Increments in /increments/:        Features in /_features/:
├── 0040-vitest...                 ├── FS-040 ✅
├── 0041-living-docs...            ├── (missing!) ❌
├── 0042-test-infrastructure...    ├── (missing!) ❌
├── 0043-spec-md-desync...         ├── FS-043 ✅
├── 0044-integration-testing...    ├── (missing!) ❌
├── 0045-living-docs-external...   ├── (missing!) ❌
├── 0046-console-elimination...    ├── (missing!) ❌
└── 0047-us-task-linkage           └── FS-047 ✅

Expected: 8 features
Actual: 3 features
Gap: 5 missing features!
```

### Why Features Are Missing

```typescript
// Current algorithm (increment-archiver.ts:386-396)
const featureIdMatch = content.match(/^feature_id:\s*["']?([^"'\n]+)["']?$/m);
const epicMatch = content.match(/^epic:\s*["']?([^"'\n]+)["']?$/m);

const featureId = featureIdMatch?.[1] || epicMatch?.[1] || null;

if (!featureId) {
  return; // ❌ SKIP! No feature sync!
}
```

**Result**: Increments without explicit linkage are orphaned (no feature created/synced)

---

## The Problem with Current Approach

### Explicit Linkage Requirement

Current algorithm requires EXPLICIT frontmatter:
```yaml
---
increment: 0041-living-docs-test-fixes
epic: FS-041  ← MUST be present or no sync!
---
```

**If missing**: Increment is orphaned, no feature in living docs

### Why This Fails

1. **Legacy increments** (0040-0046) created before feature tracking
2. **Manual updates** required for ALL old increments
3. **Error-prone** - easy to forget adding feature_id
4. **Inconsistent** - some have it, some don't

---

## The Solution: Auto-Inference

### Proposed Algorithm Change

**Auto-infer feature ID from increment number when linkage missing**:

```typescript
// NEW algorithm (with auto-inference)
private async updateReferencesOnRestore(increment: string): Promise<void> {
  // 1. Parse explicit linkage (if present)
  const explicitFeatureId = parseFeatureId(spec.md);

  // 2. If missing, auto-infer from increment number
  const inferredFeatureId = inferFeatureIdFromIncrement(increment);
  // "0041-living-docs-test-fixes" → "FS-041"

  // 3. Use explicit OR inferred
  const featureId = explicitFeatureId || inferredFeatureId;

  // 4. Sync feature (create if doesn't exist)
  await syncFeatureToLivingDocs(featureId);
}

function inferFeatureIdFromIncrement(increment: string): string {
  // Extract number: "0041-living-docs-test-fixes" → "0041"
  const match = increment.match(/^(\d{4})/);
  if (!match) return null;

  const number = parseInt(match[1], 10);

  // Convert to feature ID: 41 → "FS-041"
  return `FS-${number.toString().padStart(3, '0')}`;
}
```

### Inference Rules

| Increment | Explicit Linkage | Inferred | Result |
|-----------|-----------------|----------|--------|
| 0040-vitest... | epic: FS-040 | FS-040 | **FS-040** (explicit wins) |
| 0041-living... | (none) | FS-041 | **FS-041** (inferred) |
| 0042-test... | epic: FS-25-11-18 | FS-042 | **FS-25-11-18** (explicit wins, even if wrong!) |
| 0043-spec... | epic: FS-043 | FS-043 | **FS-043** (both match) |

---

## Implementation Strategy

### Option 1: Auto-Inference with Fallback (RECOMMENDED)

```typescript
// Prefer explicit, fallback to inferred
const featureId = explicitFeatureId || inferredFeatureId;

// Always sync (create feature if doesn't exist)
await ensureFeatureExists(featureId);
await syncFeatureToLivingDocs(featureId);
```

**Pros**:
- Works for legacy increments (no manual updates!)
- Explicit linkage still honored (backward compatible)
- Automatic for new increments (no frontmatter needed)

**Cons**:
- Might create unwanted features for truly orphan increments

### Option 2: Explicit Only (CURRENT)

```typescript
// Only sync if explicit
if (!explicitFeatureId) {
  return; // Skip silently
}
```

**Pros**:
- Explicit control
- No surprises

**Cons**:
- Requires manual updates for 5 increments ❌
- Brittle (easy to forget adding linkage)
- Doesn't match user expectation (8 increments → 8 features)

### Option 3: Strict Inference (TOO AGGRESSIVE)

```typescript
// Always use inferred, ignore explicit
const featureId = inferredFeatureId;
```

**Pros**:
- Guaranteed consistency (increment number always matches feature ID)

**Cons**:
- Breaks existing explicit linkage (e.g., FS-25-11-18)
- No flexibility for special cases

---

## Recommended Fix: Smart Inference

### Algorithm

```typescript
private async getFeatureIdForIncrement(increment: string, specContent: string): Promise<string | null> {
  // 1. Try explicit linkage first
  const explicit = parseExplicitFeatureId(specContent);
  if (explicit) {
    return explicit; // Honor explicit linkage
  }

  // 2. Infer from increment number
  const inferred = inferFeatureIdFromIncrement(increment);
  if (inferred) {
    console.log(`ℹ️  Auto-inferred feature ID: ${increment} → ${inferred}`);
    return inferred;
  }

  // 3. No linkage possible
  return null;
}

private inferFeatureIdFromIncrement(increment: string): string | null {
  // "0041-living-docs-test-fixes" → "FS-041"
  const match = increment.match(/^(\d{4})/);
  if (!match) return null;

  const number = parseInt(match[1], 10);
  return `FS-${number.toString().padStart(3, '0')}`;
}
```

### Usage

```typescript
// In updateReferencesOnRestore() and updateReferences()
const featureId = await this.getFeatureIdForIncrement(increment, specContent);

if (!featureId) {
  this.logger.debug(`No feature linkage for ${increment}, skipping`);
  return;
}

// Sync feature (will auto-create if doesn't exist)
await this.syncFeatureToLivingDocs(featureId);
```

---

## Test Cases

### TC-1: Explicit Linkage (Existing Behavior)
```yaml
increment: 0047-us-task-linkage
epic: FS-047
```
→ Feature: FS-047 (from explicit linkage) ✅

### TC-2: No Linkage (NEW Behavior)
```yaml
increment: 0041-living-docs-test-fixes
# No epic or feature_id field
```
→ Feature: FS-041 (auto-inferred from "0041") ✅

### TC-3: Wrong Linkage (Edge Case)
```yaml
increment: 0042-test-infrastructure-cleanup
epic: FS-25-11-18
```
→ Feature: FS-25-11-18 (explicit wins, even if wrong!) ⚠️

### TC-4: Orphan Increment (Skip)
```yaml
increment: temp-experiment
# No number prefix
```
→ Feature: null (can't infer, skip sync) ⏭️

---

## Feature Creation Logic

### Auto-Create Missing Features

```typescript
private async syncFeatureToLivingDocs(featureId: string): Promise<void> {
  const featurePath = path.join(this.specsDir, '_features', featureId);

  // If feature doesn't exist, create minimal structure
  if (!await fs.pathExists(featurePath)) {
    console.log(`📦 Creating feature ${featureId} (auto-inferred)...`);

    await fs.ensureDir(featurePath);
    await fs.writeFile(
      path.join(featurePath, 'FEATURE.md'),
      `# ${featureId}\n\nAuto-generated feature from increment sync.\n`,
      'utf-8'
    );
  }

  // Now sync feature (archive/restore)
  // ...
}
```

---

## Impact Analysis

### Before Fix
```
8 increments → 3 features (37.5% coverage)
```

### After Fix
```
8 increments → 8 features (100% coverage)
```

### Breakdown
| Increment | Before | After | Method |
|-----------|--------|-------|--------|
| 0040 | FS-040 ✅ | FS-040 ✅ | Explicit |
| 0041 | (none) ❌ | FS-041 ✅ | Inferred |
| 0042 | (none) ❌ | FS-25-11-18 ⚠️ | Explicit (wrong!) |
| 0043 | FS-043 ✅ | FS-043 ✅ | Explicit |
| 0044 | (none) ❌ | FS-044 ✅ | Inferred |
| 0045 | (none) ❌ | FS-045 ✅ | Inferred |
| 0046 | (none) ❌ | FS-046 ✅ | Inferred |
| 0047 | FS-047 ✅ | FS-047 ✅ | Explicit |

---

## Implementation Checklist

- [ ] Add `inferFeatureIdFromIncrement()` helper
- [ ] Add `getFeatureIdForIncrement()` smart selector
- [ ] Update `updateReferencesOnRestore()` to use smart selector
- [ ] Update `updateReferences()` (archiving) to use smart selector
- [ ] Add auto-create logic for missing features
- [ ] Add logging for inferred vs explicit linkage
- [ ] Test with increment 0041 (no linkage)
- [ ] Test with increment 0047 (explicit linkage)
- [ ] Verify all 8 features created/synced

---

## Next Steps

User will test by archiving one increment. I'll implement the fix now.
