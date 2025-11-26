---
id: US-001
feature: FS-071
title: "Unified Feature ID Sequence (No Numeric Collision)"
status: completed
priority: P1
created: 2025-11-26
---

**Origin**: 🏠 **Internal**


# US-001: Unified Feature ID Sequence (No Numeric Collision)

**Feature**: [FS-071](./FEATURE.md)

**As a** developer using SpecWeave with external imports
**I want** internal and external feature IDs to never share the same numeric index
**So that** I can reference features unambiguously without confusion

---

## Acceptance Criteria

- [x] **AC-US1-01**: When `FS-001` exists (internal), next external feature gets `FS-002E` (not `FS-001E`)
- [x] **AC-US1-02**: When `FS-001E` exists (external), next internal feature gets `FS-002` (not `FS-001`)
- [x] **AC-US1-03**: Per-project sequences remain isolated (FS-001 in project-A, FS-001 in project-B are OK)
- [x] **AC-US1-04**: Collision detection logs warning if numeric overlap detected
- [ ] **AC-US1-05**: Existing projects with collisions are not broken (backward compatible)

---

## Implementation

**Increment**: `0071-fix-feature-id-collision-github-import`

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] T-001: Analyze current FS-ID allocation algorithm
- [x] T-003: Implement unified numeric sequence for FS-IDs (within project)
- [x] T-004: Add collision detection logging
- [x] T-005: Update getMaxId() to consider both suffixes
- [x] T-011: Add unit tests for FS-ID collision prevention