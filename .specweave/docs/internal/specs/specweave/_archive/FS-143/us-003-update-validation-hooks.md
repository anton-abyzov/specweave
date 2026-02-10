---
id: US-003
feature: FS-143
title: Update Validation Hooks
status: completed
priority: P1
created: 2026-01-14
project: specweave
external:
  github:
    issue: 924
    url: https://github.com/anton-abyzov/specweave/issues/924
---

# US-003: Update Validation Hooks

**Feature**: [FS-143](./FEATURE.md)

**As a** user editing spec.md files
**I want** validation hooks to allow missing frontmatter `project:` field
**So that** I'm not blocked when following new best practices

---

## Acceptance Criteria

- [x] **AC-US3-01**: `spec-project-validator.sh` allows optional frontmatter (T-022)
- [x] **AC-US3-02**: `per-us-project-validator.sh` is primary validation (T-023)
- [x] **AC-US3-03**: All validation tests pass (T-024)

---

## Implementation

**Increment**: [0143-frontmatter-removal-code-templates-tests](../../../../increments/0143-frontmatter-removal-code-templates-tests/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-011**: Update Living Docs Sync Tests
