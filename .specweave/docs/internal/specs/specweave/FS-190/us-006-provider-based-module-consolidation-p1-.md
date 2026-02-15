---
id: US-006
feature: FS-190
title: "Provider-Based Module Consolidation (P1)"
status: completed
priority: P0
created: "2026-02-06T00:00:00.000Z"
tldr: "**As a** SpecWeave contributor
**I want** the 17+ sync files consolidated into ~5 provider-based modules
**So that** the codebase is maintainable and new contributors can understand the sync system."
project: specweave
---

# US-006: Provider-Based Module Consolidation (P1)

**Feature**: [FS-190](./FEATURE.md)

**As a** SpecWeave contributor
**I want** the 17+ sync files consolidated into ~5 provider-based modules
**So that** the codebase is maintainable and new contributors can understand the sync system

---

## Acceptance Criteria

- [x] **AC-US6-01**: Given the sync directory, when listing files, then there are no more than 7 top-level modules: `engine.ts`, `config.ts`, `providers/github.ts`, `providers/jira.ts`, `providers/ado.ts`, `projects-v2.ts`, `migration.ts`
- [x] **AC-US6-02**: Given the sync engine, when performing a push sync, then it routes through a unified `SyncEngine.push()` method (replaces SyncCoordinator, FormatPreservationSyncService, ExternalItemSyncService)
- [x] **AC-US6-03**: Given the sync engine, when performing a pull sync, then it routes through a unified `SyncEngine.pull()` method (replaces ExternalChangePuller, spec-to-living-docs-sync)
- [x] **AC-US6-04**: Given the reconciler pattern, when checking for drift, then each provider adapter implements a `reconcile()` method (replaces 3 separate reconciler files)
- [x] **AC-US6-05**: Given all existing sync tests, when the consolidation is complete, then all existing tests pass or are migrated to test the new module structure

---

## Implementation

**Increment**: [0190-sync-architecture-redesign](../../../../increments/0190-sync-architecture-redesign/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
