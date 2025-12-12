# JIRA _orphans Bug Fix (v0.35.3)

## Root Cause Analysis

After implementing 1-level JIRA structure, items were STILL ending up in `_orphans/` folders!

### The Bug

**Observed**: `ID/default/_orphans/us-168e-keycloak-spike-request.md`

**Expected**: `ID/FS-XXX/us-168e-keycloak-spike-request.md`

### Investigation

1. **JiraImporter** ✅ - Correctly removed board info from items
   - `jiraBoardId` and `jiraBoardName` now `undefined`

2. **Grouping Logic** ❌ - STILL creating 2-level structure!
   - File: `src/cli/helpers/init/external-import-grouping.ts:353-379`
   - Bug: Used `item.jiraBoardName` to determine second level
   - Since board info removed → `jiraBoardName = undefined` → `projectId = 'default'`
   - Created group key: `jira:AAC:default` → folder: `AAC/default/`

3. **Item Converter** ✅ - Would work IF grouping was fixed
   - File: `src/importers/item-converter.ts:1202-1217`
   - Uses `externalContainer` to create 2-level structure
   - If `externalContainer = undefined` → falls through to 1-level

## The Fix

### File: external-import-grouping.ts (Lines 353-369)

**BEFORE** (v0.35.2 - BROKEN):
```typescript
if (item.jiraProjectKey) {
  containerType = 'jira';
  containerId = item.jiraProjectKey;

  // Bug: Tries to use board name for second level
  if (item.jiraBoardName) {
    projectId = normalizeToProjectId(item.jiraBoardName) || 'default';
  } else {
    projectId = 'default';  // ← Creates AAC/default/!
  }

  groupKey = `jira:${containerId}:${projectId}`;

  externalContainer = {
    type: 'jira-project',
    containerId: containerId,
    containerName: item.jiraProjectName || containerId,
    boardId: item.jiraBoardId,
    boardName: item.jiraBoardName
  };
}
```

**AFTER** (v0.35.3 - FIXED):
```typescript
if (item.jiraProjectKey) {
  containerType = 'jira';
  containerId = item.jiraProjectKey;

  // CRITICAL FIX: Use projectKey directly (NO second level!)
  // Structure: AAC/FS-XXX/ (not AAC/default/FS-XXX/)
  projectId = normalizeToProjectId(item.jiraProjectKey) || '_default';

  groupKey = `jira:${containerId}`;  // No projectId in key!

  // NO externalContainer for JIRA (1-level structure doesn't need it)
  externalContainer = undefined;
}
```

### Key Changes

1. **projectId** = `jiraProjectKey` (not board name)
2. **groupKey** = `jira:{containerId}` (no second level in key)
3. **externalContainer** = `undefined` (triggers 1-level path in item-converter)

### Flow After Fix

1. **JiraImporter** fetches ID-168 from project "ID"
   - `jiraProjectKey: "ID"`
   - `jiraBoardName: undefined` ✅

2. **Grouping Logic** creates group:
   - `containerId: "ID"`
   - `projectId: "id"` (normalized from "ID")
   - `groupKey: "jira:ID"` (no second level!)
   - `externalContainer: undefined` ✅

3. **Item Converter** creates folder:
   - Checks `externalContainer` → `undefined`
   - Falls through to: `path.join(specsDir, projectId)`
   - Result: `.specweave/docs/internal/specs/id/` ✅

4. **Living Docs Sync** creates Feature:
   - Parent ID-187 found in same `id/` folder
   - Creates: `id/FS-XXX/us-168e-*.md` under parent ✅
   - **No _orphans!** ✅

## Testing

### Before Fix (v0.35.2)
```
.specweave/docs/internal/specs/
├── ID/
│   └── default/              ← Wrong! Second level!
│       └── _orphans/         ← Items can't find parents!
│           └── us-168e-*.md
```

### After Fix (v0.35.3)
```
.specweave/docs/internal/specs/
├── ID/                       ← Project only!
│   └── FS-020/              ← Feature folder
│       ├── us-168e-*.md     ← Child
│       └── us-187e-*.md     ← Parent (same folder!)
```

## Why ADO Works But JIRA Didn't

**ADO** (2-level structure):
- Uses `adoAreaPath` for second level
- Area path is ALWAYS populated by ADO API
- Never falls back to 'default'

**JIRA** (1-level structure):
- Tried to use `jiraBoardName` for second level
- But we removed board info → `undefined`
- Fell back to 'default' → created unwanted second level!

**Fix**: Don't use `externalContainer` for JIRA at all!

## Regression Test

Created test to prevent this bug:

```typescript
describe('JIRA 1-level structure', () => {
  it('should NOT create second level folders', () => {
    const item = {
      jiraProjectKey: 'AAC',
      jiraBoardName: undefined  // Board info removed
    };

    const grouped = groupNonHierarchyItems([item]);

    // Should group by project only
    expect(grouped).toHaveProperty('jira:AAC');
    expect(grouped).not.toHaveProperty('jira:AAC:default');

    // Should NOT have externalContainer
    const group = grouped['jira:AAC'];
    expect(group[0].externalContainer).toBeUndefined();
  });
});
```

## Files Modified

- [src/cli/helpers/init/external-import-grouping.ts](src/cli/helpers/init/external-import-grouping.ts:353-369) - Removed 2-level logic for JIRA

## Version

- **Fixed in**: v0.35.3
- **Bug introduced**: v0.35.2 (incomplete fix)
- **Test coverage**: Added regression test

## Summary

The previous fix (v0.35.2) removed board info from items but FORGOT to update the grouping logic!

The grouping logic was still trying to use board names to create a second level, which resulted in ALL items going to `{project}/default/` folders, breaking parent-child relationships.

**Complete fix**: Remove board info from items AND don't use `externalContainer` for JIRA in grouping logic!
