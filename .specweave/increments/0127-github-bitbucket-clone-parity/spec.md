---
increment: 0127-github-bitbucket-clone-parity
title: "GitHub and Bitbucket Multi-Repo Cloning Parity with ADO"
type: feature
priority: P1
status: planned
created: 2025-12-08
project: specweave
test_mode: test-after
coverage_target: 80
---

# Increment 0127: GitHub and Bitbucket Multi-Repo Cloning Parity

## Problem Statement

Currently, `specweave init` supports multi-repo cloning for Azure DevOps (ADO) through `triggerAdoRepoCloning()`, which:
- Fetches repositories from ADO projects
- Filters by glob/regex patterns
- Creates background jobs for async cloning
- Registers jobs with job manager for tracking via `/specweave:jobs`

However, GitHub and Bitbucket multi-repo setups **do NOT have equivalent functionality**:
- ❌ No `triggerGitHubRepoCloning()` function
- ❌ No `triggerBitbucketRepoCloning()` function
- ❌ No background job registration
- ❌ No progress tracking
- ❌ Repositories are NOT cloned at all

**User Impact:**
- Users select "All repositories" during GitHub/Bitbucket init → nothing happens
- `/specweave:jobs` shows no background jobs
- Living docs generation cannot wait for repos to clone (dependency missing)
- Users must manually clone repos after init

## Success Criteria

✅ GitHub multi-repo cloning works like ADO:
- Fetches repos from GitHub org via API
- Filters by user-selected pattern (all/glob/regex)
- Creates background clone jobs
- Tracks progress via `/specweave:jobs`

✅ Bitbucket multi-repo cloning works like ADO:
- Fetches repos from Bitbucket workspace via API
- Filters by user-selected pattern (all/glob/regex)
- Creates background clone jobs
- Tracks progress via `/specweave:jobs`

✅ Living docs generation can depend on clone jobs:
- Clone job IDs added to `pendingJobIds[]`
- Living docs waits for repos to exist before scanning

✅ Parity with ADO implementation:
- Same UX (selection strategy, progress display)
- Same job manager integration
- Same error handling

## User Stories

### US-001: GitHub Multi-Repo Cloning

**As a** SpecWeave user with multiple GitHub repositories
**I want** to clone all/selected repos during `specweave init`
**So that** I don't have to manually clone each repo after init

**Acceptance Criteria:**

- **AC-US1-01**: `triggerGitHubRepoCloning()` function exists in `src/cli/helpers/init/github-repo-cloning.ts`
- **AC-US1-02**: GitHub org repos fetched via GitHub API (with PAT authentication)
- **AC-US1-03**: Repos filtered by user-selected pattern (all/glob/regex)
- **AC-US1-04**: Background clone job created via `launchCloneJob()`
- **AC-US1-05**: Job ID returned and added to `pendingJobIds[]` in init.ts
- **AC-US1-06**: Clone URLs use HTTPS format with token authentication
- **AC-US1-07**: Progress displayed: "Cloning N repositories in background..."
- **AC-US1-08**: Job visible in `/specweave:jobs` command

### US-002: Bitbucket Multi-Repo Cloning

**As a** SpecWeave user with multiple Bitbucket repositories
**I want** to clone all/selected repos during `specweave init`
**So that** I can work with my Bitbucket multi-repo setup

**Acceptance Criteria:**

- **AC-US2-01**: `triggerBitbucketRepoCloning()` function exists in `src/cli/helpers/init/bitbucket-repo-cloning.ts`
- **AC-US2-02**: Bitbucket workspace repos fetched via Bitbucket API
- **AC-US2-03**: Repos filtered by user-selected pattern (all/glob/regex)
- **AC-US2-04**: Background clone job created via `launchCloneJob()`
- **AC-US2-05**: Job ID returned and added to `pendingJobIds[]` in init.ts
- **AC-US2-06**: Clone URLs use HTTPS format with app password authentication
- **AC-US2-07**: Progress displayed: "Cloning N repositories in background..."
- **AC-US2-08**: Job visible in `/specweave:jobs` command

### US-003: Init Flow Integration

**As a** SpecWeave developer
**I want** GitHub/Bitbucket cloning integrated into init.ts workflow
**So that** it works seamlessly like ADO cloning

**Acceptance Criteria:**

- **AC-US3-01**: init.ts calls `triggerGitHubRepoCloning()` when `repoResult.hosting === 'github-multirepo'`
- **AC-US3-02**: init.ts calls `triggerBitbucketRepoCloning()` when `repoResult.hosting === 'bitbucket-multirepo'`
- **AC-US3-03**: Clone job IDs added to `pendingJobIds[]` array
- **AC-US3-04**: Living docs generation receives `dependsOn: pendingJobIds`
- **AC-US3-05**: Error handling matches ADO pattern (non-blocking failures)
- **AC-US3-06**: User sees consistent UX across all git providers

## Technical Context

**Existing ADO Implementation** ([ado-repo-cloning.ts:90](src/cli/helpers/init/ado-repo-cloning.ts#L90)):
```typescript
export async function triggerAdoRepoCloning(
  projectPath: string,
  adoProjectSelection: AdoProjectSelection,
  clonePattern: ClonePatternResult
): Promise<string | undefined>
```

**Required for GitHub/Bitbucket:**
- Fetch repos from provider API
- Filter by pattern (reuse `filterRepositoriesByPattern()`)
- Build clone URLs (HTTPS with token)
- Launch background job (reuse `launchCloneJob()`)
- Return job ID for dependency tracking

**Dependencies:**
- GitHub API: https://api.github.com/orgs/{org}/repos
- Bitbucket API: https://api.bitbucket.org/2.0/repositories/{workspace}
- Existing utilities: `launchCloneJob()`, `filterRepositoriesByPattern()`

## Out of Scope

- ❌ SSH clone URL support (HTTPS only)
- ❌ GitHub Enterprise / Bitbucket Server support (cloud only)
- ❌ Parallel cloning optimization (use existing sequential approach)
- ❌ Partial clone support (--depth, --filter)
- ❌ Submodule initialization
- ❌ LFS support

## Dependencies

- **Increment 0081**: ADO repo cloning (reference implementation)
- **Increment 0099**: Claude Code native background jobs

## Risks

1. **GitHub API Rate Limits**: Fetching 100+ repos may hit rate limits
   - Mitigation: Use authenticated requests (5000/hour vs 60/hour)

2. **Token Security**: Clone URLs embed PAT/app passwords
   - Mitigation: Use same security as ADO (environment variables)

3. **Large Org Repos**: Orgs with 500+ repos slow to fetch
   - Mitigation: Pagination, user-selected pattern filtering
