---
id: US-001
feature: FS-131
title: Session Registry & Process Tracking
status: completed
priority: P1
created: 2025-12-09
project: specweave
external:
  github:
    issue: 870
    url: https://github.com/anton-abyzov/specweave/issues/870
---

# US-001: Session Registry & Process Tracking

**Feature**: [FS-131](./FEATURE.md)

**As a** SpecWeave developer
**I want** all Claude Code sessions and their child processes registered in a central location
**So that** we can track active sessions and clean up orphaned processes automatically

---

## Acceptance Criteria

- [x] **AC-US1-01**: Session registry created at `.specweave/state/.session-registry.json` on session start
- [x] **AC-US1-02**: Each session entry includes: session_id, pid, start_time, last_heartbeat, child_pids[]
- [x] **AC-US1-03**: Registry supports concurrent updates (atomic file operations with locks)
- [x] **AC-US1-04**: Sessions send heartbeat every 5 seconds to update last_heartbeat timestamp
- [x] **AC-US1-05**: Stale sessions (no heartbeat >30s) marked as "zombie" candidates
- [x] **AC-US1-06**: Registry cleanup removes completed sessions after 24 hours

---

## Implementation

**Increment**: [0131-process-lifecycle-foundation](../../../../increments/0131-process-lifecycle-foundation/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Create Session Registry Data Structure
- [x] **T-002**: Implement Atomic Registry Operations
- [x] **T-003**: Implement Staleness Detection Logic
