---
id: US-002
feature: FS-136
title: Normal Session Lifecycle E2E Test
status: completed
priority: P2
created: 2025-12-09
project: specweave
external:
  github:
    issue: 818
    url: https://github.com/anton-abyzov/specweave/issues/818
---

# US-002: Normal Session Lifecycle E2E Test

**Feature**: [FS-136](./FEATURE.md)

**As a** SpecWeave developer
**I want** end-to-end validation of normal session lifecycle
**So that** typical usage patterns work reliably

---

## Acceptance Criteria

- [x] **AC-US2-01**: Mock Claude Code session starts successfully
- [x] **AC-US2-02**: Session registered in registry within 5 seconds
- [x] **AC-US2-03**: Heartbeat process running and updating every 5 seconds
- [x] **AC-US2-04**: Session remains active during simulated work (30s)
- [x] **AC-US2-05**: Clean shutdown removes session and kills all children
- [x] **AC-US2-06**: No zombie processes remain after exit

---

## Implementation

**Increment**: [0136-process-lifecycle-test-suite](../../../../increments/0136-process-lifecycle-test-suite/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-002**: Create E2E Test - Normal Session Lifecycle
