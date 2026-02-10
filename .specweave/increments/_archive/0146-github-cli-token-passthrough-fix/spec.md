---
increment: 0146-github-cli-token-passthrough-fix
title: "GitHub CLI Token Passthrough Fix"
priority: P1
status: completed
created: 2025-12-11
completed: 2025-12-11
type: bug
---

# GitHub CLI Token Passthrough Fix

## Problem Statement

The GitHub plugin uses `gh` CLI commands via `execFileNoThrow()` but does not pass the `GH_TOKEN` environment variable from `.env`. This causes GitHub sync operations to use whatever account is configured via `gh auth`, which may be different from the token in `.env`.

**Root Cause Analysis:**
1. `getGitHubAuthFromProject()` correctly reads `GITHUB_TOKEN` from `.env` file
2. `GitHubClientV2` and other classes receive the token in constructor
3. BUT: All `gh` CLI calls use `execFileNoThrow('gh', [...])` WITHOUT passing `env: { GH_TOKEN: token }`
4. Node's `child_process.execFile` inherits `process.env` which doesn't have the `.env` values unless `dotenv` was loaded
5. `gh` CLI falls back to `gh auth` stored credentials (wrong user)

**Impact:**
- GitHub sync fails silently or uses wrong account
- Issues created/updated under wrong user
- Permissions errors (404, 403) when accounts don't match
- User confusion ("but I have the token in .env!")

## User Stories

### US-001: Token Passthrough for GitHub Client
**Project**: specweave
**Priority**: P0

**As a** SpecWeave user with `GITHUB_TOKEN` in `.env`,
**I want** all GitHub CLI operations to use my token automatically,
**So that** sync operations work correctly regardless of `gh auth` status.

#### Acceptance Criteria

- [x] **AC-US1-01**: `GitHubClientV2` passes `GH_TOKEN` env var to all `execFileNoThrow('gh', ...)` calls
- [x] **AC-US1-02**: Token is read from constructor config, not re-read from `.env` each time
- [x] **AC-US1-03**: Existing `process.env` is preserved (spread operator)
- [x] **AC-US1-04**: Works on Windows, macOS, and Linux

### US-002: Token Passthrough for Feature Sync
**Project**: specweave
**Priority**: P0

**As a** SpecWeave user,
**I want** `GitHubFeatureSync` to pass the token to all `gh` commands,
**So that** milestone and issue operations use my configured token.

#### Acceptance Criteria

- [x] **AC-US2-01**: `createMilestone()` passes `GH_TOKEN` to `execFileNoThrow`
- [x] **AC-US2-02**: `createUserStoryIssue()` passes `GH_TOKEN` to `execFileNoThrow`
- [x] **AC-US2-03**: `updateUserStoryIssue()` passes `GH_TOKEN` to `execFileNoThrow`
- [x] **AC-US2-04**: All other `gh` calls in `github-feature-sync.ts` pass `GH_TOKEN`

### US-003: Token Passthrough for Other GitHub Files
**Project**: specweave
**Priority**: P1

**As a** SpecWeave user,
**I want** all GitHub plugin files to pass the token consistently,
**So that** the entire GitHub integration works with my `.env` token.

#### Acceptance Criteria

- [x] **AC-US3-01**: `github-spec-sync.ts` passes `GH_TOKEN` to all `gh` calls
- [x] **AC-US3-02**: `github-issue-updater.ts` passes `GH_TOKEN` to all `gh` calls
- [x] **AC-US3-03**: `github-sync-bidirectional.ts` passes `GH_TOKEN` to all `gh` calls
- [x] **AC-US3-04**: `github-sync-increment-changes.ts` passes `GH_TOKEN` to all `gh` calls
- [x] **AC-US3-05**: `ThreeLayerSyncManager.ts` passes `GH_TOKEN` to all `gh` calls
- [x] **AC-US3-06**: `github-board-resolver.ts` passes `GH_TOKEN` to all `gh` calls
- [x] **AC-US3-07**: `github-hierarchical-sync.ts` passes `GH_TOKEN` to all `gh` calls
- [x] **AC-US3-08**: `github-increment-sync-cli.ts` passes `GH_TOKEN` to all `gh` calls
- [x] **AC-US3-09**: `duplicate-detector.ts` passes `GH_TOKEN` to all `gh` calls

### US-004: Unit Tests for Token Passthrough
**Project**: specweave
**Priority**: P1

**As a** SpecWeave maintainer,
**I want** unit tests that verify token passthrough behavior,
**So that** this bug doesn't regress in future changes.

#### Acceptance Criteria

- [x] **AC-US4-01**: Test that `GitHubClientV2` methods pass `GH_TOKEN` in env
- [x] **AC-US4-02**: Test that token from constructor is used, not `process.env`
- [x] **AC-US4-03**: Test that `process.env` values are preserved (not overwritten)
- [x] **AC-US4-04**: Integration test with mock that verifies env passthrough

## Out of Scope

- Changing how tokens are stored (still `.env`)
- Adding new auth methods (OAuth, etc.)
- Changing `execFileNoThrow` signature (just use existing `env` option)

## Technical Notes

**Solution Pattern:**
```typescript
// BEFORE (broken):
await execFileNoThrow('gh', ['issue', 'create', ...]);

// AFTER (fixed):
await execFileNoThrow('gh', ['issue', 'create', ...], {
  env: { ...process.env, GH_TOKEN: this.token }
});
```

**Files to Update:**
1. `plugins/specweave-github/lib/github-client-v2.ts` - Main client class
2. `plugins/specweave-github/lib/github-feature-sync.ts` - Feature/milestone sync
3. `plugins/specweave-github/lib/github-spec-sync.ts` - Spec sync
4. `plugins/specweave-github/lib/github-issue-updater.ts` - Issue updates
5. `plugins/specweave-github/lib/github-sync-bidirectional.ts` - Bidirectional sync
6. `plugins/specweave-github/lib/github-sync-increment-changes.ts` - Increment changes
7. `plugins/specweave-github/lib/ThreeLayerSyncManager.ts` - Three-layer sync
8. `plugins/specweave-github/lib/github-board-resolver.ts` - Board resolution
9. `plugins/specweave-github/lib/github-hierarchical-sync.ts` - Hierarchical sync
10. `plugins/specweave-github/lib/github-increment-sync-cli.ts` - CLI sync
11. `plugins/specweave-github/lib/duplicate-detector.ts` - Duplicate detection
