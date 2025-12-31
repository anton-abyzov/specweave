---
id: US-004
feature: FS-137
title: "GitHub Plugin Per-US Sync (P1)"
status: completed
priority: P0
created: 2025-12-09
project: specweave
related_projects: []
---

# US-004: GitHub Plugin Per-US Sync (P1)

**Feature**: [FS-137](./FEATURE.md)

**As a** user with USs targeting different GitHub repos
**I want** GitHub sync to create issues in the correct repo per US
**So that** each team's repo contains only their relevant issues

---

## Acceptance Criteria

- [x] **AC-US4-01**: `specweave-github` reads `projectMappings` from config.json
- [x] **AC-US4-02**: Sync groups USs by their `project` field
- [x] **AC-US4-03**: Each project group syncs to its mapped `github.owner/repo`
- [x] **AC-US4-04**: metadata.json stores `externalRefs` per US (not per increment)
- [x] **AC-US4-05**: USs without mapping show clear error (not silent failure)
- [x] **AC-US4-06**: Rate limiting applies per-provider, batched across USs

---

## Implementation

**Increment**: [0137-per-us-project-board-enforcement](../../../../increments/0137-per-us-project-board-enforcement/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-014**: Update GitHub Plugin for Per-US Sync
- [x] **T-017**: Store externalRefs per US in Metadata
