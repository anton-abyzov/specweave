---
id: US-003
feature: FS-140
title: Update Living Docs Sync to Use Resolution Service
status: completed
priority: P1
created: 2025-12-11
project: specweave
external:
  github:
    issue: 900
    url: https://github.com/anton-abyzov/specweave/issues/900
---

# US-003: Update Living Docs Sync to Use Resolution Service

**Feature**: [FS-140](./FEATURE.md)

**As a** user syncing increments to living docs
**I want** living docs to use centralized project resolution
**So that** projects are assigned consistently without frontmatter

---

## Acceptance Criteria

- [x] **AC-US3-01**: `LivingDocsSync` constructor accepts `ProjectResolutionService` instance
- [x] **AC-US3-02**: `parseIncrementSpec()` no longer extracts `frontmatter.project`
- [x] **AC-US3-03**: `resolveProjectPath()` calls `projectResolution.resolveProjectForIncrement()`
- [x] **AC-US3-04**: Cross-project sync uses per-US projects exclusively
- [x] **AC-US3-05**: `extractUserStories()` defaultProject param uses resolved project (not frontmatter)
- [x] **AC-US3-06**: All living docs sync tests pass with new resolution

---

## Implementation

**Increment**: [0140-remove-frontmatter-project-field](../../../../increments/0140-remove-frontmatter-project-field/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-007**: Integrate ProjectResolutionService into LivingDocsSync
- [x] **T-008**: Update resolveProjectPath() Method
- [x] **T-009**: Update parseIncrementSpec() Method
- [x] **T-010**: Update Cross-Project Sync Logic
- [x] **T-011**: Update Living Docs Sync Tests
