# ADR-0022: GitHub Sync Verification Architecture

**Date**: 2025-11-10
**Status**: Accepted

## Context

SpecWeave supports bidirectional sync between increments and GitHub issues via the `specweave-github` plugin. However, there's currently no verification that sync happens correctly after increment completion.

**Current Problems**:
1. **No completion verification** - No check that GitHub issue is closed when increment completes
2. **Metadata drift** - `metadata.json` may have issue number, but issue state unknown
3. **Manual sync required** - User must remember to close GitHub issue
4. **Stale issues** - GitHub issues stay open after increment completes
5. **No audit trail** - No log of sync actions

**Key Requirements**:
- Verify GitHub sync after increment completion
- Auto-close GitHub issue if still open
- Validate metadata.json has github.issue field
- Use GitHub CLI (`gh`) for all operations
- Log all sync actions for audit trail
- Non-blocking (don't fail increment closure if GitHub unavailable)

**Sync Flow**:
```
Increment Complete → Hook Fires → Check Metadata → Verify Issue → Close if Open → Log
```

## Decision

Implement a **post-increment-completion hook** that verifies GitHub sync and auto-closes issues when increments complete.

### Hook Design

**Name**: `post-increment-completion.sh`
**Location**: `plugins/specweave/hooks/post-increment-completion.sh`
**Trigger**: Runs automatically when increment marked complete

**Workflow**:
```bash
#!/bin/bash
# Post-Increment Completion Hook
# Verifies GitHub sync and auto-closes issue if needed

INCREMENT_ID="$1"
INCREMENT_PATH=".specweave/increments/$INCREMENT_ID"
METADATA_PATH="$INCREMENT_PATH/metadata.json"

# Phase 1: Check if GitHub sync enabled
if ! jq -e '.sync.enabled' .specweave/config.json > /dev/null; then
  echo "ℹ️  GitHub sync not enabled, skipping"
  exit 0
fi

# Phase 2: Load metadata
if [ ! -f "$METADATA_PATH" ]; then
  echo "⚠️  No metadata.json found for $INCREMENT_ID"
  exit 0
fi

ISSUE_NUMBER=$(jq -r '.github.issue // empty' "$METADATA_PATH")

if [ -z "$ISSUE_NUMBER" ]; then
  echo "ℹ️  No GitHub issue linked to $INCREMENT_ID"
  exit 0
fi

# Phase 3: Check issue state
ISSUE_STATE=$(gh issue view "$ISSUE_NUMBER" --json state -q .state 2>/dev/null)

if [ -z "$ISSUE_STATE" ]; then
  echo "⚠️  Failed to fetch GitHub issue #$ISSUE_NUMBER (gh CLI not authenticated?)"
  exit 0  # Non-blocking
fi

# Phase 4: Close issue if open
if [ "$ISSUE_STATE" = "OPEN" ]; then
  echo "🔗 Closing GitHub issue #$ISSUE_NUMBER for completed increment $INCREMENT_ID"

  # Generate completion summary
  SUMMARY=$(cat "$INCREMENT_PATH/spec.md" | head -20 | tail -10)
  COMMENT="✅ Increment $INCREMENT_ID completed\n\n$SUMMARY\n\nClosed automatically by SpecWeave"

  # Close issue with comment
  gh issue close "$ISSUE_NUMBER" --comment "$COMMENT"

  if [ $? -eq 0 ]; then
    echo "✅ GitHub issue #$ISSUE_NUMBER closed"
  else
    echo "⚠️  Failed to close issue #$ISSUE_NUMBER"
  fi
else
  echo "✅ GitHub issue #$ISSUE_NUMBER already closed"
fi

# Phase 5: Log sync action
LOG_DIR=".specweave/logs"
mkdir -p "$LOG_DIR"
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | $INCREMENT_ID | issue:$ISSUE_NUMBER | state:$ISSUE_STATE | action:verified" >> "$LOG_DIR/github-sync.log"

exit 0
```

### Metadata Structure

**metadata.json format** (created by `/specweave-github:create-issue`):
```json
{
  "increment": "0018-strict-discipline",
  "status": "completed",
  "github": {
    "issue": 123,
    "url": "https://github.com/anton-abyzov/specweave/issues/123",
    "createdAt": "2025-11-10T10:00:00Z",
    "closedAt": "2025-11-10T12:00:00Z"  // Updated by hook
  }
}
```

### Error Handling

**Scenario 1: GitHub CLI Not Available**
```bash
if ! command -v gh &> /dev/null; then
  echo "ℹ️  GitHub CLI not found, skipping sync verification"
  exit 0  # Non-blocking
fi
```

**Scenario 2: Authentication Failure**
```bash
if ! gh auth status &> /dev/null; then
  echo "⚠️  GitHub CLI not authenticated, skipping sync verification"
  echo "💡 Run: gh auth login"
  exit 0  # Non-blocking
fi
```

**Scenario 3: Issue Not Found**
```bash
ISSUE_STATE=$(gh issue view "$ISSUE_NUMBER" --json state -q .state 2>/dev/null)

if [ -z "$ISSUE_STATE" ]; then
  echo "⚠️  Issue #$ISSUE_NUMBER not found (deleted or access denied)"
  exit 0  # Non-blocking
fi
```

**Scenario 4: Rate Limit Exceeded**
```bash
if [[ "$ERROR" == *"rate limit"* ]]; then
  echo "⚠️  GitHub API rate limit exceeded, will retry later"
  exit 0  # Non-blocking
fi
```

**Key Design Principle**: All errors are **non-blocking** (exit 0). The increment can complete even if GitHub sync fails.

## Alternatives Considered

### Alternative 1: Synchronous Sync in /done Command

**Approach**: `/specweave:done` command closes GitHub issue directly

**Pros**:
- Simpler (no hook needed)
- Immediate feedback to user
- Synchronous (user sees result)

**Cons**:
- Blocks increment closure if GitHub unavailable
- Slower (network call in CLI)
- Inconsistent (only works via /done, not manual completion)
- Can't be disabled (always runs)

**Why Not**: Increment closure should be **fast** and **non-blocking**. GitHub sync is secondary to local completion.

### Alternative 2: Polling-Based Sync

**Approach**: Background process polls for completed increments, syncs to GitHub

**Pros**:
- Asynchronous (doesn't block anything)
- Can retry on failures
- Batched (multiple increments at once)

**Cons**:
- Complex (need background process/daemon)
- Resource intensive (continuous polling)
- Delayed (sync may happen minutes later)
- Hard to debug (opaque background process)

**Why Not**: Over-engineered. Hooks are simpler and provide immediate sync.

### Alternative 3: Webhook-Based Sync

**Approach**: GitHub webhooks trigger SpecWeave to update local state

**Pros**:
- Real-time updates from GitHub
- Bidirectional sync (GitHub → Local)

**Cons**:
- Requires public endpoint (security risk)
- Complex setup (webhook configuration)
- Only works for GitHub → Local (doesn't close issues)
- Overkill for simple sync

**Why Not**: We need **Local → GitHub** sync (closing issues), not GitHub → Local.

## Consequences

### Positive

✅ **Automatic Sync**: Issues close automatically when increments complete
✅ **Non-Blocking**: GitHub unavailability doesn't block increment closure
✅ **Audit Trail**: All sync actions logged to `.specweave/logs/github-sync.log`
✅ **Metadata Validation**: Verifies metadata.json has correct structure
✅ **Graceful Degradation**: Works without GitHub CLI (just skips sync)
✅ **Clear Feedback**: User sees sync status in terminal
✅ **Idempotent**: Safe to run multiple times (checks current state)

### Negative

❌ **GitHub CLI Dependency**: Requires `gh` CLI installed and authenticated
❌ **Platform Differences**: Shell script may behave differently on Windows
❌ **Error Handling**: Need robust parsing of gh CLI output
❌ **Rate Limits**: May hit GitHub API rate limits (5000/hour)

### Neutral

⚪ **Performance**: Negligible (\&lt;2s network call)
⚪ **Maintenance**: Need to keep sync logic in sync with GitHub API changes
⚪ **Testing**: Need integration tests with GitHub (or mocks)

## Implementation Notes

### File Structure

```
plugins/
└── specweave/
    └── hooks/
        └── post-increment-completion.sh   # New hook

src/
└── core/
    └── increment/
        └── metadata-validator.ts          # Validates metadata.json structure

tests/
├── integration/
│   └── github-sync.spec.ts                # Integration tests
└── e2e/
    └── increment-completion.spec.ts       # E2E tests
```

### Hook Installation

Hooks are automatically installed during `specweave init`:
```typescript
// src/cli/commands/init.ts
await installHooks(projectRoot, [
  'post-task-completion',
  'post-increment-planning',
  'post-increment-completion',  // NEW
]);
```

### Metadata Validator

**New utility** (`src/core/increment/metadata-validator.ts`):
```typescript
export class MetadataValidator {
  /**
   * Validate metadata.json structure
   */
  validate(metadata: any): ValidationResult {
    const errors: string[] = [];

    // Required fields
    if (!metadata.increment) {
      errors.push('Missing field: increment');
    }

    if (!metadata.status) {
      errors.push('Missing field: status');
    }

    // GitHub sync fields (if sync enabled)
    if (metadata.github) {
      if (!metadata.github.issue) {
        errors.push('Missing field: github.issue');
      }
      if (!metadata.github.url) {
        errors.push('Missing field: github.url');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Detect inconsistencies (e.g., status:completed but github:open)
   */
  detectInconsistencies(metadata: any, githubState: string): string[] {
    const issues: string[] = [];

    if (metadata.status === 'completed' && githubState === 'OPEN') {
      issues.push('Increment completed but GitHub issue still open');
    }

    if (metadata.status === 'active' && githubState === 'CLOSED') {
      issues.push('Increment active but GitHub issue already closed');
    }

    return issues;
  }
}
```

### Logging Format

**Log file**: `.specweave/logs/github-sync.log`

**Format**:
```
2025-11-10T10:00:00Z | 0018-strict-discipline | issue:123 | state:OPEN | action:closed | result:success
2025-11-10T10:05:00Z | 0019-ai-reflection | issue:124 | state:OPEN | action:closed | result:failed | error:rate_limit
```

**Fields**:
- Timestamp (ISO 8601 UTC)
- Increment ID
- GitHub issue number
- Issue state (OPEN/CLOSED)
- Action (closed/verified/skipped)
- Result (success/failed)
- Error (if failed)

### Testing Strategy

**Integration Tests** (with GitHub mocks):
```typescript
describe('GitHub Sync Hook', () => {
  test('closes open issue on completion', async () => {
    // Setup: Create increment with GitHub issue
    await createIncrement('0018-test', { github: { issue: 123 } });
    mockGitHubAPI({ issue: 123, state: 'OPEN' });

    // Execute: Complete increment
    await completeIncrement('0018-test');

    // Verify: Hook closed issue
    expect(mockGitHubAPI.issueClosed(123)).toBe(true);
    expect(logContains('action:closed')).toBe(true);
  });

  test('skips if issue already closed', async () => {
    // Setup: Create increment with closed issue
    await createIncrement('0018-test', { github: { issue: 123 } });
    mockGitHubAPI({ issue: 123, state: 'CLOSED' });

    // Execute: Complete increment
    await completeIncrement('0018-test');

    // Verify: Hook skipped close
    expect(logContains('action:verified')).toBe(true);
    expect(logContains('already closed')).toBe(true);
  });

  test('non-blocking if GitHub unavailable', async () => {
    // Setup: Create increment
    await createIncrement('0018-test', { github: { issue: 123 } });
    mockGitHubAPI({ unavailable: true });

    // Execute: Complete increment
    const result = await completeIncrement('0018-test');

    // Verify: Completion succeeded despite GitHub failure
    expect(result.success).toBe(true);
    expect(logContains('action:skipped')).toBe(true);
  });
});
```

**E2E Tests** (Playwright):
```typescript
test('full increment lifecycle with GitHub sync', async () => {
  // 1. Create increment
  await runCommand('specweave increment "test feature"');

  // 2. Verify GitHub issue created
  const metadata = await readMetadata('0018-test');
  expect(metadata.github.issue).toBeDefined();

  // 3. Complete increment
  await runCommand('specweave done 0018-test');

  // 4. Verify GitHub issue closed
  const issue = await checkGitHubIssue(metadata.github.issue);
  expect(issue.state).toBe('CLOSED');
});
```

## Related Decisions

- **ADR-0020**: CLI Discipline Validation (checks increment status)
- **ADR-0021**: PM Agent Enforcement (prevents new increments with incomplete work)
- **ADR-0016**: Multi-Project External Sync (defines sync architecture)

## Migration Plan

**Phase 1: Implement Hook** (Day 1)
- Create `post-increment-completion.sh`
- Implement metadata validation
- Add logging
- Unit tests

**Phase 2: Integration** (Day 2)
- Install hook during `specweave init`
- Test with real GitHub repository
- Verify non-blocking behavior

**Phase 3: Testing** (Day 3)
- Integration tests with GitHub mocks
- E2E tests with real GitHub API
- Test error scenarios (rate limits, auth failures)

**Phase 4: Documentation** (Day 4)
- Update GitHub sync docs
- Add troubleshooting guide
- Create examples

## Acceptance Criteria

- [ ] Hook `post-increment-completion.sh` implemented
- [ ] Hook verifies metadata.json has github.issue field
- [ ] Hook checks GitHub issue state via `gh issue view`
- [ ] Hook auto-closes issue if still open
- [ ] Hook logs all actions to `.specweave/logs/github-sync.log`
- [ ] Hook is non-blocking (exits 0 on all errors)
- [ ] MetadataValidator class implemented
- [ ] Integration tests: All sync scenarios
- [ ] E2E tests: Full lifecycle with GitHub
- [ ] Documentation: GitHub sync architecture + troubleshooting

## References

- **Hook**: `plugins/specweave/hooks/post-increment-completion.sh`
- **Validator**: `src/core/increment/metadata-validator.ts`
- **Plugin**: `plugins/specweave-github/`
- **Spec**: `.specweave/docs/internal/projects/default/specs/spec-018-strict-discipline-enforcement.md`
- **Increment**: `0018-strict-increment-discipline-enforcement`
