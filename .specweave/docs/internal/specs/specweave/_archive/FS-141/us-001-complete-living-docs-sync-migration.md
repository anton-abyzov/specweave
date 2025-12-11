---
id: US-001
feature: FS-141
title: Complete Living Docs Sync Migration
status: completed
priority: P1
created: 2025-12-11
project: specweave
external:
  github:
    issue: 914
    url: https://github.com/anton-abyzov/specweave/issues/914
---

# US-001: Complete Living Docs Sync Migration

**Feature**: [FS-141](./FEATURE.md)

**As a** developer maintaining living docs sync
**I want** all living docs sync tests passing with new resolution service
**So that** the migration is complete and verified

---

## Acceptance Criteria

- [x] **AC-US1-01**: All living docs sync tests updated to use ProjectResolutionService
- [x] **AC-US1-02**: No test references to `frontmatter.project` remain
- [x] **AC-US1-03**: Mock objects include resolution service
- [x] **AC-US1-04**: All existing tests pass without regressions

---

## Implementation

**Increment**: [0141-frontmatter-removal-part1-implementation](../../../../increments/0141-frontmatter-removal-part1-implementation/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-011**: Update Living Docs Sync Tests
