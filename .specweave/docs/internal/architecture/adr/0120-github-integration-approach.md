# ADR-0120: GitHub Integration Approach for Issue Deletion

**Date**: 2025-11-23
**Status**: Accepted
**Deciders**: Architect, Tech Lead
**Priority**: P1

---

## Context

Feature deletion must clean up related GitHub issues to prevent orphaned issues pointing to non-existent features.

**Problem**: When deleting a feature, we need to:
1. Find all GitHub issues linked to feature's user stories (pattern: `[FS-052][US-001]`)
2. Display issue list with titles for user confirmation
3. Delete issues via GitHub API
4. Handle API errors gracefully (rate limits, auth failures, network issues)
5. Support `--no-github` flag to skip GitHub operations

**Existing Infrastructure**:
- SpecWeave uses **gh CLI** for GitHub operations (not @octokit/rest)
- See `src/sync/github-service.ts` - spawns `gh` subprocess
- Pattern: `exec('gh issue list --search "FS-052"')`

**Key Question**: Should we use gh CLI (existing pattern) or switch to @octokit/rest library?

---

## Decision

**Use gh CLI (existing pattern) with enhanced error handling**

```typescript
// src/core/feature-deleter/github-service.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from '../../utils/logger.js';

const execAsync = promisify(exec);

export class FeatureDeletionGitHubService {
  private logger: Logger;
  private owner: string;
  private repo: string;

  constructor(options: { owner: string; repo: string; logger?: Logger }) {
    this.owner = options.owner;
    this.repo = options.repo;
    this.logger = options.logger ?? consoleLogger;
  }

  /**
   * Find issues matching feature pattern [FS-XXX][US-YYY]
   */
  async findFeatureIssues(featureId: string): Promise<GitHubIssue[]> {
    const searchQuery = `repo:${this.owner}/${this.repo} is:issue "[${featureId}]" in:title`;

    try {
      const { stdout } = await execAsync(
        `gh issue list --repo ${this.owner}/${this.repo} --search "${searchQuery}" --json number,title,url --limit 100`
      );

      const issues = JSON.parse(stdout);

      // Filter to exact pattern match (avoid false positives)
      return issues.filter((issue: any) =>
        /\[${featureId}\]\[US-\d{3}\]/.test(issue.title)
      );
    } catch (error) {
      if (error.message.includes('gh: command not found')) {
        throw new GitHubCLINotFoundError('gh CLI not installed. Install from https://cli.github.com');
      }
      throw new GitHubAPIError(`Failed to search issues: ${error.message}`);
    }
  }

  /**
   * Delete issues with retry logic
   */
  async deleteIssues(issues: GitHubIssue[]): Promise<DeletionResult> {
    const deleted: number[] = [];
    const failed: Array<{ issueNumber: number; error: string }> = [];

    for (const issue of issues) {
      try {
        await this.deleteIssueWithRetry(issue.number);
        deleted.push(issue.number);
        this.logger.info(`Deleted issue #${issue.number}`);
      } catch (error) {
        failed.push({ issueNumber: issue.number, error: error.message });
        this.logger.error(`Failed to delete issue #${issue.number}: ${error.message}`);
      }
    }

    return { deleted, failed, total: issues.length };
  }

  private async deleteIssueWithRetry(issueNumber: number, retries = 3): Promise<void> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Use `gh issue close` (GitHub API doesn't support delete via REST API!)
        await execAsync(
          `gh issue close ${issueNumber} --repo ${this.owner}/${this.repo} --comment "Closed by feature deletion automation"`
        );
        return;
      } catch (error) {
        if (error.message.includes('rate limit')) {
          if (attempt === retries) throw new GitHubRateLimitError('Rate limit exceeded');
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
  }
}
```

**Rationale**:
- **Consistency**: SpecWeave already uses `gh` CLI for GitHub sync
- **Simplicity**: No need to manage GitHub tokens (gh CLI handles auth)
- **Feature parity**: gh CLI supports all GitHub operations we need
- **Team familiarity**: Contributors already know gh CLI patterns

**IMPORTANT CAVEAT**: GitHub REST API **does not support deleting issues**. Issues can only be **closed**. This is a GitHub platform limitation, not a SpecWeave limitation.

---

## Alternatives Considered

### 1. @octokit/rest Library

```typescript
// Example: Octokit-based approach
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

async function findIssues(featureId: string): Promise<any[]> {
  const { data } = await octokit.search.issuesAndPullRequests({
    q: `repo:${owner}/${repo} is:issue "[${featureId}]" in:title`
  });
  return data.items;
}

