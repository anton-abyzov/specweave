# ADR-0026: GitHub API Validation Approach

**Date**: 2025-11-11
**Status**: Accepted
**Context**: Increment 0022 - Multi-Repository Initialization UX Improvements

---

## Context

Multi-repository setup creates repositories on GitHub via API calls:

**Current Problem**:
- No validation before creation attempts
- GitHub API returns cryptic errors:
  - "Repository already exists" (422 error)
  - "Not Found" for invalid owner (404 error)
  - "Validation Failed" for invalid names (422 error)
- Users don't discover errors until creation attempt
- No way to use existing repositories

**User Experience Issues**:
```
User: "Create repository myorg/my-app"
System: [calls GitHub API]
GitHub: 422 Unprocessable Entity - "name already exists on this account"
User: "What? I need to check GitHub first?"
```

**What Users Want**:
- Validate repository name BEFORE creation
- Check if owner/org exists BEFORE prompting for repos
- Offer to use existing repository if found
- Clear error messages with resolution steps

**Requirements**:
- Pre-validate repository existence
- Pre-validate owner/org existence
- Handle rate limits gracefully
- Retry on network failures
- Show clear error messages

---

## Decision

Implement pre-validation using GitHub API checks:

### Validation Flow

```
1. User enters repository details (owner, name)
   ↓
2. Validate owner exists (GET /users/{owner} or GET /orgs/{owner})
   ↓
3. Validate repository doesn't exist (GET /repos/{owner}/{repo})
   ↓
4. If exists → offer to use existing
   ↓
5. If not exists → proceed with creation
   ↓
6. Create repository (POST /repos/{owner}/{repos})
```

### Repository Existence Check

```typescript
interface ValidationResult {
  exists: boolean;           // Does repository exist?
  valid: boolean;            // Is request valid?
  url?: string;              // GitHub URL (if exists)
  error?: string;            // Error message (if invalid)
}

async function validateRepository(
  owner: string,
  repo: string,
  token: string
): Promise<ValidationResult> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'SpecWeave-Setup'
        }
      }
    );

    if (response.status === 404) {
      // Repository doesn't exist (OK to create)
      return { exists: false, valid: true };
    }

    if (response.status === 200) {
      // Repository exists
      const data = await response.json();
      return {
        exists: true,
        valid: true,
        url: data.html_url
      };
    }

    if (response.status === 401) {
      return {
        exists: false,
        valid: false,
        error: 'Invalid GitHub token. Please check your token and try again.'
      };
    }

    if (response.status === 403) {
      return {
        exists: false,
        valid: false,
        error: 'GitHub token does not have required permissions (repo scope).'
      };
    }

    // Other errors
    return {
      exists: false,
      valid: false,
      error: `GitHub API error: ${response.status} ${response.statusText}`
    };
  } catch (error) {
    // Network error
    return {
      exists: false,
      valid: false,
      error: `Network error: ${error.message}. Check your internet connection.`
    };
  }
}
```

### Owner Validation

```typescript
async function validateOwner(
  owner: string,
  token: string
): Promise<{ valid: boolean; type?: 'user' | 'org'; error?: string }> {
  try {
    // Try as user
    const userResponse = await fetch(
      `https://api.github.com/users/${owner}`,
      {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (userResponse.status === 200) {
      const data = await userResponse.json();
      return { valid: true, type: data.type === 'Organization' ? 'org' : 'user' };
    }

    if (userResponse.status === 404) {
      return {
        valid: false,
        error: `Owner "${owner}" not found. Please check the username/organization name.`
      };
    }

    if (userResponse.status === 401 || userResponse.status === 403) {
      return {
        valid: false,
        error: 'Invalid GitHub token or insufficient permissions.'
      };
    }

    return {
      valid: false,
      error: `GitHub API error: ${userResponse.status}`
    };
  } catch (error) {
    return {
      valid: false,
      error: `Network error: ${error.message}`
    };
  }
}
```

### Retry Logic

```typescript
async function validateWithRetry<T>(
  validateFn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await validateFn();
    } catch (error) {
      lastError = error;

      // Only retry on network errors
      if (error.code === 'ECONNRESET' ||
          error.code === 'ETIMEDOUT' ||
          error.code === 'ENOTFOUND') {
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`⚠️  Network error. Retrying in ${delay/1000}s... (${attempt}/${maxRetries})`);
          await sleep(delay);
          continue;
        }
      }

      // Don't retry on auth errors or 404s
      throw error;
    }
  }

  throw lastError!;
}
```

### Rate Limit Handling

```typescript
interface RateLimitInfo {
  limit: number;           // Max requests per hour
  remaining: number;       // Remaining requests
  reset: Date;             // Reset timestamp
}

