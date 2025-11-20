---
id: US-001
feature: FS-031
title: "Rich External Issue Content"
status: complete
created: 2025-11-16
completed: 2025-11-16
---

# US-001: Rich External Issue Content

**Feature**: [FS-031](../../_features/FS-031/FEATURE.md)

**As a** stakeholder viewing GitHub/JIRA/ADO
**I want** to see full spec content (user stories, AC, tasks) in the external issue
**So that** I don't need to navigate to the repository to understand the feature

---

## Acceptance Criteria

- [x] **AC-US1-01**: External issues show executive summary (P1, testable)
- [x] **AC-US1-02**: External issues show all user stories with descriptions (P1, testable)
- [x] **AC-US1-03**: External issues show acceptance criteria (P1, testable)
- [x] **AC-US1-04**: External issues show linked tasks with GitHub issue numbers (P1, testable)
- [x] **AC-US1-05**: User stories collapsed by default in GitHub UI (P2, testable)
- [x] **AC-US1-06**: Issue descriptions immutable after creation; updates via progress comments (P1, testable)
- [ ] **AC-US1-07**: Progress comments show AC completion status with checkboxes (P1, testable)
- [ ] **AC-US1-08**: Progress comments create audit trail of changes over time (P2, testable)
- [ ] **AC-US1-09**: Architecture diagrams embedded (if available) (P3, testable)

---

## Implementation

**Increment**: [0031-external-tool-status-sync](../../../../../increments/0031-external-tool-status-sync/tasks.md)

**Source Tasks**: See increment tasks.md for complete task breakdown

---

## Business Rationale

External stakeholders (PM, clients, executives) need complete context without developer access to repository.

---

## Related User Stories

- [US-002: Task-Level Mapping & Traceability](us-002-task-level-mapping-traceability.md)
- [US-003: Status Mapping Configuration](us-003-status-mapping-configuration.md)
- [US-004: Bidirectional Status Sync](us-004-bidirectional-status-sync.md)
- [US-005: User Prompts on Completion](us-005-user-prompts-on-completion.md)
- [US-006: Conflict Resolution](us-006-conflict-resolution.md)
- [US-007: Multi-Tool Workflow Support](us-007-multi-tool-workflow-support.md)

---

**Status**: ✅ Complete
**Completed**: 2025-11-16
