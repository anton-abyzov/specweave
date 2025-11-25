---
id: US-001
feature: FS-063
title: Multi-Repo External Import
status: not_started
priority: P1
created: 2025-11-25T11:40:00Z
external_tools:
  github:
    number: 761
    url: https://github.com/anton-abyzov/specweave/issues/761
    created_at: 2025-11-25T18:04:51.752Z
---

# US-001: Multi-Repo External Import

**Feature**: [FS-063](../../_features/FS-063/FEATURE.md)

**As a** user with an umbrella/multi-repo setup,
**I want** external items imported from ALL configured repositories,
**So that** I can see work items from frontend, backend, and shared repos in my living docs.

---

## Acceptance Criteria

- [ ] **AC-US1-01**: When multi-repo selection is made during init, items are imported from each selected repository
- [ ] **AC-US1-02**: Items from different repos are tagged with their source repository
- [ ] **AC-US1-03**: Progress shows which repo is being imported and item count
- [ ] **AC-US1-04**: Duplicate detection works across all repos (same GitHub issue = same US-XXXE ID)

---

## Implementation

**Increment**: [0063-fix-external-import-multi-repo](../../../../increments/0063-fix-external-import-multi-repo/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
