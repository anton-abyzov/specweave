---
id: US-009
feature: FS-137
title: "Living Docs Per-US Folder Placement (P1)"
status: completed
priority: P0
created: 2025-12-09
project: specweave
related_projects: []
---

# US-009: Living Docs Per-US Folder Placement (P1)

**Feature**: [FS-137](./FEATURE.md)

**As a** user with cross-project increments
**I want** living docs to place each US file in its declared project folder
**So that** each project's docs contain only relevant user stories

---

## Acceptance Criteria

- [x] **AC-US9-01**: `syncIncrement()` reads `project` field from each US
- [x] **AC-US9-02**: Each US file placed in `specs/{project}/FS-XXX/us-XXX.md`
- [x] **AC-US9-03**: Cross-project increments create FS-XXX folder in EACH project
- [x] **AC-US9-04**: FEATURE.md in each project links to related projects
- [x] **AC-US9-05**: 2-level structures place files in `specs/{project}/{board}/FS-XXX/`

---

## Implementation

**Increment**: [0137-per-us-project-board-enforcement](../../../../increments/0137-per-us-project-board-enforcement/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-018**: Modify syncIncrement for Per-US Folder Routing
- [x] **T-019**: Generate Cross-Project FEATURE.md Links
- [x] **T-020**: Handle 2-Level Project/Board Paths
- [x] **T-022**: Integration Tests for Cross-Project Workflow
