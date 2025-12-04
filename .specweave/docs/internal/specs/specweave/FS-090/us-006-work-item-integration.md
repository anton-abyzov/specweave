---
id: US-006
feature: FS-090
title: "Work Item Integration"
status: completed
priority: P1
created: 2025-12-02
---

**Origin**: 🏠 **Internal**


# US-006: Work Item Integration

**Feature**: [FS-090](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US6-01**: Loads imported work items from `.specweave/docs/internal/specs/`
- [x] **AC-US6-02**: Matches work items to modules using keyword/path matching
- [x] **AC-US6-03**: Ranks modules by work item density (more items = higher priority)
- [x] **AC-US6-04**: Generates `module-workitem-map.json` with all mappings
- [x] **AC-US6-05**: Generates `priority-queue.json` with ordered module list
- [x] **AC-US6-06**: Waits for import job completion before running (dependency)

---

## Implementation

**Increment**: [0090-living-docs-builder](../../../../../increments/0090-living-docs-builder/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] [T-005](../../../../../increments/0090-living-docs-builder/tasks.md#T-005): Implement Work Item Matcher