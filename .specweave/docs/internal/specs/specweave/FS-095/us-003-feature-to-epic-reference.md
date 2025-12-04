---
id: US-003
feature: FS-095
title: "Feature-to-Epic Reference"
status: completed
priority: P0
created: 2024-12-03
---

**Origin**: 🏠 **Internal**


# US-003: Feature-to-Epic Reference

**Feature**: [FS-095](./FEATURE.md)

**As a** user viewing feature specs
**I want** features to reference their parent epic via `epic_id` field
**So that** I can navigate the hierarchy

---

## Acceptance Criteria

- [x] **AC-US3-01**: FEATURE.md frontmatter includes `epic_id: EP-XXX` when parent exists
- [x] **AC-US3-02**: `epic_id` is optional (features can exist without parent epic)
- [x] **AC-US3-03**: Epic reference path is relative: `../../_epics/EP-XXX/EPIC.md`

---

## Implementation

**Increment**: [0095-per-project-epic-hierarchy](../../../../../increments/0095-per-project-epic-hierarchy/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] [T-004](../../../../../increments/0095-per-project-epic-hierarchy/tasks.md#T-004): Add epic_id field to FEATURE.md generation