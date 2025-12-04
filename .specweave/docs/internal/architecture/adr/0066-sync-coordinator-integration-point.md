# ADR-0066: SyncCoordinator Integration Point Selection

**Date**: 2025-11-22
**Status**: Accepted
**Priority**: P0 (Critical - Core workflow integration)

## Context

SpecWeave needs to automatically create GitHub issues when increments complete. Currently:
- **Living docs sync** happens automatically via `SyncCoordinator.syncIncrementCompletion()` (called by hook)
- **GitHub sync** does NOT happen automatically (users must run `/specweave-github:sync` manually)

**Current Hook Architecture** (`post-task-completion.sh`):
```bash
# Hooks fire on TodoWrite
TodoWrite → post-task-completion.sh
              ↓
         SyncCoordinator.syncIncrementCompletion()
              ↓
         Living Docs Sync (format preservation)
         # NO GitHub sync!
```

**Problem**: Where should GitHub issue creation be integrated?

### Integration Options Considered

**Option 1: New Standalone Hook (`post-increment-completion.sh`)**
- Pros: Separation of concerns, doesn't bloat SyncCoordinator
- Cons: **Two sync points** (living docs + GitHub), synchronization issues, duplicate logic

**Option 2: Extend Existing Hook (`post-task-completion.sh`)**
- Pros: Single trigger point, already fires on completion
- Cons: Hook runs on EVERY TodoWrite (spam), hard to filter "increment complete" event

**Option 3: Integrate into SyncCoordinator** ⭐
- Pros: **Single source of truth**, reuses permission gates, format preservation logic
- Cons: Slightly larger SyncCoordinator class

**Option 4: New Command `/specweave:sync-on-complete`**
- Pros: Explicit invocation, testable
- Cons: User must remember to run it, defeats automation goal

## Decision

We will **integrate GitHub issue creation into `SyncCoordinator.syncIncrementCompletion()`**.

### Rationale

1. **Single Source of Truth**: SyncCoordinator already handles living docs sync, adding external sync is natural extension
2. **Permission Gate Reuse**: GATE 1-4 evaluation happens in one place
3. **Format Preservation Consistency**: Same sync logic (avoid duplicates, handle errors)
4. **Existing Hook Infrastructure**: No new hooks needed, `post-task-completion.sh` already fires
5. **Atomic Operation**: Living docs + GitHub sync happen together (transactional semantics)

### Integration Point

