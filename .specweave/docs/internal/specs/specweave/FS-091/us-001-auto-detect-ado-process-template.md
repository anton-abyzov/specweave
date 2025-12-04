---
id: US-001
feature: FS-091
title: "Auto-Detect ADO Process Template"
status: completed
priority: P0
created: 2025-12-02
---

**Origin**: 🏠 **Internal**


# US-001: Auto-Detect ADO Process Template

**Feature**: [FS-091](./FEATURE.md)

**As a** SpecWeave user importing from Azure DevOps
**I want** the system to automatically detect my ADO process template
**So that** hierarchy mapping uses the correct work item type hierarchy

---

## Acceptance Criteria

- [x] **AC-US1-01**: Detect process template via ADO API during init/import (P0, testable)
- [x] **AC-US1-02**: Store detected template in `config.json` under ADO profile (P0, testable)
- [x] **AC-US1-03**: Support templates: Agile, Scrum, CMMI, Basic, SAFe/CMMI with Capabilities (P0, testable)
- [x] **AC-US1-04**: Log detected template during import for user visibility (P1, testable)

---

## Implementation

**Increment**: [0091-ado-hierarchy-intelligence](../../../../../increments/0091-ado-hierarchy-intelligence/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] [T-001](../../../../../increments/0091-ado-hierarchy-intelligence/tasks.md#T-001): Add ADO Process Template Detection to ADO Client
- [x] [T-002](../../../../../increments/0091-ado-hierarchy-intelligence/tasks.md#T-002): Update Config Types for Process Template
- [x] [T-005](../../../../../increments/0091-ado-hierarchy-intelligence/tasks.md#T-005): Update ADO Importer to Store Process Template
- [x] [T-007](../../../../../increments/0091-ado-hierarchy-intelligence/tasks.md#T-007): Unit tests pass