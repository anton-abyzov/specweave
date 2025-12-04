---
id: US-001
feature: FS-108
title: "Schema-Aware Correction Prompts"
status: completed
priority: high
created: 2025-12-04
---

**Origin**: 🏠 **Internal**


# US-001: Schema-Aware Correction Prompts

**Feature**: [FS-108](./FEATURE.md)

**As a** developer using analyzeStructured
**I want** correction prompts to show the actual expected schema
**So that** the LLM understands what format to produce on retry

---

## Acceptance Criteria

- [x] **AC-US1-01**: `generateCorrectionPrompt()` accepts optional schema parameter
- [x] **AC-US1-02**: Correction prompt displays the actual schema, not hardcoded living-docs fields
- [x] **AC-US1-03**: Backward compatible - works without schema parameter

---

## Implementation

**Increment**: [0101-llm-json-extraction-hardening](../../../../increments/0101-llm-json-extraction-hardening/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] [T-002](../../../../increments/0101-llm-json-extraction-hardening/tasks.md#T-002): Make generateCorrectionPrompt schema-aware