```typescript
// src/sync/sync-coordinator.ts

async syncIncrementCompletion(): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    userStoriesSynced: 0,
    syncMode: 'read-only',
    errors: []
  };

  try {
    const config = await this.loadConfig();

    // ============================================================
    // EXISTING: GATE 1 - Living Docs Sync
    // ============================================================
    if (!config.sync?.settings?.canUpsertInternalItems) {
      this.logger.log('ℹ️  Living docs sync disabled');
      result.syncMode = 'read-only';
      result.success = true;
      return result;
    }

    await this.syncLivingDocs(); // Existing living docs sync

    // ============================================================
    // NEW: GATE 2, 3, 4 - GitHub Issue Creation
    // ============================================================

    // GATE 2: External tracker sync capability
    if (!config.sync?.settings?.canUpdateExternalItems) {
      this.logger.log('ℹ️  External sync disabled (canUpdateExternalItems=false)');
      result.syncMode = 'living-docs-only';
      result.success = true;
      return result;
    }

    // GATE 3: Automatic sync on completion (DEFAULT: true)
    const autoSync = config.sync?.settings?.autoSyncOnCompletion ?? true;
    if (!autoSync) {
      this.logger.log('⚠️  Automatic sync disabled (autoSyncOnCompletion=false)');
      this.logger.log('   Run /specweave-github:sync to sync manually');
      result.syncMode = 'manual-only';
      result.success = true;
      return result;
    }

    // GATE 4: GitHub-specific sync
    if (!config.sync?.github?.enabled) {
      this.logger.log('⏭️  GitHub sync SKIPPED (sync.github.enabled=false)');
      result.syncMode = 'external-disabled';
      result.success = true;
      return result;
    }

    // All gates passed → create GitHub issues
    await this.createGitHubIssuesForUserStories(config);

    result.syncMode = 'full-sync';
    result.success = true;
    return result;

  } catch (error) {
    // Error isolation (NEVER crash workflow)
    result.errors.push(`Sync coordinator error: ${error.message}`);
    this.logger.error('❌ Sync failed:', error);
    return result;
  }
}

/**
 * NEW METHOD: Create GitHub issues for all User Stories in increment
 */
private async createGitHubIssuesForUserStories(config: any): Promise<void> {
  const userStories = await this.loadUserStoriesForIncrement();

  if (userStories.length === 0) {
    this.logger.log('ℹ️  No user stories found for this increment');
    return;
  }

  this.logger.log(`📚 Found ${userStories.length} user story/stories`);

  // Extract owner/repo from config
  const githubConfig = config.sync?.github || {};
  const repoInfo = await this.detectGitHubRepo(githubConfig);

  if (!repoInfo) {
    throw new Error('GitHub repository not configured');
  }

  const client = GitHubClientV2.fromRepo(repoInfo.owner, repoInfo.repo);

  // Create issues for each User Story (with idempotency)
  for (const us of userStories) {
    try {
      const issue = await this.createOrSkipUserStoryIssue(client, us);

      if (issue) {
        this.logger.log(`  ✅ Created issue #${issue.number}: [${us.feature}][${us.id}] ${us.title}`);
      } else {
        this.logger.log(`  ⏭️  Issue already exists for ${us.id} (cached)`);
      }
    } catch (error) {
      const errorMsg = `Failed to create issue for ${us.id}: ${error.message}`;
      this.logger.error(`  ❌ ${errorMsg}`);
      // CONTINUE to next user story (partial completion allowed)
    }
  }
}

/**
 * Create GitHub issue with idempotency check
 */
