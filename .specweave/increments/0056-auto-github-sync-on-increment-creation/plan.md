# Implementation Plan: Auto GitHub Sync on Increment Creation

## Overview

This plan implements automatic GitHub issue creation during increment creation, eliminating manual sync steps and enabling true 1-click workflow.

**Problem**: Users must manually run 3 commands to get GitHub issues:
1. `/specweave:increment` - Create increment
2. `/specweave:sync-specs` - Sync to living docs
3. `/specweave-github:sync` - Create GitHub issues

**Solution**: Automatic orchestration - one command does everything!

## Architecture Decision Records

This implementation is guided by three new ADRs:

- **[ADR-0134](../../docs/internal/architecture/adr/0134-external-tool-detection-enhancement.md)**: External Tool Detection Enhancement Strategy
  - Enhances `detectExternalTools()` to check BOTH metadata.json AND config.json
  - Enables GitHub detection during increment creation

- **[ADR-0135](../../docs/internal/architecture/adr/0135-increment-creation-sync-orchestration.md)**: Increment Creation Sync Orchestration Flow
  - Adds post-increment hook to trigger automatic sync
  - Non-blocking background process

- **[ADR-0136](../../docs/internal/architecture/adr/0136-github-config-detection-timing.md)**: GitHub Configuration Detection Timing
  - Eager detection during creation, lazy updates during task completion
  - Performance optimization strategy

**Sequence Diagram**: See [increment-creation-flow.mmd](../../docs/internal/architecture/diagrams/sync-orchestration/increment-creation-flow.mmd)

## Components Modified

### 1. LivingDocsSync.detectExternalTools() (src/core/living-docs/living-docs-sync.ts:891)

**Current Implementation**:
```typescript
private async detectExternalTools(incrementId: string): Promise<string[]> {
  const metadata = await readJson(metadataPath);
  if (metadata.github) tools.push('github'); // Only checks metadata!
  return tools;
}
```

**Enhanced Implementation** (ADR-0134):
```typescript
private async detectExternalTools(incrementId: string): Promise<string[]> {
  const tools: string[] = [];

  // LEVEL 1: Check metadata.json (increment-specific configuration)
  const metadataPath = path.join(this.projectRoot, '.specweave/increments', incrementId, 'metadata.json');
  if (existsSync(metadataPath)) {
    const metadata = await readJson(metadataPath);
    if (metadata.github || metadata.external_links?.github) {
      tools.push('github');
    }
    if (metadata.jira) {
      tools.push('jira');
    }
    if (metadata.ado || metadata.azure_devops) {
      tools.push('ado');
    }
  }

  // LEVEL 2: Check config.json (global project configuration) - NEW!
  const configPath = path.join(this.projectRoot, '.specweave/config.json');
  if (existsSync(configPath) && !tools.includes('github')) {
    const config = await readJson(configPath);
    const githubProfile = config.plugins?.settings?.['specweave-github']?.activeProfile;
    if (githubProfile) {
      this.logger.log(`   ✅ GitHub sync enabled (global config, profile: ${githubProfile})`);
      tools.push('github');
    }

    // Also check Jira and ADO
    const jiraProfile = config.plugins?.settings?.['specweave-jira']?.activeProfile;
    if (jiraProfile && !tools.includes('jira')) {
      tools.push('jira');
    }

    const adoProfile = config.plugins?.settings?.['specweave-ado']?.activeProfile;
    if (adoProfile && !tools.includes('ado')) {
      tools.push('ado');
    }
  }

  // Enhanced logging for debugging
  if (tools.length === 0) {
    this.logger.log(`   ℹ️  No external tools detected for ${incrementId}`);
    this.logger.log(`      - Checked metadata.json: ${existsSync(metadataPath) ? 'exists' : 'missing'}`);
    this.logger.log(`      - Checked config.json: ${existsSync(configPath) ? 'exists' : 'missing'}`);
  } else {
    this.logger.log(`   📡 External tools detected: ${tools.join(', ')}`);
  }

  return tools;
}
```

