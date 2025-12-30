---
increment: 0148-autonomous-execution-autopilot
title: "Autonomous Execution Engine with Stop Hook Integration"
priority: P1
status: active
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

Implement `/sw:autopilot` command that enables Claude Code to work autonomously for extended periods (hours/days) on SpecWeave projects. Uses Claude Code Stop Hook to create a feedback loop that prevents session exit until all specified work is completed.

**Key Value Proposition**: "Ship features while you sleep" - autonomous end-to-end delivery with safety guardrails.

**Inspiration**: Adapted from Ralph Wiggum plugin architecture but fully integrated with SpecWeave's spec-driven workflow, living docs, and external tool sync.

---

## User Stories

### US-001: Stop Hook-Based Continuation Loop
**Project**: specweave
**As a** developer using SpecWeave, I want the autopilot command to use Claude Code's Stop Hook to create a feedback loop that prevents session exit until work is complete, so that Claude can work autonomously for extended periods without manual intervention.

**Background**: Claude Code's Stop Hook fires when Claude tries to exit. By returning `{"decision": "block", "reason": "..."}`, we can re-feed the original prompt and continue execution.

#### Acceptance Criteria

- [ ] **AC-US1-01**: Create `plugins/specweave/hooks/stop-autopilot.sh` that implements the Stop Hook logic
- [ ] **AC-US1-02**: Stop hook checks `.specweave/state/autopilot-session.json` for active session state
- [ ] **AC-US1-03**: When autopilot active, hook blocks exit and re-feeds original prompt with iteration context
- [ ] **AC-US1-04**: Hook tracks `stop_hook_active` flag to detect continuation loops (prevent infinite nesting)
- [ ] **AC-US1-05**: Hook reads transcript from `transcript_path` to analyze completion status
- [ ] **AC-US1-06**: Completion promise detection: when output contains `<autopilot-complete>DONE</autopilot-complete>`, allow exit
- [ ] **AC-US1-07**: Max iterations safety: configurable limit (default: 100) prevents runaway execution
- [ ] **AC-US1-08**: Session state persisted to disk for recovery after crashes

---

### US-002: Autopilot Command Implementation
**Project**: specweave
**As a** developer, I want a `/sw:autopilot` command that initiates autonomous execution with clear configuration options, so that I can start long-running development sessions with appropriate safety limits.

#### Acceptance Criteria

- [ ] **AC-US2-01**: Create `plugins/specweave/commands/autopilot.md` skill definition
- [ ] **AC-US2-02**: Command syntax: `/sw:autopilot "<task description>" [options]`
- [ ] **AC-US2-03**: Option `--max-iterations <n>` sets iteration limit (default: 100)
- [ ] **AC-US2-04**: Option `--max-hours <n>` sets time limit (default: 24 hours)
- [ ] **AC-US2-05**: Option `--completion-promise <text>` sets custom completion signal (default: "AUTOPILOT_COMPLETE")
- [ ] **AC-US2-06**: Option `--dry-run` shows what would happen without starting
- [ ] **AC-US2-07**: Creates `scripts/setup-autopilot.sh` to initialize session state
- [ ] **AC-US2-08**: Displays cost estimate before starting (based on task complexity)

---

### US-003: Cancel Autopilot Command
**Project**: specweave
**As a** developer, I want a `/sw:cancel-autopilot` command to gracefully stop an active autopilot session, so that I can regain control when needed.

#### Acceptance Criteria

- [ ] **AC-US3-01**: Create `plugins/specweave/commands/cancel-autopilot.md` skill definition
- [ ] **AC-US3-02**: Command removes `.specweave/state/autopilot-session.json`
- [ ] **AC-US3-03**: Reports iteration count and work completed when canceling
- [ ] **AC-US3-04**: Generates summary report in `.specweave/logs/autopilot-{session-id}.md`
- [ ] **AC-US3-05**: Sets clean state so next stop hook allows normal exit

---

### US-004: Multi-Increment Orchestration
**Project**: specweave
**As a** developer, I want autopilot to work across multiple increments sequentially, so that I can plan an entire project and let Claude execute it over time.

**Background**: Users may want to generate specs for multiple features upfront, then let autopilot execute them one by one respecting dependencies.

#### Acceptance Criteria

- [ ] **AC-US4-01**: Autopilot session state tracks `incrementQueue: string[]` (ordered list of increment IDs)
- [ ] **AC-US4-02**: After completing increment N, automatically transitions to increment N+1
- [ ] **AC-US4-03**: Respects WIP limits from config (default: 1 active increment)
- [ ] **AC-US4-04**: Validates dependencies before starting each increment
- [ ] **AC-US4-05**: Option `--increments <id1,id2,id3>` specifies explicit queue
- [ ] **AC-US4-06**: Option `--all-backlog` processes all backlog items in priority order
- [ ] **AC-US4-07**: Generates per-increment completion reports
- [ ] **AC-US4-08**: Saves overall session summary with cost, duration, and outcomes

