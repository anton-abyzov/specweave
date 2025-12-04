---
id: US-004
feature: FS-079
title: "Fix Import Organization by Area Path"
status: completed
priority: P0
created: 2025-11-29
---

# US-004: Fix Import Organization by Area Path

**Feature**: [FS-079](./FEATURE.md)

**As a** developer importing ADO work items
**I want** items organized into their area path folders
**So that** folder structure matches ADO organization

---

## Acceptance Criteria

- [x] **AC-US4-01**: ADO import must populate `adoAreaPath` field on each work item
- [x] **AC-US4-02**: Items with area path go to `specs/{project}/{areaPathLeaf}/`
- [x] **AC-US4-03**: Items without area path go to `specs/{project}/_default/`
- [x] **AC-US4-04**: Never use "parent" as folder name - use "_default" instead

---

## Implementation

**Increment**: [0079-ado-init-flow-v2](../../../../../../increments/_archive/0079-ado-init-flow-v2/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-004**: Fix ADO Import to Populate adoAreaPath
- [x] **T-005**: Change "parent" Fallback to "_default"
