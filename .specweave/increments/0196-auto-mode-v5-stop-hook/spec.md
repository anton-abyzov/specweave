---
status: completed
---
# 0196 - Auto Mode v5 - Stop Hook Simplification

## Problem Statement

The auto mode stop hook (`plugins/specweave/hooks/stop-auto.sh`) has grown to 1320 lines despite ADR-0225 targeting ~118 lines. Critical issues found during code review:

1. Test running broken (exit 127 - npm not in hook PATH)
2. "Completion promise" detection removed with legacy hook, never replaced
3. 937 lines of integration tests ALL SKIPPED (depend on unimplemented SessionStateManager)
4. Zero block decisions in decisions.jsonl (structured logging gap)
5. SKILL.md overpromises features the hook can't deliver (auto-heal, framework detection)
6. Dedup race condition causes rapid-fire blocks (file written after check, not before)
7. Quality gates (tests, build, LLM eval) belong in /sw:done, not the stop hook

Core principle from ADR-0225: **"Increments ARE the state. Hooks ARE the sync. /sw:done IS the quality gate."**

## User Stories

### US-001: Reliable Auto Mode Blocking
As a developer using auto mode, I want the stop hook to reliably block session exit when work is incomplete, so that auto mode continues until tasks are done.

**Acceptance Criteria:**
- [x] **AC-US1-01**: Hook blocks exit when auto-mode.json active=true AND active increments have pending tasks
- [x] **AC-US1-02**: Hook approves exit when all tasks and ACs are complete
- [x] **AC-US1-03**: Hook approves exit silently when auto mode is not active
- [x] **AC-US1-04**: Block decisions are logged to decisions.jsonl with turn/increment context
- [x] **AC-US1-05**: Block message is concise (<500 chars) with increment ID, task count, and next command

### US-002: Safety Mechanisms
As a developer, I want safety limits that prevent runaway auto sessions, so that stuck sessions don't run forever.

**Acceptance Criteria:**
- [x] **AC-US2-01**: Turn counter hard-stops session at maxTurns (default 20) with informative message
- [x] **AC-US2-02**: Stale sessions (>maxSessionAge) are cleaned up and exit is approved
- [x] **AC-US2-03**: Dedup prevents rapid-fire blocks (<30s apart) using write-first pattern
- [x] **AC-US2-04**: Session state files are cleaned up on successful completion

### US-003: Honest Documentation
As a developer reading the SKILL.md, I want accurate documentation of what auto mode does, so I have correct expectations.

**Acceptance Criteria:**
- [x] **AC-US3-01**: SKILL.md accurately describes hook capabilities (task/AC counting only, no test running)
- [x] **AC-US3-02**: SKILL.md documents that quality gates are enforced by /sw:done, not the hook
- [x] **AC-US3-03**: Default config values (maxTurns=20, maxSessionAge=7200) are visible in docs

### US-004: Tested Infrastructure
As a maintainer, I want passing integration tests that prove the stop hook works, so I can refactor with confidence.

**Acceptance Criteria:**
- [x] **AC-US4-01**: Integration tests cover all decision paths (approve/block/turn-limit/dedup/stale)
- [x] **AC-US4-02**: No skipped tests depending on unimplemented modules
- [x] **AC-US4-03**: Tests run the actual bash hook via execSync with temp directory fixtures
