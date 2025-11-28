---
id: US-003
feature: FS-078
title: "Sort Imported Items by Area Path"
status: not_started
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

- [ ] **AC-US3-01**: Work items grouped by `System.AreaPath` field
- [ ] **AC-US3-02**: Each area path gets its own subfolder under project
- [ ] **AC-US3-03**: Structure: `specs/{project}/{area-path}/FS-XXX/US-XXX.md`
- [ ] **AC-US3-04**: Items without area path go to `_default/` folder
- [ ] **AC-US3-05**: Preview shows count per area path before import

---

## Implementation

**Increment**: [0078-ado-init-validation-critical-fixes](../../../../increments/0078-ado-init-validation-critical-fixes/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
