---
id: US-001
title: "Automatic Issue Creation on Completion"
feature: FS-049
project: specweave
type: user-story
status: proposed
priority: P0
created: 2025-11-22
external_tools:
  github:
    type: issue
    number: 716
    url: https://github.com/anton-abyzov/specweave/issues/716
---

# US-001: Automatic Issue Creation on Completion

**Feature**: [FS-049: Automatic GitHub Sync with Permission Gates](../../../_features/FS-049/FEATURE.md)

## User Story

**As a** SpecWeave user
**I want** GitHub issues automatically created when I complete an increment
**So that** I don't have to manually run `/specweave-github:sync` after every `/done`

## Context

**Current Behavior**:
1. User completes increment: `/specweave:done 0050`
2. Living docs sync automatically (via hook)
3. GitHub sync DOES NOT happen automatically
4. User must manually run: `/specweave-github:sync FS-048`
5. Result: Forgotten syncs, stale GitHub issues

**Desired Behavior**:
1. User completes increment: `/specweave:done 0050`
2. Living docs sync automatically (existing)
3. GitHub sync happens automatically (NEW)
4. Result: GitHub issues created immediately

## Acceptance Criteria

- [ ] **AC-US1-01**: When increment completes, `SyncCoordinator.syncIncrementCompletion()` called automatically
  - **Priority**: P0
  - **Testable**: Yes (integration test)
  - **Verification**: Check `post-task-completion.sh` hook logs

- [ ] **AC-US1-02**: `SyncCoordinator` detects all User Stories linked to increment's feature
  - **Priority**: P0
  - **Testable**: Yes (unit test)
  - **Verification**: Parse spec.md frontmatter → extract feature_id → find living docs

- [ ] **AC-US1-03**: For each User Story, create GitHub issue using `GitHubClientV2`
  - **Priority**: P0
  - **Testable**: Yes (integration test with GitHub API mock)
  - **Verification**: Issue title matches `[FS-049][US-001] User Story Title` format

- [ ] **AC-US1-04**: Created issues linked to feature milestone (if exists)
  - **Priority**: P1
  - **Testable**: Yes
  - **Verification**: Issue `milestone` field set to FS-049 milestone ID

- [ ] **AC-US1-05**: `metadata.json` updated with GitHub issue numbers
  - **Priority**: P0
  - **Testable**: Yes
  - **Verification**: Check `metadata.json` → `github.issue` field populated

- [ ] **AC-US1-06**: User sees success message: "Created 4 GitHub issues for FS-049"
  - **Priority**: P1
  - **Testable**: Yes
  - **Verification**: Check CLI output after `/done`

## Implementation Notes

**Files to Modify**:
- `src/sync/sync-coordinator.ts`: Add `createGitHubIssuesForUserStories()` method
- `plugins/specweave-github/lib/github-client-v2.ts`: Add `createUserStoryIssue()` method
- `plugins/specweave/hooks/post-task-completion.sh`: Already calls sync (no change needed)

**Pseudocode**:
```typescript
async syncIncrementCompletion() {
  // Existing living docs sync (GATE 1)
  if (config.canUpsertInternalItems) {
    await syncLivingDocs();
  }

  // NEW: GitHub sync (GATE 2, 3, 4)
  if (config.canUpdateExternalItems &&
      config.autoSyncOnCompletion &&
      config.sync.github.enabled) {

    const userStories = await loadUserStoriesForIncrement();
    const client = GitHubClientV2.fromRepo(owner, repo);

    for (const us of userStories) {
      const issue = await client.createUserStoryIssue({
        featureId: us.feature,
        userStoryId: us.id,
        title: us.title,
        body: formatUserStoryBody(us),
        milestone: await getMilestoneForFeature(us.feature)
      });

      console.log(`✅ Created issue #${issue.number}: ${issue.title}`);
    }
  }
}
```

## Test Strategy

**Unit Tests**:
- `SyncCoordinator.loadUserStoriesForIncrement()` returns correct US files
- Permission gates evaluated correctly (all 4 gates)

**Integration Tests**:
- Mock GitHub API, verify issue creation payload
- Check `metadata.json` updated with issue numbers
- Verify milestone linking

**E2E Tests**:
- Complete real increment, verify GitHub issues created
- Check issue title, body, labels, milestone

## Edge Cases

**Edge Case 1: No User Stories Found**
- **Scenario**: Increment has no linked User Stories
- **Expected**: Skip GitHub sync, log "No user stories found"
- **Rationale**: Avoid creating empty issues

**Edge Case 2: GitHub API Rate Limit**
- **Scenario**: User hits 5000 requests/hour limit
- **Expected**: Log error, continue workflow, allow manual retry
- **Rationale**: Don't block user workflow

**Edge Case 3: User Story Already Has GitHub Issue**
- **Scenario**: US frontmatter has `github.number: 42`
- **Expected**: Skip creation, log "Issue #42 already exists"
- **Rationale**: Idempotency (see US-003)

## Related Stories

- [US-002: Three-Tier Permission Model](./us-002-permission-gates.md) - Permission gates
- [US-003: Idempotency via Caching](./us-003-idempotency.md) - Prevent duplicates
- [US-004: Error Isolation and Recovery](./us-004-error-isolation.md) - Handle API errors

## External Tool Links

- **GitHub Issue**: (To be created)

---

**Status**: Proposed
**Implementation**: Planned for 0051-automatic-github-sync
