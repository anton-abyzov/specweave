---
id: US-006
feature: FS-137
title: "ADO Plugin Per-US Sync (P1)"
status: completed
priority: P0
created: 2025-12-09
project: specweave
related_projects: []
---

# US-006: ADO Plugin Per-US Sync (P1)

**Feature**: [FS-137](./FEATURE.md)

**As a** user with USs targeting different ADO area paths
**I want** ADO sync to create work items in the correct area path per US
**So that** each team's board shows only their relevant work items

---

## Acceptance Criteria

- [x] **AC-US6-01**: `specweave-ado` reads `projectMappings` from config.json
- [x] **AC-US6-02**: Sync groups USs by their `project` field
- [x] **AC-US6-03**: Each project group syncs to its mapped `ado.project/areaPath`
- [x] **AC-US6-04**: metadata.json stores `externalRefs` per US
- [x] **AC-US6-05**: USs without mapping show clear error
- [x] **AC-US6-06**: Work items tagged with area path correctly

---

## Implementation

**Increment**: [0137-per-us-project-board-enforcement](../../../../increments/0137-per-us-project-board-enforcement/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-016**: Update ADO Plugin for Per-US Sync
- [x] **T-017**: Store externalRefs per US in Metadata
