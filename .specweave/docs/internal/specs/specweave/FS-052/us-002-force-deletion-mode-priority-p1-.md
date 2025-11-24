---
id: US-002
feature: FS-052
title: "Force Deletion Mode"
status: planned
priority: P1
created: 2025-11-23
external_tools:
  github:
    number: 723
    url: https://github.com/anton-abyzov/specweave/issues/723
    created_at: 2025-11-24T07:00:09.613Z
---

**Origin**: 🏠 **Internal**


# US-002: Force Deletion Mode (Priority: P1)

**Feature**: [FS-052](../../_features/FS-052/FEATURE.md)

**As a** framework maintainer with orphaned increments
**I want** to force-delete a feature even if references exist
**So that** I can clean up stale features after manually updating increments

---

## Acceptance Criteria

- [ ] **AC-US2-01**: `--force` flag bypasses active increment validation
- [ ] **AC-US2-02**: Force deletion logs warning about orphaned increments
- [ ] **AC-US2-03**: Force deletion updates orphaned increment metadata (removes feature_id field)
- [ ] **AC-US2-04**: Force deletion still requires explicit confirmation
- [ ] **AC-US2-05**: Force deletion report shows which increments will be orphaned

---

## Implementation

**Increment**: [0052-safe-feature-deletion](../../../../increments/0052-safe-feature-deletion/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] [T-007](../../../../increments/0052-safe-feature-deletion/tasks.md#T-007): Implement Force Deletion Flag Handling
- [ ] [T-008](../../../../increments/0052-safe-feature-deletion/tasks.md#T-008): Implement Force Deletion Warning Log
- [ ] [T-009](../../../../increments/0052-safe-feature-deletion/tasks.md#T-009): Implement Orphaned Increment Metadata Update
- [ ] [T-010](../../../../increments/0052-safe-feature-deletion/tasks.md#T-010): Implement Deletion Transaction Pattern (Three-Phase Commit)
- [ ] [T-011](../../../../increments/0052-safe-feature-deletion/tasks.md#T-011): Implement File Backup and Rollback Logic