---
id: US-002
feature: FS-108
title: "Automatic Required Fields Extraction"
status: completed
priority: high
created: 2025-12-04
---

**Origin**: 🏠 **Internal**


# US-002: Automatic Required Fields Extraction

**Feature**: [FS-108](./FEATURE.md)

**As a** provider implementer
**I want** required fields to be auto-extracted from the schema
**So that** validation happens automatically without manual configuration

---

## Acceptance Criteria

- [x] **AC-US2-01**: New helper `extractRequiredFields(schema)` extracts field names
- [x] **AC-US2-02**: Providers pass extracted fields to `extractJson()`
- [x] **AC-US2-03**: Tests verify field validation works

---

## Implementation

**Increment**: [0101-llm-json-extraction-hardening](../../../../increments/0101-llm-json-extraction-hardening/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] [T-003](../../../../increments/0101-llm-json-extraction-hardening/tasks.md#T-003): Create extractRequiredFieldsFromSchema helper
- [x] [T-004](../../../../increments/0101-llm-json-extraction-hardening/tasks.md#T-004): Update providers to use required fields from schema