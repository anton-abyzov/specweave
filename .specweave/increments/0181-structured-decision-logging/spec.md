---
increment: 0181-structured-decision-logging
title: "Structured Decision Logging for Hook Debugging"
type: feature
priority: P1
status: completed
created: 2026-02-02
structure: user-stories
test_mode: TDD
coverage_target: 80
---

# Feature: Structured Decision Logging for Hook Debugging

## Problem Statement

Developers debugging SpecWeave hook behavior (especially sw:auto and sw:reflect) struggle to understand WHY hooks make decisions. Current logs show only simple text like "APPROVE: Auto mode not activated" or "Reflection completed successfully" without context about what was checked, what state the system was in, or what caused the decision.

**Inspiration**: Claude Code 2.1.27's "Added tool call failures and denials to debug logs" which provides structured, searchable decision logging.

## Goals

- Enable rapid debugging of stuck auto-mode sessions
- Provide visibility into reflection outcomes (what was learned)
- Support programmatic analysis of hook decisions via JSON format
- Maintain backwards compatibility with existing log files

## User Stories

### US-001: Structured Decision Log Format (P1)
**Project**: specweave-dev

**As a** developer debugging hook behavior
**I want** all hook decisions logged in structured JSON format
**So that** I can query and analyze them programmatically

**Acceptance Criteria**:
- [x] **AC-US1-01**: All hooks write to `.specweave/logs/decisions.jsonl` (JSON Lines format)
- [x] **AC-US1-02**: Each decision entry includes: timestamp, hook name, decision (approve/block), reason
- [x] **AC-US1-03**: Each decision entry includes context object with hook-specific state
- [x] **AC-US1-04**: Log rotation when file exceeds 10MB (keep last 5MB)
- [x] **AC-US1-05**: Decision log is human-readable with `cat` and machine-parseable with `jq`

---

### US-002: Stop-Auto Decision Context (P1)
**Project**: specweave-dev

**As a** developer using sw:auto
**I want** detailed decision context logged for each stop-auto invocation
**So that** I can understand why sessions continue, stop, or get stuck

**Acceptance Criteria**:
- [x] **AC-US2-01**: Log turn counter state (current/max) on every decision
- [x] **AC-US2-02**: Log retry counter state (current/max) and whether stuck detected
- [x] **AC-US2-03**: Log validation results per increment (tasks pending, ACs open, tests status)
- [x] **AC-US2-04**: Log re-iteration context: previous reasons, progress made since last check
- [x] **AC-US2-05**: Log exit reason enum: `session_inactive`, `session_stale`, `turn_limit`, `retry_limit`, `all_complete`, `work_remaining`
- [x] **AC-US2-06**: When blocking, log specific blockers with actionable fix suggestions

---

### US-003: Stop-Reflect Outcome Logging (P1)
**Project**: specweave-dev

**As a** developer
**I want** reflection outcomes logged with details
**So that** I can see what learnings were extracted and why reflection completed

**Acceptance Criteria**:
- [x] **AC-US3-01**: Log reflection trigger reason (session end, manual invoke)
- [x] **AC-US3-02**: Log transcript stats (line count, message count)
- [x] **AC-US3-03**: Log learnings extracted count and categories
- [x] **AC-US3-04**: Log exit reason enum: `learnings_saved`, `nothing_to_learn`, `timeout`, `error`, `disabled`, `no_transcript`
- [x] **AC-US3-05**: Log duration in milliseconds

---

### US-004: Debug Mode Environment Variable (P2)
**Project**: specweave-dev

**As a** developer
**I want** a debug mode that shows verbose hook state to stderr
**So that** I can trace exactly what hooks are checking in real-time

**Acceptance Criteria**:
- [x] **AC-US4-01**: `SPECWEAVE_DEBUG_HOOKS=1` enables verbose logging to stderr
- [x] **AC-US4-02**: Debug mode logs each validation check as it happens
- [x] **AC-US4-03**: Debug mode logs state machine transitions
- [x] **AC-US4-04**: Debug output includes color-coded decision highlights
- [x] **AC-US4-05**: Debug mode does not affect hook decision output (stdout remains valid JSON)

---

### US-005: Decision Log CLI Query Tool (P2)
**Project**: specweave-dev

**As a** developer
**I want** a CLI command to query decision logs
**So that** I can analyze patterns and debug issues without manual jq scripting

**Acceptance Criteria**:
- [x] **AC-US5-01**: `specweave decision-log` shows recent decisions (default: last 20)
- [x] **AC-US5-02**: `specweave decision-log --hook stop-auto` filters by hook name
- [x] **AC-US5-03**: `specweave decision-log --decision block` filters by decision type
- [x] **AC-US5-04**: `specweave decision-log --since 1h` filters by time window (supports 1h, 24h, 7d)
- [x] **AC-US5-05**: `specweave decision-log --json` outputs raw JSON for piping to jq
- [x] **AC-US5-06**: `specweave decision-log --tail` follows log in real-time (like tail -f)

## Functional Requirements

### FR-001: Decision Log Utility
- File: `plugins/specweave/hooks/log-decision.sh`
- Shared bash function `log_decision()` used by all hooks
- Parameters: hook_name, decision, reason, reason_code, context_json, duration_ms

### FR-002: Decision Log Schema
```typescript
interface DecisionLogEntry {
  timestamp: string;           // ISO 8601
  hook: 'stop-auto' | 'stop-reflect' | 'user-prompt-submit';
  decision: 'approve' | 'block';
  reason: string;              // Human-readable reason
  reasonCode: string;          // Machine-parseable enum
  durationMs: number;          // Hook execution time
  context: object;             // Hook-specific context
}
```

### FR-003: Stop-Auto Context Schema
```typescript
interface StopAutoContext {
  sessionActive: boolean;
  turn: { current: number; max: number };
  retry: { current: number; max: number; stuck: boolean };
  increments: {
    active: string[];
    blocked: Array<{ id: string; reason: string; tasksPending: number; acsOpen: number }>;
  };
  previousReasons: string[];
}
```

### FR-004: Stop-Reflect Context Schema
```typescript
interface StopReflectContext {
  transcriptLines: number;
  reflectionEnabled: boolean;
  learningsExtracted: number;
  learningCategories: string[];
  exitReason: string;
  durationMs: number;
}
```

## Success Criteria

1. All hook decisions logged in structured JSON format within 1 week
2. `specweave decision-log` shows last 20 decisions in <100ms
3. Stuck session debugging time reduced (qualitative improvement)
4. Debug mode provides actionable insight without breaking hook JSON output

## Out of Scope

- Metrics/telemetry export (Prometheus, DataDog) - future enhancement
- Web dashboard for decision visualization
- Historical analysis beyond current log file rotation
- Integration with external logging systems (ELK, Splunk)

## Dependencies

- Existing hook infrastructure (stop-auto.sh, stop-reflect.sh, user-prompt-submit.sh)
- jq available in hook environment (already required)
- Commander.js for CLI command
