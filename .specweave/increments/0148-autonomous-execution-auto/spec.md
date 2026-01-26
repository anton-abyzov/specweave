---
increment: 0148-autonomous-execution-auto
title: "Autonomous Execution Engine with Stop Hook Integration"
priority: P1
status: completed
created: 2025-12-29
dependencies: []
structure: user-stories
tech_stack:
  detected_from: "package.json"
  language: "typescript"
  framework: "node-cli"
  testing: "vitest"
estimated_effort: "3-4 weeks"
---

# Autonomous Execution Engine with Stop Hook Integration

## Executive Summary

**Auto mode is the DEFAULT** - SpecWeave commands automatically continue working until completion using Claude Code's Stop Hook. No special commands needed.

**Key Value Proposition**: "Ship features while you sleep" - autonomous end-to-end delivery with safety guardrails.

**Optimized for Claude Code MAX Plan**: Works best with subscription-based usage (no API key needed). No token cost tracking - unlimited usage until work is done.

**Design Philosophy**:
- `/sw:increment` auto-detects project complexity and splits into multiple increments with dependencies
- `/sw:do` continues until all tasks complete (stop hook loop)
- `/sw:next` auto-transitions to next increment in queue
- `/sw:progress` and `/sw:status` show auto session info when active
- Only `/sw:cancel-auto` is a new command (to opt-out of running session)
- Use `--manual` flag to opt-OUT of auto behavior (not `--auto` to opt-in)

**Inspiration**: Using a stop hook feedback loop pattern, fully integrated with SpecWeave's spec-driven workflow, living docs, and external tool sync.

---

## LLM Judge Evaluation Summary (Stop Hook Feedback Loop)

**Overall Score: 4.3/5.0 - PASS**

| Dimension | Score | Assessment |
|-----------|-------|------------|
| Conceptual Alignment | 4.5/5 | Stop Hook feedback loop pattern ✅ |
| Stop Hook Implementation | 5.0/5 | Perfect - `stop_hook_active` flag, block/approve ✅ |
| Completion Detection | 4.0/5 | Dual mechanism (tasks.md + completion tag) |
| Safety Mechanisms | 5.0/5 | Exceeds baseline with `maxIterations` + human gates ✅ |
| Simplicity | 2.5/5 | Enterprise features add justified complexity |
| Integration Value | 4.0/5 | Workflow integration adds genuine value |

**Key Alignment**:
- Stop Hook pattern: `{"decision": "block", "reason": "..."}` ✅
- Max iterations safety: `maxIterations: 100` ✅
- Completion detection: `<auto-complete>DONE</auto-complete>` + tasks.md ✅
- `stop_hook_active` flag prevents infinite loops ✅

**Recommendation from Judge**: Add `--simple` mode (skip session state, queues, circuit breakers). This is captured in AC-US7-11 below.

---

## User Stories

### US-001: Stop Hook-Based Continuation Loop
**Project**: specweave
**As a** developer using SpecWeave, I want the auto command to use Claude Code's Stop Hook to create a feedback loop that prevents session exit until work is complete, so that Claude can work autonomously for extended periods without manual intervention.

**Background**: Claude Code's Stop Hook fires when Claude tries to exit. By returning `{"decision": "block", "reason": "..."}`, we can re-feed the original prompt and continue execution.

#### Acceptance Criteria

- [x] **AC-US1-01**: Create `plugins/specweave/hooks/stop-auto.sh` that implements the Stop Hook logic
- [x] **AC-US1-02**: Stop hook checks `.specweave/state/auto-session.json` for active session state
- [x] **AC-US1-03**: When auto active, hook blocks exit and re-feeds original prompt with iteration context
- [x] **AC-US1-04**: Hook tracks `stop_hook_active` flag to detect continuation loops (prevent infinite nesting)
- [x] **AC-US1-05**: Hook reads transcript from `transcript_path` to analyze completion status
- [x] **AC-US1-06**: Completion promise detection: when output contains `<auto-complete>DONE</auto-complete>`, allow exit
- [x] **AC-US1-07**: Max iterations safety: configurable limit (default: 100) prevents runaway execution
- [x] **AC-US1-08**: Session state persisted to disk for recovery after crashes

