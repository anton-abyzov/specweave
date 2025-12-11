---
id: US-004
feature: FS-125
title: "Project Mapping Configuration (P1)"
status: in_progress
priority: P1
created: 2025-12-08
project: specweave
related_projects: [frontend-app]
---

# US-004: Project Mapping Configuration (P1)

**Feature**: [FS-125](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US4-01**: config.json supports `projectMappings` section
- [x] **AC-US4-02**: Mapping includes: projectId, github repo, jira project/board, ado project/area
- [x] **AC-US4-03**: Missing mapping falls back to default profile
- [x] **AC-US4-04**: Validation error if US references unmapped project (with external sync enabled)
- [ ] **AC-US4-05**: `specweave init` prompts for project mappings during setup [DEFERRED]

---

## Implementation

**Increment**: [0125-cross-project-user-story-targeting](../../../../increments/0125-cross-project-user-story-targeting/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-003**: Add Project Mappings to Config Schema
