---
increment: 0147-github-init-duplicate-prompts-elimination
title: "Eliminate Duplicate Prompts in GitHub + GitHub Issues Init Flow"
---

# Increment 0147: Eliminate Duplicate Prompts in GitHub + GitHub Issues Init Flow

## Problem Statement

When users select GitHub for repositories AND GitHub Issues for issue tracking during `specweave init`, they are currently asked the same repository configuration questions TWICE:

1. **First time**: During repository setup (Step 1)
   - "What is your repository structure?" (single/multi-repo)
   - "How do you want to configure repositories?" (Git provider selection)
   - "Git remote URL format?" (org/repo or full URL)

2. **Second time**: During issue tracker setup (Step 2)
   - Same questions repeated even though GitHub was already configured!

This creates a frustrating UX where users wonder "Why am I being asked this again?"

## Root Cause

The v1.0.3 optimization attempted to load repository configuration from `config.json` during issue tracker setup:

```typescript
// PROBLEM: config.json doesn't exist yet during init!
const existingConfig = await loadExistingGitHubRepoConfig(projectPath);
```

However, during the init flow:
1. Repository setup runs FIRST (collects GitHub org/PAT)
2. Issue tracker setup runs SECOND (needs same GitHub data)
3. Config.json is written LAST (after both steps complete)

The repository selection data (`{org, pat}`) from Step 1 is not passed to Step 2, so the system re-prompts.

## Solution

Pass GitHub repository selection data through function parameters instead of loading from file:

```
Repository Setup → repoResult.githubRepoSelection → Issue Tracker Setup
```

When `githubRepoSelection` is provided to issue tracker setup:
- ✅ SKIP: "What is your repository structure?" (already answered)
- ✅ SKIP: "How do you want to configure repositories?" (already answered)
- ✅ SKIP: "Git remote URL format?" (already answered)
- ✅ ASK (multi-repo only): "Which repo should be parent for GitHub Issues?"

## User Stories

### US-001: Pass GitHub Repository Selection Through Init Workflow
**Project**: specweave

**As a** developer running `specweave init`,
**I want** the system to pass GitHub repository selection data from repository setup to issue tracker setup,
**So that** I'm not asked the same questions twice.

**Acceptance Criteria:**

- [x] **AC-US1-01**: `init.ts` passes `githubRepoSelection` from `repoResult` to `setupIssueTrackerWrapper()`
- [x] **AC-US1-02**: `setupIssueTrackerWrapper()` accepts optional `githubCredentialsFromRepoSetup` parameter
- [x] **AC-US1-03**: `setupIssueTracker()` passes `githubCredentialsFromRepoSetup` to `configureGitHubRepositories()`
- [x] **AC-US1-04**: Parameter structure matches existing `adoCredentialsFromRepoSetup` pattern

**Definition of Done:**
- GitHub repo selection data flows from repository setup to issue tracker setup
- No changes to config.json structure
- Existing tests remain passing

---

### US-002: Skip Duplicate Prompts When GitHub Data Available
**Project**: specweave

**As a** developer who selected GitHub for repositories,
**I want** the issue tracker setup to skip repository configuration questions,
**So that** I only answer each question once.

**Acceptance Criteria:**

- [x] **AC-US2-01**: When `githubCredentialsFromRepoSetup` is provided, skip `RepoStructureManager.promptStructure()`
- [x] **AC-US2-02**: Reuse `org` and `pat` from repository setup instead of re-prompting
- [x] **AC-US2-03**: "How do you want to configure repositories?" is NOT asked when GitHub data available
- [x] **AC-US2-04**: "Git remote URL format?" is NOT asked when GitHub data available

**Definition of Done:**
- Zero duplicate questions when GitHub repos + GitHub Issues selected
- Single-repo flow completes without additional prompts
- Multi-repo flow only asks parent selection (US-003)

---

### US-003: Parent Repository Selection for Multi-Repo GitHub Issues
**Project**: specweave

**As a** developer with multiple GitHub repositories,
**I want** to select which repo should be the parent for GitHub Issues,
**So that** issues are created in the correct repository.

**Acceptance Criteria:**

- [x] **AC-US3-01**: When multi-repo + GitHub Issues selected, prompt "Which repo should be parent for GitHub Issues?"
- [x] **AC-US3-02**: Display list of repositories from `githubRepoSelection.profiles`
- [x] **AC-US3-03**: Single-repo case skips parent selection (uses the only repo)
- [x] **AC-US3-04**: Selected parent repo is marked as default in sync profiles

