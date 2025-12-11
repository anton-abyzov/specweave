---
increment: 0126-github-bitbucket-multirepo-pattern-parity
title: "GitHub/Bitbucket Multi-Repo Pattern Selection Parity with ADO"
priority: P1
status: completed
created: 2025-12-08
type: bug
project: specweave
---

# GitHub/Bitbucket Multi-Repo Pattern Selection Parity with ADO

## Problem Statement

When selecting "multiple repos" in the init flow, ADO users get a nice pattern selection UI with 4 options:
- All (clone all repositories)
- Pattern (glob) - Match by pattern (e.g., "sw-*", "*-backend")
- Pattern (regex) - Regular expression (e.g., "^sw-.*$")
- Skip - Configure later

However, GitHub and Bitbucket multi-repo users did NOT get this same UI - the init flow skipped directly past this step, creating inconsistent behavior.

## Solution

Extended the `setupRepositoryHosting()` function in `repository-setup.ts` to show the unified pattern selection UI for **all three providers** (ADO, GitHub, Bitbucket) when multi-repo is selected.

## Changes Made

### 1. Added new localized strings for GitHub/Bitbucket
- `githubMultiRepoHeader` / `bitbucketMultiRepoHeader`
- `githubMultiRepoDesc` / `bitbucketMultiRepoDesc`
- `githubSelectStrategy` / `bitbucketSelectStrategy`

### 2. Created unified `promptMultiRepoPatternSelection()` function
- Works for all three providers (github, bitbucket, ado)
- Shows provider-specific headers and descriptions
- Reuses existing pattern/regex validation logic
- Supports all 10 languages

### 3. Updated main flow in `setupRepositoryHosting()`
- Changed condition from `provider === 'ado' && isMultiRepo` to `isMultiRepo && (provider === 'ado' || provider === 'github' || provider === 'bitbucket')`
- ADO still gets additional project selection prompt first
- All providers now get the unified pattern selection

## User Stories

### US-001: GitHub Multi-Repo Pattern Selection
**As a** user setting up a GitHub multi-repo architecture
**I want** to specify which repositories to work with using patterns
**So that** I can filter my microservices repos efficiently

**Acceptance Criteria**:
- [x] AC-US1-01: User sees pattern selection after choosing GitHub + multiple
- [x] AC-US1-02: All 4 options are available (All, Pattern glob, Pattern regex, Skip)
- [x] AC-US1-03: Pattern shortcuts work (starts:, ends:, contains:)

### US-002: Bitbucket Multi-Repo Pattern Selection
**As a** user setting up a Bitbucket multi-repo architecture
**I want** the same pattern selection experience as ADO users
**So that** the init flow is consistent across providers

**Acceptance Criteria**:
- [x] AC-US2-01: User sees pattern selection after choosing Bitbucket + multiple
- [x] AC-US2-02: All 4 options are available
- [x] AC-US2-03: Localization works for all 10 languages

## Files Modified

- `src/cli/helpers/init/repository-setup.ts` - Main implementation
