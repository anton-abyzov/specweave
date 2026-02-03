# Tasks: Structured Decision Logging

## Task Notation

- `[T###]`: Task ID
- `[RED]`/`[GREEN]`/`[REFACTOR]`: TDD phase
- `[ ]`: Not started | `[x]`: Completed
- Model hints: haiku (simple), sonnet (default), opus (complex)

---

## Phase 1: Core Utility (log-decision.sh)

### T-001: [RED] Write failing tests for log-decision.sh
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Status**: [x] completed
**Model**: sonnet

**Test Plan**:
- **File**: `tests/unit/hooks/log-decision.test.ts`
- **Tests**:
  - TC-001: log_decision writes to decisions.jsonl
    - Given: Empty log directory
    - When: log_decision called with valid params
    - Then: decisions.jsonl created with JSON entry
  - TC-002: Entry includes all required fields
    - Given: log_decision called
    - When: Entry parsed as JSON
    - Then: Has timestamp, hook, decision, reason, reasonCode, durationMs, context
  - TC-003: Context is valid JSON object
    - Given: log_decision called with context JSON
    - When: Entry parsed
    - Then: context field is parseable object

---

### T-002: [GREEN] Implement log-decision.sh
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Depends On**: T-001
**Status**: [x] completed
**Model**: sonnet

**Implementation**:
- Create `plugins/specweave/hooks/log-decision.sh`
- Implement `log_decision()` function
- Parameters: hook_name, decision, reason_code, reason, context_json, duration_ms
- Write JSON entry to `.specweave/logs/decisions.jsonl`
- Create directory if missing

---

### T-003: [RED] Write failing tests for log rotation
**User Story**: US-001
**Satisfies ACs**: AC-US1-04
**Depends On**: T-002
**Status**: [x] completed
**Model**: sonnet

**Test Plan**:
- TC-004: Log rotation triggers at 10MB
  - Given: decisions.jsonl is 11MB
  - When: log_decision called
  - Then: File truncated to ~5MB (keeping recent entries)

---

### T-004: [GREEN] Implement log rotation
**User Story**: US-001
**Satisfies ACs**: AC-US1-04
**Depends On**: T-003
**Status**: [x] completed
**Model**: haiku

**Implementation**:
- Check file size before write
- If >10MB, keep last 5MB using tail
- Atomic rotation (temp file + mv)

---

## Phase 2: Stop-Auto Integration

### T-005: [RED] Write failing tests for stop-auto context logging
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03
**Depends On**: T-002
**Status**: [x] completed
**Model**: sonnet

**Test Plan**:
- **File**: `tests/unit/hooks/stop-auto-logging.test.ts`
- **Tests**:
  - TC-005: Stop-auto logs turn counter
    - Given: Active auto session with turn=5, max=20
    - When: stop-auto.sh executes
    - Then: Decision log entry has turn.current=5, turn.max=20
  - TC-006: Stop-auto logs retry counter
    - Given: Active auto session with retry=2
    - When: stop-auto.sh executes
    - Then: Decision log entry has retry.current=2, retry.stuck=false
  - TC-007: Stop-auto logs increment validation
    - Given: Active increment with 3 pending tasks
    - When: stop-auto.sh executes
    - Then: Decision log entry has blocked[0].tasksPending=3

---

### T-006: [GREEN] Update stop-auto.sh with structured logging
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04, AC-US2-05, AC-US2-06
**Depends On**: T-005
**Status**: [x] completed
**Model**: sonnet

**Implementation**:
- Source log-decision.sh at top
- Capture START_TIME at beginning
- Build context JSON before each decision
- Replace `silent_approve()` calls with `log_decision()` + approve
- Add reasonCode enum values
- Keep existing log() for backwards compatibility

---

## Phase 3: Stop-Reflect Integration

### T-007: [RED] Write failing tests for stop-reflect outcome logging
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03
**Depends On**: T-002
**Status**: [x] completed
**Model**: sonnet

**Test Plan**:
- **File**: `tests/unit/hooks/stop-reflect-logging.test.ts`
- **Tests**:
  - TC-008: Stop-reflect logs transcript stats
    - Given: Transcript with 500 lines
    - When: stop-reflect.sh executes
    - Then: Decision log entry has transcriptLines=500
  - TC-009: Stop-reflect logs learnings count
    - Given: Reflection extracts 2 learnings
    - When: stop-reflect.sh completes
    - Then: Decision log entry has learningsExtracted=2
  - TC-010: Stop-reflect logs exit reason
    - Given: Reflection disabled in config
    - When: stop-reflect.sh executes
    - Then: Decision log entry has exitReason="disabled"

