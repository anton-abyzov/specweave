---
id: FS-049
title: "Automatic GitHub Sync with Permission Gates"
type: feature
status: proposed
priority: P0
created: 2025-11-22
last_updated: 2025-11-22
projects:
  - specweave
external_tools:
  github:
    milestone: null
    url: null
---

# FS-049: Automatic GitHub Sync with Permission Gates

## Overview

**Problem Statement**: Currently, GitHub issues are NOT automatically created when increments are completed, even when `canUpsertInternalItems: true` is enabled. Users expect automatic synchronization without manual intervention.

**Root Cause**: Architecture gap where `canUpsertInternalItems` only gates living docs sync, NOT GitHub issue creation. The `SyncCoordinator` doesn't integrate external tracker sync into the completion workflow.

**Target Users**: SpecWeave users (solo developers, teams) who use GitHub Issues for project management and expect bidirectional sync.

**Business Value**:
- Eliminates manual `/specweave-github:sync` commands (saves 2-5 minutes per increment)
- Prevents forgotten syncs (100% reliability vs 70% manual adherence)
- Provides real-time GitHub visibility (stakeholders see progress immediately)
- Reduces friction in workflow (zero interruption during development)

## Dependencies

**Required**:
- ✅ ADR-0030: Intelligent Living Docs Sync (format preservation)
- ✅ ADR-0032: Universal Hierarchy Mapping (Feature → User Stories → GitHub Issues)
- ✅ ADR-0007: GitHub First Task Sync
- ✅ Existing `SyncCoordinator` (`src/sync/sync-coordinator.ts`)
- ✅ GitHub sync hook (`plugins/specweave-github/hooks/post-task-completion.sh`)

**Integrates With**:
- Living docs sync hook (`plugins/specweave/lib/hooks/sync-living-docs.js`)
- ConfigManager (`src/core/config/config-manager.ts`)
- GitHub CLI (`gh` binary)

## Projects Implementing This Feature

- **SpecWeave Core**: SyncCoordinator enhancement, permission gates, idempotency

## User Stories (Cross-Project View)

### SpecWeave User Stories
- [US-001: Automatic Issue Creation on Completion](../../specweave/FS-049/us-001-auto-issue-creation.md)
- [US-002: Three-Tier Permission Model](../../specweave/FS-049/us-002-permission-gates.md)
- [US-003: Idempotency via Caching](../../specweave/FS-049/us-003-idempotency.md)
- [US-004: Error Isolation and Recovery](../../specweave/FS-049/us-004-error-isolation.md)

## Implementation History

| Increment | Stories Implemented | Status | Completion Date |
|-----------|---------------------|--------|-----------------|
| [0051](../../../../increments/0051-automatic-github-sync/) | 4 stories | Proposed | - |

## Success Metrics

**Objective**: Achieve 100% automatic sync coverage with zero manual intervention

**Key Results**:
1. **Automation Rate**: 100% of completed increments auto-sync to GitHub (target: 100%, baseline: 0%)
2. **Time Savings**: Eliminate 2-5 minutes per increment manual sync (target: 100% reduction)
3. **Reliability**: Zero forgotten syncs (target: 0% miss rate, baseline: 30% manual miss rate)
4. **Error Rate**: < 1% sync failures due to GitHub API errors (graceful degradation)
5. **Performance**: Sync completes in < 10 seconds (non-blocking background operation)

**Measurement**:
- Track `metadata.json` → `github.issue` field presence (automated)
- Monitor `.specweave/logs/hooks-debug.log` for sync events
- User survey: "I no longer manually run /specweave-github:sync" (NPS > 9/10)

## External Tool Integration

**GitHub**: Auto-creates User Story issues when increment completes
- Format: `[FS-049][US-001] User Story Title`
- Milestone: Feature milestone (`FS-049: Automatic GitHub Sync`)
- Labels: Auto-applied from config (`status:completed`, `type:feature`)

**Jira/ADO**: (Future enhancement - not in scope for 0051)

## Architecture Diagram

```
Increment Completion (/specweave:done)
    ↓
SyncCoordinator.syncIncrementCompletion()
    ↓
GATE 1: canUpsertInternalItems = true?
    ↓ YES
Living Docs Sync (Format Preservation)
    ↓
GATE 2: canUpdateExternalItems = true?
    ↓ YES
GATE 3: autoSyncOnCompletion = true? (default: true)
    ↓ YES
GATE 4: sync.github.enabled = true?
    ↓ YES
GitHub Issue Creation (via GitHubClientV2)
    ├─ Check cache (prevent duplicates)
    ├─ Create issues (one per User Story)
    └─ Update metadata.json (github.issue field)
    ↓
Background Completion (non-blocking)
```

