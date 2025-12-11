# Technical Plan: GitHub and Bitbucket Multi-Repo Cloning

## Architecture Overview

Implement GitHub and Bitbucket repository cloning with the same architecture as ADO:

```
┌─────────────────────────────────────┐
│   init.ts (CLI Entry Point)        │
└─────────────────┬───────────────────┘
                  │
                  ├── repoResult.hosting === 'ado-multirepo'
                  │   → triggerAdoRepoCloning() ✅ EXISTS
                  │
                  ├── repoResult.hosting === 'github-multirepo'
                  │   → triggerGitHubRepoCloning() ❌ MISSING
                  │
                  └── repoResult.hosting === 'bitbucket-multirepo'
                      → triggerBitbucketRepoCloning() ❌ MISSING
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│   Provider-Specific Cloning Module                      │
│   (github-repo-cloning.ts / bitbucket-repo-cloning.ts)  │
│                                                          │
│   1. Fetch repos from API                               │
│   2. Filter by pattern (glob/regex)                     │
│   3. Build clone URLs (HTTPS + token)                   │
│   4. Launch background job                              │
│   5. Return job ID                                      │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────┐
│   launchCloneJob()                   │
│   (existing background job launcher) │
└──────────────────────────────────────┘
```

## Components

### 1. GitHub Repo Cloning Module

**File**: `src/cli/helpers/init/github-repo-cloning.ts`

**Responsibilities**:
- Fetch repositories from GitHub organization via REST API
- Filter repositories by clone pattern (all/glob/regex)
- Build HTTPS clone URLs with PAT authentication
- Launch background clone job
- Return job ID for dependency tracking

**API Endpoints**:
```
GET https://api.github.com/orgs/{org}/repos?per_page=100&page={page}
```

**Authentication**: Bearer token (GitHub PAT)

**Clone URL Format**:
```
https://{PAT}@github.com/{owner}/{repo}.git
```

### 2. Bitbucket Repo Cloning Module

**File**: `src/cli/helpers/init/bitbucket-repo-cloning.ts`

**Responsibilities**:
- Fetch repositories from Bitbucket workspace via REST API v2.0
- Filter repositories by clone pattern (all/glob/regex)
- Build HTTPS clone URLs with app password authentication
- Launch background clone job
- Return job ID for dependency tracking

**API Endpoints**:
```
GET https://api.bitbucket.org/2.0/repositories/{workspace}?pagelen=100&page={page}
```

**Authentication**: Basic Auth (username + app password)

**Clone URL Format**:
```
https://{username}:{app_password}@bitbucket.org/{workspace}/{repo}.git
```

### 3. Init Flow Integration

**File**: `src/cli/commands/init.ts`

**Changes Required**:
```typescript
// AFTER line 517 (ADO cloning section)
// ADD:

// GitHub Repository cloning (for multi-repo setups)
if (repoResult.hosting === 'github-multirepo' && repoResult.adoClonePatternResult) {
  const cloneJobId = await triggerGitHubRepoCloning(
    targetDir,
    gitHubRemote, // owner/org from detected remote
    githubToken,  // from .env or prompt
    repoResult.adoClonePatternResult // reuse pattern result
  );
  if (cloneJobId) {
    pendingJobIds.push(cloneJobId);
  }
}

// Bitbucket Repository cloning (for multi-repo setups)
if (repoResult.hosting === 'bitbucket-multirepo' && repoResult.adoClonePatternResult) {
  const cloneJobId = await triggerBitbucketRepoCloning(
    targetDir,
    bitbucketWorkspace, // from .env or prompt
    bitbucketUsername,
    bitbucketAppPassword,
    repoResult.adoClonePatternResult // reuse pattern result
  );
  if (cloneJobId) {
    pendingJobIds.push(cloneJobId);
  }
}
```

## Data Models

### GitHubRepoSelection Interface

```typescript
export interface GitHubRepoSelection {
  org: string;           // GitHub organization/owner
  pat: string;           // Personal Access Token
}
```

### BitbucketRepoSelection Interface

```typescript
export interface BitbucketRepoSelection {
  workspace: string;     // Bitbucket workspace slug
  username: string;      // Bitbucket username
  appPassword: string;   // App password for authentication
}
```

### Repository Info (from APIs)

```typescript
interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;      // "owner/repo"
  clone_url: string;      // HTTPS clone URL
  html_url: string;       // Web URL
}

interface BitbucketRepository {
  uuid: string;
  name: string;
  full_name: string;      // "workspace/repo"
  links: {
    clone: Array<{
      name: string;       // "https"
      href: string;       // clone URL
    }>;
    html: {
      href: string;       // web URL
    };
  };
}
```

## Technical Decisions

### Decision 1: Reuse ADO Pattern Selection

**Choice**: Reuse `adoClonePatternResult` from repository-setup.ts

**Rationale**:
- Pattern selection UI is provider-agnostic (all/glob/regex)
- `filterRepositoriesByPattern()` works for any repo list
- Reduces code duplication
- Consistent UX across providers

**Implementation**:
```typescript
// repository-setup.ts already handles pattern selection for ALL providers
// Result stored in: repoResult.adoClonePatternResult
// Functions work with generic repo lists
```

