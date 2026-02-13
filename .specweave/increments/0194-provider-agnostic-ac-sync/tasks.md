# Tasks: Provider-Agnostic AC Progress Sync (GitHub + JIRA + ADO)

## Task Notation

- `[T-NNN]`: Task ID
- `[RED]` / `[GREEN]` / `[REFACTOR]`: TDD phase
- `[ ]`: Not started | `[x]`: Completed

---

## Phase 1: AC Checkbox Formatter + Per-US Link Types

### T-001: [RED] Write AC checkbox formatter tests
**User Story**: US-001, US-002, US-003 | **Satisfies ACs**: AC-US1-06, AC-US5-08 | **Status**: [x] completed
**Depends On**: None
**Test**:
- Given `formatACCheckboxes(acStates, 'github')`, When ACs have mixed states, Then output uses `- [x]`/`- [ ]` markdown
- Given `formatACCheckboxes(acStates, 'jira')`, When ACs have mixed states, Then output uses `(/) AC-ID: done` and `(x) AC-ID: pending`
- Given `formatACCheckboxes(acStates, 'ado')`, When ACs have mixed states, Then output uses `<li>☑</li>` and `<li>☐</li>` HTML
- Given empty acStates array, When any format is called, Then returns empty string
**File**: `tests/unit/core/ac-checkbox-formatter.test.ts`

### T-002: [GREEN] Implement AC checkbox formatter
**User Story**: US-001, US-002, US-003 | **Satisfies ACs**: AC-US1-06, AC-US2-02, AC-US3-02 | **Status**: [x] completed
**Depends On**: T-001
**File**: `src/core/ac-checkbox-formatter.ts`

### T-003: [GREEN] Add JiraUserStoryLink and AdoUserStoryLink types
**User Story**: US-004 | **Satisfies ACs**: AC-US4-04, AC-US4-05 | **Status**: [x] completed
**Depends On**: None
**File**: `src/core/types/sync-profile.ts`

---

## Phase 2: Core Sync Function + GitHub Delegation

### T-004: [RED] Write syncACProgressToProviders core dispatch tests
**User Story**: US-001, US-005 | **Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-04, AC-US1-05, AC-US5-01, AC-US5-02, AC-US5-03 | **Status**: [x] completed
**Depends On**: T-002
**Test**:
- Given config has only GitHub enabled, When called, Then only GitHub provider executes
- Given all 3 providers enabled, When called, Then all execute and results aggregate
- Given one provider throws, When others are enabled, Then error isolated and others still run
- Given no providers enabled, When called, Then returns empty result
- Given spec.md with per-US links, When context built, Then ACProgressContext has parsed states and links
**File**: `tests/unit/core/ac-progress-sync.test.ts`

### T-005: [RED] Write GitHub delegation tests
**User Story**: US-001, US-005 | **Satisfies ACs**: AC-US1-03, AC-US5-04, AC-US5-09 | **Status**: [x] completed
**Depends On**: T-004
**Test**:
- Given GitHub enabled, When sync runs, Then delegates to `postACProgressComments()` with correct args
- Given all ACs complete for a US, Then also calls `autoCloseCompletedUserStories()`
- Given existing 31 GitHub tests, When `npm test` runs, Then all 31 pass unchanged
**File**: `tests/unit/core/ac-progress-sync.test.ts`

### T-006: [GREEN] Implement syncACProgressToProviders + GitHub delegation
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04, AC-US1-05, AC-US1-06 | **Status**: [x] completed
**Depends On**: T-004, T-005
**File**: `src/core/ac-progress-sync.ts`

---

## Phase 3: JIRA Provider Function

### T-007: [RED] Write JIRA AC sync tests
**User Story**: US-002, US-005 | **Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04, AC-US2-05, AC-US5-05 | **Status**: [x] completed
**Depends On**: T-006
**Test**:
- Given JIRA enabled and US has issueKey, When sync runs, Then comment posted with JIRA markup `(/)`/`(x)`
- Given all ACs complete, Then `JiraStatusSync.updateStatus(key, {state:'Done'})` called
- Given issue already done, Then skipped with reason `already-closed`
- Given JIRA API throws 429, Then error recorded non-blocking
- Given US has no JIRA link, Then skipped with reason `no-issue-link`
**File**: `tests/unit/core/ac-progress-sync.test.ts`

### T-008: [GREEN] Implement JIRA provider function
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04, AC-US2-05 | **Status**: [x] completed
**Depends On**: T-007
**File**: `src/core/ac-progress-sync.ts`

---

## Phase 4: ADO Provider Function