private async createOrSkipUserStoryIssue(
  client: GitHubClientV2,
  us: LivingDocsUSFile
): Promise<GitHubIssue | null> {
  // IDEMPOTENCY LAYER 1: Check User Story frontmatter
  if (us.external_tools?.github?.number) {
    return null; // Already exists (cached)
  }

  // IDEMPOTENCY LAYER 2: Query GitHub API
  const existingIssue = await client.findIssueByTitle(
    `[${us.feature}][${us.id}] ${us.title}`
  );

  if (existingIssue) {
    // Update frontmatter with discovered issue number (cache for future)
    await this.updateUserStoryFrontmatter(us.id, {
      'external_tools.github.number': existingIssue.number,
      'external_tools.github.url': existingIssue.url
    });
    return null; // Skip creation
  }

  // IDEMPOTENCY LAYER 3: Create issue
  const issue = await client.createUserStoryIssue({
    featureId: us.feature,
    userStoryId: us.id,
    title: us.title,
    body: this.formatUserStoryBody(us),
    labels: ['feature', 'user-story'],
    milestone: await this.getMilestoneForFeature(us.feature)
  });

  // Update frontmatter (cache for idempotency)
  await this.updateUserStoryFrontmatter(us.id, {
    'external_tools.github.number': issue.number,
    'external_tools.github.url': issue.url
  });

  // Update increment metadata.json
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

### Hook Execution Flow

```
User completes increment: /specweave:done 0051
    ↓
Increment status → "completed"
    ↓
Hook fires: post-task-completion.sh
    ↓
Hook calls: node dist/src/sync/sync-coordinator.js
    ↓
SyncCoordinator.syncIncrementCompletion()
    ↓
GATE 1: canUpsertInternalItems = true?
    ↓ YES
Living Docs Sync (Format Preservation)
    ↓
GATE 2: canUpdateExternalItems = true?
    ↓ YES
GATE 3: autoSyncOnCompletion = true?
    ↓ YES
GATE 4: sync.github.enabled = true?
    ↓ YES
createGitHubIssuesForUserStories()
    ↓
For each User Story:
  - Check frontmatter (cached issue number)
  - Query GitHub API (duplicate detection)
  - Create issue (if not exists)
  - Update frontmatter (cache issue number)
  - Update metadata.json (audit trail)
    ↓
✅ Sync complete (living docs + GitHub)
```

## Alternatives Considered

### Alternative 1: Separate Hook (`post-increment-completion.sh`) - Rejected

**Approach**:
```bash
# NEW hook (only fires on /done)
/specweave:done → post-increment-completion.sh
                    ↓
                  createGitHubIssues()
```

**Pros**:
- ✅ Clean separation (living docs sync vs GitHub sync)
- ✅ Fires only on increment completion (no spam)

**Cons**:
- ❌ **Two sync points** (living docs sync + GitHub sync separate)
- ❌ **Synchronization issues** (what if living docs sync fails but GitHub succeeds?)
- ❌ **Duplicate logic** (permission gates evaluated twice)
- ❌ **New hook infrastructure** (more complexity)

**Decision**: Rejected (too much complexity)

### Alternative 2: Extend Existing Hook Filter - Rejected

**Approach**:
```bash
# Add filtering in post-task-completion.sh
post-task-completion.sh:
  if [[ "$STATUS" == "completed" ]]; then
    # Call GitHub sync
    node dist/src/cli/commands/github-sync.js
  fi
```

**Pros**:
- ✅ Reuses existing hook
- ✅ Single trigger point

**Cons**:
- ❌ **Hook logic complexity** (bash filtering is fragile)
- ❌ **No permission gate integration** (separate config check needed)
- ❌ **Error handling complexity** (hook errors crash Claude Code)

**Decision**: Rejected (bash scripting complexity)

### Alternative 3: Integrate into SyncCoordinator - **ACCEPTED** ⭐

**Approach**: Extend `SyncCoordinator.syncIncrementCompletion()` with GitHub sync

**Pros**:
- ✅ **Single source of truth** (all sync logic in one place)
- ✅ **Permission gate reuse** (GATE 1-4 evaluated once)
- ✅ **Atomic operation** (living docs + GitHub sync together)
- ✅ **Format preservation consistency** (same error handling, logging)
- ✅ **Existing hook infrastructure** (no new hooks)

**Cons**:
- ❌ Slightly larger SyncCoordinator class (~200 lines added)
- ❌ Tight coupling (living docs + GitHub in same class)

**Decision**: **Accepted** (pros outweigh cons)

### Alternative 4: New Command (`/specweave:sync-on-complete`) - Rejected

**Approach**: User manually runs `/specweave:sync-on-complete` after `/done`

**Pros**:
- ✅ Explicit user control
- ✅ Testable command

**Cons**:
- ❌ **Defeats automation goal** (user must remember to run it)
- ❌ **30% forgotten syncs** (same problem as current state)

**Decision**: Rejected (doesn't solve automation problem)

## Consequences

### Positive

1. **✅ Single Source of Truth**: All sync logic in `SyncCoordinator`
2. **✅ Atomic Operation**: Living docs + GitHub sync happen together
3. **✅ Permission Gate Reuse**: GATE 1-4 evaluated in one place
4. **✅ Format Preservation Consistency**: Same error handling, idempotency, logging
5. **✅ Existing Hook Infrastructure**: No new hooks needed
6. **✅ Testability**: SyncCoordinator is unit-testable (vs bash hooks)

### Negative

1. **❌ Larger SyncCoordinator**: ~200 lines added (~400 lines total)
2. **❌ Tight Coupling**: Living docs + GitHub sync in same class
3. **❌ Async Complexity**: Must handle living docs sync + GitHub sync errors independently

### Neutral

1. **Class Size**: 400 lines is manageable (below 500-line guideline)
2. **Single Responsibility**: SyncCoordinator's responsibility is "increment completion sync" (both internal + external)

## Implementation Impact

### Files Modified

**Core**:
- `src/sync/sync-coordinator.ts`: Add `createGitHubIssuesForUserStories()` method (~200 lines)
- `src/core/config/types.ts`: Add `autoSyncOnCompletion` field (~5 lines)

**Plugins**:
- `plugins/specweave-github/lib/github-client-v2.ts`: Add `createUserStoryIssue()`, `findIssueByTitle()` (~100 lines)

**Hooks** (NO changes):
- `plugins/specweave/hooks/post-task-completion.sh`: Already calls SyncCoordinator (no changes)

**Tests**:
- `tests/unit/sync/sync-coordinator.test.ts`: Add GitHub sync tests (~200 lines)
- `tests/integration/sync/github-sync-integration.test.ts`: New file (~300 lines)

### Performance Impact

**Before** (living docs sync only):
```
Living Docs Sync: 2-5 seconds
```

**After** (living docs + GitHub sync):
```
Living Docs Sync: 2-5 seconds
GitHub Sync (4 User Stories): 3-6 seconds
Total: 5-11 seconds
```

**Mitigation**: Background execution (non-blocking, user can continue working)

### Error Handling

**Living Docs Sync Fails**:
- Sync stops
- No GitHub sync attempted
- User sees error, workflow continues

**GitHub Sync Fails**:
- Living docs already synced ✅
- User sees error, can manually retry
- Workflow continues (non-blocking)

**Partial GitHub Sync Failure**:
- 2 of 4 issues created ✅
- 2 failed ❌
- Idempotency prevents duplicates on retry

## Migration Path

### v0.24.x → v0.25.0

**Automatic** (no user action):
- Existing `SyncCoordinator` continues to work
- New GitHub sync auto-enabled if `autoSyncOnCompletion: true` (default)

**Opt-Out** (disable auto-sync):
```json
{
  "sync": {
    "settings": {
      "autoSyncOnCompletion": false
    }
  }
}
```

## Testing Strategy

### Unit Tests

```typescript
describe('SyncCoordinator.syncIncrementCompletion', () => {
  it('creates GitHub issues when all gates pass', async () => {
    const config = fullSyncConfig;
    const result = await coordinator.syncIncrementCompletion();
    expect(result.syncMode).toBe('full-sync');
    expect(mockGitHubClient.createUserStoryIssue).toHaveBeenCalledTimes(4);
  });

  it('skips GitHub sync when GATE 3 false', async () => {
    const config = { ...fullSyncConfig, autoSyncOnCompletion: false };
    const result = await coordinator.syncIncrementCompletion();
    expect(result.syncMode).toBe('manual-only');
    expect(mockGitHubClient.createUserStoryIssue).not.toHaveBeenCalled();
  });

  it('continues workflow on GitHub API error', async () => {
    mockGitHubClient.createUserStoryIssue.mockRejectedValue(new Error('Rate limit'));
    const result = await coordinator.syncIncrementCompletion();
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    // Workflow continues (non-blocking)
  });
});
```

### Integration Tests

- Living docs sync + GitHub sync together
- Permission gates evaluated correctly
- Error isolation (one failure doesn't crash workflow)
- Idempotency (re-running sync creates zero duplicates)

### E2E Tests

- Complete real increment
- Verify living docs updated
- Verify GitHub issues created
- Verify metadata.json updated

## References

- **Related ADRs**:
  - [ADR-0030: Intelligent Living Docs Sync](0030-intelligent-living-docs-sync.md) (SyncCoordinator origin)
  - [ADR-0065: Three-Tier Permission Gates](#) (Permission architecture)
  - [ADR-0067: Three-Layer Idempotency Caching](#) (Prevent duplicates)
  - [ADR-0068: Circuit Breaker Error Isolation](#) (Error handling)

- **User Stories**:
  - [US-001: Automatic Issue Creation on Completion](../../specs/specweave/_archive/FS-049/us-001-auto-issue-creation.md)

- **Implementation**:
  - Increment: [0051-automatic-github-sync](../../../../increments/_archive/0051-automatic-github-sync/)
  - Class: `src/sync/sync-coordinator.ts`

---

**Approval Date**: 2025-11-22
**Review Date**: 2025-12-01 (post-implementation feedback)
