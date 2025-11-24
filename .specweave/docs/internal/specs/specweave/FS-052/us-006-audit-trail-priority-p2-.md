---
id: US-006
feature: FS-052
title: "Audit Trail"
status: planned
priority: P2
created: 2025-11-23
external_tools:
  github:
    number: 727
    url: https://github.com/anton-abyzov/specweave/issues/727
    created_at: 2025-11-24T07:00:18.460Z
---

**Origin**: 🏠 **Internal**


# US-006: Audit Trail (Priority: P2)

**Feature**: [FS-052](../../_features/FS-052/FEATURE.md)

**As a** team lead reviewing changes
**I want** feature deletions to be logged with full context
**So that** I can track who deleted what and why

---

## Acceptance Criteria

- [ ] **AC-US6-01**: Deletion event logged to `.specweave/logs/feature-deletions.log`
- [ ] **AC-US6-02**: Log entry includes feature ID, timestamp, user, reason, mode (safe/force)
- [ ] **AC-US6-03**: Log entry includes file count (living docs, user stories, etc.)
- [ ] **AC-US6-04**: Log entry includes orphaned increment IDs (if any)
- [ ] **AC-US6-05**: Log entry includes git commit SHA (if committed)
- [ ] **AC-US6-06**: Deletion history can be viewed with `/specweave:audit-deletions`

---

## Implementation

**Increment**: [0052-safe-feature-deletion](../../../../increments/0052-safe-feature-deletion/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] [T-030](../../../../increments/0052-safe-feature-deletion/tasks.md#T-030): Implement Audit Logger with JSON Lines Format
- [ ] [T-031](../../../../increments/0052-safe-feature-deletion/tasks.md#T-031): Implement Audit Log Rotation (>10MB)
- [ ] [T-032](../../../../increments/0052-safe-feature-deletion/tasks.md#T-032): Implement Audit Log for Partial Deletions
- [ ] [T-033](../../../../increments/0052-safe-feature-deletion/tasks.md#T-033): Implement Audit Log for Failed Deletions
- [ ] [T-034](../../../../increments/0052-safe-feature-deletion/tasks.md#T-034): Implement CLI Command Registration
- [ ] [T-035](../../../../increments/0052-safe-feature-deletion/tasks.md#T-035): Implement Feature ID Validation
- [ ] [T-036](../../../../increments/0052-safe-feature-deletion/tasks.md#T-036): Implement Feature Deleter Orchestrator (Main Entry Point)
- [ ] [T-037](../../../../increments/0052-safe-feature-deletion/tasks.md#T-037): Implement /specweave:audit-deletions Command (Optional - P3)