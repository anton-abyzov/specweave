# Tasks: External Items Dashboard

## Task Overview

| Task | Title | Status | User Story |
|------|-------|--------|------------|
| T-001 | Create ExternalItemsCounter service | completed | US-001, US-003 |
| T-002 | Implement provider adapters | completed | US-001, US-003 |
| T-003 | Add external items to status command | completed | US-001 |
| T-004 | Create /specweave:external command | completed | US-003 |
| T-005 | Add footer to progress display | deferred | US-004 |
| T-006 | Add notification to increment-planner | completed | US-002 |
| T-007 | Write unit and integration tests | completed | All |

---

### T-001: Create ExternalItemsCounter Service
**User Story**: US-001, US-003
**Satisfies ACs**: AC-US1-01, AC-US3-01
**Status**: [x] completed

**Description**:
Create the core ExternalItemsCounter service that aggregates open items from all configured external tools.

**Implementation**:
1. Create `src/core/external-tools/external-items-counter.ts`
2. Define interfaces: `ExternalItemsSummary`, `ProviderSummary`, `ExternalItem`
3. Implement `getExternalItemsSummary()` method
4. Add caching with 15min TTL using existing CacheManager
5. Implement stale detection (items >7 days old)
6. Add `--refresh` flag support to force cache invalidation

**Files**:
- NEW: `src/core/external-tools/external-items-counter.ts`

**Tests**:
- [ ] Counter aggregates items from multiple providers
- [ ] Cache is used when valid (within TTL)
- [ ] Cache is refreshed when expired
- [ ] Stale items (>7d) are correctly flagged
- [ ] Force refresh bypasses cache

---

### T-002: Implement Provider Adapters
**User Story**: US-001, US-003
**Satisfies ACs**: AC-US1-05, AC-US3-02
**Status**: [x] completed

**Description**:
Create adapters for each external tool provider (GitHub, JIRA, ADO) that implement a common interface.

**Implementation**:
1. Define `ExternalItemsProvider` interface
2. Create `GitHubItemsAdapter` using `gh issue list --state open --json`
3. Create `JiraItemsAdapter` using existing JIRA client
4. Create `AdoItemsAdapter` using existing ADO client
5. Each adapter returns: id, title, url, createdAt, labels, project
6. Handle "not configured" state gracefully

**Files**:
- NEW: `src/core/external-tools/providers/github-items-adapter.ts`
- NEW: `src/core/external-tools/providers/jira-items-adapter.ts`
- NEW: `src/core/external-tools/providers/ado-items-adapter.ts`
- NEW: `src/core/external-tools/providers/index.ts`

**Tests**:
- [ ] GitHub adapter returns correct item format
- [ ] JIRA adapter handles JQL query correctly
- [ ] ADO adapter uses correct WIQL
- [ ] Adapters return empty array when not configured
- [ ] Error handling for API failures

---

### T-003: Add External Items to Status Command
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04, AC-US1-05
**Status**: [x] completed

**Description**:
Modify the status command to display external items summary after the increment list.

**Implementation**:
1. Import ExternalItemsCounter in `src/core/increment/status-commands.ts`
2. Add `showExternalItemsSummary()` function
3. Display format: `📋 External (open): GH:4 JI:0 ADO:0`
4. Show per-project breakdown for multi-project setups
5. Indicate stale items: `GH:4 (2⚠️ stale)`
6. Hide section entirely if no external tools configured

**Files**:
- MODIFY: `src/core/increment/status-commands.ts`
- NEW: `src/core/external-tools/external-items-display.ts`

**Tests**:
- [ ] Status shows external items section
- [ ] Correct format for each provider
- [ ] Per-project breakdown displays correctly
- [ ] Stale warning shown for old items
- [ ] Section hidden when no providers configured

---

### T-004: Create /specweave:external Command
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04, AC-US3-05, AC-US3-06
**Status**: [x] completed

**Description**:
Create a dedicated command for viewing detailed external items dashboard.

**Implementation**:
1. Create `plugins/specweave/commands/specweave-external.md`
2. Display items grouped by provider with full details
3. Show: number, title, age, labels, URL for each item
4. Sort by age (oldest first)
5. Highlight stale items with ⚠️
6. Add summary line: `Total: 4 open (2 stale)`
7. Support `--refresh` flag

**Files**:
- NEW: `plugins/specweave/commands/specweave-external.md`

**Tests**:
- [ ] Command displays all open items
- [ ] Items grouped by provider
- [ ] Correct sorting by age
- [ ] Stale items highlighted
- [ ] --refresh flag works

---

### T-005: Add Footer to Progress Display
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03
**Status**: [ ] deferred (separate increment)

**Description**:
Add external items indicator to progress tracker footer.

**Implementation**:
1. Modify `src/core/progress/progress-tracker.ts`
2. Add optional footer line after progress bar
3. Format: `📋 4 external items open`
4. Hide footer when 0 open items
5. Use cached data only (no API calls during progress)

**Files**:
- MODIFY: `src/core/progress/progress-tracker.ts`

**Tests**:
- [ ] Footer displays with open items count
- [ ] Footer hidden when count is 0
- [ ] Uses cache (no API calls)

---

### T-006: Add Notification to Increment Planner
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04
**Status**: [x] completed

**Description**:
Modify the increment-planner skill to notify about open external items after planning.

**Implementation**:
1. Modify `plugins/specweave/skills/increment-planner.md`
2. After planning completes, check external items count
3. If >0: Show `⚠️ 4 unaddressed external items. View details? [y/n]`
4. If user selects 'y': Display detailed list with titles and links
5. Skip notification if 0 open items

**Files**:
- MODIFY: `plugins/specweave/skills/increment-planner.md`

**Tests**:
- [ ] Notification shown when external items exist
- [ ] Correct format with item count
- [ ] Details shown on 'y' selection
- [ ] Notification skipped when 0 items

---

### T-007: Write Unit and Integration Tests
**User Story**: All
**Satisfies ACs**: All
**Status**: [x] completed

**Description**:
Create comprehensive tests for the external items dashboard feature.

**Implementation**:
1. Unit tests for ExternalItemsCounter
2. Unit tests for each provider adapter
3. Integration tests for status command with external items
4. Integration tests for /specweave:external command
5. Mock providers for offline/CI testing

**Files**:
- NEW: `tests/unit/external-tools/external-items-counter.test.ts`
- NEW: `tests/unit/external-tools/provider-adapters.test.ts`
- NEW: `tests/integration/external-tools/external-dashboard.test.ts`

**Tests**:
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Coverage >80% for new code
