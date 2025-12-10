---
id: US-005
feature: FS-128
title: Lock Staleness Detection & Recovery
status: not_started
priority: P1
created: 2025-12-09
project: specweave
external:
  github:
    issue: 814
    url: https://github.com/anton-abyzov/specweave/issues/814
---

# US-005: Lock Staleness Detection & Recovery

**Feature**: [FS-128](./FEATURE.md)

**As a** SpecWeave developer
**I want** stale locks automatically detected and removed
**So that** new sessions don't block on old locks

---

## Acceptance Criteria

- [ ] **AC-US5-01**: Lock acquisition checks lock age (using mtime) before failing
- [ ] **AC-US5-02**: Locks older than 5 minutes considered stale and removed automatically
- [ ] **AC-US5-03**: Lock removal verifies PID in lock file is no longer active
- [ ] **AC-US5-04**: Lock staleness logged to `.specweave/logs/lock-cleanup.log`
- [ ] **AC-US5-05**: Lock directory includes metadata: `.processor.lock.d/pid`, `.processor.lock.d/session_id`
- [ ] **AC-US5-06**: Stale lock removal triggers session registry cleanup for that session_id

---

## Implementation

**Increment**: [0128-process-lifecycle-zombie-prevention](../../../../increments/0128-process-lifecycle-zombie-prevention/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] **T-008**: Implement Lock Staleness Manager
- [ ] **T-009**: Enhance Processor with Lock Staleness Check
