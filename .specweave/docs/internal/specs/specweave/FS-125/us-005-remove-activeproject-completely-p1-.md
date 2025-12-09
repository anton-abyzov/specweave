---
id: US-005
feature: FS-125
title: "Remove activeProject Completely (P1)"
status: completed
priority: P1
created: 2025-12-08
project: specweave
related_projects: [frontend-app]
---

# US-005: Remove activeProject Completely (P1)

**Feature**: [FS-125](./FEATURE.md)

**As a** framework maintainer
**I want** to remove `activeProject` from config and all code
**So that** the codebase has one clear model: per-US project targeting

---

## Acceptance Criteria

- [x] **AC-US5-01**: Remove `multiProject.activeProject` from config schema
- [x] **AC-US5-02**: Remove all code references to `activeProject`
- [x] **AC-US5-03**: Remove `/specweave:switch-project` command (no longer needed)
- [x] **AC-US5-04**: Update `specweave init` to NOT create activeProject
- [x] **AC-US5-05**: Clean up any tests referencing activeProject

---

## Implementation

**Increment**: [0125-cross-project-user-story-targeting](../../../../increments/0125-cross-project-user-story-targeting/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-020**: Remove activeProject from Config Schema
- [x] **T-021**: Remove All activeProject Code References
- [x] **T-022**: Remove /specweave:switch-project Command
