---
id: US-001
feature: FS-118E
title: Auto-Trigger Sync-Specs After Increment Creation
status: completed
priority: P1
created: 2025-12-07
project: specweave
external:
  github:
    issue: 884
    url: https://github.com/anton-abyzov/specweave/issues/884
---

# US-001: Auto-Trigger Sync-Specs After Increment Creation

**Feature**: [FS-118E](./FEATURE.md)

**As a** SpecWeave user with GitHub sync enabled,
**I want** the increment creation workflow to automatically trigger sync-specs,
**So that** living docs AND external tool issues are created in one seamless flow.

---

## Acceptance Criteria

- [x] **AC-US1-01**: `/specweave:increment` MUST call `sync-specs` after creating increment files
- [x] **AC-US1-02**: `LivingDocsSync.syncIncrement()` MUST be called with the new increment ID
- [x] **AC-US1-03**: `syncToExternalTools()` MUST execute when `sync.github.enabled: true`
- [x] **AC-US1-04**: GitHub issue created with format: `[FS-XXX][US-YYY] User Story Title` (existing GitHubFeatureSync)
- [x] **AC-US1-05**: Issue body contains task checklist from tasks.md (existing GitHubFeatureSync)
- [x] **AC-US1-06**: Issue number stored in living docs user story frontmatter (existing GitHubFeatureSync)
- [x] **AC-US1-07**: Log creation in `.specweave/logs/sync.log` (existing sync logging)

---

## Implementation

**Increment**: [0118E-external-tool-sync-on-increment-start](../../../../increments/0118E-external-tool-sync-on-increment-start/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Update specweave-increment.md to trigger sync-specs
- [x] **T-004**: Verify E2E sync flow with permission checks
