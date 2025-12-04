---
id: US-001
feature: FS-087
title: "Remove feature_id from Type Definitions"
status: completed
priority: P1
created: 2025-12-01
---

**Origin**: 🏠 **Internal**


# US-001: Remove feature_id from Type Definitions

**Feature**: [FS-087](./FEATURE.md)

**As a** developer
**I want** the TypeScript types to not include redundant featureId
**So that** the schema is clean and self-documenting

---

## Acceptance Criteria

- [x] **AC-US1-01**: Remove `featureId` from `IncrementMetadataV2` interface
- [x] **AC-US1-02**: Add `deriveFeatureId(incrementId: string)` utility function
- [x] **AC-US1-03**: All existing usages of `metadata.feature_id` use derivation instead

---

## Implementation

**Increment**: [0087-remove-redundant-feature-id](../../../../../increments/0087-remove-redundant-feature-id/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] [T-001](../../../../../increments/0087-remove-redundant-feature-id/tasks.md#T-001): Update Type Definitions