---
id: US-006
feature: FS-031
title: "Conflict Resolution"
status: complete
created: 2025-11-16
completed: 2025-11-16
---

# US-006: Conflict Resolution

**Feature**: [FS-031](../../_features/FS-031/FEATURE.md)

**As a** SpecWeave user
**I want** conflicts handled gracefully when statuses diverge
**So that** I don't lose work or create inconsistencies

---

## Acceptance Criteria

- [x] **AC-US6-01**: Detect status conflicts (local vs remote differ) (P1, testable)
- [x] **AC-US6-02**: Configurable conflict resolution strategy (P1, testable)
- [x] **AC-US6-03**: "prompt" strategy asks user to resolve (P1, testable)
- [x] **AC-US6-04**: "last-write-wins" strategy uses most recent (P2, testable)
- [x] **AC-US6-05**: "specweave-wins" strategy keeps local status (P2, testable)
- [x] **AC-US6-06**: "external-wins" strategy uses external status (P2, testable)
- [x] **AC-US6-07**: Conflict log shows resolution history (P2, testable)

---

## Implementation

**Increment**: [0031-external-tool-status-sync](../../../../../increments/0031-external-tool-status-sync/tasks.md)

**Source Tasks**: See increment tasks.md for complete task breakdown

---

## Business Rationale

Robust conflict handling prevents data loss and maintains consistency.

---

## Related User Stories

- [US-001: Rich External Issue Content](us-001-rich-external-issue-content.md)
- [US-002: Task-Level Mapping & Traceability](us-002-task-level-mapping-traceability.md)
- [US-003: Status Mapping Configuration](us-003-status-mapping-configuration.md)
- [US-004: Bidirectional Status Sync](us-004-bidirectional-status-sync.md)
- [US-005: User Prompts on Completion](us-005-user-prompts-on-completion.md)
- [US-007: Multi-Tool Workflow Support](us-007-multi-tool-workflow-support.md)

---

**Status**: ✅ Complete
**Completed**: 2025-11-16
