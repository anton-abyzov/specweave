---
id: US-012
feature: FS-047
title: "Intelligent FS-XXX Folder Creation with Chronological ID Allocation"
status: completed
priority: P0
created: 2025-11-19
---

# US-012: Intelligent FS-XXX Folder Creation with Chronological ID Allocation

**Feature**: [FS-047](../../_features/FS-047/FEATURE.md)

**As a** developer syncing external work items to living docs
**I want** FS-XXX folders created with chronologically ordered IDs based on work item creation date
**So that** living docs structure reflects the actual timeline of work items and integrates seamlessly with existing increments

---

## Acceptance Criteria

- [x] **AC-US12-01**: Parse work item created date from external tool metadata (createdAt field)
- [x] **AC-US12-02**: Scan existing living docs FS-XXX folders to determine occupied ID ranges
- [x] **AC-US12-03**: Scan archived increments (_archive/) and consider their IDs as occupied
- [x] **AC-US12-04**: Allocate FS-XXX ID chronologically by comparing work item createdAt to existing increment/feature creation dates
- [x] **AC-US12-05**: Default behavior: append to end (increment max ID + 1) with E suffix if chronological insertion not feasible
- [x] **AC-US12-06**: Prevent ID collision - validate no existing FS-XXX or FS-XXXE before allocation
- [x] **AC-US12-07**: Create folder structure: `.specweave/docs/internal/specs/FS-XXXE/` with US subfolders
- [x] **AC-US12-08**: Add origin metadata to feature README.md (external source, import date, original feature ID)
- [x] **AC-US12-09**: Update next available ID tracker after allocation (prevent race conditions)

---

## Implementation

**Increment**: [0047-us-task-linkage](../../../../increments/0047-us-task-linkage/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-041**: Create FS-ID allocator with chronological allocation algorithm
- [x] **T-042**: Implement folder creation and ID registry
- [x] **T-043**: Integrate FS-ID allocator into external import flow
