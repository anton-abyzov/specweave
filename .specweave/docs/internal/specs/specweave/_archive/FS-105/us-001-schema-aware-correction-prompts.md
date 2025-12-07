---
id: US-001
feature: FS-105
title: "Schema-Aware Correction Prompts"
status: completed
priority: high
created: 2025-12-04
---

# US-001: Schema-Aware Correction Prompts

**Feature**: [FS-105](./FEATURE.md)

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

**Increment**: [0105-llm-json-extraction-hardening](../../../../increments/0105-llm-json-extraction-hardening/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-002**: Make generateCorrectionPrompt schema-aware
- [x] **T-006**: Add tests for new functionality
