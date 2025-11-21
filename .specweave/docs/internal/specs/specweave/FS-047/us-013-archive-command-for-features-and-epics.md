---
id: US-013
feature: FS-047
title: "Archive Command for Features and Epics"
status: completed
priority: P0
created: 2025-11-19
---

# US-013: Archive Command for Features and Epics

**GitHub Project**: https://github.com/anton-abyzov/specweave/issues/700

**Feature**: [FS-047](../../_features/FS-047/FEATURE.md)

**As a** product manager cleaning up obsolete or completed work
**I want** dedicated command to archive entire features or epics with all related folders
**So that** living docs stay clean while preserving historical data in archive

---

## Acceptance Criteria

- [x] **AC-US13-01**: Create `/specweave:archive` slash command with feature and epic parameters
- [x] **AC-US13-02**: When archiving feature, move entire FS-XXX folder to `.specweave/docs/_archive/specs/`
- [x] **AC-US13-03**: When archiving feature, archive ALL related User Stories (all US-XXX within FS-XXX folder)
- [x] **AC-US13-04**: When archiving epic (User Story), move only specific US-XXX folder to archive
- [x] **AC-US13-05**: Preserve folder structure in archive (maintain FS-XXX/US-XXX hierarchy)
- [x] **AC-US13-06**: Add archive metadata (archived_at timestamp, archived_by user, reason)
- [x] **AC-US13-07**: Support optional reason parameter for audit trail
- [x] **AC-US13-08**: Prevent archiving if feature/epic has active increments referencing it
- [x] **AC-US13-09**: Support dry-run mode to preview what will be archived
- [x] **AC-US13-10**: Create `/specweave:restore` command to unarchive features/epics
- [x] **AC-US13-11**: Maintain archived ID registry to prevent reuse (archived IDs remain occupied)
- [x] **AC-US13-12**: Generate archive summary report (count of features/USs archived, storage size)

---

## Implementation

**Increment**: [0047-us-task-linkage](../../../../increments/0047-us-task-linkage/spec.md)

**Tasks**: See increment tasks.md for implementation details.
