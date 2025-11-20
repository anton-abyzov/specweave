---
id: US-003
feature: FS-047
title: Automatic Living Docs Sync
status: active
priority: P0
created: 2025-11-19
external:
  github:
    issue: 640
    url: https://github.com/anton-abyzov/specweave/issues/640
---

# US-003: Automatic Living Docs Sync

**GitHub Project**: https://github.com/anton-abyzov/specweave/issues/632

**Feature**: [FS-047](../../_features/FS-047/FEATURE.md)

**As a** developer completing tasks
**I want** living docs User Story files to automatically update task lists
**So that** I don't manually sync tasks.md and living docs

---

## Acceptance Criteria

- [x] **AC-US3-01**: When task marked completed, `post-task-completion.sh` hook updates living docs US file task section
- [x] **AC-US3-02**: Living docs US file shows actual task list with links to tasks.md (not "No tasks defined")
- [x] **AC-US3-03**: Task completion updates AC checkboxes in living docs based on satisfiesACs field
- [x] **AC-US3-04**: `sync-living-docs.js` hook uses userStory field for grouping tasks by US
- [ ] **AC-US3-05**: Bidirectional sync: tasks.md ↔ living docs US files

---

## Implementation

**Increment**: [0047-us-task-linkage](../../../../increments/0047-us-task-linkage/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-008**: Update sync-living-docs.js to use userStory field
- [x] **T-009**: Implement AC checkbox sync based on satisfiesACs
- [x] **T-010**: Update post-task-completion hook to pass feature ID
- [ ] **T-011**: Implement bidirectional sync (tasks.md ↔ living docs)
- [ ] **T-012**: Add sync performance optimization
