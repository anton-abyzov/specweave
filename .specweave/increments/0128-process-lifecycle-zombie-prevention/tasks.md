---
increment: 0128-process-lifecycle-zombie-prevention
title: "Implementation Tasks - Process Lifecycle Management"
status: planned
estimated_tasks: 24
estimated_weeks: 2-3
phases:
  - foundation
  - core-implementation
  - integration
  - testing
  - documentation
---

# Implementation Tasks

## Phase 0: Immediate Cleanup (Day 1)

### T-000: One-Time Existing Zombie Cleanup Script
**User Story**: N/A (Immediate cleanup)
**Status**: [ ] pending
**Estimated Time**: 2 hours
**Model Hint**: ⚡ Haiku (simple script, clear logic)

**Implementation**:
Create `.specweave/scripts/cleanup-existing-zombies.sh`:
- Kill existing zombie processes identified in initial analysis
- Pattern matching: `cat.*EOF`, `esbuild.*--service`, old `session-watchdog`, `processor.sh`
- Age-based filtering: only kill processes >1 hour old
- Dry-run mode for safety verification
- Detailed logging of what was killed

**Test Plan**:
```gherkin
Feature: Existing Zombie Cleanup
  Scenario: Clean up current zombie processes
    Given 20+ zombie Claude processes exist
    And 5+ session-watchdog daemons are running
    When I run cleanup-existing-zombies.sh
    Then all zombie processes should be killed
    And a cleanup report should be logged
    And no active sessions should be affected
```

**Files**:
- `.specweave/scripts/cleanup-existing-zombies.sh` (new)
- `tests/integration/existing-zombie-cleanup.test.sh` (new)

---

## Phase 1: Foundation (Week 1)

### T-001: Create Session Registry Data Structure
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Status**: [x] completed
**Estimated Time**: 4 hours
**Model Hint**: 💎 Opus (data structure design, atomicity requirements)

**Implementation**:
Create `src/utils/session-registry.ts` with:
- SessionRegistry class with atomic file operations
- SessionInfo interface matching FR-001 format
- Atomic writes using temp file + rename pattern
- File locking via mkdir (cross-platform atomic operation)
- JSON schema validation on read

**Test Plan**:
```gherkin
Feature: Session Registry Data Structure
  Scenario: Register new session
    Given a clean session registry
    When I register a session with ID "session-001" and PID 12345
    Then the registry file should contain the session entry
    And the entry should have correct ISO-8601 timestamps
    And the status should be "active"

  Scenario: Concurrent registration (race condition test)
    Given a clean session registry
    When 3 sessions try to register simultaneously
    Then all 3 sessions should be registered successfully
    And the registry JSON should remain valid
    And no session data should be lost

  Scenario: Corrupted registry recovery
    Given a registry file with invalid JSON
    When I attempt to read the registry
    Then it should auto-repair by creating a new empty registry
    And log the corruption event
```

**Files**:
- `src/utils/session-registry.ts` (new)
- `src/types/session.ts` (new interfaces)
- `tests/unit/session-registry.test.ts` (new)

---

### T-002: Implement Atomic Registry Operations
**User Story**: US-001
**Satisfies ACs**: AC-US1-02, AC-US1-03, AC-US1-04
**Status**: [x] completed
**Estimated Time**: 3 hours
**Model Hint**: 💎 Opus (atomicity critical, race conditions)

**Implementation**:
Add core methods to SessionRegistry:
- `registerSession(id, pid, type)` - atomic insert
- `updateHeartbeat(id)` - atomic timestamp update
- `addChildProcess(id, childPid)` - atomic array append
- `removeSession(id)` - atomic delete
- All operations use file locking (mkdir .lock)

**Test Plan**:
```gherkin
Feature: Atomic Registry Operations
  Scenario: Update heartbeat without corruption
    Given a registered session "session-001"
    When I update the heartbeat 1000 times rapidly
    Then the registry should remain valid JSON
    And the last_heartbeat should match the latest update
    And no updates should be lost

  Scenario: Add child process during concurrent heartbeat update
    Given a registered session "session-001"
    When I update heartbeat and add child PID simultaneously
    Then both operations should complete successfully
    And the registry should reflect both changes

  Scenario: Lock acquisition timeout
    Given another process holds the registry lock
    When I try to acquire the lock with 5s timeout
    Then I should wait up to 5 seconds
    And fail gracefully if lock not acquired
```

**Files**:
- `src/utils/session-registry.ts` (enhance)
- `tests/unit/session-registry-atomicity.test.ts` (new)

---

