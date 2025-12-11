---
id: US-005
feature: FS-138
title: Config Migration for Existing Repos (P0)
status: completed
priority: P0
created: 2025-12-10
project: specweave
external:
  github:
    issue: 894
    url: https://github.com/anton-abyzov/specweave/issues/894
---

# US-005: Config Migration for Existing Repos (P0)

**Feature**: [FS-138](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US5-01**: Detect single project (only one entry in `multiProject.projects`)
- [x] **AC-US5-02**: Auto-set `multiProject.enabled=false` if single project
- [x] **AC-US5-03**: Preserve all existing project metadata
- [x] **AC-US5-04**: Migration runs automatically on next specweave command
- [x] **AC-US5-05**: Log migration to `.specweave/logs/migration.log`

---

## Implementation

**Increment**: [0138-single-project-first-architecture](../../../../increments/0138-single-project-first-architecture/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Create SingleProjectMigrator utility
- [x] **T-002**: Integrate migrator into ConfigManager
- [ ] **T-014**: Write unit tests for migrator
