---
id: US-002
epic: FS-028
title: "Single-Value Repository ID Input"
status: complete
created: 2025-11-15
completed: 2025-11-15
---

# US-002: Single-Value Repository ID Input

**Feature**: [FS-028](../../_features/FS-028/FEATURE.md)

**As a** developer configuring repository IDs
**I want** clear indication that only ONE ID per repository is allowed
**So that** I don't try to enter comma-separated values

---

## Acceptance Criteria

- [ ] **AC-US2-01**: Prompt shows single-value example (P0, testable)
- [ ] **AC-US2-02**: Validation explicitly blocks commas (P0, testable)
- [ ] **AC-US2-03**: Error message says "One ID at a time (no commas)" (P0, testable)

---

## Implementation

**Increment**: [0028-multi-repo-ux-improvements](../../../../../increments/0028-multi-repo-ux-improvements/tasks.md)

**Tasks**:
- [T-002: Fix Repository ID Single-Value Validation (US-002)](../../../../../increments/0028-multi-repo-ux-improvements/tasks.md#t-002-fix-repository-id-single-value-validation-us-002)

---

## Related User Stories

- [US-001: Clear Repository Count Prompt](us-001-clear-repository-count-prompt.md)
- [US-003: Project ID Validation](us-003-project-id-validation.md)
- [US-004: Auto-Detect Repository Count](us-004-auto-detect-repository-count.md)

---

**Status**: ✅ Complete
**Completed**: 2025-11-15
