# JIRA 2-Level Folder Structure Fix (v0.35.3)

## Problem Summary

Items with parent relationships were ending up in `_orphans/` folders despite having valid parents in JIRA.

**Example**:
- **ID-168** (child story) has parent **ID-187** (Epic) in JIRA
- After import: ID-168 ends up in `ID:332/id/_orphans/` instead of under its parent

## Root Cause

**Per-Board Importer Architecture (v0.35.2 - BROKEN)**:

1. Created ONE JiraImporter per board (e.g., Board 332, Board 401)
2. Each importer stamped items with its own `boardId` and `boardName`
3. When Board 332 importer found ID-168 with missing parent ID-187:
   - Called `fetchIssuesByKeys(['ID-187'])` using JQL search
   - Found ID-187 successfully
   - But stamped ID-187 with `boardId: 332, boardName: "Identity board"`
4. **PROBLEM**: ID-187 actually lives on Board 401 (Risk Board), not Board 332!
5. Grouping logic created folders based on board name
6. Parent (ID-187) and child (ID-168) ended up in different board folders
7. Result: Child went to `_orphans/` because parent not in same board folder

## Solution (v0.35.3)

**Per-Project Importer Architecture (FIXED)**:

### Changes Made

1. **[import-coordinator.ts:208-254]** - Create ONE importer per PROJECT (not per board)
   ```typescript
   // OLD (v0.35.2): One importer per board
   for (const boardMapping of mapping.boardMappings) {
     const importer = new JiraImporter(..., boardMapping.boardId, boardMapping.boardName);
   }

   // NEW (v0.35.3): One importer per project
   const boardMappings = mapping.boardMappings || [];
   const importer = new JiraImporter(..., projectKey, undefined, undefined, boardMappings);
   ```

2. **[jira-importer.ts:74]** - Added `boardMappings` parameter
   ```typescript
   private boardMappings?: Array<{
     boardId?: number;
     boardName: string;
     specweaveFolder: string
   }>;
   ```

3. **[jira-importer.ts:235-241]** - Don't use Board API in new mode
   ```typescript
   // Only use Board API if using DEPRECATED per-board mode
   if (this.boardId && !this.boardMappings) {
     yield* this.paginateByBoard(config);
     return;
   }
   // Otherwise: fetch from entire project using JQL
   ```

4. **[jira-importer.ts:580-584]** - Don't stamp board info in new mode
   ```typescript
   // Only stamp board info if using deprecated per-board mode
   jiraBoardId: this.boardMappings ? undefined : this.boardId,
   jiraBoardName: this.boardMappings ? undefined : this.boardName,
   ```

### How It Works Now

1. Create ONE JiraImporter per project (e.g., "ID")
2. Fetch ALL issues from project using JQL: `project = "ID"`
3. Leave `jiraBoardId` and `jiraBoardName` as `undefined`
4. Grouping logic puts items in `ID/default/` folder (not `_orphans/`)
5. Parent-child relationships preserved because both in same project

### Trade-offs

**✅ FIXED**:
- Parent-child relationships now work correctly
- No more `_orphans/` for items with valid parents
- Cross-board parent detection works

**⚠️ TEMPORARY LIMITATION**:
- All items go to `{project}/default/` folder (not board-specific folders)
- Board-level grouping disabled for now
- Future enhancement: Implement proper board detection via JIRA API

## Testing

```bash
cd /Users/anton.abyzov/Projects/col-all
specweave import

# Expected result:
# - ID-168 and ID-187 both in ID/default/FS-XXX/
# - Parent-child hierarchy preserved
# - No _orphans/ folders (unless truly orphaned)
```

## Migration Path

**Existing users (v0.35.2 or earlier)**:
- Automatic - next import will use new architecture
- Existing imported items unchanged
- Re-run import to reorganize into new structure

**Board-specific folders (future)**:
- Option 1: Query JIRA Agile API to detect board membership per issue
- Option 2: Use Epic/Feature-based grouping instead of boards
- Option 3: Allow user to manually specify board per Epic in config

## Files Modified

- [src/importers/import-coordinator.ts](src/importers/import-coordinator.ts:208-254) - Per-project importer creation
- [src/importers/jira-importer.ts](src/importers/jira-importer.ts:74,235-241,580-584) - Board detection mode
- [src/cli/helpers/init/external-import.ts](src/cli/helpers/init/external-import.ts:413) - Pass boardMappings

## Related Issues

- User report: "ultrathink why all of those stories are still in orphans folder?"
- Root cause: Per-board importer architecture (v0.35.2)
- Fix version: v0.35.3
