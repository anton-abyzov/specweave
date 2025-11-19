---
id: US-005
feature: FS-047
title: "Progress Tracking by User Story"
status: planned
priority: P0
created: 2025-11-19
---

# US-005: Progress Tracking by User Story

**Feature**: [FS-047](../../_features/FS-047/FEATURE.md)

**As a** developer checking increment status
**I want** `/specweave:progress` to show per-US task completion
**So that** I know which User Stories are complete vs in-progress

---

## Acceptance Criteria

- [ ] **AC-US5-01**: `/specweave:progress` displays task completion grouped by User Story
- [ ] **AC-US5-02**: Progress output shows: `US-001: [8/11 tasks completed] 73%`
- [ ] **AC-US5-03**: Progress summary includes total tasks by US (metadata.json frontmatter: `by_user_story`)

---

## Implementation

**Increment**: [0047-us-task-linkage](../../../../increments/0047-us-task-linkage/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] [T-016](../../../../increments/0047-us-task-linkage/tasks.md#T-016): Implement per-US task completion tracking
- [ ] [T-017](../../../../increments/0047-us-task-linkage/tasks.md#T-017): Update /specweave:progress command with US grouping
- [ ] [T-018](../../../../increments/0047-us-task-linkage/tasks.md#T-018): Add by_user_story frontmatter to tasks.md
- [ ] [T-019](../../../../increments/0047-us-task-linkage/tasks.md#T-019): Create progress visualization script