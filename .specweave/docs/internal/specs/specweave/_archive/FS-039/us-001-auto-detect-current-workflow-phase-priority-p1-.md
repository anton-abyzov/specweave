---
id: US-001
feature: FS-039
title: "Auto-Detect Current Workflow Phase (Priority: P1)"
status: completed
priority: P1
created: 2025-11-16
---

# US-001: Auto-Detect Current Workflow Phase (Priority: P1)

**Feature**: [FS-039](../../_features/FS-039/FEATURE.md)

**As a** developer working in SpecWeave
**I want** /specweave:next to automatically detect where I am in the workflow
**So that** I don't need to remember which command to run next

---

## Acceptance Criteria

- [ ] **AC-US1-01**: Detect if no increments exist (clean slate)
- [ ] **AC-US1-02**: Detect if spec.md exists but no plan.md/tasks.md (needs planning)
- [ ] **AC-US1-03**: Detect if plan.md/tasks.md exist with incomplete tasks (needs execution)
- [ ] **AC-US1-04**: Detect if all P1 tasks completed but not validated (needs validation)
- [ ] **AC-US1-05**: Detect if increment completed but not closed (needs closure)
- [ ] **AC-US1-06**: Detect if all increments closed (suggest new or backlog)
- [ ] **AC-US1-07**: Detect multi-project context (project-specific detection)

---

## Implementation

**Increment**: [0039-ultra-smart-next-command](../../../../increments/0039-ultra-smart-next-command/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
