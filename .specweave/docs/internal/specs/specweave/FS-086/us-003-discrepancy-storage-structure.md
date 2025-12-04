---
id: US-003
feature: FS-086
title: "Discrepancy Storage Structure"
status: completed
priority: P0
created: 2025-12-01
---

**Origin**: 🏠 **Internal**


# US-003: Discrepancy Storage Structure

**Feature**: [FS-086](./FEATURE.md)

**As a** developer with many documentation gaps,
**I want** discrepancies stored in a structured, scalable folder,
**So that** I can manage thousands of discrepancies without file explosion.

---

## Acceptance Criteria

- [x] **AC-US3-01**: Create `.specweave/discrepancies/` folder structure
- [x] **AC-US3-02**: Store discrepancies in batched folders (0001-0100/, 0101-0200/)
- [x] **AC-US3-03**: Main `index.json` with summary stats and pagination
- [x] **AC-US3-04**: Discrepancy schema includes: id, type, module, severity, status, evidence
- [x] **AC-US3-05**: Support discrepancy types: missing-docs, stale-docs, knowledge-gap, missing-adr
- [x] **AC-US3-06**: Resolved discrepancies move to `resolved/YYYY-MM/` for archival

---

## Implementation

**Increment**: [0086-brownfield-doc-analysis](../../../../../increments/0086-brownfield-doc-analysis/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] [T-001](../../../../../increments/0086-brownfield-doc-analysis/tasks.md#T-001): Create Discrepancy Type System and Manager
- [x] [T-002](../../../../../increments/0086-brownfield-doc-analysis/tasks.md#T-002): Implement Batched Folder Storage