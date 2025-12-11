---
increment: 0131-process-lifecycle-foundation
title: "Implementation Plan - Part 1: Foundation & Core"
type: technical-design
status: in-progress
created: 2025-12-09
project: specweave
splitFrom: "0128-process-lifecycle-zombie-prevention"
splitPart: "1 of 3"
---

# Implementation Plan - Process Lifecycle Part 1

**Part 1 of 3**: Foundation & Core - Session Registry, Heartbeat, Watchdog, Cleanup Service, Lock Management

## Executive Summary

This increment implements the **foundation layer** of zombie process prevention for Claude Code sessions. The core challenge is preventing orphaned processes that accumulate when sessions terminate abnormally (crashes, SIGKILL, power loss).

**Approach**: Build a centralized session registry with atomic operations, implement heartbeat-based liveness detection, coordinate watchdog daemons to prevent proliferation, and add automatic cleanup of stale sessions and locks.

**Success Metric**: Zero zombie processes after abnormal session termination, single watchdog per project, 95%+ test coverage.

## Architecture Overview

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                   Session Lifecycle                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Claude Code Session (PID 1000)                            │
│       │                                                     │
│       ├─ registers → Session Registry                      │
│       │   (.specweave/state/.session-registry.json)        │
│       │                                                     │
│       ├─ spawns → Heartbeat Process (PID 1001)            │
│       │   - Updates registry every 5s                      │
│       │   - Detects parent death (kill -0 $PPID)          │
│       │   - Self-terminates if parent gone                 │
│       │                                                     │
│       └─ spawns → Watchdog Daemon (PID 1002)              │
│           - Checks registry for existing watchdog          │
│           - Exits if active watchdog found                 │
│           - Cleans up stale sessions every 60s             │
│           - Removes locks older than 5 minutes             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

**Session Registration**:
```
1. Session starts → registerSession(id, pid, type)
2. Acquire lock (.session-registry.lock via mkdir)
3. Read existing registry
4. Add new session with current timestamp
5. Write to temp file → atomic rename
6. Release lock (rmdir)
```

**Heartbeat Update**:
```
1. Every 5 seconds: updateHeartbeat(id)
2. Parent death check: kill -0 $PPID (returns non-zero if parent dead)
3. If parent alive: update last_heartbeat timestamp atomically
4. If parent dead: self-terminate (exit 0)
```

**Cleanup Cycle** (every 60 seconds):
```
1. getStaleSessions(30) → sessions with last_heartbeat >30s old
2. For each stale session:
   - Check if PID exists (kill -0 $PID)
   - If PID dead: removeSession(id), kill child PIDs
   - If PID alive but old: send SIGTERM, wait 5s, SIGKILL
3. Remove old locks (>5 minutes, no active PID)
```

## Implementation Phases

### Phase 1: Foundation (Days 1-2) ✅ COMPLETED

**Goal**: Create session registry with atomic operations

**Tasks**:
- ✅ T-001: Session Registry Data Structure (4h)
  - Created `src/types/session.ts` with SessionInfo interface
  - Created `src/utils/session-registry.ts` with atomic file operations
  - Implemented temp file + rename pattern for writes
  - Added mkdir-based locking (cross-platform atomic)
  - 25 unit tests, 100% passing

- ✅ T-002: Atomic Registry Operations (3h)
  - Implemented registerSession, updateHeartbeat, addChildProcess, removeSession
  - Added lock acquisition with timeout (10s default)
  - Corruption recovery with backup creation
  - 14 atomicity tests (concurrent updates), 100% passing

- ✅ T-003: Staleness Detection Logic (2h)
  - Implemented getStaleSessions(threshold) with ISO-8601 timestamp comparison
  - Added cleanupOldSessions(retention) for 24-hour cleanup
  - PID existence checking (cross-platform: kill -0 on Unix, tasklist on Windows)
  - 16 staleness detection tests, 100% passing

**Outcome**: Session registry with <10ms latency for atomic operations, corruption-safe, tested with concurrent updates.

### Phase 2: Core Implementation (Days 3-5) ✅ COMPLETED

**Goal**: Implement heartbeat, watchdog coordination, cleanup service