async function checkRateLimit(token: string): Promise<RateLimitInfo> {
  const response = await fetch('https://api.github.com/rate_limit', {
    headers: { 'Authorization': `token ${token}` }
  });

  const data = await response.json();
  return {
    limit: data.rate.limit,
    remaining: data.rate.remaining,
    reset: new Date(data.rate.reset * 1000)
  };
}

async function validateWithRateLimitCheck(
  owner: string,
  repo: string,
  token: string
): Promise<ValidationResult> {
  // Check rate limit
  const rateLimit = await checkRateLimit(token);

  if (rateLimit.remaining < 10) {
    const resetIn = Math.ceil((rateLimit.reset.getTime() - Date.now()) / 1000 / 60);
    console.warn(`⚠️  GitHub API rate limit low (${rateLimit.remaining} remaining).`);
    console.warn(`   Resets in ${resetIn} minutes.`);

    if (rateLimit.remaining === 0) {
      return {
        exists: false,
        valid: false,
        error: `GitHub API rate limit exceeded. Try again in ${resetIn} minutes.`
      };
    }
  }

  // Proceed with validation
  return await validateRepository(owner, repo, token);
}
```

---

## Alternatives Considered

### Alternative 1: No Pre-Validation (Status Quo)

**Approach**: Attempt creation directly, handle errors

```typescript
// No validation, just try to create
await createRepository(owner, repo);
// Error: "Repository already exists" → confusing!
```

**Pros**:
- Simpler implementation (fewer API calls)
- Faster for new repositories

**Cons**:
- ❌ Poor UX (cryptic GitHub errors)
- ❌ Can't offer "use existing" option
- ❌ Wastes user time (discover errors late)
- ❌ No way to check owner validity

**Why Not**: UX is unacceptable

### Alternative 2: List All Repositories

**Approach**: Fetch all user's repos, check if name exists

```typescript
const repos = await listAllRepositories(owner);
const exists = repos.some(r => r.name === repo);
```

**Pros**:
- One API call for all repos
- Can suggest similar names

**Cons**:
- ❌ Slow for users with many repos (100+ repos)
- ❌ Doesn't work for other orgs (permission issues)
- ❌ Wastes API calls (need all repos just to check one)
- ❌ Pagination complexity

**Why Not**: Individual checks are faster and more reliable

### Alternative 3: Client-Side Validation Only

**Approach**: Validate format without GitHub API

```typescript
function validateRepoName(name: string): boolean {
  return /^[a-z0-9-_]+$/.test(name) && name.length <= 100;
}
```

**Pros**:
- No API calls
- Instant feedback
- No rate limit concerns

**Cons**:
- ❌ Can't check existence
- ❌ Can't validate owner
- ❌ Still get cryptic GitHub errors on creation
- ❌ No "use existing" option

**Why Not**: Doesn't solve the core problem

### Alternative 4: GraphQL API

**Approach**: Use GitHub GraphQL API instead of REST

```graphql
query {
  repository(owner: "myorg", name: "my-repo") {
    id
    url
  }
}
```

**Pros**:
- Single query for multiple checks
- More efficient data fetching
- Modern API

**Cons**:
- ❌ More complex implementation
- ❌ Less familiar to developers
- ❌ Same rate limits as REST
- ❌ Overkill for simple existence checks

**Why Not**: REST API is simpler and sufficient

---

## Consequences

### Positive

**User Experience**:
- ✅ Clear errors before GitHub API calls
- ✅ "Use existing" option if repo found
- ✅ Owner validation prevents typos
- ✅ Network errors retried automatically

**Error Handling**:
- ✅ Actionable error messages
- ✅ No cryptic GitHub API errors
- ✅ Clear resolution steps
- ✅ Rate limit awareness

**Reliability**:
- ✅ Retry on network failures (3 attempts)
- ✅ Exponential backoff prevents thundering herd
- ✅ Rate limit checking prevents quota exhaustion
- ✅ 95%+ success rate for validation

### Negative

**Performance**:
- ❌ Extra API call per repository (validation)
- ❌ 2 API calls per owner (user + org check)
- ❌ Slower setup (200-500ms per validation)
- ❌ Rate limit usage increased

**Complexity**:
- ❌ More code to maintain (~150 lines)
- ❌ Error handling for multiple API endpoints
- ❌ Retry logic complexity
- ❌ Rate limit tracking

**API Dependency**:
- ❌ Requires GitHub API access (internet)
- ❌ Fails if GitHub API is down
- ❌ Token must have correct permissions

### Neutral

**Cost**:
- API calls per setup: 3-5 (owner + repo validations)
- Rate limit impact: Low (5000/hour limit)
- Network bandwidth: <10KB per setup

---

## Implementation Details

### User Flow Integration

```typescript
async function promptForRepository(
  existingRepos: RepositoryConfig[],
  token: string
): Promise<RepositoryConfig> {
  // Step 1: Get owner
  const owner = await promptForOwner();

  // Step 2: Validate owner
  console.log('Validating owner...');
  const ownerValidation = await validateOwner(owner, token);

  if (!ownerValidation.valid) {
    console.error(`❌ ${ownerValidation.error}`);
    return promptForRepository(existingRepos, token); // Retry
  }

  console.log(`✓ Owner validated: ${owner} (${ownerValidation.type})`);

  // Step 3: Get repository name
  const repoName = await promptForRepoName();

  // Step 4: Validate repository
  console.log('Checking repository availability...');
  const repoValidation = await validateRepository(owner, repoName, token);

  if (!repoValidation.valid) {
    console.error(`❌ ${repoValidation.error}`);
    return promptForRepository(existingRepos, token); // Retry
  }

  if (repoValidation.exists) {
    // Repository exists - offer to use it
    console.log(`⚠️  Repository already exists: ${repoValidation.url}`);
    const useExisting = await promptUseExisting();

    if (useExisting) {
      return {
        id: generateRepoId(repoName),
        owner,
        repo: repoName,
        created: true,
        url: repoValidation.url
      };
    } else {
      return promptForRepository(existingRepos, token); // Retry with different name
    }
  }

  console.log('✓ Repository name available');

  // Continue with setup
  return {
    id: generateRepoId(repoName),
    owner,
    repo: repoName,
    created: false
  };
}
```

### Error Message Examples

**Invalid Token**:
```
❌ Invalid GitHub token. Please check your token and try again.

