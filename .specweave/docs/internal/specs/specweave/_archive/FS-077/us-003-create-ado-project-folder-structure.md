---
id: US-003
feature: FS-077
title: "Create ADO Project Folder Structure"
status: completed
priority: P1
created: 2025-11-27
---

# US-003: Create ADO Project Folder Structure

**Feature**: [FS-077](./FEATURE.md)

**As a** developer using area-path-based ADO organization
**I want** SpecWeave to create the appropriate folder structure
**So that** imported work items are organized correctly

---

## Acceptance Criteria

- [x] **AC-US3-01**: `specs/ADO-{project}/` folder created for by-project mode
- [x] **AC-US3-02**: `specs/ADO-{project}/{area-path}/` folders created for by-area mode
- [x] **AC-US3-03**: Folder creation happens during init, not just during import
- [x] **AC-US3-04**: Similar to JIRA's 2-level structure (`specs/JIRA-{project}/{board}/`)

---

## Implementation

**Increment**: [0077-ado-init-flow-critical-fixes](../../../../../../increments/_archive/0077-ado-init-flow-critical-fixes/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-006**: Add createAdoProjectFolders function
- [x] **T-007**: Call createAdoProjectFolders during init
