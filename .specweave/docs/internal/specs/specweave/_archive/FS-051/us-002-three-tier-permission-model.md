---
id: US-002
feature: FS-051
title: "Three-Tier Permission Model"
status: completed
priority: P0
created: 2025-11-22T00:00:00.000Z
---

# US-002: Three-Tier Permission Model

**Feature**: [FS-051](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US2-01**: Config supports three independent flags
- [x] **AC-US2-02**: GATE 1 (`canUpsertInternalItems`) controls living docs sync
- [x] **AC-US2-03**: GATE 2 (`canUpdateExternalItems`) controls external tracker sync
- [x] **AC-US2-04**: GATE 3 (`autoSyncOnCompletion`) controls automatic trigger
- [x] **AC-US2-05**: GATE 4 (`sync.github.enabled`) controls GitHub-specific sync
- [x] **AC-US2-06**: Default config has `autoSyncOnCompletion: true`
- [x] **AC-US2-07**: User sees clear message when sync skipped due to permission gates

---

## Implementation

**Increment**: [0051-automatic-github-sync](../../../../../../increments/_archive/0051-automatic-github-sync/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Add `autoSyncOnCompletion` to Config Schema
- [x] **T-002**: Add Tool-Specific Gates to Config Schema
- [x] **T-003**: Implement 4-Gate Evaluation Logic in SyncCoordinator
- [x] **T-004**: Add User-Facing Gate Messages
- [x] **T-005**: Update `specweave init` to Include New Flags
- [ ] **T-024**: Create Integration Test for Permission Gates
- [x] **T-025**: Update User Documentation (README)
- [x] **T-026**: Create Migration Guide (v0.24 → v0.25)