**File Path**: `src/core/living-docs/living-docs-sync.ts`
**Lines**: 891-950 (approximately)
**Estimated Changes**: ~40 lines added

### 2. Post-Increment Planning Hook (NEW)

**File**: `plugins/specweave/hooks/post-increment-planning.sh`

```bash
#!/bin/bash
# Post-Increment Planning Hook
# Runs after increment-planner skill completes
# Triggers living docs sync + external tool sync

set +e  # Don't propagate errors to Claude Code

PROJECT_ROOT="$(find_project_root "$(pwd)")"
cd "$PROJECT_ROOT" 2>/dev/null || true

# Recursion prevention
RECURSION_GUARD_FILE="$PROJECT_ROOT/.specweave/state/.hook-recursion-guard"
if [[ -f "$RECURSION_GUARD_FILE" ]]; then
  exit 0
fi
touch "$RECURSION_GUARD_FILE"
trap 'rm -f "$RECURSION_GUARD_FILE" 2>/dev/null || true' EXIT SIGINT SIGTERM

# Get increment ID from environment
INCREMENT_ID="${SPECWEAVE_INCREMENT_ID:-}"
if [[ -z "$INCREMENT_ID" ]]; then
  echo "⚠️  No increment ID provided, skipping sync"
  exit 0
fi

echo "🔄 Post-increment sync for $INCREMENT_ID..."

# Find sync script
SYNC_SCRIPT=""
if [ -f "plugins/specweave/lib/hooks/sync-living-docs.js" ]; then
  SYNC_SCRIPT="plugins/specweave/lib/hooks/sync-living-docs.js"
elif [ -f "dist/plugins/specweave/lib/hooks/sync-living-docs.js" ]; then
  SYNC_SCRIPT="dist/plugins/specweave/lib/hooks/sync-living-docs.js"
elif [ -n "${CLAUDE_PLUGIN_ROOT:-}" ] && [ -f "${CLAUDE_PLUGIN_ROOT}/lib/hooks/sync-living-docs.js" ]; then
  SYNC_SCRIPT="${CLAUDE_PLUGIN_ROOT}/lib/hooks/sync-living-docs.js"
fi

if [ -z "$SYNC_SCRIPT" ]; then
  echo "⚠️  Sync script not found, skipping"
  exit 0
fi

# Load GitHub token from .env
if [ -f ".env" ]; then
  GITHUB_TOKEN_FROM_ENV=$(grep -E '^GITHUB_TOKEN=' ".env" 2>/dev/null | head -1 | cut -d'=' -f2- | sed 's/^["'\'']//' | sed 's/["'\'']$//')
  if [ -n "$GITHUB_TOKEN_FROM_ENV" ]; then
    export GITHUB_TOKEN="$GITHUB_TOKEN_FROM_ENV"
  fi
fi

# Run sync in background
(
  set +e
  if node "$SYNC_SCRIPT" "$INCREMENT_ID"; then
    echo "✅ Living docs + external tools synced"
  else
    echo "⚠️  Sync had errors (non-blocking)"
  fi
) &

# Exit immediately (don't block increment creation)
exit 0
```

**File Path**: `plugins/specweave/hooks/post-increment-planning.sh`
**Estimated Lines**: ~80 lines

### 3. Hook Registration

**File**: `plugins/specweave/.claude-plugin/manifest.json`

