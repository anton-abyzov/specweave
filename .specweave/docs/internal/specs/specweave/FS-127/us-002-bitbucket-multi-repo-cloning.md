---
id: US-002
feature: FS-127
title: Bitbucket Multi-Repo Cloning
status: completed
priority: P1
created: 2025-12-08
project: specweave
external:
  github:
    issue: 803
    url: https://github.com/anton-abyzov/specweave/issues/803
---

# US-002: Bitbucket Multi-Repo Cloning

**Feature**: [FS-127](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US2-01**: `triggerBitbucketRepoCloning()` function exists in `src/cli/helpers/init/bitbucket-repo-cloning.ts`
- [x] **AC-US2-02**: Bitbucket workspace repos fetched via Bitbucket API
- [x] **AC-US2-03**: Repos filtered by user-selected pattern (all/glob/regex)
- [x] **AC-US2-04**: Background clone job created via `launchCloneJob()`
- [x] **AC-US2-05**: Job ID returned and added to `pendingJobIds[]` in init.ts
- [x] **AC-US2-06**: Clone URLs use HTTPS format with app password authentication
- [x] **AC-US2-07**: Progress displayed: "Cloning N repositories in background..."
- [x] **AC-US2-08**: Job visible in `/specweave:jobs` command

---

## Implementation

**Increment**: [0127-github-bitbucket-clone-parity](../../../../increments/0127-github-bitbucket-clone-parity/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-006**: Create Bitbucket repo cloning module
- [x] **T-007**: Implement Bitbucket API repo fetching
- [x] **T-008**: Implement Bitbucket repo filtering
- [x] **T-009**: Build Bitbucket HTTPS clone URLs
- [x] **T-010**: Launch Bitbucket background clone job
