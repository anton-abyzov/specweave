---
id: US-005
feature: FS-031
title: User Prompts on Completion
status: complete
created: 2025-11-15
completed: 2025-11-15
external:
  github:
    issue: 598
    url: https://github.com/anton-abyzov/specweave/issues/598
---

# US-005: User Prompts on Completion

**Feature**: [FS-031](../../_features/FS-031/FEATURE.md)

**As a** SpecWeave user
**I want** to be prompted to update external status when completing increments
**So that** I can choose whether to sync (with context about what will happen)

---

## Acceptance Criteria

- [x] **AC-US5-01**: `/specweave:done` detects external link and prompts (P1, testable)
- [x] **AC-US5-02**: Prompt shows current external status (P1, testable)
- [x] **AC-US5-03**: Prompt shows what status will change to (P1, testable)
- [x] **AC-US5-04**: User can choose: Yes/No/Custom (P1, testable)
- [x] **AC-US5-05**: "Yes" updates external issue with completion comment (P1, testable)
- [x] **AC-US5-06**: "No" skips sync (user will update manually) (P1, testable)
- [x] **AC-US5-07**: "Custom" allows user to specify status (P2, testable)
- [x] **AC-US5-08**: Auto-sync mode available (skip prompts) (P3, testable)

---

## Implementation

**Increment**: [0031-external-tool-status-sync](../../../../../increments/0031-external-tool-status-sync/tasks.md)

**Tasks**:
- [T-012: Integrate Status Sync with /specweave:done Command](../../../../../increments/0031-external-tool-status-sync/tasks.md#t-012-integrate-status-sync-with-specweave-done-command)
- [T-017: Implement Auto-Sync Mode](../../../../../increments/0031-external-tool-status-sync/tasks.md#t-017-implement-auto-sync-mode)

---

## Business Rationale

User control prevents surprises and allows flexibility.

---

## Related User Stories

- [US-001: Rich External Issue Content](us-001-rich-external-issue-content.md)
- [US-002: Task-Level Mapping & Traceability](us-002-task-level-mapping-traceability.md)
- [US-003: Status Mapping Configuration](us-003-status-mapping-configuration.md)
- [US-004: Bidirectional Status Sync](us-004-bidirectional-status-sync.md)
- [US-006: Conflict Resolution](us-006-conflict-resolution.md)
- [US-007: Multi-Tool Workflow Support](us-007-multi-tool-workflow-support.md)

---

**Status**: ✅ Complete
**Completed**: 2025-11-15
