# Automatic Sync Cascade Analysis

**Date**: 2025-11-20
**Context**: Ensure increment completion triggers automatic cascade: living docs → specs → external tools
**Analysis By**: Claude (Sonnet 4.5)

---

## Executive Summary

**User Request**: "Make sure that once increment is completed it triggers update for living docs (which triggers update to living specs under the hood) and which triggers update to external tool (only if connected)!"

**Current State**: ✅ Living docs sync is automatic, ❌ External tool sync is only PARTIALLY automatic (GitHub issue closure only, not content updates)

**Gap**: Full external tool sync (GitHub content updates, JIRA, ADO) requires manual commands (`/specweave-github:sync`, `/specweave-jira:sync`, `/specweave-ado:sync`)

**Solution**: Enhance `SyncCoordinator` to support all external tools automatically on increment completion.

---

## Current State Analysis

### ✅ What Works (Automatic)

#### 1. Living Docs Sync
**Location**: `plugins/specweave/hooks/post-increment-completion.sh` (lines 94-229)

**Flow**:
```
/specweave:done 0047 (validates & closes)
    ↓
post-increment-completion.sh hook fires
    ↓
sync-living-docs.js executes
    ↓
LivingDocsSync.syncIncrement()
    ↓
Creates/updates:
  - .specweave/docs/internal/specs/specweave/FS-047/FEATURE.md
  - .specweave/docs/internal/specs/specweave/FS-047/us-001.md
  - .specweave/docs/internal/specs/specweave/FS-047/us-002.md
  - ... (all user stories)
    ↓
syncUSTasksToLivingDocs() (v0.23.0+)
    ↓
Updates task lists in US files
```

**Trigger**: Automatic (hook-based, always runs)
**Configuration**:
- `hooks.post_task_completion.sync_living_docs` (legacy, defaults to true)
- Hook now runs unconditionally (v0.24.0+)

**Status**: ✅ **WORKING** - Living docs sync is reliable and automatic

#### 2. GitHub Issue Closure
**Location**: `plugins/specweave/hooks/post-increment-completion.sh` (lines 47-87)

**Flow**:
```
post-increment-completion.sh
    ↓
Reads metadata.json for github.issue
    ↓
If issue exists:
  gh issue close <number> --comment "Completion summary"
```

**Status**: ✅ **WORKING** - GitHub issues close automatically

---

### ❌ What's Missing (Manual Only)

#### 3. GitHub Issue Content Update
**Expected**: When increment completes, GitHub issue body should be updated with:
- Final task checklist (all tasks marked complete)
- Final acceptance criteria status
- Completion summary with stats

**Current Reality**: Issue gets CLOSED but body is NOT updated automatically

**Manual Workaround**: User must run `/specweave-github:sync 0047` separately

#### 4. JIRA Sync
**Expected**: If JIRA epic/stories are linked, update them on completion:
- Mark epic as "Done"
- Update story statuses
- Post completion comment

**Current Reality**: No automatic sync, user must run `/specweave-jira:sync 0047`

#### 5. Azure DevOps Sync
**Expected**: If ADO work items are linked, update them on completion:
- Mark work item as "Closed"
- Update completion percentage (100%)
- Post completion comment

**Current Reality**: No automatic sync, user must run `/specweave-ado:sync 0047`

---

## Architecture Deep Dive

### Existing Sync Infrastructure

#### SyncCoordinator (`src/sync/sync-coordinator.ts`)

**Purpose**: High-level coordinator for format-preserving sync

**Current Implementation**:
```typescript
async syncIncrementCompletion(): Promise<SyncResult> {
  // 1. Load config
  const config = await this.loadConfig();

  // 2. Check canUpdateExternalItems permission
  if (!config.sync?.settings?.canUpdateExternalItems) {
    return { success: true, syncMode: 'read-only' };
  }

  // 3. Load user stories for increment
  const userStories = await this.loadUserStoriesForIncrement();

  // 4. Sync each user story
  for (const usFile of userStories) {
    const externalSource = usFile.external_source || 'github';

    if (externalSource === 'github') {
      // ✅ GitHub sync implemented (lines 136-148)
      const client = GitHubClientV2.fromRepo(owner, repo);
      await syncService.syncUserStory(usFile, completionData, client);
    } else {
      // ❌ JIRA/ADO sync stubbed (line 148)
      this.logger.log(`⚠️ ${externalSource} sync not yet implemented`);
    }
  }
}
```

**Status**: ✅ GitHub works, ❌ JIRA/ADO stubbed

