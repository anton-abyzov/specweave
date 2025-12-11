---
id: US-002
feature: FS-140
title: Implement Centralized Project Resolution Service
status: completed
priority: P1
created: 2025-12-11
project: specweave
external:
  github:
    issue: 899
    url: https://github.com/anton-abyzov/specweave/issues/899
---

# US-002: Implement Centralized Project Resolution Service

**Feature**: [FS-140](./FEATURE.md)

**As a** developer working with project assignments
**I want** a single, authoritative project resolution service
**So that** all code paths use consistent, correct project information

---

## Acceptance Criteria

- [x] **AC-US2-01**: New `ProjectResolutionService` class created in `src/core/project/project-resolution.ts`
- [x] **AC-US2-02**: Service has `resolveProjectForIncrement(incrementId): Promise<string>` method
- [x] **AC-US2-03**: Resolution priority: per-US fields → config → intelligent detection
- [x] **AC-US2-04**: Service caches resolved projects per increment (runtime state)
- [x] **AC-US2-05**: Service validates resolved project exists in config
- [x] **AC-US2-06**: Service handles single-project and multi-project modes correctly
- [x] **AC-US2-07**: Service logs resolution path and confidence for debugging

---

## Implementation

**Increment**: [0140-remove-frontmatter-project-field](../../../../increments/0140-remove-frontmatter-project-field/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Create ProjectResolutionService Class
- [x] **T-002**: Implement Per-US Field Extraction
- [x] **T-003**: Implement Config-Based Resolution
- [x] **T-004**: Implement Intelligent Detection
- [x] **T-005**: Add Caching and Cache Management
