# 0206: Universal External Sync Fix

feature_id: FS-206

## Problem Statement

External sync silently drops events because ProjectService requires a `project:` field in spec.md that most increments lack. Additionally, only GitHub has auto-create/auto-close handlers; JIRA and ADO are configured but never receive events.

## User Stories

### US-001: Fix Silent Event Drop in ProjectService

As a developer, I want lifecycle events (created, done, reopened) to always reach external tools, so that GitHub/JIRA/ADO issues stay in sync.

**Acceptance Criteria**:
- [x] AC-US1-01: `getProjectForIncrement()` falls back to config-based project when spec.md has no `project:` field
- [x] AC-US1-02: `emitIncrementEvent()` no longer silently drops events for increments without project field
- [x] AC-US1-03: `increment.sync` event type handled as catch-all in ProjectService

### US-002: Universal Auto-Create for All Providers

As a developer, I want issues auto-created in ALL enabled external tools (GitHub, JIRA, ADO) when spec.md is written, not just GitHub.

**Acceptance Criteria**:
- [x] AC-US2-01: Universal auto-create dispatcher checks all enabled providers
- [x] AC-US2-02: GitHub auto-create delegated to existing handler (backward compatible)
- [x] AC-US2-03: JIRA/ADO issue creation via new TypeScript module
- [x] AC-US2-04: metadata.json updated with externalLinks for all providers

### US-003: Explicit Closure on Increment Completion

As a developer, I want external tool issues explicitly closed when increment status becomes "completed", not just rely on AC sync.

**Acceptance Criteria**:
- [x] AC-US3-01: `closeIncrementIssues()` exported from ac-progress-sync.ts
- [x] AC-US3-02: post-tool-use.sh triggers closure when status=completed/done
- [x] AC-US3-03: Closure works for all three providers (GitHub, JIRA, ADO)

### US-004: Fix Session-End Batch Sync

As a developer, I want queued events processed correctly at session end with proper event types.

**Acceptance Criteria**:
- [x] AC-US4-01: stop-sync.sh preserves original event type from pending.jsonl
- [x] AC-US4-02: ProjectService handles `increment.sync` as catch-all

### US-005: Comprehensive Test Coverage

As a developer, I want integration tests covering the full sync lifecycle so regressions are caught.

**Acceptance Criteria**:
- [x] AC-US5-01: Unit tests for ProjectService fallback chain
- [x] AC-US5-02: Unit tests for universal auto-create
- [x] AC-US5-03: Unit tests for closeIncrementIssues()
- [x] AC-US5-04: Integration tests for full dispatcher chain rewritten
