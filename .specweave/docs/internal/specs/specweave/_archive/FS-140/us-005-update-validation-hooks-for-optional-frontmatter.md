---
id: US-005
feature: FS-140
title: Update Validation Hooks for Optional Frontmatter
status: completed
priority: P1
created: 2025-12-11
project: specweave
external:
  github:
    issue: 902
    url: https://github.com/anton-abyzov/specweave/issues/902
---

# US-005: Update Validation Hooks for Optional Frontmatter

**Feature**: [FS-140](./FEATURE.md)

**As a** user editing spec.md files
**I want** validation hooks to allow missing frontmatter `project:` field
**So that** I'm not blocked when following new best practices

---

## Acceptance Criteria

- [x] **AC-US5-01**: `spec-project-validator.sh` allows missing `project:` field in single-project mode
- [x] **AC-US5-02**: `spec-project-validator.sh` allows missing `project:` field in multi-project mode
- [x] **AC-US5-03**: Hook validates per-US `**Project**:` fields are present and valid
- [x] **AC-US5-04**: Hook provides helpful error messages pointing to per-US fields
- [x] **AC-US5-05**: `per-us-project-validator.sh` becomes primary validation (not secondary)
- [x] **AC-US5-06**: All validation tests pass with optional frontmatter

---

## Implementation

**Increment**: [0140-remove-frontmatter-project-field](../../../../increments/0140-remove-frontmatter-project-field/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-022**: Update spec-project-validator.sh Hook
- [x] **T-023**: Elevate per-us-project-validator.sh to Primary
- [x] **T-024**: Update Validation Hook Tests
