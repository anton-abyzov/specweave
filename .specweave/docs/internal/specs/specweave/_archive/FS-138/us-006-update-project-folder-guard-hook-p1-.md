---
id: US-006
feature: FS-138
title: Update Project Folder Guard Hook (P1)
status: completed
priority: P0
created: 2025-12-10
project: specweave
external:
  github:
    issue: 895
    url: https://github.com/anton-abyzov/specweave/issues/895
---

# US-006: Update Project Folder Guard Hook (P1)

**Feature**: [FS-138](./FEATURE.md)

**As a** developer
**I want** project-folder-guard to respect single-project mode
**So that** validation logic is consistent

---

## Acceptance Criteria

- [x] **AC-US6-01**: Check `multiProject.enabled` flag FIRST
- [x] **AC-US6-02**: If false, only allow `project.name` folder
- [x] **AC-US6-03**: If true, check `multiProject.projects` structure
- [x] **AC-US6-04**: Error messages guide to correct mode
- [x] **AC-US6-05**: Hook handles both modes correctly

---

## Implementation

**Increment**: [0138-single-project-first-architecture](../../../../increments/0138-single-project-first-architecture/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-008**: Update project-folder-guard.sh hook
- [ ] **T-016**: Write hook integration tests
