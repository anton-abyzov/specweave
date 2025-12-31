---
id: US-005
feature: FS-137
title: "JIRA Plugin Per-US Sync (P1)"
status: completed
priority: P0
created: 2025-12-09
project: specweave
related_projects: []
---

# US-005: JIRA Plugin Per-US Sync (P1)

**Feature**: [FS-137](./FEATURE.md)

**As a** user with USs targeting different JIRA projects/boards
**I want** JIRA sync to create issues in the correct project per US
**So that** each JIRA board contains only relevant stories

---

## Acceptance Criteria

- [x] **AC-US5-01**: `specweave-jira` reads `projectMappings` from config.json
- [x] **AC-US5-02**: Sync groups USs by their `project` field
- [x] **AC-US5-03**: Each project group syncs to its mapped `jira.project/board`
- [x] **AC-US5-04**: metadata.json stores `externalRefs` per US
- [x] **AC-US5-05**: USs without mapping show clear error
- [x] **AC-US5-06**: Existing JIRA issues updated if already synced

---

## Implementation

**Increment**: [0137-per-us-project-board-enforcement](../../../../increments/0137-per-us-project-board-enforcement/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-015**: Update JIRA Plugin for Per-US Sync
- [x] **T-017**: Store externalRefs per US in Metadata
