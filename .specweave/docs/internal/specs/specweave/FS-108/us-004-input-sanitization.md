---
id: US-004
feature: FS-108
title: "Input Sanitization"
status: completed
priority: high
created: 2025-12-04
---

**Origin**: 🏠 **Internal**


# US-004: Input Sanitization

**Feature**: [FS-108](./FEATURE.md)

**As a** JSON extractor
**I want** to handle common LLM output quirks
**So that** edge cases don't cause failures

---

## Acceptance Criteria

- [x] **AC-US4-01**: Strip UTF-8 BOM character if present
- [x] **AC-US4-02**: Clean trailing commas in arrays/objects
- [x] **AC-US4-03**: Tests for BOM and trailing comma handling

---

## Implementation

**Increment**: [0101-llm-json-extraction-hardening](../../../../increments/0101-llm-json-extraction-hardening/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] [T-001](../../../../increments/0101-llm-json-extraction-hardening/tasks.md#T-001): Add input sanitization (BOM + trailing commas)
- [x] [T-006](../../../../increments/0101-llm-json-extraction-hardening/tasks.md#T-006): Add tests for new functionality