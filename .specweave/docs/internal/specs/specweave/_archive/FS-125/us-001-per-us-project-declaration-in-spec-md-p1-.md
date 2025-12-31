---
id: US-001
feature: FS-125
title: "Per-US Project Declaration in spec.md (P1)"
status: completed
priority: P1
created: 2025-12-08
project: specweave
board: "per-user-story"
related_projects: [frontend-app]
---

# US-001: Per-US Project Declaration in spec.md (P1)

**Feature**: [FS-125](./FEATURE.md)

**As a** developer working on cross-cutting features
**I want** to declare `**Project**:` and `**Board**:` per user story in spec.md
**So that** each US syncs to the correct external tool project/board

---

## Acceptance Criteria

- [x] **AC-US1-01**: spec.md parser extracts `**Project**:` field from each US section
- [x] **AC-US1-02**: spec.md parser extracts `**Board**:` field from each US section (2-level)
- [x] **AC-US1-03**: Missing project field falls back to increment's default `project:`
- [x] **AC-US1-04**: Validation warns if US has no project (neither explicit nor default)
- [x] **AC-US1-05**: Project/board values are validated against config (must exist)
- [ ] **AC-US1-01**: ...

---

## Implementation

**Increment**: [0125-cross-project-user-story-targeting](../../../../increments/0125-cross-project-user-story-targeting/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Extend UserStoryData Type with Project/Board Fields
- [x] **T-002**: Update spec.md Parser to Extract Per-US Project
- [x] **T-004**: Validate US Project Against Config
