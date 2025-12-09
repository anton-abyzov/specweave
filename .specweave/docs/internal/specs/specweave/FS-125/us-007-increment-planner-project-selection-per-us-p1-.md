---
id: US-007
feature: FS-125
title: "Increment Planner Project Selection per US (P1)"
status: completed
priority: P1
created: 2025-12-08
project: specweave
related_projects: [frontend-app]
---

# US-007: Increment Planner Project Selection per US (P1)

**Feature**: [FS-125](./FEATURE.md)

**As a** user creating a new increment
**I want** the planner to ask for project per user story (if cross-cutting detected)
**So that** specs are generated with correct per-US targeting from the start

---

## Acceptance Criteria

- [x] **AC-US7-01**: Keyword detection identifies cross-cutting increments
- [x] **AC-US7-02**: For cross-cutting: prompt project selection per US
- [x] **AC-US7-03**: For single-project: auto-assign all USs to same project
- [x] **AC-US7-04**: Generated spec.md includes `**Project**:` per US
- [x] **AC-US7-05**: Validation ensures all USs have project before saving

---

## Implementation

**Increment**: [0125-cross-project-user-story-targeting](../../../../increments/0125-cross-project-user-story-targeting/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-015**: Create Cross-Cutting Detector Utility
- [x] **T-016**: Update increment-planner SKILL.md for Per-US Selection
- [x] **T-017**: Generate spec.md with Per-US Project Fields
