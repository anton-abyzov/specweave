# Implementation Plan: Wire AC Completion to GitHub Comments & Fix Bidirectional Multi-Repo Sync

**ADR**: [0239-ac-completion-github-wiring](.specweave/docs/internal/architecture/adr/0239-ac-completion-github-wiring.md)

## Overview

Wire the missing "last mile" in the hook chain: after `task-ac-sync-guard.sh` updates spec.md ACs, a new background handler posts progress comments and updates issue body checkboxes on GitHub. Extend pull sync for multi-repo with all-repos-must-agree semantics. Add comprehensive test coverage for the critical path.

## Architecture

### Event Flow (New)

```
tasks.md [x] → PostToolUse
  → task-ac-sync-guard.sh (SYNC, existing)     ← Updates spec.md ACs
  → github-ac-sync-handler.sh (BACKGROUND, NEW) ← Posts to GitHub
      ├─ 5s debounce (batch rapid changes)
      ├─ Read spec.md for affected US + AC states
      ├─ Post aggregated progress comment (progress-comment-builder.ts)
      ├─ Update issue body checkboxes (targeted push-sync)
      └─ Auto-close if all ACs done for US
```

### Components

| Component | Type | Status | Location |
|-----------|------|--------|----------|
| `github-ac-sync-handler.sh` | Shell handler | NEW | `plugins/specweave-github/hooks/github-ac-sync-handler.sh` |
| `github-ac-comment-poster.ts` | TypeScript module | NEW | `plugins/specweave-github/lib/github-ac-comment-poster.ts` |
| `github-us-auto-closer.ts` | TypeScript module | NEW | `plugins/specweave-github/lib/github-us-auto-closer.ts` |
| `post-tool-use.sh` | Shell dispatcher | MODIFY | Add background call after line 312 |
| `github-pull-sync.ts` | TypeScript module | MODIFY | Add `pullSyncMultiRepo()` function |
| `progress-comment-builder.ts` | TypeScript module | REUSE | Already generates comment markdown |
| `github-push-sync.ts` | TypeScript module | REUSE | `pushSyncUserStories([singleUS])` |
| `github-field-sync.ts` | TypeScript module | REUSE | Update Status→Done on close |

### Integration Point

**File**: `plugins/specweave/hooks/v2/dispatchers/post-tool-use.sh`
**Insert after**: Line 312 (after `safe_run_sync "$SYNC_SCRIPT" "task-ac-sync" "$INPUT"`)

```bash
# GITHUB AC SYNC (v1.0.236+): Post progress to GitHub after AC sync
GITHUB_AC_HANDLER="${HOOK_DIR}/../../../specweave-github/hooks/github-ac-sync-handler.sh"
if [[ -f "$GITHUB_AC_HANDLER" ]]; then
  safe_run_background "$GITHUB_AC_HANDLER" "github-ac-sync" "$INC_ID"
fi
```

### Signal File Pattern (Debounce)

```
.specweave/state/.github-ac-pending-{INC_ID}
  Content: timestamp of first trigger
  Handler checks: if file age < 5s, exit (let next trigger handle it)
  Handler checks: if file age >= 5s, process and delete
```

## Technology Stack

- **Shell**: `github-ac-sync-handler.sh` (handler entry point, circuit breaker, locking)
- **TypeScript**: `github-ac-comment-poster.ts`, `github-us-auto-closer.ts` (logic modules)
- **CLI**: `gh issue comment`, `gh issue edit`, `gh issue close` (GitHub operations)
- **Testing**: Vitest with `vi.hoisted()` + `vi.mock()` ESM pattern

**Architecture Decisions**: See ADR-0239

## Implementation Phases

### Phase 1: Tests + Background Handler (US-005, US-001) — P1

1. Write failing tests for AC→comment posting chain
2. Create `github-ac-comment-poster.ts` — wraps progress-comment-builder + gh CLI
3. Create `github-ac-sync-handler.sh` — background handler with debounce, circuit breaker, locking
4. Wire into `post-tool-use.sh` dispatcher after task-ac-sync-guard

### Phase 2: Issue Body Update + Auto-Close (US-002, US-003) — P1/P2

5. Write failing tests for targeted push-sync and auto-close
6. Create `github-us-auto-closer.ts` — checks all-ACs-done, closes issue, updates V2 field
7. Extend handler to call targeted push-sync for affected US only
8. Wire auto-close into handler flow

### Phase 3: Multi-Repo Pull Sync (US-004) — P2

9. Write failing tests for multi-repo pull with all-repos-must-agree
10. Add `pullSyncMultiRepo()` to `github-pull-sync.ts`
11. Implement cross-repo AC consensus logic
12. Integration test for distributed strategy pull

## Testing Strategy

- **Unit tests**: Each new module (comment-poster, auto-closer, multi-repo-pull)
- **Integration test**: Full chain from tasks.md edit → GitHub comment posted
- **Mock strategy**: `vi.hoisted()` + `vi.mock()` for `gh` CLI calls via `execFileNoThrow`
- **Coverage target**: >80% on all new modules
- **TDD**: RED→GREEN→REFACTOR per strict mode

## Technical Challenges

### Challenge 1: Debounce Rapid AC Changes
**Problem**: 5 tasks completed in 2 seconds = 5 handler invocations
**Solution**: Signal file with timestamp. Handler exits if file < 5s old. Only the last invocation (after 5s window) actually posts to GitHub.
**Risk**: Edge case where session ends during debounce window. Mitigated by session-end stop-sync.sh catching remaining events.

### Challenge 2: All-Repos-Must-Agree for Shared ACs
**Problem**: US-003 (shared) has identical ACs in frontend-app and backend-api. If frontend checks AC but backend hasn't, spec should NOT mark it done.
**Solution**: `pullSyncMultiRepo()` fetches from all repos, builds consensus map. AC marked done only when ALL repos containing that US have it checked. Repo-specific USs (only in one repo) use standard single-repo logic.
**Risk**: One repo is unreachable → blocks all shared AC updates. Mitigated by recording errors per-repo and allowing consensus on reachable repos with warning.

### Challenge 3: Targeted Push-Sync (Not Full Batch)
**Problem**: `pushSyncUserStories()` takes an array — need to call for just 1 US.
**Solution**: Parse spec.md, extract only the affected US, call `pushSyncUserStories([singleUS], options)`. The function already loops per-US so passing a single-element array works without modification.
**Risk**: None — function signature already supports this.
