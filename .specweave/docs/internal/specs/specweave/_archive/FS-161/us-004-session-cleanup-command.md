---
id: US-004
feature: FS-161
title: "Session Cleanup Command"
status: not_started
priority: P0
created: 2026-01-07
project: specweave-dev
---

# US-004: Session Cleanup Command

**Feature**: [FS-161](./FEATURE.md)

---

## Acceptance Criteria

- [ ] **AC-US4-01**: Command `specweave cleanup-sessions` lists all running Claude processes
- [ ] **AC-US4-02**: Shows: PID | Started | Session ID | Lock Files Held | Memory Usage
- [ ] **AC-US4-03**: Flag `--force` kills all sessions except current one
- [ ] **AC-US4-04**: Removes stale lock files from `.specweave/state/*.lock`
- [ ] **AC-US4-05**: Cleans up orphaned semaphore state
- [ ] **AC-US4-06**: Dry-run mode `--dry-run` shows what would be cleaned without executing
- [ ] **AC-US4-07**: Warning before force kill: "This will kill X sessions. Continue? (y/N)"

---

## Implementation

**Increment**: [0161-hook-execution-visibility-and-command-reliability](../../../../increments/0161-hook-execution-visibility-and-command-reliability/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