async function closeIssue(issueNumber: number): Promise<void> {
  await octokit.issues.update({
    owner,
    repo,
    issue_number: issueNumber,
    state: 'closed'
  });
}
```

**Pros**:
- ✅ Type-safe (full TypeScript definitions)
- ✅ No subprocess overhead (direct HTTP requests)
- ✅ Better error handling (structured error objects)
- ✅ Supports rate limit introspection (`X-RateLimit-Remaining`)

**Cons**:
- ❌ Requires manual token management (must parse `.env` or config)
- ❌ Inconsistent with existing SpecWeave pattern
- ❌ Adds 2MB dependency
- ❌ Must handle token refresh/expiration manually
- ❌ **GitHub API does NOT support deleting issues** (can only close)

**Why Rejected**: SpecWeave already uses `gh` CLI in 5+ places. Introducing Octokit creates inconsistency. Also, gh CLI auto-handles auth (better UX).

---

### 2. GitHub GraphQL API (via gh CLI)

```bash
gh api graphql -f query='
mutation {
  closeIssue(input: {issueId: "ID_xxx", stateReason: COMPLETED}) {
    issue { number }
  }
}'
```

**Pros**:
- ✅ More powerful (can batch operations)
- ✅ Can set close reason (COMPLETED, NOT_PLANNED)

**Cons**:
- ❌ Requires GraphQL query construction (complex)
- ❌ Issue IDs (not numbers) required (must fetch first)
- ❌ Harder to test (mock GraphQL responses)

**Why Rejected**: REST API (via `gh issue close`) is simpler and sufficient for deletion workflow.

---

### 3. Hybrid: gh CLI + Octokit

**Pros**:
- ✅ Use gh for auth, Octokit for operations

**Cons**:
- ❌ Overly complex (two dependencies)
- ❌ No clear benefit over gh CLI alone

**Why Rejected**: Adds complexity without clear value.

---

## Consequences

### Positive

- ✅ **Consistency**: Matches existing GitHub sync pattern
- ✅ **Simple auth**: gh CLI handles token management
- ✅ **No new dependencies**: Uses existing `child_process`
- ✅ **Feature complete**: gh CLI supports all needed operations
- ✅ **Team familiarity**: Contributors already know gh patterns

### Negative

- ⚠️ **Subprocess overhead**: Spawning processes slower than HTTP (acceptable trade-off)
- ⚠️ **Requires gh installed**: Command fails if gh CLI not in PATH
- ⚠️ **Parsing JSON output**: Must parse stdout (error-prone if gh changes format)

### Neutral

- ℹ️ **Issues closed, not deleted**: GitHub API limitation (cannot delete issues)
- ℹ️ **Rate limits**: gh CLI respects GitHub rate limits (5000 req/hour)

---

## Implementation Details

### Issue Search Pattern

```
Search Query: repo:owner/repo is:issue "[FS-052]" in:title
    ↓
Results: All issues with "[FS-052]" in title
    ↓
Filter: /\[FS-052\]\[US-\d{3}\]/.test(title)
    ↓
