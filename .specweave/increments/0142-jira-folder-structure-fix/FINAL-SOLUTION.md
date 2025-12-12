# JIRA 1-Level Structure - Final Solution (v0.35.3)

## Executive Summary

**CRITICAL ARCHITECTURAL SIMPLIFICATION**: Removed JIRA board-based folders entirely.

**New Structure**: `AAC/FS-XXX/us-xxx.md` (not `AAC/ancillary-apps-cc-board/FS-XXX/`)

**Why**: JIRA boards are VIEWS/FILTERS over project data, NOT organizational units!

## The Fundamental Insight

JIRA boards are just **filtered views** of the same project data:
- An Epic can appear on MULTIPLE boards simultaneously
- Boards are Scrum/Kanban workflow views, not organizational structure
- Trying to create folders per board = architectural mismatch!

## Correct Mapping

**1-Level Structure**:
```
JIRA Project → SpecWeave Project (1:1)
```

**Folder Structure**:
```
.specweave/docs/internal/specs/
├── AAC/                    ← JIRA project "AAC"
│   ├── FS-001/
│   │   └── us-xxx.md
│   └── FS-002/
├── DMC/                    ← JIRA project "DMC"
│   └── FS-010/
└── ID/                     ← JIRA project "ID"
    └── FS-020/
```

**NO board level!** All issues from a JIRA project go into one SpecWeave project folder.

## Why NOT 2-Level?

Researched JIRA hierarchy:
- JIRA has NO level above Project (except rare Enterprise Portfolio/Themes)
- Board is NOT a hierarchy level - it's a view!
- Feature/Epic/Story are WITHIN projects, not above them

**Sources**:
- [Understanding Jira Hierarchy: Complete Guide in 2025](https://community.atlassian.com/forums/App-Central-articles/Understanding-Jira-Hierarchy-Complete-Guide-in-2025/ba-p/2947722)
- [Jira Hierarchy Explained With Best Practice Usage Tips](https://www.visor.us/blog/thinking-tactically-about-jira-issue-hierarchy/)
- [How to set up hierarchy with Epic → Story/Feature → Task → Sub-task](https://community.atlassian.com/forums/Jira-questions/How-to-set-up-hierarchy-with-Epic-Story-Feature-Task-Sub-task-in/qaq-p/3091938)

## Code Changes

### 1. Init Flow - Removed Board Selection

**[src/cli/helpers/issue-tracker/jira.ts:463-483]**
```typescript
// BEFORE (v0.35.2):
let selectedBoards = await selectBoards(boards, projectKey);
projectConfigs.push({
  key: projectKey,
  boards: selectedBoards,  // ❌ Board selection
});

// AFTER (v0.35.3):
// CRITICAL SIMPLIFICATION: Remove board selection
// JIRA boards are just VIEWS/FILTERS - not organizational units!
projectConfigs.push({
  key: projectKey,
  // boards: REMOVED - not needed!
});
```

### 2. Sync Config - No Boards

**[src/cli/helpers/issue-tracker/sync-config-writer.ts:247-261]**
```typescript
// BEFORE:
config: {
  domain,
  projectKey: projConfig.key,
  boards: dedupedBoards,  // ❌ Board mappings
  strategy: 'project-per-team'
}

// AFTER:
config: {
  domain,
  projectKey: projConfig.key,
  // boards: REMOVED
  // strategy: REMOVED (legacy field)
}
```

### 3. Import Coordinator - One Importer Per Project

**[src/importers/import-coordinator.ts:208-249]**
```typescript
// BEFORE (v0.35.2): One importer per board
for (const boardMapping of mapping.boardMappings) {
  const importer = new JiraImporter(..., boardMapping.boardId, boardMapping.boardName);
}

// AFTER (v0.35.3): One importer per project
for (const mapping of projectMappings) {
  const importer = new JiraImporter(
    host,
    email,
    apiToken,
    mapping.projectKey  // Fetch all issues from project
  );
}
```

### 4. JiraImporter - Simplified Constructor

**[src/importers/jira-importer.ts:68-94]**
```typescript
// BEFORE:
constructor(
  host, email, apiToken, projectKey,
  boardId?, boardName?, boardMappings?  // ❌ Board parameters
)

// AFTER:
constructor(
  host, email, apiToken, projectKey  // ✅ Project only!
)
```

### 5. Removed Board API Pagination

**[src/importers/jira-importer.ts:229-231]**
```typescript
// BEFORE: Route to Board API
if (this.boardId && !this.boardMappings) {
  yield* this.paginateByBoard(config);  // ❌ Board API
}

// AFTER: Always use JQL
// CRITICAL SIMPLIFICATION: Always use JQL search (no Board API)
// JIRA boards are views, not organizational structure
```

### 6. Removed paginateByBoard() Method

**Deleted 100 lines**: Entire `paginateByBoard()` method removed!

### 7. No Board Info in Items

**[src/importers/jira-importer.ts:568-574]**
```typescript
// BEFORE:
jiraBoardId: this.boardMappings ? undefined : this.boardId,
jiraBoardName: this.boardMappings ? undefined : this.boardName,

// AFTER:
// CRITICAL SIMPLIFICATION: Board info removed completely
// No jiraBoardId or jiraBoardName - 1-level structure only!
```

## Files Modified

- [src/cli/helpers/issue-tracker/jira.ts](src/cli/helpers/issue-tracker/jira.ts) - Removed board selection
- [src/cli/helpers/issue-tracker/sync-config-writer.ts](src/cli/helpers/issue-tracker/sync-config-writer.ts) - No boards in config
- [src/importers/import-coordinator.ts](src/importers/import-coordinator.ts) - One importer per project
- [src/importers/jira-importer.ts](src/importers/jira-importer.ts) - Simplified constructor, removed Board API

## Benefits

✅ **Parent-child relationships work** - all items from same project in one folder
✅ **No more `_orphans/`** - cross-board parents found correctly
✅ **Simpler architecture** - no complex board detection logic
✅ **Faster imports** - JQL search more efficient than Board API
✅ **Cleaner code** - removed 200+ lines of deprecated board logic

## Testing

```bash
cd /Users/anton.abyzov/Projects/col-all
npm run rebuild  # Get latest SpecWeave

# Run import
specweave import

# Expected structure:
.specweave/docs/internal/specs/
├── AAC/FS-XXX/us-xxx.md     ← All AAC items
├── DMC/FS-XXX/us-xxx.md     ← All DMC items
└── ID/FS-XXX/us-xxx.md      ← All ID items (including ID-168 and ID-187!)
```

## Migration

**Existing users**: Automatic on next import!
- Config still works (boards field ignored)
- Re-import to reorganize into new structure
- Old board-based folders remain (manual cleanup optional)

## Future Enhancements

If users want sub-folders within projects, use:
- **Epic-based grouping**: `AAC/epic-authentication/FS-XXX/`
- **Component-based**: `AAC/frontend/FS-XXX/`
- **Status-based**: `AAC/in-progress/FS-XXX/`

NOT board-based (boards are views, not structure)!

## Version

- **Fixed in**: v0.35.3
- **Replaces**: v0.35.2 (per-board architecture)
- **Breaking change**: NO (backwards compatible, boards just ignored)
