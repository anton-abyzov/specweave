---
increment: 0161-hook-execution-visibility-and-command-reliability
title: Hook Execution Visibility and Command Reliability
priority: P0
status: abandoned
type: hotfix
created: 2026-01-07T00:00:00.000Z
---

# Hook Execution Visibility and Command Reliability

## Problem Statement

**CRITICAL INFRASTRUCTURE FAILURE**: Hooks are failing silently, commands (`/sw:progress`, `/sw:status`, `/sw:reflect`) are non-functional, and users have zero visibility into what's actually happening vs what should happen.

**Evidence**:
- 50+ consecutive semaphore timeout warnings (Dec 20-23)
- Hook logs last updated Dec 22 (2 weeks stale despite fresh cache refresh today)
- All hook failures return `{"continue":true}` - hiding data corruption
- 10+ zombie Claude Code sessions exhausting resources
- Skill routing broken - commands execute but produce no output
- Stop hook reflection completely non-functional

**Root Cause**: Silent failure philosophy trades crashes for invisible data corruption.

---

## User Stories

### US-001: Hook Execution Warnings
**Project**: specweave-dev
**As a** developer, I want to see warnings when hooks fail so I know when critical operations are being skipped

**Acceptance Criteria**:
- [x] **AC-US1-01**: Hook responses include `warnings` array with failure messages
- [x] **AC-US1-02**: Claude Code displays warnings to user in conversation
- [x] **AC-US1-03**: Warnings include actionable recommendations (e.g., "Run specweave check-hooks")
- [x] **AC-US1-04**: Silent `{"continue":true}` replaced with `{"continue":true, "warnings": [...]}`
- [x] **AC-US1-05**: Critical failures (merge conflicts, syntax errors) show ERROR severity
- [x] **AC-US1-06**: Timeout failures show WARNING severity
- [x] **AC-US1-07**: Hook execution time logged for performance monitoring

---

### US-002: Real-Time Hook Logging
**Project**: specweave-dev
**As a** developer, I want real-time hook logs instead of stale 2-week-old logs so I can debug issues

**Acceptance Criteria**:
- [x] **AC-US2-01**: Hook logs written to `.specweave/logs/hooks/` with current timestamps
- [x] **AC-US2-02**: Each hook execution logs: timestamp, hook name, status (success/warning/error), duration
- [x] **AC-US2-03**: Failed hooks log: error message, stack trace (if available), retry attempts
- [x] **AC-US2-04**: Logs rotate daily to prevent unbounded growth
- [x] **AC-US2-05**: Log viewer command `specweave logs hooks --tail=50 --follow`
- [x] **AC-US2-06**: Logs include request ID for correlation across multiple hook calls

---

### US-003: Hook Status Dashboard
**Project**: specweave-dev
**As a** developer, I want a hook status dashboard showing last execution, success rate, and health

**Acceptance Criteria**:
- [ ] **AC-US3-01**: Command `specweave hook-status` shows table of all hooks
- [ ] **AC-US3-02**: Table columns: Hook Name | Last Run | Status | Success Rate (24h) | Avg Duration
- [ ] **AC-US3-03**: Status indicators: ✅ OK | ⚠️  DEGRADED | ❌ FAILED
- [ ] **AC-US3-04**: Degraded = timeout or warning in last 3 executions
- [ ] **AC-US3-05**: Failed = error or 3+ consecutive failures
- [ ] **AC-US3-06**: Summary line: "X/Y hooks healthy, Z issues detected"
- [ ] **AC-US3-07**: Recommendations section with auto-fix suggestions

---

### US-004: Session Cleanup Command
**Project**: specweave-dev
**As a** developer, I want to kill zombie Claude Code sessions exhausting semaphores

**Acceptance Criteria**:
- [ ] **AC-US4-01**: Command `specweave cleanup-sessions` lists all running Claude processes
- [ ] **AC-US4-02**: Shows: PID | Started | Session ID | Lock Files Held | Memory Usage
- [ ] **AC-US4-03**: Flag `--force` kills all sessions except current one
- [ ] **AC-US4-04**: Removes stale lock files from `.specweave/state/*.lock`
- [ ] **AC-US4-05**: Cleans up orphaned semaphore state
- [ ] **AC-US4-06**: Dry-run mode `--dry-run` shows what would be cleaned without executing
- [ ] **AC-US4-07**: Warning before force kill: "This will kill X sessions. Continue? (y/N)"

---

