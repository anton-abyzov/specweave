---
id: US-003
feature: FS-072
title: "Automatic Issue Close on Abandon"
status: completed
priority: P1
created: 2025-11-26
---

# US-003: Automatic Issue Close on Abandon

**Feature**: [FS-072](./FEATURE.md)

**As a** developer abandoning an increment
**I want** GitHub issues to automatically close
**So that** abandoned work is reflected in GitHub

---

## Acceptance Criteria

- [x] **AC-US3-01**: When increment status changes to abandoned, close GitHub issues
- [x] **AC-US3-02**: Post comment explaining why issue was closed (abandoned)
- [x] **AC-US3-03**: Handle User Story issues (not just main increment issue)

---

## Implementation

**Increment**: [0072-github-status-reconciliation](../../../../../../increments/_archive/0072-github-status-reconciliation/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-007**: Add close logic to post-increment-status-change.sh
- [x] **T-008**: Create close-github-issues-abandoned.ts script
