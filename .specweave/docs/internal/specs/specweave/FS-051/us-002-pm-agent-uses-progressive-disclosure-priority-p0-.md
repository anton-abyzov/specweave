---
id: US-002
feature: FS-051
title: "Three-Tier Permission Model"
status: active
priority: P0
created: 2025-11-22
---

**Origin**: 🏠 **Internal**


# US-002: Three-Tier Permission Model

**Feature**: [FS-051](../../_features/FS-051/FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US2-01**: Config supports three independent flags
- [x] **AC-US2-02**: GATE 1 (`canUpsertInternalItems`) controls living docs sync
- [x] **AC-US2-03**: GATE 2 (`canUpdateExternalItems`) controls external tracker sync
- [x] **AC-US2-04**: GATE 3 (`autoSyncOnCompletion`) controls automatic trigger
- [x] **AC-US2-05**: GATE 4 (`sync.github.enabled`) controls GitHub-specific sync
- [x] **AC-US2-06**: Default config has `autoSyncOnCompletion: true`
- [ ] **AC-US2-07**: User sees clear message when sync skipped due to permission gates

---

## Implementation

**Increment**: [0051-automatic-github-sync](../../../../increments/0051-automatic-github-sync/spec.md)

**Tasks**: See increment tasks.md for implementation details.
