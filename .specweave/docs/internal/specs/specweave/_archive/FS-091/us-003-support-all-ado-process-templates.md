---
id: US-003
feature: FS-091
title: "Support All ADO Process Templates"
status: completed
priority: P0
created: 2025-12-02
---

**Origin**: 🏠 **Internal**


# US-003: Support All ADO Process Templates

**Feature**: [FS-091](./FEATURE.md)

**As a** SpecWeave user with any ADO process template
**I want** correct hierarchy mapping regardless of template
**So that** import works for Agile, Scrum, CMMI, and SAFe setups

---

## Acceptance Criteria

- [x] **AC-US3-01**: Agile: Epic → Feature → User Story → Task (4 levels) (P0, testable)
- [x] **AC-US3-02**: Scrum: Epic → Feature → PBI → Task (4 levels) (P0, testable)
- [x] **AC-US3-03**: CMMI: Epic → Feature → Requirement → Task (4 levels) (P0, testable)
- [x] **AC-US3-04**: Basic: Issue → Task (2 levels) (P1, testable)
- [x] **AC-US3-05**: SAFe/Enterprise: Capability → Epic → Feature → US → Task (5 levels) (P0, testable)

---

## Implementation

**Increment**: [0091-ado-hierarchy-intelligence](../../../../../increments/0091-ado-hierarchy-intelligence/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] [T-006](../../../../../increments/0091-ado-hierarchy-intelligence/tasks.md#T-006): Support All Process Templates in Hierarchy Mapping