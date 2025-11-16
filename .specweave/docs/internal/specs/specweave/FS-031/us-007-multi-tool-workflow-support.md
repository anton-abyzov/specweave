---
id: US-007
feature: FS-031
title: Multi-Tool Workflow Support
status: complete
created: 2025-11-15
completed: 2025-11-15
external:
  github:
    issue: 600
    url: https://github.com/anton-abyzov/specweave/issues/600
---

# US-007: Multi-Tool Workflow Support

**Feature**: [FS-031](../../_features/FS-031/FEATURE.md)

**As a** SpecWeave user with custom workflows
**I want** to define tool-specific workflows and transitions
**So that** SpecWeave respects my team's process

---

## Acceptance Criteria

- [x] **AC-US7-01**: Detect tool-specific workflows (GitHub: simple, JIRA: complex) (P2, testable)
- [ ] **AC-US7-02**: Support custom workflow definitions (P3, testable)
- [ ] **AC-US7-03**: Validate status transitions against workflow (P3, testable)
- [ ] **AC-US7-04**: Suggest valid next states based on workflow (P3, testable)

---

## Implementation

**Increment**: [0031-external-tool-status-sync](../../../../../increments/0031-external-tool-status-sync/tasks.md)

**Tasks**:
- [T-015: Implement Workflow Detection](../../../../../increments/0031-external-tool-status-sync/tasks.md#t-015-implement-workflow-detection)

---

## Business Rationale

Advanced teams have sophisticated workflows; support them.

---

## Related User Stories

- [US-001: Rich External Issue Content](us-001-rich-external-issue-content.md)
- [US-002: Task-Level Mapping & Traceability](us-002-task-level-mapping-traceability.md)
- [US-003: Status Mapping Configuration](us-003-status-mapping-configuration.md)
- [US-004: Bidirectional Status Sync](us-004-bidirectional-status-sync.md)
- [US-005: User Prompts on Completion](us-005-user-prompts-on-completion.md)
- [US-006: Conflict Resolution](us-006-conflict-resolution.md)

---

**Status**: ✅ Complete
**Completed**: 2025-11-15
