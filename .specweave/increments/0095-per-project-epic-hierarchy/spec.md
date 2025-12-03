---
increment: 0095-per-project-epic-hierarchy
type: bug-fix
priority: P0
status: completed
created: 2024-12-03
---

# Per-Project Epic Hierarchy Fix

## Problem Statement

Current implementation has two critical bugs in epic folder placement:

### Bug 1: Root-level `_epics/` instead of per-project
Currently `EpicIdAllocator` creates epics at:
```
specs/_epics/EP-XXX/     ← WRONG (root level)
```

Should be:
```
specs/{project}/_epics/EP-XXX/    ← CORRECT (per-project)
```

### Bug 2: Epic folders created in board directories
`ItemConverter.allocateFeatureForGroup()` returns `epicId` (e.g., `EP-086E`) which is then used as `featureId` in `convertItem()`, causing:
```
specs/acme/digital-service-operations/EP-086E/    ← WRONG
```

Epic folders should NEVER exist in board/area directories. Only `_epics/` folder.

## Correct Hierarchy Structure

### SpecWeave 5-Level Hierarchy (aligns with ADO SAFe)

| Level | ADO Term | JIRA Term | SpecWeave Location |
|-------|----------|-----------|-------------------|
| 5 | Capability | - | `parent/_epics/EP-XXX/` (if parent project exists) |
| 4 | Epic | Epic | `{project}/_epics/EP-XXX/` |
| 3 | Feature | Story/Feature | `{project}/{board}/FS-XXX/FEATURE.md` |
| 2 | User Story | Sub-task | `{project}/{board}/FS-XXX/us-yyy.md` |
| 1 | Task | - | Checkboxes in User Story description |

### Directory Structure Example

```
.specweave/docs/internal/specs/
├── acme/                          # Project folder
│   ├── _epics/                        # Epics for THIS project
│   │   ├── EP-086E/
│   │   │   └── EPIC.md
│   │   └── EP-087E/
│   │       └── EPIC.md
│   ├── digital-service-operations/    # Board/area folder
│   │   ├── _archive/                  # Archived features
│   │   ├── FS-001E/
│   │   │   ├── FEATURE.md             # epic_id: EP-086E (reference)
│   │   │   ├── us-001e-title.md
│   │   │   └── us-002e-title.md
│   │   └── FS-002E/
│   │       └── ...
│   └── another-board/
│       └── FS-003E/
│           └── ...
├── parent/                            # Optional parent project
│   └── _epics/                        # Cross-project epics (Capabilities)
│       └── EP-100E/
│           └── EPIC.md
└── another-project/
    ├── _epics/
    └── board-name/
```

### Key Rules

1. **`_epics/` is per-project** - Each project folder has its own `_epics/` subfolder
2. **Epic reference via `epic_id`** - Features reference their parent epic via frontmatter field
3. **User Stories in feature folders** - US files go in `FS-XXX/`, NEVER in `_epics/`
4. **Tasks as checkboxes** - Tasks are checkboxes in User Story description (like GitHub issues)
5. **No epic folders in board directories** - Board directories contain ONLY `FS-XXX` folders and `_archive`

### Task-to-Checkbox Mapping (Import Flow)

When importing from external tools:
1. External User Story → `FS-XXX/us-yyy.md`
2. External Tasks (children of US) → Checkboxes in US description:
   ```markdown
   ## Tasks
   - [ ] T-001: Add skipValidation parameter
   - [ ] T-002: Update bulk discovery caller
   - [x] T-003: Fix "Create on GitHub?" prompt
   ```

When syncing from increment to living docs:
1. Increment tasks map 1:1 to imported task checkboxes
2. US description updated with task completion status

## User Stories

### US-001: Per-Project Epic Folder Structure
**As a** user importing from ADO/JIRA
**I want** epics stored in `{project}/_epics/` folders
**So that** epics are organized per-project, not globally

**Acceptance Criteria:**
- [x] **AC-US1-01**: `EpicIdAllocator` creates epics in `{project}/_epics/EP-XXX/`
- [x] **AC-US1-02**: Each project can have its own `_epics/` folder
- [x] **AC-US1-03**: Parent project (if configured) has its own `_epics/` for Capabilities
- [x] **AC-US1-04**: Epic collision detection works per-project (not global)

