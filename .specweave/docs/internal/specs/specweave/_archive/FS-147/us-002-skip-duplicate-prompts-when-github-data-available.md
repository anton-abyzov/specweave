---
id: US-002
feature: FS-147
title: Skip Duplicate Prompts When GitHub Data Available
status: completed
priority: P1
created: 2026-01-14
project: specweave
external:
  github:
    issue: 981
    url: https://github.com/anton-abyzov/specweave/issues/981
---

# US-002: Skip Duplicate Prompts When GitHub Data Available

**Feature**: [FS-147](./FEATURE.md)

**As a** developer who selected GitHub for repositories,
**I want** the issue tracker setup to skip repository configuration questions,
**So that** I only answer each question once.

---

## Acceptance Criteria

- [x] **AC-US2-01**: When `githubCredentialsFromRepoSetup` is provided, skip `RepoStructureManager.promptStructure()`
- [x] **AC-US2-02**: Reuse `org` and `pat` from repository setup instead of re-prompting
- [x] **AC-US2-03**: "How do you want to configure repositories?" is NOT asked when GitHub data available
- [x] **AC-US2-04**: "Git remote URL format?" is NOT asked when GitHub data available

---

## Implementation

**Increment**: [0147-github-init-duplicate-prompts-elimination](../../../../increments/0147-github-init-duplicate-prompts-elimination/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-005**: Add early return in configureGitHubRepositories
- [x] **T-006**: Verify repository configuration questions skipped
- [x] **T-009**: Remove loadExistingGitHubRepoConfig function
- [x] **T-011**: Manual testing of init flow scenarios
