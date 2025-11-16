---
id: US-003
feature: FS-031
title: "Status Mapping Configuration"
status: complete
created: 2025-11-16
completed: 2025-11-16
---

# US-003: Status Mapping Configuration

**Feature**: [FS-031](../../_features/FS-031/FEATURE.md)

**As a** SpecWeave user
**I want** to configure how SpecWeave statuses map to external tool statuses
**So that** I can match my team's workflow

---

## Acceptance Criteria

- [x] **AC-US3-01**: Config schema supports status mappings per tool (P1, testable)
- [x] **AC-US3-02**: Default mappings provided for GitHub/JIRA/ADO (P1, testable)
- [x] **AC-US3-03**: Users can customize mappings (P2, testable)
- [x] **AC-US3-04**: Validation prevents invalid mappings (P2, testable)
- [x] **AC-US3-05**: Tool-specific label/tag support (GitHub: labels, JIRA: none, ADO: tags) (P2, testable)

---

## Implementation

**Increment**: [0031-external-tool-status-sync](../../../../../increments/0031-external-tool-status-sync/tasks.md)

**Source Tasks**: See increment tasks.md for complete task breakdown

---

## Business Rationale

Different teams use different workflows; configuration enables flexibility.

---

## Related User Stories

- [US-001: Rich External Issue Content](us-001-rich-external-issue-content.md)
- [US-002: Task-Level Mapping & Traceability](us-002-task-level-mapping-traceability.md)
- [US-004: Bidirectional Status Sync](us-004-bidirectional-status-sync.md)
- [US-005: User Prompts on Completion](us-005-user-prompts-on-completion.md)
- [US-006: Conflict Resolution](us-006-conflict-resolution.md)
- [US-007: Multi-Tool Workflow Support](us-007-multi-tool-workflow-support.md)

---

**Status**: ✅ Complete
**Completed**: 2025-11-16