### T-003: Implement Staleness Detection Logic
**User Story**: US-001
**Satisfies ACs**: AC-US1-05, AC-US1-06
**Status**: [x] completed
**Estimated Time**: 2 hours
**Model Hint**: ⚡ Haiku (clear algorithm, well-defined logic)

**Implementation**:
Add staleness detection methods:
- `getStaleSessions(thresholdSeconds)` - returns sessions with old heartbeat
- `cleanupOldSessions(retentionHours)` - removes sessions older than retention period
- Time comparison logic using ISO-8601 parsing

**Test Plan**:
```gherkin
Feature: Staleness Detection
  Scenario: Detect stale session
    Given a session with last_heartbeat 90 seconds ago
    When I call getStaleSessions(60)
    Then the session should be included in results
    And the status should be marked as "stale"

  Scenario: Active session not flagged as stale
    Given a session with last_heartbeat 30 seconds ago
    When I call getStaleSessions(60)
    Then the session should NOT be in results

  Scenario: Cleanup old completed sessions
    Given 3 completed sessions from 25 hours ago
    And 2 active sessions from 1 hour ago
    When I call cleanupOldSessions(24)
    Then the 3 old sessions should be removed
    And the 2 active sessions should remain
```

**Files**:
- `src/utils/session-registry.ts` (enhance)
- `tests/unit/staleness-detection.test.ts` (new)

---

## Phase 2: Core Implementation (Week 1-2)

### T-004: Create Heartbeat Background Script
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03
**Status**: [x] completed
**Estimated Time**: 3 hours
**Model Hint**: 💎 Opus (parent death detection, cross-platform considerations)

**Implementation**:
Create `plugins/specweave/scripts/heartbeat.sh`:
- Accept SESSION_ID as argument
- Loop: check parent PID every 5s (kill -0 $PPID)
- If parent dead: call cleanup script and exit
- Update heartbeat via Node.js CLI script
- Detached process (nohup, background)

**Test Plan**:
```gherkin
Feature: Heartbeat Background Process
  Scenario: Parent process alive
    Given a heartbeat process with parent PID 12345
    And parent process is running
    When 3 heartbeat intervals pass (15 seconds)
    Then the heartbeat should update 3 times
    And the process should continue running

  Scenario: Parent process dies
    Given a heartbeat process with parent PID 12345
    When I kill the parent process with kill -9
    Then the heartbeat process should detect parent death within 5 seconds
    And it should call the cleanup script
    And it should remove itself from the registry
    And it should exit with code 0

  Scenario: Cross-platform parent check
    Given heartbeat scripts for macOS, Linux, and Windows
    When I run the parent existence check on each platform
    Then it should correctly detect parent status on all platforms
```

**Files**:
- `plugins/specweave/scripts/heartbeat.sh` (new)
- `src/cli/update-heartbeat.js` (new CLI script)
- `src/cli/session-cleanup.js` (new CLI script)
- `tests/integration/heartbeat-process.test.ts` (new)

---

### T-005: Enhance Watchdog with Coordination Logic
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04
**Status**: [x] completed
**Estimated Time**: 4 hours
**Model Hint**: 💎 Opus (coordination algorithm, race conditions)

**Implementation**:
Enhance `plugins/specweave/scripts/session-watchdog.sh`:
- Add coordination check before daemon startup
- Query registry for active watchdog (hasActiveWatchdog())
- If active watchdog exists + healthy → exit gracefully
- If stale watchdog → kill stale PID + take over
- Register self in registry as type: "watchdog"

**Test Plan**:
```gherkin
Feature: Watchdog Coordination
  Scenario: First watchdog starts successfully
    Given no active watchdog in registry
    When I start session-watchdog.sh --daemon
    Then it should register itself as "watchdog" type
    And it should enter daemon mode
    And it should update its heartbeat every 5 seconds

  Scenario: Second watchdog detects active instance
    Given an active watchdog with PID 12345
    And the watchdog heartbeat is recent (<30s)
    When I try to start a second watchdog
    Then it should detect the active watchdog
    And it should log "Watchdog already active (PID: 12345)"
    And it should exit with code 0 without starting daemon

  Scenario: Stale watchdog takeover
    Given a registered watchdog with PID 12345
    And the watchdog heartbeat is stale (>60s old)
    And the PID 12345 no longer exists
    When I start a new watchdog
    Then it should detect the stale watchdog
    And it should remove the stale entry
    And it should take over as the new watchdog
    And it should log "Took over from stale watchdog (PID: 12345)"
```

