---
id: US-001
feature: FS-066
title: "Multi-Project JIRA Import"
status: completed
priority: P1
created: 2025-11-26T14:00:00Z
---

# US-001: Multi-Project JIRA Import

**Feature**: [FS-066](./FEATURE.md)

**As a** user with multiple JIRA projects,
**I want** to select which projects to import during init,
**So that** items from all my projects are organized in separate folders.

---

## Acceptance Criteria

- [x] **AC-US1-01**: Init detects available JIRA projects and shows count
- [x] **AC-US1-02**: User can choose organization strategy (simple/by-project/by-board)
- [x] **AC-US1-03**: "By project" shows checkbox to select which projects
- [x] **AC-US1-04**: Selected projects create `specs/JIRA-{KEY}/` folder structure
- [x] **AC-US1-05**: Sync profile stores multi-project config for future syncs

---

## Implementation

**Increment**: [0066-multi-project-jira-ado-init](../../../../../../increments/_archive/0066-multi-project-jira-ado-init/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Create jira-ado-auto-detect.ts module
- [x] **T-002**: Implement JIRA structure detection
- [x] **T-003**: Implement ADO structure detection
- [x] **T-004**: Implement team pattern detection algorithm
- [x] **T-005**: Implement JIRA confirmation with analysis insight
- [x] **T-006**: Implement ADO confirmation with analysis insight
- [x] **T-007**: Build coordinator config from mappings
- [x] **T-008**: Update external-import.ts to use auto-detect
- [x] **T-009**: Simplify CoordinatorConfig types
- [x] **T-010**: Fix type errors
