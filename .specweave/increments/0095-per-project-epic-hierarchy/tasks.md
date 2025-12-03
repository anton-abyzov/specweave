# Tasks: Per-Project Epic Hierarchy Fix

## Overview
Fix epic folder placement to be per-project and prevent epic folders in board directories.

---

### T-001: Update EpicIdAllocator for per-project paths
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-04
**Status**: [x] completed

**Description**:
Modify `EpicIdAllocator` constructor to accept `projectId` parameter and create epics in `{project}/_epics/` instead of root `_epics/`.

**Changes**:
- Add `projectId` parameter to constructor
- Update `epicsPath` calculation: `path.join(specsPath, projectId, '_epics')`
- Update `scanExistingIds()` to scan per-project epics
- Update `createEpicFolder()` to use per-project path

**File**: `src/living-docs/epic-id-allocator.ts`

---

### T-002: Fix ItemConverter epic/feature separation
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03
**Status**: [x] completed

**Description**:
Fix `allocateFeatureForGroup()` to NOT return epic IDs as feature IDs. Epic groups should create epics in `_epics/` but return a feature ID for user story placement.

**Changes**:
- Separate epic creation from feature allocation
- For `epic:` groups: create epic, then allocate FS-ID for child items
- Return FS-XXXE for user story folder, NOT EP-XXXE
- Add `epic_id` reference to created feature folders

**File**: `src/importers/item-converter.ts`

---

### T-003: Update HierarchyMapper for per-project epics
**User Story**: US-001
**Satisfies ACs**: AC-US1-02, AC-US1-03
**Status**: [x] completed

**Description**:
Update `HierarchyMapper` methods to handle per-project epic paths.

**Changes**:
- Update `isEpicArchived()` to accept `projectId`
- Update `getAllEpicFolders()` to scan per-project
- Update epic path references throughout

**File**: `src/core/living-docs/hierarchy-mapper.ts`

---

### T-004: Add epic_id field to FEATURE.md generation
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03
**Status**: [x] completed

**Description**:
Update feature folder creation to include `epic_id` field when parent epic exists.

**Changes**:
- Add `epic_id` to FEATURE.md frontmatter
- Generate relative path link to epic: `../../_epics/EP-XXX/EPIC.md`
- Make `epic_id` optional (features can exist without parent)

**File**: `src/importers/item-converter.ts` (createFeatureFolder method)

---

### T-005: Add task checkbox format to User Story markdown
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03
**Status**: [x] completed

**Description**:
Update `MarkdownGenerator` to render child tasks as checkboxes in User Story description.

**Changes**:
- Add `## Tasks` section generation
- Format: `- [ ] T-XXX: Task title` or `- [x] T-XXX: Task title`
- Handle task status mapping from external tools

**File**: `src/importers/markdown-generator.ts`

---

### T-006: Update unit tests for per-project epics
**User Story**: US-001, US-002
**Satisfies ACs**: AC-US1-01, AC-US2-01
**Status**: [x] completed

**Description**:
Update existing tests and add new tests for per-project epic paths.

**Changes**:
- Update `epic-id-allocator.test.ts` for projectId parameter
- Add tests for epic path generation
- Add tests for feature-epic separation in ItemConverter

**Files**: `tests/unit/epic-id-allocator.test.ts`, `tests/unit/item-converter.test.ts`

---

### T-007: Build and verify
**User Story**: All
**Satisfies ACs**: All
**Status**: [x] completed

**Description**:
Build project and run all tests to verify changes.

**Commands**:
```bash
npm run rebuild
npm test
```

---

## Completion Checklist

- [x] T-001: EpicIdAllocator per-project paths
- [x] T-002: ItemConverter epic/feature separation
- [x] T-003: HierarchyMapper per-project epics
- [x] T-004: epic_id field in FEATURE.md
- [x] T-005: Task checkbox format
- [x] T-006: Unit tests updated
- [x] T-007: Build and verify