### US-002: Fix Epic Folder Misplacement Bug
**As a** user importing from ADO
**I want** epic folders to NEVER appear in board directories
**So that** hierarchy is clean and consistent

**Acceptance Criteria:**
- [x] **AC-US2-01**: `allocateFeatureForGroup()` does NOT return epic IDs as feature IDs
- [x] **AC-US2-02**: User stories from epic groups go to appropriate feature folders
- [x] **AC-US2-03**: No `EP-XXX/` folders created in `{project}/{board}/` directories
- [x] **AC-US2-04**: ~~Existing misplaced `EP-XXX/` folders in board dirs are identified for cleanup~~ (OUT OF SCOPE - manual cleanup)

### US-003: Feature-to-Epic Reference
**As a** user viewing feature specs
**I want** features to reference their parent epic via `epic_id` field
**So that** I can navigate the hierarchy

**Acceptance Criteria:**
- [x] **AC-US3-01**: FEATURE.md frontmatter includes `epic_id: EP-XXX` when parent exists
- [x] **AC-US3-02**: `epic_id` is optional (features can exist without parent epic)
- [x] **AC-US3-03**: Epic reference path is relative: `../../_epics/EP-XXX/EPIC.md`

### US-004: Task Checkbox Format for User Stories
**As a** user importing User Stories with Tasks
**I want** tasks rendered as checkboxes in US description
**So that** I can track task completion like GitHub issues

**Acceptance Criteria:**
- [x] **AC-US4-01**: Imported tasks become `## Tasks` section with checkboxes
- [x] **AC-US4-02**: Task format: `- [ ] T-XXX: Task title`
- [x] **AC-US4-03**: Completed tasks show `- [x] T-XXX: Task title`
- [x] **AC-US4-04**: ~~Increment sync updates checkbox status 1:1~~ (OUT OF SCOPE - requires separate sync implementation)

## Files to Modify

### Core Changes
1. `src/living-docs/epic-id-allocator.ts` - Per-project epic paths
2. `src/importers/item-converter.ts` - Fix epic/feature separation
3. `src/core/living-docs/hierarchy-mapper.ts` - Per-project epic detection

### Supporting Changes
4. `src/importers/markdown-generator.ts` - Task checkbox generation
5. `src/core/living-docs/feature-archiver.ts` - Per-project epic archive paths

## Out of Scope

- Migration of existing root-level `_epics/` to per-project (manual or separate increment)
- Cleanup of misplaced `EP-XXX/` folders in board directories (manual)
- Multi-repo global epic collision detection (keep per-project for now)

## Technical Design

### EpicIdAllocator Changes

```typescript
// BEFORE (root level)
this.epicsPath = path.join(this.specsPath, '_epics');

// AFTER (per-project)
this.epicsPath = path.join(this.specsPath, projectId, '_epics');
```

Constructor needs `projectId` parameter:
```typescript
constructor(
  projectRoot: string,
  projectId: string,  // NEW: required project ID
  options?: EpicIdAllocatorOptions
)
```

### ItemConverter Changes

```typescript
// BEFORE: Returns epicId which is used as featureId (BUG)
if (isEpicGroup) {
  const epicId = await this.epicIdAllocator.allocateId(epicItem);
  return epicId;  // ← This is returned and used to create folder!
}

// AFTER: Epic creation is separate, return undefined for epic groups
if (isEpicGroup) {
  await this.createEpicInProjectFolder(epicItem);
  return undefined;  // ← User stories need feature folder, not epic folder
}
```

For epic groups, child items (User Stories) should:
1. Get allocated to a NEW feature folder (FS-XXXE)
2. Feature folder references parent epic via `epic_id` in frontmatter
3. User stories go into that feature folder

### HierarchyMapper Changes

```typescript
// Epic archive path (per-project)
async isEpicArchived(epicId: string, projectId: string): Promise<boolean> {
  const archivePath = path.join(
    this.config.specsBaseDir,
    projectId,           // ← Project folder
    '_epics',
    '_archive',
    epicId
  );
  return await fs.pathExists(archivePath);
}
```

## Testing Strategy

1. **Unit Tests**: Epic path generation, feature-epic separation
2. **Integration Tests**: Full import flow with ADO hierarchy
3. **Manual Verification**: Import from acme project, verify structure
