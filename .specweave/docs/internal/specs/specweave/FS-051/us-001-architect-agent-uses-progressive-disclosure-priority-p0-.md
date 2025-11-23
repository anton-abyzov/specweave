---
id: US-001
feature: FS-051
title: "Automatic Issue Creation on Completion"
status: planned
priority: P0
created: 2025-11-22
---

# US-001: Automatic Issue Creation on Completion

**Feature**: [FS-051](../../_features/FS-051/FEATURE.md)

---

## Acceptance Criteria

- [ ] **AC-US1-01**: When increment completes, `SyncCoordinator.syncIncrementCompletion()` called automatically
- [ ] **AC-US1-02**: `SyncCoordinator` detects all User Stories linked to increment's feature
- [ ] **AC-US1-03**: For each User Story, create GitHub issue using `GitHubClientV2`
- [ ] **AC-US1-04**: Created issues linked to feature milestone (if exists)
- [ ] **AC-US1-05**: `metadata.json` updated with GitHub issue numbers
- [ ] **AC-US1-06**: User sees success message: "Created 4 GitHub issues for FS-049"

---

## Implementation

**Increment**: [0051-automatic-github-sync](../../../../increments/0051-automatic-github-sync/spec.md)

**Tasks**: See increment tasks.md for implementation details.
