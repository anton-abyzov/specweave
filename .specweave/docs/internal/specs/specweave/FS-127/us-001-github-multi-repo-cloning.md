---
id: US-001
feature: FS-127
title: GitHub Multi-Repo Cloning
status: completed
priority: P1
created: 2025-12-08
project: specweave
external:
  github:
    issue: 802
    url: https://github.com/anton-abyzov/specweave/issues/802
---

# US-001: GitHub Multi-Repo Cloning

**Feature**: [FS-127](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US1-01**: `triggerGitHubRepoCloning()` function exists in `src/cli/helpers/init/github-repo-cloning.ts`
- [x] **AC-US1-02**: GitHub org repos fetched via GitHub API (with PAT authentication)
- [x] **AC-US1-03**: Repos filtered by user-selected pattern (all/glob/regex)
- [x] **AC-US1-04**: Background clone job created via `launchCloneJob()`
- [x] **AC-US1-05**: Job ID returned and added to `pendingJobIds[]` in init.ts
- [x] **AC-US1-06**: Clone URLs use HTTPS format with token authentication
- [x] **AC-US1-07**: Progress displayed: "Cloning N repositories in background..."
- [x] **AC-US1-08**: Job visible in `/specweave:jobs` command

---

## Implementation

**Increment**: [0127-github-bitbucket-clone-parity](../../../../increments/0127-github-bitbucket-clone-parity/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Create GitHub repo cloning module
- [x] **T-002**: Implement GitHub API repo fetching
- [x] **T-003**: Implement GitHub repo filtering
- [x] **T-004**: Build GitHub HTTPS clone URLs
- [x] **T-005**: Launch GitHub background clone job
