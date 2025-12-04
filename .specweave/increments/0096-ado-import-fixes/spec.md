---
increment: 0096-ado-import-fixes
type: bug-fix
priority: P0
status: completed
created: 2024-12-03
---

# ADO Import Fixes

## Problem Statement

Testing of increment 0095 revealed several issues with ADO import:

### Bug 1: Boards at root specs level
Boards like `ai-platform`, `inventory` appear at `specs/` root instead of inside the project folder (`specs/acme/`).

**Root Cause**: In `groupAdoItemsByParentHierarchy()` line 173, the `projectId` is derived from the parent item's **title** instead of the **area path**:
```typescript
const projectId = normalizeToProjectId(parentItem.title) || ...
// Creates: specs/acme/software-maintenance-for-financial-year-26/
// Should be: specs/acme/digital-service-operations/
```

### Bug 2: Feature title is generic
Feature folder shows "Feature: Imported from Azure DevOps" instead of the actual Capability/Epic title.

**Root Cause**: In `createFeatureFolder()` lines 819-825, `isAdoFeatureGroup` checks if `groupKey.startsWith('feature:')`, but for epic groups the key is `epic:...`, so the title defaults to generic.

### Bug 3: No external link in FEATURE.md
FEATURE.md has no link to the external ADO item.

**Root Cause**: Same as Bug 2 - `externalLink` is only set when `isAdoFeatureLevelItem` is true.

### Bug 4: ADO Tasks imported as files
ADO Tasks (1st level in hierarchy) are being imported as separate user story files instead of being checkboxes in their parent User Story.

**Root Cause**: No filter to exclude Task work item type from file creation.

## Correct Structure

```
specs/
├── acme/                           # Project (from ADO project name)
│   ├── _epics/                         # Per-project epics (v0.30.3)
│   │   ├── EP-001E/                    # ADO Capability
│   │   └── EP-002E/                    # ADO Epic (3rd level)
│   └── digital-service-operations/     # Board (from ADO area path)
│       ├── FS-001E/                    # Feature for Capability EP-001E's items
│       │   ├── FEATURE.md              # With actual Capability title
│       │   ├── us-001e-xxx.md          # User Stories
│       │   └── us-002e-xxx.md
│       └── FS-002E/
└── another-project/
```

## User Stories

### US-001: Fix board placement to use area path
**As a** user importing from ADO
**I want** boards derived from area path, not item title
**So that** the folder structure matches ADO organization

**Acceptance Criteria:**
- [x] **AC-US1-01**: `projectId` in `groupAdoItemsByParentHierarchy()` uses area path leaf segment
- [x] **AC-US1-02**: Boards appear inside project folder: `specs/{project}/{board}/`
- [x] **AC-US1-03**: Multiple items with same area path grouped together

### US-002: Fix feature title for epic-group features
**As a** user viewing imported features
**I want** FEATURE.md to show the actual ADO item title
**So that** I can identify what the feature represents

**Acceptance Criteria:**
- [x] **AC-US2-01**: Epic-group features use the parent item's title
- [x] **AC-US2-02**: External link points to ADO item URL
- [x] **AC-US2-03**: Work item type label is preserved (Capability/Epic)

### US-003: Filter ADO Tasks from file creation
**As a** user importing from ADO
**I want** Tasks to become checkboxes in User Stories, not separate files
**So that** the hierarchy matches SpecWeave conventions

**Acceptance Criteria:**
- [x] **AC-US3-01**: Work item type "Task" is filtered from file creation
- [x] **AC-US3-02**: Tasks are stored as metadata for User Story checkbox generation
- [x] **AC-US3-03**: Existing task checkbox format from increment 0095 is used

## Files to Modify

1. `src/cli/helpers/init/external-import-grouping.ts` - Fix projectId derivation
2. `src/importers/item-converter.ts` - Fix feature title for epic groups
3. `src/importers/item-converter.ts` - Filter ADO Tasks