### T-009: [RED] Write ADO AC sync tests
**User Story**: US-003, US-005 | **Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04, AC-US3-05, AC-US5-06 | **Status**: [x] completed
**Depends On**: T-006
**Test**:
- Given ADO enabled and US has workItemId, When sync runs, Then comment posted with HTML `☑`/`☐`
- Given all ACs complete, Then `AdoStatusSync.updateStatus(id, {state:'Closed'})` called
- Given work item already closed, Then skipped with reason `already-closed`
- Given ADO API throws, Then error recorded non-blocking
- Given US has no ADO link, Then skipped with reason `no-issue-link`
**File**: `tests/unit/core/ac-progress-sync.test.ts`

### T-010: [GREEN] Implement ADO provider function
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04, AC-US3-05 | **Status**: [x] completed
**Depends On**: T-009
**File**: `src/core/ac-progress-sync.ts`

---

## Phase 5: Refactor + Circuit Breaker

### T-011: [REFACTOR] Extract shared helpers and clean types
**User Story**: US-001 | **Satisfies ACs**: AC-US1-02, AC-US1-06 | **Status**: [x] completed
**Depends On**: T-008, T-010

### T-012: [RED] Write per-provider circuit breaker tests
**User Story**: US-005 | **Satisfies ACs**: AC-US5-07 | **Status**: [x] completed
**Depends On**: T-006
**Test**:
- Given provider fails 3 times, When circuit checked, Then `canSync()` returns false
- Given circuit open + 5 min elapsed, Then `canSync()` returns true (half-open)
- Given JIRA circuit open but GitHub closed, Then only GitHub executes
**File**: `tests/unit/core/ac-progress-sync.test.ts`

### T-013: [GREEN] Integrate per-provider circuit breaker
**User Story**: US-002, US-003, US-005 | **Satisfies ACs**: AC-US2-05, AC-US3-05, AC-US5-07 | **Status**: [x] completed
**Depends On**: T-012

---

## Phase 6: Unified Shell Dispatcher

### T-014: [RED] Define ac-sync-dispatcher.sh behavioral spec
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-03, AC-US4-06 | **Status**: [x] completed
**Depends On**: T-006

### T-015: [GREEN] Create ac-sync-dispatcher.sh
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-03, AC-US4-06 | **Status**: [x] completed
**Depends On**: T-014
**File**: `plugins/specweave/hooks/v2/ac-sync-dispatcher.sh`

### T-016: [GREEN] Update post-tool-use.sh to reference new dispatcher
**User Story**: US-004 | **Satisfies ACs**: AC-US4-02 | **Status**: [x] completed
**Depends On**: T-015
**File**: `plugins/specweave/hooks/v2/dispatchers/post-tool-use.sh`

---

## Phase 7: Integration Verification

### T-017: [RED] Write multi-provider integration test
**User Story**: US-005 | **Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-04, AC-US5-05, AC-US5-06 | **Status**: [x] completed
**Depends On**: T-008, T-010
**File**: `tests/unit/core/ac-progress-sync-integration.test.ts`

### T-018: [GREEN] Verify multi-provider integration tests pass
**User Story**: US-005 | **Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-04, AC-US5-05, AC-US5-06 | **Status**: [x] completed
**Depends On**: T-017

### T-019: Verify all 31 existing GitHub tests pass unchanged
**User Story**: US-005 | **Satisfies ACs**: AC-US5-09 | **Status**: [x] completed
**Depends On**: T-006

### T-020: Update done skill to reference provider-agnostic sync
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01 | **Status**: [x] completed
**Depends On**: T-016
**File**: `plugins/specweave/skills/done/SKILL.md`

---

## Phase 8: Dead Code Cleanup

### T-021: Remove ThreeLayerSyncManager dead code
**User Story**: US-006 | **Satisfies ACs**: AC-US6-01 | **Status**: [x] completed
**Depends On**: T-019

### T-022: Remove orphaned GitHub sync CLI files
**User Story**: US-006 | **Satisfies ACs**: AC-US6-02, AC-US6-03, AC-US6-04, AC-US6-05 | **Status**: [x] completed
**Depends On**: T-019

### T-023: Remove old github-ac-sync-handler.sh
**User Story**: US-006 | **Satisfies ACs**: AC-US6-06 | **Status**: [x] completed
**Depends On**: T-016, T-019

### T-024: Verify all tests pass after dead code removal
**User Story**: US-006 | **Satisfies ACs**: AC-US6-07 | **Status**: [x] completed
**Depends On**: T-021, T-022, T-023
