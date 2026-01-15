---
id: US-001
feature: FS-145
title: Project Registry Data Model (P0)
status: completed
priority: P1
created: 2026-01-14
project: specweave
external:
  github:
    issue: 930
    url: https://github.com/anton-abyzov/specweave/issues/930
---

# US-001: Project Registry Data Model (P0)

**Feature**: [FS-145](./FEATURE.md)

**As a** SpecWeave developer
**I want** a centralized project registry with well-defined schema
**So that** all project information is stored in one place

---

## Acceptance Criteria

- [x] **AC-US1-01**: Create `ProjectRegistry` class in `src/core/project/project-registry.ts`
- [x] **AC-US1-02**: Define `Project` interface with: id, name, description, techStack, team, externalMappings
- [x] **AC-US1-03**: Define `ExternalMapping` interface: { github?: GitHubMapping, ado?: ADOMapping, jira?: JiraMapping }
- [x] **AC-US1-04**: Store registry in `.specweave/state/projects.json` (not config.json)
- [x] **AC-US1-05**: Unit tests for ProjectRegistry CRUD operations

---

## Implementation

**Increment**: [0145-project-registry-eda-sync](../../../../increments/0145-project-registry-eda-sync/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Create Project Types & Interfaces
- [x] **T-002**: Implement ProjectRegistry Class
- [x] **T-007**: Unit Tests for Core Registry
