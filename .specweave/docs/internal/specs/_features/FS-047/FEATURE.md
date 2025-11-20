---
id: FS-047
title: "US-Task Linkage Architecture"
type: feature
status: completed
priority: P0
created: 2025-11-19
lastUpdated: 2025-11-20
---

# US-Task Linkage Architecture

**GitHub Project**: https://github.com/anton-abyzov/specweave/issues/686

## Overview

Implement explicit traceability between User Stories, Acceptance Criteria, and Tasks to enable automatic living docs sync and AC validation. This feature addresses a critical gap in SpecWeave's traceability infrastructure where tasks in `tasks.md` have no explicit connection to their parent User Stories, causing broken living docs sync and preventing automatic AC coverage validation.

## Implementation History

| Increment | Status | Completion Date |
|-----------|--------|----------------|
| [0047-us-task-linkage](../../../../increments/0047-us-task-linkage/spec.md) | ✅ completed | 2025-11-19 |

## User Stories

- [US-001: Explicit US-Task Linkage in tasks.md](../../specweave/FS-047/us-001-explicit-us-task-linkage-in-tasks-md.md)
- [US-002: AC-Task Mapping](../../specweave/FS-047/us-002-ac-task-mapping.md)
- [US-003: Automatic Living Docs Sync](../../specweave/FS-047/us-003-automatic-living-docs-sync.md)
- [US-004: AC Coverage Validation](../../specweave/FS-047/us-004-ac-coverage-validation.md)
- [US-005: Progress Tracking by User Story](../../specweave/FS-047/us-005-progress-tracking-by-user-story.md)
- [US-006: Migration Tooling](../../specweave/FS-047/us-006-migration-tooling.md)
- [US-007: External Item Import on Init](../../specweave/FS-047/us-007-external-item-import-on-init.md)
- [US-008: ID Collision Resolution](../../specweave/FS-047/us-008-id-collision-resolution.md)
- [US-009: Origin Tracking and Sync Direction Configuration](../../specweave/FS-047/us-009-origin-tracking-and-sync-direction-configuration.md)
- [US-010: External Import Slash Command](../../specweave/FS-047/us-010-external-import-slash-command.md)
- [US-011: Multi-Repo Selection Strategy (GitHub Init)](../../specweave/FS-047/us-011-multi-repo-selection-strategy-github-init-.md)
- [US-012: Intelligent FS-XXX Folder Creation with Chronological ID Allocation](../../specweave/FS-047/us-012-intelligent-fs-xxx-folder-creation-with-chronological-id-allocation.md)
- [US-013: Archive Command for Features and Epics](../../specweave/FS-047/us-013-archive-command-for-features-and-epics.md)
