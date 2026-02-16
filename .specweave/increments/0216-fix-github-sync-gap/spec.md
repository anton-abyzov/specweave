---
increment: 0216-fix-github-sync-gap
title: "Fix GitHub Issues Sync Gap"
type: bug
priority: P1
status: completed
created: 2026-02-15
structure: user-stories
test_mode: TDD
coverage_target: 80
---

# Fix GitHub Issues Sync Gap

## Problem Statement

87% of active increments (18/20) have no linked GitHub issues. The sync infrastructure is production-grade (Octokit, GitHubAdapter, SyncCoordinator) but the shell hook routing chain has 4 gaps that silently prevent automatic sync. Evidence: increment 0206 has issues in old `github.issues[]` format that ac-sync-dispatcher can't read; increments 0210-0215 have empty `externalLinks`; `sync-metadata.json` shows `lastSyncResult: "failed"`.

## Goals

- Fix AC progress sync so GitHub issue checkboxes update when tasks complete
- Fix session-end sync so user-story completion events reach GitHub handler
- Prevent duplicate issue creation by checking both metadata formats
- Unify config detection across all shell scripts

## User Stories

### US-001: AC Progress Sync Reads Both Metadata Formats (P1)
**Project**: specweave

**As a** developer using SpecWeave with GitHub sync
**I want** AC progress to sync to GitHub issues regardless of metadata format
**So that** completing tasks updates GitHub issue checkboxes automatically

**Acceptance Criteria**:
- [x] **AC-US1-01**: Given metadata with OLD format (`github.issues[].userStory`), when ac-sync-dispatcher extracts US IDs, then it finds all linked user stories
- [x] **AC-US1-02**: Given metadata with NEW format (`externalLinks.github.issues` keys), when ac-sync-dispatcher extracts US IDs, then it finds all linked user stories
- [x] **AC-US1-03**: Given metadata with both formats present, when ac-sync-dispatcher extracts US IDs, then it returns deduplicated union of both
- [x] **AC-US1-04**: Given empty or missing metadata, when ac-sync-dispatcher extracts US IDs, then it returns empty array without errors

---

### US-002: Stop-Sync Routes User-Story Events to GitHub Handler (P1)
**Project**: specweave

**As a** developer completing user stories
**I want** `user-story.completed` events to reach the GitHub sync handler at session end
**So that** GitHub issues get updated when user stories complete

**Acceptance Criteria**:
- [x] **AC-US2-01**: Given pending `user-story.completed` event, when `get_best_event_type()` runs, then it returns `user-story.completed` (higher priority than `increment.sync`)
- [x] **AC-US2-02**: Given pending `user-story.reopened` event, when `get_best_event_type()` runs, then it returns `user-story.reopened`
- [x] **AC-US2-03**: Given user-story events at session end, when stop-sync processes them, then `github-sync-handler.sh` is invoked with correct event type
- [x] **AC-US2-04**: Given user-story event data in `INC_ID:US_ID` format, when github-sync-handler receives it, then both INC_ID and US_ID are correctly parsed

---

### US-003: Auto-Create Idempotency Checks Both Formats (P2)
**Project**: specweave

**As a** developer with existing GitHub issues in old metadata format
**I want** auto-create to detect issues in both formats
**So that** duplicate issues are never created

**Acceptance Criteria**:
- [x] **AC-US3-01**: Given metadata with `externalLinks.github.issues` containing issue numbers, when auto-create runs, then it skips creation
- [x] **AC-US3-02**: Given metadata with `github.issues[]` containing `.number` values, when auto-create runs, then it skips creation
- [x] **AC-US3-03**: Given both formats present, when counting issues, then combined count is correct without double-counting

---

### US-004: Shared Config Detection Supports All Formats (P2)
**Project**: specweave

**As a** user with any sync config format
**I want** all shell hook scripts to detect my GitHub config consistently
**So that** sync features work regardless of config style

**Acceptance Criteria**:
- [x] **AC-US4-01**: Given PROFILES format config (`sync.profiles` with `provider: "github"` and `canUpdateExternalItems: true`), when `check_provider_enabled` runs, then it returns enabled
- [x] **AC-US4-02**: Given LEGACY direct format (`sync.github.enabled: true`), when `check_provider_enabled` runs, then it returns enabled
- [x] **AC-US4-03**: Given LEGACY provider format (`sync.provider: "github"` with `sync.enabled: true`), when `check_provider_enabled` runs, then it returns enabled
- [x] **AC-US4-04**: Given ac-sync-dispatcher, universal-auto-create-dispatcher, and github-auto-create-handler, when checking provider config, then all use the shared `check_provider_enabled` function
- [x] **AC-US4-05**: Given missing or malformed config file, when `check_provider_enabled` runs, then it returns "not enabled" without errors

## Out of Scope

- Rewriting the TypeScript sync infrastructure (already works correctly)
- Migrating existing metadata from old to new format (backward compat instead)
- Adding new sync providers (JIRA/ADO gaps are separate increments)
- Changing the auto-create debounce/throttle timing

## Technical Notes

### Key Files
- `plugins/specweave/hooks/v2/handlers/ac-sync-dispatcher.sh` — reads US IDs from metadata
- `plugins/specweave/hooks/stop-sync.sh` — batches events at session end
- `plugins/specweave-github/hooks/github-auto-create-handler.sh` — creates GitHub issues
- `plugins/specweave/hooks/v2/handlers/universal-auto-create-dispatcher.sh` — delegates to providers
- `plugins/specweave/hooks/v2/handlers/github-sync-handler.sh` — reference implementation for 3-method config check

### Constraints
- All shell scripts must never crash Claude Code (`set +e`, always `exit 0`)
- Existing debounce (5s/10s) and throttle (60s/300s) mechanisms must be preserved
- Changes are confined to shell hooks — no TypeScript core modifications needed

## Success Metrics

- 100% of new increments get linked GitHub issues (auto-create works)
- AC checkbox updates visible on GitHub within 60s of task completion
- Zero duplicate GitHub issues created
- Config detection works for all 3 formats (profiles, legacy direct, legacy provider)
