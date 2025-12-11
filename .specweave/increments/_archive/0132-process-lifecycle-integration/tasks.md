---
increment: 0132-process-lifecycle-integration
title: "Implementation Tasks - Part 2: Hook Integration & Cross-Platform"
status: planned
estimated_tasks: 7
estimated_weeks: 1
phases:
  - hook-integration
  - cross-platform
  - ci-testing
splitFrom: "0128-process-lifecycle-zombie-prevention"
splitPart: "2 of 3"
---

# Implementation Tasks - Part 2

**Hook Integration & Cross-Platform**: SessionStart/End Hooks, Platform Abstraction, CI Matrix Tests

**Tasks T-009 to T-015** from original increment 0128

## Phase 3: Hook Integration (Days 1-3)

### T-009: Implement Cross-Platform Utilities Layer
**User Story**: US-007
**Satisfies ACs**: AC-US7-01, AC-US7-02, AC-US7-03
**Status**: [x] completed
**Completed**: 2025-12-09
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

**Embedded Tests** (run after implementation):
```yaml
tests:
  - name: "Platform detection works correctly"
    type: unit
    file: tests/unit/platform-utils.test.ts
    coverage_target: 95%

  - name: "Process existence check on all platforms"
    type: integration
    platforms: [macOS, Linux, Windows]
    description: Verify checkProcessExists works on each OS

  - name: "File mtime extraction on all platforms"
    type: integration
    platforms: [macOS, Linux, Windows]
    description: Verify getFileMtime returns correct timestamps
```

---

### T-010: Create SessionStart Hook with Registry Integration
**User Story**: US-006
**Satisfies ACs**: AC-US6-01, AC-US6-02
**Status**: [x] completed
**Completed**: 2025-12-09
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

**Embedded Tests** (run after implementation):
```yaml
tests:
  - name: "SessionStart hook registers session"
    type: e2e
    description: Hook creates registry entry and starts heartbeat

  - name: "SessionStart hook handles errors gracefully"
    type: e2e
    scenarios:
      - corrupted_registry
      - missing_heartbeat_script
      - permission_denied
    expected: Hook logs error but returns success

  - name: "Concurrent SessionStart hooks don't corrupt registry"
    type: e2e
    concurrency: 3
    description: Multiple simultaneous hooks produce valid registry
```

---

### T-011: Create SessionEnd Hook with Cleanup
**User Story**: US-006
**Satisfies ACs**: AC-US6-03, AC-US6-04
**Status**: [x] completed
**Completed**: 2025-12-09
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

**Embedded Tests** (run after implementation):
```yaml
tests:
  - name: "SessionEnd hook kills all child processes"
    type: e2e
    description: Hook terminates heartbeat and other children

  - name: "SessionEnd hook removes session from registry"
    type: e2e
    description: Registry no longer contains session after hook

  - name: "SessionEnd hook handles missing session"
    type: e2e
    description: Hook logs warning and exits successfully

  - name: "SIGKILL fallback for stubborn processes"
    type: e2e
    description: Processes that ignore SIGTERM get SIGKILL after 2s
```

---

### T-012: Handle Non-Interactive Mode (CI/CD)
**User Story**: US-006
**Satisfies ACs**: AC-US6-06
**Status**: [x] completed
**Completed**: 2025-12-09
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

**Embedded Tests** (run after implementation):
```yaml
tests:
  - name: "CI mode detection"
    type: integration
    environments:
      - CI=true
      - TERM=dumb
      - TERM=
    expected: Simplified mode activated

  - name: "Interactive mode detection"
    type: integration
    environments:
      - CI= TERM=xterm-256color
      - CI=false TERM=screen
    expected: Full mode activated

  - name: "CI mode skips background processes"
    type: integration
    description: No heartbeat or watchdog started in CI
```

---

## Phase 4: Cross-Platform Support (Days 4-5)

### T-013: Implement Cross-Platform Notifications
**User Story**: US-007
**Satisfies ACs**: AC-US7-04
**Status**: [x] completed
**Completed**: 2025-12-09
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

**Embedded Tests** (run after implementation):
```yaml
tests:
  - name: "macOS notification using osascript"
    type: unit
    platform: macOS
    description: Verify osascript command is called correctly

  - name: "Linux notification using notify-send"
    type: unit
    platform: Linux
    description: Verify notify-send command is called

  - name: "Windows notification using PowerShell"
    type: unit
    platform: Windows
    description: Verify PowerShell toast notification works

  - name: "Graceful fallback on missing notification tools"
    type: unit
    description: Logs message instead of throwing error
```