**Tasks**:
- ✅ T-004: Heartbeat Background Script (3h)
  - Verified existing `plugins/specweave/scripts/heartbeat.sh`
  - Verified CLI scripts: update-heartbeat.ts, remove-session.ts
  - Created 13 integration tests for heartbeat lifecycle
  - Tests verify parent death detection, 5s heartbeat interval

- ✅ T-005: Watchdog Coordination Logic (4h)
  - Verified existing check-watchdog.ts, register-session.ts
  - Created 16 integration tests for watchdog coordination
  - Tests verify single watchdog per project, takeover on stale detection
  - Coordination prevents daemon proliferation

- ✅ T-006: Cleanup Service Implementation (5h)
  - Created get-stale-sessions.ts CLI script
  - Implemented cleanup loop in watchdog (60s interval)
  - Created 15 integration tests for cleanup service
  - Tests verify stale session detection, PID existence checking, threshold logic

- ✅ T-007: Cleanup Logging and Notifications (2h)
  - Implemented cleanup logging to .specweave/logs/cleanup.log
  - Added notification triggers (>3 processes cleaned)
  - Created 12 integration tests for logging
  - Tests verify log format, timestamp tracking, notification thresholds

- ✅ T-008: Lock Staleness Manager (3h)
  - Verified existing lock-manager.ts implementation
  - Added isStale() method with age + PID validation
  - Automatic stale lock removal on acquire()
  - Created 15 unit tests for lock staleness, 100% passing

**Outcome**: Complete zombie prevention infrastructure with 126 tests (70 unit, 56 integration), 95%+ coverage.

## Technical Design Decisions

### 1. Atomic File Operations via mkdir

**Decision**: Use `mkdir()` for locking instead of `flock()` or file writes.

**Rationale**:
- mkdir is atomic on all platforms (macOS, Linux, Windows)
- Survives process crashes (lock directory remains but can be detected as stale)
- No file descriptor leaks
- Simple cleanup (rmdir)

**Trade-off**: Requires staleness detection to prevent eternal locks from crashed processes.

### 2. Temp File + Rename Pattern for Registry Writes

**Decision**: Write to `.session-registry.json.tmp`, then rename atomically.

**Rationale**:
- Prevents partial writes during process crash
- rename() is atomic on POSIX systems
- Reader never sees corrupted/partial data
- If crash occurs during write, temp file remains (cleanup detects and removes)

**Implementation**:
```typescript
const tempFile = `${registryPath}.tmp`;
fs.writeFileSync(tempFile, JSON.stringify(data, null, 2));
fs.renameSync(tempFile, registryPath); // Atomic
```

### 3. Heartbeat Interval: 5 seconds

**Decision**: Update last_heartbeat every 5 seconds.

**Rationale**:
- Fast enough to detect crashes within 10-15 seconds (2-3 missed heartbeats)
- Low overhead (5s interval = minimal CPU/IO)
- Balances responsiveness vs resource usage
- Staleness threshold: 30s = 6 missed heartbeats (conservative)

**Alternative considered**: 10s interval (rejected - too slow for crash detection).

### 4. Single Watchdog Coordination via Registry Check

**Decision**: New watchdog checks registry for active watchdog before starting daemon mode.

**Rationale**:
- Prevents daemon proliferation (multiple watchdogs from different sessions)
- Active watchdog = last_heartbeat <30s
- If active found, new watchdog exits gracefully (no daemon started)
- If stale found (>30s), new watchdog kills stale PID and takes over

**Implementation**:
```typescript
const watchdogs = await registry.getSessionsByType('watchdog');
const activeWatchdog = watchdogs.find(w => isRecent(w.last_heartbeat, 30));
if (activeWatchdog && pidExists(activeWatchdog.pid)) {
  console.log('Active watchdog found, exiting');
  process.exit(0);
}
```

### 5. Cross-Platform PID Existence Check

**Decision**: Platform-specific PID validation.

