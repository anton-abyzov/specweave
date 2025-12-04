---
id: US-002
feature: FS-067
title: "External Import Reliability"
status: completed
priority: P1
created: 2025-11-26
---

# US-002: External Import Reliability

**Feature**: [FS-067](./FEATURE.md)

**As a** developer with GitHub issues
**I want** external import to work with multi-repo profiles
**So that** existing issues are imported to living docs

---

## Acceptance Criteria

- [x] **AC-US2-01**: Import works when `github=null` but sync profiles exist
- [x] **AC-US2-02**: GitHub config built from `repoSelectionConfig` when available
- [x] **AC-US2-03**: Error messages include actual error details
- [x] **AC-US2-04**: Per-repo failures shown for multi-repo imports

---

## Implementation

**Increment**: [0067-multi-project-init-bugs](../../../../../../increments/_archive/0067-multi-project-init-bugs/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-002**: Fix GitHub config condition for profiles-only mode
- [x] **T-003**: Improve error messages in external import
- [x] **T-004**: Log actual errors in init.ts
- [x] **T-005**: Verify fixes with test
