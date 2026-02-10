---
id: US-002
feature: FS-146
title: Token Passthrough for Feature Sync
status: completed
priority: P1
created: 2025-12-11
project: specweave
external:
  github:
    issue: 941
    url: https://github.com/anton-abyzov/specweave/issues/941
---

# US-002: Token Passthrough for Feature Sync

**Feature**: [FS-146](./FEATURE.md)

**As a** SpecWeave user,
**I want** `GitHubFeatureSync` to pass the token to all `gh` commands,
**So that** milestone and issue operations use my configured token.

---

## Acceptance Criteria

- [x] **AC-US2-01**: `createMilestone()` passes `GH_TOKEN` to `execFileNoThrow`
- [x] **AC-US2-02**: `createUserStoryIssue()` passes `GH_TOKEN` to `execFileNoThrow`
- [x] **AC-US2-03**: `updateUserStoryIssue()` passes `GH_TOKEN` to `execFileNoThrow`
- [x] **AC-US2-04**: All other `gh` calls in `github-feature-sync.ts` pass `GH_TOKEN`

---

## Implementation

**Increment**: [0146-github-cli-token-passthrough-fix](../../../../increments/0146-github-cli-token-passthrough-fix/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-002**: Update GitHubFeatureSync with token passthrough
- [x] **T-007**: Rebuild and run tests