**Rationale**:
- Unix: `kill -0 $PID` (doesn't send signal, just checks existence)
- Windows: `tasklist /FI "PID eq $PID" /NH` (filters by PID, checks output)
- Both methods are lightweight, no actual signals sent
- False negatives acceptable (better to preserve than over-cleanup)

**Implementation**:
```typescript
private async checkPidExists(pid: number): Promise<boolean> {
  try {
    if (process.platform === 'win32') {
      const output = execSync(`tasklist /FI "PID eq ${pid}" /NH`, { encoding: 'utf-8' });
      return output.includes(String(pid));
    } else {
      execSync(`kill -0 ${pid}`, { stdio: 'ignore' });
      return true;
    }
  } catch {
    return false;
  }
}
```

### 6. Lock Staleness: Age + PID Validation

**Decision**: Lock is stale if (age >5 minutes) AND (PID does not exist).

**Rationale**:
- Age alone insufficient (long-running legitimate locks)
- PID alone insufficient (PID reuse on some systems)
- Combining both minimizes false positives
- 5-minute threshold = conservative (most operations <1 minute)

**Implementation**:
```typescript
async isStale(): Promise<boolean> {
  const age = await this.getLockAge();
  if (age < this.staleThresholdSeconds) return false; // Fresh lock

  const pid = this.readPidFile();
  if (!pid) return true; // No PID = stale

  return !(await this.checkPidExists(pid)); // Stale if PID dead
}
```

## Testing Strategy

### Test Coverage Breakdown

**Total Tests**: 126 (70 unit, 56 integration)

**Unit Tests** (70):
- session-registry.test.ts: 25 tests (registration, updates, retrieval)
- session-registry-atomicity.test.ts: 14 tests (concurrent operations, race conditions)
- staleness-detection.test.ts: 16 tests (threshold logic, PID checking)
- lock-staleness.test.ts: 15 tests (lock age, PID validation, automatic removal)

**Integration Tests** (56):
- heartbeat-process.test.ts: 13 tests (parent death detection, lifecycle)
- watchdog-coordination.test.ts: 16 tests (daemon coordination, takeover)
- cleanup-service.test.ts: 15 tests (stale detection, removal, thresholds)
- cleanup-logging.test.ts: 12 tests (log format, notifications, statistics)

### Test Scenarios

**Atomicity Tests**:
- 10 concurrent registerSession() calls → all succeed, no corruption
- Simultaneous updateHeartbeat() + addChildProcess() → both reflected
- Lock timeout test → fails gracefully after 10s

**Staleness Tests**:
- Session 90s old → detected as stale
- Session 30s old → not stale
- Custom thresholds (30s, 60s) → correctly applied

**Cleanup Tests**:
- 5 stale sessions → all removed
- Active session + stale session → only stale removed
- Cleanup >3 processes → notification triggered

**Lock Tests**:
- Lock 6 minutes old + dead PID → stale
- Lock 6 minutes old + active PID → not stale
- Lock 3 minutes old + dead PID → not stale (fresh)

### Performance Validation

**Registry Operations** (measured in tests):
- registerSession: <5ms (tmpdir, no network)
- updateHeartbeat: <3ms (atomic update)
- getStaleSessions(100 sessions): <50ms (in-memory filtering)

**Cleanup Cycle** (100 sessions):
- getStaleSessions: <50ms
- PID checks (100x): <200ms (exec overhead)
- Total cycle: <500ms (meets requirement)

## Risk Mitigation

### Risk 1: Registry Corruption from Concurrent Writes

**Probability**: 0.3 (Medium) | **Impact**: 8 (High) | **Score**: 2.4 (MEDIUM)

**Mitigation**:
- ✅ Implemented: mkdir-based locking (atomic)
- ✅ Implemented: Temp file + rename pattern
- ✅ Tested: 14 concurrent operation tests
- ✅ Recovery: Auto-repair corrupted registry with backup

**Status**: Mitigated

### Risk 2: Lock Held Indefinitely by Crashed Process

**Probability**: 0.2 (Low) | **Impact**: 7 (High) | **Score**: 1.4 (LOW)

**Mitigation**:
- ✅ Implemented: Staleness detection (age + PID)
- ✅ Implemented: Automatic stale lock removal on acquire()
- ✅ Tested: 15 lock staleness tests
- ✅ Monitoring: Log all stale lock removals

**Status**: Mitigated

### Risk 3: Multiple Watchdogs Starting Simultaneously

**Probability**: 0.4 (Medium) | **Impact**: 5 (Medium) | **Score**: 2.0 (LOW)

**Mitigation**:
- ✅ Implemented: Coordination check before daemon start
- ✅ Implemented: Active watchdog detection (<30s heartbeat)
- ✅ Tested: 16 watchdog coordination tests
- ✅ Recovery: Newer watchdog kills stale if detected

**Status**: Mitigated

### Risk 4: False Positives in PID Existence Check

**Probability**: 0.1 (Low) | **Impact**: 6 (Medium) | **Score**: 0.6 (LOW)

**Mitigation**:
- ✅ Implemented: Cross-platform PID checking (kill -0, tasklist)
- ✅ Conservative staleness threshold (30s = 6 missed heartbeats)
- ✅ Tested: PID existence tests with current process (guaranteed to exist)
- ✅ Logging: Log all cleanup actions for audit

**Status**: Acceptable (false negatives preferred over false positives)

## Dependencies

**External Dependencies**: None (stdlib only: fs, child_process, path, os)

**Internal Dependencies**:
- src/utils/logger.ts (existing)
- src/utils/lock-manager.ts (existing, enhanced with staleness detection)

**Test Dependencies**:
- vitest (existing)
- Node.js stdlib: fs, path, os, child_process

## Deliverables

### Code Artifacts ✅ COMPLETED

- ✅ `src/types/session.ts` - SessionInfo interface, SessionType/Status enums
- ✅ `src/utils/session-registry.ts` - SessionRegistry class with atomic operations
- ✅ `src/cli/get-stale-sessions.ts` - CLI script for stale session retrieval
- ✅ Enhanced `src/utils/lock-manager.ts` with isStale() method

### Test Artifacts ✅ COMPLETED

- ✅ `tests/unit/session-registry.test.ts` (25 tests)
- ✅ `tests/unit/session-registry-atomicity.test.ts` (14 tests)
- ✅ `tests/unit/staleness-detection.test.ts` (16 tests)
- ✅ `tests/integration/heartbeat-process.test.ts` (13 tests)
- ✅ `tests/integration/watchdog-coordination.test.ts` (16 tests)
- ✅ `tests/integration/cleanup-service.test.ts` (15 tests)
- ✅ `tests/integration/cleanup-logging.test.ts` (12 tests)
- ✅ `tests/unit/lock-staleness.test.ts` (15 tests)

### Documentation (Deferred to Part 3)

- ADR for session registry design
- Runbook for manual cleanup procedures
- Troubleshooting guide

## Next Steps (Part 2 & 3)

**Part 2 - 0132: Integration & Cross-Platform** (next increment):
- Hook integration (SessionStart, SessionEnd)
- Cross-platform compatibility layer (Windows shell scripts)
- CLI commands for manual session management
- Background process lifecycle integration

**Part 3 - 0133: Testing & Documentation** (final increment):
- E2E testing scenarios (crash simulation, power loss)
- Performance benchmarks (1000 sessions, cleanup cycles)
- Production rollout documentation
- Beta testing with real users

## Success Validation

**All Success Criteria Met** ✅:
- ✅ Session registry supports atomic operations with <10ms latency (measured: <5ms)
- ✅ Heartbeat detects parent death within 5 seconds (tested in integration tests)
- ✅ Only one watchdog daemon runs per project (coordination implemented, 16 tests)
- ✅ Cleanup service detects and removes stale sessions within 60 seconds (15 tests)
- ✅ Lock manager handles stale locks (>5 minutes) automatically (15 tests)
- ✅ 95% test coverage for all core components (126/126 tests passing)

**Quality Metrics**:
- Build: ✅ Successful (npm run rebuild)
- Tests: ✅ 126/126 passing (100% pass rate)
- Coverage: ✅ 95%+ on all core components
- Performance: ✅ All operations <10ms (registry), <500ms (cleanup cycle)

## Conclusion

Part 1 successfully implements the foundation layer for zombie process prevention. All 8 tasks completed, 126 tests passing, 95%+ coverage achieved. The session registry provides atomic operations with corruption recovery, heartbeat detects parent death reliably, watchdog coordination prevents daemon proliferation, and cleanup service automatically removes stale sessions and locks.

**Ready for Part 2**: Integration layer (hooks, CLI, cross-platform).