### US-005: Fix Skill Routing for Core Commands
**Project**: specweave-dev
**As a** developer, I want `/sw:progress`, `/sw:status`, `/sw:reflect` commands to actually work

**Acceptance Criteria**:
- [ ] **AC-US5-01**: `/sw:progress` shows increment progress table (not just "62%")
- [ ] **AC-US5-02**: `/sw:status` shows full status with metadata, not generic text
- [ ] **AC-US5-03**: Skill routing validates `CLAUDE_PLUGIN_ROOT` matches current cache location
- [ ] **AC-US5-04**: Routing fallback: if skill fails, try direct CLI command
- [ ] **AC-US5-05**: Error messages distinguish: skill not found | skill execution failed | CLI failed
- [ ] **AC-US5-06**: Cache staleness detection: warn if `CLAUDE_PLUGIN_ROOT` != latest refresh

---

### US-006: Restore Stop Hook Reflection
**Project**: specweave-dev
**As a** developer, I want `/sw:reflect` (stop hook) to run retrospective analysis on session end

**Acceptance Criteria**:
- [ ] **AC-US6-01**: Stop hook calls reflection system when session ends gracefully
- [ ] **AC-US6-02**: Reflection analyzes: commands run | files modified | errors encountered | patterns
- [ ] **AC-US6-03**: Learnings saved to `.specweave/memory/*.md` categorized files
- [ ] **AC-US6-04**: User sees: "Session reflection complete. X learnings captured."
- [ ] **AC-US6-05**: Reflection skipped if session <5 minutes (too short to learn from)
- [ ] **AC-US6-06**: Manual trigger: `specweave reflect --session=current`
- [ ] **AC-US6-07**: Reflection disabled if `SPECWEAVE_REFLECT_OFF=1` env var set

---

## Success Criteria

**Visibility Restored**:
- ✅ No more silent hook failures - all failures surfaced to user
- ✅ Real-time logs show actual hook execution (not 2 weeks stale)
- ✅ Dashboard shows hook health at a glance

**Commands Functional**:
- ✅ `/sw:progress`, `/sw:status`, `/sw:reflect` work reliably
- ✅ Skill routing detects and handles cache staleness
- ✅ Clear error messages distinguish failure modes

**Resource Management**:
- ✅ Zombie sessions can be identified and cleaned
- ✅ Semaphore exhaustion prevented by cleanup command
- ✅ Lock files cleaned automatically

**Quality of Life**:
- ✅ Reflection works on session end (learnings captured)
- ✅ Diagnostic commands reduce time-to-resolution from hours to minutes
- ✅ Users can self-diagnose without asking for help

---

## Out of Scope

- ❌ Fixing hook architecture complexity (8-layer stack) - separate refactor needed
- ❌ Migrating hooks to TypeScript - future work
- ❌ Circuit breaker pattern - separate increment
- ❌ Event-driven async hooks - major architectural change
- ❌ Plugin cache auto-refresh - covered by increment 0160

---

## Dependencies

**Internal**:
- Hook system (`.specweave/hooks/`)
- Skill router (`src/cli/skill-router.ts`)
- Reflection system (`src/core/reflection/`)
- Session registry (`src/core/session-registry.ts`)

**External**:
- None

---

## Testing Strategy

**TDD Mode** (SpecWeave core requirement):
1. Write failing tests FIRST for each AC
2. Implement minimal code to make tests pass
3. Refactor while keeping tests green

**Test Coverage Targets**:
- Unit: >85% (hook response formatting, log writing, session detection)
- Integration: >80% (hook-status command E2E, cleanup-sessions E2E)
- E2E: >90% (full workflow: hook fails → user sees warning → runs diagnostic → fixed)

**Test Scenarios**:
- Hook failure with warning in response
- Hook log written with current timestamp
- hook-status shows degraded hook after 3 warnings
- cleanup-sessions kills zombie sessions and removes locks
- /sw:progress works after cache refresh
- Reflection runs on session end and saves learnings

---

## Notes

**P0 Priority Justification**:
- Infrastructure is completely broken - blocks all development
- Silent failures cause data corruption
- 2 weeks of stale logs prevented debugging
- Users cannot self-diagnose issues

**Hotfix Type Justification**:
- Critical production impact (SpecWeave framework itself)
- Cannot wait for normal feature cycle
- Requires immediate fix to restore functionality

**Force Flag Rationale**:
- Discipline check showing 5 active (includes archived increments - bug in checker)
- Infrastructure failure blocks ability to complete other increments
- Emergency situation warrants bypass