How to fix:
1. Visit https://github.com/settings/tokens
2. Create a new token with 'repo' scope
3. Copy the token and paste it when prompted
```

**Repository Exists**:
```
⚠️  Repository already exists: https://github.com/myorg/my-app

Options:
1. Use existing repository (will be cloned locally)
2. Enter a different repository name
3. Delete existing repository and create new one

What would you like to do? [1/2/3]
```

**Owner Not Found**:
```
❌ Owner "nonexistent-org" not found. Please check the username/organization name.

Common issues:
- Typo in username/org name (check GitHub)
- Organization requires membership (join first)
- Private user/org (verify access)
```

**Rate Limit Exceeded**:
```
❌ GitHub API rate limit exceeded. Try again in 15 minutes.

Rate limit status:
- Limit: 5000 requests/hour
- Remaining: 0
- Resets at: 2025-11-11 11:45:00

Tip: Authenticated requests have higher limits (5000/hour vs 60/hour)
```

---

## Performance Characteristics

| Operation | Time | API Calls | Rate Limit Impact |
|-----------|------|-----------|-------------------|
| Validate owner | 200-300ms | 1 | Low |
| Validate repository | 200-300ms | 1 | Low |
| Full setup (3 repos) | 1-2s | 5 | Very Low |
| Retry on failure | +2-8s | +1 per retry | Low |

**Total Overhead**: 1-2 seconds per setup (acceptable)

---

## Security Considerations

### Token Security

```typescript
// NEVER log tokens
async function validateRepository(owner, repo, token) {
  // ❌ WRONG: console.log(`Token: ${token}`)
  // ✅ CORRECT: console.log('Validating with token: [REDACTED]')
}

