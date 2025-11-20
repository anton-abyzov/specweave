---
id: US-005
feature: FS-047
title: "Progress Tracking by User Story"
status: completed
priority: P0
created: 2025-11-19
---

# US-005: Progress Tracking by User Story

**GitHub Project**: https://github.com/anton-abyzov/specweave/issues/692

**Feature**: [FS-047](../../_features/FS-047/FEATURE.md)

**As a** developer checking increment status
**I want** `/specweave:progress` to show per-US task completion
**So that** I know which User Stories are complete vs in-progress

---

## Acceptance Criteria

- [x] **AC-US5-01**: `/specweave:progress` displays task completion grouped by User Story
- [x] **AC-US5-02**: Progress output shows: `US-001: [8/11 tasks completed] 73%`
- [x] **AC-US5-03**: Progress summary includes total tasks by US (metadata.json frontmatter: `by_user_story`)

---

## Implementation

**Increment**: [0047-us-task-linkage](../../../../increments/0047-us-task-linkage/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-016**: Implement per-US task completion tracking
- [x] **T-017**: Update /specweave:progress command with US grouping
- [x] **T-018**: Add by_user_story frontmatter to tasks.md
- [x] **T-019**: Create progress visualization script
