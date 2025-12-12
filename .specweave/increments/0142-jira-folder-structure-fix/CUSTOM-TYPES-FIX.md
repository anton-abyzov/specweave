# JIRA Custom Types Fix (v0.35.3)

## Root Cause Identified ✅

After deep investigation, the **orphans problem was NOT a folder structure issue** - it was a **type mapping issue**!

### The Bug

**Observed**: ID-187 "Keycloak POC" (JIRA Epic) was imported as `us-007e-keycloak-poc.md` (User Story file) instead of creating a `FS-XXX/` Feature folder.

**Root Cause**: Your JIRA instance uses **custom issue types**:
- JIRA Issue Type: `"L3 Feature"` (not standard "Epic")
- SpecWeave type mapping: Exact string match for `"epic"` only
- Result: `"L3 Feature"` didn't match → fell through to default `type = 'task'` → became user story!

### Real JIRA Data

```bash
$ curl JIRA API for ID-187
{
  "key": "ID-187",
  "fields": {
    "issuetype": {
      "name": "L3 Feature"  ← NOT "Epic"!
    },
    "summary": "Keycloak POC"
  }
}
```

**Before Fix** (v0.35.2):
```typescript
// jira-importer.ts
if (issueTypeName === 'epic') {  // Exact match!
  type = 'epic';
}
// "L3 Feature" → doesn't match → type = 'task' → US file ❌
```

**After Fix** (v0.35.3):
```typescript
// jira-importer.ts
if (issueTypeName.includes('feature') || issueTypeName.includes('l3')) {
  type = 'feature';  // ✅ Flexible matching!
}
// "L3 Feature" → matches! → type = 'feature' → FS-XXX folder ✅
```

## The Fix (v0.35.3)

### File 1: [src/importers/jira-importer.ts](src/importers/jira-importer.ts:407-421)

**Changed from exact matching to keyword matching:**

```typescript
// BEFORE (v0.35.2):
if (issueTypeName === 'epic') {
  type = 'epic';
} else if (issueTypeName === 'feature') {
  type = 'feature';
}

// AFTER (v0.35.3):
if (issueTypeName.includes('story') || issueTypeName === 'user story') {
  type = 'user-story';
} else if (issueTypeName.includes('epic') || issueTypeName.includes('l2')) {
  type = 'epic';
} else if (issueTypeName.includes('feature') || issueTypeName.includes('l3')) {
  type = 'feature';  // ← Now matches "L3 Feature"!
} else if (issueTypeName.includes('bug')) {
  type = 'bug';
}
```

**Supported Custom Types:**
- ✅ `"L3 Feature"`, `"Team Feature"`, `"Feature Request"` → `type: 'feature'`
- ✅ `"L2 Epic"`, `"Team Epic"`, `"Initiative Epic"` → `type: 'epic'`
- ✅ `"Bug Fix"`, `"Bugfix"`, `"Critical Bug"` → `type: 'bug'`
- ✅ `"User Story"`, `"Tech Story"`, `"Story"` → `type: 'user-story'`

### File 2: [src/core/types/sync-profile.ts](src/core/types/sync-profile.ts:236-243)

**Added 'Feature' to JIRA hierarchy mapping:**

```typescript
// BEFORE (v0.35.2):
export const DEFAULT_JIRA_HIERARCHY_MAPPING: HierarchyMappingConfig = {
  epicLevelTypes: [],
  featureLevelTypes: ['Epic'],  // Only Epic!
};

// AFTER (v0.35.3):
export const DEFAULT_JIRA_HIERARCHY_MAPPING: HierarchyMappingConfig = {
  epicLevelTypes: [],
  featureLevelTypes: ['Epic', 'Feature'],  // Both Epic AND Feature!
};
```

**Why this matters:**
- JiraImporter now sets `type: 'feature'` for "L3 Feature"
- Hierarchy mapping must recognize `'feature'` type → feature-level (FS-XXX folders)
- Without this change, items would still end up as user stories!

## Test Results ✅

### Test Import (ID Project, 50 items)

```bash
$ node test-import.mjs

🔄 Starting JIRA import for ID project...

   Fetched 50 items so far...
✅ Fetched 50 items from JIRA

📊 Item types:
   user-story: 37
   feature: 2        ← ID-187 and another "L3 Feature"!
   task: 10
   bug: 1

🎯 Found ID-187 (Keycloak POC):
   Type: feature     ← ✅ Correct!
   Title: Keycloak POC
   Parent: None
```

### Regression Test

Created [tests/unit/importers/jira-custom-types.test.ts](../../tests/unit/importers/jira-custom-types.test.ts):

```bash
$ npx vitest run tests/unit/importers/jira-custom-types.test.ts

 ✓ tests/unit/importers/jira-custom-types.test.ts (15 tests) 3ms

 Test Files  1 passed (1)
      Tests  15 passed (15)
```

**Test Coverage:**
- ✅ Standard JIRA types (Epic, Story, Bug, Task)
- ✅ Custom types ("L3 Feature", "L2 Epic", "Team Feature")
- ✅ Hierarchy mapping (Epic + Feature → feature-level)
- ✅ Real-world custom type examples

## Expected Behavior After Fix

### Before (v0.35.2)

```
.specweave/docs/internal/specs/
└── id/
    └── _orphans/                 ← All items orphaned!
        ├── us-007e-keycloak-poc.md  (ID-187 Epic as US file!)
        ├── us-026e-keycloak-spike.md (Child with parent ID-187)
        └── us-030e-spike.md (Child with parent ID-187)
```

### After (v0.35.3)

```
.specweave/docs/internal/specs/
└── id/
    ├── FS-020/                   ← Feature folder created!
    │   ├── FEATURE.md            (ID-187 Keycloak POC)
    │   ├── us-026e-keycloak-spike.md
    │   └── us-030e-spike.md
    └── FS-021/                   ← Other L3 Feature
        └── ...
```

## Migration for User

**No action required!** Just re-import:

```bash
cd /Users/anton.abyzov/Projects/col-all

# 1. Backup current orphans (optional)
mv .specweave/docs/internal/specs/id .specweave/docs/internal/specs/id-backup

# 2. Re-import with fixed SpecWeave
npm rebuild specweave  # Get latest version
specweave import-external --jira-only --since=all

# 3. Verify Feature folders created
ls -la .specweave/docs/internal/specs/id/
# Expected: FS-020/, FS-021/, etc. (no more _orphans/!)
```

## Files Modified

1. [src/importers/jira-importer.ts](src/importers/jira-importer.ts:407-421) - Flexible type matching
2. [src/core/types/sync-profile.ts](src/core/types/sync-profile.ts:236-243) - Added 'Feature' to hierarchy mapping
3. [tests/unit/importers/jira-custom-types.test.ts](../../tests/unit/importers/jira-custom-types.test.ts) - Regression test

## Version

- **Fixed in**: v0.35.3
- **Bug introduced**: v0.0.1 (original JIRA implementation)
- **Test coverage**: 15 tests covering standard and custom types

## Summary

The orphans problem was **NOT a folder structure bug** - it was a **type recognition bug**!

Your JIRA uses custom types like "L3 Feature" which weren't recognized by SpecWeave's exact string matching. The fix uses flexible keyword matching (`includes()`) to support custom organizational type naming conventions.

**All JIRA items with "Feature" in the type name will now create FS-XXX folders!** ✅
