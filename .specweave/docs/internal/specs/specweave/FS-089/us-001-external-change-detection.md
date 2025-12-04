---
id: US-001
feature: FS-089
title: "External Change Detection"
status: completed
priority: P1
created: 2025-12-01
---

**Origin**: 🏠 **Internal**


# US-001: External Change Detection

**Feature**: [FS-089](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US1-01**: ADO client can query work items changed in last N hours
- [x] **AC-US1-02**: JIRA client can query issues updated in last N hours
- [x] **AC-US1-03**: GitHub client can query issues updated since timestamp
- [x] **AC-US1-04**: Changed items include `ChangedDate` and `ChangedBy` fields

---

## Implementation

**Increment**: [0089-bidirectional-sync-pull](../../../../../increments/0089-bidirectional-sync-pull/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] [T-002](../../../../../increments/0089-bidirectional-sync-pull/tasks.md#T-002): Implement ADO Change Detection
- [x] [T-003](../../../../../increments/0089-bidirectional-sync-pull/tasks.md#T-003): Implement JIRA Change Detection
- [x] [T-004](../../../../../increments/0089-bidirectional-sync-pull/tasks.md#T-004): Implement GitHub Change Detection