---
id: US-003
feature: FS-141
title: Update All Templates
status: completed
priority: P1
created: 2025-12-11
project: specweave
external:
  github:
    issue: 916
    url: https://github.com/anton-abyzov/specweave/issues/916
---

# US-003: Update All Templates

**Feature**: [FS-141](./FEATURE.md)

**As a** user creating new increments
**I want** templates without redundant `project:` frontmatter
**So that** new specs follow best practices from the start

---

## Acceptance Criteria

- [x] **AC-US3-01**: `spec-single-project.md` template removes `project:` line
- [x] **AC-US3-02**: `spec-multi-project.md` template removes `project:` and `board:` lines
- [x] **AC-US3-03**: All 12 templates in `increment-planner/templates/` updated
- [x] **AC-US3-04**: Template generation code doesn't add `project:` field
- [x] **AC-US3-05**: Example specs in skill docs updated to match
- [x] **AC-US3-06**: Template documentation explains new structure

---

## Implementation

**Increment**: [0141-frontmatter-removal-part1-implementation](../../../../increments/0141-frontmatter-removal-part1-implementation/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-018**: Update Single-Project Template
- [x] **T-019**: Update Multi-Project Template
- [x] **T-020**: Update All Other Templates
- [x] **T-021**: Update Template Documentation
