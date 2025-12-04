---
id: US-001
feature: FS-096
title: "Fix board placement to use area path"
status: completed
priority: P0
created: 2024-12-03
---

# US-001: Fix board placement to use area path

**Feature**: [FS-096](./FEATURE.md)

**As a** user importing from ADO
**I want** boards derived from area path, not item title
**So that** the folder structure matches ADO organization

---

## Acceptance Criteria

- [x] **AC-US1-01**: `projectId` in `groupAdoItemsByParentHierarchy()` uses area path leaf segment
- [x] **AC-US1-02**: Boards appear inside project folder: `specs/{project}/{board}/`
- [x] **AC-US1-03**: Multiple items with same area path grouped together

---

## Implementation

**Increment**: [0096-ado-import-fixes](../../../../../increments/0096-ado-import-fixes/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
