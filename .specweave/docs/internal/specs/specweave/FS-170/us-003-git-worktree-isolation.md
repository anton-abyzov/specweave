---
id: US-003
feature: FS-170
title: "Git Worktree Isolation"
status: completed
priority: P0
created: 2026-01-20
project: specweave-dev
---

# US-003: Git Worktree Isolation

**Feature**: [FS-170](./FEATURE.md)

**As a** developer,
**I want** each parallel agent in its own git worktree,
**So that** concurrent changes don't conflict.

---

## Acceptance Criteria

- [x] **AC-US3-01**: Worktrees created at `.specweave/worktrees/{agent-id}/`
- [x] **AC-US3-02**: Each worktree has dedicated branch (`auto/{domain}-{increment}`)
- [x] **AC-US3-03**: Dirty worktrees preserved on failure
- [x] **AC-US3-04**: Clean worktrees removed after successful merge
- [x] **AC-US3-05**: Lock detection prevents duplicate worktrees
- [x] **AC-US3-06**: Windows long path support (`\\?\` prefix)
- [x] **AC-US3-07**: Test coverage for worktree manager ≥90%

---

## Implementation

**Increment**: [0170-parallel-auto-mode](../../../../increments/0170-parallel-auto-mode/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-005**: Create Worktree Manager
- [x] **T-006**: Create Worktree Manager Tests (90%+ coverage)
- [x] **T-025**: Create Integration Tests
