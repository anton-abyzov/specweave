# Implementation Plan: 0147-github-init-duplicate-prompts-elimination

## Overview

Eliminate duplicate prompts in GitHub + GitHub Issues init flow by passing repository selection data through function parameters instead of loading from config.json.

## Architecture Decision

**Pattern**: Follow existing ADO credential passing pattern
- ADO already uses `adoCredentialsFromRepoSetup` parameter successfully
- Apply same approach for GitHub: `githubCredentialsFromRepoSetup`
- Data flows: `init.ts` → `setupIssueTrackerWrapper()` → `setupIssueTracker()` → `configureGitHubRepositories()`

## Implementation Phases

### Phase 1: Extract and Pass GitHub Repo Selection (US-001)

**File**: `src/cli/commands/init.ts`

**Current Code** (around line 603):
```typescript
await setupIssueTrackerWrapper(
  targetDir,
  language,
  isFrameworkRepo,
  repoResult.hosting,
  isCI,
  repoResult.adoProjectSelection
);
```

**New Code**:
```typescript
// Extract GitHub repo selection from repoResult
const githubRepoSelection = repoResult.githubRepoSelection;

await setupIssueTrackerWrapper(
  targetDir,
  language,
  isFrameworkRepo,
  repoResult.hosting,
  isCI,
  repoResult.adoProjectSelection,
  githubRepoSelection  // ← Pass GitHub data
);
```

**Dependencies**:
- Need to verify `repoResult.githubRepoSelection` structure from repository setup
- Check `src/cli/helpers/repository-setup.ts` for return type

---

### Phase 2: Update Function Signatures (US-001)

**File 1**: `src/cli/helpers/issue-tracker/index.ts` (setupIssueTrackerWrapper)

**Current Signature**:
```typescript
export async function setupIssueTrackerWrapper(
  projectPath: string,
  language: Language,
  isFrameworkRepo: boolean,
  repositoryHosting?: string,
  isCI = false,
  adoCredentialsFromRepoSetup?: any
): Promise<void>
```

**New Signature**:
```typescript
export async function setupIssueTrackerWrapper(
  projectPath: string,
  language: Language,
  isFrameworkRepo: boolean,
  repositoryHosting?: string,
  isCI = false,
  adoCredentialsFromRepoSetup?: any,
  githubCredentialsFromRepoSetup?: {
    org?: string;
    pat?: string;
    profiles?: Array<{owner: string; repo: string}>;
  }
): Promise<void>
```

**File 2**: `src/cli/helpers/issue-tracker/index.ts` (setupIssueTracker)

Add same `githubCredentialsFromRepoSetup` parameter and pass to `configureGitHubRepositories()`.

---

### Phase 3: Skip Duplicate Prompts (US-002)

**File**: `src/cli/helpers/issue-tracker/github.ts`

**Current Function** (~line 400):
```typescript
export async function configureGitHubRepositories(
  projectPath: string,
  language: Language,
  isFrameworkRepo: boolean,
  repositoryHosting?: string
): Promise<GitHubConfig>
```

**New Function**:
```typescript
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

  // OPTIMIZATION: If GitHub data from repository setup, reuse it!
  if (githubCredentialsFromRepoSetup) {
    console.log(chalk.cyan('\n📂 Reusing GitHub Repository Configuration\n'));

    const { org, pat, profiles } = githubCredentialsFromRepoSetup;

    // For multi-repo, ask which repo should be parent for issues
    let parentRepo = profiles?.[0];
    if (profiles && profiles.length > 1) {
      parentRepo = await selectParentRepoForIssues(profiles);
    }

    // SKIP all prompts - return config using provided data
    return {
      owner: parentRepo?.owner || org || '',
      repo: parentRepo?.repo || '',
      token: pat || '',
      // ... rest of config
    };
  }

  // Original flow for non-GitHub repository cases
  // ...existing code...
}
```

**Key Changes**:
- Add early return when `githubCredentialsFromRepoSetup` provided
- Only prompt for parent repo selection in multi-repo case
- Skip all other prompts (structure, provider, URL format)

