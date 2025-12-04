---
id: US-006
feature: FS-050
title: "ADO Area Path Mapping"
status: completed
priority: P1
created: 2025-11-21
---

# US-006: ADO Area Path Mapping

**Feature**: [FS-050](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US6-01**: Area Path Discovery
- [x] **AC-US6-02**: Granularity Selection
- [x] **AC-US6-03**: Top-Level Mapping
- [x] **AC-US6-04**: Two-Level Mapping
- [x] **AC-US6-05**: Full Tree Mapping
- [x] **AC-US6-06**: Bidirectional Sync (ADO ↔ SpecWeave)

---

## Implementation

**Increment**: [0050-external-tool-import-phase-1b-7](../../../../../../increments/_archive/0050-external-tool-import-phase-1b-7/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-051**: Implement AreaPathMapper Core Module
- [x] **T-052**: Implement Granularity Selection (Top-Level, Two-Level, Full Tree)
- [x] **T-053**: Implement promptAreaPathGranularity (User Choice)
- [x] **T-054**: Integrate Area Path Mapping into ADO Init Flow
- [x] **T-055**: Implement Area Path Rename Detection
- [x] **T-056**: Implement Bidirectional Sync (ADO ↔ SpecWeave)
- [x] **T-057**: Handle Area Path Deletions (Orphaned Projects)
- [x] **T-058**: Handle Area Path Naming Conflicts
- [x] **T-059**: E2E Test: Full ADO Area Path Workflow
- [x] **T-060**: Update ADR-0054 with Implementation Details
- [x] **T-061**: Integration Test: Area Path Tree Parsing (Real ADO API)
- [x] **T-062**: Document ADO Area Path Mapping in User Guide
