---
id: US-005
feature: FS-043
title: "Living Docs Sync Triggers External Tool Updates (Priority: P1 - CRITICAL)"
status: completed
priority: P1
created: 2025-11-18T00:00:00.000Z
---

# US-005: Living Docs Sync Triggers External Tool Updates (Priority: P1 - CRITICAL)

**Feature**: [FS-043](../../_features/FS-043/FEATURE.md)

**As a** developer using GitHub/JIRA/ADO sync
**I want** living docs sync to automatically update external tools (GitHub issues, JIRA tickets, ADO work items)
**So that** I don't have to manually run separate sync commands and external tools stay in sync with living docs

---

## Acceptance Criteria

- [x] **AC-US5-01**: `LivingDocsSync.syncIncrement()` detects external tool configuration from metadata.json
- [x] **AC-US5-02**: When GitHub configured, living docs sync triggers `updateIssueLivingDocs()`
- [x] **AC-US5-03**: When no external tools configured, living docs sync completes without triggering external sync
- [x] **AC-US5-04**: When multiple external tools configured (GitHub + JIRA), all are synced
- [x] **AC-US5-05**: External tool sync failures are logged but don't break living docs sync
- [x] **AC-US5-06**: Dry-run mode skips external tool sync
- [x] **AC-US5-07**: Skipped test `github-sync-living-docs.skip.test.ts` is enabled and passes

---

## Implementation

**Increment**: [0043-spec-md-desync-fix](../../../../increments/0043-spec-md-desync-fix/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
