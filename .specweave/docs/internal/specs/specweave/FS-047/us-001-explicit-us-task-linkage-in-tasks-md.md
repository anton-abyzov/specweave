---
id: US-001
feature: FS-047
title: "Explicit US-Task Linkage in tasks.md"
status: planned
priority: P0
created: 2025-11-19
---

# US-001: Explicit US-Task Linkage in tasks.md

**Feature**: [FS-047](../../_features/FS-047/FEATURE.md)

**As a** developer implementing an increment
**I want** tasks to explicitly declare which User Story they belong to
**So that** I can trace implementation back to requirements without manual inference

---

## Acceptance Criteria

- [x] **AC-US1-01**: Every task in tasks.md has **User Story** field linking to parent US (format: `**User Story**: US-001`)
- [x] **AC-US1-02**: Tasks grouped by User Story in tasks.md (section headers: `## User Story: US-001 - Title`)
- [x] **AC-US1-03**: Task parser extracts `userStory` field and validates format (US-XXX)
- [x] **AC-US1-04**: Invalid US references detected and reported (non-existent US-XXX)

---

## Implementation

**Increment**: [0047-us-task-linkage](../../../../increments/0047-us-task-linkage/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] [T-001](../../../../increments/0047-us-task-linkage/tasks.md#T-001): Create task parser with US linkage extraction
- [x] [T-002](../../../../increments/0047-us-task-linkage/tasks.md#T-002): Add task linkage validation function
- [x] [T-003](../../../../increments/0047-us-task-linkage/tasks.md#T-003): Update tasks.md template with hierarchical structure
- [x] [T-004](../../../../increments/0047-us-task-linkage/tasks.md#T-004): Update PM agent prompt to require US linkage