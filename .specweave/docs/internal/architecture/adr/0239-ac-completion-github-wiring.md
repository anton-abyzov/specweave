# ADR-0239: Wire AC Completion to GitHub via Background Handler

**Date**: 2026-02-07
**Status**: Accepted
**Increment**: 0193-github-sync-ac-comment-wiring

## Context

The grill revealed that AC completion events stop at spec.md and never reach GitHub. The `progress-comment-builder.ts` exists but has no trigger. The hook chain needs a new link: after `task-ac-sync-guard.sh` updates spec.md ACs, a background handler must post progress comments and update issue body checkboxes on GitHub.

## Decision

Add `github-ac-sync-handler.sh` as a background handler in `post-tool-use.sh`, triggered after `task-ac-sync-guard.sh` completes. The handler:

1. Waits 5s to batch rapid AC changes
2. Reads spec.md to find affected user stories and their GitHub issue links
3. Posts aggregated progress comment via `gh issue comment`
4. Updates issue body AC checkboxes via targeted `pushSyncUserStories()`
5. Auto-closes issue if all ACs for that US are done

**Integration point**: `post-tool-use.sh` line 312, after `safe_run_sync` of task-ac-sync-guard.

**Trigger condition**: Only when `task-ac-sync-guard` actually synced ACs (check `.specweave/logs/task-ac-sync.log` for recent SUCCESS entries or use a signal file).

## Alternatives Considered

1. **Synchronous in hook chain**: Adds 2-5s latency to every task completion. Rejected for UX impact.
2. **Session-end batch**: Delays visibility. Team members wouldn't see progress until developer finishes session.
3. **Per-AC individual comments**: Noisy. 5 ACs completing rapidly = 5 comments. Aggregated is cleaner.

## Consequences

**Positive**: Real-time progress visibility on GitHub without manual sync. Reuses existing `progress-comment-builder.ts`.
**Negative**: 5s delay means not instant. Background execution means failures are silent (mitigated by circuit breaker + warnings).
