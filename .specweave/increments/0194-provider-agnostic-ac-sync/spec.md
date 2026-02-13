---
increment: 0194-provider-agnostic-ac-sync
title: "Provider-Agnostic AC Progress Sync (GitHub + JIRA + ADO)"
type: feature
priority: P1
status: completed
created: 2026-02-08
structure: user-stories
test_mode: TDD
coverage_target: 80
---

# Feature: Provider-Agnostic AC Progress Sync (GitHub + JIRA + ADO)

## Problem Statement

Increment 0193 built the AC completion → progress comment → checkbox update → auto-close chain, but it is **GitHub-only**. The dispatcher routes exclusively to `github-ac-sync-handler.sh`. JIRA and ADO — both supported providers — have zero AC sync capability despite having existing client libraries (`JiraClient.addComment()`, `AdoClient.addComment()`, `JiraStatusSync.updateStatus()`, `AdoStatusSync.updateStatus()`).

Additionally, the sync layer has accumulated dead code from multiple architectural iterations that should be cleaned up.

## Goals

- Make AC completion → comment → checkbox → auto-close work for all 3 providers
- Use a simple function-map pattern (no adapter classes, no orchestrator, no new interfaces)
- Reuse existing 0193 GitHub modules as-is via direct delegation
- Call existing JIRA/ADO client libraries directly for the new providers
- Replace `github-ac-sync-handler.sh` with provider-agnostic `ac-sync-dispatcher.sh`
- Add per-User-Story link types for JIRA and ADO frontmatter
- Remove verified dead code in the sync layer
- >80% test coverage

## User Stories

### US-001: Provider-Agnostic AC Sync Function (P1)
**Project**: specweave

**As a** SpecWeave user with any external tool provider
**I want** AC completion to sync progress to all enabled providers automatically
**So that** GitHub, JIRA, and ADO all reflect real-time AC progress without manual commands

**Acceptance Criteria**:
- [x] **AC-US1-01**: Given `syncACProgressToProviders(incrementId, affectedUSIds, specPath, config)` is called, then it reads `sync.{provider}.enabled` from config and only processes enabled providers
- [x] **AC-US1-02**: Given the function builds `ACProgressContext` from spec.md, then it parses AC states per US (id, description, completed) and resolves per-US external links from `externalLinks.{provider}.userStories[US-XXX]`
- [x] **AC-US1-03**: Given GitHub is enabled, then it delegates to existing `postACProgressComments()` and `autoCloseCompletedUserStories()` from increment 0193 (direct call, no wrapper)
- [x] **AC-US1-04**: Given one provider throws an error, then it is caught and recorded in the result, and remaining providers still execute (error isolation)
- [x] **AC-US1-05**: Given the function completes, then it returns `ACProgressSyncResult` with per-provider results containing posted comments, errors, and close actions
- [x] **AC-US1-06**: Given a new provider needs to be added, then it requires adding one function to the provider map — no interface or class needed

---

### US-002: JIRA AC Sync — Comments, Checkboxes, Auto-Transition (P1)
**Project**: specweave

**As a** team using JIRA to track user story progress
**I want** AC completion to post progress comments, update checkboxes, and auto-transition JIRA issues
**So that** JIRA boards reflect actual AC completion state without manual sync

**Acceptance Criteria**:
- [x] **AC-US2-01**: Given JIRA is enabled, then a progress comment is posted via `JiraClient.addComment(issueKey, text)` using `formatForJira()` output with AC names, percentage, and timestamp
- [x] **AC-US2-02**: Given ACs are synced, then the JIRA issue description is updated with checkboxes in JIRA markup: `(/) AC-ID: description` for completed, `(x) AC-ID: description` for pending
- [x] **AC-US2-03**: Given all ACs for a user story are complete, then a completion comment is posted and the issue is transitioned to "Done" via `JiraStatusSync.updateStatus(issueKey, { state: 'Done' })`
- [x] **AC-US2-04**: Given the issue is already in a done status, then the transition is skipped with `reason: 'already-closed'`
- [x] **AC-US2-05**: Given the JIRA API fails (429, network error), then the error is recorded non-blocking and the circuit breaker increments

