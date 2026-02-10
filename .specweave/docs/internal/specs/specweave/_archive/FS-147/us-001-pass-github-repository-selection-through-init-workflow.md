---
id: US-001
feature: FS-147
title: Pass GitHub Repository Selection Through Init Workflow
status: completed
priority: P1
created: 2026-01-14
project: specweave
external:
  github:
    issue: 980
    url: https://github.com/anton-abyzov/specweave/issues/980
---

# US-001: Pass GitHub Repository Selection Through Init Workflow

**Feature**: [FS-147](./FEATURE.md)

**As a** developer running `specweave init`,
**I want** the system to pass GitHub repository selection data from repository setup to issue tracker setup,
**So that** I'm not asked the same questions twice.

---

## Acceptance Criteria

- [x] **AC-US1-01**: `init.ts` passes `githubRepoSelection` from `repoResult` to `setupIssueTrackerWrapper()`
- [x] **AC-US1-02**: `setupIssueTrackerWrapper()` accepts optional `githubCredentialsFromRepoSetup` parameter
- [x] **AC-US1-03**: `setupIssueTracker()` passes `githubCredentialsFromRepoSetup` to `configureGitHubRepositories()`
- [x] **AC-US1-04**: Parameter structure matches existing `adoCredentialsFromRepoSetup` pattern

---

## Implementation

**Increment**: [0147-github-init-duplicate-prompts-elimination](../../../../increments/0147-github-init-duplicate-prompts-elimination/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Extract githubRepoSelection in init.ts
- [x] **T-002**: Update setupIssueTrackerWrapper signature
- [x] **T-003**: Update setupIssueTracker signature
- [x] **T-004**: Verify parameter structure matches ADO pattern
- [x] **T-010**: Update unit tests for parameter passing approach
- [x] **T-012**: Update CHANGELOG.md for v1.0.4
