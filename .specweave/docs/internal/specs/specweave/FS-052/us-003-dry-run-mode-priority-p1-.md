---
id: US-003
feature: FS-052
title: "Dry-Run Mode (Priority: P1)"
status: planned
priority: P1
created: 2025-11-23
---

**Origin**: 🏠 **Internal**


# US-003: Dry-Run Mode (Priority: P1)

**Feature**: [FS-052](../../_features/FS-052/FEATURE.md)

**As a** developer planning feature cleanup
**I want** to preview what will be deleted without actually deleting
**So that** I can verify I'm deleting the correct feature

---

## Acceptance Criteria

- [ ] **AC-US3-01**: `--dry-run` flag shows deletion plan without executing
- [ ] **AC-US3-02**: Dry-run report includes file list (living docs, user stories, etc.)
- [ ] **AC-US3-03**: Dry-run report includes git status (tracked vs untracked files)
- [ ] **AC-US3-04**: Dry-run report includes increment references (active/completed/archived)
- [ ] **AC-US3-05**: Dry-run can be combined with --force to preview force deletion
- [ ] **AC-US3-06**: Dry-run exits with code 0 (no error)

---

## Implementation

**Increment**: [0052-safe-feature-deletion](../../../../increments/0052-safe-feature-deletion/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] [T-012](../../../../increments/0052-safe-feature-deletion/tasks.md#T-012): Implement Dry-Run Flag and Preview Mode
- [ ] [T-013](../../../../increments/0052-safe-feature-deletion/tasks.md#T-013): Implement Dry-Run Report with File List
- [ ] [T-014](../../../../increments/0052-safe-feature-deletion/tasks.md#T-014): Implement Dry-Run Git Status Preview
- [ ] [T-015](../../../../increments/0052-safe-feature-deletion/tasks.md#T-015): Implement Dry-Run GitHub Preview
- [ ] [T-016](../../../../increments/0052-safe-feature-deletion/tasks.md#T-016): Implement Dry-Run with Force Mode Combination
- [ ] [T-017](../../../../increments/0052-safe-feature-deletion/tasks.md#T-017): Implement Dry-Run Exit Code Handling