---

### T-014: Add CLI Helper Scripts
**User Story**: US-006
**Satisfies ACs**: AC-US6-01, AC-US6-02, AC-US6-03, AC-US6-04
**Status**: [x] completed
**Completed**: 2025-12-09
**Estimated Time**: 2 hours
**Model Hint**: ⚡ Haiku (CLI utilities, straightforward logic)

**Implementation**:
Create CLI scripts for hook integration:
- `src/cli/register-session.js` - Register session in registry
- `src/cli/find-session-by-pid.js` - Find session by PID
- `src/cli/add-child-process.js` - Add child PID to session
- `src/cli/remove-session.js` - Remove session from registry
- All scripts use SessionRegistry class from Part 1

**Test Plan**:
```gherkin
Feature: CLI Helper Scripts
  Scenario: Register session
    Given no existing session for PID 12345
    When I run "node register-session.js session-001 12345 claude-code"
    Then the registry should contain session-001
    And the session PID should be 12345
    And the session type should be "claude-code"

  Scenario: Find session by PID
    Given a registered session with PID 12345
    When I run "node find-session-by-pid.js 12345"
    Then it should output the session info as JSON
    And the JSON should include session_id, pid, and child_pids

  Scenario: Add child process
    Given a registered session "session-001"
    When I run "node add-child-process.js session-001 12346"
    Then child_pids should include 12346

  Scenario: Remove session
    Given a registered session "session-001"
    When I run "node remove-session.js session-001"
    Then the registry should NOT contain session-001
```

**Files**:
- `src/cli/register-session.js` (new)
- `src/cli/find-session-by-pid.js` (new)
- `src/cli/add-child-process.js` (new)
- `src/cli/remove-session.js` (new)
- `tests/integration/cli-scripts.test.sh` (new)

**Embedded Tests** (run after implementation):
```yaml
tests:
  - name: "register-session.js creates registry entry"
    type: integration
    command: node src/cli/register-session.js session-test 12345 claude-code
    expected: Registry contains session-test

  - name: "find-session-by-pid.js returns session info"
    type: integration
    command: node src/cli/find-session-by-pid.js 12345
    expected: JSON output with session data

  - name: "add-child-process.js updates child_pids"
    type: integration
    command: node src/cli/add-child-process.js session-test 12346
    expected: child_pids array includes 12346

  - name: "remove-session.js deletes session"
    type: integration
    command: node src/cli/remove-session.js session-test
    expected: Registry no longer contains session-test
```

---

### T-015: Add CI Matrix Tests for All Platforms
**User Story**: US-007
**Satisfies ACs**: AC-US7-06
**Status**: [x] completed
**Completed**: 2025-12-09
**Estimated Time**: 3 hours
**Model Hint**: ⚡ Haiku (CI configuration, GitHub Actions)

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

**Embedded Tests** (run after implementation):
```yaml
tests:
  - name: "CI workflow runs on all platforms"
    type: ci
    platforms: [ubuntu-latest, macos-latest, windows-latest]
    description: Workflow executes successfully on each OS

  - name: "Platform utilities work on each OS"
    type: ci
    platforms: [ubuntu-latest, macos-latest, windows-latest]
    tests:
      - checkProcessExists
      - getFileMtime
      - acquireFileLock
      - killProcess

  - name: "Hooks work on each platform"
    type: ci
    platforms: [ubuntu-latest, macos-latest]  # Windows uses PowerShell hooks
    description: SessionStart/End hooks execute correctly
```

---

## Summary

**Total Tasks**: 7 (T-009 to T-015)
**Estimated Effort**: 1 week
**Model Distribution**: 3 Opus (43%), 4 Haiku (57%)

**Critical Path**:
1. Cross-Platform Utilities (T-009) → 4 hours (foundation)
2. SessionStart Hook (T-010) → 3 hours (integration)
3. SessionEnd Hook (T-011) → 3 hours (integration)
4. CI/CD Support (T-012) → 2 hours (compatibility)
5. Notifications (T-013) → 2 hours (UX)
6. CLI Scripts (T-014) → 2 hours (utilities)
7. CI Matrix Tests (T-015) → 3 hours (validation)

**Dependencies**:
- T-010, T-011, T-014 depend on T-009 (platform utils)
- T-012 depends on T-010, T-011 (enhance hooks)
- T-013 depends on T-009 (platform detection)
- T-015 depends on all tasks (validates everything)

**Next Increments**:
- **Part 3 (0133-process-lifecycle-testing)**: T-016 to T-024 (E2E Tests, Performance, Docs, Beta)