**Files**:
- `plugins/specweave/scripts/session-watchdog.sh` (enhance)
- `src/cli/check-watchdog.js` (new CLI script)
- `tests/integration/watchdog-coordination.test.sh` (new)

---

### T-006: Implement Cleanup Service in Watchdog
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04
**Status**: [x] completed
**Estimated Time**: 5 hours
**Model Hint**: 💎 Opus (complex cleanup logic, pattern matching, safety critical)

**Implementation**:
Add `run_cleanup_service()` function to session-watchdog.sh:
- Call getStaleSessions(60) via CLI script
- For each stale session:
  - Validate PID before killing
  - Kill parent PID (SIGTERM → SIGKILL fallback)
  - Kill all child PIDs
  - Remove from registry
- Detect orphaned processes by pattern:
  - `cat.*EOF` (heredoc zombies)
  - `esbuild.*--service.*--ping` (>1 hour old)
  - `processor\.sh.*--daemon` (not in registry)
- Integrate into main watchdog loop (runs every 60s)

**Test Plan**:
```gherkin
Feature: Automated Cleanup Service
  Scenario: Clean up stale session
    Given a registered session "session-001" with PID 12345
    And child PIDs [12346, 12347, 12348]
    And last_heartbeat is 90 seconds old
    When the cleanup service runs
    Then it should kill PID 12345 (SIGTERM first, then SIGKILL if needed)
    And it should kill child PIDs 12346, 12347, 12348
    And it should remove "session-001" from registry
    And it should log the cleanup action

  Scenario: Detect and kill heredoc zombies
    Given 3 zombie processes matching "cat.*EOF"
    When the cleanup service runs
    Then all 3 processes should be killed with SIGKILL
    And the cleanup should be logged

  Scenario: Skip active sessions
    Given a registered session with last_heartbeat 10 seconds ago
    When the cleanup service runs
    Then the session should NOT be touched
    And the process should remain running

  Scenario: Handle non-existent PIDs gracefully
    Given a stale session with PID 99999 that doesn't exist
    When the cleanup service runs
    Then it should handle the error gracefully
    And it should still remove the session from registry
    And it should not crash or hang

  Scenario: PID validation before kill
    Given a stale session with PID 12345
    And PID 12345 is running but is NOT a Claude/SpecWeave process
    When the cleanup service runs
    Then it should NOT kill PID 12345 (safety check)
    And it should log a warning about PID mismatch
    And it should remove the session from registry
```

**Files**:
- `plugins/specweave/scripts/session-watchdog.sh` (enhance)
- `src/cli/get-stale-sessions.js` (new CLI script)
- `tests/integration/cleanup-service.test.sh` (new)
- `tests/e2e/zombie-cleanup.e2e.ts` (new)

---

### T-007: Add Cleanup Logging and Notifications
**User Story**: US-004
**Satisfies ACs**: AC-US4-05, AC-US4-06
**Status**: [x] completed
**Estimated Time**: 2 hours
**Model Hint**: ⚡ Haiku (logging format, notification logic)

**Implementation**:
Add logging to cleanup service:
- Create `.specweave/logs/cleanup.log`
- Log format: `[timestamp] [level] [action] details`
- Track: processes killed, sessions removed, errors
- Send notification if >3 processes cleaned:
  - macOS: osascript notification
  - Linux: notify-send
  - Windows: PowerShell toast

**Test Plan**:
```gherkin
Feature: Cleanup Logging and Notifications
  Scenario: Log cleanup actions
    Given the cleanup service is running
    When it cleans up 2 stale sessions
    Then cleanup.log should contain:
      - "[INFO] Cleaning up stale session: session-001 (PID: 12345)"
      - "[INFO] Killed process 12345 (SIGTERM)"
      - "[INFO] Killed child PIDs: 12346, 12347"
      - "[INFO] Removed session: session-001"

  Scenario: Send notification for large cleanup
    Given 5 zombie processes detected
    When the cleanup service runs
    Then it should send a system notification with:
      - Title: "🚨 Zombie Cleanup (5 processes)"
      - Body: List of cleaned processes
    And the notification should be logged

  Scenario: No notification for small cleanup
    Given 2 zombie processes detected
    When the cleanup service runs
    Then it should NOT send a system notification
    And it should only log the cleanup
```

**Files**:
- `plugins/specweave/scripts/session-watchdog.sh` (enhance logging)
- `tests/integration/cleanup-logging.test.sh` (new)

---

### T-008: Implement Lock Staleness Manager
**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03, AC-US5-04
**Status**: [x] completed
**Estimated Time**: 3 hours
**Model Hint**: 💎 Opus (lock semantics, cross-platform file operations)

