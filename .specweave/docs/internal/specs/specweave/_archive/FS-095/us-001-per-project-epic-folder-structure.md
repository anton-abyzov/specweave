---
id: US-001
feature: FS-095
title: "Per-Project Epic Folder Structure"
status: completed
priority: P0
created: 2024-12-03
---

**Origin**: 🏠 **Internal**


# US-001: Per-Project Epic Folder Structure

**Feature**: [FS-095](./FEATURE.md)

**As a** user importing from ADO/JIRA
**I want** epics stored in `{project}/_epics/` folders
**So that** epics are organized per-project, not globally

---

## Acceptance Criteria

- [x] **AC-US1-01**: `EpicIdAllocator` creates epics in `{project}/_epics/EP-XXX/`
- [x] **AC-US1-02**: Each project can have its own `_epics/` folder
- [x] **AC-US1-03**: Parent project (if configured) has its own `_epics/` for Capabilities
- [x] **AC-US1-04**: Epic collision detection works per-project (not global)

---

## Implementation

**Increment**: [0095-per-project-epic-hierarchy](../../../../../increments/0095-per-project-epic-hierarchy/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] [T-001](../../../../../increments/0095-per-project-epic-hierarchy/tasks.md#T-001): Update EpicIdAllocator for per-project paths
- [x] [T-003](../../../../../increments/0095-per-project-epic-hierarchy/tasks.md#T-003): Update HierarchyMapper for per-project epics
- [x] [T-006](../../../../../increments/0095-per-project-epic-hierarchy/tasks.md#T-006): Update unit tests for per-project epics