---
id: US-003
feature: FS-136
title: Crash Recovery E2E Test
status: completed
priority: P2
created: 2025-12-09
project: specweave
external:
  github:
    issue: 819
    url: https://github.com/anton-abyzov/specweave/issues/819
---

# US-003: Crash Recovery E2E Test

**Feature**: [FS-136](./FEATURE.md)

**As a** SpecWeave developer
**I want** automated validation of crash recovery
**So that** unexpected terminations are handled gracefully

---

## Acceptance Criteria

- [x] **AC-US3-01**: Session killed with SIGKILL (simulate crash)
- [x] **AC-US3-02**: Heartbeat detects parent death within 5 seconds
- [x] **AC-US3-03**: Heartbeat self-terminates and cleans registry
- [x] **AC-US3-04**: Cleanup service detects remaining zombies within 70 seconds
- [x] **AC-US3-05**: All child processes terminated
- [x] **AC-US3-06**: Cleanup actions logged to cleanup.log

---

## Implementation

**Increment**: [0136-process-lifecycle-test-suite](../../../../increments/0136-process-lifecycle-test-suite/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-003**: Create E2E Test - Crash Recovery