---

### US-002: Auto Mode as Default in /sw:increment
**Project**: specweave
**As a** developer, I want `/sw:increment` to automatically analyze project complexity, split into multiple increments when needed, set dependencies, and start execution by default, so that I can describe my project once and let SpecWeave handle the rest.

**Background**: Auto mode is the DEFAULT. Users opt-OUT with `--manual` flag, not opt-in.

#### Acceptance Criteria

- [x] **AC-US2-01**: Update `plugins/specweave/commands/increment.md` to enable auto-execution by default
- [x] **AC-US2-02**: Analyze project description for complexity (count features, estimate tasks)
- [x] **AC-US2-03**: If estimated tasks > 25 OR features > 5, trigger multi-increment splitting (10-25 tasks is sweet spot)
- [x] **AC-US2-04**: Present split plan to user with dependency graph before creating
- [x] **AC-US2-05**: Auto-detect dependencies based on feature relationships (auth is foundation, etc.)
- [x] **AC-US2-06**: Create all increments with proper `dependencies: []` field in spec.md
- [x] **AC-US2-07**: After creation, immediately start auto session on first increment in queue
- [x] **AC-US2-08**: Display cost estimate and human gates before starting
- [x] **AC-US2-09**: `--manual` flag skips auto-execution (creates increment but waits)
- [x] **AC-US2-10**: `--dry-run` shows split plan without creating anything

---

### US-003: Leverage Claude Code's Built-in Session Recovery
**Project**: specweave
**As a** developer, I want SpecWeave to leverage Claude Code's existing `/resume` and `--continue` commands rather than reinvent session management, so that recovery is consistent with Claude Code UX.

**Background**: Claude Code ALREADY has session persistence! `/resume` picks sessions, `--continue` resumes last. SpecWeave should track **increment state** (tasks.md, spec.md), not duplicate Claude's session layer.

#### Acceptance Criteria

- [x] **AC-US3-01**: Track progress in `tasks.md` (source of truth), NOT in separate session state
- [x] **AC-US3-02**: On `/sw:do`, detect incomplete tasks and continue from last incomplete task
- [x] **AC-US3-03**: Use Claude Code's `/resume` for session recovery (don't reinvent)
- [x] **AC-US3-04**: Generate session summary in `.specweave/logs/` on graceful completion
- [x] **AC-US3-05**: `/sw:progress` shows resumable state based on tasks.md checkboxes
- [x] **AC-US3-06**: Recovery is **increment-based**, not session-based: "Increment 0148 has 5/12 tasks done. Continuing..."

---

### US-004: Multi-Increment Orchestration
**Project**: specweave
**As a** developer, I want auto to work across multiple increments sequentially, so that I can plan an entire project and let Claude execute it over time.

**Background**: Users may want to generate specs for multiple features upfront, then let auto execute them one by one respecting dependencies.

#### Acceptance Criteria

- [x] **AC-US4-01**: Auto session state tracks `incrementQueue: string[]` (ordered list of increment IDs)
- [x] **AC-US4-02**: After completing increment N, automatically transitions to increment N+1
- [x] **AC-US4-03**: Respects WIP limits from config (default: 1 active increment)
- [x] **AC-US4-04**: Validates dependencies before starting each increment
- [x] **AC-US4-05**: Option `--increments <id1,id2,id3>` specifies explicit queue
- [x] **AC-US4-06**: Option `--all-backlog` processes all backlog items in priority order
- [x] **AC-US4-07**: Generates per-increment completion reports
- [x] **AC-US4-08**: Saves overall session summary with cost, duration, and outcomes

---

### US-005: Test-Driven Validation Gates
**Project**: specweave
**As a** developer, I want auto to enforce test passing before transitioning between increments, so that I have confidence in autonomous execution quality.

**Background**: Tests are the ultimate validation. Auto must not proceed if tests fail.

#### Acceptance Criteria

