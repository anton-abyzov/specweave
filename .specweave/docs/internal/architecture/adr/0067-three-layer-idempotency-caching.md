<!-- ⚠️ AUTO-TRANSLATION PENDING -->
<!-- Set ANTHROPIC_API_KEY for automatic translation -->
<!-- Or run: /specweave:translate to complete -->
<!-- Original content below -->

<!-- ⚠️ AUTO-TRANSLATION PENDING -->
<!-- Set ANTHROPIC_API_KEY for automatic translation -->
<!-- Or run: /specweave:translate to complete -->
<!-- Original content below -->

# ADR-0067: Three-Layer Idempotency Caching Strategy

**Date**: 2025-11-22
**Status**: Accepted
**Priority**: P0 (Critical - Prevents duplicate issues)

## Context

Automatic GitHub sync on increment completion introduces a critical risk: **duplicate issue creation** when sync fails mid-operation.

### Failure Scenario

```
Sync creates issues for US-001, US-002
    ↓
Network fails before US-003, US-004
    ↓
User re-runs: /specweave-github:sync FS-049
    ↓
WITHOUT IDEMPOTENCY: Creates duplicates:
  - Issue #101: [FS-049][US-001] (original)
  - Issue #105: [FS-049][US-001] (duplicate) ❌
  - Issue #106: [FS-049][US-002] (duplicate) ❌
  - Issue #107: [FS-049][US-003] (new)
  - Issue #108: [FS-049][US-004] (new)
Result: 4 duplicates pollute issue tracker!
```

### Current Architecture

SpecWeave **already has** `DuplicateDetector` (3-phase: Detection → Verification → Reflection), but it's used in *brownfield imports* only, not in *automatic sync*.

**Existing Pattern** (brownfield imports):
```typescript
// Checks GitHub API for duplicates before creating
const existingIssue = await DuplicateDetector.createWithProtection(
  client,
  { query: `repo:${owner}/${repo} in:title [FS-049][US-001]`, limit: 50 }
);

if (existingIssue) {
  console.log(`Issue #${existingIssue.number} already exists`);
  return; // Skip creation
}

// Create issue
const issue = await client.createIssue({ title, body, labels });
```

**Problem**: This pattern only uses **GitHub API** (Layer 3). It doesn't cache results in frontmatter/metadata, causing **unnecessary API calls** on every sync.

## Decision

We will implement a **Three-Layer Idempotency Caching Strategy** to prevent duplicate issues while minimizing GitHub API usage.

### Architecture: 3-Layer Caching

```
┌──────────────────────────────────────────────────────────────┐
│ Layer 1: User Story Frontmatter (Fastest, Permanent)        │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ external_tools:                                          │ │
│ │   github:                                                │ │
│ │     number: 123                                          │ │
│ │     url: https://github.com/owner/repo/issues/123        │ │
│ └──────────────────────────────────────────────────────────┘ │
│ Cache Duration: Permanent (committed to git)                │
│ Check Time: < 1ms (file read)                               │
└──────────────────────────────────────────────────────────────┘
                         ↓ (if missing)
┌──────────────────────────────────────────────────────────────┐
│ Layer 2: Increment Metadata (Fast, Increment-Scoped)        │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ metadata.json:                                           │ │
│ │   github:                                                │ │
│ │     issues: [                                            │ │
│ │       { userStory: "US-001", number: 123, url: "..." }   │ │
│ │       { userStory: "US-002", number: 124, url: "..." }   │ │
│ │     ]                                                    │ │
│ │     lastSync: "2025-11-22T10:30:00Z"                     │ │
│ └──────────────────────────────────────────────────────────┘ │
│ Cache Duration: Permanent (committed to git)                │
│ Check Time: < 5ms (JSON parse)                              │
└──────────────────────────────────────────────────────────────┘
                         ↓ (if missing)
