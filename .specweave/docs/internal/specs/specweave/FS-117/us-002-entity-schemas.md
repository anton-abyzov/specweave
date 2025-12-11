---
id: US-002
feature: FS-117
title: Write Path - Incremental Updates
status: completed
priority: P1
created: 2025-12-11
project: specweave
external:
  github:
    issue: 843
    url: https://github.com/anton-abyzov/specweave/issues/843
---

# US-002: Write Path - Incremental Updates

**Feature**: [FS-117](./FEATURE.md)

**As a** SpecWeave user
**I want** cache to update incrementally when I complete tasks
**So that** updates are O(1) not O(n) where n = increment count

---

## Acceptance Criteria

- [x] **AC-US2-01**: Post-tool-use hook triggers cache update on metadata.json changes
- [x] **AC-US2-02**: Post-tool-use hook triggers cache update on tasks.md changes
- [x] **AC-US2-03**: Updates are incremental (only changed increment, not full rebuild)
- [x] **AC-US2-04**: Summary section recomputed efficiently (delta update)
- [x] **AC-US2-05**: Stale cache detection via mtime comparison

---

## Implementation

**Increment**: [0117-instant-dashboard-cache](../../../../increments/0117-instant-dashboard-cache/spec.md)

**Tasks**: See increment tasks.md for implementation details.
