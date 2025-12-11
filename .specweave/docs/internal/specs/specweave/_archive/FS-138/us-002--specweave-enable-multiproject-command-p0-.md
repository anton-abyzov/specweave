---
id: US-002
feature: FS-138
title: /specweave:enable-multiproject Command (P0)
status: completed
priority: P0
created: 2025-12-10
project: specweave
external:
  github:
    issue: 891
    url: https://github.com/anton-abyzov/specweave/issues/891
---

# US-002: /specweave:enable-multiproject Command (P0)

**Feature**: [FS-138](./FEATURE.md)

**As a** developer with growing needs
**I want** explicit command to enable multi-project mode
**So that** I can upgrade when ready, not by accident

---

## Acceptance Criteria

- [x] **AC-US2-01**: Command prompts for confirmation with clear explanation
- [x] **AC-US2-02**: Migrates existing `project.name` to `multiProject.projects` structure
- [x] **AC-US2-03**: Sets `multiProject.enabled=true` only after user confirms
- [x] **AC-US2-04**: Creates project folders in `.specweave/docs/internal/specs/`
- [x] **AC-US2-05**: Validates no data loss during migration
- [x] **AC-US2-06**: Updates all existing increments with `project:` field if missing

---

## Implementation

**Increment**: [0138-single-project-first-architecture](../../../../increments/0138-single-project-first-architecture/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-004**: Create /specweave:enable-multiproject command
- [x] **T-005**: Create project folders during migration
- [x] **T-006**: Update existing increments with project field
- [ ] **T-015**: Write integration tests for commands
