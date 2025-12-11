---
id: US-004
feature: FS-141
title: Update Validation Hooks
status: completed
priority: P1
created: 2025-12-11
project: specweave
external:
  github:
    issue: 917
    url: https://github.com/anton-abyzov/specweave/issues/917
---

# US-004: Update Validation Hooks

**Feature**: [FS-141](./FEATURE.md)

**As a** user editing spec.md files
**I want** validation hooks to allow optional frontmatter project field
**So that** I'm not blocked when following new best practices

---

## Acceptance Criteria

- [x] **AC-US4-01**: `spec-project-validator.sh` allows missing `project:` in single-project mode
- [x] **AC-US4-02**: `spec-project-validator.sh` allows missing `project:` in multi-project mode
- [x] **AC-US4-03**: Hook still validates per-US `**Project**:` fields are present
- [x] **AC-US4-04**: Error messages guide users to per-US fields
- [x] **AC-US4-05**: `per-us-project-validator.sh` executes before `spec-project-validator.sh`
- [x] **AC-US4-06**: All hook validation tests pass with optional frontmatter

---

## Implementation

**Increment**: [0141-frontmatter-removal-part1-implementation](../../../../increments/0141-frontmatter-removal-part1-implementation/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-022**: Update spec-project-validator.sh Hook
- [x] **T-023**: Elevate per-us-project-validator.sh to Primary
- [x] **T-024**: Update Validation Hook Tests
