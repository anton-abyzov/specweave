---
id: US-006
feature: FS-119
title: Auto-Sync Living Docs After Increment Creation/Update (P1)
status: completed
priority: P1
created: 2025-12-07
project: specweave
external:
  github:
    issue: 852
    url: https://github.com/anton-abyzov/specweave/issues/852
---

# US-006: Auto-Sync Living Docs After Increment Creation/Update (P1)

**Feature**: [FS-119](./FEATURE.md)

**As a** user creating or updating increments
**I want** living docs to be automatically synced after `/specweave:increment` completes
**So that** `internal/specs/` folders are always in sync with increments without manual commands

---

## Acceptance Criteria

- [x] **AC-US6-01**: After increment creation, AUTOMATICALLY trigger `syncIncrement()`
- [x] **AC-US6-02**: After increment spec.md update, AUTOMATICALLY trigger sync
- [x] **AC-US6-03**: Sync creates `FS-XXX/` folder with `FEATURE.md` and `us-*.md` files
- [x] **AC-US6-04**: Sync respects project/board for correct folder placement
- [x] **AC-US6-05**: Sync output shows what was created/updated
- [x] **AC-US6-06**: Sync errors are NON-BLOCKING but clearly reported
- [x] **AC-US6-07**: External tool sync (GitHub/JIRA/ADO) triggers if enabled in config

---

## Implementation

**Increment**: [0119-project-board-context-enforcement](../../../../increments/0119-project-board-context-enforcement/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-009**: Add post-increment-planning hook to trigger living docs sync 🧠
- [x] **T-010**: Update increment-planner SKILL.md to invoke sync after creation 🧠
- [x] **T-011**: Add external tool sync trigger after living docs sync 🧠
