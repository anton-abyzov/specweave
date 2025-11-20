---
id: US-004
feature: FS-031
title: "Bidirectional Status Sync"
status: complete
created: 2025-11-16
completed: 2025-11-16
---

# US-004: Bidirectional Status Sync

**Feature**: [FS-031](../../_features/FS-031/FEATURE.md)

**As a** SpecWeave user
**I want** status changes to sync automatically between SpecWeave and external tools
**So that** I don't manually update status in two places

---

## Acceptance Criteria

- [x] **AC-US4-01**: SpecWeave status change triggers external update (P1, testable)
- [x] **AC-US4-02**: External issue close triggers SpecWeave prompt (P1, testable)
- [x] **AC-US4-03**: External issue reopen triggers SpecWeave prompt (P2, testable)
- [x] **AC-US4-04**: Sync logs include timestamp and reason (P2, testable)
- [x] **AC-US4-05**: Failed syncs retry with exponential backoff (P2, testable)
- [x] **AC-US4-06**: Sync works for GitHub, JIRA, and ADO (P1, testable)

---

## Implementation

**Increment**: [0031-external-tool-status-sync](../../../../../increments/0031-external-tool-status-sync/tasks.md)

**Source Tasks**: See increment tasks.md for complete task breakdown

---

## Business Rationale

Automation eliminates manual work and keeps teams synchronized.

---

## Related User Stories

- [US-001: Rich External Issue Content](us-001-rich-external-issue-content.md)
- [US-002: Task-Level Mapping & Traceability](us-002-task-level-mapping-traceability.md)
- [US-003: Status Mapping Configuration](us-003-status-mapping-configuration.md)
- [US-005: User Prompts on Completion](us-005-user-prompts-on-completion.md)
- [US-006: Conflict Resolution](us-006-conflict-resolution.md)
- [US-007: Multi-Tool Workflow Support](us-007-multi-tool-workflow-support.md)

---

**Status**: ✅ Complete
**Completed**: 2025-11-16
