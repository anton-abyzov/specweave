---
id: US-001
feature: FS-098
title: "ADO Area Path to Repo Mapping"
status: not_started
priority: high
created: 2024-12-03
---

**Origin**: 🏠 **Internal**


# US-001: ADO Area Path to Repo Mapping

**Feature**: [FS-098](./FEATURE.md)

**As a** user with ADO-imported features organized by area paths (e.g., "Acme\Inventory")
**I want** SpecWeave to intelligently map area paths to cloned repositories
**So that** work items are correctly associated with their corresponding code modules

---

## Acceptance Criteria

- [ ] **AC-US1-01**: Area path "Acme\Inventory" matches repos "inventory-fe", "inventory-be"
- [ ] **AC-US1-02**: Team folder structure in specs/ maps to repo prefixes
- [ ] **AC-US1-03**: Matching works for 200+ repos with minimal false positives
- [ ] **AC-US1-04**: Unmatched items are reported with suggested mappings

---

## Implementation

**Increment**: [0098-umbrella-workitem-matching](../../../../../increments/0098-umbrella-workitem-matching/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] [T-001](../../../../../increments/0098-umbrella-workitem-matching/tasks.md#T-001): Enhance Work Item Matcher for Umbrella
- [ ] [T-002](../../../../../increments/0098-umbrella-workitem-matching/tasks.md#T-002): Add ADO Area Path to Repo Mapping
- [ ] [T-005](../../../../../increments/0098-umbrella-workitem-matching/tasks.md#T-005): Unit Tests for Work Item Matching
- [ ] [T-006](../../../../../increments/0098-umbrella-workitem-matching/tasks.md#T-006): Integration Test Full Pipeline