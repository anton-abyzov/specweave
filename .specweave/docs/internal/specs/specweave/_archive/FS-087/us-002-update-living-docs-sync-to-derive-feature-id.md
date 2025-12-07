---
id: US-002
feature: FS-087
title: "Update Living Docs Sync to Derive Feature ID"
status: completed
priority: P1
created: 2025-12-01
---

**Origin**: 🏠 **Internal**


# US-002: Update Living Docs Sync to Derive Feature ID

**Feature**: [FS-087](./FEATURE.md)

**As a** developer
**I want** living-docs-sync to derive feature ID from increment number
**So that** there's a single source of truth (increment ID)

---

## Acceptance Criteria

- [x] **AC-US2-01**: `getFeatureIdForIncrement()` derives ID, doesn't read from metadata
- [x] **AC-US2-02**: Remove `updateMetadataFeatureId()` function (no longer needed)
- [x] **AC-US2-03**: External sync still works with derived feature ID

---

## Implementation

**Increment**: [0087-remove-redundant-feature-id](../../../../../increments/0087-remove-redundant-feature-id/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] [T-002](../../../../../increments/0087-remove-redundant-feature-id/tasks.md#T-002): Update Living Docs Sync