**Implementation**:
Create `src/utils/lock-manager.ts`:
- LockManager class with acquire/release methods
- Stale detection: check lock age via mtime
- PID validation: read PID from lock/.pid file and verify existence
- Auto-removal of stale locks (>5 minutes + PID dead)
- Cross-platform timestamp extraction (macOS stat, Linux stat)

**Test Plan**:
```gherkin
Feature: Lock Staleness Detection
  Scenario: Acquire fresh lock
    Given no existing lock
    When I call lockManager.acquire()
    Then it should create the lock directory
    And it should write the PID to lock/pid
    And it should return true (success)

  Scenario: Detect and remove stale lock
    Given a lock that is 6 minutes old
    And the PID in the lock file no longer exists
    When I call lockManager.acquire()
    Then it should detect the lock as stale
    And it should remove the stale lock
    And it should acquire a new lock
    And it should return true (success)

  Scenario: Respect active lock
    Given a lock that is 2 minutes old
    And the PID in the lock file is still running
    When I call lockManager.acquire()
    Then it should NOT remove the lock
    And it should return false (failed to acquire)

  Scenario: Cross-platform timestamp extraction
    Given locks on macOS, Linux, and Windows
    When I check lock age on each platform
    Then it should correctly calculate age in seconds
    And it should use appropriate stat command for each platform
```

**Files**:
- `src/utils/lock-manager.ts` (new)
- `tests/unit/lock-manager.test.ts` (new)
- `tests/integration/lock-staleness.test.sh` (new)

---

### T-009: Enhance Processor with Lock Staleness Check
**User Story**: US-005
**Satisfies ACs**: AC-US5-05, AC-US5-06
**Status**: [x] completed
**Estimated Time**: 2 hours
**Model Hint**: ⚡ Haiku (integration task, clear implementation)

**Implementation**:
Update `plugins/specweave/hooks/v2/queue/processor.sh`:
- Replace manual lock logic with LockManager
- Check for stale lock before acquire attempt
- Log stale lock removals to `.specweave/logs/lock-cleanup.log`
- Add session_id to lock metadata

**Test Plan**:
```gherkin
Feature: Processor Lock Staleness
  Scenario: Normal lock acquisition
    Given no existing processor lock
    When processor.sh starts
    Then it should acquire the lock
    And it should write session_id to lock metadata
    And it should proceed with processing

  Scenario: Stale lock recovery
    Given a processor lock that is 6 minutes old
    And the lock PID is dead
    When a new processor.sh starts
    Then it should detect the stale lock
    And it should remove the stale lock
    And it should log to lock-cleanup.log
    And it should acquire a new lock
    And it should proceed with processing

  Scenario: Active processor prevents duplicate
    Given a processor lock held by active PID 12345
    When a second processor.sh tries to start
    Then it should fail to acquire the lock
    And it should exit gracefully
    And it should NOT remove the active lock
```

**Files**:
- `plugins/specweave/hooks/v2/queue/processor.sh` (enhance)
- `tests/integration/processor-lock-staleness.test.sh` (new)

---

## Phase 3: Hook Integration (Week 2)

### T-010: Create SessionStart Hook with Registry Integration
**User Story**: US-006
**Satisfies ACs**: AC-US6-01, AC-US6-02
**Status**: [x] completed
**Estimated Time**: 3 hours
**Model Hint**: 💎 Opus (hook lifecycle, error handling)

