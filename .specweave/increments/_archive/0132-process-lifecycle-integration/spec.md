---
increment: 0132-process-lifecycle-integration
title: "Process Lifecycle - Part 2: Hook Integration & Cross-Platform"
type: feature
priority: P1
status: completed
created: 2025-12-09
project: specweave
testMode: TDD
coverageTarget: 95
dependencies: ["0131-process-lifecycle-foundation"]
estimated_effort: "1 week"
splitFrom: "0128-process-lifecycle-zombie-prevention"
splitPart: "2 of 3"
---

# Process Lifecycle - Part 2: Hook Integration & Cross-Platform

**Part 2 of 3** (0131 → **0132** → 0133) - Hook Integration, Cross-Platform Support, CI Testing

## Problem Statement

Part 1 (0131) delivered the core zombie prevention infrastructure:
- ✅ Session registry with atomic operations
- ✅ Heartbeat process with parent death detection
- ✅ Watchdog coordination (single daemon)
- ✅ Automated cleanup service
- ✅ Lock staleness manager

**Part 2 Focus**: Integrate the infrastructure into Claude Code's lifecycle and ensure cross-platform compatibility.

## Scope of Part 2

This increment implements **hook integration and cross-platform support**:

✅ **In Scope**:
- SessionStart hook to automatically register sessions
- SessionEnd hook to clean up on normal termination
- Non-interactive mode support (CI/CD environments)
- Cross-platform abstraction layer (macOS, Linux, Windows)
- Cross-platform notifications
- CI matrix tests for all platforms

❌ **Out of Scope** (Part 3):
- E2E testing scenarios → **0133**
- Performance benchmarking → **0133**
- Documentation updates → **0133**
- Beta testing rollout → **0133**

## Success Criteria

**Measurable Outcomes for Part 2**:
- SessionStart hook automatically registers 100% of Claude Code sessions
- SessionEnd hook cleans up child processes within 5 seconds
- Hooks work in both interactive and CI/CD environments
- All platform-specific operations abstracted and tested
- CI tests pass on macOS, Linux, and Windows
- Zero hook-related session startup failures

## User Stories

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
- [x] **AC-US7-06**: CI tests run on all three platforms (GitHub Actions matrix)

## Acceptance Criteria

All acceptance criteria are embedded within their respective user stories above (US-006 and US-007).

**Total**: 12 ACs across 2 user stories

## Functional Requirements

### FR-006: SessionStart Hook Flow
```
Claude Code starts
    ↓
SessionStart hook fires
    ↓
Generate session_id (session-{pid}-{timestamp})
    ↓
Register in .session-registry.json
    ↓
Start heartbeat.sh in background (detached, nohup)
    ↓
Add heartbeat PID to child_pids
    ↓
Log to .specweave/logs/sessions/{session_id}.log
    ↓
Continue Claude Code startup (hook returns success)
```

### FR-007: SessionEnd Hook Flow
```
Claude Code exits normally
    ↓
SessionEnd hook fires
    ↓
Find session by current PID
    ↓
Read child_pids from registry
    ↓
Kill each child (SIGTERM → wait 2s → SIGKILL if needed)
    ↓
Remove session from registry
    ↓
Clean up logs older than 7 days
    ↓
Hook returns success
```

### FR-008: Non-Interactive Mode Detection
```bash
# CI/CD environment detection
if [[ "$CI" == "true" ]] || [[ -z "$TERM" ]] || [[ "$TERM" == "dumb" ]]; then
  # Simplified tracking (no heartbeat, no watchdog)
  SIMPLIFIED_MODE=true
fi
```

### FR-009: Platform Abstraction API
```typescript
interface PlatformUtils {
  // Check if process exists
  checkProcessExists(pid: number): Promise<boolean>;

  // Get file modification time (seconds since epoch)
  getFileMtime(path: string): Promise<number>;

  // Acquire file lock (atomic mkdir)
  acquireFileLock(path: string): Promise<boolean>;

  // Kill process with signal
  killProcess(pid: number, signal?: string): Promise<void>;

  // Send system notification
  sendNotification(title: string, body: string): Promise<void>;
}
```

## Technical Constraints

**Performance**:
- Hooks must complete in <100ms (don't delay session startup)
- Heartbeat startup overhead <50ms
- Child process cleanup <5 seconds

**Reliability**:
- Hook failures must NOT block Claude Code startup
- All hook operations wrapped in try-catch
- Graceful degradation on unsupported platforms

**Compatibility**:
- Works on Claude Code 2.0+ (SessionStart/SessionEnd hooks)
- Node.js 18+ for TypeScript utilities
- Bash 4.0+ for scripts (sh-compatible fallbacks where possible)

## Out of Scope

- ❌ E2E testing scenarios - **0133-process-lifecycle-testing**
- ❌ Performance benchmarking - **0133-process-lifecycle-testing**
- ❌ Documentation updates (CLAUDE.md, ADRs) - **0133-process-lifecycle-testing**
- ❌ Beta testing rollout - **0133-process-lifecycle-testing**

## Dependencies

**Internal** (from Part 1):
- Session registry (`src/utils/session-registry.ts`)
- Heartbeat script (`plugins/specweave/scripts/heartbeat.sh`)
- Watchdog script (`plugins/specweave/scripts/session-watchdog.sh`)
- Cleanup service logic

**External**:
- Claude Code SessionStart/SessionEnd hooks (v2.0+)
- GitHub Actions for CI matrix testing
- Platform-specific utilities (ps, kill, stat, osascript, notify-send, PowerShell)

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Hook failures block sessions | Medium | Critical | Try-catch all hook code, fail-safe defaults |
| Cross-platform incompatibility | High | High | CI tests on all platforms, fallback implementations |
| CI environment detection fails | Low | Medium | Conservative detection logic, env var checks |
| Notification permissions denied | Medium | Low | Graceful fallback to logging, no errors |

## Testing Strategy

**Unit Tests** (95% coverage):
- Platform utility functions (process check, file mtime, locking)
- Hook logic (registration, cleanup)
- Non-interactive mode detection

**Integration Tests** (90% coverage):
- SessionStart hook end-to-end flow
- SessionEnd hook cleanup
- Cross-platform script execution
- CI mode behavior

**CI Matrix Tests** (100% platform coverage):
- All tests run on ubuntu-latest, macos-latest, windows-latest
- Platform-specific utilities verified on each OS
- Hooks tested in CI environment

## Next Steps

After completing Part 2 (0132):
1. ✅ Hooks integrated and tested on all platforms
2. ✅ Cross-platform compatibility validated
3. → **Part 3 (0133)**: E2E testing, performance benchmarking, documentation, beta rollout
