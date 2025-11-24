---
id: US-010
feature: FS-047
title: "External Import Slash Command"
status: completed
priority: P0
created: 2025-11-19
---

# US-010: External Import Slash Command

**Feature**: [FS-047](../../_features/FS-047/FEATURE.md)

**As a** developer managing brownfield project
**I want** dedicated slash command to manually pull external work items on-demand
**So that** I can import new external items created after initial setup

---

## Acceptance Criteria

- [x] **AC-US10-01**: `/specweave:import-external` command invokes external tool import coordinator
- [x] **AC-US10-02**: Command detects configured external tools (GitHub, JIRA, ADO)
- [x] **AC-US10-03**: Command supports time range filtering (since last import, 1 month, 3 months, all, custom)
- [x] **AC-US10-04**: Command supports platform filtering (--github-only, --jira-only, --ado-only, or all)
- [x] **AC-US10-05**: Command creates living docs files with E suffix (NO increment creation)
- [x] **AC-US10-06**: Command shows progress indicator (spinner, item count, platform)
- [x] **AC-US10-07**: Command displays summary report (items imported, duplicates skipped, errors)
- [x] **AC-US10-08**: Command updates sync metadata (last import timestamp per platform)
- [x] **AC-US10-09**: Command handles rate limiting with retry suggestions
- [x] **AC-US10-10**: Command warns for large imports (> 100 items) with confirmation prompt
- [x] **AC-US10-11**: Command supports dry-run mode (--dry-run) showing what would be imported
- [x] **AC-US10-12**: Command skips duplicates (checks existing US-IDs with E suffix)

---

## Implementation

**Increment**: [0047-us-task-linkage](../../../../increments/0047-us-task-linkage/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-035**: Create /specweave:import-external command with tool detection
- [x] **T-036**: Add sync metadata management and duplicate detection
