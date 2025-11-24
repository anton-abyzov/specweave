---
id: US-004
title: "Error Isolation and Recovery"
feature: FS-049
project: specweave
type: user-story
status: proposed
priority: P0
created: 2025-11-22
external_tools:
  github:
    type: issue
    number: 719
    url: https://github.com/anton-abyzov/specweave/issues/719
---

# US-004: Error Isolation and Recovery

**Feature**: [FS-049: Automatic GitHub Sync with Permission Gates](../../../_features/FS-049/FEATURE.md)

## User Story

**As a** SpecWeave user
**I want** sync failures to NOT crash my workflow
**So that** I can continue working even if GitHub API is temporarily unavailable

## Context

**Critical Incidents** (2025-11-22):
- Hook crashes caused Claude Code to crash (multiple occurrences)
- Root cause: Process exhaustion from spawning 6+ Node.js processes
- Emergency fixes: Kill switch, circuit breaker, file locking, error isolation

**Design Principle**: **Hooks NEVER block user workflow**

**Error Scenarios**:
1. **GitHub API unavailable** (503 Service Unavailable)
2. **Rate limit exceeded** (403 Forbidden, x-ratelimit-remaining: 0)
3. **Network timeout** (ECONNREFUSED, ETIMEDOUT)
4. **Authentication failure** (gh CLI not authenticated)
5. **Malformed issue data** (invalid title, milestone not found)

## Acceptance Criteria

- [ ] **AC-US4-01**: All sync errors caught and logged (NEVER crash workflow)
  - **Priority**: P0
  - **Testable**: Yes (error injection test)
  - **Verification**: User workflow continues after sync failure

- [ ] **AC-US4-02**: Sync operations wrapped in try-catch with error isolation
  - **Priority**: P0
  - **Testable**: Yes
  - **Verification**: Check `set +e` in bash hooks, `try-catch` in TypeScript

- [ ] **AC-US4-03**: Hooks ALWAYS exit 0 (even on failure)
  - **Priority**: P0
  - **Testable**: Yes
  - **Verification**: Check `exit 0` at end of hook scripts

- [ ] **AC-US4-04**: User sees clear error message on sync failure
  - **Priority**: P1
  - **Testable**: Yes
  - **Verification**:
    ```
    ⚠️  GitHub sync failed: Rate limit exceeded (retry in 15 minutes)
       Living docs updated successfully
       Run /specweave-github:sync to retry manually
    ```

- [ ] **AC-US4-05**: Partial sync completion allowed (some issues created, others failed)
  - **Priority**: P1
  - **Testable**: Yes
  - **Verification**: If US-001, US-002 succeed but US-003 fails, first two issues created

- [ ] **AC-US4-06**: Circuit breaker auto-disables hooks after 3 consecutive failures
  - **Priority**: P0
  - **Testable**: Yes
  - **Verification**: Check `.specweave/state/.hook-circuit-breaker-github` file

- [ ] **AC-US4-07**: Manual recovery command documented: `/specweave-github:sync --retry`
  - **Priority**: P1
  - **Testable**: Yes
  - **Verification**: Error message includes recovery command

## Implementation Notes

**Error Isolation Pattern (TypeScript)**:
```typescript
async syncIncrementCompletion(): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    userStoriesSynced: 0,
    syncMode: 'read-only',
    errors: []
  };

  try {
    // Living docs sync (GATE 1)
    if (config.canUpsertInternalItems) {
      await syncLivingDocs(); // May throw
    }

    // GitHub sync (GATE 2, 3, 4)
    if (config.canUpdateExternalItems && config.autoSyncOnCompletion && config.github.enabled) {
      const userStories = await loadUserStoriesForIncrement();

      for (const us of userStories) {
        try {
          await createUserStoryIssue(us); // Isolated per-issue error handling
          result.userStoriesSynced++;
        } catch (error) {
          const errorMsg = `Failed to sync ${us.id}: ${error.message}`;
          this.logger.error(errorMsg);
          result.errors.push(errorMsg);
          // CONTINUE to next user story (partial completion allowed)
        }
      }

      result.success = result.errors.length === 0;

      if (result.errors.length > 0) {
        this.logger.log(`\n⚠️  ${result.errors.length} error(s) occurred`);
        this.logger.log(`   Living docs updated successfully`);
        this.logger.log(`   Run /specweave-github:sync to retry manually`);
      }
    }

    return result;
  } catch (error) {
    // Catastrophic error (should never happen with proper isolation)
    result.errors.push(`Sync coordinator error: ${error.message}`);
    this.logger.error('❌ Sync failed:', error);
    return result; // ALWAYS return, NEVER throw
  }
}
```

