---
id: US-003
feature: FS-075
title: "Smart Area Path Selection"
status: completed
priority: P1
created: 2025-12-02
---

# US-003: Smart Area Path Selection

**Feature**: [FS-075](./FEATURE.md)

**As a** developer with multiple area paths
**I want** to select which area paths to sync
**So that** only relevant work items are imported

---

## Acceptance Criteria

- [x] **AC-US3-01**: Show hierarchical area paths (e.g., `Acme\Digital-Service-Operations`)
- [x] **AC-US3-02**: Default to root area path if none selected
- [x] **AC-US3-03**: Store selected area paths in config.json
- [x] **AC-US3-04**: Support area path filtering in import queries

---

## Implementation

**Increment**: [0075-smart-ado-init](../../../../../../increments/_archive/0075-smart-ado-init/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-005**: Add multi-select prompt for area paths
- [x] **T-007**: Update credentials return to include areaPaths
