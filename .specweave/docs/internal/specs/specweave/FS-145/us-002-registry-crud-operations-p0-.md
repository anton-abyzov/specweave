---
id: US-002
feature: FS-145
title: Registry CRUD Operations (P0)
status: completed
priority: P1
created: 2026-01-14
project: specweave
external:
  github:
    issue: 931
    url: https://github.com/anton-abyzov/specweave/issues/931
---

# US-002: Registry CRUD Operations (P0)

**Feature**: [FS-145](./FEATURE.md)

**As a** SpecWeave user
**I want** to add, update, list, and remove projects from the registry
**So that** I can manage my project portfolio

---

## Acceptance Criteria

- [x] **AC-US2-01**: `registry.addProject(project)` - adds new project, emits `ProjectCreated`
- [x] **AC-US2-02**: `registry.updateProject(id, updates)` - updates project, emits `ProjectUpdated`
- [x] **AC-US2-03**: `registry.removeProject(id)` - removes project, emits `ProjectDeleted`
- [x] **AC-US2-04**: `registry.getProject(id)` - returns project or null
- [x] **AC-US2-05**: `registry.listProjects()` - returns all projects
- [x] **AC-US2-06**: Validation: prevent duplicate IDs, require valid project name

---

## Implementation

**Increment**: [0145-project-registry-eda-sync](../../../../increments/0145-project-registry-eda-sync/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-002**: Implement ProjectRegistry Class
- [x] **T-003**: Implement CRUD Operations
- [x] **T-005**: Connect Registry to Event Bus
- [x] **T-007**: Unit Tests for Core Registry
