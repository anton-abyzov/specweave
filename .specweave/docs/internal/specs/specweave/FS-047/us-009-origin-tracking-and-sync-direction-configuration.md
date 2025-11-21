---
id: US-009
feature: FS-047
title: "Origin Tracking and Sync Direction Configuration"
status: completed
priority: P0
created: 2025-11-19
---

# US-009: Origin Tracking and Sync Direction Configuration

**GitHub Project**: https://github.com/anton-abyzov/specweave/issues/696

**Feature**: [FS-047](../../_features/FS-047/FEATURE.md)

**As a** PM managing mixed internal/external items
**I want** clear origin indicators and configurable sync direction between living docs and external tools
**So that** I can control how changes flow between SpecWeave and external tools

---

## Acceptance Criteria

- [x] **AC-US9-01**: Every US/Task has origin field in metadata (internal | external)
- [x] **AC-US9-02**: Three independent permission settings in config.json control external tool sync behavior
- [x] **AC-US9-03**: When canUpsertInternalItems=true, internal US creates external item AND syncs ongoing content updates
- [x] **AC-US9-04**: When canUpdateExternalItems=true, external US content updates sync back to external tool (full content updates)
- [x] **AC-US9-05**: When canUpdateStatus=true, status updates sync to external tool (for BOTH internal AND external items)
- [x] **AC-US9-06**: External items preserve original external ID for reference
- [x] **AC-US9-07**: Living docs show origin badge (🏠 Internal, 🔗 GitHub, 🎫 JIRA, 📋 ADO)
- [x] **AC-US9-08**: Origin immutable after creation (can't change internal ↔ external)
- [x] **AC-US9-09**: Sync logs track origin-based update conflicts (when full sync enabled: all 3 permissions = true)

---

## Implementation

**Increment**: [0047-us-task-linkage](../../../../increments/0047-us-task-linkage/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-032**: Add origin metadata fields to spec.md and tasks.md
- [x] **T-033**: Implement configurable sync direction logic
- [x] **T-034**: Add origin badges to living docs US files
