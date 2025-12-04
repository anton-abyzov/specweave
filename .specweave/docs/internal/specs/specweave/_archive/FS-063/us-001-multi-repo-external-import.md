---
id: US-001
feature: FS-063
title: "Multi-Repo External Import"
status: completed
priority: P1
created: 2025-11-25T11:40:00Z
---

# US-001: Multi-Repo External Import

**Feature**: [FS-063](./FEATURE.md)

**As a** user with an umbrella/multi-repo setup,
**I want** external items imported from ALL configured repositories,
**So that** I can see work items from frontend, backend, and shared repos in my living docs.

---

## Acceptance Criteria

- [x] **AC-US1-01**: When multi-repo selection is made during init, items are imported from each selected repository
- [x] **AC-US1-02**: Items from different repos are tagged with their source repository
- [x] **AC-US1-03**: Progress shows which repo is being imported and item count
- [x] **AC-US1-04**: Duplicate detection works across all repos (same GitHub issue = same US-XXXE ID)

---

## Implementation

**Increment**: [0063-fix-external-import-multi-repo](../../../../../../increments/_archive/0063-fix-external-import-multi-repo/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Add sourceRepo field to ExternalItem interface
- [x] **T-002**: Extend CoordinatorConfig for multi-repo
- [x] **T-003**: Tag items with source repo in GitHubImporter
- [x] **T-004**: Wire repoSelectionConfig to coordinatorConfig
- [x] **T-005**: Add cross-repo duplicate detection
- [x] **T-017**: Add unit tests for multi-repo import
- [ ] **T-019**: Manual integration test with sw-thumbnail-ab
