---
id: US-003
feature: FS-147
title: Parent Repository Selection for Multi-Repo GitHub Issues
status: completed
priority: P1
created: 2026-01-14
project: specweave
external:
  github:
    issue: 982
    url: https://github.com/anton-abyzov/specweave/issues/982
---

# US-003: Parent Repository Selection for Multi-Repo GitHub Issues

**Feature**: [FS-147](./FEATURE.md)

**As a** developer with multiple GitHub repositories,
**I want** to select which repo should be the parent for GitHub Issues,
**So that** issues are created in the correct repository.

---

## Acceptance Criteria

- [x] **AC-US3-01**: When multi-repo + GitHub Issues selected, prompt "Which repo should be parent for GitHub Issues?"
- [x] **AC-US3-02**: Display list of repositories from `githubRepoSelection.profiles`
- [x] **AC-US3-03**: Single-repo case skips parent selection (uses the only repo)
- [x] **AC-US3-04**: Selected parent repo is marked as default in sync profiles

---

## Implementation

**Increment**: [0147-github-init-duplicate-prompts-elimination](../../../../increments/0147-github-init-duplicate-prompts-elimination/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-007**: Implement parent repository selection for multi-repo
- [x] **T-008**: Store parent repository as default in sync profiles
- [x] **T-011**: Manual testing of init flow scenarios
