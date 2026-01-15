---
id: US-004
feature: FS-145
title: GitHub Sync Adapter (P1)
status: completed
priority: P1
created: 2026-01-14
project: specweave
external:
  github:
    issue: 933
    url: https://github.com/anton-abyzov/specweave/issues/933
---

# US-004: GitHub Sync Adapter (P1)

**Feature**: [FS-145](./FEATURE.md)

**As a** SpecWeave user with GitHub integration
**I want** project changes to sync to GitHub labels automatically
**So that** my GitHub issues are always correctly labeled

---

## Acceptance Criteria

- [x] **AC-US4-01**: Create `GitHubProjectAdapter` that subscribes to project events
- [x] **AC-US4-02**: On `ProjectCreated`: Create `project:{id}` label in GitHub repo
- [x] **AC-US4-03**: On `ProjectUpdated`: Update label name/description if changed
- [x] **AC-US4-04**: On `ProjectDeleted`: Archive label (rename to `_archived_project:{id}`)
- [x] **AC-US4-05**: Store sync status in registry: `lastSynced`, `syncError`

---

## Implementation

**Increment**: [0145-project-registry-eda-sync](../../../../increments/0145-project-registry-eda-sync/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-009**: Implement GitHub Project Adapter
- [x] **T-012**: Unit Tests for Adapters