---

### US-003: ADO AC Sync — Comments, Checkboxes, Auto-Transition (P1)
**Project**: specweave

**As a** team using Azure DevOps to track user story progress
**I want** AC completion to post progress comments, update checkboxes, and auto-transition ADO work items
**So that** ADO boards reflect actual AC completion state without manual sync

**Acceptance Criteria**:
- [x] **AC-US3-01**: Given ADO is enabled, then a progress comment is posted via `AdoClient.addComment(workItemId, text)` with markdown containing AC names, percentage, and timestamp
- [x] **AC-US3-02**: Given ACs are synced, then the work item description is updated with checkboxes in HTML: `<li>☑ AC-ID: description</li>` for completed, `<li>☐ AC-ID: description</li>` for pending
- [x] **AC-US3-03**: Given all ACs for a user story are complete, then a completion comment is posted and the work item state is set to "Closed" via `AdoStatusSync.updateStatus(workItemId, { state: 'Closed' })`
- [x] **AC-US3-04**: Given the work item is already closed, then the transition is skipped with `reason: 'already-closed'`
- [x] **AC-US3-05**: Given the ADO API fails (auth, network error), then the error is recorded non-blocking and the circuit breaker increments

---

### US-004: Unified Dispatcher and Per-US Link Types (P1)
**Project**: specweave

**As a** SpecWeave user with multiple providers enabled
**I want** a single dispatcher that routes AC sync to all providers and per-US tracking for JIRA/ADO
**So that** I don't need provider-specific hook handlers

**Acceptance Criteria**:
- [x] **AC-US4-01**: Given `ac-sync-dispatcher.sh` replaces `github-ac-sync-handler.sh`, then it calls `syncACProgressToProviders()` which handles all enabled providers
- [x] **AC-US4-02**: Given `post-tool-use.sh` is updated to reference `ac-sync-dispatcher.sh`, then the old handler reference is removed
- [x] **AC-US4-03**: Given the dispatcher preserves existing infrastructure: 5s debounce, per-provider circuit breaker, file locking, background execution, non-blocking errors
- [x] **AC-US4-04**: Given `JiraUserStoryLink` type is added with `{ issueKey: string; issueUrl: string; syncedAt: string }`, then it can be stored at `externalLinks.jira.userStories[US-XXX]`
- [x] **AC-US4-05**: Given `AdoUserStoryLink` type is added with `{ workItemId: number; workItemUrl: string; syncedAt: string }`, then it can be stored at `externalLinks.ado.userStories[US-XXX]`
- [x] **AC-US4-06**: Given a provider has no per-US links for an affected US, then that US is skipped with `reason: 'no-issue-link'`

---

### US-005: Test Coverage (P1)
**Project**: specweave

**As a** SpecWeave contributor
**I want** comprehensive tests covering the provider-agnostic sync and per-provider behavior
**So that** the multi-provider AC sync chain is verified and regressions are caught

**Acceptance Criteria**:
- [x] **AC-US5-01**: Tests exist for: `syncACProgressToProviders()` dispatches to all enabled providers and aggregates results
- [x] **AC-US5-02**: Tests exist for: error isolation — one provider failure does not block others
- [x] **AC-US5-03**: Tests exist for: disabled providers are skipped
- [x] **AC-US5-04**: Tests exist for: GitHub delegates to existing 0193 functions unchanged
- [x] **AC-US5-05**: Tests exist for: JIRA posts comment in JIRA markup, updates description with `(/)/(x)`, transitions to Done
- [x] **AC-US5-06**: Tests exist for: ADO posts markdown comment, updates description with `☑/☐` HTML, transitions to Closed
- [x] **AC-US5-07**: Tests exist for: per-provider circuit breaker opens after 3 failures
- [x] **AC-US5-08**: Tests exist for: format-specific assertions per provider
- [x] **AC-US5-09**: All 31 existing GitHub AC sync tests pass unchanged