#### FormatPreservationSyncService (`src/sync/format-preservation-sync.ts`)

**Purpose**: Sync user stories to external tools while preserving their format

**Key Method**:
```typescript
async syncUserStory(
  usFile: LivingDocsUSFile,
  completionData: CompletionCommentData,
  client: GitHubClientV2
): Promise<void>
```

**Status**: ✅ GitHub-specific, needs JIRA/ADO adapters

---

## Root Cause Analysis

### Why External Tool Sync Is Not Automatic

**Primary Issue**: `SyncCoordinator.syncIncrementCompletion()` only supports GitHub

**Evidence**:
1. Lines 136-148 of `sync-coordinator.ts`: GitHub branch exists
2. Line 148: `else` branch logs "not yet implemented" for other tools
3. `sync-living-docs.js` line 58 calls `syncWithFormatPreservation()` which uses `SyncCoordinator`
4. But `SyncCoordinator` doesn't handle JIRA/ADO → sync stops at GitHub

**Secondary Issue**: JIRA/ADO client adapters not integrated

**Evidence**:
1. `plugins/specweave-jira/lib/jira-*-sync.ts` files exist (implementations)
2. `plugins/specweave-ado/lib/ado-*-sync.ts` files exist (implementations)
3. BUT: `SyncCoordinator` doesn't import or use them
4. Manual commands (`/specweave-jira:sync`, `/specweave-ado:sync`) work fine
5. Just needs integration into automatic flow

---

## Gap Analysis

| Sync Type | Current State | Expected State | Gap |
|-----------|---------------|----------------|-----|
| **Living Docs → Specs** | ✅ Automatic | ✅ Automatic | None |
| **GitHub Issue Closure** | ✅ Automatic | ✅ Automatic | None |
| **GitHub Content Update** | ❌ Manual | ✅ Automatic | Need to call GitHub sync |
| **JIRA Sync** | ❌ Manual | ✅ Automatic (if configured) | Need to integrate JIRA client |
| **ADO Sync** | ❌ Manual | ✅ Automatic (if configured) | Need to integrate ADO client |

---

## Solution Architecture

### Approach: Extend SyncCoordinator

**Rationale**:
- ✅ Infrastructure already exists (`SyncCoordinator`, `FormatPreservationSyncService`)
- ✅ JIRA/ADO sync implementations exist (in plugins)
- ✅ Just need to wire them together
- ✅ Maintains separation of concerns (coordinator delegates to tool-specific syncs)

### Enhanced SyncCoordinator Pseudocode

```typescript
async syncIncrementCompletion(): Promise<SyncResult> {
  // 1. Load config (unchanged)
  const config = await this.loadConfig();

  // 2. Check master permission (unchanged)
  if (!config.sync?.settings?.canUpdateExternalItems) {
    return { success: true, syncMode: 'read-only' };
  }

  // 3. Load user stories (unchanged)
  const userStories = await this.loadUserStoriesForIncrement();

  // 4. NEW: Sync to ALL configured external tools
  for (const usFile of userStories) {
    const externalSource = usFile.external_source || 'github';

    // GitHub sync (existing)
    if (externalSource === 'github' && config.sync?.github?.enabled) {
      const client = GitHubClientV2.fromRepo(owner, repo);
      await syncService.syncUserStory(usFile, completionData, client);
    }

    // JIRA sync (NEW)
    else if (externalSource === 'jira' && config.sync?.jira?.enabled) {
      const { JiraHierarchicalSync } = await import('../../plugins/specweave-jira/lib/jira-hierarchical-sync.js');
      const jiraSync = new JiraHierarchicalSync(/* ... */);
      await jiraSync.syncIncrement(this.incrementId, { direction: 'bidirectional' });
    }

    // ADO sync (NEW)
    else if (externalSource === 'ado' && config.sync?.ado?.enabled) {
      const { AdoHierarchicalSync } = await import('../../plugins/specweave-ado/lib/ado-hierarchical-sync.js');
      const adoSync = new AdoHierarchicalSync(/* ... */);
      await adoSync.syncIncrement(this.incrementId, { direction: 'bidirectional' });
    }
  }

  return result;
}
```

---

## Configuration Strategy

### Proposed `.specweave/config.json` Schema

