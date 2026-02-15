# Tasks: Fix GitHub Issues Sync Gap

## Phase 1: Shared Config Check (US-004)

### T-001: Create shared check-provider-enabled.sh
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-05 | **Status**: [x] completed
**Test**: Given config with profiles format → When check_provider_enabled runs → Then returns 0 (enabled)
**Test**: Given config with legacy direct format → When check_provider_enabled runs → Then returns 0
**Test**: Given config with legacy provider format → When check_provider_enabled runs → Then returns 0
**Test**: Given missing config → When check_provider_enabled runs → Then returns 1 (disabled)
**File**: `plugins/specweave/hooks/v2/lib/check-provider-enabled.sh`
**Details**: Create shared bash function with 3-method detection mirroring github-sync-handler.sh:72-107. Uses grep (not jq) for speed.

### T-002: Write tests for check-provider-enabled.sh
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-05 | **Status**: [x] completed
**File**: `tests/unit/hooks/check-provider-enabled.test.ts`
**Details**: Vitest tests using execSync to invoke the bash function with fixture config files.

## Phase 2: Fix Metadata Format Reading (US-001, US-003)

### T-003: Fix ac-sync-dispatcher to read both metadata formats
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04 | **Status**: [x] completed
**Test**: Given metadata with OLD github.issues[] → When extracting US IDs → Then finds all user stories
**Test**: Given metadata with NEW externalLinks.github.issues → When extracting US IDs → Then finds all user stories
**Test**: Given metadata with both formats → When extracting US IDs → Then returns deduplicated union
**Test**: Given empty metadata → When extracting US IDs → Then returns empty array
**File**: `plugins/specweave/hooks/v2/handlers/ac-sync-dispatcher.sh` lines 185-191
**Details**: Add `(.github.issues // [] | .[].userStory // empty)` to jq expression alongside existing externalLinks reads.

### T-004: Update ac-sync-dispatcher to use shared config check
**User Story**: US-004 | **Satisfies ACs**: AC-US4-04 | **Status**: [x] completed
**File**: `plugins/specweave/hooks/v2/handlers/ac-sync-dispatcher.sh` lines 93-100
**Details**: Source check-provider-enabled.sh and replace inline jq checks.

### T-005: Fix github-auto-create-handler idempotency check
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03 | **Status**: [x] completed
**Test**: Given metadata with externalLinks issues → When checking existing → Then skips creation
**Test**: Given metadata with github.issues[] → When checking existing → Then skips creation
**File**: `plugins/specweave-github/hooks/github-auto-create-handler.sh` lines 127-134
**Details**: Add OLD format check: `(.github.issues // [] | .[] | select(.number != null))` in jq count.

### T-006: Update github-auto-create-handler to use shared config check
**User Story**: US-004 | **Satisfies ACs**: AC-US4-04 | **Status**: [x] completed
**File**: `plugins/specweave-github/hooks/github-auto-create-handler.sh` line 58
**Details**: Source check-provider-enabled.sh and replace `jq -r '.sync.github.enabled // false'`.

### T-007: Write integration tests for metadata format reading
**User Story**: US-001, US-003 | **Satisfies ACs**: AC-US1-01 through AC-US1-04, AC-US3-01 through AC-US3-03 | **Status**: [x] completed
**File**: `tests/integration/hooks/github-sync-metadata-formats.test.ts`
**Details**: Test jq expressions against fixture metadata files in old, new, and mixed formats.

## Phase 3: Fix Stop-Sync Event Routing (US-002)

### T-008: Add user-story events to get_best_event_type()
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02 | **Status**: [x] completed
**Test**: Given pending user-story.completed event → When get_best_event_type runs → Then returns user-story.completed
**Test**: Given pending user-story.reopened event → When get_best_event_type runs → Then returns user-story.reopened
**Test**: Given both increment.done and user-story.completed → Then increment.done wins (higher priority)
**File**: `plugins/specweave/hooks/stop-sync.sh` lines 156-171
**Details**: Add user-story.completed and user-story.reopened to the priority chain, between increment.created and increment.reopened.

### T-009: Invoke github-sync-handler for user-story events
**User Story**: US-002 | **Satisfies ACs**: AC-US2-03, AC-US2-04 | **Status**: [x] completed
**Test**: Given user-story.completed event at session end → When stop-sync processes it → Then github-sync-handler.sh is invoked
**Test**: Given event data "0206-fix:US-001" → When github-sync-handler receives it → Then INC_ID=0206-fix and US_ID=US-001
**File**: `plugins/specweave/hooks/stop-sync.sh` lines 173-187
**Details**: After project-bridge-handler call, check EVENT_TYPES_FILE for user-story events. For each unique US event, invoke github-sync-handler with event type and INC_ID:US_ID data extracted from pending.jsonl.

### T-010: Update universal-auto-create-dispatcher to use shared config check
**User Story**: US-004 | **Satisfies ACs**: AC-US4-04 | **Status**: [x] completed
**File**: `plugins/specweave/hooks/v2/handlers/universal-auto-create-dispatcher.sh` lines 93-100
**Details**: Source check-provider-enabled.sh and replace inline jq checks.

### T-011: Write integration tests for stop-sync event routing
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01 through AC-US2-04 | **Status**: [x] completed
**File**: `tests/integration/hooks/stop-sync-event-routing.test.ts`
**Details**: Test get_best_event_type with various event combinations. Verify github-sync-handler invocation for user-story events.

## Phase 4: Verification

### T-012: Run full test suite and verify build
**Status**: [x] completed
**Details**: `npm run rebuild && npm test` — ensure no regressions.
