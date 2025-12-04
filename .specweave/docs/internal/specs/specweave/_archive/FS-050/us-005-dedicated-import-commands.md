---
id: US-005
feature: FS-050
title: "Dedicated Import Commands"
status: completed
priority: P1
created: 2025-11-21
---

# US-005: Dedicated Import Commands

**Feature**: [FS-050](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US5-01**: `/specweave-jira:import-projects` Command
- [x] **AC-US5-02**: `/specweave-ado:import-projects` Command
- [x] **AC-US5-03**: Merge with Existing Projects (No Duplicates)
- [x] **AC-US5-04**: Smart Filtering (Active Only, By Type, Custom JQL)
- [x] **AC-US5-05**: Resume Support (Interrupted Imports)
- [x] **AC-US5-06**: Progress Tracking with Cancelation
- [x] **AC-US5-07**: Dry-Run Mode (Preview)

---

## Implementation

**Increment**: [0050-external-tool-import-phase-1b-7](../../../../../../increments/_archive/0050-external-tool-import-phase-1b-7/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-041**: Create `/specweave-jira:import-projects` Command Structure
- [x] **T-042**: Implement Smart Filtering (Active, Type, Lead, JQL)
- [x] **T-043**: Implement Resume Support (ImportState)
- [x] **T-044**: Implement Dry-Run Mode (Preview)
- [x] **T-045**: Implement Progress Tracking for Import Commands
- [x] **T-046**: Create `/specweave-ado:import-projects` Command
- [x] **T-047**: Implement Saved Filter Presets
- [x] **T-048**: E2E Test: Full Import Command Workflow
- [x] **T-049**: Update .env Management Utilities
- [x] **T-050**: Document Import Commands in User Guide