- [x] **AC-US5-01**: Before closing any increment, run full test suite (`npm test` or configured command)
- [x] **AC-US5-02**: If tests fail, auto pauses and attempts fix (up to 3 retries)
- [x] **AC-US5-03**: After 3 failed fix attempts, transition to `NEEDS_HUMAN_INTERVENTION` state
- [x] **AC-US5-04**: Unit tests must pass before integration tests run
- [x] **AC-US5-05**: Integration tests must pass before E2E tests run (if configured)
- [x] **AC-US5-06**: Coverage threshold enforcement: block if coverage drops below target
- [x] **AC-US5-07**: Test results logged to `.specweave/logs/auto-tests-{iteration}.json`
- [x] **AC-US5-08**: Playwright E2E integration: detect `playwright.config.ts` and run E2E suite

---

### US-006: Human-Gated Sensitive Operations
**Project**: specweave
**As a** developer, I want auto to pause and ask for explicit approval before performing sensitive operations, so that I maintain control over critical actions.

**Background**: Some operations (deployments, API key usage, database migrations, etc.) should NEVER be automated without human approval.

#### Acceptance Criteria

- [x] **AC-US6-01**: Define sensitive operation patterns in `.specweave/config.json` under `auto.humanGated`
- [x] **AC-US6-02**: Default gates: `deploy`, `migrate`, `publish`, `push --force`, `rm -rf`, API key requests
- [x] **AC-US6-03**: When gate triggered, auto pauses and outputs clear approval request
- [x] **AC-US6-04**: User must explicitly type "yes" or approve via UI to continue
- [x] **AC-US6-05**: Timeout for human response: configurable (default: 30 minutes), then pause session
- [x] **AC-US6-06**: All gated operations logged with timestamps and approval status
- [x] **AC-US6-07**: Option `--skip-gates <gate1,gate2>` to pre-approve specific operations
- [x] **AC-US6-08**: Never auto-approve: `push --force`, `rm -rf /`, production deployments

---

### US-007: Auto-Aware Existing Workflow Commands
**Project**: specweave
**As a** developer, I want existing commands (`/sw:do`, `/sw:done`, `/sw:next`, `/sw:progress`, `/sw:status`) to be auto-aware by default, showing session info and continuing execution automatically.

**Background**: No new commands needed - existing commands become smarter.

#### Acceptance Criteria

- [x] **AC-US7-01**: Update `/sw:do` to continue until ALL tasks complete (stop hook loop by default)
- [x] **AC-US7-02**: Update `/sw:do` to add `--manual` flag to opt-out of auto-continuation
- [x] **AC-US7-03**: Update `/sw:next` to auto-transition and continue execution by default
- [x] **AC-US7-04**: Update `/sw:next` to show queue and dependencies when auto session active
- [x] **AC-US7-05**: Update `/sw:done` to auto-transition to next queued increment
- [x] **AC-US7-06**: Update `/sw:progress` to show auto session info (iteration, cost, queue, circuit breakers)
- [x] **AC-US7-07**: Update `/sw:status` to show auto session indicator and pending human gates
- [x] **AC-US7-08**: All commands respect existing PM validation gates (tasks, tests, docs)
- [x] **AC-US7-09**: All commands update tasks.md and spec.md checkboxes via existing Edit operations
- [x] **AC-US7-10**: When no auto session active, commands behave as before (backwards compatible)
- [x] **AC-US7-11**: `--simple` flag for simple mode: just loop + tasks.md completion + max iterations (no session state, queues, circuit breakers)

---

### US-008: Circuit Breaker Patterns for External Services
**Project**: specweave
**As a** developer, I want auto to handle external service failures gracefully with circuit breaker patterns, so that temporary outages don't cause cascade failures.

**Background**: GitHub API, JIRA, ADO, and other external services may experience rate limits or outages.

#### Acceptance Criteria

