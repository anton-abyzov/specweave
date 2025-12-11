---
id: US-003
feature: FS-127
title: Init Flow Integration
status: completed
priority: P1
created: 2025-12-08
project: specweave
external:
  github:
    issue: 804
    url: https://github.com/anton-abyzov/specweave/issues/804
---

# US-003: Init Flow Integration

**Feature**: [FS-127](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US3-01**: init.ts calls `triggerGitHubRepoCloning()` when `repoResult.hosting === 'github-multirepo'`
- [x] **AC-US3-02**: init.ts calls `triggerBitbucketRepoCloning()` when `repoResult.hosting === 'bitbucket-multirepo'`
- [x] **AC-US3-03**: Clone job IDs added to `pendingJobIds[]` array
- [x] **AC-US3-04**: Living docs generation receives `dependsOn: pendingJobIds`
- [x] **AC-US3-05**: Error handling matches ADO pattern (non-blocking failures)
- [x] **AC-US3-06**: User sees consistent UX across all git providers

---

## Implementation

**Increment**: [0127-github-bitbucket-clone-parity](../../../../increments/0127-github-bitbucket-clone-parity/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-011**: Integrate GitHub cloning into init.ts
- [x] **T-012**: Integrate Bitbucket cloning into init.ts
