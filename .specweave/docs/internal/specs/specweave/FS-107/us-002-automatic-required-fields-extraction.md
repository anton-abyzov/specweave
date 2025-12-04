---
id: US-002
feature: FS-107
title: "Automatic Required Fields Extraction"
status: not_started
priority: high
created: 2025-12-04
---

**Origin**: 🏠 **Internal**


# US-002: Automatic Required Fields Extraction

**Feature**: [FS-107](./FEATURE.md)

**As a** provider implementer
**I want** required fields to be auto-extracted from the schema
**So that** validation happens automatically without manual configuration

---

## Acceptance Criteria

- [ ] **AC-US2-01**: New helper `extractRequiredFields(schema)` extracts field names
- [ ] **AC-US2-02**: Providers pass extracted fields to `extractJson()`
- [ ] **AC-US2-03**: Tests verify field validation works

---

## Implementation

**Increment**: [0101-llm-json-extraction-hardening](../../../../increments/0101-llm-json-extraction-hardening/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] [T-003](../../../../increments/0101-llm-json-extraction-hardening/tasks.md#T-003): Create extractRequiredFieldsFromSchema helper
- [ ] [T-004](../../../../increments/0101-llm-json-extraction-hardening/tasks.md#T-004): Update providers to use required fields from schema