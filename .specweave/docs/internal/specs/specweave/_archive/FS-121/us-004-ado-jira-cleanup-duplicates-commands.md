---
id: US-004
feature: FS-121
title: ADO/JIRA Cleanup-Duplicates Commands
status: completed
priority: P2
created: 2025-12-11
project: specweave
external:
  github:
    issue: 856
    url: https://github.com/anton-abyzov/specweave/issues/856
---

# US-004: ADO/JIRA Cleanup-Duplicates Commands

**Feature**: [FS-121](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US4-01**: `/specweave-ado:cleanup-duplicates` finds duplicate work items
- [x] **AC-US4-02**: `/specweave-jira:cleanup-duplicates` finds duplicate issues
- [x] **AC-US4-03**: Both keep oldest item, close rest
- [x] **AC-US4-04**: Both support --dry-run and confirmation prompt

---

## Implementation

**Increment**: [0121-ado-jira-feature-parity-p2-p3](../../../../increments/0121-ado-jira-feature-parity-p2-p3/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-005**: Create ADO Cleanup-Duplicates Command
- [x] **T-006**: Create JIRA Cleanup-Duplicates Command
