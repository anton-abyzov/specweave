---
id: US-004
feature: FS-075
title: "Fix Config Saving Bugs"
status: completed
priority: P1
created: 2025-12-02
---

# US-004: Fix Config Saving Bugs

**Feature**: [FS-075](./FEATURE.md)

**As a** developer
**I want** my ADO configuration saved correctly
**So that** import and sync work properly

---

## Acceptance Criteria

- [x] **AC-US4-01**: Fix `writeSyncConfig()` to use `adoCreds.org` not `adoCreds.organization`
- [x] **AC-US4-02**: Save selected teams in config.json
- [x] **AC-US4-03**: Save selected area paths in config.json
- [x] **AC-US4-04**: Build orgUrl correctly: `https://dev.azure.com/{org}`

---

## Implementation

**Increment**: [0075-smart-ado-init](../../../../../../increments/_archive/0075-smart-ado-init/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Fix writeSyncConfig org bug
- [x] **T-007**: Update credentials return to include areaPaths
- [x] **T-008**: Save area paths in writeSyncConfig
