---
id: US-003
feature: FS-078
title: "Sort Imported Items by Area Path"
status: in_progress
priority: P0
created: 2025-11-28
---

# US-003: Sort Imported Items by Area Path

**Feature**: [FS-078](./FEATURE.md)

**As a** developer with area-path-based organization
**I want** imported work items to be sorted into area path folders
**So that** the import respects my team structure

---

## Acceptance Criteria

- [x] **AC-US3-01**: Work items grouped by `System.AreaPath` field
- [x] **AC-US3-02**: Each area path gets its own subfolder under project
- [x] **AC-US3-03**: Structure: `specs/{project}/{area-path}/FS-XXX/US-XXX.md`

---

## Implementation

**Increment**: [0078-ado-init-validation-critical-fixes](../../../../../../increments/_archive/0078-ado-init-validation-critical-fixes/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-006**: Fix area path extraction in grouping
- [x] **T-007**: Create subfolders per area path