**Error Isolation Pattern (Bash Hook)**:
```bash
#!/bin/bash

# EMERGENCY FIX: Prevents Claude Code crashes
set +e  # NEVER use set -e (causes crashes)

# EMERGENCY KILL SWITCH
if [[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]]; then
  exit 0
fi

# CIRCUIT BREAKER: Auto-disable after consecutive failures
CIRCUIT_BREAKER_FILE=".specweave/state/.hook-circuit-breaker-github"
if [[ -f "$CIRCUIT_BREAKER_FILE" ]]; then
  FAILURE_COUNT=$(cat "$CIRCUIT_BREAKER_FILE" 2>/dev/null || echo 0)
  if (( FAILURE_COUNT >= 3 )); then
    exit 0  # Circuit breaker OPEN - hooks disabled
  fi
fi

# Run sync (errors logged, NOT thrown)
node dist/src/cli/commands/sync-spec-content.js 2>&1 | tee -a .specweave/logs/hooks-debug.log || {
  echo "[$(date)] [GitHub] ⚠️  Sync failed (non-blocking)" >> .specweave/logs/hooks-debug.log
  # Increment circuit breaker counter
  echo "$((FAILURE_COUNT + 1))" > "$CIRCUIT_BREAKER_FILE"
}

# Reset circuit breaker on success
if [ $? -eq 0 ]; then
  echo "0" > "$CIRCUIT_BREAKER_FILE"
fi

# ALWAYS exit 0 - NEVER let hook errors crash Claude Code
exit 0
```

## Test Strategy

**Unit Tests**:
- Error caught and logged (NOT thrown)
- Partial sync completion (2 success, 1 failure)
- Circuit breaker threshold (3 failures → open)

**Integration Tests**:
- Network error injection (ECONNREFUSED)
- GitHub API error injection (403, 503)
- Verify workflow continues after error

**E2E Tests**:
- Complete increment with GitHub API offline
- Verify living docs updated, GitHub sync skipped
- Verify user can retry manually

## Error Message Templates

**Error 1: GitHub API Unavailable**
```
⚠️  GitHub sync failed: API unavailable (503 Service Unavailable)
   Living docs updated successfully
   Run /specweave-github:sync to retry when GitHub is back online
```

**Error 2: Rate Limit Exceeded**
```
⚠️  GitHub sync failed: Rate limit exceeded (403 Forbidden)
   Limit resets at: 2025-11-22 15:30:00 UTC (15 minutes)
   Living docs updated successfully
   Run /specweave-github:sync --retry after rate limit reset
```

**Error 3: Authentication Failure**
```
⚠️  GitHub sync failed: Authentication required
   Run: gh auth login
   Then retry: /specweave-github:sync
```

**Error 4: Circuit Breaker Open**
```
⚠️  GitHub sync DISABLED (3 consecutive failures)
   Emergency kill switch activated
   To reset:
     1. Fix underlying issue (check gh auth status)
     2. rm .specweave/state/.hook-circuit-breaker-github
     3. Retry: /specweave-github:sync
```

## Recovery Workflows

**Scenario 1: Temporary Network Failure**
1. User runs `/specweave:done 0051`
2. Sync fails: "Network unavailable"
3. User waits for network recovery
4. User runs `/specweave-github:sync FS-049 --retry`
5. Sync completes (idempotency prevents duplicates)

**Scenario 2: Rate Limit Exceeded**
1. User runs `/specweave:done 0051`
2. Sync fails: "Rate limit exceeded"
3. User waits 15 minutes (rate limit reset)
4. User runs `/specweave-github:sync FS-049 --retry`
5. Sync completes

**Scenario 3: Circuit Breaker Open**
1. User runs `/specweave:done 0051` (3rd consecutive failure)
2. Circuit breaker opens: "GitHub sync DISABLED"
3. User fixes root cause (e.g., `gh auth login`)
4. User resets circuit breaker: `rm .specweave/state/.hook-circuit-breaker-github`
5. User runs `/specweave-github:sync FS-049`
6. Sync completes

## Related Stories

- [US-001: Automatic Issue Creation](./us-001-auto-issue-creation.md) - Uses error isolation
- [US-003: Idempotency via Caching](./us-003-idempotency.md) - Enables safe retries

## External Tool Links

- **GitHub Issue**: (To be created)

---

**Status**: Proposed
**Implementation**: Planned for 0051-automatic-github-sync
