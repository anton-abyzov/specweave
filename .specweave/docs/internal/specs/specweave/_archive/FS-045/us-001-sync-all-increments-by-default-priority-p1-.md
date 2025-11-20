---
id: US-001
feature: FS-045
title: "Sync All Increments by Default (Priority: P1)"
status: completed
priority: P1
created: 2025-11-19T00:00:00.000Z
---

# US-001: Sync All Increments by Default (Priority: P1)

**Feature**: [FS-045](../../_features/FS-045/FEATURE.md)

**As a** developer working with SpecWeave
**I want** `/specweave:sync-docs` to sync all non-archived increments by default
**So that** I don't have to manually sync each increment and all living docs stay up to date

---

## Acceptance Criteria

- [x] **AC-US1-01**: `/specweave:sync-docs` without arguments syncs all increments with spec.md
- [x] **AC-US1-02**: Sync excludes `_archive` directory and other non-increment folders
- [x] **AC-US1-03**: `/specweave:sync-docs <increment-id>` still syncs specific increment (backward compat)
- [x] **AC-US1-04**: Command shows progress for each increment being synced
- [x] **AC-US1-05**: Command shows summary with success/failure counts
- [x] **AC-US1-06**: Failures in one increment don't stop sync of other increments
- [x] **AC-US1-07**: `--dry-run` flag works with sync-all mode

---

## Implementation

**Increment**: [0045-living-docs-external-sync](../../../../increments/0045-living-docs-external-sync/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] **T-001**: Add findAllSyncableIncrements() function
- [ ] **T-002**: Update syncSpecs() to default to all mode
- [ ] **T-003**: Update console output messages
