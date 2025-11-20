---
id: US-001
feature: FS-028
title: Clear Repository Count Prompt
status: complete
created: 2025-11-15
completed: 2025-11-15
external:
  github:
    issue: 579
    url: https://github.com/anton-abyzov/specweave/issues/579
---

# US-001: Clear Repository Count Prompt

**Feature**: [FS-028](../../_features/FS-028/FEATURE.md)

**As a** developer setting up multi-repo architecture
**I want** clear indication of what "repository count" means
**So that** I don't get confused about whether parent repo is included

---

## Acceptance Criteria

- [ ] **AC-US1-01**: Clarification shown BEFORE count prompt (P0, testable)
- [ ] **AC-US1-02**: Prompt says "IMPLEMENTATION repositories (not counting parent)" (P0, testable)
- [ ] **AC-US1-03**: Summary shown AFTER with total count (P0, testable)
- [ ] **AC-US1-04**: Default changed from 3 to 2 (P0, testable)

---

## Implementation

**Increment**: [0028-multi-repo-ux-improvements](../../../../../increments/0028-multi-repo-ux-improvements/tasks.md)

**Tasks**:
- [T-001: Update Repository Count Clarification (US-001)](../../../../../increments/0028-multi-repo-ux-improvements/tasks.md#t-001-update-repository-count-clarification-us-001)

---

## Related User Stories

- [US-002: Single-Value Repository ID Input](us-002-single-value-repository-id-input.md)
- [US-003: Project ID Validation](us-003-project-id-validation.md)
- [US-004: Auto-Detect Repository Count](us-004-auto-detect-repository-count.md)

---

**Status**: ✅ Complete
**Completed**: 2025-11-15