- [x] **AC-US8-01**: Implement circuit breaker for GitHub API calls (open after 3 failures in 5 minutes)
- [x] **AC-US8-02**: Implement circuit breaker for JIRA/ADO sync operations
- [x] **AC-US8-03**: When circuit open, queue operations for retry (exponential backoff)
- [x] **AC-US8-04**: Circuit auto-closes after 5 minutes of no failures (half-open state test)
- [x] **AC-US8-05**: Rate limit detection: parse `X-RateLimit-*` headers and pause accordingly
- [x] **AC-US8-06**: Log all circuit breaker state transitions to `.specweave/logs/circuit-breaker.log`
- [x] **AC-US8-07**: Auto continues with local operations while external services recover
- [x] **AC-US8-08**: Sync operations resume automatically when circuits close

---

### US-009: Living Docs and External Tool Sync at Checkpoints
**Project**: specweave
**As a** developer, I want auto to sync living docs and external tools at appropriate checkpoints, so that documentation stays current during autonomous execution.

#### Acceptance Criteria

- [x] **AC-US9-01**: Sync living docs after each task completion (deferred, not blocking)
- [x] **AC-US9-02**: Sync to external tools (GitHub/JIRA/ADO) after each increment closure
- [x] **AC-US9-03**: Batch sync operations to minimize API calls (max 1 sync per 5 minutes)
- [x] **AC-US9-04**: If sync fails, log error but continue auto (non-blocking)
- [x] **AC-US9-05**: Force sync before final auto completion
- [x] **AC-US9-06**: Sync includes: AC checkbox updates, task completion status, increment status

---

### US-010: Intelligent "Ask User When Stuck" Behavior
**Project**: specweave
**As a** developer, I want auto mode to intelligently pause and ask me when it's stuck or needs clarification, so that execution can continue without getting into infinite loops.

**Background**: Auto mode should ask (not guess) when genuinely uncertain.

#### Acceptance Criteria

- [x] **AC-US10-01**: When no work available (empty queue, no backlog, no external items), prompt user for next action
- [x] **AC-US10-02**: When tests fail 3x consecutively, offer options: review error, fix manually, skip task
- [x] **AC-US10-03**: When ambiguous technical decision arises, present options with tradeoffs
- [x] **AC-US10-04**: When dependency is blocked (increment depends on incomplete work), offer: wait, skip, ask
- [x] **AC-US10-05**: When "stuck" (no progress for N iterations), escalate to user with context
- [x] **AC-US10-06**: Track "stuck" metrics: consecutive failures, no-progress iterations, blocked time

---

### US-011: TDD Enforcement for Auto Mode
**Project**: specweave
**As a** developer, I want auto mode to strongly recommend or enforce TDD (test-first), so that autonomous execution has clear success criteria.

**Background**: Tests define "done" objectively. Without tests, how does Claude know it succeeded?

#### Acceptance Criteria

- [x] **AC-US11-01**: When starting auto session, check increment's `testMode` setting
- [x] **AC-US11-02**: If `testMode: test-after`, prompt user to switch to `test-first` for auto mode
- [x] **AC-US11-03**: Config option `auto.enforceTestFirst: true` blocks auto mode for test-after increments
- [x] **AC-US11-04**: In auto mode, always write failing tests BEFORE implementation (RED phase)
- [x] **AC-US11-05**: Run tests after implementation to verify GREEN phase
- [x] **AC-US11-06**: Coverage gates: block increment closure if coverage < threshold
- [x] **AC-US11-07**: Test results drive "done" determination, not subjective judgment

---

### US-012: 2-Level Structure Support (Projects/Boards)
**Project**: specweave
**As a** developer using a 2-level structure (multiple projects/boards for microservices), I want auto mode to intelligently assign increments and user stories to the correct project/board based on content analysis.

**Background**: In complex architectures, different features belong to different services.

#### Acceptance Criteria

