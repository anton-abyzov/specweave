<!-- ⚠️ AUTO-TRANSLATION PENDING -->
<!-- Set ANTHROPIC_API_KEY for automatic translation -->
<!-- Or run: /specweave:translate to complete -->
<!-- Original content below -->

<!-- ⚠️ AUTO-TRANSLATION PENDING -->
<!-- Set ANTHROPIC_API_KEY for automatic translation -->
<!-- Or run: /specweave:translate to complete -->
<!-- Original content below -->

# ADR-0068: Circuit Breaker Error Isolation Pattern

**Date**: 2025-11-22
**Status**: Accepted
**Priority**: P0 (Critical - Prevents workflow crashes)

## Context

**Critical Incidents** (2025-11-22, Increment 0050):
- Multiple Claude Code crashes due to hook overhead
- Root cause: Process exhaustion from spawning 6+ Node.js processes per task completion
- Emergency fixes implemented: Kill switch, circuit breaker, file locking, error isolation

**Core Architectural Principle**: **Hooks NEVER block user workflow**

### Current Hook Architecture (v0.24.3 Emergency Fixes)

```bash
# plugins/specweave/hooks/post-task-completion.sh

# EMERGENCY FIX 1: Disable error propagation
set +e  # NEVER use set -e (causes crashes)

# EMERGENCY FIX 2: Kill switch
if [[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]]; then
  exit 0
fi

# EMERGENCY FIX 3: Circuit breaker (auto-disable after failures)
if (( FAILURE_COUNT >= 3 )); then
  exit 0  # Circuit breaker OPEN - hooks disabled
fi

# EMERGENCY FIX 4: Always exit 0 (NEVER let errors crash Claude Code)
exit 0
```

**Problem for Automatic GitHub Sync**: Introducing GitHub API calls adds new failure modes:
- GitHub API unavailable (503 Service Unavailable)
- Rate limit exceeded (403 Forbidden)
- Network timeout (ECONNREFUSED, ETIMEDOUT)
- Authentication failure (gh CLI not authenticated)

**Non-Negotiable Requirement**: GitHub sync failures MUST NOT crash user workflow.

## Decision

We will apply the **Circuit Breaker Error Isolation Pattern** to automatic GitHub sync, building on the emergency fixes from v0.24.3.

