---
id: US-006
feature: FS-125
title: "Cross-Project Increment Dashboard (P2)"
status: completed
priority: P1
created: 2025-12-08
project: specweave
related_projects: [frontend-app]
---

# US-006: Cross-Project Increment Dashboard (P2)

**Feature**: [FS-125](./FEATURE.md)

**As a** user managing cross-cutting work
**I want** `/specweave:status` to show per-US sync status across projects
**So that** I can see which USs synced where and their status in each system

---

## Acceptance Criteria

- [x] **AC-US6-01**: Status shows USs grouped by target project
- [x] **AC-US6-02**: Each US shows its external tool status (open/closed/in-progress)
- [x] **AC-US6-03**: Aggregate status: "3/5 USs synced, 2 pending"
- [x] **AC-US6-04**: Links to external issues per US
- [x] **AC-US6-05**: Warning for USs without project mapping

---

## Implementation

**Increment**: [0125-cross-project-user-story-targeting](../../../../increments/0125-cross-project-user-story-targeting/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-018**: Update /specweave:status for Cross-Project View
- [x] **T-019**: Add External Issue Links to Status
