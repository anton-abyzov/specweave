---
id: US-002
feature: FS-063
title: "Feature Folder Structure for Imports"
status: completed
priority: P1
created: 2025-11-25T11:40:00Z
---

# US-002: Feature Folder Structure for Imports

**Feature**: [FS-063](./FEATURE.md)

**As a** SpecWeave user,
**I want** imported items placed in proper feature folder structure (FS-XXX/US-XXXE),
**So that** my living docs are organized consistently with internal items.

---

## Acceptance Criteria

- [x] **AC-US2-01**: When feature allocation is enabled, items go to `specs/FS-XXX/` folders
- [x] **AC-US2-02**: Feature folders have proper FEATURE.md with external origin metadata
- [x] **AC-US2-03**: User stories are placed inside feature folders with correct naming
- [x] **AC-US2-04**: FSIdAllocator is used for chronological feature ID placement

---

## Implementation

**Increment**: [0063-fix-external-import-multi-repo](../../../../../../increments/_archive/0063-fix-external-import-multi-repo/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-006**: Add enableFeatureAllocation flow to ItemConverter
- [x] **T-007**: Create FEATURE.md in allocated feature folders
- [x] **T-008**: Update file paths for feature folder structure
- [x] **T-009**: Enable feature allocation by default for external imports
- [x] **T-020**: Project-specific feature folder scanning
- [x] **T-018**: Add unit tests for feature folder creation
- [ ] **T-019**: Manual integration test with sw-thumbnail-ab