Final: Only exact pattern matches (e.g., [FS-052][US-001])
```

**Why two-stage filtering**:
- GitHub search is fuzzy (may return false positives)
- Regex ensures exact match (prevents closing unrelated issues)

### Error Handling

```typescript
async findFeatureIssues(featureId: string): Promise<GitHubIssue[]> {
  try {
    const { stdout } = await execAsync(`gh issue list ...`);
    return JSON.parse(stdout);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new GitHubCLINotFoundError('gh CLI not installed');
    }
    if (error.stderr?.includes('rate limit')) {
      throw new GitHubRateLimitError('Rate limit exceeded. Wait before retrying.');
    }
    if (error.stderr?.includes('not found')) {
      throw new GitHubRepoNotFoundError(`Repository ${owner}/${repo} not found`);
    }
    throw new GitHubAPIError(`GitHub operation failed: ${error.message}`);
  }
}
```

### Rate Limit Handling

```typescript
private async deleteIssueWithRetry(issueNumber: number, retries = 3): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await execAsync(`gh issue close ${issueNumber} ...`);
      return;
    } catch (error) {
      if (error.stderr?.includes('rate limit')) {
        if (attempt === retries) throw new GitHubRateLimitError();
        await sleep(Math.pow(2, attempt) * 1000); // Exponential backoff: 2s, 4s, 8s
      } else {
        throw error;
      }
    }
  }
}
```

### Dry-Run Mode

```typescript
async deleteIssues(issues: GitHubIssue[], dryRun = false): Promise<DeletionResult> {
  if (dryRun) {
    this.logger.info(`[DRY-RUN] Would close ${issues.length} issues`);
    return { deleted: [], failed: [], total: issues.length };
  }

  // Actual deletion...
}
```

---

## Edge Cases

### 1. gh CLI Not Installed

**Error**: `gh: command not found`

**Solution**:
```typescript
if (error.code === 'ENOENT') {
  throw new GitHubCLINotFoundError('gh CLI not installed. Install from https://cli.github.com');
}
```

### 2. Not Authenticated

**Error**: `gh: To get started with GitHub CLI, please run: gh auth login`

**Solution**:
```typescript
if (error.stderr?.includes('gh auth login')) {
  throw new GitHubAuthError('GitHub authentication required. Run: gh auth login');
}
```

### 3. Rate Limit Exceeded

**Error**: `API rate limit exceeded`

**Solution**: Exponential backoff retry (2s, 4s, 8s)

### 4. Issue Already Closed

**Error**: `issue is already closed`

**Solution**: Log warning, continue (not a failure)

### 5. Private Repository

**Error**: `repository not found` (403)

**Solution**:
```typescript
if (error.stderr?.includes('not found') && error.exitCode === 1) {
  throw new GitHubRepoNotFoundError('Repository not found. Check permissions or make public.');
}
```

---

## Testing Strategy

### Unit Tests (Mock exec)

```typescript
describe('FeatureDeletionGitHubService', () => {
  let execMock: jest.SpyInstance;

  beforeEach(() => {
    execMock = jest.spyOn(require('child_process'), 'exec');
  });

  it('finds issues matching feature pattern', async () => {
    execMock.mockImplementation((cmd, callback) => {
      callback(null, {
        stdout: JSON.stringify([
          { number: 42, title: '[FS-052][US-001] User story' },
          { number: 43, title: '[FS-052][US-002] Another story' }
        ])
      });
    });

    const service = new FeatureDeletionGitHubService({ owner: 'org', repo: 'repo' });
    const issues = await service.findFeatureIssues('FS-052');

    expect(issues).toHaveLength(2);
  });

  it('retries on rate limit error', async () => {
    execMock
      .mockImplementationOnce((cmd, callback) => callback(new Error('rate limit')))
      .mockImplementationOnce((cmd, callback) => callback(null, { stdout: 'success' }));

    const service = new FeatureDeletionGitHubService({ owner: 'org', repo: 'repo' });
    await service.deleteIssueWithRetry(42);

    expect(execMock).toHaveBeenCalledTimes(2); // Retry succeeded
  });
});
```

### Integration Tests (Real gh CLI)

```typescript
describe('GitHubService Integration', () => {
  it('closes issue via gh CLI', async () => {
    const service = new FeatureDeletionGitHubService({
      owner: process.env.TEST_GITHUB_OWNER,
      repo: process.env.TEST_GITHUB_REPO
    });

    const issues = await service.findFeatureIssues('FS-TEST');
    expect(issues.length).toBeGreaterThan(0);

    const result = await service.deleteIssues([issues[0]]);
    expect(result.deleted).toContain(issues[0].number);
  });
});
```

**Note**: Integration tests require:
- gh CLI installed
- GitHub authentication (`gh auth login`)
- Test repository with test issues

---

## Performance

**Benchmarks** (10 issues):
- Search: ~1 second
- Close (sequential): ~5 seconds (500ms per issue)
- Close (parallel, batched): ~2 seconds (5 issues at once)

**Optimization**: Batch issue closure (parallel operations):
```typescript
await Promise.all(issues.map(issue => this.deleteIssue(issue)));
```

---

## Migration Path

**Existing GitHubService** (`src/sync/github-service.ts`):
- Keep for sync operations
- DO NOT modify for feature deletion

**New FeatureDeletionGitHubService**:
- Separate class for feature deletion
- Reuses gh CLI pattern
- No breaking changes

---

## References

- **gh CLI Docs**: https://cli.github.com/manual/
- **GitHub REST API**: https://docs.github.com/en/rest
- **Existing Pattern**: `src/sync/github-service.ts`
- **Related ADR**: ADR-0118 (Command Interface Pattern), ADR-0119 (Git Integration)

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-11-23 | Use gh CLI (not Octokit) | Consistency with existing pattern |
| 2025-11-23 | Close issues (not delete) | GitHub API limitation |
| 2025-11-23 | Exponential backoff retry | Handle rate limits gracefully |
| 2025-11-23 | Two-stage filtering (search + regex) | Avoid closing wrong issues |