### Architecture: 7-Layer Error Isolation

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Emergency Kill Switch                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ export SPECWEAVE_DISABLE_HOOKS=1                        │ │
│ │ → INSTANT disable of ALL hooks (nuclear option)        │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Circuit Breaker (Auto-Disable After Failures)      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ .specweave/state/.hook-circuit-breaker-github           │ │
│ │ Threshold: 3 consecutive failures                       │ │
│ │ → Auto-disable GitHub sync hooks                        │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: File Locking (Prevent Concurrent Execution)        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ .specweave/state/.hook-github-sync.lock                 │ │
│ │ Timeout: 15 seconds (GitHub sync takes longer)          │ │
│ │ → Max 1 GitHub sync hook instance                       │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: TypeScript Error Isolation (Try-Catch Wrappers)    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ async syncIncrementCompletion(): Promise<SyncResult> {  │ │
│ │   try {                                                 │ │
│ │     await createGitHubIssues();                         │ │
│ │   } catch (error) {                                     │ │
│ │     // Log error, NEVER throw                           │ │
│ │     result.errors.push(error.message);                  │ │
│ │     return result; // Workflow continues               │ │
│ │   }                                                     │ │
│ │ }                                                       │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 5: Per-Issue Error Isolation (Partial Completion)     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ for (const us of userStories) {                         │ │
│ │   try {                                                 │ │
│ │     await createIssue(us); // ✅ US-001 succeeds        │ │
│ │   } catch (error) {                                     │ │
│ │     errors.push(error); // ❌ US-002 fails              │ │
│ │     continue; // → US-003, US-004 (keep going)          │ │
│ │   }                                                     │ │
│ │ }                                                       │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 6: Bash Error Isolation (set +e, exit 0)              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ #!/bin/bash                                             │ │
│ │ set +e  # NEVER use set -e (causes crashes)             │ │
│ │                                                         │ │
│ │ node dist/src/sync/sync-coordinator.js || {             │ │
│ │   echo "⚠️  Sync failed (non-blocking)" >> debug.log   │ │
│ │   # Increment circuit breaker counter                   │ │
│ │ }                                                       │ │
│ │                                                         │ │
│ │ exit 0  # ALWAYS exit 0 - NEVER crash Claude Code      │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 7: User-Facing Error Messages (Actionable Feedback)   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ⚠️  GitHub sync failed: Rate limit exceeded             │ │
│ │    Limit resets at: 2025-11-22 15:30:00 UTC (15 min)   │ │
│ │    Living docs updated successfully                     │ │
│ │    Run /specweave-github:sync --retry after reset      │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Implementation in TypeScript

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
    // LAYER 4: Outer try-catch (catches catastrophic errors)
    const config = await this.loadConfig();

    // Permission gates (GATE 1-4)...

    // Living docs sync (existing, already error-isolated)
    await this.syncLivingDocs();

    // GitHub sync (NEW - error isolated)
    try {
      await this.createGitHubIssuesForUserStories(config);
      result.syncMode = 'full-sync';
      result.success = true;
    } catch (error) {
      // GitHub sync failed, but living docs succeeded
      const errorMsg = `GitHub sync failed: ${error.message}`;
      this.logger.error(`⚠️  ${errorMsg}`);
      this.logger.log('   Living docs updated successfully');
      this.logger.log('   Run /specweave-github:sync to retry manually');
      result.errors.push(errorMsg);
      result.syncMode = 'living-docs-only'; // Partial success
      // Workflow continues (NEVER throw)
    }

    return result;

  } catch (error) {
    // Catastrophic error (should never happen with proper isolation)
    result.errors.push(`Sync coordinator error: ${error.message}`);
    this.logger.error('❌ Sync failed:', error);
    return result; // ALWAYS return, NEVER throw
  }
}

private async createGitHubIssuesForUserStories(config: any): Promise<void> {
  const userStories = await this.loadUserStoriesForIncrement();
  const client = GitHubClientV2.fromRepo(owner, repo);

  const errors: string[] = [];

  // LAYER 5: Per-issue error isolation (partial completion allowed)
  for (const us of userStories) {
    try {
      const issue = await this.createOrSkipUserStoryIssue(client, us);
      if (issue) {
        this.logger.log(`  ✅ Created issue #${issue.number}`);
      }
    } catch (error) {
      const errorMsg = `Failed to sync ${us.id}: ${error.message}`;
      this.logger.error(`  ❌ ${errorMsg}`);
      errors.push(errorMsg);
      // CONTINUE to next user story (partial completion)
    }
  }

  // If any errors, report but don't throw
  if (errors.length > 0) {
    this.logger.log(`\n⚠️  ${errors.length} error(s) occurred during GitHub sync`);
    this.logger.log(`   ${userStories.length - errors.length} issues created successfully`);
    // Don't throw - workflow continues
  }
}
```

### Implementation in Bash Hook

```bash
#!/bin/bash

# plugins/specweave-github/hooks/post-task-completion.sh
# (GitHub-specific hook, extends core hook)

# LAYER 6: Bash error isolation
set +e  # NEVER use set -e (causes crashes)

# LAYER 1: Emergency kill switch
if [[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]]; then
  exit 0
fi

# LAYER 2: Circuit breaker check
CIRCUIT_BREAKER_FILE=".specweave/state/.hook-circuit-breaker-github"
CIRCUIT_BREAKER_THRESHOLD=3

mkdir -p ".specweave/state" 2>/dev/null || true

if [[ -f "$CIRCUIT_BREAKER_FILE" ]]; then
  FAILURE_COUNT=$(cat "$CIRCUIT_BREAKER_FILE" 2>/dev/null || echo 0)
  if (( FAILURE_COUNT >= CIRCUIT_BREAKER_THRESHOLD )); then
    # Circuit breaker is OPEN - hooks are disabled
    exit 0
  fi
