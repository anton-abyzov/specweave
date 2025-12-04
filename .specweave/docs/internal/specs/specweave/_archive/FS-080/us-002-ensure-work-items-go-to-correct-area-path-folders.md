---
id: US-002
feature: FS-080
title: "Ensure Work Items Go to Correct Area Path Folders"
status: completed
priority: P0
created: 2025-11-29
---

# US-002: Ensure Work Items Go to Correct Area Path Folders

**Feature**: [FS-080](./FEATURE.md)

**As a** developer importing ADO work items
**I want** items organized into their actual area path folders
**So that** folder structure matches my ADO organization

---

## Acceptance Criteria

- [x] **AC-US2-01**: Items with `adoAreaPath` go to `specs/{project}/{areaLeaf}/FS-XXX/`
- [x] **AC-US2-02**: Items without area path go to `specs/{project}/_default/FS-XXX/`
- [x] **AC-US2-03**: Area path extraction uses leaf segment (after last `\`)
- [x] **AC-US2-04**: Folder structure preview shows correct paths during init

---

## Implementation

**Increment**: [0080-ado-folder-naming-fix](../../../../../../increments/_archive/0080-ado-folder-naming-fix/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-005**: Verify Work Item Placement
- [x] **T-006**: Build and Test