- [x] **AC-US12-01**: Detect 2-level structure from config (`multiProject`, `umbrella`, ADO area paths)
- [x] **AC-US12-02**: When splitting increments, auto-assign to appropriate project based on keywords
- [x] **AC-US12-03**: Auth/login/JWT → backend-api project
- [x] **AC-US12-04**: React/component/UI → frontend-web project
- [x] **AC-US12-05**: Mobile/iOS/Android → mobile-app project
- [x] **AC-US12-06**: When multi-project increment detected, split user stories across projects
- [x] **AC-US12-07**: Each US in spec.md has explicit `**Project**:` field
- [x] **AC-US12-08**: Sync to correct GitHub repo / JIRA project / ADO area path per project

---

## Parallel Sessions - Simplified Approach

### The Reality

**Claude Code doesn't have built-in parallel session support.** Each tab runs independently with filesystem as the only shared state.

### Simple Solution: Session Lock + tasks.md as Source of Truth

For most use cases, **don't run parallel sessions**. One session per increment is recommended:

```bash
# SessionStart hook creates session lock
mkdir -p .specweave/state
echo "$SESSION_ID" > .specweave/state/active-session.lock

# SessionEnd hook releases
rm -f .specweave/state/active-session.lock
```

If a second session starts, it sees the lock and warns:
```
⚠️ Another Claude session is already working on this project.
   Active session: session-abc123 (started 10 min ago)

   Options:
   1. Wait for the other session to finish
   2. Force takeover (the other session will stop)
   3. Work on a different increment
```

### Why Not Over-Engineer?

| Approach | Complexity | Benefit |
|----------|------------|---------|
| Task-level locks + heartbeats | High | Parallel task execution |
| Session-level lock (simple) | Low | Prevents conflicts |
| No locks (just filesystem) | None | Works for sequential use |

**Recommendation**: Start with session-level lock. Add task-level only if users actually need parallel execution.

### Recovery (Crash/Close)

If session dies mid-task:
1. tasks.md still shows incomplete tasks
2. Next `/sw:do` continues from where it left off
3. No special recovery logic needed - **tasks.md IS the state**

### Stop Hook Integration

The Stop hook uses `stop_hook_active` flag (built into Claude Code) to prevent infinite loops:

```python
#!/usr/bin/env python3
import json, sys

hook_input = json.load(sys.stdin)

# CRITICAL: Prevent infinite continuation loops
if hook_input.get("stop_hook_active"):
    sys.exit(0)  # Already continued once, allow stop now

# Check if tasks are complete (read tasks.md)
tasks_complete = check_tasks_complete()

if not tasks_complete:
    print(json.dumps({
        "decision": "block",
        "reason": "Tasks incomplete. Continuing..."
    }))
    sys.exit(0)

sys.exit(0)  # Allow stop
```

### Configuration

```json
{
  "auto": {
    "enabled": true,
    "maxIterations": 100,
    "warnOnParallelSession": true
  }
}
```

---

## Non-Functional Requirements

### NFR-001: Performance
- Stop hook execution: < 500ms
- Task claiming: < 50ms
- Lock check: < 10ms

### NFR-002: Reliability
- Crash recovery: increment-based via tasks.md checkboxes
- Graceful degradation: continue if external services fail
- Lock timeout: 30 minutes (prevents orphaned locks)

### NFR-003: Security
- Never auto-approve destructive operations
- API keys/secrets never logged
- Lock files contain only session ID and timestamp

### NFR-004: Observability
- Structured logging to `.specweave/logs/auto-*.json`
- Lock state visible: `ls .specweave/state/locks/`
- Session summaries on completion

---

## Technical Architecture

### Stop Hook Pattern Mapping

| Pattern | SpecWeave Implementation |
|---------|--------------------------|
| `while :; do cat PROMPT.md \| claude ; done` | Stop Hook with `{"decision": "block"}` |
| `--completion-promise "string"` | `<auto-complete>DONE</auto-complete>` + tasks.md `[x]` |
| `--max-iterations N` | `auto.maxIterations: 100` in config.json |
| Stop hook blocks exit | Stop Hook returns `{"decision": "block", "reason": "..."}` |
| `stop_hook_active` prevents loops | Check `hook_input.stop_hook_active` flag |
| Simple prompt re-feeding | Re-feed with iteration context in `systemMessage` |

### Stop Hook Integration

