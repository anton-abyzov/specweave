# Tasks: LLM JSON Extraction Hardening

## Task List

### T-001: Add input sanitization (BOM + trailing commas)
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03
**Status**: [x] completed
**Effort**: S

Update `extractJson()` to sanitize input before parsing:
- Strip UTF-8 BOM (`\uFEFF`)
- Clean trailing commas from arrays and objects

---

### T-002: Make generateCorrectionPrompt schema-aware
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Status**: [x] completed
**Effort**: S

Update signature to accept optional schema parameter and display actual schema in correction prompt.

---

### T-003: Create extractRequiredFieldsFromSchema helper
**User Story**: US-002
**Satisfies ACs**: AC-US2-01
**Status**: [x] completed
**Effort**: S

New function that extracts field names from a JSON schema object for validation.

---

### T-004: Update providers to use required fields from schema
**User Story**: US-002
**Satisfies ACs**: AC-US2-02, AC-US2-03
**Status**: [x] completed
**Effort**: M

Update all 7 providers to auto-extract required fields and pass to extractJson.

---

### T-005: Add retry wrapper for analyzeStructured
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04
**Status**: [x] completed
**Effort**: M

Create reusable retry wrapper that providers can use for structured output with correction prompts.

---

### T-006: Add tests for new functionality
**User Story**: US-004, US-001, US-002
**Satisfies ACs**: All
**Status**: [x] completed
**Effort**: M

Add tests for:
- BOM stripping
- Trailing comma cleanup
- Schema-aware correction prompts
- Required fields extraction
- Retry wrapper

---

### T-007: Validate and run full test suite
**User Story**: All
**Satisfies ACs**: All
**Status**: [x] completed
**Effort**: S

Run full test suite and verify no regressions.

---

## Progress Summary

| Status | Count |
|--------|-------|
| Completed | 7 |
| In Progress | 0 |
| Pending | 0 |
| **Total** | **7** |
