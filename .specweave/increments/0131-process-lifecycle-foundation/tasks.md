---
increment: 0131-process-lifecycle-foundation
title: "Implementation Tasks - Part 1: Foundation & Core"
status: planned
estimated_tasks: 8
estimated_weeks: 1
phases:
  - foundation
  - core-implementation
splitFrom: "0128-process-lifecycle-zombie-prevention"
splitPart: "1 of 3"
---

# Implementation Tasks - Part 1

**Foundation & Core**: Session Registry, Heartbeat, Watchdog, Cleanup, Lock Management

**Tasks T-001 to T-008** from original increment 0128

## Phase 1: Foundation (Days 1-2)

### T-001: Create Session Registry Data Structure
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Status**: [x] completed
**Completed**: 2025-12-09
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
\`\`\`gherkin
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
\`\`\`

**Files**:
- \`src/utils/session-registry.ts\` (new)
- \`src/types/session.ts\` (new interfaces)
- \`tests/unit/session-registry.test.ts\` (new)

---

### T-002: Implement Atomic Registry Operations
**User Story**: US-001
**Satisfies ACs**: AC-US1-02, AC-US1-03, AC-US1-04
**Status**: [x] completed
**Completed**: 2025-12-09
**Estimated Time**: 3 hours
**Model Hint**: 💎 Opus (atomicity critical, race conditions)

**Implementation**:
Add core methods to SessionRegistry:
- \`registerSession(id, pid, type)\` - atomic insert
- \`updateHeartbeat(id)\` - atomic timestamp update
- \`addChildProcess(id, childPid)\` - atomic array append
- \`removeSession(id)\` - atomic delete
- All operations use file locking (mkdir .lock)

**Test Plan**:
\`\`\`gherkin
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
\`\`\`

**Files**:
- \`src/utils/session-registry.ts\` (enhance)
- \`tests/unit/session-registry-atomicity.test.ts\` (new)

---

### T-003: Implement Staleness Detection Logic
**User Story**: US-001
**Satisfies ACs**: AC-US1-05, AC-US1-06
**Status**: [x] completed
**Completed**: 2025-12-09
**Estimated Time**: 2 hours
**Model Hint**: ⚡ Haiku (clear algorithm, well-defined logic)

**Implementation**:
Add staleness detection methods:
- \`getStaleSessions(thresholdSeconds)\` - returns sessions with old heartbeat
- \`cleanupOldSessions(retentionHours)\` - removes sessions older than retention period
- Time comparison logic using ISO-8601 parsing

**Test Plan**:
\`\`\`gherkin
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
\`\`\`

**Files**:
- \`src/utils/session-registry.ts\` (enhance)
- \`tests/unit/staleness-detection.test.ts\` (new)

---

## Phase 2: Core Implementation (Days 3-5)

### T-004: Create Heartbeat Background Script
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03
**Status**: [x] completed
**Completed**: 2025-12-09
**Estimated Time**: 3 hours
**Model Hint**: 💎 Opus (parent death detection, cross-platform considerations)

**Implementation**:
Create \`plugins/specweave/scripts/heartbeat.sh\`:
- Accept SESSION_ID as argument
- Loop: check parent PID every 5s (kill -0 $PPID)
- If parent dead: call cleanup script and exit
- Update heartbeat via Node.js CLI script
- Detached process (nohup, background)

**Test Plan**:
\`\`\`gherkin
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
\`\`\`

**Files**:
- \`plugins/specweave/scripts/heartbeat.sh\` (new)
- \`src/cli/update-heartbeat.js\` (new CLI script)
- \`src/cli/session-cleanup.js\` (new CLI script)
- \`tests/integration/heartbeat-process.test.ts\` (new)

---

### T-005: Enhance Watchdog with Coordination Logic
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04
**Status**: [x] completed
**Completed**: 2025-12-09
**Estimated Time**: 4 hours
**Model Hint**: 💎 Opus (coordination algorithm, race conditions)

**Implementation**:
Enhance \`plugins/specweave/scripts/session-watchdog.sh\`:
- Add coordination check before daemon startup
- Query registry for active watchdog (hasActiveWatchdog())
- If active watchdog exists + healthy → exit gracefully
- If stale watchdog → kill stale PID + take over
- Register self in registry as type: "watchdog"

**Test Plan**:
\`\`\`gherkin
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
\`\`\`

**Files**:
- \`plugins/specweave/scripts/session-watchdog.sh\` (enhance)
- \`src/cli/check-watchdog.js\` (new CLI script)
- \`tests/integration/watchdog-coordination.test.sh\` (new)

---

### T-006: Implement Cleanup Service in Watchdog
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04
**Status**: [x] completed
**Completed**: 2025-12-09
**Estimated Time**: 5 hours
**Model Hint**: 💎 Opus (complex cleanup logic, pattern matching, safety critical)

**Implementation**:
Add \`run_cleanup_service()\` function to session-watchdog.sh:
- Call getStaleSessions(60) via CLI script
- For each stale session:
  - Validate PID before killing
  - Kill parent PID (SIGTERM → SIGKILL fallback)
  - Kill all child PIDs
  - Remove from registry
- Detect orphaned processes by pattern:
  - \`cat.*EOF\` (heredoc zombies)
  - \`esbuild.*--service.*--ping\` (>1 hour old)
  - \`processor\.sh.*--daemon\` (not in registry)
- Integrate into main watchdog loop (runs every 60s)

**Test Plan**:
\`\`\`gherkin
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
\`\`\`

**Files**:
- \`plugins/specweave/scripts/session-watchdog.sh\` (enhance)
- \`src/cli/get-stale-sessions.js\` (new CLI script)
- \`tests/integration/cleanup-service.test.sh\` (new)
- \`tests/e2e/zombie-cleanup.e2e.ts\` (new)

---

### T-007: Add Cleanup Logging and Notifications
**User Story**: US-004
**Satisfies ACs**: AC-US4-05, AC-US4-06
**Status**: [x] completed
**Completed**: 2025-12-09
**Estimated Time**: 2 hours
**Model Hint**: ⚡ Haiku (logging format, notification logic)

**Implementation**:
Add logging to cleanup service:
- Create \`.specweave/logs/cleanup.log\`
- Log format: \`[timestamp] [level] [action] details\`
- Track: processes killed, sessions removed, errors
- Send notification if >3 processes cleaned:
  - macOS: osascript notification
  - Linux: notify-send
  - Windows: PowerShell toast

**Test Plan**:
\`\`\`gherkin
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
\`\`\`

**Files**:
- \`plugins/specweave/scripts/session-watchdog.sh\` (enhance logging)
- \`tests/integration/cleanup-logging.test.sh\` (new)

---

### T-008: Implement Lock Staleness Manager
**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03, AC-US5-04
**Status**: [x] completed
**Completed**: 2025-12-09
**Estimated Time**: 3 hours
**Model Hint**: 💎 Opus (lock semantics, cross-platform file operations)

**Implementation**:
Create \`src/utils/lock-manager.ts\`:
- LockManager class with acquire/release methods
- Stale detection: check lock age via mtime
- PID validation: read PID from lock/.pid file and verify existence
- Auto-removal of stale locks (>5 minutes + PID dead)
- Cross-platform timestamp extraction (macOS stat, Linux stat)

**Test Plan**:
\`\`\`gherkin
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
\`\`\`

**Files**:
- \`src/utils/lock-manager.ts\` (new)
- \`tests/unit/lock-manager.test.ts\` (new)
- \`tests/integration/lock-staleness.test.sh\` (new)

---

## Summary

**Total Tasks**: 8 (T-001 to T-008)
**Estimated Effort**: 1 week
**Model Distribution**: 5 Opus (62.5%), 3 Haiku (37.5%)

**Critical Path**:
1. Session Registry (T-001, T-002, T-003) → 9 hours (foundation)
2. Heartbeat + Watchdog (T-004, T-005) → 7 hours (core)
3. Cleanup Service (T-006, T-007) → 7 hours (automation)
4. Lock Manager (T-008) → 3 hours (resilience)

**Dependencies**:
- T-002 depends on T-001 (registry must exist)
- T-004, T-005, T-006 depend on T-001, T-002 (use registry)
- T-007 depends on T-006 (logging for cleanup)
- T-008 is independent (can be done in parallel)

**Next Increments**:
- **Part 2 (0132-process-lifecycle-integration)**: T-009 to T-016 (Hook Integration, Cross-Platform, CI)
- **Part 3 (0133-process-lifecycle-testing)**: T-017 to T-024 (E2E Tests, Docs, Beta)
