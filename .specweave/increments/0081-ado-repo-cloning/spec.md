---
increment: 0081-ado-repo-cloning
feature_id: FS-081
status: completed
---

# 0081: ADO Repository Cloning

## Problem Statement

When user runs `specweave init` and selects:
- Multiple repos structure
- Azure DevOps provider
- ADO organization + projects
- Clone pattern (all/glob/regex)

The init flow **collects all this information but never clones the repositories**. The `adoClonePattern` and `adoClonePatternResult` returned by `setupRepositoryHosting()` are completely discarded.

## Root Cause

In `src/cli/commands/init.ts`:
- Line 481: `setupRepositoryHosting()` returns `{ adoClonePattern, adoProjectSelection, ... }`
- Line 485: Only `adoProjectSelection` is passed to `setupIssueTrackerWrapper()` (for work items)
- **MISSING**: No code calls `initializeLocalRepos()` or fetches/clones ADO repositories

## User Stories

### US-001: List ADO Repositories
**As a** user running specweave init with ADO multi-repo
**I want** the system to fetch repository list from my selected ADO projects
**So that** I can clone them to my local workspace

**Acceptance Criteria**:
- [x] **AC-US1-01**: System calls ADO REST API to list repositories
- [x] **AC-US1-02**: Repositories from all selected projects are fetched
- [x] **AC-US1-03**: API errors are handled gracefully with retry guidance

### US-002: Filter Repositories by Pattern
**As a** user who selected a clone pattern
**I want** repositories filtered by my glob/regex pattern
**So that** I only clone relevant repos

**Acceptance Criteria**:
- [x] **AC-US2-01**: Pattern `*` clones all repos
- [x] **AC-US2-02**: Glob patterns like `sw-*` filter correctly
- [x] **AC-US2-03**: Regex patterns with `regex:` prefix work
- [x] **AC-US2-04**: Skip pattern skips cloning entirely

### US-003: Background Cloning During Init
**As a** user
**I want** repository cloning to happen in background
**So that** init completes quickly and I can start working

**Acceptance Criteria**:
- [x] **AC-US3-01**: Init doesn't block waiting for clones
- [x] **AC-US3-02**: Background job is created for tracking
- [x] **AC-US3-03**: User sees "Cloning X repos in background..."
- [x] **AC-US3-04**: Clone progress can be checked via `/specweave:jobs`

### US-004: Post-Init Clone Command
**As a** user who skipped cloning during init
**I want** a command to clone repos later
**So that** I can add repos without re-running init

**Acceptance Criteria**:
- [x] **AC-US4-01**: `/specweave-ado:clone-repos` command exists
- [x] **AC-US4-02**: Can specify project(s) and pattern
- [x] **AC-US4-03**: Uses same background job system
- [x] **AC-US4-04**: Shows progress and errors clearly

## Out of Scope
- GitHub/Bitbucket multi-repo cloning (future increment)
- Monorepo submodule cloning
- Automatic repo discovery without user selection
