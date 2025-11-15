# Feature ID Generation Fix - Summary Report

## Problem

All features were being assigned `FS-001` instead of matching their increment numbers.

**Expected behavior:**
- Increment `0027-multi-project-github-sync` → Feature `FS-027`
- Increment `0031-external-tool-status-sync` → Feature `FS-031`
- Increment `0032-prevent-increment-number-gaps` → Feature `FS-032`

**Actual behavior (WRONG):**
- All increments → Feature `FS-001`

## Root Cause Analysis

Three issues were found in the feature ID generation pipeline:

### Issue 1: Date-Based ID Generation (hierarchy-mapper.ts)

**Location:** `detectFeatureFromIncrementName()` and `createFallbackFeatureMapping()`

**Problem:**
```typescript
// WRONG - Generated date-based IDs for greenfield projects
const date = await this.getIncrementCreationDate(incrementId);
const featureId = `FS-${date}-${featureName}`;  // FS-25-11-14-feature-name
```

**Fix:**
```typescript
// CORRECT - Extract increment number for greenfield projects
const num = parseInt(numMatch[1], 10);
const featureId = `FS-${String(num).padStart(3, '0')}`;  // FS-031
```

### Issue 2: Frontmatter Override (hierarchy-mapper.ts)

**Location:** `detectFeatureFromFrontmatter()`

**Problem:**
Frontmatter detection was using the date-based feature ID from frontmatter (`feature: FS-25-11-14-name`) even for greenfield projects.

**Fix:**
Added brownfield detection to override frontmatter for greenfield projects:
```typescript
const isBrownfield = frontmatter.source === 'external' || frontmatter.imported === true;
if (!isBrownfield) {
  // Greenfield: ALWAYS use increment number
  const num = parseInt(numMatch[1], 10);
  featureId = `FS-${String(num).padStart(3, '0')}`;
}
```

### Issue 3: Fuzzy Match Bug (hierarchy-mapper.ts)

**Location:** `findExistingFeatureFolder()`

**Problem:**
The fuzzy match logic extracted an empty string for greenfield IDs (`FS-027`):
```typescript
const parts = 'FS-027'.split('-');  // ['FS', '027']
const featureNamePart = parts.slice(3).join('-');  // '' (empty!)
if (folder.includes('')) {  // TRUE for ANY folder!
  return folder;  // Returns FS-001 (first folder found)
}
```

**Fix:**
Disabled fuzzy matching for greenfield IDs:
```typescript
const isGreenfield = /^FS-\d{3}$/.test(featureId);
if (isGreenfield) {
  return null;  // No fuzzy match for greenfield
}
```

### Issue 4: Registry Lookup (hierarchy-mapper.ts)

**Location:** `buildFeatureMapping()`

**Problem:**
The method was calling `featureIdManager.getAssignedId()` for greenfield IDs, which triggered sequential ID assignment when the feature wasn't found in the registry.

**Fix:**
Added greenfield detection to skip registry lookup:
```typescript
const isGreenfield = /^FS-\d{3}$/.test(featureId);
const finalFeatureId = isGreenfield
  ? featureId  // Use directly
  : this.featureIdManager.getAssignedId(featureId);  // Lookup in registry
```

## Files Modified

1. **`src/core/living-docs/hierarchy-mapper.ts`**
   - `detectFeatureFromFrontmatter()` - Added greenfield override
   - `detectFeatureFromIncrementName()` - Use increment number instead of date
   - `createFallbackFeatureMapping()` - Use increment number instead of date
   - `buildFeatureMapping()` - Skip registry lookup for greenfield
   - `findExistingFeatureFolder()` - Disable fuzzy match for greenfield

## Testing Results

**Before Fix:**
```
❌ 0027-multi-project-github-sync → FS-001 (expected: FS-027)
❌ 0028-multi-repo-ux-improvements → FS-001 (expected: FS-028)
❌ 0030-intelligent-living-docs → FS-001 (expected: FS-030)
❌ 0031-external-tool-status-sync → FS-001 (expected: FS-031)
❌ 0032-prevent-increment-number-gaps → FS-001 (expected: FS-032)

Results: 0✅ passed, 5❌ failed
```

**After Fix:**
```
✅ 0027-multi-project-github-sync → FS-027
✅ 0028-multi-repo-ux-improvements → FS-028
✅ 0030-intelligent-living-docs → FS-030
✅ 0031-external-tool-status-sync → FS-031
✅ 0032-prevent-increment-number-gaps → FS-032

Results: 5✅ passed, 0❌ failed
```

**Extended Test (10 increments):**
```
✅ 0001-core-framework → FS-001
✅ 0002-core-enhancements → FS-002
✅ 0003-intelligent-model-selection → FS-003
✅ 0004-plugin-architecture → FS-004
✅ 0005-cross-platform-cli → FS-005
✅ 0027-multi-project-github-sync → FS-027
✅ 0028-multi-repo-ux-improvements → FS-028
✅ 0030-intelligent-living-docs → FS-030
✅ 0031-external-tool-status-sync → FS-031
✅ 0032-prevent-increment-number-gaps → FS-032

Results: 10/10 passed (100%)
```

## Implementation Details

### Greenfield vs Brownfield Detection

**Greenfield Projects:**
- Created natively in SpecWeave
- Feature IDs match increment numbers: `0031` → `FS-031`
- Format: `FS-XXX` (3 digits, zero-padded)
- Detection: No `source: external` or `imported: true` in frontmatter

**Brownfield Projects:**
- Imported from external tools (JIRA, GitHub, etc.)
- Feature IDs use date-based format: `FS-25-11-14-feature-name`
- Format: `FS-YY-MM-DD-{feature-name}`
- Detection: `source: external` or `imported: true` in frontmatter

### ID Format Rules

| Project Type | Increment ID | Feature ID | Logic |
|--------------|--------------|------------|-------|
| **Greenfield** | `0031-feature-name` | `FS-031` | Extract number, pad to 3 digits |
| **Greenfield** | `0001-core-framework` | `FS-001` | Extract number, pad to 3 digits |
| **Brownfield** | `0031-imported-feature` | `FS-25-11-14-imported-feature` | Use creation date + feature name |

## Edge Cases Handled

1. **Leading Zeros:** `0031` → `31` → `"031"` (padded) → `FS-031`
2. **Single Digits:** `0001` → `1` → `"001"` (padded) → `FS-001`
3. **Three Digits:** `0100` → `100` → `"100"` → `FS-100`
4. **Empty Fuzzy Match:** `FS-027` → No fuzzy match (greenfield)
5. **Registry Lookup:** `FS-027` → Direct use (no registry lookup for greenfield)

## Benefits

1. **Correct Mapping:** Feature IDs now correctly match increment numbers
2. **No Duplication:** All features get unique IDs (FS-001, FS-027, FS-031, etc.)
3. **Clear Traceability:** Easy to map feature folders back to increments
4. **Brownfield Support:** Date-based IDs still work for imported projects
5. **Performance:** Greenfield IDs skip unnecessary registry lookups

## Next Steps

1. ✅ **Code Fix:** All changes implemented and tested
2. ⏳ **Documentation Update:** Update architecture docs to reflect greenfield vs brownfield
3. ⏳ **Migration Guide:** Document how to migrate existing date-based IDs (if needed)

## Conclusion

The feature ID generation is now working correctly for greenfield projects. All increments map to their expected feature IDs (0031 → FS-031), and the brownfield/date-based format is preserved for imported projects.

**Status:** ✅ FIXED
**Tested:** ✅ 100% pass rate (10/10 increments)
**Ready for:** ✅ Production use

