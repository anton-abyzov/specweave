---
id: US-002
feature: FS-064
title: "Native Priority Fields Set"
status: completed
priority: P1
created: 2024-11-26
---

# US-002: Native Priority Fields Set

**Feature**: [FS-064](./FEATURE.md)

**As a** project manager,
**I want** priority to be set in native JIRA/ADO fields,
**So that** I can sort and filter by priority in external tools.

---

## Acceptance Criteria

- [x] **AC-US2-01**: JIRA issues have Priority field set (Highest/High/Medium/Low)
- [x] **AC-US2-02**: ADO work items have Microsoft.VSTS.Common.Priority set (1-4)
- [x] **AC-US2-03**: Priority mapping is configurable (P0→1, P1→2, etc.)

---

## Implementation

**Increment**: [0064-fix-external-sync-tags-status-types](../../../../../../increments/_archive/0064-fix-external-sync-tags-status-types/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-002**: Add JIRA Native Priority Field
- [x] **T-003**: Add ADO Native Priority Field
- [x] **T-009**: Add Graceful JIRA Transition Handling