```
User runs /sw:auto "Build my app" --max-iterations 50
                    │
                    ▼
        ┌─────────────────────────┐
        │  setup-auto.sh     │
        │  Creates session state  │
        │  in auto-session   │
        └───────────┬─────────────┘
                    │
                    ▼
        ┌─────────────────────────┐
        │  Claude works on task   │
        │  Executes /sw:do, etc   │
        └───────────┬─────────────┘
                    │
                    ▼ Claude tries to exit
        ┌─────────────────────────┐
        │  stop-auto.sh      │
        │  (Stop Hook)            │
        │                         │
        │  1. Check session state │
        │  2. Check completion    │
        │  3. Block + re-feed OR  │
        │     Allow exit          │
        └───────────┬─────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
   Incomplete              Complete
   "decision": "block"     "decision": "approve"
   re-feed prompt          session ends
```

### Session State Schema (Minimal for MAX Plan)

For Claude Code MAX plan (subscription-based, no API key), session state is minimal since there's no token cost to track:

```json
{
  "sessionId": "auto-2025-12-29-abc123",
  "status": "running" | "completed" | "failed",
  "startTime": "2025-12-29T10:30:00Z",
  "iteration": 15,
  "maxIterations": 100,
  "incrementQueue": ["0148", "0149", "0150"],
  "currentIncrement": "0148",
  "completedIncrements": [],
  "humanGates": {
    "pending": null,
    "approved": [],
    "blocked": []
  },
  "circuitBreakers": {
    "github": { "state": "closed", "failures": 0 },
    "jira": { "state": "open", "lastFailure": "..." }
  }
}
```

**Note**: No `costs` field for MAX plan - unlimited usage! Cost tracking only relevant for API-based usage.

---

## Configuration

Add to `.specweave/config.json`:

```json
{
  "auto": {
    "enabled": true,                    // Global default: auto mode ON
    "maxIterations": 100,               // Safety limit per session
    "testCommand": "npm test",
    "coverageThreshold": 80,
    "enforceTestFirst": false,          // Recommend TDD, don't enforce
    "humanGated": {
      "patterns": ["deploy", "migrate", "publish", "push --force", "rm -rf", "API_KEY", "SECRET"],
      "timeout": 1800
    },
    "circuitBreakers": {
      "failureThreshold": 3,
      "resetTimeout": 300
    },
    "sync": {
      "batchInterval": 300,
      "forceOnComplete": true
    }
  }
}
```

### Flag Overrides (Per-Command)

Config sets the default, but flags override for specific commands:

| Config `auto.enabled` | Flag | Effective Mode |
|-----------------------|------|----------------|
| `true` (default) | (none) | Auto mode |
| `true` | `--manual` | Manual mode (this run only) |
| `false` | (none) | Manual mode |
| `false` | `--auto` | Auto mode (this run only) |

**Examples:**
```bash
# Config: auto.enabled = true (default)
/sw:do                    # → Auto mode (continues until all tasks done)
/sw:do --manual           # → Manual mode (just one task, then stop)

# Config: auto.enabled = false (user disabled globally)
/sw:do                    # → Manual mode
/sw:do --auto             # → Auto mode (override for this run)
```

### Session State (NOT a Background Process!)

**IMPORTANT**: Auto mode is NOT a background daemon. It runs in the current Claude session.

- Each `/sw:do` command runs in your Claude Code tab
- Stop Hook keeps Claude in a loop until work is done
- Closing the tab = session ends immediately
- State persists to disk for crash recovery only

```
.specweave/state/auto-session.json  # Session state for recovery
.specweave/logs/auto-*.md           # Session summaries
```

---

## Related ADRs

- ADR-0175: Workflow Orchestration Architecture
- ADR-0177: Autonomous Mode Safety
- ADR-0178: Stop Hook-Based Auto Architecture (NEW - to be created)

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Auto completion rate | > 80% |
| False positive human gates | < 5% |
| Crash recovery success | > 95% |
| Time savings vs manual | > 50% |
| Test gate enforcement | 100% |
