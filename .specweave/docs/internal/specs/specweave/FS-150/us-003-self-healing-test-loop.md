---
id: US-003
feature: FS-150
title: Self-Healing Test Loop
status: not_started
priority: P0
created: 2025-12-30
project: specweave
external:
  github:
    issue: 985
    url: https://github.com/anton-abyzov/specweave/issues/985
---

# US-003: Self-Healing Test Loop

**Feature**: [FS-150](./FEATURE.md)

**As a** developer in auto mode
**I want** failing tests to trigger automatic fix-and-retry
**So that** transient failures are resolved without human intervention

---

## Acceptance Criteria

- [ ] **AC-US3-01**: On test failure, stop hook increments retry counter
- [ ] **AC-US3-02**: Retry prompt includes specific error message and file:line
- [ ] **AC-US3-03**: Max 3 retry attempts before escalating to human gate
- [ ] **AC-US3-04**: Each retry is logged with failure details
- [ ] **AC-US3-05**: After 3 failures, session pauses for human review
- [ ] **AC-US3-06**: Retry counter resets when moving to next task

---

## Implementation

**Increment**: [0150-auto-mode-world-class-testing](../../../../increments/0150-auto-mode-world-class-testing/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-004**: Add testRetryCount to session state
- [x] **T-005**: Implement self-healing block prompt
- [x] **T-006**: Implement retry exhaustion → human gate
- [x] **T-007**: Reset retry counter on task completion
- [x] **T-024**: Add integration tests for self-healing loop
