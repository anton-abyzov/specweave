---
id: US-001
feature: FS-121
title: JIRA Sync Judge Agent
status: completed
priority: P2
created: 2025-12-11
project: specweave
external:
  github:
    issue: 853
    url: https://github.com/anton-abyzov/specweave/issues/853
---

# US-001: JIRA Sync Judge Agent

**Feature**: [FS-121](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US1-01**: Agent validates external status always wins in conflicts
- [x] **AC-US1-02**: Agent distinguishes increment lifecycle vs spec lifecycle
- [x] **AC-US1-03**: Agent detects 4 violation types (local winning, incomplete closure, forced match, missing triggers)

---

## Implementation

**Increment**: [0121-ado-jira-feature-parity-p2-p3](../../../../increments/0121-ado-jira-feature-parity-p2-p3/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Create JIRA Sync Judge Agent
