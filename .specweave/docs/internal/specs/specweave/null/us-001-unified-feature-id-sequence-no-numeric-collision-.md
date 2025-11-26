---
id: US-001
feature: null
title: "Unified Feature ID Sequence (No Numeric Collision)"
status: not_started
priority: P1
created: 2025-11-26
---

# US-001: Unified Feature ID Sequence (No Numeric Collision)

**Feature**: [null](./FEATURE.md)

**As a** developer using SpecWeave with external imports
**I want** internal and external feature IDs to never share the same numeric index
**So that** I can reference features unambiguously without confusion

---

## Acceptance Criteria

- [ ] **AC-US1-01**: When `FS-001` exists (internal), next external feature gets `FS-002E` (not `FS-001E`)
- [ ] **AC-US1-02**: When `FS-001E` exists (external), next internal feature gets `FS-002` (not `FS-001`)
- [ ] **AC-US1-03**: Per-project sequences remain isolated (FS-001 in project-A, FS-001 in project-B are OK)
- [ ] **AC-US1-04**: Collision detection logs warning if numeric overlap detected
- [ ] **AC-US1-05**: Existing projects with collisions are not broken (backward compatible)

---

## Implementation

**Increment**: [0071-fix-feature-id-collision-github-import](../../../../increments/0071-fix-feature-id-collision-github-import/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
