---
id: US-002
feature: FS-072
title: "Automatic Issue Reopen on Resume"
status: completed
priority: P1
created: 2025-11-26
---

# US-002: Automatic Issue Reopen on Resume

**Feature**: [FS-072](./FEATURE.md)

**As a** developer resuming a paused/completed increment
**I want** GitHub issues to automatically reopen
**So that** issue state matches increment state

---

## Acceptance Criteria

- [x] **AC-US2-01**: When increment status changes to in-progress/active/resumed, check if GH issues are closed
- [x] **AC-US2-02**: Automatically reopen closed GitHub issues for resumed increments
- [x] **AC-US2-03**: Post comment explaining why issue was reopened
- [x] **AC-US2-04**: Handle User Story issues (not just main increment issue)

---

## Implementation

**Increment**: [0072-github-status-reconciliation](../../../../../../increments/_archive/0072-github-status-reconciliation/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-004**: Add reopen logic to post-increment-status-change.sh
- [x] **T-005**: Create reopen-github-issues.ts script
- [x] **T-006**: Integrate reopen script into hook
