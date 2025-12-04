---
id: US-001
feature: FS-064
title: "ADO Status Tags Applied"
status: completed
priority: P1
created: 2024-11-26
---

# US-001: ADO Status Tags Applied

**Feature**: [FS-064](./FEATURE.md)

**As a** developer using Azure DevOps,
**I want** status tags to be applied when increment status changes,
**So that** I can filter work items by status tags in ADO.

---

## Acceptance Criteria

- [x] **AC-US1-01**: Status tags from config.json are applied to ADO work items
- [x] **AC-US1-02**: Tags are appended, not replaced (preserve existing tags)
- [x] **AC-US1-03**: Status change updates both System.State and System.Tags

---

## Implementation

**Increment**: [0064-fix-external-sync-tags-status-types](../../../../../../increments/_archive/0064-fix-external-sync-tags-status-types/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Fix ADO Status Tags Application
