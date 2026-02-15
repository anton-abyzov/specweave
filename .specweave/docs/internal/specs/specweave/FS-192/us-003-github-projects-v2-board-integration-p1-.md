---
id: US-003
feature: FS-192
title: "GitHub Projects V2 Board Integration (P1)"
status: not_started
priority: P1
created: "2026-02-06T00:00:00.000Z"
tldr: "GitHub Projects V2 Board Integration (P1)"
project: specweave
---

# US-003: GitHub Projects V2 Board Integration (P1)

**Feature**: [FS-192](./FEATURE.md)

---

## Acceptance Criteria

- [ ] **AC-US3-01**: Board resolver supports Projects V2 via GraphQL API (`createProjectV2`, `addProjectV2ItemById`, `updateProjectV2ItemFieldValue` mutations)
- [ ] **AC-US3-02**: Running sync creates a GitHub Project V2 (if enabled in config) and adds User Story issues as project items
- [ ] **AC-US3-03**: Status field is updated when User Story status changes (maps spec status to project Status field options)
- [ ] **AC-US3-04**: Priority custom field is set from spec priority (P1/P2/P3 mapped to project field options)
- [ ] **AC-US3-05**: Cross-repo support works: issues from multiple repositories can be added to a single org-level Project V2
- [ ] **AC-US3-06**: `gh project` CLI commands are used where available, with GraphQL fallback for operations the CLI doesn't support
- [ ] **AC-US3-07**: Config supports Projects V2 via: `config.sync.profiles[x].config.projectV2Number` (number) or `projectV2Id` (node ID)

---

## Implementation

**Increment**: [0192-github-sync-v2-multi-repo](../../../../increments/0192-github-sync-v2-multi-repo/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