fi

# LAYER 3: File locking
LOCK_FILE=".specweave/state/.hook-github-sync.lock"
LOCK_TIMEOUT=15  # seconds (GitHub sync can take longer)

LOCK_ACQUIRED=false
for i in {1..15}; do
  if mkdir "$LOCK_FILE" 2>/dev/null; then
    LOCK_ACQUIRED=true
    trap 'rmdir "$LOCK_FILE" 2>/dev/null || true' EXIT
    break
  fi

  # Check for stale lock
  if [[ -d "$LOCK_FILE" ]]; then
    LOCK_AGE=$(($(date +%s) - $(stat -f "%m" "$LOCK_FILE" 2>/dev/null || echo 0)))
    if (( LOCK_AGE > LOCK_TIMEOUT )); then
      rmdir "$LOCK_FILE" 2>/dev/null || true
      continue
    fi
  fi

  sleep 0.2
done

if [[ "$LOCK_ACQUIRED" == "false" ]]; then
  # Another instance is running, skip
  exit 0
fi

# Run sync (errors logged, NOT thrown)
node dist/src/sync/sync-coordinator.js 2>&1 | tee -a .specweave/logs/hooks-debug.log || {
  echo "[$(date)] [GitHub] ⚠️  Sync failed (non-blocking)" >> .specweave/logs/hooks-debug.log

  # Increment circuit breaker counter
  FAILURE_COUNT=$(cat "$CIRCUIT_BREAKER_FILE" 2>/dev/null || echo 0)
  echo "$((FAILURE_COUNT + 1))" > "$CIRCUIT_BREAKER_FILE"

  # Check if threshold reached
  if (( FAILURE_COUNT + 1 >= CIRCUIT_BREAKER_THRESHOLD )); then
    echo "[$(date)] [GitHub] ⚠️  Circuit breaker OPEN (3 failures) - hooks disabled" >> .specweave/logs/hooks-debug.log
    echo "⚠️  GitHub sync DISABLED (3 consecutive failures)" >&2
    echo "   To reset: rm .specweave/state/.hook-circuit-breaker-github" >&2
    echo "   Then retry: /specweave-github:sync" >&2
  fi
}

# Reset circuit breaker on success
if [ $? -eq 0 ]; then
  echo "0" > "$CIRCUIT_BREAKER_FILE" 2>/dev/null || true
fi

# ALWAYS exit 0 - NEVER let hook errors crash Claude Code
exit 0
```

## Error Message Templates (Layer 7)

### Error 1: GitHub API Unavailable

```
⚠️  GitHub sync failed: API unavailable (503 Service Unavailable)
   Living docs updated successfully
   Run /specweave-github:sync to retry when GitHub is back online
```

### Error 2: Rate Limit Exceeded

```
⚠️  GitHub sync failed: Rate limit exceeded (403 Forbidden)
   Limit resets at: 2025-11-22 15:30:00 UTC (15 minutes)
   Living docs updated successfully
   Run /specweave-github:sync --retry after rate limit reset
```

### Error 3: Authentication Failure

```
⚠️  GitHub sync failed: Authentication required
   Run: gh auth login
   Then retry: /specweave-github:sync
```

### Error 4: Circuit Breaker Open

```
⚠️  GitHub sync DISABLED (3 consecutive failures)
   Emergency kill switch activated
   To reset:
     1. Fix underlying issue (check gh auth status)
     2. rm .specweave/state/.hook-circuit-breaker-github
     3. Retry: /specweave-github:sync
```

### Error 5: Partial Sync Failure

```
⚠️  2 error(s) occurred during GitHub sync
   2 issues created successfully
   ❌ Failed to sync US-003: Network timeout
   ❌ Failed to sync US-004: Network timeout
   Living docs updated successfully
   Run /specweave-github:sync to retry failed issues
