---
id: US-008
feature: FS-047
title: "ID Collision Resolution"
status: completed
priority: P0
created: 2025-11-19
---

# US-008: ID Collision Resolution

**Feature**: [FS-047](../../_features/FS-047/FEATURE.md)

**As a** developer creating mixed internal/external items
**I want** ID generation to avoid collisions between internal and external IDs
**So that** every item has a unique identifier with clear origin

---

## Acceptance Criteria

- [x] **AC-US8-01**: ID generator detects highest sequential number (ignoring suffix)
- [x] **AC-US8-02**: New internal items use next sequential number (no suffix)
- [x] **AC-US8-03**: New external items use next sequential number + E suffix
- [x] **AC-US8-04**: Mixed IDs allowed in same increment (US-001, US-002E, US-003, US-004E)
- [x] **AC-US8-05**: ID uniqueness validation before assignment
- [x] **AC-US8-06**: Legacy IDs preserved during migration (no renumbering)

---

## Implementation

**Increment**: [0047-us-task-linkage](../../../../increments/0047-us-task-linkage/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-028**: Create ID generator with origin suffix support
- [x] **T-029**: Update parsers to handle E suffix in IDs
- [x] **T-030**: Add ID uniqueness validation to increment planning
- [x] **T-031**: Preserve legacy IDs during migration (no renumbering)