---

### Phase 4: Parent Repository Selection (US-003)

**Keep existing function** (already implemented in v1.0.3):

```typescript
async function selectParentRepoForIssues(
  profiles: Array<{owner: string; repo: string}>
): Promise<{owner: string; repo: string}>
```

**Behavior**:
- Called ONLY when `profiles.length > 1`
- Prompts: "Which repository should be the parent for GitHub Issues?"
- Returns selected repo to use as default

**No changes needed** - function already works correctly.

---

### Phase 5: Remove Config.json Loading (Cleanup)

**File**: `src/cli/helpers/issue-tracker/github.ts`

**Remove function** (added in v1.0.3, doesn't work during init):
```typescript
async function loadExistingGitHubRepoConfig(projectPath: string) {
  // DELETE THIS ENTIRE FUNCTION
}
```

**Reason**: Config.json doesn't exist during init flow, so loading from it is impossible.

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Repository Setup (Step 1)                                   │
│ - User selects: GitHub multi-repo                           │
│ - Prompts: structure, provider, URL format                  │
│ - Result: repoResult.githubRepoSelection = {org, pat, ...}  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ init.ts extracts githubRepoSelection                        │
│ - const githubRepoSelection = repoResult.githubRepoSelection│
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ setupIssueTrackerWrapper(... githubRepoSelection)           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ setupIssueTracker(... githubCredentialsFromRepoSetup)       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ configureGitHubRepositories(... githubCredentialsFromRepoSetup) │
│ - If provided: SKIP prompts                                 │
│ - Multi-repo: Ask parent selection                          │
│ - Single-repo: Use org/repo directly                        │
└─────────────────────────────────────────────────────────────┘
```

## Testing Strategy

### Unit Tests

**File**: `tests/unit/issue-tracker/github-repo-reuse.test.ts`

**Update existing tests**:
1. ✅ Single-repo with GitHub data: No prompts shown
2. ✅ Multi-repo with GitHub data: Only parent selection shown
3. ✅ No GitHub data: Original prompts still work
4. ✅ GitHub data structure validation

**New tests needed**:
5. Parameter passing through init.ts → setupIssueTrackerWrapper
6. Edge case: Empty profiles array
7. Edge case: GitHub data but non-GitHub issue tracker selected

### Integration Tests

**Manual testing**:
1. Run `specweave init` with GitHub repos + GitHub Issues (single-repo)
   - Expected: No duplicate questions
2. Run `specweave init` with GitHub repos + GitHub Issues (multi-repo)
   - Expected: Only "Which repo for issues?" question
3. Run `specweave init` with GitHub repos + Jira
   - Expected: Original Jira prompts (GitHub data ignored)

## Rollout Plan

1. ✅ Create increment structure
2. Implement Phase 1-5 sequentially
3. Run unit tests after each phase
4. Manual testing with all 3 scenarios
5. Update CHANGELOG.md for v1.0.4
6. Release v1.0.4 (patch version)

## Risk Mitigation

**Risk 1**: Breaking existing init flows
- **Mitigation**: GitHub credentials parameter is OPTIONAL
- **Fallback**: Original prompts still work if parameter not provided

**Risk 2**: Incorrect data structure
- **Mitigation**: Validate `githubRepoSelection` structure in init.ts
- **Fallback**: Log error and fall back to original prompts

**Risk 3**: Multi-repo parent selection breaks
- **Mitigation**: Keep existing `selectParentRepoForIssues()` function unchanged
- **Test**: Dedicated unit test for multi-repo scenario

## Success Criteria

- [ ] Zero duplicate questions when GitHub repos + GitHub Issues selected
- [ ] All existing tests pass (11/11 in github-repo-reuse.test.ts)
- [ ] Manual test: Single-repo flow completes in <10 questions
- [ ] Manual test: Multi-repo flow only asks parent selection
- [ ] Code review: Parameter passing follows ADO pattern
