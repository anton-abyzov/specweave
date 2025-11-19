---
id: US-006
feature: FS-047
title: "Migration Tooling"
status: planned
priority: P0
created: 2025-11-19
---

# US-006: Migration Tooling

**Feature**: [FS-047](../../_features/FS-047/FEATURE.md)

**As a** contributor maintaining existing increments
**I want** migration script to auto-link tasks to User Stories
**So that** I don't manually update 40+ existing increments

---

## Acceptance Criteria

- [ ] **AC-US6-01**: Migration script analyzes spec.md and tasks.md to infer US linkage
- [ ] **AC-US6-02**: Script suggests linkage based on task descriptions and AC keywords
- [ ] **AC-US6-03**: Script applies linkage with dry-run preview before actual update
- [ ] **AC-US6-04**: Migration supports batch processing (all increments in one run)

---

## Implementation

**Increment**: [0047-us-task-linkage](../../../../increments/0047-us-task-linkage/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] [T-020](../../../../increments/0047-us-task-linkage/tasks.md#T-020): Create migration script with inference algorithm
- [ ] [T-021](../../../../increments/0047-us-task-linkage/tasks.md#T-021): Add dry-run mode and interactive confirmation
- [ ] [T-022](../../../../increments/0047-us-task-linkage/tasks.md#T-022): Test migration on increments 0043-0046