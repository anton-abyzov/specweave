---
increment: 0193-github-sync-ac-comment-wiring
title: Wire AC Completion to GitHub Comments & Fix Bidirectional Multi-Repo Sync
type: feature
priority: P1
status: completed
created: 2026-02-07T00:00:00.000Z
structure: user-stories
test_mode: test-after
coverage_target: 80
---

# Feature: Wire AC Completion to GitHub Comments & Fix Bidirectional Multi-Repo Sync

## Problem Statement

A comprehensive grill of the external tool integration revealed the "last mile" is missing from the sync chain. The hook architecture is production-grade (dispatchers, circuit breakers, file locking, error isolation), but AC completion events never reach GitHub. The chain stops at spec.md. Additionally, bidirectional sync only works for push direction in multi-repo setups. 0% test coverage exists on the critical AC-to-GitHub path across 666 test cases.

## Goals

- Wire the existing `progress-comment-builder.ts` into the hook chain so AC completion triggers GitHub comments
- Update GitHub issue body AC checkboxes when ACs complete (targeted, not full batch)
- Auto-close GitHub issues when all ACs for a user story are done
- Enable pull sync from multiple repos with all-repos-must-agree conflict resolution
- Achieve >80% test coverage on the AC-to-comment-to-issue-update path

## User Stories

### US-001: AC Completion Triggers GitHub Progress Comment (P1)
**Project**: specweave

**As a** team lead tracking progress on GitHub
**I want** a progress comment automatically posted to the GitHub issue when acceptance criteria are completed
**So that** I see real-time progress without running manual sync commands

**Acceptance Criteria**:
- [x] **AC-US1-01**: Given a task is marked complete and its ACs are synced to spec.md by task-ac-sync-guard, when the hook chain continues, then a background handler (5s delay) posts an aggregated progress comment to the corresponding GitHub issue via `gh issue comment`
- [x] **AC-US1-02**: Given the progress comment is posted, then it uses the existing `progress-comment-builder.ts` format including completed AC names, overall progress percentage (e.g., "3/5 ACs - 60%"), and timestamp
- [x] **AC-US1-03**: Given the GitHub API call fails (network error, rate limit, auth expired), then the task completion still succeeds and the user sees a non-blocking warning via the existing HookResponseWarning pattern
- [x] **AC-US1-04**: Given GitHub is down and 3 consecutive comment posts fail, then the circuit breaker opens and skips further attempts until manually reset or next session
- [x] **AC-US1-05**: Given multiple ACs are completed in rapid succession (within 5s window), then only one aggregated comment is posted (not one per AC)

---

### US-002: AC Completion Updates Issue Body Checkboxes (P1)
**Project**: specweave

**As a** developer viewing a GitHub issue
**I want** the AC checkboxes in the issue body to reflect the current spec state
**So that** the issue shows accurate completion status without manual sync

**Acceptance Criteria**:
- [x] **AC-US2-01**: Given ACs are synced to spec.md via task-ac-sync-guard, when the background handler fires, then a targeted push-sync updates only the affected GitHub issue(s) body via `gh issue edit` with regenerated body from `generateIssueBody()`
- [x] **AC-US2-02**: Given a spec has 5 user stories but only US-001 ACs changed, then only the GitHub issue for US-001 is updated (not all 5)
- [x] **AC-US2-03**: Given the issue body update runs twice for the same AC state, then the result is identical (idempotent)
- [x] **AC-US2-04**: Given the push-sync runs in background mode, then the spec frontmatter `syncedAt` timestamp is updated for the affected user story

---

### US-003: Auto-Close Issue When All ACs Done (P2)
**Project**: specweave

**As a** project manager viewing the GitHub project board
**I want** issues to auto-close when all their acceptance criteria are completed
**So that** the board reflects accurate per-user-story completion status

**Acceptance Criteria**:
- [x] **AC-US3-01**: Given all ACs for a user story are marked complete in spec.md, when the background sync handler detects this, then the corresponding GitHub issue is closed via `gh issue close`
- [x] **AC-US3-02**: Given the issue is about to be closed, then a completion comment is posted first: "All acceptance criteria completed" with final progress summary
- [x] **AC-US3-03**: Given the GitHub issue is already closed (e.g., manually by someone), then no duplicate close or comment is created
- [x] **AC-US3-04**: Given Projects V2 is enabled, then the Status field is updated to "Done" when the issue closes via the existing `github-field-sync.ts`