---

### US-005: Test-Driven Validation Gates
**Project**: specweave
**As a** developer, I want autopilot to enforce test passing before transitioning between increments, so that I have confidence in autonomous execution quality.

**Background**: Tests are the ultimate validation. Autopilot must not proceed if tests fail.

#### Acceptance Criteria

- [ ] **AC-US5-01**: Before closing any increment, run full test suite (`npm test` or configured command)
- [ ] **AC-US5-02**: If tests fail, autopilot pauses and attempts fix (up to 3 retries)
- [ ] **AC-US5-03**: After 3 failed fix attempts, transition to `NEEDS_HUMAN_INTERVENTION` state
- [ ] **AC-US5-04**: Unit tests must pass before integration tests run
- [ ] **AC-US5-05**: Integration tests must pass before E2E tests run (if configured)
- [ ] **AC-US5-06**: Coverage threshold enforcement: block if coverage drops below target
- [ ] **AC-US5-07**: Test results logged to `.specweave/logs/autopilot-tests-{iteration}.json`
- [ ] **AC-US5-08**: Playwright E2E integration: detect `playwright.config.ts` and run E2E suite

---

### US-006: Human-Gated Sensitive Operations
**Project**: specweave
**As a** developer, I want autopilot to pause and ask for explicit approval before performing sensitive operations, so that I maintain control over critical actions.

**Background**: Some operations (deployments, API key usage, database migrations, etc.) should NEVER be automated without human approval.

#### Acceptance Criteria

- [ ] **AC-US6-01**: Define sensitive operation patterns in `.specweave/config.json` under `autopilot.humanGated`
- [ ] **AC-US6-02**: Default gates: `deploy`, `migrate`, `publish`, `push --force`, `rm -rf`, API key requests
- [ ] **AC-US6-03**: When gate triggered, autopilot pauses and outputs clear approval request
- [ ] **AC-US6-04**: User must explicitly type "yes" or approve via UI to continue
- [ ] **AC-US6-05**: Timeout for human response: configurable (default: 30 minutes), then pause session
- [ ] **AC-US6-06**: All gated operations logged with timestamps and approval status
- [ ] **AC-US6-07**: Option `--skip-gates <gate1,gate2>` to pre-approve specific operations
- [ ] **AC-US6-08**: Never auto-approve: `push --force`, `rm -rf /`, production deployments

---

### US-007: Integration with Existing Workflow Commands
**Project**: specweave
**As a** developer, I want autopilot to seamlessly integrate with existing `/sw:do`, `/sw:done`, `/sw:next` commands, so that it feels like a natural extension of SpecWeave.

#### Acceptance Criteria

- [ ] **AC-US7-01**: Autopilot internally invokes `/sw:do` to execute tasks within increments
- [ ] **AC-US7-02**: Autopilot invokes `/sw:validate` before attempting closure
- [ ] **AC-US7-03**: Autopilot invokes `/sw:done` with PM validation when increment is complete
- [ ] **AC-US7-04**: Modify `/sw:next` to detect autopilot session and suggest continuation
- [ ] **AC-US7-05**: Add `--autopilot` flag to `/sw:next` to enter autopilot mode directly
- [ ] **AC-US7-06**: Autopilot respects all existing PM validation gates (tasks, tests, docs)
- [ ] **AC-US7-07**: Autopilot updates tasks.md and spec.md checkboxes via existing Edit operations

---

### US-008: Circuit Breaker Patterns for External Services
**Project**: specweave
**As a** developer, I want autopilot to handle external service failures gracefully with circuit breaker patterns, so that temporary outages don't cause cascade failures.

**Background**: GitHub API, JIRA, ADO, and other external services may experience rate limits or outages.

#### Acceptance Criteria

- [ ] **AC-US8-01**: Implement circuit breaker for GitHub API calls (open after 3 failures in 5 minutes)
- [ ] **AC-US8-02**: Implement circuit breaker for JIRA/ADO sync operations
- [ ] **AC-US8-03**: When circuit open, queue operations for retry (exponential backoff)
- [ ] **AC-US8-04**: Circuit auto-closes after 5 minutes of no failures (half-open state test)
- [ ] **AC-US8-05**: Rate limit detection: parse `X-RateLimit-*` headers and pause accordingly
- [ ] **AC-US8-06**: Log all circuit breaker state transitions to `.specweave/logs/circuit-breaker.log`
- [ ] **AC-US8-07**: Autopilot continues with local operations while external services recover
- [ ] **AC-US8-08**: Sync operations resume automatically when circuits close