```json
{
  "sync": {
    "settings": {
      "canUpdateExternalItems": true,    // ✅ Exists (master switch)
      "canUpdateStatus": true,            // ✅ Exists (status sync)
      "autoSyncOnCompletion": true        // 🆕 NEW (auto-sync on /specweave:done)
    },
    "github": {
      "enabled": true,                    // 🆕 NEW (per-tool enable)
      "owner": "anton-abyzov",            // ✅ Exists (can auto-detect from git)
      "repo": "specweave"                 // ✅ Exists (can auto-detect from git)
    },
    "jira": {
      "enabled": true,                    // 🆕 NEW
      "domain": "company.atlassian.net",  // ✅ Exists (from env vars)
      "projectKey": "SCRUM",              // ✅ Exists
      "email": "user@company.com",        // ✅ Exists (from env vars)
      "apiToken": "${JIRA_API_TOKEN}"     // ✅ Exists (from env vars)
    },
    "ado": {
      "enabled": true,                    // 🆕 NEW
      "organization": "myorg",            // ✅ Exists (from env vars)
      "project": "MyProject",             // ✅ Exists
      "pat": "${ADO_PAT}"                 // ✅ Exists (from env vars)
    }
  }
}
```

### Configuration Hierarchy (Priority Order)

1. **Master Switch**: `sync.settings.canUpdateExternalItems` (blocks ALL external sync if false)
2. **Auto-Sync Switch**: `sync.settings.autoSyncOnCompletion` (blocks automatic sync only, manual still works)
3. **Per-Tool Switch**: `sync.<tool>.enabled` (blocks specific tool sync)

**Example Scenarios**:

```json
// Scenario 1: Auto-sync to GitHub only
{
  "sync": {
    "settings": { "canUpdateExternalItems": true, "autoSyncOnCompletion": true },
    "github": { "enabled": true },
    "jira": { "enabled": false },
    "ado": { "enabled": false }
  }
}

// Scenario 2: Auto-sync to all tools
{
  "sync": {
    "settings": { "canUpdateExternalItems": true, "autoSyncOnCompletion": true },
    "github": { "enabled": true },
    "jira": { "enabled": true },
    "ado": { "enabled": true }
  }
}

// Scenario 3: Disable auto-sync (manual only)
{
  "sync": {
    "settings": { "canUpdateExternalItems": true, "autoSyncOnCompletion": false },
    "github": { "enabled": true }
  }
}
// Users can still run /specweave-github:sync manually

// Scenario 4: Completely disable external sync
{
  "sync": {
    "settings": { "canUpdateExternalItems": false }
  }
}
// Manual commands also blocked (read-only mode)
```

---

## Implementation Plan

### Phase 1: Enhance SyncCoordinator (Core)

**File**: `src/sync/sync-coordinator.ts`

