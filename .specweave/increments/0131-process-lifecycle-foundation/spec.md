---
increment: 0131-process-lifecycle-foundation
title: "Process Lifecycle - Part 1: Foundation & Core"
type: feature
priority: P1
status: completed
created: 2025-12-09
started: 2025-12-09
completed: 2025-12-09
project: specweave
testMode: TDD
coverageTarget: 95
dependencies: []
estimated_effort: "1 week"
splitFrom: "0128-process-lifecycle-zombie-prevention"
splitPart: "1 of 3"
---

# Process Lifecycle - Part 1: Foundation & Core

**Part 1 of 3** (0131 → 0132 → 0133) - Session Registry, Heartbeat, Watchdog, Cleanup Service, Lock Management

## Problem Statement

**Critical Production Issue**: Claude Code sessions accumulate zombie processes over time, causing:
- 20+ orphaned Claude processes spanning multiple days
- 5+ session-watchdog.sh daemons running simultaneously
- Stale background job processors with 5-minute-old locks
- Build tool zombies (esbuild) from previous sessions
- No automated cleanup when sessions terminate abnormally
- System resource exhaustion on long-running developer machines

**Impact**: Users see "Claude Code Stuck - Zombie processes - Run cleanup" notifications, requiring manual intervention and session restarts.

**Root Causes Identified**:
1. **No Parent Process Tracking**: Child processes don't detect when parent Claude session terminates
2. **Daemon Proliferation**: Multiple session-watchdog instances from different sessions never coordinate
3. **Lock Staleness**: Processor locks held beyond 5-minute threshold without cleanup
4. **No Session Registry**: No central registry to track active sessions and their child processes
5. **Crash-Unsafe Cleanup**: Abnormal termination leaves orphaned processes running indefinitely

## Scope of Part 1

This increment implements the **foundation and core zombie prevention mechanisms**:

✅ **In Scope**:
- Session registry data structure and atomic operations
- Staleness detection algorithms
- Heartbeat background process with parent death detection
- Watchdog coordination to prevent daemon proliferation
- Automated cleanup service
- Lock staleness manager

❌ **Out of Scope** (Part 2 & 3):
- Hook integration (SessionStart/SessionEnd) → **0132**
- Cross-platform compatibility layer → **0132**
- E2E testing scenarios → **0133**
- Documentation and beta testing → **0133**

## Success Criteria

**Measurable Outcomes for Part 1**:
- Session registry supports atomic operations with <10ms latency
- Heartbeat detects parent death within 5 seconds
- Only one watchdog daemon runs per project
- Cleanup service detects and removes stale sessions within 60 seconds
- Lock manager handles stale locks (>5 minutes) automatically
- 95% test coverage for all core components

## User Stories

### US-001: Session Registry & Process Tracking
**As a** SpecWeave developer
**I want** all Claude Code sessions and their child processes registered in a central location
**So that** we can track active sessions and clean up orphaned processes automatically

**Acceptance Criteria**:
- [x] **AC-US1-01**: Session registry created at `.specweave/state/.session-registry.json` on session start
- [x] **AC-US1-02**: Each session entry includes: session_id, pid, start_time, last_heartbeat, child_pids[]
- [x] **AC-US1-03**: Registry supports concurrent updates (atomic file operations with locks)
- [x] **AC-US1-04**: Sessions send heartbeat every 5 seconds to update last_heartbeat timestamp
- [x] **AC-US1-05**: Stale sessions (no heartbeat >30s) marked as "zombie" candidates
- [x] **AC-US1-06**: Registry cleanup removes completed sessions after 24 hours

### US-002: Coordinated Daemon Startup Prevention
**As a** SpecWeave developer
**I want** only ONE session-watchdog daemon to run per project
**So that** multiple daemons don't conflict or waste resources

**Acceptance Criteria**:
- [x] **AC-US2-01**: Watchdog checks session registry before starting daemon mode
- [x] **AC-US2-02**: If active watchdog exists (heartbeat <30s), new watchdog exits gracefully
- [x] **AC-US2-03**: If stale watchdog detected (no heartbeat >30s), new watchdog takes over and kills stale process
- [x] **AC-US2-04**: Watchdog registers itself in registry with type: "watchdog"
- [x] **AC-US2-05**: Watchdog updates heartbeat every 5 seconds
- [x] **AC-US2-06**: Single-check mode (no --daemon) always runs without coordination

### US-003: Parent Process Death Detection
**As a** background daemon (watchdog, processor)
**I want** to detect when my parent Claude session terminates
**So that** I can self-terminate and avoid becoming a zombie

**Acceptance Criteria**:
- [x] **AC-US3-01**: Daemons poll parent PID every 5 seconds using `kill -0 $PPID`
- [x] **AC-US3-02**: If parent process doesn't exist, daemon self-terminates within 5 seconds
- [x] **AC-US3-03**: Before terminating, daemon removes itself from session registry
- [x] **AC-US3-04**: Before terminating, daemon kills all registered child processes
- [x] **AC-US3-05**: Cross-platform implementation (macOS `ps`, Linux `/proc`, Windows `tasklist`)
- [x] **AC-US3-06**: Graceful shutdown with 2-second timeout before force-kill

### US-004: Automated Zombie Cleanup Service
**As a** SpecWeave developer
**I want** a background cleanup service that automatically removes zombie processes
**So that** I never need to manually run cleanup scripts

