---
id: US-004
feature: FS-131
title: Automated Zombie Cleanup Service
status: completed
priority: P1
created: 2025-12-09
project: specweave
external:
  github:
    issue: 873
    url: https://github.com/anton-abyzov/specweave/issues/873
---

# US-004: Automated Zombie Cleanup Service

**Feature**: [FS-131](./FEATURE.md)

**As a** SpecWeave developer
**I want** a background cleanup service that automatically removes zombie processes
**So that** I never need to manually run cleanup scripts

---

## Acceptance Criteria

- [x] **AC-US4-01**: Cleanup service runs every 60 seconds as part of session-watchdog
- [x] **AC-US4-02**: Service scans session registry for stale sessions (no heartbeat >60s)
- [x] **AC-US4-03**: For each stale session, service kills parent PID and all child_pids
- [x] **AC-US4-04**: Service detects orphaned processes matching patterns: `cat.*EOF`, `esbuild.*--service`, `bash.*processor.sh`
- [x] **AC-US4-05**: Service logs all cleanup actions to `.specweave/logs/cleanup.log`
- [x] **AC-US4-06**: Service sends macOS/Linux notification after cleaning >3 processes

---

## Implementation

**Increment**: [0131-process-lifecycle-foundation](../../../../increments/0131-process-lifecycle-foundation/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-006**: Implement Cleanup Service in Watchdog
- [x] **T-007**: Add Cleanup Logging and Notifications
