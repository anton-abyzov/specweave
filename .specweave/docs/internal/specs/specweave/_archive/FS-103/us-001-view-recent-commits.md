---
id: US-001
feature: FS-103
title: "View Recent Commits"
status: completed
priority: P2
created: 2025-12-04
---

# US-001: View Recent Commits

**Feature**: [FS-103](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US1-01**: Command `specweave commits` displays last 2 commits
- [x] **AC-US1-02**: Output shows commit hash (short), author, and message
- [x] **AC-US1-03**: Command fails gracefully if not in a git repository
- [x] **AC-US1-04**: Command works in any subdirectory of a git repo

---

## Implementation

**Increment**: [0103-list-last-commits](../../../../increments/0103-list-last-commits/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Create commits CLI command
- [x] **T-002**: Add git repository validation
- [x] **T-003**: Write unit tests
