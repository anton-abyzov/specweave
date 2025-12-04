---
id: US-004
feature: FS-081
title: "Post-Init Clone Command"
status: completed
priority: P1
created: 2025-12-02
---

# US-004: Post-Init Clone Command

**Feature**: [FS-081](./FEATURE.md)

**As a** user who skipped cloning during init
**I want** a command to clone repos later
**So that** I can add repos without re-running init

---

## Acceptance Criteria

- [x] **AC-US4-01**: `/specweave-ado:clone-repos` command exists
- [x] **AC-US4-02**: Can specify project(s) and pattern
- [x] **AC-US4-03**: Uses same background job system
- [x] **AC-US4-04**: Shows progress and errors clearly

---

## Implementation

**Increment**: [0081-ado-repo-cloning](../../../../../../increments/_archive/0081-ado-repo-cloning/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-004**: Create /specweave-ado:clone-repos command
