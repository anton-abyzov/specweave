---
id: US-003
title: "Idempotency via Caching"
feature: FS-049
project: specweave
type: user-story
status: proposed
priority: P0
created: 2025-11-22
external_tools:
  github:
    type: issue
    number: 718
    url: https://github.com/anton-abyzov/specweave/issues/718
---

# US-003: Idempotency via Caching

**Feature**: [FS-049: Automatic GitHub Sync with Permission Gates](../../../_features/FS-049/FEATURE.md)

## User Story

**As a** SpecWeave user
**I want** to re-run sync without creating duplicate GitHub issues
**So that** I can safely retry failed syncs without polluting the issue tracker

## Context

**Problem**: If sync fails mid-operation (network error, rate limit), re-running creates duplicate issues.

**Example Failure Scenario**:
1. Sync creates issues for US-001, US-002
2. Network fails before US-003, US-004
3. User re-runs `/specweave-github:sync FS-049`
4. **Without idempotency**: Creates duplicate US-001, US-002 (4 duplicates total)
5. **With idempotency**: Skips US-001, US-002, creates US-003, US-004 (zero duplicates)

**Existing Architecture**:
- SpecWeave already has `DuplicateDetector` (3-phase: Detection → Verification → Reflection)
- Living docs frontmatter stores `external_tools.github.number`
- Increment metadata.json stores `github.issue` field

## Acceptance Criteria

- [ ] **AC-US3-01**: Before creating issue, check User Story frontmatter for existing `github.number`
  - **Priority**: P0
  - **Testable**: Yes (unit test)
  - **Verification**: If `github.number: 42` exists, skip creation

- [ ] **AC-US3-02**: If frontmatter missing, query GitHub API to detect duplicates
  - **Priority**: P0
  - **Testable**: Yes (integration test with GitHub API mock)
  - **Verification**: Search for `[FS-049][US-001]` in repo issues

- [ ] **AC-US3-03**: Use `DuplicateDetector.createWithProtection()` for GitHub queries
  - **Priority**: P0
  - **Testable**: Yes
  - **Verification**: Verify `--limit 50` used (not `--limit 1` which hides duplicates)

- [ ] **AC-US3-04**: After issue created, update User Story frontmatter with issue number
  - **Priority**: P0
  - **Testable**: Yes
  - **Verification**: Check `us-001-*.md` frontmatter has `github.number: 123`

- [ ] **AC-US3-05**: After all issues created, update increment `metadata.json` with issue list
  - **Priority**: P0
  - **Testable**: Yes
  - **Verification**:
    ```json
    {
      "github": {
        "issues": [
          { "userStory": "US-001", "number": 123, "url": "..." },
          { "userStory": "US-002", "number": 124, "url": "..." }
        ]
      }
    }
    ```

- [ ] **AC-US3-06**: Re-running sync skips existing issues and reports: "Skipped 2 existing, created 2 new"
  - **Priority**: P1
  - **Testable**: Yes
  - **Verification**: Check CLI output on second sync run

## Implementation Notes

**Idempotency Check (Pseudocode)**:
```typescript
async createUserStoryIssue(us: UserStory): Promise<GitHubIssue | null> {
  // STEP 1: Check User Story frontmatter (fastest)
  if (us.external_tools?.github?.number) {
    this.logger.log(`  ⏭️  Issue #${us.external_tools.github.number} already exists (cached)`);
    return null; // Skip creation
  }

  // STEP 2: Query GitHub API (slower, but catches edge cases)
  const existingIssue = await DuplicateDetector.createWithProtection(
    this.client,
    {
      query: `repo:${owner}/${repo} in:title [FS-049][US-001]`,
      limit: 50 // CRITICAL: Use 50, not 1 (prevents hiding duplicates)
    }
  );

  if (existingIssue) {
    this.logger.log(`  ⏭️  Issue #${existingIssue.number} already exists (API)`);

    // Update frontmatter with discovered issue number (cache for future)
    await this.updateUserStoryFrontmatter(us.id, {
      'external_tools.github.number': existingIssue.number,
      'external_tools.github.url': existingIssue.url
    });

    return null; // Skip creation
  }

  // STEP 3: No duplicate found → create issue
  const issue = await this.client.createIssue({
    title: `[FS-049][${us.id}] ${us.title}`,
    body: formatUserStoryBody(us),
    labels: ['feature', 'user-story'],
    milestone: await getMilestoneForFeature('FS-049')
  });

  this.logger.log(`  ✅ Created issue #${issue.number}`);

  // STEP 4: Update frontmatter (cache for idempotency)
  await this.updateUserStoryFrontmatter(us.id, {
    'external_tools.github.number': issue.number,
    'external_tools.github.url': issue.url
  });

  return issue;
}
```

**Post-Sync Metadata Update**:
```typescript
async updateIncrementMetadata(incrementId: string, issues: GitHubIssue[]) {
  const metadataPath = `.specweave/increments/${incrementId}/metadata.json`;
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

  metadata.github = {
    issues: issues.map(i => ({
      userStory: i.userStory,
      number: i.number,
      url: i.url,
      createdAt: i.createdAt
    })),
    lastSync: new Date().toISOString()
  };

  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
}
```

## Test Strategy

**Unit Tests**:
- Frontmatter check (cached issue number)
- GitHub API query (duplicate detection)
- Frontmatter update after creation

**Integration Tests**:
- First sync: Creates 4 issues
- Second sync: Skips 4 issues (zero duplicates)
- Partial failure: Creates 2, fails 2, re-run completes 2

**E2E Tests**:
- Verify no duplicates in real GitHub repo
- Check frontmatter updated correctly
- Verify metadata.json accuracy

## Edge Cases

**Edge Case 1: Frontmatter Corrupted**
- **Scenario**: User Story frontmatter has invalid YAML
- **Expected**: Fall back to GitHub API query
- **Rationale**: Defensive programming

**Edge Case 2: Issue Manually Deleted**
- **Scenario**: User manually deletes GitHub issue #123, but frontmatter still references it
- **Expected**: Detect via API query (issue not found), create new issue
- **Rationale**: GitHub API is source of truth

**Edge Case 3: Multiple Increments for Same Feature**
- **Scenario**: 0051 and 0052 both implement FS-049 User Stories
- **Expected**: First increment creates issues, second skips (idempotent)
- **Rationale**: Feature-level caching prevents cross-increment duplicates

## Caching Layers

**Layer 1: User Story Frontmatter** (fastest, permanent)
```yaml
---
id: US-001
external_tools:
  github:
    number: 123
    url: https://github.com/owner/repo/issues/123
---
```

**Layer 2: Increment Metadata** (fast, increment-scoped)
```json
{
  "github": {
    "issues": [
      { "userStory": "US-001", "number": 123 }
    ]
  }
}
```

**Layer 3: GitHub API Query** (slow, authoritative)
```bash
gh issue list --repo owner/repo --search "in:title [FS-049][US-001]" --limit 50
```

## Related Stories

- [US-001: Automatic Issue Creation](./us-001-auto-issue-creation.md) - Uses idempotency checks
- [US-004: Error Isolation](./us-004-error-isolation.md) - Retry after failures

## External Tool Links

- **GitHub Issue**: (To be created)

---

**Status**: Proposed
**Implementation**: Planned for 0051-automatic-github-sync
