---
id: US-005
feature: FS-086
title: "Discrepancy → Increment Conversion"
status: completed
priority: P0
created: 2025-12-01
---

**Origin**: 🏠 **Internal**


# US-005: Discrepancy → Increment Conversion

**Feature**: [FS-086](./FEATURE.md)

**As a** developer,
**I want** to convert discrepancies into increments,
**So that** I can systematically address documentation gaps.

---

## Acceptance Criteria

- [x] **AC-US5-01**: Command `/specweave:discrepancy-to-increment` creates increment from discrepancies
- [x] **AC-US5-02**: Multiple discrepancies can be grouped into single increment
- [x] **AC-US5-03**: Increment spec auto-generated with discrepancy context
- [x] **AC-US5-04**: Discrepancy status changes to `in-progress` with increment link
- [x] **AC-US5-05**: When increment completes, discrepancies auto-marked `resolved`
- [ ] **AC-US5-06**: Resolution syncs to living docs

---

## Implementation

**Increment**: [0086-brownfield-doc-analysis](../../../../../increments/0086-brownfield-doc-analysis/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] [T-007](../../../../../increments/0086-brownfield-doc-analysis/tasks.md#T-007): Implement Discrepancy to Increment Flow