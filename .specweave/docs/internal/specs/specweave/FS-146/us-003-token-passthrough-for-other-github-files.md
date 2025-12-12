---
id: US-003
feature: FS-146
title: Token Passthrough for Other GitHub Files
status: completed
priority: P1
created: 2025-12-11
project: specweave
external:
  github:
    issue: 942
    url: https://github.com/anton-abyzov/specweave/issues/942
---

# US-003: Token Passthrough for Other GitHub Files

**Feature**: [FS-146](./FEATURE.md)

**As a** SpecWeave user,
**I want** all GitHub plugin files to pass the token consistently,
**So that** the entire GitHub integration works with my `.env` token.

---

## Acceptance Criteria

- [x] **AC-US3-01**: `github-spec-sync.ts` passes `GH_TOKEN` to all `gh` calls
- [x] **AC-US3-02**: `github-issue-updater.ts` passes `GH_TOKEN` to all `gh` calls
- [x] **AC-US3-03**: `github-sync-bidirectional.ts` passes `GH_TOKEN` to all `gh` calls
- [x] **AC-US3-04**: `github-sync-increment-changes.ts` passes `GH_TOKEN` to all `gh` calls
- [x] **AC-US3-05**: `ThreeLayerSyncManager.ts` passes `GH_TOKEN` to all `gh` calls
- [x] **AC-US3-06**: `github-board-resolver.ts` passes `GH_TOKEN` to all `gh` calls
- [x] **AC-US3-07**: `github-hierarchical-sync.ts` passes `GH_TOKEN` to all `gh` calls
- [x] **AC-US3-08**: `github-increment-sync-cli.ts` passes `GH_TOKEN` to all `gh` calls
- [x] **AC-US3-09**: `duplicate-detector.ts` passes `GH_TOKEN` to all `gh` calls

---

## Implementation

**Increment**: [0146-github-cli-token-passthrough-fix](../../../../increments/0146-github-cli-token-passthrough-fix/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-003**: Update github-spec-sync.ts
- [x] **T-004**: Update standalone GitHub files
- [x] **T-007**: Rebuild and run tests
