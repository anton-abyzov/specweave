# 0081: ADO Repository Cloning - Implementation Plan

## Architecture Overview

```
Init Flow (repository-setup.ts)
         │
         ▼ Returns adoProjectSelection + adoClonePattern
┌─────────────────────────────────────────────────────┐
│ NEW: triggerAdoRepoCloning()                        │
│  1. Fetch repo list from ADO API                    │
│  2. Filter by pattern (glob/regex)                  │
│  3. Create background clone job                     │
│  4. Start cloning (non-blocking)                    │
└─────────────────────────────────────────────────────┘
         │
         ▼
Background Job Manager (.specweave/state/background-jobs.json)
         │
         ▼
/specweave:jobs - Monitor progress
```

## Implementation Components

### 1. ADO Repository List API (azure-devops-provider.ts)

Add `listRepositories()` method:

```typescript
async listRepositories(
  organization: string,
  project: string,
  token: string
): Promise<Array<{ id: string; name: string; remoteUrl: string; sshUrl: string }>>
```

**API Endpoint**: `GET https://dev.azure.com/{org}/{project}/_apis/git/repositories?api-version=7.0`

### 2. Pattern Matching Utility (selection-strategy.ts)

Add `filterRepositoriesByPattern()`:

```typescript
function filterRepositoriesByPattern(
  repos: Array<{ name: string }>,
  pattern: string,
  isRegex: boolean
): Array<{ name: string }>
```

Uses existing `parsePatternShortcut()` and `validateRegex()`.

### 3. Init Flow Integration (init.ts)

After `setupRepositoryHosting()`:

```typescript
// Line ~486 - after setupIssueTrackerWrapper
if (repoResult.adoProjectSelection && repoResult.adoClonePatternResult?.strategy !== 'skip') {
  await triggerAdoRepoCloning(targetDir, repoResult.adoProjectSelection, repoResult.adoClonePatternResult);
}
```

### 4. Background Clone Trigger (new file: ado-repo-cloning.ts)

```typescript
export async function triggerAdoRepoCloning(
  projectPath: string,
  adoProjectSelection: AdoProjectSelection,
  clonePattern: AdoClonePatternResult
): Promise<void> {
  // 1. Fetch repos from all selected projects
  // 2. Filter by pattern
  // 3. Create background job
  // 4. Start async cloning
  // 5. Print status message
}
```

### 5. Slash Command (plugins/specweave-ado/commands/specweave-ado-clone-repos.md)

For post-init cloning with interactive prompts.

## File Changes

| File | Change |
|------|--------|
| `src/core/repo-structure/providers/azure-devops-provider.ts` | Add `listRepositories()` |
| `src/cli/helpers/init/ado-repo-cloning.ts` | NEW: Clone trigger logic |
| `src/cli/commands/init.ts` | Call `triggerAdoRepoCloning()` |
| `plugins/specweave-ado/commands/specweave-ado-clone-repos.md` | NEW: Slash command |

## Non-Blocking Design

1. **Init completes immediately** after starting background job
2. **Cloning happens asynchronously** via job manager
3. **Progress tracked** in `.specweave/state/background-jobs.json`
4. **Resumable** if interrupted (uses existing job manager)

## Error Handling

- **Auth failures**: Show "Check your PAT permissions" + token URL
- **Network errors**: Retry with exponential backoff
- **Clone failures**: Log to job, continue with next repo
- **Rate limits**: Pause job, show resume instructions
