---
id: US-002
feature: FS-095
title: "Fix Epic Folder Misplacement Bug"
status: completed
priority: P0
created: 2024-12-03
---

**Origin**: 🏠 **Internal**


# US-002: Fix Epic Folder Misplacement Bug

**Feature**: [FS-095](./FEATURE.md)

**As a** user importing from ADO
**I want** epic folders to NEVER appear in board directories
**So that** hierarchy is clean and consistent

---

## Acceptance Criteria

- [x] **AC-US2-01**: `allocateFeatureForGroup()` does NOT return epic IDs as feature IDs
- [x] **AC-US2-02**: User stories from epic groups go to appropriate feature folders
- [x] **AC-US2-03**: No `EP-XXX/` folders created in `{project}/{board}/` directories
- [ ] **AC-US2-04**: ~~Existing misplaced `EP-XXX/` folders in board dirs are identified for cleanup~~ (OUT OF SCOPE - manual cleanup)

---

## Implementation

**Increment**: [0095-per-project-epic-hierarchy](../../../../../increments/0095-per-project-epic-hierarchy/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] [T-002](../../../../../increments/0095-per-project-epic-hierarchy/tasks.md#T-002): Fix ItemConverter epic/feature separation