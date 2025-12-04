---
id: US-003
feature: FS-108
title: "Retry Wrapper for Providers"
status: completed
priority: high
created: 2025-12-04
---

**Origin**: 🏠 **Internal**


# US-003: Retry Wrapper for Providers

**Feature**: [FS-108](./FEATURE.md)

**As a** caller of analyzeStructured
**I want** automatic retry on JSON parse failure
**So that** transient LLM format errors are handled gracefully

---

## Acceptance Criteria

- [x] **AC-US3-01**: New `analyzeStructuredWithRetry()` wrapper function
- [x] **AC-US3-02**: Configurable max retries (default: 2)
- [x] **AC-US3-03**: Uses correction prompt on retry
- [x] **AC-US3-04**: At least anthropic-provider uses new wrapper

---

## Implementation

**Increment**: [0101-llm-json-extraction-hardening](../../../../increments/0101-llm-json-extraction-hardening/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] [T-005](../../../../increments/0101-llm-json-extraction-hardening/tasks.md#T-005): Add retry wrapper for analyzeStructured