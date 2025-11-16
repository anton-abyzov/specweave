---
id: US-002
feature: FS-031
title: Task-Level Mapping & Traceability
status: complete
created: 2025-11-15
completed: 2025-11-15
external:
  github:
    issue: 595
    url: https://github.com/anton-abyzov/specweave/issues/595
---

# US-002: Task-Level Mapping & Traceability

**Feature**: [FS-031](../../_features/FS-031/FEATURE.md)

**As a** developer or PM
**I want** to see which tasks implement which user stories
**So that** I can track progress and understand implementation history

---

## Acceptance Criteria

- [x] **AC-US2-01**: Spec frontmatter includes linked_increments mapping (P1, testable)
- [x] **AC-US2-02**: User stories map to specific tasks (US-001 → T-001, T-002) (P1, testable)
- [x] **AC-US2-03**: Tasks include GitHub/JIRA/ADO issue numbers (P1, testable)
- [x] **AC-US2-04**: Can query "which increment implemented US-001?" (P2, testable)
- [ ] **AC-US2-05**: Traceability report shows complete history (P2, testable)
- [ ] **AC-US2-06**: Acceptance criteria map to task validation (P3, testable)

---

## Implementation

**Increment**: [0031-external-tool-status-sync](../../../../../increments/0031-external-tool-status-sync/tasks.md)

**Tasks**:
- [T-002: Create Spec-to-Increment Mapper](../../../../../increments/0031-external-tool-status-sync/tasks.md#t-002-create-spec-to-increment-mapper)

---

## Business Rationale

Traceability is essential for compliance, auditing, and understanding product evolution.

---

## Related User Stories

- [US-001: Rich External Issue Content](us-001-rich-external-issue-content.md)
- [US-003: Status Mapping Configuration](us-003-status-mapping-configuration.md)
- [US-004: Bidirectional Status Sync](us-004-bidirectional-status-sync.md)
- [US-005: User Prompts on Completion](us-005-user-prompts-on-completion.md)
- [US-006: Conflict Resolution](us-006-conflict-resolution.md)
- [US-007: Multi-Tool Workflow Support](us-007-multi-tool-workflow-support.md)

---

**Status**: ✅ Complete
**Completed**: 2025-11-15
