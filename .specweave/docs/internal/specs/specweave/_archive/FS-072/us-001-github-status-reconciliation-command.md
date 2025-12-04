---
id: US-001
feature: FS-072
title: "GitHub Status Reconciliation Command"
status: completed
priority: P1
created: 2025-11-26
---

# US-001: GitHub Status Reconciliation Command

**Feature**: [FS-072](./FEATURE.md)

**As a** developer using SpecWeave
**I want** a command to reconcile GitHub issue states with increment statuses
**So that** I can fix any drift between local state and GitHub

---

## Acceptance Criteria

- [x] **AC-US1-01**: Command `/specweave-github:reconcile` exists and is documented ✅
- [x] **AC-US1-02**: Command scans all non-archived increments ✅
- [x] **AC-US1-03**: Command compares metadata.json status with GitHub issue state ✅
- [x] **AC-US1-04**: Command closes GitHub issues where metadata.status=completed but GH=open ✅ (Tested: closed 10 issues)
- [x] **AC-US1-05**: Command reopens GitHub issues where metadata.status=in-progress but GH=closed ✅
- [x] **AC-US1-06**: Command reports what was fixed with clear output ✅
- [x] **AC-US1-07**: Command supports --dry-run flag to preview changes ✅

---

## Implementation

**Increment**: [0072-github-status-reconciliation](../../../../../../increments/_archive/0072-github-status-reconciliation/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Create GitHubReconciler class
- [x] **T-002**: Create reconcile command markdown
- [x] **T-003**: Implement reconcile report output