```

## Alternatives Considered

### Alternative 1: Fail Fast (Throw Errors) - Rejected

**Approach**: Throw errors on GitHub API failures

**Pros**:
- ✅ Simple error handling
- ✅ Explicit failure mode

**Cons**:
- ❌ **Crashes user workflow** (violates core principle)
- ❌ **Blocks living docs sync** (if GitHub fails first)
- ❌ **No partial completion** (all-or-nothing)

**Decision**: Rejected (violates "hooks NEVER block workflow")

### Alternative 2: Silent Failure (No Error Messages) - Rejected

**Approach**: Catch errors, log to file, don't notify user

**Pros**:
- ✅ Workflow continues
- ✅ Simple implementation

**Cons**:
- ❌ **User unaware of sync failure** (silent data loss)
- ❌ **No recovery guidance** (user doesn't know how to fix)
- ❌ **Poor UX** (mysterious sync failures)

**Decision**: Rejected (poor user experience)

### Alternative 3: Retry with Exponential Backoff - Rejected

**Approach**: Retry failed API calls 3 times with backoff (1s, 2s, 4s)

**Pros**:
- ✅ Handles transient failures
- ✅ Industry-standard pattern

**Cons**:
- ❌ **Blocks workflow** (7+ seconds delay on failures)
- ❌ **Wastes rate limit** (3 API calls per failure)
- ❌ **Doesn't solve permanent failures** (auth issues, rate limit)

**Decision**: Rejected (retry on manual `/sync` command, not hooks)

### Alternative 4: Circuit Breaker + Error Isolation (SELECTED) ⭐

**Approach**: 7-layer error isolation with circuit breaker auto-disable

**Pros**:
- ✅ **Workflow NEVER blocks** (all errors caught)
- ✅ **Auto-protection** (circuit breaker after 3 failures)
- ✅ **Partial completion** (2 of 4 issues created is OK)
- ✅ **User-facing error messages** (actionable recovery steps)
- ✅ **Gradual degradation** (living docs still works if GitHub fails)

**Cons**:
- ❌ More complexity (7 layers vs simple try-catch)
- ❌ Circuit breaker state management

**Decision**: **Accepted** (aligns with emergency fixes from v0.24.3)

## Consequences

### Positive

1. **✅ Zero Workflow Crashes**: GitHub failures NEVER crash user workflow
2. **✅ Graceful Degradation**: Living docs sync succeeds even if GitHub fails
3. **✅ Partial Completion**: 2 of 4 issues created is better than 0
4. **✅ Auto-Protection**: Circuit breaker prevents infinite loops
5. **✅ Actionable Error Messages**: Users know how to recover
6. **✅ Emergency Override**: Kill switch disables all hooks instantly
7. **✅ File Locking**: Prevents concurrent execution (race conditions)

### Negative

1. **❌ Complexity**: 7 error isolation layers (vs simple try-catch)
2. **❌ State Management**: Circuit breaker state in file system
3. **❌ Silent Failures**: Users might not notice sync failures (mitigated by error messages)

### Neutral

1. **Circuit Breaker State**: `.specweave/state/.hook-circuit-breaker-github` (not committed)
2. **Lock Files**: `.specweave/state/.hook-github-sync.lock` (ephemeral)

## Recovery Workflows

### Scenario 1: Temporary Network Failure

```
User runs: /specweave:done 0051
    ↓
GitHub sync fails: "Network unavailable"
    ↓
Living docs synced successfully ✅
    ↓
User waits for network recovery
    ↓
User runs: /specweave-github:sync FS-049 --retry
    ↓
Sync completes (idempotency prevents duplicates) ✅
```

### Scenario 2: Rate Limit Exceeded

```
User runs: /specweave:done 0051
    ↓
GitHub sync fails: "Rate limit exceeded"
    ↓
Error message: "Limit resets at 2025-11-22 15:30:00 UTC"
    ↓
User waits 15 minutes
    ↓
User runs: /specweave-github:sync FS-049 --retry
    ↓
Sync completes ✅
```

### Scenario 3: Circuit Breaker Open (3 Consecutive Failures)

```
User runs: /specweave:done 0051 (3rd failure)
    ↓
Circuit breaker opens: "GitHub sync DISABLED"
    ↓
User sees error message with recovery steps
    ↓
