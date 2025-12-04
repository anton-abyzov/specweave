---
id: US-001
feature: FS-068
title: "Fix importFrom for Multi-Repo GitHub"
status: completed
priority: P1
created: 2025-11-26
---

# US-001: Fix importFrom for Multi-Repo GitHub

**Feature**: [FS-068](./FEATURE.md)

**As a** developer with a multi-repo umbrella setup
**I want** the import-external command to fetch issues from ALL configured GitHub repos
**So that** all external work items are synced to their correct project folders

---

## Acceptance Criteria

- [x] **AC-US1-01**: `importFrom('github')` handles multi-repo when `githubRepoImporters.size > 0`
- [x] **AC-US1-02**: Items from each repo have `sourceRepo` field set correctly
- [x] **AC-US1-03**: Aggregated results include all items from all repos
- [x] **AC-US1-04**: Errors from individual repos are aggregated properly
- [x] **AC-US1-05**: Unit tests cover multi-repo import scenario

---

## Implementation

**Increment**: [0068-fix-multi-repo-import-from](../../../../../../increments/_archive/0068-fix-multi-repo-import-from/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Fix importFrom() to Handle Multi-Repo
- [x] **T-002**: Add Unit Tests for Multi-Repo Import
- [x] **T-003**: Verify Fix with Manual Testing
