---
id: US-003
feature: FS-064
title: "Bug Work Item Type Support"
status: completed
priority: P1
created: 2024-11-26
---

# US-003: Bug Work Item Type Support

**Feature**: [FS-064](./FEATURE.md)

**As a** developer,
**I want** to sync bug-type increments as Bug work items,
**So that** bug tracking is accurate in external tools.

---

## Acceptance Criteria

- [x] **AC-US3-01**: JIRA supports Bug issue type when increment type is "bug"
- [x] **AC-US3-02**: ADO supports Bug work item type when increment type is "bug"
- [x] **AC-US3-03**: GitHub adds "bug" label when increment type is "bug"
- [x] **AC-US3-04**: Type mapping is consistent across all platforms

---

## Implementation

**Increment**: [0064-fix-external-sync-tags-status-types](../../../../../../increments/_archive/0064-fix-external-sync-tags-status-types/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-004**: Add Bug Type Support to JIRA
- [x] **T-005**: Add Bug Type Support to ADO
- [x] **T-006**: Add Bug Label to GitHub
