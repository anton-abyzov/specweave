---
id: US-001
feature: FS-080
title: "Remove ADO- Prefix from Folder Names"
status: completed
priority: P0
created: 2025-11-29
---

# US-001: Remove ADO- Prefix from Folder Names

**Feature**: [FS-080](./FEATURE.md)

**As a** developer using ADO integration
**I want** clean folder names without platform prefixes
**So that** my project structure is intuitive and clean

---

## Acceptance Criteria

- [x] **AC-US1-01**: Change UI display from `specs/ADO-{PROJECT}/` to `specs/{PROJECT}/`
- [x] **AC-US1-02**: Change UI display from `specs/ADO-{PROJECT}/{area}/` to `specs/{PROJECT}/{area}/`
- [x] **AC-US1-03**: Remove ADO- prefix from folder mapping generation in `confirmAdoMapping()`
- [x] **AC-US1-04**: Update `fs-id-allocator.ts` to not add ADO- prefix to container directories
- [x] **AC-US1-05**: Update documentation comments to reflect new naming

---

## Implementation

**Increment**: [0080-ado-folder-naming-fix](../../../../../../increments/_archive/0080-ado-folder-naming-fix/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Fix UI Display Strings
- [x] **T-002**: Fix Folder Mapping Generation
- [x] **T-003**: Update fs-id-allocator.ts Container Naming
- [x] **T-004**: Update Documentation Comments
- [x] **T-006**: Build and Test
