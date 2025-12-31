---
id: US-008
feature: FS-137
title: "/specweave:status Cross-Project View (P2)"
status: completed
priority: P0
created: 2025-12-09
project: specweave
related_projects: []
---

# US-008: /specweave:status Cross-Project View (P2)

**Feature**: [FS-137](./FEATURE.md)

**As a** user managing cross-project increments
**I want** `/specweave:status` to show per-US sync status grouped by project
**So that** I can see which USs synced where and their external status

---

## Acceptance Criteria

- [x] **AC-US8-01**: Status groups USs by their target project
- [x] **AC-US8-02**: Each US shows external tool link (GitHub/JIRA/ADO issue URL)
- [x] **AC-US8-03**: Aggregate shows "3/5 USs synced, 2 pending"
- [x] **AC-US8-04**: Warning shown for USs without project mapping
- [x] **AC-US8-05**: 2-level structures show project AND board per US

---

## Implementation

**Increment**: [0137-per-us-project-board-enforcement](../../../../increments/0137-per-us-project-board-enforcement/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-021**: Update /specweave:status for Cross-Project View