┌──────────────────────────────────────────────────────────────┐
│ Layer 3: GitHub API Query (Slow, Authoritative)             │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ gh issue list --repo owner/repo                          │ │
│ │   --search "in:title [FS-049][US-001]"                   │ │
│ │   --limit 50                                             │ │
│ └──────────────────────────────────────────────────────────┘ │
│ Cache Duration: N/A (real-time query)                       │
│ Check Time: 500-2000ms (API latency)                        │
└──────────────────────────────────────────────────────────────┘
```

### Implementation Flow

```typescript
async createOrSkipUserStoryIssue(
  client: GitHubClientV2,
  us: LivingDocsUSFile
): Promise<GitHubIssue | null> {

  // ============================================================
  // LAYER 1: Check User Story Frontmatter (Fastest)
  // ============================================================
  if (us.external_tools?.github?.number) {
    this.logger.log(`  ⏭️  Issue #${us.external_tools.github.number} already exists (cached in frontmatter)`);
    return null; // Skip creation (cached)
  }

  // ============================================================
  // LAYER 2: Check Increment Metadata (Fast)
  // ============================================================
  const metadataIssue = await this.findIssueInMetadata(us.id);
  if (metadataIssue) {
    this.logger.log(`  ⏭️  Issue #${metadataIssue.number} already exists (cached in metadata.json)`);

    // Backfill Layer 1 (frontmatter) for future syncs
    await this.updateUserStoryFrontmatter(us.id, {
      'external_tools.github.number': metadataIssue.number,
      'external_tools.github.url': metadataIssue.url
    });

    return null; // Skip creation (cached)
  }

  // ============================================================
  // LAYER 3: Query GitHub API (Slow, Authoritative)
  // ============================================================
  const title = `[${us.feature}][${us.id}] ${us.title}`;

  // Use DuplicateDetector with protection (--limit 50, NOT 1)
  const existingIssue = await DuplicateDetector.createWithProtection(
    client,
    {
      query: `repo:${this.owner}/${this.repo} in:title "${title}"`,
      limit: 50 // CRITICAL: Use 50, not 1 (prevents hiding duplicates)
    }
  );

  if (existingIssue) {
    this.logger.log(`  ⏭️  Issue #${existingIssue.number} already exists (found via API)`);

    // Backfill Layer 1 (frontmatter) and Layer 2 (metadata)
    await this.updateUserStoryFrontmatter(us.id, {
      'external_tools.github.number': existingIssue.number,
      'external_tools.github.url': existingIssue.url
    });

    await this.updateIncrementMetadata({
      userStory: us.id,
      issue: {
        number: existingIssue.number,
        url: existingIssue.url,
        discoveredAt: new Date().toISOString()
      }
    });

    return null; // Skip creation (found via API)
  }

  // ============================================================
  // CREATE ISSUE (No duplicates found in all 3 layers)
  // ============================================================
  const issue = await client.createUserStoryIssue({
    featureId: us.feature,
    userStoryId: us.id,
    title: us.title,
    body: this.formatUserStoryBody(us),
    labels: ['feature', 'user-story'],
    milestone: await this.getMilestoneForFeature(us.feature)
  });

  this.logger.log(`  ✅ Created issue #${issue.number}`);

  // ============================================================
  // UPDATE ALL CACHES (Idempotency for future syncs)
  // ============================================================

  // Layer 1: Update frontmatter
  await this.updateUserStoryFrontmatter(us.id, {
    'external_tools.github.number': issue.number,
    'external_tools.github.url': issue.url
  });

  // Layer 2: Update metadata.json
  await this.updateIncrementMetadata({
    userStory: us.id,
    issue: {
      number: issue.number,
      url: issue.url,
      createdAt: new Date().toISOString()
    }
  });

  return issue;
}
```

### Cache Backfilling Strategy

**Problem**: User Story frontmatter might be missing `github.number` even if issue exists.

**Solution**: When discovering existing issue via Layer 2 or Layer 3, **backfill Layer 1** (frontmatter).

**Benefits**:
- ✅ Future syncs skip API calls (use frontmatter cache)
- ✅ Gradual cache warming (frontmatter populated over time)
- ✅ Manual issue creation detected (API query discovers manually created issues)

### Layer Comparison

| Layer | Location | Speed | Scope | TTL | Source of Truth |
|-------|----------|-------|-------|-----|-----------------|
| **Layer 1** | User Story frontmatter | < 1ms | Global (all increments) | Permanent | Yes ✅ |
| **Layer 2** | Increment metadata.json | < 5ms | Increment-scoped | Permanent | No (audit log) |
| **Layer 3** | GitHub API | 500-2000ms | Repository-wide | Real-time | Yes ✅ |

**Primary Source of Truth**: **Layer 1** (frontmatter) + **Layer 3** (GitHub API)

**Layer 2 Purpose**: Audit trail + fast lookup for increment-scoped queries

## Alternatives Considered

### Alternative 1: GitHub API Only (No Caching) - Rejected

**Approach**: Query GitHub API on every sync (existing `DuplicateDetector` pattern)

**Pros**:
- ✅ Always authoritative (real-time GitHub state)
- ✅ Simple implementation

**Cons**:
- ❌ **Slow** (500-2000ms per User Story)
- ❌ **API rate limit exhaustion** (5000 req/hour shared across team)
- ❌ **Unnecessary API calls** (90%+ of syncs have cached issues)

**Decision**: Rejected (performance + rate limit concerns)

### Alternative 2: Frontmatter Only (No API Fallback) - Rejected

**Approach**: Only check User Story frontmatter, no API query

**Pros**:
- ✅ Fastest (< 1ms)
- ✅ Zero API calls

**Cons**:
- ❌ **Can't detect manually created issues** (users manually create `[FS-049][US-001]` issue, frontmatter missing)
- ❌ **No recovery from frontmatter corruption** (YAML parse errors)
- ❌ **Can't detect deleted issues** (issue deleted manually, frontmatter stale)

**Decision**: Rejected (too fragile)

### Alternative 3: Two-Layer (Frontmatter + API) - Considered

**Approach**: Skip Layer 2 (metadata.json)

**Pros**:
- ✅ Simpler (one less cache layer)
- ✅ Still fast (frontmatter cache)

**Cons**:
- ❌ **No audit trail** (can't see which issues created in which increment)
- ❌ **No increment-scoped lookup** (can't query "which issues created in 0051?")

**Decision**: Rejected (Layer 2 provides valuable audit trail)

### Alternative 4: Three-Layer with Backfilling (SELECTED) ⭐

**Approach**: Frontmatter → Metadata → API, with cache backfilling

**Pros**:
- ✅ **Fast** (< 1ms for 90%+ of syncs via frontmatter)
- ✅ **Authoritative** (API fallback for edge cases)
- ✅ **Gradual cache warming** (frontmatter backfilled on discovery)
- ✅ **Audit trail** (metadata.json tracks all issues)
- ✅ **Recovery from corruption** (API query as ultimate fallback)

**Cons**:
- ❌ More complexity (3 layers vs 1)
- ❌ Cache consistency challenges (frontmatter vs metadata vs API)

**Decision**: **Accepted** (pros outweigh complexity)

## Consequences

### Positive

1. **✅ 100% Idempotency**: Re-running sync creates zero duplicates
2. **✅ Fast** (< 1ms for 90%+ of syncs via frontmatter cache)
3. **✅ Resilient**: API fallback for corrupted frontmatter, manually created issues
4. **✅ Audit Trail**: `metadata.json` tracks all issues created per increment
5. **✅ Gradual Cache Warming**: Frontmatter backfilled when issues discovered
6. **✅ Rate Limit Friendly**: Minimizes GitHub API calls (only on cache miss)

### Negative

1. **❌ Complexity**: 3 cache layers vs simple API query
2. **❌ Cache Consistency**: Frontmatter, metadata, and GitHub must stay in sync
3. **❌ Stale Cache Risk**: Manually deleted issues not detected until API query

### Neutral

1. **Cache Invalidation**: Permanent caches (frontmatter, metadata) never expire
2. **Manual Issue Deletion**: Rare (user manually deletes `[FS-049][US-001]` issue)

## Cache Invalidation Strategy

### Automatic Invalidation (NOT IMPLEMENTED)

**Approach**: Webhook-based cache invalidation
```
GitHub webhook → Issue deleted event → Clear frontmatter cache
```

**Decision**: Deferred to v0.26.0+ (too complex for MVP)

### Manual Invalidation (v0.25.0)

**Approach**: User manually clears cache if needed
```bash
# Clear frontmatter cache for User Story
Edit: .specweave/docs/internal/specs/specweave/FS-049/us-001-*.md
Remove: external_tools.github.number field

