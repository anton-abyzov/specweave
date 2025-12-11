---
id: US-005
feature: FS-131
title: Lock Staleness Detection & Recovery
status: completed
priority: P1
created: 2025-12-09
project: specweave
external:
  github:
    issue: 874
    url: https://github.com/anton-abyzov/specweave/issues/874
---

# US-005: Lock Staleness Detection & Recovery

**Feature**: [FS-131](./FEATURE.md)

**As a** SpecWeave developer
**I want** stale locks automatically detected and removed
**So that** new sessions don't block on old locks

---

## Acceptance Criteria

- [x] **AC-US5-01**: Lock acquisition checks lock age (using mtime) before failing
- [x] **AC-US5-02**: Locks older than 5 minutes considered stale and removed automatically
- [x] **AC-US5-03**: Lock removal verifies PID in lock file is no longer active
- [x] **AC-US5-04**: Lock staleness logged to `.specweave/logs/lock-cleanup.log`
- [x] **AC-US5-05**: Lock directory includes metadata: `.processor.lock.d/pid`, `.processor.lock.d/session_id`
- [x] **AC-US5-06**: Stale lock removal triggers session registry cleanup for that session_id

---

## Implementation

**Increment**: [0131-process-lifecycle-foundation](../../../../increments/0131-process-lifecycle-foundation/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-008**: Implement Lock Staleness Manager