---

### US-009: Living Docs and External Tool Sync at Checkpoints
**Project**: specweave
**As a** developer, I want autopilot to sync living docs and external tools at appropriate checkpoints, so that documentation stays current during autonomous execution.

#### Acceptance Criteria

- [ ] **AC-US9-01**: Sync living docs after each task completion (deferred, not blocking)
- [ ] **AC-US9-02**: Sync to external tools (GitHub/JIRA/ADO) after each increment closure
- [ ] **AC-US9-03**: Batch sync operations to minimize API calls (max 1 sync per 5 minutes)
- [ ] **AC-US9-04**: If sync fails, log error but continue autopilot (non-blocking)
- [ ] **AC-US9-05**: Force sync before final autopilot completion
- [ ] **AC-US9-06**: Sync includes: AC checkbox updates, task completion status, increment status

---

### US-010: Autopilot Status Command
**Project**: specweave
**As a** developer, I want a `/sw:autopilot-status` command to check current autopilot session state, so that I can monitor progress.

#### Acceptance Criteria

- [ ] **AC-US10-01**: Create `plugins/specweave/commands/autopilot-status.md` skill definition
- [ ] **AC-US10-02**: Display: current iteration, elapsed time, tasks completed, increments done
- [ ] **AC-US10-03**: Display: estimated remaining time, cost so far, active increment
- [ ] **AC-US10-04**: Display: circuit breaker states for all external services
- [ ] **AC-US10-05**: Display: last sync timestamps for living docs and external tools
- [ ] **AC-US10-06**: Works from any terminal (reads state from disk)

---

## Non-Functional Requirements

### NFR-001: Performance
- Stop hook execution: < 500ms
- Session state read/write: < 100ms
- Cost estimation: < 1s

### NFR-002: Reliability
- Crash recovery: session resumes from last checkpoint
- Graceful degradation: continue if external services fail
- Max memory: < 100MB for autopilot state

### NFR-003: Security
- Never auto-approve destructive operations
- API keys/secrets never logged
- Session state encrypted at rest (future)

### NFR-004: Observability
- Structured logging to `.specweave/logs/autopilot-*.json`
- Prometheus metrics export (future)
- Human-readable session summaries

---

## Technical Architecture

### Stop Hook Integration

```
User runs /sw:autopilot "Build my app" --max-iterations 50
                    │
                    ▼
        ┌─────────────────────────┐
        │  setup-autopilot.sh     │
        │  Creates session state  │
        │  in autopilot-session   │
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
        │  stop-autopilot.sh      │
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

### Session State Schema

```json
{
  "sessionId": "auto-2025-12-29-abc123",
  "status": "running" | "paused" | "completed" | "failed",
  "startTime": "2025-12-29T10:30:00Z",
  "iteration": 15,
  "maxIterations": 100,
  "maxHours": 24,
  "completionPromise": "AUTOPILOT_COMPLETE",
  "originalPrompt": "Build user authentication...",
  "incrementQueue": ["0148", "0149", "0150"],
  "currentIncrement": "0148",
  "completedIncrements": [],
  "testResults": [...],
  "syncCheckpoints": [...],
  "humanGates": {
    "pending": null,
    "approved": [...],
    "blocked": [...]
  },
  "circuitBreakers": {
    "github": { "state": "closed", "failures": 0 },
    "jira": { "state": "open", "lastFailure": "..." }
  },
  "costs": {
    "estimatedTokens": 500000,
    "actualTokens": 234567,
    "estimatedUSD": 5.00,
    "actualUSD": 2.34
  }
}
```

---

## Configuration

Add to `.specweave/config.json`:

```json
{
  "autopilot": {
    "enabled": true,
    "maxIterations": 100,
    "maxHours": 24,
    "completionPromise": "AUTOPILOT_COMPLETE",
    "testCommand": "npm test",
    "coverageThreshold": 80,
    "humanGated": {
      "patterns": [
        "deploy",
        "migrate",
        "publish",
        "push --force",
        "rm -rf",
        "API_KEY",
        "SECRET"
      ],
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

---

## Related ADRs

- ADR-0175: Workflow Orchestration Architecture
- ADR-0177: Autonomous Mode Safety
- ADR-0178: Stop Hook-Based Autopilot Architecture (NEW - to be created)

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Autopilot completion rate | > 80% |
| False positive human gates | < 5% |
| Crash recovery success | > 95% |
| Time savings vs manual | > 50% |
| Test gate enforcement | 100% |
