---
id: US-003
epic: FS-028
title: "Project ID Validation"
status: complete
created: 2025-11-15
completed: 2025-11-15
---

# US-003: Project ID Validation

**Feature**: [FS-028](../../_features/FS-028/FEATURE.md)

**As a** developer setting up GitHub sync
**I want** validation that project contexts are configured
**So that** I don't end up with broken sync configuration

---

## Acceptance Criteria

- [ ] **AC-US3-01**: Check if `.specweave/config.json` has `sync.projects` (P1, testable)
- [ ] **AC-US3-02**: Prompt to create project context if missing (P1, testable)
- [ ] **AC-US3-03**: Validation runs after GitHub credentials validated (P1, testable)

---

## Implementation

**Increment**: [0028-multi-repo-ux-improvements](../../../../../increments/0028-multi-repo-ux-improvements/tasks.md)

**Tasks**:
- [T-005: Create Project Validation Module (US-003)](../../../../../increments/0028-multi-repo-ux-improvements/tasks.md#t-005-create-project-validation-module-us-003)
- [T-006: Integrate Project Validation in GitHub Setup (US-003)](../../../../../increments/0028-multi-repo-ux-improvements/tasks.md#t-006-integrate-project-validation-in-github-setup-us-003)

---

## Related User Stories

- [US-001: Clear Repository Count Prompt](us-001-clear-repository-count-prompt.md)
- [US-002: Single-Value Repository ID Input](us-002-single-value-repository-id-input.md)
- [US-004: Auto-Detect Repository Count](us-004-auto-detect-repository-count.md)

---

**Status**: ✅ Complete
**Completed**: 2025-11-15