**Tasks**:
1. **T-001**: Add JIRA sync branch in `syncUserStory()` method
   - Import `JiraHierarchicalSync` from plugin
   - Create JIRA client from config
   - Call `syncIncrement()` with bidirectional direction
   - Handle errors gracefully (log, don't crash)

2. **T-002**: Add ADO sync branch in `syncUserStory()` method
   - Import `AdoHierarchicalSync` from plugin
   - Create ADO client from config
   - Call `syncIncrement()` with bidirectional direction
   - Handle errors gracefully

3. **T-003**: Add configuration validation
   - Check `config.sync.<tool>.enabled` before syncing
   - Check credentials available (API tokens, PATs)
   - Skip silently if tool disabled or not configured

**Estimated Effort**: 4-6 hours

---

### Phase 2: Configuration Migration (User-Facing)

**File**: `src/cli/commands/init.ts`

**Tasks**:
1. **T-004**: Add `autoSyncOnCompletion` field to config schema
   - Default: `true` (enable auto-sync by default)
   - Add to `.specweave/config.json` generation
   - Update config validation

2. **T-005**: Add per-tool `enabled` flags
   - `sync.github.enabled` (default: true if GitHub detected)
   - `sync.jira.enabled` (default: false, user must opt-in)
   - `sync.ado.enabled` (default: false, user must opt-in)

3. **T-006**: Create migration script for existing projects
   - Detect current sync settings
   - Add new fields with sensible defaults
   - Preserve existing configuration

**Estimated Effort**: 3-4 hours

---

### Phase 3: Hook Integration (Automatic Trigger)

**File**: `plugins/specweave/hooks/post-increment-completion.sh`

**Tasks**:
1. **T-007**: Verify `sync-living-docs.js` calls `SyncCoordinator.syncIncrementCompletion()`
   - Already done (line 358: `await coordinator.syncIncrementCompletion()`)
   - ✅ No changes needed

2. **T-008**: Test automatic sync with all three tools
   - Create test increment with GitHub/JIRA/ADO links
   - Run `/specweave:done`
   - Verify all three tools update automatically
   - Verify errors don't crash hook

**Estimated Effort**: 2-3 hours (mostly testing)

---

### Phase 4: Documentation & User Communication

**Files**:
- `plugins/specweave/commands/specweave-done.md`
- `.specweave/docs/public/guides/external-tool-sync.md`
- `CHANGELOG.md`

**Tasks**:
1. **T-009**: Update `/specweave:done` command documentation
   - Add "Automatic External Tool Sync" section
   - Explain configuration options
   - Show examples of successful sync output

2. **T-010**: Create external tool sync guide
   - How to enable/disable auto-sync
   - How to configure per-tool settings
   - Troubleshooting common issues

3. **T-011**: Update CHANGELOG
   - Add feature announcement (v0.25.0 or v0.24.1)
   - Migration guide for existing users
   - Breaking changes (if any)

**Estimated Effort**: 2-3 hours

---

### Phase 5: Error Handling & Robustness

**Files**: `src/sync/sync-coordinator.ts`, hook scripts

**Tasks**:
1. **T-012**: Add comprehensive error handling
   - Network failures (retry with exponential backoff)
   - Authentication errors (clear error message, skip tool)
   - Rate limiting (detect 429, wait and retry)
   - Partial failures (some tools sync, some fail → still complete increment)

2. **T-013**: Add logging & observability
   - Log sync start/end times
   - Log tool-by-tool results
   - Track sync duration
   - Report to user in completion summary

3. **T-014**: Add fallback mechanism
   - If auto-sync fails, create sync task in backlog
   - Notify user: "Auto-sync failed, run /specweave-<tool>:sync manually"
   - Track failed syncs in metadata.json

**Estimated Effort**: 4-5 hours

---

## Total Estimated Effort

| Phase | Effort | Priority |
|-------|--------|----------|
| Phase 1: Core SyncCoordinator | 4-6 hours | P0 (Critical) |
| Phase 2: Configuration | 3-4 hours | P0 (Critical) |
| Phase 3: Hook Integration | 2-3 hours | P0 (Critical) |
| Phase 4: Documentation | 2-3 hours | P1 (Important) |
| Phase 5: Error Handling | 4-5 hours | P1 (Important) |
| **Total** | **15-21 hours** | **~2-3 days** |

---

## Success Criteria

### Functional Requirements

1. ✅ When `/specweave:done 0047` completes successfully:
   - Living docs sync happens automatically (already works)
   - GitHub issue updated with final tasks/ACs (NEW)
   - JIRA epic marked "Done" (if configured and linked) (NEW)
   - ADO work item marked "Closed" (if configured and linked) (NEW)

2. ✅ Configuration control:
   - User can enable/disable auto-sync globally (`autoSyncOnCompletion`)
   - User can enable/disable per-tool sync (`<tool>.enabled`)
   - User can still use manual commands when auto-sync disabled

3. ✅ Error handling:
   - Sync failures don't block increment completion
   - Clear error messages for common issues (auth, network, rate limits)
   - Partial success handled gracefully (GitHub succeeds, JIRA fails → still complete)

### Non-Functional Requirements

1. **Performance**: Sync completes in < 30 seconds for typical increment (10 user stories, 50 tasks)
2. **Reliability**: Sync succeeds 99% of the time under normal conditions
3. **Backwards Compatibility**: Existing projects work without config changes (sensible defaults)
4. **Security**: API tokens never logged or exposed in error messages

---

## Testing Strategy

### Unit Tests

1. `SyncCoordinator.syncIncrementCompletion()` with GitHub-only config
2. `SyncCoordinator.syncIncrementCompletion()` with JIRA-only config
3. `SyncCoordinator.syncIncrementCompletion()` with ADO-only config
4. `SyncCoordinator.syncIncrementCompletion()` with all tools enabled
5. `SyncCoordinator.syncIncrementCompletion()` with all tools disabled

### Integration Tests

1. Full flow: `/specweave:done` → living docs → GitHub sync
2. Full flow: `/specweave:done` → living docs → JIRA sync
3. Full flow: `/specweave:done` → living docs → ADO sync
4. Error scenario: GitHub sync fails (network error) → increment still completes
5. Error scenario: JIRA sync fails (auth error) → GitHub succeeds, JIRA skipped

### E2E Tests

1. Real project with GitHub repo → complete increment → verify GitHub issue updated
2. Real project with JIRA → complete increment → verify JIRA epic marked "Done"
3. Real project with ADO → complete increment → verify ADO work item closed

---

## Risk Assessment

### High Risk

1. **Breaking Existing Workflows**
   - **Mitigation**: Auto-sync off by default, users opt-in via config
   - **Rollback**: Add `SPECWEAVE_DISABLE_AUTO_SYNC=true` env var

2. **External API Rate Limits**
   - **Mitigation**: Respect rate limits, retry with backoff, skip if quota exceeded
   - **Monitoring**: Log rate limit hits, warn user in completion summary

### Medium Risk

1. **Partial Sync Failures**
   - **Mitigation**: Independent tool syncs (GitHub fails ≠ JIRA fails)
   - **Recovery**: Manual commands still available

2. **Configuration Complexity**
   - **Mitigation**: Sensible defaults, interactive setup wizard
   - **Documentation**: Clear guide with examples

### Low Risk

1. **Increased Sync Time**
   - **Mitigation**: Parallel sync (Promise.all), timeout per tool (30s max)
   - **Acceptable**: +10-20s to completion time for 3-tool sync

---

## Alternatives Considered

### Alternative 1: Post-Closure Hook Per Tool

**Approach**: Create separate hooks for each tool:
- `post-increment-completion-github.sh`
- `post-increment-completion-jira.sh`
- `post-increment-completion-ado.sh`

**Pros**:
- ✅ Clean separation of concerns
- ✅ Easy to enable/disable per tool (just remove hook)

**Cons**:
- ❌ Duplication of logic (metadata loading, config parsing)
- ❌ Harder to maintain (3 separate scripts)
- ❌ Harder to add new tools (need new hook each time)

**Decision**: ❌ Rejected (prefer centralized `SyncCoordinator`)

---

### Alternative 2: Separate Slash Command

**Approach**: Create `/specweave:sync-external-tools` command

**Pros**:
- ✅ Explicit user control
- ✅ Easy to debug (separate from completion flow)

**Cons**:
- ❌ Not automatic (user must remember to run it)
- ❌ Extra step in workflow (violates user's request for automatic cascade)
- ❌ Easy to forget → stale external tool data

**Decision**: ❌ Rejected (doesn't meet user's requirement for automatic sync)

---

### Alternative 3: Async Background Sync

**Approach**: Increment completes immediately, sync happens in background

**Pros**:
- ✅ Faster completion (user doesn't wait for sync)
- ✅ Better UX (increment closes instantly)

**Cons**:
- ❌ Complex orchestration (need background job queue)
- ❌ Sync failures not visible to user (happened after they left)
- ❌ No immediate feedback (did sync work?)

**Decision**: ❌ Rejected (prefer synchronous with clear feedback)

---

## Implementation Notes

### Dependency Resolution

**JIRA Client Imports**:
```typescript
import { JiraHierarchicalSync } from '../../plugins/specweave-jira/lib/jira-hierarchical-sync.js';
import { JiraClient } from '../../src/integrations/jira/jira-client.js';
```

**ADO Client Imports**:
```typescript
import { AdoHierarchicalSync } from '../../plugins/specweave-ado/lib/ado-hierarchical-sync.js';
import { AdoClientV2 } from '../../plugins/specweave-ado/lib/ado-client-v2.js';
```

**GitHub Client** (already imported):
```typescript
import { GitHubClientV2 } from '../../plugins/specweave-github/lib/github-client-v2.js';
```

---

## Next Steps

1. **Approval**: Review this analysis with team/stakeholders
2. **Prioritization**: Confirm P0 phases for immediate implementation
3. **Sprint Planning**: Allocate 2-3 days for implementation
4. **Implementation**: Start with Phase 1 (Core SyncCoordinator)
5. **Testing**: Run comprehensive tests after each phase
6. **Documentation**: Update user-facing docs before release
7. **Release**: Ship as v0.25.0 with feature announcement

---

## Conclusion

**Current State**: Living docs sync is automatic ✅, but external tool sync is only partially automatic (GitHub issue closure only).

**Proposed Solution**: Extend `SyncCoordinator` to sync GitHub content, JIRA, and ADO automatically on increment completion, controlled by configuration flags.

**Estimated Effort**: 15-21 hours (~2-3 days) for complete implementation with testing and documentation.

**Risk**: Low-Medium (mostly integration work, existing implementations available)

**Value**: High (eliminates manual sync steps, ensures external tools always reflect latest state, improves team collaboration)

**Recommendation**: ✅ **PROCEED** with implementation starting with Phase 1 (Core SyncCoordinator enhancement).
