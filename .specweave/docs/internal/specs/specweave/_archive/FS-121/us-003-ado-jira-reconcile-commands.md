---
id: US-003
feature: FS-121
title: ADO/JIRA Reconcile Commands
status: completed
priority: P2
created: 2025-12-11
project: specweave
external:
  github:
    issue: 855
    url: https://github.com/anton-abyzov/specweave/issues/855
---

# US-003: ADO/JIRA Reconcile Commands

**Feature**: [FS-121](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US3-01**: `/specweave-ado:reconcile` detects status drift
- [x] **AC-US3-02**: `/specweave-jira:reconcile` detects status drift
- [x] **AC-US3-03**: Both support --dry-run flag
- [x] **AC-US3-04**: Both report mismatches found/fixed

---

## Implementation

**Increment**: [0121-ado-jira-feature-parity-p2-p3](../../../../increments/0121-ado-jira-feature-parity-p2-p3/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-003**: Create ADO Reconcile Command
- [x] **T-004**: Create JIRA Reconcile Command
