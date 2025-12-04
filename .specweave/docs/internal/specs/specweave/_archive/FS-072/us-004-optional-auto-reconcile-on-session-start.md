---
id: US-004
feature: FS-072
title: "Optional Auto-Reconcile on Session Start"
status: completed
priority: P1
created: 2025-11-26
---

# US-004: Optional Auto-Reconcile on Session Start

**Feature**: [FS-072](./FEATURE.md)

**As a** team lead
**I want** automatic reconciliation on session start
**So that** drift is caught and fixed proactively

---

## Acceptance Criteria

- [x] **AC-US4-01**: Config option `sync.github.autoReconcileOnSessionStart` exists
- [x] **AC-US4-02**: When enabled, SessionStart hook runs quick reconcile
- [x] **AC-US4-03**: Reconcile only runs if >1 hour since last reconcile (debounce)
- [x] **AC-US4-04**: Errors are logged but don't block session start

---

## Implementation

**Increment**: [0072-github-status-reconciliation](../../../../../../increments/_archive/0072-github-status-reconciliation/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-009**: Add config option for auto-reconcile
- [x] **T-010**: Create session-start reconcile hook
- [x] **T-011**: Add error handling for session start
- [x] **T-012**: Update hooks.json for SessionStart
