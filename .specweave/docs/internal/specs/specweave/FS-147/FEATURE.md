# FS-147: Eliminate Duplicate Prompts in GitHub Init Flow

**Status**: Completed
**Increment**: 0147-github-init-duplicate-prompts-elimination
**Priority**: P1

## Summary

Eliminated duplicate configuration prompts when users select GitHub for both repositories AND issue tracking during `specweave init`. Previously, users were asked the same repository configuration questions twice.

## Problem Solved

When users selected GitHub for repositories AND GitHub Issues for issue tracking, they were prompted for the same information twice:
1. During repository setup (Step 1)
2. During issue tracker setup (Step 2)

## Solution

Pass GitHub repository selection data through function parameters from repository setup to issue tracker setup, eliminating redundant prompts.

```
Repository Setup → repoResult.githubRepoSelection → Issue Tracker Setup
```

## User Stories

### US-001: Pass GitHub Repository Selection Through Init Workflow
- Pass `githubRepoSelection` from `repoResult` to `setupIssueTrackerWrapper()`
- Matches existing `adoCredentialsFromRepoSetup` pattern

### US-002: Skip Duplicate Prompts When GitHub Data Available
- Skip repository structure and configuration prompts
- Reuse `org` and `pat` from repository setup

### US-003: Parent Repository Selection for Multi-Repo
- Multi-repo users can select which repo hosts GitHub Issues
- Single-repo case skips parent selection

## Technical Changes

- `src/cli/commands/init.ts` - Extract and pass `githubRepoSelection`
- `src/cli/helpers/issue-tracker/index.ts` - Accept `githubCredentialsFromRepoSetup` parameter
- `src/cli/helpers/issue-tracker/github.ts` - Use passed data instead of re-prompting

## Success Metrics

- Zero duplicate questions when GitHub repos + GitHub Issues selected
- Init flow completes 30-50% faster (fewer prompts)
- All existing tests pass

---
*Synced from increment: 2025-12-30*
