---
id: US-003
feature: FS-118E
title: Permission Checking Before External Sync
status: completed
priority: P1
created: 2025-12-07
project: specweave
external:
  github:
    issue: 886
    url: https://github.com/anton-abyzov/specweave/issues/886
---

# US-003: Permission Checking Before External Sync

**Feature**: [FS-118E](./FEATURE.md)

**As a** SpecWeave administrator,
**I want** external sync to respect the `sync.settings` permissions,
**So that** I can control what operations are allowed on external tools.

---

## Acceptance Criteria

- [x] **AC-US3-01**: Check `canUpsertInternalItems` BEFORE creating GitHub/JIRA/ADO issues
- [x] **AC-US3-02**: Check `canUpdateExternalItems` BEFORE updating external items
- [x] **AC-US3-03**: Check `canUpdateStatus` BEFORE updating issue/work item status
- [x] **AC-US3-04**: Log clear message when permission denied: "⚠️ Skipping - canUpsertInternalItems is disabled"
- [x] **AC-US3-05**: Permission checks happen in `syncToExternalTools()` BEFORE calling individual sync methods

---

## Implementation

**Increment**: [0118E-external-tool-sync-on-increment-start](../../../../increments/0118E-external-tool-sync-on-increment-start/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-002**: Add permission checks to syncToExternalTools
- [x] **T-004**: Verify E2E sync flow with permission checks
