---
id: US-003
feature: FS-047
title: "Automatic Living Docs Sync"
status: completed
priority: P0
created: 2025-11-19
---

# US-003: Automatic Living Docs Sync

**GitHub Project**: https://github.com/anton-abyzov/specweave/issues/690

**Feature**: [FS-047](../../_features/FS-047/FEATURE.md)

**As a** developer completing tasks
**I want** living docs User Story files to automatically update from increment
**So that** I don't manually sync tasks.md and living docs

---

## Acceptance Criteria

- [x] **AC-US3-01**: When task marked completed, `post-task-completion.sh` hook updates living docs US file task section
- [x] **AC-US3-02**: Living docs US file shows actual task list with links to tasks.md (not "No tasks defined")
- [x] **AC-US3-03**: Task completion updates AC checkboxes in living docs based on satisfiesACs field
- [x] **AC-US3-04**: `sync-living-docs.js` hook uses userStory field for grouping tasks by US
- [x] **AC-US3-05**: Increment → Living Docs sync is ALWAYS one-way (external tools cannot write back to active increments)

---

## Implementation

**Increment**: [0047-us-task-linkage](../../../../increments/0047-us-task-linkage/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-008**: Update sync-living-docs.js to use userStory field
- [x] **T-009**: Implement AC checkbox sync based on satisfiesACs
- [x] **T-010**: Update post-task-completion hook to pass feature ID
- [x] **T-011**: Validate sync direction is one-way (Increment → Living Docs)
- [x] **T-012**: Add sync performance optimization