**Definition of Done:**
- Multi-repo users can choose parent repository
- Single-repo users don't see unnecessary prompt
- Parent selection is stored in config.json correctly

---

## Technical Approach

### 1. Modify `init.ts` to Pass GitHub Repo Selection

```typescript
// src/cli/commands/init.ts (around line 603)

// Extract githubRepoSelection from repoResult
const githubRepoSelection = repoResult.githubRepoSelection; // {org, pat, profiles}

await setupIssueTrackerWrapper(
  targetDir,
  language,
  isFrameworkRepo,
  repoResult.hosting,
  isCI,
  repoResult.adoProjectSelection,
  githubRepoSelection  // ← NEW PARAMETER
);
```

### 2. Update `setupIssueTrackerWrapper()` Signature

```typescript
// src/cli/helpers/issue-tracker/index.ts

export async function setupIssueTrackerWrapper(
  projectPath: string,
  language: Language,
  isFrameworkRepo: boolean,
  repositoryHosting?: string,
  isCI = false,
  adoCredentialsFromRepoSetup?: any,
  githubCredentialsFromRepoSetup?: any  // ← NEW PARAMETER
): Promise<void>
```

### 3. Update `setupIssueTracker()` to Accept GitHub Credentials

```typescript
// src/cli/helpers/issue-tracker/index.ts

export async function setupIssueTracker(
  projectPath: string,
  language: Language,
  isFrameworkRepo: boolean,
  repositoryHosting?: string,
  isCI = false,
  adoCredentialsFromRepoSetup?: any,
  githubCredentialsFromRepoSetup?: any  // ← NEW PARAMETER
): Promise<IssueTrackerConfig>
```

### 4. Modify `configureGitHubRepositories()` to Use Passed Data

```typescript
// src/cli/helpers/issue-tracker/github.ts

export async function configureGitHubRepositories(
  projectPath: string,
  language: Language,
  isFrameworkRepo: boolean,
  repositoryHosting?: string,
  githubCredentialsFromRepoSetup?: {
    org?: string;
    pat?: string;
    profiles?: Array<{owner: string; repo: string}>;
  }
): Promise<GitHubConfig> {

  // CRITICAL: If GitHub data provided from repository setup, reuse it!
  if (githubCredentialsFromRepoSetup) {
    const { org, pat, profiles } = githubCredentialsFromRepoSetup;

    // For multi-repo, ask which repo should be parent for issues
    if (profiles && profiles.length > 1) {
      const parentRepo = await selectParentRepoForIssues(profiles);
      // Use parentRepo as default
    }

    // SKIP all prompts - reuse existing data
    return {
      owner: org,
      repo: profiles?.[0]?.repo,
      // ... rest of config using provided data
    };
  }

  // Original flow for non-GitHub repository cases
  // ...
}
```

### 5. Remove Config.json Loading from Init Flow

Delete the `loadExistingGitHubRepoConfig()` function (introduced in v1.0.3) since it cannot work during init.

## Files to Modify

1. **src/cli/commands/init.ts**
   - Extract `githubRepoSelection` from `repoResult`
   - Pass to `setupIssueTrackerWrapper()`

2. **src/cli/helpers/issue-tracker/index.ts**
   - Add `githubCredentialsFromRepoSetup` parameter to both wrapper and main function
   - Pass through to `configureGitHubRepositories()`

3. **src/cli/helpers/issue-tracker/github.ts**
   - Update `configureGitHubRepositories()` signature
   - Add early return when `githubCredentialsFromRepoSetup` provided
   - Keep `selectParentRepoForIssues()` for multi-repo case
   - Remove `loadExistingGitHubRepoConfig()` function

4. **tests/unit/issue-tracker/github-repo-reuse.test.ts**
   - Update tests to use parameter passing instead of config.json loading
   - Add test for single-repo: no prompts shown
   - Add test for multi-repo: only parent selection shown

## Success Metrics

- ✅ Zero duplicate questions when GitHub repos + GitHub Issues selected
- ✅ Init flow completes 30-50% faster (fewer prompts)
- ✅ All existing tests pass
- ✅ New tests validate parameter passing approach

## Related Work

- **v1.0.3**: Initial optimization attempt (config.json loading - doesn't work during init)
- **ADO Flow**: Already uses `adoCredentialsFromRepoSetup` parameter successfully
- **Issue #779**: DORA metrics calculation fix (demonstrates parameter passing pattern)
