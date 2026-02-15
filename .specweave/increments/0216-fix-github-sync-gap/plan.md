# Implementation Plan: Fix GitHub Issues Sync Gap

## Overview

Patch 4 gaps in the shell hook routing chain that prevent GitHub issues from being created and updated. All changes are in bash scripts — no TypeScript core modifications needed. The sync infrastructure (Octokit, GitHubAdapter, SyncCoordinator) already works correctly; the gaps are in the hook dispatchers that feed it.

## Architecture

### Event Flow (Current — Broken)

```
tasks.md edited → post-tool-use.sh → ac-sync-dispatcher.sh
  → reads externalLinks.github.issues (NEW format ONLY)
  → 0206 has github.issues[] (OLD format) → returns [] → SKIPS SYNC

Session end → stop-sync.sh → get_best_event_type()
  → only handles increment.* events
  → user-story.completed falls to increment.sync → project-bridge-handler (NOT github-sync)
```

### Event Flow (Fixed)

```
tasks.md edited → post-tool-use.sh → ac-sync-dispatcher.sh
  → reads BOTH externalLinks.github.issues AND github.issues[].userStory
  → finds linked US IDs → syncs AC checkboxes to GitHub

Session end → stop-sync.sh → get_best_event_type()
  → recognizes user-story.completed/reopened events
  → invokes github-sync-handler.sh with INC_ID:US_ID data
```

### Components Modified

| Component | File | Change |
|-----------|------|--------|
| AC Sync Dispatcher | `plugins/specweave/hooks/v2/handlers/ac-sync-dispatcher.sh` | Read both metadata formats, use shared config check |
| Stop Sync | `plugins/specweave/hooks/stop-sync.sh` | Route user-story events to github-sync-handler |
| Auto-Create Handler | `plugins/specweave-github/hooks/github-auto-create-handler.sh` | Check both formats for idempotency, use shared config check |
| Auto-Create Dispatcher | `plugins/specweave/hooks/v2/handlers/universal-auto-create-dispatcher.sh` | Use shared config check |
| Config Check (NEW) | `plugins/specweave/hooks/v2/lib/check-provider-enabled.sh` | Shared 3-method config detection |

## Architecture Decision

**ADR: Shared config check as sourced shell function (not CLI command)**

- Rationale: Shell scripts run on every hook invocation. Spawning a Node.js process for config check adds 200-500ms latency. A sourced bash function using `grep` adds <5ms.
- Alternative rejected: Using `specweave config get` CLI — too slow for hooks.
- Reference implementation: `github-sync-handler.sh:72-107` already has the correct 3-method pattern.

## Implementation Phases

### Phase 1: Shared config check (unblocks everything)
Create `check-provider-enabled.sh` with 3-method detection. Source from all affected scripts.

### Phase 2: Fix metadata format reading (highest user impact)
Update ac-sync-dispatcher.sh and github-auto-create-handler.sh to read both old/new formats.

### Phase 3: Fix stop-sync event routing
Add user-story event types to `get_best_event_type()` and invoke github-sync-handler for them.

### Phase 4: Testing
Unit tests for config check, integration tests for metadata format reading and event routing.

## Testing Strategy

- **TDD mode**: Write failing tests first for each gap
- **Shell script testing**: Use Vitest with `child_process.execSync` to invoke bash scripts
- **Config fixtures**: Create test configs in all 3 formats (profiles, legacy direct, legacy provider)
- **Metadata fixtures**: Create test metadata in old, new, and mixed formats

## Technical Challenges

### Challenge 1: jq expression for old format userStory extraction
**Solution**: `(.github.issues // [] | .[].userStory // empty)` handles missing fields gracefully
**Risk**: Old metadata may have inconsistent field names — use `// empty` to skip nulls

### Challenge 2: stop-sync event data extraction for user-story events
**Solution**: Parse pending.jsonl for `user-story.*` events, extract `INC_ID:US_ID` from data field
**Risk**: Multiple US events per increment — process each unique US, not just the first
