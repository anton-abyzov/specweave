---
id: US-008
feature: FS-145
title: CLI Commands for Registry (P1)
status: completed
priority: P1
created: 2026-01-14
project: specweave
external:
  github:
    issue: 937
    url: https://github.com/anton-abyzov/specweave/issues/937
---

# US-008: CLI Commands for Registry (P1)

**Feature**: [FS-145](./FEATURE.md)

**As a** SpecWeave user
**I want** CLI commands to manage the project registry
**So that** I can add/list/remove projects easily

---

## Acceptance Criteria

- [x] **AC-US8-01**: `specweave project list` - Lists all projects with sync status
- [x] **AC-US8-02**: `specweave project add <id> --name "Name" [--github] [--ado] [--jira]`
- [x] **AC-US8-03**: `specweave project remove <id>` - Removes project (with confirmation)
- [x] **AC-US8-04**: `specweave project sync [<id>]` - Force sync to external tools
- [x] **AC-US8-05**: `specweave project show <id>` - Show project details and mappings

---

## Implementation

**Increment**: [0145-project-registry-eda-sync](../../../../increments/0145-project-registry-eda-sync/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-013**: Implement CLI project list
- [x] **T-014**: Implement CLI project add/remove
- [x] **T-015**: Implement CLI project sync/show
- [x] **T-017**: E2E Tests for CLI
