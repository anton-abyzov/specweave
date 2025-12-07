---
id: US-006
feature: FS-086
title: "Discrepancy Commands"
status: completed
priority: P0
created: 2025-12-01
---

**Origin**: 🏠 **Internal**


# US-006: Discrepancy Commands

**Feature**: [FS-086](./FEATURE.md)

**As a** developer,
**I want** commands to view and manage discrepancies,
**So that** I can prioritize and track documentation work.

---

## Acceptance Criteria

- [x] **AC-US6-01**: `/specweave:discrepancies` lists all pending discrepancies
- [x] **AC-US6-02**: Filter by module: `--module payment`
- [x] **AC-US6-03**: Filter by type: `--type missing-docs`
- [x] **AC-US6-04**: Filter by severity: `--severity critical`
- [x] **AC-US6-05**: View single discrepancy: `/specweave:discrepancy DISC-0001`
- [x] **AC-US6-06**: Ignore discrepancy: `--ignore DISC-0001` with reason

---

## Implementation

**Increment**: [0086-brownfield-doc-analysis](../../../../../increments/0086-brownfield-doc-analysis/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] [T-006](../../../../../increments/0086-brownfield-doc-analysis/tasks.md#T-006): Create Discrepancy Commands