**Acceptance Criteria**:
- [x] **AC-US4-01**: Cleanup service runs every 60 seconds as part of session-watchdog
- [x] **AC-US4-02**: Service scans session registry for stale sessions (no heartbeat >60s)
- [x] **AC-US4-03**: For each stale session, service kills parent PID and all child_pids
- [x] **AC-US4-04**: Service detects orphaned processes matching patterns: `cat.*EOF`, `esbuild.*--service`, `bash.*processor.sh`
- [x] **AC-US4-05**: Service logs all cleanup actions to `.specweave/logs/cleanup.log`
- [x] **AC-US4-06**: Service sends macOS/Linux notification after cleaning >3 processes

### US-005: Lock Staleness Detection & Recovery
**As a** SpecWeave developer
**I want** stale locks automatically detected and removed
**So that** new sessions don't block on old locks

**Acceptance Criteria**:
- [x] **AC-US5-01**: Lock acquisition checks lock age (using mtime) before failing
- [x] **AC-US5-02**: Locks older than 5 minutes considered stale and removed automatically
- [x] **AC-US5-03**: Lock removal verifies PID in lock file is no longer active
- [x] **AC-US5-04**: Lock staleness logged to `.specweave/logs/lock-cleanup.log`
- [x] **AC-US5-05**: Lock directory includes metadata: `.processor.lock.d/pid`, `.processor.lock.d/session_id`
- [x] **AC-US5-06**: Stale lock removal triggers session registry cleanup for that session_id

## Acceptance Criteria

All acceptance criteria are embedded within their respective user stories above (US-001 through US-005).

**Total**: 30 ACs across 5 user stories

## Functional Requirements

### FR-001: Session Registry Format
```json
{
  "sessions": {
    "session-abc123": {
      "session_id": "session-abc123",
      "pid": 12345,
      "type": "claude-code",
      "start_time": "2025-12-09T10:00:00Z",
      "last_heartbeat": "2025-12-09T10:05:23Z",
      "child_pids": [12346, 12347],
      "status": "active"
    },
    "watchdog-xyz789": {
      "session_id": "watchdog-xyz789",
      "pid": 12348,
      "type": "watchdog",
      "start_time": "2025-12-09T10:00:05Z",
      "last_heartbeat": "2025-12-09T10:05:25Z",
      "parent_session": "session-abc123",
      "status": "active"
    }
  },
  "last_cleanup": "2025-12-09T10:05:00Z"
}
```

### FR-002: Heartbeat Mechanism
- Heartbeat process runs in background (detached from main session)
- Updates `last_heartbeat` timestamp every 5 seconds
- Uses atomic file write with temp file + rename
- Exits when parent PID check fails

### FR-003: Cleanup Thresholds
| Threshold | Value | Action |
|-----------|-------|--------|
| Heartbeat interval | 5s | Update last_heartbeat |
| Stale session detection | 60s | Mark as zombie candidate |
| Parent death check | 5s | Poll parent PID existence |
| Lock staleness | 300s (5min) | Remove and log |
| Cleanup service interval | 60s | Scan and clean zombies |

### FR-004: Notification Format
```
🚨 Zombie Cleanup (3 processes)
- Claude process (PID 12345) - 2d old
- session-watchdog (PID 12346) - 1d old
- processor.sh (PID 12347) - 3h old

✅ Automatically cleaned up
```

## Technical Constraints

**Performance**:
- Session registry updates must be atomic (<10ms per update)
- Heartbeat overhead <1% CPU per session
- Cleanup service completes scan in <500ms for 100 sessions

**Reliability**:
- Registry must survive crashes (atomic writes)
- Cleanup must be idempotent (safe to run multiple times)
- No race conditions between concurrent cleanups

**Compatibility**:
- Works with Claude Code 2.0+ (SessionStart/SessionEnd hooks)
- Bash 4.0+ for scripts (or fallback to sh-compatible)
- Node.js 18+ for TypeScript utilities

## Out of Scope

- ❌ Hook integration (SessionStart/SessionEnd) - **0132-process-lifecycle-integration**
- ❌ Cross-platform abstraction layer - **0132-process-lifecycle-integration**
- ❌ CI matrix tests - **0132-process-lifecycle-integration**
- ❌ E2E testing scenarios - **0133-process-lifecycle-testing**
- ❌ Documentation updates - **0133-process-lifecycle-testing**
- ❌ Beta testing - **0133-process-lifecycle-testing**

## Dependencies

**Internal**:
- Existing hook infrastructure (`plugins/specweave/hooks/`)
- Session-watchdog script (`plugins/specweave/scripts/session-watchdog.sh`)
- Processor queue (`plugins/specweave/hooks/v2/queue/processor.sh`)

**External**:
- Claude Code SessionStart/SessionEnd hooks (v2.0+)
- Standard POSIX utilities: `ps`, `kill`, `stat`, `mkdir`

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Registry corruption | Low | High | Atomic writes, backup/restore logic |
| Cleanup kills wrong process | Low | Critical | PID validation, pattern matching, dry-run mode |
| Performance regression | Low | Medium | Benchmark before/after, set CPU limits |

## Testing Strategy

**Unit Tests** (95% coverage):
- Session registry CRUD operations
- Heartbeat update logic
- Staleness detection algorithms
- Lock manager operations

**Integration Tests** (90% coverage):
- Multi-session coordination
- Daemon startup prevention
- Parent death detection
- Lock acquisition/release

## Next Steps

After completing Part 1 (0131):
1. ✅ Core infrastructure validated and tested
2. → **Part 2 (0132)**: Hook integration, cross-platform support, CI tests
3. → **Part 3 (0133)**: E2E testing, documentation, beta rollout