# Clear metadata cache for increment
Edit: .specweave/increments/_archive/0051-*/metadata.json
Remove: github.issues array

# Re-run sync (will query API)
/specweave-github:sync FS-049
```

**Use Case**: User manually deleted GitHub issue, wants to recreate it

### Self-Healing on API Query

**Approach**: When API query discovers issue, backfill frontmatter + metadata

**Benefit**: Automatic cache repair on next sync

## Testing Strategy

### Unit Tests

```typescript
describe('Three-Layer Idempotency Caching', () => {
  it('Layer 1: Skips creation if frontmatter has github.number', async () => {
    const us = { external_tools: { github: { number: 123 } } };
    const issue = await coordinator.createOrSkipUserStoryIssue(client, us);
    expect(issue).toBeNull();
    expect(mockAPI.createIssue).not.toHaveBeenCalled();
  });

  it('Layer 2: Skips creation if metadata.json has issue', async () => {
    const metadata = { github: { issues: [{ userStory: 'US-001', number: 123 }] } };
    mockFS.readJSON.mockResolvedValue(metadata);
    const issue = await coordinator.createOrSkipUserStoryIssue(client, us);
    expect(issue).toBeNull();
    expect(mockAPI.createIssue).not.toHaveBeenCalled();
  });

  it('Layer 3: Queries API if frontmatter and metadata missing', async () => {
    mockAPI.findIssueByTitle.mockResolvedValue({ number: 123 });
    const issue = await coordinator.createOrSkipUserStoryIssue(client, us);
    expect(issue).toBeNull();
    expect(mockAPI.createIssue).not.toHaveBeenCalled();
    expect(mockAPI.findIssueByTitle).toHaveBeenCalledTimes(1);
  });

  it('Creates issue only if all 3 layers miss', async () => {
    mockAPI.findIssueByTitle.mockResolvedValue(null); // Layer 3 miss
    const issue = await coordinator.createOrSkipUserStoryIssue(client, us);
    expect(issue).not.toBeNull();
    expect(mockAPI.createIssue).toHaveBeenCalledTimes(1);
  });

  it('Backfills frontmatter when issue discovered in Layer 2', async () => {
    const metadata = { github: { issues: [{ userStory: 'US-001', number: 123 }] } };
    mockFS.readJSON.mockResolvedValue(metadata);
    await coordinator.createOrSkipUserStoryIssue(client, us);
    expect(mockFS.updateFrontmatter).toHaveBeenCalledWith(
      expect.objectContaining({ 'external_tools.github.number': 123 })
    );
  });

  it('Backfills frontmatter and metadata when issue discovered in Layer 3', async () => {
    mockAPI.findIssueByTitle.mockResolvedValue({ number: 123 });
    await coordinator.createOrSkipUserStoryIssue(client, us);
    expect(mockFS.updateFrontmatter).toHaveBeenCalledTimes(1);
    expect(mockFS.updateMetadata).toHaveBeenCalledTimes(1);
  });
});
```

### Integration Tests

```typescript
describe('Idempotency Integration Tests', () => {
  it('First sync: Creates 4 issues', async () => {
    const result = await coordinator.syncIncrementCompletion();
    expect(result.userStoriesSynced).toBe(4);
    expect(mockAPI.createIssue).toHaveBeenCalledTimes(4);
  });

  it('Second sync: Skips 4 issues (frontmatter cache)', async () => {
    await coordinator.syncIncrementCompletion(); // First sync
    const result = await coordinator.syncIncrementCompletion(); // Second sync
    expect(result.userStoriesSynced).toBe(0); // All skipped
    expect(mockAPI.createIssue).toHaveBeenCalledTimes(4); // No new calls
  });

  it('Partial failure recovery: Creates only missing issues', async () => {
    mockAPI.createIssue
      .mockResolvedValueOnce({ number: 101 }) // US-001 ✅
      .mockResolvedValueOnce({ number: 102 }) // US-002 ✅
      .mockRejectedValueOnce(new Error('Network error')) // US-003 ❌
      .mockRejectedValueOnce(new Error('Network error')); // US-004 ❌

    await coordinator.syncIncrementCompletion(); // First attempt (2 succeed, 2 fail)

    mockAPI.createIssue.mockClear();
    mockAPI.createIssue
      .mockResolvedValueOnce({ number: 103 }) // US-003 ✅
      .mockResolvedValueOnce({ number: 104 }); // US-004 ✅

    const result = await coordinator.syncIncrementCompletion(); // Retry

    expect(result.userStoriesSynced).toBe(2); // Only US-003, US-004 created
    expect(mockAPI.createIssue).toHaveBeenCalledTimes(2); // US-001, US-002 skipped (cached)
  });
});
```

### E2E Tests

- Real GitHub repo (test account)
- Create 4 issues
- Re-run sync → verify zero duplicates
- Manually delete issue → re-run sync → verify issue recreated
- Corrupt frontmatter → re-run sync → verify API fallback works

## Performance Impact

### Baseline (No Caching)

```
Sync 4 User Stories:
  - API Query × 4: 4 × 1000ms = 4000ms (4 seconds)
  - Issue Creation × 4: 4 × 500ms = 2000ms (2 seconds)
  - Total: 6 seconds per sync
