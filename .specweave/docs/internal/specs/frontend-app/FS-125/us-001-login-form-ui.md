---
id: US-001
feature: FS-125
title: "Login Form UI"
status: in_progress
priority: P1
created: 2025-12-08
project: frontend-app
board: web-team
external_provider: github
related_projects: [specweave]
---

# US-001: Login Form UI

**Feature**: [FS-125](./FEATURE.md)

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