## Configuration Example

```json
{
  "sync": {
    "enabled": true,
    "provider": "github",
    "settings": {
      "canUpsertInternalItems": true,    // GATE 1: Enable living docs sync
      "canUpdateExternalItems": true,    // GATE 2: Enable external tracker sync
      "autoSyncOnCompletion": true       // GATE 3: Auto-sync on /done (default: true)
    },
    "github": {
      "enabled": true,                   // GATE 4: Enable GitHub specifically
      "owner": "anton-abyzov",
      "repo": "specweave"
    }
  }
}
```

## Non-Functional Requirements

### NFR-001: Performance (P0)
- **Requirement**: Sync operations must not block user workflow
- **Acceptance**: Background execution < 10 seconds
- **Rationale**: User can continue working immediately after `/done`

### NFR-002: Reliability (P0)
- **Requirement**: Sync failures must not crash workflow
- **Acceptance**: Graceful error handling, user notified, workflow continues
- **Rationale**: GitHub API may be temporarily unavailable

### NFR-003: Idempotency (P0)
- **Requirement**: Re-running sync must not create duplicate issues
- **Acceptance**: Caching prevents duplicates, 100% success rate
- **Rationale**: Users may manually retry failed syncs

### NFR-004: Observability (P1)
- **Requirement**: Users must understand sync status
- **Acceptance**: Clear logs, status in `metadata.json`, error messages
- **Rationale**: Debugging and transparency

## Risks and Mitigations

**Risk 1: GitHub Rate Limits** (Medium Impact, Low Probability)
- **Impact**: Sync fails for high-volume users (> 5000 requests/hour)
- **Mitigation**: Batch requests, cache aggressively, exponential backoff
- **Fallback**: Manual sync command (`/specweave-github:sync`)

**Risk 2: Stale Lock Files** (Low Impact, Medium Probability)
- **Impact**: Hook appears stuck, syncs blocked
- **Mitigation**: Lock timeout (15s), stale lock cleanup, circuit breaker
- **Fallback**: Manual lock file removal (`rm .specweave/state/.hook-github-sync.lock`)

**Risk 3: Permission Confusion** (Low Impact, Low Probability)
- **Impact**: Users confused about 3 permission gates
- **Mitigation**: Clear documentation, sensible defaults, validation error messages
- **Fallback**: FAQ + troubleshooting guide

## Alternatives Considered

### Alternative 1: Keep Manual Sync (Rejected)
**Pros**: Simple, no changes needed, no risk
**Cons**: Manual work, forgotten syncs, poor UX, inconsistent with vision
**Decision**: Rejected (doesn't meet user needs)

### Alternative 2: Sync on Every Task Completion (Rejected)
**Pros**: Real-time sync, maximum visibility
**Cons**: API rate limit exhaustion, performance overhead, noise
**Decision**: Rejected (performance concerns)

### Alternative 3: Sync Only on Increment Completion (SELECTED)
**Pros**: Balanced (one sync per increment), rate limit friendly, meaningful GitHub issues
**Cons**: Delayed visibility (until increment done)
**Decision**: Accepted (best balance of features vs risk)

### Alternative 4: Configurable Sync Trigger (Future Enhancement)
**Pros**: Flexibility (sync on task, AC, or increment)
**Cons**: Increased complexity, hard to reason about
**Decision**: Deferred to v0.26.0+ (users can request if needed)

## Migration Strategy

**Existing Users** (v0.24.0 → v0.25.0):
- Default: `autoSyncOnCompletion: true` (automatic upgrade)
- Opt-out: Set `autoSyncOnCompletion: false` (manual sync only)
- No breaking changes (existing config.json compatible)

**New Users** (post-v0.25.0):
- Default: Auto-sync enabled during `specweave init`
- Prompt: "Enable automatic GitHub sync? (Y/n)"

## References

- **ADRs**:
  - [ADR-0030: Intelligent Living Docs Sync](../../../architecture/adr/0030-intelligent-living-docs-sync.md)
  - [ADR-0032: Universal Hierarchy Mapping](../../../architecture/adr/0032-universal-hierarchy-mapping.md)
  - [ADR-0007: GitHub First Task Sync](../../../architecture/adr/0007-github-first-task-sync.md)

- **Implementation**:
  - Increment: [0051-automatic-github-sync](../../../../increments/0051-automatic-github-sync/)

- **External References**:
  - [GitHub API Rate Limiting](https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting)
  - [GitHub CLI Documentation](https://cli.github.com/manual/)

---

**Status**: Proposed
**Next Steps**: Create User Stories, plan implementation in 0051