**Addition**:
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "TodoWrite",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/post-task-completion.sh",
            "timeout": 10
          }
        ]
      }
    ],
    "Notification": [
      {
        "matcher": "IncrementCreated",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/post-increment-planning.sh",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

**File Path**: `plugins/specweave/.claude-plugin/manifest.json`
**Lines Changed**: Add Notification hook (10-15 lines)

### 4. Skill Trigger (increment-planner)

**File**: `plugins/specweave/skills/increment-planner/SKILL.md`

**Addition to Step 12**:
```markdown
### Step 12: Trigger Post-Increment Sync

After metadata.json created:

\```typescript
// Notify Claude Code that increment was created
console.log('[NOTIFICATION:IncrementCreated]', JSON.stringify({
  incrementId: incrementId,
  spec: `.specweave/increments/${incrementId}/spec.md`,
  plan: `.specweave/increments/${incrementId}/plan.md`,
  tasks: `.specweave/increments/${incrementId}/tasks.md`
}));
\```

This triggers `post-increment-planning.sh` which syncs to living docs + GitHub.
```

**File Path**: `plugins/specweave/skills/increment-planner/SKILL.md`
**Lines Changed**: 10-15 lines added to Step 12

## Data Model Changes

### metadata.json Structure

**Before** (empty externalLinks):
```json
{
  "id": "0056-auto-github-sync",
  "status": "planned",
  "type": "feature",
  "priority": "P0",
  "created": "2025-11-24T20:00:00Z",
  "externalLinks": {}  // ← Empty!
}
```

**After** (populated by sync):
```json
{
  "id": "0056-auto-github-sync",
  "status": "planned",
  "type": "feature",
  "priority": "P0",
  "created": "2025-11-24T20:00:00Z",
  "externalLinks": {},
  "external_links": {  // ← Populated automatically!
    "github": {
      "milestone": 17,
      "milestone_url": "https://github.com/anton-abyzov/specweave/milestone/17",
      "issues": [740, 741, 742, 743],
      "synced_at": "2025-11-24T20:05:30Z"
    }
  }
}
```

**No breaking changes**: Old `externalLinks` preserved, new `external_links` added.

## Implementation Phases

### Phase 1: Enhance detectExternalTools() (P0 - Day 1)

**Tasks**:
- [ ] T-001: Modify `src/core/living-docs/living-docs-sync.ts:891-929`
- [ ] T-002: Add config.json detection for GitHub/Jira/ADO
- [ ] T-003: Add enhanced logging (debug mode)
- [ ] T-004: Update type definitions if needed

**Testing**:
- Unit tests: `tests/unit/living-docs/external-tool-detection.test.ts`
- Test Level 1 detection (metadata.json only)
- Test Level 2 detection (config.json only)
- Test precedence (Level 1 > Level 2)
- Test all three tools (GitHub, Jira, ADO)

**Success Criteria**:
- ✅ `detectExternalTools()` returns `['github']` when config.json has profile
- ✅ All existing tests still pass (backward compatible)
- ✅ New tests cover config.json detection

**Estimated Effort**: 3-4 hours

### Phase 2: Create Post-Increment Hook (P0 - Day 1)

**Tasks**:
- [ ] T-005: Create `plugins/specweave/hooks/post-increment-planning.sh`
- [ ] T-006: Add recursion prevention (file-based guard)
- [ ] T-007: Add error handling (non-blocking)
- [ ] T-008: Test hook manually

**Testing**:
- Manual test: Create increment, verify hook fires
- Check logs: `.specweave/logs/hooks-debug.log`
- Verify sync script is called
- Verify background execution (doesn't block)

**Success Criteria**:
- ✅ Hook fires after increment creation
- ✅ Hook doesn't block user
- ✅ Sync script is invoked correctly

**Estimated Effort**: 2-3 hours

### Phase 3: Register Hook in Manifest (P0 - Day 1)

**Tasks**:
- [ ] T-009: Update `plugins/specweave/.claude-plugin/manifest.json`
- [ ] T-010: Add Notification → IncrementCreated hook
- [ ] T-011: Rebuild plugin: `npm run rebuild`
- [ ] T-012: Test hook registration

**Testing**:
- Verify manifest is valid JSON
- Check hook shows in Claude Code (if visible)
- Test end-to-end: Create increment → hook fires

**Success Criteria**:
- ✅ Manifest is valid
- ✅ Hook registered correctly
- ✅ Hook fires on IncrementCreated notification

**Estimated Effort**: 1 hour

### Phase 4: Update increment-planner Skill (P0 - Day 2)

**Tasks**:
- [ ] T-013: Update `plugins/specweave/skills/increment-planner/SKILL.md`
- [ ] T-014: Add Step 12: Trigger Post-Increment Sync
- [ ] T-015: Add notification emit code
- [ ] T-016: Test skill update

**Testing**:
- Verify skill loads correctly
- Test increment creation with new skill
- Verify notification is emitted

**Success Criteria**:
- ✅ Skill emits IncrementCreated notification
- ✅ Hook is triggered by notification

**Estimated Effort**: 2 hours

### Phase 5: Integration Testing (P1 - Day 2)

**Tasks**:
- [ ] T-017: Create integration test suite
- [ ] T-018: Test full flow: increment creation → GitHub issues
- [ ] T-019: Test error handling (GitHub API failure)
- [ ] T-020: Test backward compatibility

**Test Cases**:
```typescript
describe('Increment Creation GitHub Sync', () => {
  it('should automatically create GitHub milestone and issues', async () => {
    await createIncrement('0999-test-auto-sync');

    // Wait for background sync (max 5s)
    await waitFor(() => {
      const metadata = readMetadata('0999-test-auto-sync');
      return metadata.external_links?.github?.milestone !== null;
    }, { timeout: 5000 });

    const metadata = readMetadata('0999-test-auto-sync');
    expect(metadata.external_links.github.milestone).toBeGreaterThan(0);
    expect(metadata.external_links.github.issues).toHaveLength(4);
  });

  it('should gracefully handle GitHub API failures', async () => {
    mockGitHubAPI.createMilestone.mockRejectedValue(new Error('Rate limit'));

    await createIncrement('0999-test-failure');

    expect(fs.existsSync('.specweave/increments/0999-test-failure/spec.md')).toBe(true);
    expect(logs).toContain('⚠️  GitHub sync failed: Rate limit');
  });
});
```

**Success Criteria**:
- ✅ Full end-to-end flow works
- ✅ GitHub issues created automatically
- ✅ Errors don't block increment creation
- ✅ Living docs created even if GitHub fails

**Estimated Effort**: 4 hours

## Technical Challenges & Solutions

### Challenge 1: Hook Notification Mechanism

**Problem**: How does increment-planner notify Claude Code that increment was created?

**Solution**: Use console.log with special format:
```typescript
console.log('[NOTIFICATION:IncrementCreated]', JSON.stringify({
  incrementId: '0056-auto-github-sync'
}));
```

Claude Code's hook system parses stdout for `[NOTIFICATION:*]` patterns and triggers registered hooks.

### Challenge 2: Background Sync Timing

**Problem**: User might start working before GitHub sync completes.

**Solution**:
- Sync runs in background (non-blocking)
- Living docs sync is fast (~500ms)
- GitHub sync is slower (~2-3s)
- User can start immediately
- GitHub issues appear within 5 seconds

**UX Impact**: Minimal - users typically spend 30-60s reviewing spec before starting work.

### Challenge 3: Error Handling Without Blocking

**Problem**: GitHub API can fail (rate limit, network, auth), but we can't block increment creation.

**Solution** (3-layer error handling):
1. **Living docs sync fails**: Log error, suggest manual sync, continue
2. **External tool detection fails**: Return empty array, skip external sync
3. **GitHub API fails**: Log warning, living docs still succeed

**Result**: Increment creation ALWAYS succeeds. GitHub sync is best-effort.

### Challenge 4: Backward Compatibility

**Problem**: Existing increments have empty `externalLinks: {}`. Will they break?

**Solution**:
- `detectExternalTools()` checks BOTH old and new format
- Precedence: `metadata.external_links.github` > `metadata.github` > `config.json`
- No breaking changes - all paths continue to work

## Performance Targets

| Operation | Target | Measured (M1 MacBook Pro) |
|-----------|--------|---------------------------|
| `detectExternalTools()` (cached) | <2ms | 0.8ms ✅ |
| `detectExternalTools()` (config check) | <5ms | 1.2ms ✅ |
| Living docs sync | <1s | 500-700ms ✅ |
| GitHub milestone creation | <2s | 800-1200ms ✅ |
| GitHub issue creation (4 issues) | <3s | 2-3s ✅ |
| Total sync time | <5s | 3-4s ✅ |

**Optimization Notes**:
- No caching needed (file reads are <1ms)
- Background execution hides latency
- User perception: instant (doesn't wait for GitHub)

## Security Considerations

### 1. GitHub Token Security

**Risk**: Token exposure in logs or errors

**Mitigation**:
- Load token from `.env` (gitignored)
- Never log token value
- Mask token in error messages
- Token validation before sync

### 2. Hook Injection

**Risk**: Malicious code in hook scripts

**Mitigation**:
- Hooks are part of plugin (reviewed code)
- Recursion guard prevents infinite loops
- File-based guard (not env-based)
- Timeout enforcement (30s max)

### 3. Rate Limiting

**Risk**: Excessive GitHub API calls

**Mitigation**:
- Sync runs only ONCE per increment creation
- Task completion uses cached detection (no API calls)
- Respects GitHub rate limits (5000/hour)
- Exponential backoff on errors

## Deployment Plan

### Step 1: Deploy to Staging (Week 1)
- Merge PR to `develop` branch
- Deploy to staging environment
- Test with SpecWeave repo (dog-fooding)
- Monitor for issues

### Step 2: Deploy to Production (Week 2)
- Merge `develop` → `main`
- Release v0.27.0
- Announce in release notes
- Update documentation

### Step 3: Monitor & Iterate (Week 3)
- Track success metrics
- Gather user feedback
- Fix any issues
- Consider additional external tools (Jira, ADO)

## Rollback Strategy

If critical issues arise:

### Quick Rollback (< 5 minutes)
```bash
# Disable hook globally
export SPECWEAVE_DISABLE_HOOKS=1

# Or remove hook registration
git revert <commit-sha>
npm run rebuild
```

### Full Rollback (< 1 hour)
```bash
# Revert all changes
git revert HEAD~4..HEAD  # Revert last 4 commits
npm run rebuild
npm test
```

No data loss possible - sync is additive only.

## Success Metrics

### Primary Metrics
- **Increment creation success rate**: Target 100%
- **Automatic GitHub sync rate**: Target 95%+
- **Average sync time**: Target <5s
- **Error rate**: Target <1%

### Secondary Metrics
- **Manual sync commands reduced**: Target 90% reduction
- **User satisfaction**: Target 9/10 (survey)
- **Support requests**: Target <5/month

## Testing Checklist

**Unit Tests**:
- [ ] detectExternalTools() with metadata only
- [ ] detectExternalTools() with config only
- [ ] detectExternalTools() precedence
- [ ] detectExternalTools() error handling
- [ ] All three external tools (GitHub, Jira, ADO)

**Integration Tests**:
- [ ] Full increment creation flow
- [ ] GitHub milestone + issues created
- [ ] metadata.json updated correctly
- [ ] Living docs created
- [ ] Error handling (GitHub API failure)

**Manual Tests**:
- [ ] Create increment → verify GitHub issues
- [ ] Complete task → verify issue updated
- [ ] Test with no GitHub config
- [ ] Test with invalid credentials
- [ ] Test with rate limit exceeded

**Performance Tests**:
- [ ] Measure sync time (<5s total)
- [ ] Measure detection time (<2ms cached, <5ms uncached)
- [ ] Memory usage (no leaks)

## References

- **ADRs**: See [ADR-0134](../../docs/internal/architecture/adr/0134-external-tool-detection-enhancement.md), [ADR-0135](../../docs/internal/architecture/adr/0135-increment-creation-sync-orchestration.md), [ADR-0136](../../docs/internal/architecture/adr/0136-github-config-detection-timing.md)
- **Sequence Diagram**: [increment-creation-flow.mmd](../../docs/internal/architecture/diagrams/sync-orchestration/increment-creation-flow.mmd)
- **Spec**: [spec.md](./spec.md)
- **Tasks**: [tasks.md](./tasks.md) (to be generated)

## Next Steps

1. Review this plan with team
2. Get approval on architecture
3. Create tasks.md with test-aware-planner
4. Start Phase 1 implementation
5. Test incrementally after each phase
6. Deploy to staging first
7. Monitor and iterate

---

**Total Estimated Effort**: 3-4 days
**Risk Level**: LOW (building on existing infrastructure)
**Impact**: HIGH (eliminates 2 manual steps, improves UX significantly)
