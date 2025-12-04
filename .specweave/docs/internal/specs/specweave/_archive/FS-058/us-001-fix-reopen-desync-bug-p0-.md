---
id: US-001
feature: FS-058
title: "Fix Reopen Desync Bug (P0)"
status: completed
priority: P0
created: 2025-11-24T00:00:00.000Z
---

# US-001: Fix Reopen Desync Bug (P0)

**Feature**: [FS-058](./FEATURE.md)

**As a** : Developer
**I want** : Increment reopen to keep spec.md and metadata.json in sync
**So that** : Status line shows accurate state after reopening

---

## Acceptance Criteria

- [x] **AC-US1-01**: `reopenIncrement()` uses `MetadataManager.updateStatus()` instead of direct write
- [x] **AC-US1-02**: After reopen, both spec.md and metadata.json have status = "active"
- [x] **AC-US1-03**: Status line cache updates correctly after reopen
- [x] **AC-US1-04**: No desync occurs when reopening completed increments

---

## Implementation

**Increment**: [0058-fix-status-sync-and-auto-github-update](../../../../../../increments/_archive/0058-fix-status-sync-and-auto-github-update/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Fix increment-reopener to use updateStatus()
- [x] **T-002**: Add reopen desync test
- [x] **T-003**: Update increment-reopener documentation
