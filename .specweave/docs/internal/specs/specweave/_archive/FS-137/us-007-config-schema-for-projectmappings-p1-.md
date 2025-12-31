---
id: US-007
feature: FS-137
title: "Config Schema for projectMappings (P1)"
status: completed
priority: P0
created: 2025-12-09
project: specweave
related_projects: []
---

# US-007: Config Schema for projectMappings (P1)

**Feature**: [FS-137](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US7-01**: JSON schema defines `projectMappings` structure
- [x] **AC-US7-02**: Each mapping has optional `github`, `jira`, `ado` sub-objects
- [x] **AC-US7-03**: GitHub mapping requires `owner` and `repo`
- [x] **AC-US7-04**: JIRA mapping requires `project`, optional `board`
- [x] **AC-US7-05**: ADO mapping requires `project`, optional `areaPath`
- [x] **AC-US7-06**: Schema validation runs on `specweave init` and config load

---

## Implementation

**Increment**: [0137-per-us-project-board-enforcement](../../../../increments/0137-per-us-project-board-enforcement/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-011**: Add projectMappings to Config Schema
- [x] **T-012**: Add Schema Validation on Config Load
- [x] **T-013**: Update Init to Prompt for Mappings (Optional)
