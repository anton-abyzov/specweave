---
id: US-004
feature: FS-028
title: Auto-Detect Repository Count
status: complete
created: 2025-11-15
completed: 2025-11-15
external:
  github:
    issue: 582
    url: https://github.com/anton-abyzov/specweave/issues/582
---

# US-004: Auto-Detect Repository Count

**Feature**: [FS-028](../../_features/FS-028/FEATURE.md)

**As a** developer with existing project folders
**I want** system to suggest repository count based on folder structure
**So that** I don't have to count manually

---

## Acceptance Criteria

- [ ] **AC-US4-01**: Detect common patterns (frontend, backend, api, etc.) (P2, testable)
- [ ] **AC-US4-02**: Show detected folders before prompt (P2, testable)
- [ ] **AC-US4-03**: Use detected count as default (P2, testable)

---

## Implementation

**Increment**: [0028-multi-repo-ux-improvements](../../../../../increments/0028-multi-repo-ux-improvements/tasks.md)

**Tasks**:
- [T-003: Create Folder Detection Module (US-004)](../../../../../increments/0028-multi-repo-ux-improvements/tasks.md#t-003-create-folder-detection-module-us-004)
- [T-004: Integrate Auto-Detection in Repository Setup (US-004)](../../../../../increments/0028-multi-repo-ux-improvements/tasks.md#t-004-integrate-auto-detection-in-repository-setup-us-004)

---

## Related User Stories

- [US-001: Clear Repository Count Prompt](us-001-clear-repository-count-prompt.md)
- [US-002: Single-Value Repository ID Input](us-002-single-value-repository-id-input.md)
- [US-003: Project ID Validation](us-003-project-id-validation.md)

---

**Status**: ✅ Complete
**Completed**: 2025-11-15