**Implementation**:
Create `plugins/specweave/hooks/v2/session-start.sh`:
- Generate unique session_id (session-{pid}-{timestamp})
- Register session via CLI script
- Start heartbeat.sh in background (nohup + &)
- Log heartbeat PID to `.specweave/logs/sessions/`
- Handle errors gracefully (don't block Claude startup)

**Test Plan**:
```gherkin
Feature: SessionStart Hook Integration
  Scenario: Normal session start
    Given Claude Code is starting
    When the SessionStart hook fires
    Then a new session should be registered in the registry
    And the session type should be "claude-code"
    And the heartbeat process should start in background
    And the heartbeat PID should be added to child_pids

  Scenario: Hook failure doesn't block Claude
    Given the session registry file is corrupted
    When the SessionStart hook fires
    Then it should log the error
    And it should NOT crash or hang
    And Claude Code should continue starting normally

  Scenario: Multiple concurrent session starts
    Given 3 Claude Code sessions starting simultaneously
    When all 3 SessionStart hooks fire
    Then all 3 sessions should be registered successfully
    And each should have a unique session_id
    And the registry JSON should remain valid
```

**Files**:
- `plugins/specweave/hooks/v2/session-start.sh` (new)
- `src/cli/register-session.js` (new CLI script)
- `tests/e2e/session-start-hook.e2e.ts` (new)

---

### T-011: Create SessionEnd Hook with Cleanup
**User Story**: US-006
**Satisfies ACs**: AC-US6-03, AC-US6-04
**Status**: [x] completed
**Estimated Time**: 3 hours
**Model Hint**: 💎 Opus (cleanup safety, child process management)

**Implementation**:
Create `plugins/specweave/hooks/v2/session-end.sh`:
- Find session by current PID
- Kill all child processes (SIGTERM → SIGKILL fallback)
- Remove session from registry
- Clean up session-specific logs older than 7 days
- Handle missing session gracefully (e.g., hook didn't run on start)

**Test Plan**:
```gherkin
Feature: SessionEnd Hook Cleanup
  Scenario: Normal session termination
    Given a registered session "session-001" with PID 12345
    And child PIDs [12346, 12347, 12348] (heartbeat, processor, etc.)
    When Claude Code exits normally
    And the SessionEnd hook fires
    Then all child PIDs should be terminated within 5 seconds
    And the session should be removed from registry
    And session-specific logs older than 7 days should be cleaned

  Scenario: Handle missing session gracefully
    Given no registered session for current PID
    When the SessionEnd hook fires
    Then it should log a warning
    And it should NOT crash or hang
    And it should exit successfully

  Scenario: Kill stubborn child processes
    Given a child process that ignores SIGTERM
    When the SessionEnd hook tries to kill it
    Then it should wait 2 seconds for SIGTERM
    And then send SIGKILL
    And the process should be terminated
```

**Files**:
- `plugins/specweave/hooks/v2/session-end.sh` (new)
- `src/cli/find-session-by-pid.js` (new CLI script)
- `src/cli/remove-session.js` (new CLI script)
- `tests/e2e/session-end-hook.e2e.ts` (new)

---

### T-012: Handle Non-Interactive Mode (CI/CD)
**User Story**: US-006
**Satisfies ACs**: AC-US6-06
**Status**: [x] completed
**Estimated Time**: 2 hours
**Model Hint**: ⚡ Haiku (environment detection, conditional logic)

**Implementation**:
Update hooks to detect non-interactive mode:
- Check `$CI` environment variable
- Check `$TERM` == "dumb" or empty
- Skip background processes in CI (no heartbeat, no watchdog)
- Use simplified registry (no staleness detection)
- Fast cleanup on exit

**Test Plan**:
```gherkin
Feature: Non-Interactive Mode Support
  Scenario: CI environment detection
    Given CI=true environment variable
    When SessionStart hook fires
    Then it should NOT start heartbeat process
    And it should NOT start watchdog daemon
    And it should use simplified session tracking

  Scenario: Interactive mode uses full features
    Given CI environment variable is not set
    And TERM=xterm-256color
    When SessionStart hook fires
    Then it should start heartbeat process
    And it should coordinate with watchdog
    And it should use full session registry

  Scenario: Fast cleanup in CI
    Given a CI environment session
    When SessionEnd hook fires
    Then it should skip staleness checks
    And it should immediately remove the session
    And it should complete within 1 second
```

**Files**:
- `plugins/specweave/hooks/v2/session-start.sh` (enhance)
- `plugins/specweave/hooks/v2/session-end.sh` (enhance)
- `tests/integration/non-interactive-mode.test.sh` (new)

---

## Phase 4: Cross-Platform Support (Week 2-3)

### T-013: Abstract Platform-Specific Operations
**User Story**: US-007
**Satisfies ACs**: AC-US7-01, AC-US7-02, AC-US7-03
**Status**: [x] completed
**Estimated Time**: 4 hours
**Model Hint**: 💎 Opus (platform abstraction, compatibility layer)

**Implementation**:
Create `src/utils/platform-utils.ts`:
- `checkProcessExists(pid)` - cross-platform PID check
- `getFileMtime(path)` - cross-platform timestamp extraction
- `acquireFileLock(path)` - cross-platform atomic mkdir
- `killProcess(pid, signal)` - cross-platform process kill
- Platform detection: macOS, Linux, Windows

**Test Plan**:
```gherkin
Feature: Cross-Platform Operations
  Scenario: Check process existence on macOS
    Given a running process with PID 12345 on macOS
    When I call checkProcessExists(12345)
    Then it should use "kill -0 12345" command
    And it should return true

  Scenario: Check process existence on Windows
    Given a running process with PID 12345 on Windows
    When I call checkProcessExists(12345)
    Then it should use "tasklist /FI \"PID eq 12345\""
    And it should return true

  Scenario: Get file mtime on Linux
    Given a file with mtime of 1702123456 on Linux
    When I call getFileMtime(file)
    Then it should use "stat -c %Y"
    And it should return 1702123456

  Scenario: Get file mtime on macOS
    Given a file with mtime of 1702123456 on macOS
    When I call getFileMtime(file)
    Then it should use "stat -f %m"
    And it should return 1702123456
```

**Files**:
- `src/utils/platform-utils.ts` (new)
- `tests/unit/platform-utils.test.ts` (new)
- `tests/integration/cross-platform.test.sh` (new, runs on CI matrix)

---

### T-014: Implement Cross-Platform Notifications
**User Story**: US-007
**Satisfies ACs**: AC-US7-04
**Status**: [x] completed
**Estimated Time**: 2 hours
**Model Hint**: ⚡ Haiku (notification APIs, platform detection)

**Implementation**:
Create `src/utils/notification-manager.ts`:
- `sendNotification(title, body)` - cross-platform notifications
- macOS: `osascript -e "display notification..."`
- Linux: `notify-send` (if available, check with `command -v`)
- Windows: PowerShell toast notifications
- Graceful fallback: log if notification unavailable

**Test Plan**:
```gherkin
Feature: Cross-Platform Notifications
  Scenario: Send notification on macOS
    Given a macOS system with osascript available
    When I call sendNotification("Test", "Message")
    Then it should execute osascript command
    And a notification should appear in Notification Center

  Scenario: Send notification on Linux with notify-send
    Given a Linux system with notify-send installed
    When I call sendNotification("Test", "Message")
    Then it should execute notify-send command
    And a notification should appear

  Scenario: Graceful fallback without notification support
    Given a system without notification tools
    When I call sendNotification("Test", "Message")
    Then it should log the notification message
    And it should NOT crash or throw an error
```

**Files**:
- `src/utils/notification-manager.ts` (new)
- `tests/unit/notification-manager.test.ts` (new)

---

### T-015: Add CI Matrix Tests for All Platforms
**User Story**: US-007
**Satisfies ACs**: AC-US7-06
**Status**: [~] deferred (follow-up increment)
**Estimated Time**: 3 hours
**Model Hint**: ⚡ Haiku (CI configuration, GitHub Actions)
**Note**: Core cross-platform utilities implemented and tested manually. CI matrix automation deferred to follow-up work.

**Implementation**:
Create `.github/workflows/process-lifecycle-tests.yml`:
- Matrix strategy: [ubuntu-latest, macos-latest, windows-latest]
- Install Node.js 18+
- Run unit tests on all platforms
- Run integration tests (Bash scripts)
- Verify platform-specific utilities work
- Fail build if any platform fails

**Test Plan**:
```gherkin
Feature: CI Matrix Testing
  Scenario: Run tests on all platforms
    Given a GitHub Actions workflow with matrix strategy
    When a pull request is created
    Then tests should run on ubuntu-latest
    And tests should run on macos-latest
    And tests should run on windows-latest
    And all platform tests should pass

  Scenario: Platform-specific test execution
    Given platform-specific scripts
    When running on macOS
    Then it should use "stat -f %m" for timestamps
    And when running on Linux
    Then it should use "stat -c %Y" for timestamps
```

**Files**:
- `.github/workflows/process-lifecycle-tests.yml` (new)
- `tests/scripts/ci-platform-test.sh` (new helper)

---

## Phase 5: Testing & Validation (Week 3)

### T-016: E2E Test - Normal Session Lifecycle
**User Story**: All
**Satisfies ACs**: Multiple
**Status**: [~] deferred (follow-up increment)
**Estimated Time**: 3 hours
**Model Hint**: 💎 Opus (complex E2E scenario, multiple components)
**Note**: System tested manually with real Claude Code sessions. Automated E2E tests deferred to follow-up.

**Implementation**:
Create comprehensive E2E test:
- Start mock Claude Code session
- Verify registry entry created
- Verify heartbeat running
- Simulate normal work (30s)
- Exit session
- Verify cleanup completed
- Check no zombie processes

**Test Plan**:
```gherkin
Feature: Normal Session Lifecycle E2E
  Scenario: Complete session lifecycle
    Given a clean test environment
    When I start a Claude Code session
    Then within 5 seconds:
      - Session should be registered in registry
      - Heartbeat process should be running
      - Watchdog should detect the session

    When I work for 30 seconds
    Then:
      - Heartbeat should update every 5 seconds
      - Session status should remain "active"

    When I exit the session normally
    Then within 10 seconds:
      - SessionEnd hook should fire
      - All child processes should be killed
      - Session should be removed from registry
      - No zombie processes should remain
```

**Files**:
- `tests/e2e/normal-session-lifecycle.e2e.ts` (new)

---

### T-017: E2E Test - Crash Recovery
**User Story**: US-004, US-003
**Satisfies ACs**: AC-US4-02, AC-US4-03, AC-US3-02
**Status**: [~] deferred (follow-up increment)
**Estimated Time**: 4 hours
**Model Hint**: 💎 Opus (crash scenarios, timing-sensitive)
**Note**: Crash recovery tested manually by killing processes. Automated tests deferred.

**Implementation**:
Create crash recovery E2E test:
- Start mock Claude session
- Kill with SIGKILL (simulate crash)
- Wait for cleanup service (60s scan interval)
- Verify all processes cleaned up
- Verify notification sent
- Check logs for cleanup actions

**Test Plan**:
```gherkin
Feature: Crash Recovery E2E
  Scenario: Session crashes and auto-recovers
    Given a Claude Code session with PID 12345
    And child processes: heartbeat (12346), processor (12347)

    When I kill PID 12345 with SIGKILL (simulate crash)
    Then:
      - SessionEnd hook does NOT fire (crash prevents it)
      - Heartbeat process detects parent death within 5s
      - Heartbeat self-terminates and removes session

    When 70 seconds pass (cleanup service interval + buffer)
    Then:
      - Cleanup service detects any remaining zombies
      - All remaining child PIDs are killed
      - Session is removed from registry (if heartbeat failed)
      - Notification is sent about cleanup
      - cleanup.log contains the cleanup actions

    And no zombie processes matching these patterns:
      - "claude.*PID 12345"
      - "heartbeat.*session-12345"
      - "processor.*session-12345"
```

**Files**:
- `tests/e2e/crash-recovery.e2e.ts` (new)

---

### T-018: E2E Test - Multiple Concurrent Sessions
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02
**Status**: [~] deferred (follow-up increment)
**Estimated Time**: 3 hours
**Model Hint**: 💎 Opus (concurrency, coordination logic)
**Note**: Watchdog coordination tested manually. Automated multi-session tests deferred.

**Implementation**:
Test multiple sessions with single watchdog:
- Start 3 concurrent Claude sessions
- Verify only 1 watchdog running
- Exit sessions in random order
- Verify no conflicts
- Verify clean shutdown

**Test Plan**:
```gherkin
Feature: Multiple Concurrent Sessions E2E
  Scenario: Three concurrent sessions
    Given a clean test environment

    When I start 3 Claude Code sessions simultaneously
    Then:
      - All 3 sessions register successfully
      - Only 1 watchdog daemon is running
      - Each session has unique session_id
      - Registry JSON remains valid

    When I exit session 2 (middle one)
    Then:
      - Session 2 is cleaned up
      - Sessions 1 and 3 remain active
      - Watchdog continues running (other sessions active)

    When I exit session 1 and session 3
    Then:
      - All sessions are cleaned up
      - Watchdog self-terminates (no active sessions)
      - No zombie processes remain
```

**Files**:
- `tests/e2e/multiple-sessions.e2e.ts` (new)

---

### T-019: Performance Benchmarking
**User Story**: N/A (Non-functional requirement)
**Status**: [~] deferred (follow-up increment)
**Estimated Time**: 2 hours
**Model Hint**: ⚡ Haiku (benchmark scripts, data collection)
**Note**: Performance verified as acceptable during manual testing. Formal benchmarks deferred.

**Implementation**:
Create performance benchmark suite:
- Registry update latency (1000 iterations)
- Heartbeat overhead (CPU %, memory MB)
- Cleanup service scan time (10, 50, 100 sessions)
- Lock acquisition time
- Compare: HDD vs SSD, macOS vs Linux

**Test Plan**:
```gherkin
Feature: Performance Benchmarks
  Scenario: Registry update performance
    Given 100 registered sessions
    When I update heartbeat 1000 times
    Then average latency should be <5ms on SSD
    And average latency should be <20ms on HDD
    And no updates should fail

  Scenario: Heartbeat process overhead
    Given a running heartbeat process
    When I measure CPU and memory usage over 5 minutes
    Then CPU usage should be <1%
    And memory usage should be <10MB

  Scenario: Cleanup service scalability
    Given 100 registered sessions (50 stale, 50 active)
    When cleanup service runs
    Then scan time should be <500ms
    And cleanup should complete within 2 seconds
```

**Files**:
- `tests/performance/session-registry-bench.ts` (new)
- `tests/performance/cleanup-service-bench.sh` (new)

---

## Phase 6: Documentation (Week 3)

### T-020: Update CLAUDE.md with Zombie Prevention Info
**User Story**: N/A (Documentation)
**Status**: [x] completed
**Estimated Time**: 1 hour
**Model Hint**: ⚡ Haiku (documentation update)

**Implementation**:
Update `CLAUDE.md` section "Emergency - Session Stuck":
- Replace manual cleanup with "Auto-cleanup now enabled"
- Document session registry location
- Explain how to check cleanup logs
- Add troubleshooting for notification issues

**Files**:
- `CLAUDE.md` (update Emergency section)

---

### T-021: Create Architecture Decision Record (ADR)
**User Story**: N/A (Documentation)
**Status**: [x] completed
**Estimated Time**: 2 hours
**Model Hint**: ⚡ Haiku (ADR template, technical writing)

**Implementation**:
Create `.specweave/docs/internal/architecture/adr/XXXX-session-registry-design.md`:
- Context: Zombie process problem
- Decision: Session registry with heartbeat
- Alternatives considered: OS process tree, PID files
- Consequences: Pros (atomicity, persistence) vs Cons (file I/O overhead)
- Rationale for technology choices

**Files**:
- `.specweave/docs/internal/architecture/adr/XXXX-session-registry-design.md` (new)

---

### T-022: Create Troubleshooting Guide
**User Story**: N/A (Documentation)
**Status**: [x] completed
**Estimated Time**: 2 hours
**Model Hint**: ⚡ Haiku (troubleshooting documentation)

**Implementation**:
Create `.specweave/docs/internal/troubleshooting/zombie-processes.md`:
- Symptoms: "Claude Code stuck", "Too many processes"
- Diagnosis: Check registry, check logs, check process tree
- Resolution: Automatic (wait 60s) or manual cleanup
- Prevention: Enabled by default
- FAQ: Common issues and solutions

**Files**:
- `.specweave/docs/internal/troubleshooting/zombie-processes.md` (new)

---

### T-023: Update Emergency Procedures Documentation
**User Story**: N/A (Documentation)
**Status**: [x] completed
**Estimated Time**: 1 hour
**Model Hint**: ⚡ Haiku (documentation update)

**Implementation**:
Update `.specweave/docs/internal/emergency-procedures/`:
- Update stuck session procedure (now automated)
- Add manual override instructions (if auto-cleanup fails)
- Document how to disable auto-cleanup (for debugging)
- Add flowchart for escalation

**Files**:
- `.specweave/docs/internal/emergency-procedures/stuck-sessions.md` (update)

---

## Phase 7: Final Integration & Rollout (Week 3)

### T-024: Beta Testing on Real Machines
**User Story**: All
**Status**: [~] deferred (follow-up increment)
**Estimated Time**: 5 days (passive testing)
**Model Hint**: N/A (manual testing)
**Note**: System deployed and running in production. Ongoing beta testing will continue in follow-up.

**Implementation**:
Beta testing checklist:
- Deploy to 3 developer machines (1 macOS, 1 Linux, 1 Windows)
- Run for 1 week of normal development
- Collect metrics: cleanup events, notifications, errors
- Interview developers: UX feedback, issues encountered
- Fix critical bugs before general release

**Acceptance Criteria**:
- Zero manual cleanups needed during beta week
- <3 false positive notifications per developer
- <1% CPU overhead measured
- No crashes or hangs reported
- Positive feedback from all 3 beta users

---

## Summary

**Total Tasks**: 24
**Estimated Effort**: 2-3 weeks (with testing overlap)

**Critical Path**:
1. Session Registry (T-001, T-002, T-003) → 9 hours
2. Heartbeat + Watchdog (T-004, T-005, T-006) → 12 hours
3. Hook Integration (T-010, T-011) → 6 hours
4. E2E Testing (T-016, T-017, T-018) → 10 hours
5. Beta Testing (T-024) → 5 days

**Dependencies**:
- T-002 depends on T-001 (registry must exist)
- T-006 depends on T-003 (cleanup needs staleness detection)
- T-010, T-011 depend on T-001, T-002, T-004 (hooks need registry + heartbeat)
- T-016, T-017, T-018 depend on all implementation tasks

**Risks**:
- Cross-platform testing may reveal OS-specific bugs (mitigate: CI matrix from day 1)
- Performance may degrade with 100+ sessions (mitigate: benchmark early, optimize if needed)
- Hook failures could break existing workflows (mitigate: fail-safe design, extensive testing)
