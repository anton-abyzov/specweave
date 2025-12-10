---
id: US-003
feature: FS-131
title: Parent Process Death Detection
status: completed
priority: P1
created: 2025-12-09
project: specweave
external:
  github:
    issue: 872
    url: https://github.com/anton-abyzov/specweave/issues/872
---

# US-003: Parent Process Death Detection

**Feature**: [FS-131](./FEATURE.md)

**As a** background daemon (watchdog, processor)
**I want** to detect when my parent Claude session terminates
**So that** I can self-terminate and avoid becoming a zombie

---

## Acceptance Criteria

- [x] **AC-US3-01**: Daemons poll parent PID every 5 seconds using `kill -0 $PPID`
- [x] **AC-US3-02**: If parent process doesn't exist, daemon self-terminates within 5 seconds
- [x] **AC-US3-03**: Before terminating, daemon removes itself from session registry
- [x] **AC-US3-04**: Before terminating, daemon kills all registered child processes
- [x] **AC-US3-05**: Cross-platform implementation (macOS `ps`, Linux `/proc`, Windows `tasklist`)
- [x] **AC-US3-06**: Graceful shutdown with 2-second timeout before force-kill

---

## Implementation

**Increment**: [0131-process-lifecycle-foundation](../../../../increments/0131-process-lifecycle-foundation/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-004**: Create Heartbeat Background Script