---

### US-004: Multi-Repo Pull Sync with All-Repos-Must-Agree (P2)
**Project**: specweave

**As a** developer working in a microservices architecture with distributed repos
**I want** to pull AC changes from multiple GitHub repos back to the spec with all-repos-must-agree semantics
**So that** the spec reflects verified completion across all teams

**Acceptance Criteria**:
- [x] **AC-US4-01**: Given a spec has user stories synced to multiple repos (distributed strategy with cross-team detection), when pull sync runs, then changes are fetched from all repos that have linked issues for each user story
- [x] **AC-US4-02**: Given a shared user story (US-003) exists in both frontend-app and backend-api repos, when frontend marks AC-US3-01 done but backend has not, then the AC remains unchecked in spec (all repos must agree)
- [x] **AC-US4-03**: Given all repos agree that an AC is complete, then the AC is marked complete in spec.md and a change record is created in the PullSyncResult
- [x] **AC-US4-04**: Given a repo-specific user story (US-001 in frontend-app only) has AC changes, then standard single-repo pull logic applies (no multi-repo consensus needed)
- [x] **AC-US4-05**: Given a pull sync encounters errors from one repo (e.g., 404, auth failure), then changes from other repos are still processed and the error is recorded non-blocking

---

### US-005: Test Coverage for Critical AC-to-GitHub Path (P1)
**Project**: specweave

**As a** contributor to the SpecWeave sync system
**I want** comprehensive tests covering the AC-completion-to-GitHub-update chain
**So that** the critical sync path is verified and regressions are caught

**Acceptance Criteria**:
- [x] **AC-US5-01**: Tests exist for: AC completion in tasks.md triggers background GitHub comment posting via progress-comment-builder integration
- [x] **AC-US5-02**: Tests exist for: AC completion triggers targeted issue body checkbox update (not full batch)
- [x] **AC-US5-03**: Tests exist for: all-ACs-done triggers issue auto-close with completion comment
- [x] **AC-US5-04**: Tests exist for: multi-repo pull sync with all-repos-must-agree semantics and conflict detection
- [x] **AC-US5-05**: Tests exist for: circuit breaker prevents comment storms when GitHub is down
- [x] **AC-US5-06**: Tests exist for: non-blocking failure mode (GitHub down, task still completes, user sees warning)

## Out of Scope

- Per-AC individual comments (using aggregated progress updates instead)
- Pull sync AC description change detection (only checkbox state)
- Batch resume capability for large syncs (separate increment)
- Parallel batch processing (sequential is fine for now)
- Legacy Projects API support (V2 only)
- JIRA/ADO equivalent of these changes (GitHub-only for this increment)

## Technical Notes

- Background handler uses 5s delay to batch rapid AC changes
- Reuse existing: `progress-comment-builder.ts`, `github-push-sync.ts`, `github-field-sync.ts`, `github-conflict-resolver.ts`
- New handler: `github-ac-sync-handler.sh` in `plugins/specweave-github/hooks/`
- Multi-repo pull: extend `pullSyncFromGitHub()` to accept `repos[]` parameter
- Shared ACs (cross-team) are identical in all repos per `filterRelevantUserStories()` in `github-spec-sync.ts`
- All-repos-must-agree: only mark AC done when every repo containing that US has it checked

## Success Metrics

- AC completion → GitHub comment latency < 10s (including 5s batch delay)
- Zero task completion failures due to GitHub sync errors
- Test coverage on AC-to-GitHub path > 80%
- Multi-repo pull correctly handles shared ACs across 2+ repos

## Dependencies

- Increment 0192 (GitHub Sync V2 Multi-Repo) provides the base sync architecture
- Existing modules: `progress-comment-builder.ts`, `github-push-sync.ts`, `github-pull-sync.ts`, `github-cross-repo-sync.ts`, `github-conflict-resolver.ts`, `github-field-sync.ts`
- `post-tool-use.sh` dispatcher (v1.0.148) for hook routing
- `task-ac-sync-guard.sh` (v1.0.43) for AC extraction from tasks
