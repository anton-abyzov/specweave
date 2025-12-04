---
id: US-001
feature: FS-074
title: "Internal Feature ID Collision Prevention"
status: completed
priority: P0
created: 2025-11-26
---

# US-001: Internal Feature ID Collision Prevention

**Feature**: [FS-074](./FEATURE.md)

**As a** developer using SpecWeave with external imports
**I want** internal feature IDs to never collide with external feature IDs
**So that** I can have clean, unambiguous feature folders

---

## Acceptance Criteria

- [x] **AC-US1-01**: When generating `FS-001` (internal), if `FS-001E` exists, use `FS-002`
- [x] **AC-US1-02**: Collision check applies to ALL internal ID generation code paths
- [x] **AC-US1-03**: Warning logged when collision avoided
- [x] **AC-US1-04**: Existing projects with collisions are not broken (backward compatible)

---

## Implementation

**Increment**: [0074-fix-internal-feature-collision-and-import](../../../../../../increments/_archive/0074-fix-internal-feature-collision-and-import/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Audit all internal ID generation code paths
- [x] **T-003**: Create unified collision check utility
- [x] **T-004**: Fix living-docs-sync.ts collision
- [x] **T-005**: Fix hierarchy-mapper.ts collision
- [x] **T-006**: Fix feature-id-manager.ts collision
- [x] **T-009**: Add collision prevention tests