### Decision 2: HTTPS Clone URLs Only

**Choice**: Use HTTPS clone URLs with embedded tokens, not SSH

**Rationale**:
- Matches ADO implementation
- Works in CI/CD environments
- No SSH key management required
- Consistent with existing pattern

**Trade-offs**:
- ❌ Token visible in process list during clone
- ✅ Simpler authentication flow
- ✅ Works everywhere (no SSH agent required)

### Decision 3: Sequential Cloning

**Choice**: Clone repos sequentially in background job (not parallel)

**Rationale**:
- Matches existing ADO implementation
- Avoids API rate limit issues
- Simpler error handling
- Job progress easier to track

**Future Enhancement**: Parallel cloning with semaphore (not in scope)

### Decision 4: Pagination Strategy

**Choice**: Fetch all pages up to 500 repos max

**Rationale**:
- GitHub API: 100 repos/page
- Bitbucket API: 100 repos/page
- Most orgs have <500 repos
- User can filter with patterns

**Implementation**:
```typescript
async function fetchAllRepos(org: string, pat: string): Promise<Repo[]> {
  const repos: Repo[] = [];
  let page = 1;
  const perPage = 100;

  while (repos.length < 500) {
    const response = await fetch(`${apiUrl}?per_page=${perPage}&page=${page}`);
    const batch = await response.json();

    if (batch.length === 0) break;
    repos.push(...batch);
    if (batch.length < perPage) break; // Last page

    page++;
  }

  return repos;
}
```

## Implementation Phases

### Phase 1: GitHub Cloning (Priority)

1. Create `github-repo-cloning.ts` module
2. Implement `triggerGitHubRepoCloning()` function
3. Fetch repos from GitHub API
4. Filter by pattern
5. Build clone URLs
6. Launch background job
7. Integrate into init.ts

### Phase 2: Bitbucket Cloning

1. Create `bitbucket-repo-cloning.ts` module
2. Implement `triggerBitbucketRepoCloning()` function
3. Fetch repos from Bitbucket API v2.0
4. Filter by pattern
5. Build clone URLs
6. Launch background job
7. Integrate into init.ts

### Phase 3: Testing & Documentation

1. Test GitHub cloning with various patterns
2. Test Bitbucket cloning with various patterns
3. Test job tracking via `/specweave:jobs`
4. Test living docs dependency waiting
5. Update init flow documentation

## Error Handling

### GitHub API Errors

```typescript
try {
  const repos = await fetchGitHubRepos(org, pat);
} catch (error) {
  if (error.status === 401) {
    console.log(chalk.red('   ❌ Invalid GitHub PAT'));
    return undefined;
  }
  if (error.status === 404) {
    console.log(chalk.red(`   ❌ Organization "${org}" not found`));
    return undefined;
  }
  if (error.status === 403) {
    console.log(chalk.red('   ❌ Rate limit exceeded - try again later'));
    return undefined;
  }
  console.log(chalk.yellow(`   ⚠️ GitHub API error: ${error.message}`));
  return undefined;
}
```

### Bitbucket API Errors

```typescript
try {
  const repos = await fetchBitbucketRepos(workspace, username, appPassword);
} catch (error) {
  if (error.status === 401) {
    console.log(chalk.red('   ❌ Invalid Bitbucket credentials'));
    return undefined;
  }
  if (error.status === 404) {
    console.log(chalk.red(`   ❌ Workspace "${workspace}" not found`));
    return undefined;
  }
  console.log(chalk.yellow(`   ⚠️ Bitbucket API error: ${error.message}`));
  return undefined;
}
```

## Testing Strategy

### Unit Tests

- Mock GitHub/Bitbucket API responses
- Test pattern filtering with various glob/regex patterns
- Test clone URL construction
- Test error handling for API failures

### Integration Tests

- Test full init flow with multi-repo selection
- Verify background job creation
- Verify job tracking via `/specweave:jobs`
- Verify living docs dependency waiting

### Manual Testing Checklist

- [ ] GitHub multi-repo init with "All" pattern
- [ ] GitHub multi-repo init with glob pattern (e.g., "web-*")
- [ ] GitHub multi-repo init with regex pattern
- [ ] Bitbucket multi-repo init with "All" pattern
- [ ] Bitbucket multi-repo init with patterns
- [ ] Job appears in `/specweave:jobs`
- [ ] Living docs waits for clone completion
- [ ] Error handling for invalid tokens
- [ ] Error handling for nonexistent orgs/workspaces

## Security Considerations

1. **Token Storage**: Tokens stored in `.env` (gitignored)
2. **Token Logging**: Never log tokens to console/files
3. **Clone URL Security**: URLs with embedded tokens not persisted
4. **API Rate Limits**: Authenticated requests have higher limits

## Performance Considerations

1. **API Pagination**: Fetch 100 repos/page (max 5 pages = 500 repos)
2. **Clone Speed**: Sequential cloning ~10 repos/minute
3. **Job Tracking**: Background job prevents blocking init flow
4. **Progress Display**: Real-time updates via job manager

## Documentation Updates

- Update init command docs with GitHub/Bitbucket multi-repo examples
- Add troubleshooting section for clone failures
- Document token/app password setup for each provider
- Add examples of pattern matching for different use cases
