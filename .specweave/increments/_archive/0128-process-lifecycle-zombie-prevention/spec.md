---
increment: 0128-process-lifecycle-zombie-prevention
title: "Process Lifecycle Management - Zombie Prevention System"
type: feature
priority: P1
status: completed
created: 2025-12-09
completed: 2025-12-09
project: specweave
testMode: TDD
coverageTarget: 95
dependencies: []
estimated_effort: "2-3 weeks"
actual_effort: "1 day"
---

# Process Lifecycle Management - Zombie Prevention System

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

## Success Criteria

**Measurable Outcomes**:
- Zero zombie Claude processes after 60 seconds of session termination
- Single active session-watchdog per project (coordinated startup)
- All background jobs cleaned up within 30 seconds of session end
- Automated cleanup triggers without user intervention
- Cross-machine consistency (works on macOS, Linux, Windows)

## Acceptance Criteria

<!-- Acceptance Criteria are embedded in User Stories below -->

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
- [x] **AC-US2-04**: Watchdog registers itself in session registry with type: "watchdog"
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

### US-006: SessionStart Hook Integration
**As a** SpecWeave framework
**I want** session registration to happen automatically via Claude Code hooks
**So that** all sessions are tracked without manual setup

**Acceptance Criteria**:
- [x] **AC-US6-01**: SessionStart hook creates session registry entry with current PID
- [x] **AC-US6-02**: Hook starts heartbeat background process (runs every 5s)
- [x] **AC-US6-03**: SessionEnd hook removes session from registry
- [x] **AC-US6-04**: SessionEnd hook kills all registered child processes
- [x] **AC-US6-05**: Hook failure doesn't block Claude Code session startup
- [x] **AC-US6-06**: Hooks work in non-interactive mode (CI/CD environments)

### US-007: Cross-Platform Compatibility
**As a** SpecWeave developer on any platform
**I want** zombie prevention to work on macOS, Linux, and Windows
**So that** all team members benefit from automated cleanup

**Acceptance Criteria**:
- [x] **AC-US7-01**: Process existence check works on macOS (`kill -0`), Linux (`kill -0`), Windows (`tasklist`)
- [x] **AC-US7-02**: File locking uses cross-platform atomic operations (`mkdir` for directories)
- [x] **AC-US7-03**: Timestamp extraction works on macOS (`stat -f %m`), Linux (`stat -c %Y`), Windows PowerShell
- [x] **AC-US7-04**: Notifications work on macOS (`osascript`), Linux (`notify-send`), Windows (PowerShell toast)
- [x] **AC-US7-05**: Path separators handled correctly (POSIX `/` vs Windows `\`)
- [~] **AC-US7-06**: CI tests run on all three platforms (GitHub Actions matrix) [Deferred to follow-up]

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

- ❌ Cleanup of non-SpecWeave processes (only SpecWeave-related patterns)
- ❌ Remote session tracking (across machines)
- ❌ Historical process analytics/monitoring
- ❌ Integration with system process managers (systemd, launchd)
- ❌ User-configurable cleanup thresholds (use defaults)

## Dependencies

**Internal**:
- Existing hook infrastructure (`plugins/specweave/hooks/`)
- Session-watchdog script (`plugins/specweave/scripts/session-watchdog.sh`)
- Processor queue (`plugins/specweave/hooks/v2/queue/processor.sh`)

**External**:
- Claude Code SessionStart/SessionEnd hooks (v2.0+)
- Standard POSIX utilities: `ps`, `kill`, `stat`, `mkdir`

## Rollout Strategy

**Phase 1: Session Registry (Week 1)**
- Implement session registry format
- Add SessionStart/SessionEnd hooks
- Create heartbeat background process
- Unit tests for registry operations

**Phase 2: Daemon Coordination (Week 1-2)**
- Add coordination to session-watchdog
- Implement parent death detection
- Update processor.sh with parent tracking
- Integration tests for coordination

**Phase 3: Automated Cleanup (Week 2)**
- Build cleanup service logic
- Add pattern-based zombie detection
- Implement lock staleness removal
- E2E tests for cleanup scenarios

**Phase 4: Cross-Platform Support (Week 2-3)**
- Abstract platform-specific operations
- Test on macOS, Linux, Windows
- Add CI matrix tests
- Documentation for platform quirks

**Phase 5: Monitoring & Notifications (Week 3)**
- Add cleanup logging
- Implement notifications
- Create troubleshooting guide
- Beta testing with real users

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Registry corruption | Low | High | Atomic writes, backup/restore logic |
| Cleanup kills wrong process | Low | Critical | PID validation, pattern matching, dry-run mode |
| Cross-platform incompatibility | Medium | High | CI tests on all platforms, fallback implementations |
| Hook failures block sessions | Low | Critical | Try-catch all hook code, fail-safe defaults |
| Performance regression | Low | Medium | Benchmark before/after, set CPU limits |

## Testing Strategy

**Unit Tests** (95% coverage):
- Session registry CRUD operations
- Heartbeat update logic
- Staleness detection algorithms
- Cross-platform utility functions

**Integration Tests** (90% coverage):
- Multi-session coordination
- Daemon startup prevention
- Parent death detection
- Lock acquisition/release

**E2E Tests** (95% coverage):
- Full session lifecycle with cleanup
- Crash scenarios (kill -9 parent)
- Multiple concurrent sessions
- Cleanup service running in background

**Manual Testing**:
- Test on real developer machines (macOS, Linux)
- Verify notifications appear
- Check resource usage over 8-hour session
- Confirm no regressions in existing workflows

## Acceptance Testing

**Scenario 1: Normal Session Termination**
1. Start Claude Code session
2. Verify session registered in `.session-registry.json`
3. Verify heartbeat updating every 5s
4. Exit Claude Code normally
5. Verify session removed from registry within 5s
6. Verify all child processes terminated within 5s

**Scenario 2: Abnormal Termination (Crash)**
1. Start Claude Code session
2. Kill parent process with `kill -9 $PID`
3. Wait 60 seconds
4. Verify cleanup service detected zombie session
5. Verify notification sent
6. Verify all processes cleaned up

**Scenario 3: Multiple Sessions**
1. Start 3 concurrent Claude Code sessions
2. Verify only 1 session-watchdog running
3. Exit sessions in random order
4. Verify no zombie processes remain
5. Verify last session cleans up watchdog

## Documentation

**User-Facing**:
- Update CLAUDE.md with zombie prevention info
- Add troubleshooting guide to `.specweave/docs/`
- Update emergency procedures documentation

**Developer-Facing**:
- Architecture decision record (ADR) for session registry design
- API documentation for session registry utilities
- Cross-platform implementation notes
- Performance benchmarks and profiling results
