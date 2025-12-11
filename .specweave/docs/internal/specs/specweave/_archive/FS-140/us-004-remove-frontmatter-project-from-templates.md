---
id: US-004
feature: FS-140
title: Remove Frontmatter Project from Templates
status: completed
priority: P1
created: 2025-12-11
project: specweave
external:
  github:
    issue: 901
    url: https://github.com/anton-abyzov/specweave/issues/901
---

# US-004: Remove Frontmatter Project from Templates

**Feature**: [FS-140](./FEATURE.md)

**As a** user creating new increments
**I want** spec templates without the `project:` field
**So that** I don't create unnecessary frontmatter

---

## Acceptance Criteria

- [x] **AC-US4-01**: `spec-single-project.md` template removes `project:` line
- [x] **AC-US4-02**: `spec-multi-project.md` template removes `project:` and `board:` lines
- [x] **AC-US4-03**: All 12 templates in `increment-planner/templates/` updated
- [x] **AC-US4-04**: Skill documentation updated to reflect removal
- [x] **AC-US4-05**: Template generation code doesn't add `project:` field
- [x] **AC-US4-06**: Example specs in docs updated to match new format

---

## Implementation

**Increment**: [0140-remove-frontmatter-project-field](../../../../increments/0140-remove-frontmatter-project-field/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-018**: Update Single-Project Template
- [x] **T-019**: Update Multi-Project Template
- [x] **T-020**: Update All Other Templates
- [x] **T-021**: Update Template Documentation
