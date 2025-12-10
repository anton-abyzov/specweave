---
id: US-004
feature: FS-118E
title: Fallback for Manual Sync
status: completed
priority: P1
created: 2025-12-07
project: specweave
external:
  github:
    issue: 887
    url: https://github.com/anton-abyzov/specweave/issues/887
---

# US-004: Fallback for Manual Sync

**Feature**: [FS-118E](./FEATURE.md)

**As a** SpecWeave user,
**I want** to be able to manually trigger external sync if automatic sync was skipped,
**So that** I can recover from failures or delayed sync scenarios.

---

## Acceptance Criteria

- [x] **AC-US4-01**: `/specweave:sync-specs <increment-id>` continues to work as manual trigger
- [x] **AC-US4-02**: `/specweave:sync-progress` can be used for full sync (tasks→docs→external)
- [x] **AC-US4-03**: Clear error messages if external sync fails with retry instructions

---

## Implementation

**Increment**: [0118E-external-tool-sync-on-increment-start](../../../../increments/0118E-external-tool-sync-on-increment-start/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-004**: Verify E2E sync flow with permission checks
