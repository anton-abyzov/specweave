---
id: US-007
feature: FS-138
title: Documentation Updates (P1)
status: completed
priority: P0
created: 2025-12-10
project: specweave
external:
  github:
    issue: 896
    url: https://github.com/anton-abyzov/specweave/issues/896
---

# US-007: Documentation Updates (P1)

**Feature**: [FS-138](./FEATURE.md)

**As a** developer
**I want** clear docs on single vs multi-project workflows
**So that** I understand when/how to use each mode

---

## Acceptance Criteria

- [x] **AC-US7-01**: CLAUDE.md explains single-project-first principle
- [x] **AC-US7-02**: Document `/specweave:enable-multiproject` flow
- [x] **AC-US7-03**: Document `/specweave:switch-project` usage
- [x] **AC-US7-04**: Update init command docs with default behavior

---

## Implementation

**Increment**: [0138-single-project-first-architecture](../../../../increments/0138-single-project-first-architecture/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-011**: Add CLAUDE.md section 2h
- [x] **T-012**: Create multi-project migration guide
- [x] **T-013**: Update README.md and init docs
