---
id: US-004
feature: FS-138
title: Single-Project Validation Guards (P0)
status: completed
priority: P0
created: 2025-12-10
project: specweave
external:
  github:
    issue: 893
    url: https://github.com/anton-abyzov/specweave/issues/893
---

# US-004: Single-Project Validation Guards (P0)

**Feature**: [FS-138](./FEATURE.md)

**As a** developer in single-project mode
**I want** automatic prevention of multi-project features
**So that** I don't accidentally create complexity

---

## Acceptance Criteria

- [x] **AC-US4-01**: Block `project:` field in spec.md if `multiProject.enabled=false`
- [x] **AC-US4-02**: Auto-fill `project:` with `project.name` in single-project mode
- [x] **AC-US4-03**: Prevent `board:` field in single-project mode (always)
- [x] **AC-US4-04**: Clear error messages guiding to `/specweave:enable-multiproject`
- [x] **AC-US4-05**: Update `spec-project-validator.sh` hook to check mode first

---

## Implementation

**Increment**: [0138-single-project-first-architecture](../../../../increments/0138-single-project-first-architecture/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-009**: Update spec-project-validator.sh hook