---

### US-006: Dead Code Cleanup in Sync Layer (P2)
**Project**: specweave

**As a** SpecWeave maintainer
**I want** verified dead code removed from the sync layer
**So that** the codebase is leaner and the sync architecture is less confusing

**Acceptance Criteria**:
- [x] **AC-US6-01**: `plugins/specweave-github/lib/ThreeLayerSyncManager.ts` (+ compiled artifacts) is removed — no production imports
- [x] **AC-US6-02**: `plugins/specweave-github/lib/github-increment-sync-cli.ts` (+ compiled) is removed — orphaned CLI
- [x] **AC-US6-03**: `plugins/specweave-github/lib/increment-issue-builder.ts` (+ compiled) is removed — only used by dead CLI
- [x] **AC-US6-04**: `plugins/specweave-github/lib/github-status-sync.ts` (+ compiled) is removed — no production imports
- [x] **AC-US6-05**: `plugins/specweave-github/lib/github-sync-increment-changes.ts` and `cli-sync-increment-changes.ts` (+ compiled) are removed — orphaned CLI pair
- [x] **AC-US6-06**: `plugins/specweave-github/hooks/github-ac-sync-handler.sh` is removed after `ac-sync-dispatcher.sh` is verified working
- [x] **AC-US6-07**: All tests still pass after dead code removal

## Out of Scope

- Refactoring GitHub modules into adapter wrapper (direct delegation is simpler)
- Pull sync (external tools → spec) for JIRA/ADO — separate increment
- Full SyncEngine integration (SyncEngine is not used in production yet)
- Consolidating all 6 parallel adapter systems (architectural debt, separate effort)
- Linear, Notion, or other 4th provider implementation
- Migrating existing GitHub frontmatter to new per-US format
- Full JIRA/ADO push-sync for issue body creation (only AC checkbox section)
- Legacy JIRA Server or ADO on-prem

## Technical Notes

- **Function-map pattern**: A `Record<SyncProvider, SyncProviderFn>` maps providers to sync functions. No classes, no interfaces. Adding a 4th provider = add one function + register it.
- **AC checkbox formatter**: Shared `formatACCheckboxes(acStates, format)` utility. GitHub: `[x]/[ ]`, JIRA: `(/)/(x)`, ADO: `☑/☐` in HTML.
- **GitHub path**: Direct call to `postACProgressComments()` + `autoCloseCompletedUserStories()` — no refactor, no wrapper.
- **JIRA path**: `JiraClient.addComment()` for comments, REST PUT for description, `JiraStatusSync.updateStatus()` for transitions. Transition uses category matching (not name matching) since "Done" varies per project.
- **ADO path**: `AdoClient.addComment()` for comments, JSON Patch for description, `AdoStatusSync.updateStatus()` for state.
- **Circuit breaker**: Per-provider, file-based, 3 failures → open, 5 min auto-reset.
- **Debounce**: Shared 5s signal file, unchanged from 0193.
- **Per-US link resolution**: GitHub: `.github.userStories[US-XXX].issueNumber`, JIRA: `.jira.userStories[US-XXX].issueKey`, ADO: `.ado.userStories[US-XXX].workItemId`.

## Success Metrics

- AC completion → external tool update latency < 10s across all providers
- Zero task completion failures due to sync errors
- Test coverage > 80%
- Adding a 4th provider = one function (<100 lines)
- All 31 existing GitHub tests pass unchanged

## Dependencies

- Increment 0193 provides GitHub AC modules (used as-is, not refactored)
- Existing: `JiraClient`, `AdoClient`, `comment-builder.ts`, `JiraStatusSync`, `AdoStatusSync`
- `post-tool-use.sh` dispatcher for hook routing
- `task-ac-sync-guard.sh` for AC extraction from tasks
