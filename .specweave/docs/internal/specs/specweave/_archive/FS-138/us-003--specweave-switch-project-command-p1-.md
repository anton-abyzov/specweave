---
id: US-003
feature: FS-138
title: /specweave:switch-project Command (P1)
status: completed
priority: P0
created: 2025-12-10
project: specweave
external:
  github:
    issue: 892
    url: https://github.com/anton-abyzov/specweave/issues/892
---

# US-003: /specweave:switch-project Command (P1)

**Feature**: [FS-138](./FEATURE.md)

**As a** developer in multi-project mode
**I want** to switch active project context
**So that** new increments target correct project

---

## Acceptance Criteria

- [x] **AC-US3-01**: Lists available projects from config
- [x] **AC-US3-02**: Updates `multiProject.activeProject`
- [x] **AC-US3-03**: Only works if `multiProject.enabled=true`
- [x] **AC-US3-04**: Validates project exists before switching
- [x] **AC-US3-05**: Shows current active project in status

---

## Implementation

**Increment**: [0138-single-project-first-architecture](../../../../increments/0138-single-project-first-architecture/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-007**: Create /specweave:switch-project command
- [ ] **T-015**: Write integration tests for commands