// Token storage
// - Store in .env file (permissions 0600)
// - Never commit to git (.gitignore enforcement)
// - Prompt user if missing
```

### API Scope Requirements

```typescript
// Minimum required scopes
const REQUIRED_SCOPES = ['repo']; // Full repo access

// Check token scopes
async function validateTokenScopes(token: string): Promise<boolean> {
  const response = await fetch('https://api.github.com/user', {
    headers: { 'Authorization': `token ${token}` }
  });

  const scopes = response.headers.get('X-OAuth-Scopes')?.split(', ') || [];
  return REQUIRED_SCOPES.every(scope => scopes.includes(scope));
}
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('GitHub Validator', () => {
  test('validates repository existence', async () => {
    nock('https://api.github.com')
      .get('/repos/myorg/my-repo')
      .reply(404);

    const result = await validateRepository('myorg', 'my-repo', 'token');
    expect(result.exists).toBe(false);
    expect(result.valid).toBe(true);
  });

  test('detects existing repository', async () => {
    nock('https://api.github.com')
      .get('/repos/myorg/my-repo')
      .reply(200, { html_url: 'https://github.com/myorg/my-repo' });

    const result = await validateRepository('myorg', 'my-repo', 'token');
    expect(result.exists).toBe(true);
    expect(result.url).toBe('https://github.com/myorg/my-repo');
  });

  test('handles invalid token', async () => {
    nock('https://api.github.com')
      .get('/repos/myorg/my-repo')
      .reply(401);

    const result = await validateRepository('myorg', 'my-repo', 'bad-token');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid GitHub token');
  });
});
```

### Integration Tests

```typescript
describe('Validation Flow', () => {
  test('validates owner before repository', async () => {
    const mockValidateOwner = jest.fn().mockResolvedValue({ valid: true });
    const mockValidateRepository = jest.fn().mockResolvedValue({ exists: false, valid: true });

    await setupFlow();

    expect(mockValidateOwner).toHaveBeenCalledBefore(mockValidateRepository);
  });

  test('retries on network failure', async () => {
    let attempts = 0;
    const mockValidate = jest.fn().mockImplementation(() => {
      attempts++;
      if (attempts < 3) {
        throw new Error('ECONNRESET');
      }
      return { exists: false, valid: true };
    });

    const result = await validateWithRetry(mockValidate, 3);
    expect(result.valid).toBe(true);
    expect(attempts).toBe(3);
  });
});
```

---

## Related Decisions

- **ADR-0023**: Multi-Repo Initialization UX Architecture (parent ADR)
- **ADR-0025**: Setup State Persistence Design (state saved after validation)
- **ADR-0028**: .env File Generation Strategy (token used for validation)

---

## References

**GitHub API Documentation**:
- GET /repos/{owner}/{repo}: https://docs.github.com/en/rest/repos/repos#get-a-repository
- GET /users/{username}: https://docs.github.com/en/rest/users/users#get-a-user
- GET /orgs/{org}: https://docs.github.com/en/rest/orgs/orgs#get-an-organization
- GET /rate_limit: https://docs.github.com/en/rest/rate-limit

**Implementation Files**:
- `src/core/repo-structure/github-validator.ts`
- `src/cli/helpers/issue-tracker/github-multi-repo.ts`

**User Stories**:
- US-004: GitHub Repository Existence Validation
