---
id: US-003
feature: FS-125
title: "Multi-Target External Sync (P1)"
status: in_progress
priority: P1
created: 2025-12-08
project: specweave
related_projects: [frontend-app]
---

# US-003: Multi-Target External Sync (P1)

**Feature**: [FS-125](./FEATURE.md)

**As a** user with USs targeting different GitHub repos/JIRA boards
**I want** external sync to create issues in the correct project per US
**So that** each team sees only their relevant work items

---

## Acceptance Criteria

- [x] **AC-US3-01**: `syncToExternalTools()` iterates USs, grouping by project/board
- [x] **AC-US3-02**: For each unique project, call provider-specific sync
- [ ] **AC-US3-03**: GitHub: Create issue in correct repo (from project mapping) [DEFERRED - external plugin]
- [ ] **AC-US3-04**: JIRA: Create issue in correct project/board [DEFERRED - external plugin]
- [ ] **AC-US3-05**: ADO: Create work item in correct project/area path [DEFERRED - external plugin]
- [x] **AC-US3-06**: metadata.json stores external_refs per US (not per increment)
- [ ] **AC-US3-07**: Rate limiting applies per-provider, not per-US [DEFERRED - external plugin]

---

## Implementation

**Increment**: [0125-cross-project-user-story-targeting](../../../../increments/0125-cross-project-user-story-targeting/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-009**: Update metadata.json external_refs Schema
- [x] **T-010**: Create ExternalSyncOrchestrator
- [ ] **T-011**: Update GitHub Sync for Per-Repo Targeting
- [ ] **T-012**: Update JIRA Sync for Per-Project Targeting
- [ ] **T-013**: Update ADO Sync for Per-Area-Path Targeting
- [ ] **T-014**: Implement Rate Limiting per Provider
- [x] **T-025**: Integration Test: Cross-Project Workflow
