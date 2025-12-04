---
id: US-001
feature: FS-107
title: "Schema-Aware Correction Prompts"
status: not_started
priority: high
created: 2025-12-04
---

**Origin**: 🏠 **Internal**


# US-001: Schema-Aware Correction Prompts

**Feature**: [FS-107](./FEATURE.md)

**As a** developer using analyzeStructured
**I want** correction prompts to show the actual expected schema
**So that** the LLM understands what format to produce on retry

---

## Acceptance Criteria

- [ ] **AC-US1-01**: `generateCorrectionPrompt()` accepts optional schema parameter
- [ ] **AC-US1-02**: Correction prompt displays the actual schema, not hardcoded living-docs fields
- [ ] **AC-US1-03**: Backward compatible - works without schema parameter

---

## Implementation

**Increment**: [0101-llm-json-extraction-hardening](../../../../increments/0101-llm-json-extraction-hardening/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] [T-002](../../../../increments/0101-llm-json-extraction-hardening/tasks.md#T-002): Make generateCorrectionPrompt schema-aware