User fixes root cause: gh auth login
    ↓
User resets circuit breaker: rm .specweave/state/.hook-circuit-breaker-github
    ↓
User runs: /specweave-github:sync FS-049
    ↓
Sync completes ✅
    ↓
Circuit breaker resets to 0 (success)
```

### Scenario 4: Emergency Kill Switch

```
Hooks causing performance issues
    ↓
User enables kill switch: export SPECWEAVE_DISABLE_HOOKS=1
    ↓
All hooks disabled instantly
    ↓
User completes work without hooks
    ↓
User fixes issue (e.g., restart Claude Code)
    ↓
User disables kill switch: unset SPECWEAVE_DISABLE_HOOKS
    ↓
Hooks resume working
```

## Testing Strategy

### Unit Tests

```typescript
describe('Error Isolation', () => {
  it('catches GitHub API errors and continues workflow', async () => {
    mockAPI.createIssue.mockRejectedValue(new Error('Rate limit'));
    const result = await coordinator.syncIncrementCompletion();

    expect(result.success).toBe(false); // Sync failed
    expect(result.errors.length).toBeGreaterThan(0);
    // Workflow continues (no throw)
  });

  it('allows partial completion (2 of 4 issues)', async () => {
    mockAPI.createIssue
      .mockResolvedValueOnce({ number: 101 }) // US-001 ✅
      .mockResolvedValueOnce({ number: 102 }) // US-002 ✅
      .mockRejectedValueOnce(new Error('Network error')) // US-003 ❌
      .mockRejectedValueOnce(new Error('Network error')); // US-004 ❌

    const result = await coordinator.syncIncrementCompletion();

    expect(result.userStoriesSynced).toBe(2); // Partial success
    expect(result.errors.length).toBe(2);
  });

  it('living docs sync succeeds even if GitHub fails', async () => {
    mockAPI.createIssue.mockRejectedValue(new Error('GitHub down'));
    mockLivingDocsSync.mockResolvedValue(true);

    const result = await coordinator.syncIncrementCompletion();

    expect(mockLivingDocsSync).toHaveBeenCalledTimes(1); // Living docs synced ✅
    expect(result.syncMode).toBe('living-docs-only'); // Partial success
  });
});
```

### Integration Tests

- Test circuit breaker (3 failures → open)
- Test circuit breaker reset (success → reset to 0)
- Test file locking (concurrent execution)
- Test error messages (user-facing feedback)

### E2E Tests

- Complete real increment with GitHub API offline
- Verify living docs updated, GitHub sync skipped
- Verify user can retry manually
- Test circuit breaker recovery workflow

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Circuit Breaker Overhead** | < 10ms | File read latency |
| **File Lock Acquisition** | < 100ms (95% of attempts) | Lock timing |
| **Error Message Display** | < 50ms | Log write time |
| **Hook Execution (Success)** | < 10 seconds | End-to-end timing |
| **Hook Execution (Failure)** | < 2 seconds | Error path timing |

## References

- **Related ADRs**:
  - [ADR-0060: Hook Performance Optimization](../../operations/hook-crash-recovery.md) (Emergency fixes)
  - [ADR-0065: Three-Tier Permission Gates](0065-three-tier-permission-gates.md)
  - [ADR-0066: SyncCoordinator Integration Point](0066-sync-coordinator-integration-point.md)
  - [ADR-0067: Three-Layer Idempotency Caching](0067-three-layer-idempotency-caching.md)

- **User Stories**:
  - [US-004: Error Isolation and Recovery](../../specs/specweave/_archive/FS-049/us-004-error-isolation.md)

- **Implementation**:
  - Increment: [0051-automatic-github-sync](../../../../increments/_archive/0051-automatic-github-sync/)
  - Files: `src/sync/sync-coordinator.ts`, `plugins/specweave-github/hooks/post-task-completion.sh`

- **Emergency Procedures**:
  - [Hook Crash Recovery Guide](../../operations/hook-crash-recovery.md)
  - [Circuit Breaker Reset Procedure](../../operations/circuit-breaker-monitoring.md)
