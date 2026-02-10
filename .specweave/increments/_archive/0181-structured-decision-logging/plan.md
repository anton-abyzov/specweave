# Implementation Plan: Structured Decision Logging

## Architecture Overview

Simple layered architecture with bash utility + TypeScript CLI:

```
┌─────────────────────────────────────────────────────────┐
│                    CLI Layer                            │
│  specweave decision-log (src/cli/commands/decision-log) │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   Log File Layer                         │
│        .specweave/logs/decisions.jsonl                   │
└─────────────────────────────────────────────────────────┘
                           ▲
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────┴───────┐  ┌───────┴───────┐  ┌───────┴───────┐
│  stop-auto.sh │  │stop-reflect.sh│  │user-prompt-   │
│               │  │               │  │submit.sh      │
└───────┬───────┘  └───────┬───────┘  └───────┬───────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Shared Utility Layer                        │
│           log-decision.sh (sourced)                      │
└─────────────────────────────────────────────────────────┘
```

## Component Design

### 1. log-decision.sh (NEW)

**Location**: `plugins/specweave/hooks/log-decision.sh`

**Purpose**: Shared bash utility sourced by all hooks

```bash
# API
log_decision "stop-auto" "approve" "session_inactive" "No auto session" "$context_json" "$duration_ms"

# Features
- Writes to .specweave/logs/decisions.jsonl
- Creates log directory if missing
- Handles log rotation (10MB -> keep 5MB)
- Debug mode: writes to stderr if SPECWEAVE_DEBUG_HOOKS=1
```

**Design decisions**:
- Pure bash (no external dependencies beyond jq)
- Atomic writes (write to temp, then mv)
- Context JSON passed as string (caller builds it)

### 2. stop-auto.sh Updates

**Changes**:
- Source `log-decision.sh` at top
- Capture start time at beginning
- Build context JSON before each decision point
- Call `log_decision()` instead of just `log()`
- Keep existing `log()` function for backwards compatibility

**Context to capture**:
```json
{
  "sessionActive": true,
  "turn": {"current": 5, "max": 20},
  "retry": {"current": 2, "max": 20, "stuck": false},
  "increments": {
    "active": ["0001-feature"],
    "blocked": [{"id": "0001-feature", "tasksPending": 3, "acsOpen": 1}]
  },
  "previousReasons": ["3 tasks pending", "2 tasks pending"]
}
```

### 3. stop-reflect.sh Updates

**Changes**:
- Source `log-decision.sh` at top
- Capture transcript stats before processing
- Capture learnings count after TypeScript reflection
- Call `log_decision()` with outcome context

**Context to capture**:
```json
{
  "transcriptLines": 1475,
  "reflectionEnabled": true,
  "learningsExtracted": 2,
  "learningCategories": ["Devops", "Logging"],
  "exitReason": "learnings_saved",
  "durationMs": 11000
}
```

### 4. decision-log.ts (NEW CLI)

**Location**: `src/cli/commands/decision-log.ts`

**Commands**:
```
specweave decision-log [options]

Options:
  --hook <name>      Filter by hook name
  --decision <type>  Filter by decision (approve|block)
  --since <time>     Time window (1h, 24h, 7d)
  --limit <n>        Number of entries (default: 20)
  --json             Raw JSON output
  --tail             Follow log in real-time
```

**Implementation approach**:
- Stream JSONL parsing (readline, not load-all)
- Filtering done during stream
- Color-coded output for human reading
- Uses chalk for colors

### 5. Debug Mode

**Trigger**: `SPECWEAVE_DEBUG_HOOKS=1`

**Output**: stderr (never stdout - that's for JSON)

**Format**:
```
[DEBUG] stop-auto: Checking session active...
[DEBUG] stop-auto: Session active=true, turn=5/20
[DEBUG] stop-auto: Validating increment 0001-feature...
[DEBUG] stop-auto: ✓ Tasks: 3 pending
[DEBUG] stop-auto: ✓ ACs: 1 open
[DEBUG] stop-auto: DECISION: block (work_remaining)
```

## File Changes Summary

| File | Action | LOC Estimate |
|------|--------|--------------|
| `plugins/specweave/hooks/log-decision.sh` | NEW | ~80 |
| `plugins/specweave/hooks/stop-auto.sh` | UPDATE | +50 |
| `plugins/specweave/hooks/stop-reflect.sh` | UPDATE | +30 |
| `src/cli/commands/decision-log.ts` | NEW | ~150 |
| `src/cli/index.ts` | UPDATE | +5 |
| `tests/unit/hooks/log-decision.test.ts` | NEW | ~100 |
| `tests/unit/cli/decision-log.test.ts` | NEW | ~100 |

## Testing Strategy

**Unit tests**:
- log-decision.sh: Test JSON format, rotation, debug mode
- decision-log.ts: Test filtering, time parsing, output formats

**Integration tests**:
- stop-auto.sh with log-decision: Verify context captured
- stop-reflect.sh with log-decision: Verify outcome logging
- CLI end-to-end: Create test log, query it

## Implementation Order (TDD)

1. **RED**: Write tests for log-decision.sh
2. **GREEN**: Implement log-decision.sh
3. **RED**: Write tests for stop-auto integration
4. **GREEN**: Update stop-auto.sh
5. **RED**: Write tests for stop-reflect integration
6. **GREEN**: Update stop-reflect.sh
7. **RED**: Write tests for decision-log CLI
8. **GREEN**: Implement decision-log.ts
9. **REFACTOR**: Clean up, optimize log rotation
