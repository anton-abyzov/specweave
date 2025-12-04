---
id: US-002
feature: FS-091
title: "Intelligent 5-6 Level Hierarchy Mapping"
status: completed
priority: P0
created: 2025-12-02
---

**Origin**: 🏠 **Internal**


# US-002: Intelligent 5-6 Level Hierarchy Mapping

**Feature**: [FS-091](./FEATURE.md)

**As a** SpecWeave user with enterprise ADO setup (SAFe/CMMI)
**I want** Capabilities to map to `_epics/` and Epics to map to `FS-XXXE/`
**So that** my SpecWeave living docs preserve the full external hierarchy

---

## Acceptance Criteria

- [x] **AC-US2-01**: ADO Capability → SpecWeave Epic (`_epics/EP-XXXE/`) with proper ID format (P0, testable)
- [x] **AC-US2-02**: ADO Epic (child of Capability) → SpecWeave Feature (`FS-XXXE/`) with parent reference (P0, testable)
- [x] **AC-US2-03**: ADO Feature (standalone) → SpecWeave Feature (`FS-XXXE/`) (P0, testable)
- [x] **AC-US2-04**: Parent Capability referenced in Feature's FEATURE.md description (P1, testable)
- [x] **AC-US2-05**: No separate `_capabilities/` folder - only 4 folder levels (P0, testable)
- [x] **AC-US2-06**: Epic IDs use `EP-XXXE` format (consistent with `FS-XXXE`) (P0, testable)
- [x] **AC-US2-07**: Epic ID allocator prevents duplicates across all projects (P0, testable)

---

## Implementation

**Increment**: [0091-ado-hierarchy-intelligence](../../../../../increments/0091-ado-hierarchy-intelligence/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] [T-003](../../../../../increments/0091-ado-hierarchy-intelligence/tasks.md#T-003): Create Epic ID Allocator (EP-XXXE format)
- [x] [T-004](../../../../../increments/0091-ado-hierarchy-intelligence/tasks.md#T-004): Update Item Converter for 5-6 Level Hierarchy