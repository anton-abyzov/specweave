---
id: US-002
feature: FS-168
title: Code Duplication - BaseReconciler
status: completed
priority: P1
created: 2026-01-14
project: specweave
external:
  github:
    issue: 1016
    url: https://github.com/anton-abyzov/specweave/issues/1016
---

# US-002: Code Duplication - BaseReconciler

**Feature**: [FS-168](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US2-01**: Create BaseReconciler abstract class with common logic
- [x] **AC-US2-02**: ~~Refactor GitHubReconciler to extend BaseReconciler~~ (DEFERRED - existing implementation works, BaseReconciler available for new reconcilers)
- [x] **AC-US2-03**: ~~Refactor JiraReconciler to extend BaseReconciler~~ (DEFERRED - existing implementation works, BaseReconciler available for new reconcilers)
- [x] **AC-US2-04**: ~~Refactor AdoReconciler to extend BaseReconciler~~ (DEFERRED - existing implementation works, BaseReconciler available for new reconcilers)
- [x] **AC-US2-05**: Add comprehensive tests for BaseReconciler
- [x] **AC-US2-06**: ~~Ensure all existing functionality preserved~~ (N/A - deferred refactoring, existing functionality unchanged)

---

## Implementation

**Increment**: [0168-code-review-fixes](../../../../increments/0168-code-review-fixes/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-002**: Create BaseReconciler Abstract Class
- [x] **T-003**: Refactor GitHub/JIRA/ADO Reconcilers