```

### With Three-Layer Caching

```
First Sync (Cache Cold):
  - Frontmatter Check × 4: 4 × 1ms = 4ms
  - API Query × 4: 4 × 1000ms = 4000ms
  - Issue Creation × 4: 4 × 500ms = 2000ms
  - Total: 6 seconds (same as baseline)

Second Sync (Cache Warm - Frontmatter):
  - Frontmatter Check × 4: 4 × 1ms = 4ms
  - API Query × 0: 0ms (cached)
  - Issue Creation × 0: 0ms (skipped)
  - Total: 4ms (99.9% faster!) ✅

Partial Failure Recovery (2 cached, 2 new):
  - Frontmatter Check × 4: 4 × 1ms = 4ms
  - API Query × 2: 2 × 1000ms = 2000ms
  - Issue Creation × 2: 2 × 500ms = 1000ms
  - Total: 3 seconds (50% faster than baseline)
```

**Result**: **99.9% performance improvement** on subsequent syncs (warm cache)

## References

- **Related ADRs**:
  - [ADR-0065: Three-Tier Permission Gates](0065-three-tier-permission-gates.md)
  - [ADR-0066: SyncCoordinator Integration Point](0066-sync-coordinator-integration-point.md)
  - [ADR-0068: Circuit Breaker Error Isolation](#)

- **User Stories**:
  - [US-003: Idempotency via Caching](../../specs/specweave/_archive/FS-049/us-003-idempotency.md)

- **Implementation**:
  - Increment: [0051-automatic-github-sync](../../../../increments/_archive/0051-automatic-github-sync/)
  - Files: `src/sync/sync-coordinator.ts`, `plugins/specweave-github/lib/github-client-v2.ts`

- **Existing Components**:
  - `DuplicateDetector`: 3-phase detection (Detection → Verification → Reflection)
  - Brownfield Import: Uses `--limit 50` (prevents hiding duplicates)