---

### T-008: [GREEN] Update stop-reflect.sh with outcome logging
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04, AC-US3-05
**Depends On**: T-007
**Status**: [x] completed
**Model**: sonnet

**Implementation**:
- Source log-decision.sh at top
- Capture transcript line count
- Parse TypeScript reflection output for learnings count
- Build context JSON with all outcome data
- Call log_decision() before exit

---

## Phase 4: Debug Mode

### T-009: [RED] Write failing tests for debug mode
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-05
**Depends On**: T-002
**Status**: [x] completed
**Model**: sonnet

**Test Plan**:
- TC-011: Debug mode writes to stderr
  - Given: SPECWEAVE_DEBUG_HOOKS=1
  - When: log_decision called
  - Then: Debug output appears on stderr, stdout has valid JSON
- TC-012: Debug mode disabled by default
  - Given: SPECWEAVE_DEBUG_HOOKS not set
  - When: log_decision called
  - Then: No stderr output

---

### T-010: [GREEN] Implement debug mode in log-decision.sh
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04, AC-US4-05
**Depends On**: T-009
**Status**: [x] completed
**Model**: haiku

**Implementation**:
- Check SPECWEAVE_DEBUG_HOOKS env var
- If set, write colored debug info to stderr
- Never affect stdout (hook JSON output)

---

## Phase 5: CLI Query Tool

### T-011: [RED] Write failing tests for decision-log CLI
**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03
**Depends On**: T-002
**Status**: [x] completed
**Model**: sonnet

**Test Plan**:
- **File**: `tests/unit/cli/decision-log.test.ts`
- **Tests**:
  - TC-013: Shows last 20 decisions by default
    - Given: Log with 50 entries
    - When: specweave decision-log
    - Then: Output shows 20 most recent
  - TC-014: Filters by hook name
    - Given: Log with stop-auto and stop-reflect entries
    - When: specweave decision-log --hook stop-auto
    - Then: Only stop-auto entries shown
  - TC-015: Filters by decision type
    - Given: Log with approve and block entries
    - When: specweave decision-log --decision block
    - Then: Only block entries shown

---

### T-012: [GREEN] Implement decision-log CLI command
**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03, AC-US5-04, AC-US5-05
**Depends On**: T-011
**Status**: [x] completed
**Model**: sonnet

**Implementation**:
- Create `src/cli/commands/decision-log.ts`
- Stream JSONL parsing with readline
- Implement filters: --hook, --decision, --since, --limit
- Implement --json for raw output
- Register command in index.ts

---

### T-013: [RED] Write failing tests for --tail mode
**User Story**: US-005
**Satisfies ACs**: AC-US5-06
**Depends On**: T-012
**Status**: [x] completed
**Model**: sonnet

**Test Plan**:
- TC-016: --tail follows new entries
  - Given: Running with --tail
  - When: New entry written to log
  - Then: Entry appears in output

---

### T-014: [GREEN] Implement --tail mode
**User Story**: US-005
**Satisfies ACs**: AC-US5-06
**Depends On**: T-013
**Status**: [x] completed
**Model**: haiku

**Implementation**:
- Use fs.watch or chokidar for file watching
- Stream new lines as they appear
- Handle file rotation gracefully

---

## Phase 6: Refactoring

### T-015: [REFACTOR] Optimize and clean up
**User Story**: All
**Satisfies ACs**: All
**Depends On**: T-014
**Status**: [x] completed
**Model**: sonnet

**Refactoring tasks**:
- Review log rotation performance
- Ensure atomic writes in all scenarios
- Add error handling for edge cases
- Clean up debug output formatting
- Update CLAUDE.md with new commands

---

## Summary

| Phase | Tasks | Status |
|-------|-------|--------|
| 1. Core Utility | T-001, T-002 | ✅ Completed |
| 1. Core Utility | T-003, T-004 (log rotation) | ✅ Completed |
| 2. Stop-Auto | T-005, T-006 | ✅ Completed |
| 3. Stop-Reflect | T-007, T-008 | ✅ Completed |
| 4. Debug Mode | T-009, T-010 | ✅ Completed |
| 5. CLI Tool | T-011, T-012 | ✅ Completed |
| 5. CLI Tool | T-013, T-014 (--tail mode) | ✅ Completed |
| 6. Refactor | T-015 | ✅ Completed |

**Completed**: 15/15 tasks (all P1 + P2 functionality)
**Remaining**: 0 tasks
