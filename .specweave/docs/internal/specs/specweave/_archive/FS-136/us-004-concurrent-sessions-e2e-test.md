---
id: US-004
feature: FS-136
title: Concurrent Sessions E2E Test
status: completed
priority: P2
created: 2025-12-09
project: specweave
external:
  github:
    issue: 820
    url: https://github.com/anton-abyzov/specweave/issues/820
---

# US-004: Concurrent Sessions E2E Test

**Feature**: [FS-136](./FEATURE.md)

**As a** SpecWeave developer
**I want** automated validation of multiple concurrent sessions
**So that** watchdog coordination works correctly

---

## Acceptance Criteria

- [x] **AC-US4-01**: Three sessions start simultaneously without conflicts
- [x] **AC-US4-02**: Only one watchdog daemon running despite multiple sessions
- [x] **AC-US4-03**: Each session has unique session_id in registry
- [x] **AC-US4-04**: Registry remains valid JSON under concurrent access
- [x] **AC-US4-05**: Sessions exit independently without affecting others
- [x] **AC-US4-06**: Watchdog terminates after last session exits

---

## Implementation

**Increment**: [0136-process-lifecycle-test-suite](../../../../increments/0136-process-lifecycle-test-suite/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-004**: Create E2E Test - Multiple Concurrent Sessions
