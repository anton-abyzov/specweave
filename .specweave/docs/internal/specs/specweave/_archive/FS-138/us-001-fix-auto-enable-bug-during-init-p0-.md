---
id: US-001
feature: FS-138
title: Fix Auto-Enable Bug During Init (P0)
status: completed
priority: P0
created: 2025-12-10
project: specweave
external:
  github:
    issue: 890
    url: https://github.com/anton-abyzov/specweave/issues/890
---

# US-001: Fix Auto-Enable Bug During Init (P0)

**Feature**: [FS-138](./FEATURE.md)

**As a** developer running specweave init
**I want** config to default to single-project mode
**So that** I don't get multi-project complexity unless I need it

---

## Acceptance Criteria

- [x] **AC-US1-01**: `specweave init` creates config with `multiProject.enabled=false`
- [x] **AC-US1-02**: Only ONE project in config (from `project.name` field)
- [x] **AC-US1-03**: No `multiProject.projects` structure unless explicitly migrated
- [x] **AC-US1-04**: Existing single-project repos auto-detect and migrate to `enabled=false`

---

## Implementation

**Increment**: [0138-single-project-first-architecture](../../../../increments/0138-single-project-first-architecture/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-003**: Update init.ts to create single-project config
