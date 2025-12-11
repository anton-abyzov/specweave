---
id: US-007
feature: FS-140
title: Update External Tool Sync Systems
status: completed
priority: P1
created: 2025-12-11
project: specweave
external:
  github:
    issue: 904
    url: https://github.com/anton-abyzov/specweave/issues/904
---

# US-007: Update External Tool Sync Systems

**Feature**: [FS-140](./FEATURE.md)

**As a** user syncing to GitHub/JIRA/ADO
**I want** external sync to use resolved projects
**So that** external items are tagged correctly without frontmatter

---

## Acceptance Criteria

- [x] **AC-US7-01**: `spec-identifier-detector.ts` uses `ProjectResolutionService` instead of frontmatter
- [x] **AC-US7-02**: `user-story-issue-builder.ts` removes frontmatter project label logic
- [x] **AC-US7-03**: GitHub sync derives project from per-US fields
- [x] **AC-US7-04**: JIRA sync uses resolved project for project code
- [x] **AC-US7-05**: ADO sync uses resolved project for area path mapping
- [x] **AC-US7-06**: All external sync tests pass with new resolution

---

## Implementation

**Increment**: [0140-remove-frontmatter-project-field](../../../../increments/0140-remove-frontmatter-project-field/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-014**: Update spec-identifier-detector.ts
- [x] **T-015**: Update GitHub Sync (user-story-issue-builder.ts)
- [x] **T-016**: Update JIRA and ADO Sync
