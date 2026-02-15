---
id: US-002
feature: FS-192
title: "GitHub-to-Spec Pull Sync (P1)"
status: not_started
priority: P1
created: "2026-02-06T00:00:00.000Z"
tldr: "**As a** team lead reviewing work on GitHub,
**I want** status changes made in GitHub (issue closed, labels changed, checkbox toggles) to flow back into SpecWeave specs,
**So that** the local spec."
project: specweave
---

# US-002: GitHub-to-Spec Pull Sync (P1)

**Feature**: [FS-192](./FEATURE.md)

**As a** team lead reviewing work on GitHub,
**I want** status changes made in GitHub (issue closed, labels changed, checkbox toggles) to flow back into SpecWeave specs,
**So that** the local spec.md stays in sync with team activity on GitHub without manual updates.

---

## Acceptance Criteria

- [ ] **AC-US2-01**: `/sw-github:sync-spec <spec-id> --direction from-github` fetches current issue state for all linked User Stories
- [ ] **AC-US2-02**: When a GitHub Issue is closed, the corresponding User Story status in spec.md is updated to reflect completion
- [ ] **AC-US2-03**: When AC checkboxes are toggled in the GitHub Issue body, those changes are reflected back in spec.md
- [ ] **AC-US2-04**: Conflict detection: if both spec and GitHub changed the same field, the user is prompted with options (github-wins, spec-wins, or skip)
- [ ] **AC-US2-05**: Default sync direction is `two-way` (push then pull) unless explicitly overridden with `--direction`

---

## Implementation

**Increment**: [0192-github-sync-v2-multi-repo](../../../../increments/0192-github-sync-v2-multi-repo/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
