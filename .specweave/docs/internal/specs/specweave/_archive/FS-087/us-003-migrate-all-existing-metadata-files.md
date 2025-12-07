---
id: US-003
feature: FS-087
title: "Migrate All Existing Metadata Files"
status: completed
priority: P1
created: 2025-12-01
---

**Origin**: 🏠 **Internal**


# US-003: Migrate All Existing Metadata Files

**Feature**: [FS-087](./FEATURE.md)

**As a** maintainer
**I want** all existing metadata.json files cleaned up
**So that** the codebase is consistent

---

## Acceptance Criteria

- [x] **AC-US3-01**: Remove `feature_id` from all active increment metadata.json
- [x] **AC-US3-02**: Remove `featureId` from all active increment metadata.json
- [x] **AC-US3-03**: Remove `relatedIncrements` from all increment metadata.json
- [x] **AC-US3-04**: Archive increments also cleaned up

---

## Implementation

**Increment**: [0087-remove-redundant-feature-id](../../../../../increments/0087-remove-redundant-feature-id/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] [T-003](../../../../../increments/0087-remove-redundant-feature-id/tasks.md#T-003): Create and Run Migration Script
- [x] [T-004](../../../../../increments/0087-remove-redundant-feature-id/tasks.md#T-004): Run Migration on All Increments