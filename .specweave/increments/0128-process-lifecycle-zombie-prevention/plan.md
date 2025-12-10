---
increment: 0128-process-lifecycle-zombie-prevention
title: "Technical Architecture - Process Lifecycle Management"
created: 2025-12-09
---

# Technical Architecture: Process Lifecycle Management

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Claude Code Session                           │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ SessionStart Hook → Register in Session Registry          │ │
│  │                  → Start Heartbeat Process                │ │
│  └───────────────────────────────────────────────────────────┘ │
│                            │                                     │
│                            ├─────────────────────┐              │
│                            ▼                     ▼               │
│  ┌──────────────────────────────────┐  ┌────────────────────┐  │
│  │   Session Registry                │  │  Heartbeat Process │  │
│  │   .session-registry.json          │  │  (background)      │  │
│  │                                   │  │  - Poll parent PID  │  │
│  │  {                                │  │  - Update every 5s │  │
│  │    "sessions": {                  │  │  - Exit if parent  │  │
│  │      "abc123": {                  │  │    dies            │  │
│  │        "pid": 12345,              │  └────────────────────┘  │
│  │        "last_heartbeat": "...",   │                          │
│  │        "child_pids": [...]        │                          │
│  │      }                            │                          │
│  │    }                              │                          │
│  │  }                                │                          │
│  └──────────────────────────────────┘                          │
│                     │                                            │
└─────────────────────┼────────────────────────────────────────────┘
                      │
                      │ Monitored by
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              Session Watchdog (Single Instance)                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Coordination Check:                                       │  │
│  │  - Read registry before starting                         │  │
│  │  - If active watchdog exists → Exit                      │  │
│  │  - If stale watchdog → Kill + Take over                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Cleanup Service (runs every 60s):                        │  │
│  │  1. Scan session registry for stale sessions (>60s)      │  │
│  │  2. Kill zombie parent PIDs                              │  │
│  │  3. Kill all child_pids from stale sessions              │  │
│  │  4. Detect orphaned patterns: cat.*EOF, esbuild, etc.    │  │
│  │  5. Remove stale locks (.processor.lock.d)               │  │
│  │  6. Send notification if >3 processes cleaned            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Parent Death Detection:                                   │  │
│  │  - Poll parent PID every 5s (kill -0 $PPID)              │  │
│  │  - If parent dead → Self-terminate                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Design

### 1. Session Registry

**File**: `src/utils/session-registry.ts`

**Purpose**: Central tracking of all active Claude Code sessions and their child processes.

**API**:
```typescript
class SessionRegistry {
  constructor(projectRoot: string);

  // Register new session
  registerSession(sessionId: string, pid: number, type: 'claude-code' | 'watchdog'): Promise<void>;

  // Update heartbeat
  updateHeartbeat(sessionId: string): Promise<void>;

  // Add child process to session
  addChildProcess(sessionId: string, childPid: number): Promise<void>;

  // Remove session (clean termination)
  removeSession(sessionId: string): Promise<void>;

  // Get stale sessions (no heartbeat >threshold)
  getStaleSessions(thresholdSeconds: number): Promise<SessionInfo[]>;

  // Check if watchdog is active
  hasActiveWatchdog(): Promise<boolean>;

  // Get active watchdog session
  getActiveWatchdog(): Promise<SessionInfo | null>;
}

interface SessionInfo {
  session_id: string;
  pid: number;
  type: 'claude-code' | 'watchdog';
  start_time: string; // ISO-8601
  last_heartbeat: string; // ISO-8601
  child_pids: number[];
  status: 'active' | 'stale';
  parent_session?: string; // For watchdog
}
```

**Implementation Details**:
- Uses atomic file operations (temp file + rename) to prevent corruption
- File locking via `mkdir` (atomic on all POSIX systems)
- JSON format for human readability and debugging
- Validates PIDs before operations (process must exist)
- Auto-cleanup of sessions older than 24 hours

**File Location**: `.specweave/state/.session-registry.json`

### 2. Heartbeat Process

**File**: `plugins/specweave/scripts/heartbeat.sh`

**Purpose**: Background process that periodically updates session heartbeat and checks parent health.

**Pseudocode**:
```bash
#!/usr/bin/env bash
SESSION_ID="$1"
REGISTRY_FILE=".specweave/state/.session-registry.json"
INTERVAL=5

while true; do
  # Check if parent process still exists
  if ! kill -0 $PPID 2>/dev/null; then
    # Parent died - remove session and exit
    node src/cli/session-cleanup.js "$SESSION_ID"
    exit 0
  fi

  # Update heartbeat timestamp
  node src/cli/update-heartbeat.js "$SESSION_ID"

  sleep $INTERVAL
done
```

**Process Management**:
- Started by SessionStart hook
- Runs in background (detached)
- Self-terminates when parent dies
- Logs to `.specweave/logs/heartbeat.log`

**Cross-Platform Notes**:
- macOS/Linux: `kill -0 $PPID` checks parent existence
- Windows: `tasklist /FI "PID eq $PPID"` equivalent

### 3. Coordinated Watchdog

**File**: `plugins/specweave/scripts/session-watchdog.sh` (enhanced)

**New Features**:
1. **Coordination Check** (before daemon mode):
   ```bash
   # Check for active watchdog
   active_watchdog=$(node src/cli/check-watchdog.js)
   if [[ -n "$active_watchdog" ]]; then
     echo "Watchdog already active (PID: $active_watchdog)"
     exit 0
   fi
   ```

2. **Self-Registration**:
   ```bash
   # Register as watchdog in session registry
   SESSION_ID="watchdog-$$"
   node src/cli/register-session.js "$SESSION_ID" $$ "watchdog"
   ```

3. **Cleanup Service** (new function):
   ```bash
   run_cleanup_service() {
     # Get stale sessions from registry
     stale_sessions=$(node src/cli/get-stale-sessions.js 60)

     for session in $stale_sessions; do
       session_id=$(echo "$session" | jq -r '.session_id')
       parent_pid=$(echo "$session" | jq -r '.pid')
       child_pids=$(echo "$session" | jq -r '.child_pids[]')

       # Kill parent
       kill "$parent_pid" 2>/dev/null || kill -9 "$parent_pid" 2>/dev/null

       # Kill children
       for child in $child_pids; do
         kill "$child" 2>/dev/null || kill -9 "$child" 2>/dev/null
       done

       # Remove from registry
       node src/cli/remove-session.js "$session_id"

       log "Cleaned up stale session: $session_id (PID: $parent_pid)"
     done

     # Detect orphaned processes by pattern
     cleanup_orphaned_processes
   }

   cleanup_orphaned_processes() {
     # Pattern 1: Heredoc zombies
     pgrep -f "cat.*EOF" | xargs -r kill -9 2>/dev/null

     # Pattern 2: Stale esbuild services
     pgrep -f "esbuild.*--service.*--ping" | while read pid; do
       # Check if older than 1 hour
       start_time=$(ps -o lstart= -p "$pid")
       age_hours=$(( ($(date +%s) - $(date -j -f "%a %b %d %T %Y" "$start_time" +%s)) / 3600 ))
       if [[ $age_hours -gt 1 ]]; then
         kill -9 "$pid" 2>/dev/null
       fi
     done

     # Pattern 3: Stale processor daemons (not in registry)
     # ... similar logic
   }
   ```

**Main Loop** (enhanced):
```bash
while true; do
  # Existing health checks
  check_session_health || true

  # New: Run cleanup service
  run_cleanup_service

  # Update own heartbeat
  node src/cli/update-heartbeat.js "$SESSION_ID"

  sleep "$CHECK_INTERVAL"
done
```

### 4. Lock Staleness Management

**File**: `src/utils/lock-manager.ts`

**Purpose**: Handle file locks with automatic stale lock detection and removal.

**API**:
```typescript
class LockManager {
  constructor(lockDir: string, staleThresholdSeconds: number = 300);

  // Acquire lock (with stale detection)
  async acquire(): Promise<boolean>;

  // Release lock
  async release(): Promise<void>;

  // Check if lock is stale
  async isStale(): Promise<boolean>;

  // Force remove stale lock (validates PID first)
  async removeStale(): Promise<void>;
}
```

**Enhanced Processor Lock Acquisition**:
```typescript
// In processor.sh equivalent (TypeScript version)
const lockManager = new LockManager('.specweave/state/.processor.lock.d', 300);

if (await lockManager.isStale()) {
  logger.warn('Stale lock detected, removing...');
  await lockManager.removeStale();
}

if (await lockManager.acquire()) {
  // Proceed with processing
} else {
  logger.info('Another processor is running');
  process.exit(0);
}
```

### 5. Hook Integration

**File**: `plugins/specweave/hooks/v2/session-lifecycle-hooks.sh`

**SessionStart Hook**:
```bash
#!/usr/bin/env bash
# SessionStart:Callback hook
set -euo pipefail

PROJECT_ROOT="$PWD"
SESSION_ID="session-$$-$(date +%s)"

# Register session in registry
node "$PROJECT_ROOT/dist/src/cli/register-session.js" "$SESSION_ID" $$ "claude-code"

# Start heartbeat process (background, detached)
nohup bash "$PROJECT_ROOT/plugins/specweave/scripts/heartbeat.sh" "$SESSION_ID" \
  > "$PROJECT_ROOT/.specweave/logs/heartbeat-$SESSION_ID.log" 2>&1 &

echo "Session registered: $SESSION_ID"
```

**SessionEnd Hook**:
```bash
#!/usr/bin/env bash
# SessionEnd:Callback hook
set -euo pipefail

PROJECT_ROOT="$PWD"
SESSION_ID="session-$$-*"  # Match by PID

# Get session info
session_info=$(node "$PROJECT_ROOT/dist/src/cli/find-session-by-pid.js" $$)

if [[ -n "$session_info" ]]; then
  session_id=$(echo "$session_info" | jq -r '.session_id')
  child_pids=$(echo "$session_info" | jq -r '.child_pids[]')

  # Kill child processes
  for pid in $child_pids; do
    kill "$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null
  done

  # Remove from registry
  node "$PROJECT_ROOT/dist/src/cli/remove-session.js" "$session_id"

  echo "Session cleanup complete: $session_id"
fi
```

## Data Flow

### Normal Session Lifecycle

```
1. User starts Claude Code
   ↓
2. SessionStart hook fires
   ↓
3. Session registered in .session-registry.json
   ↓
4. Heartbeat process starts (background)
   ↓
5. User works (heartbeat updates every 5s)
   ↓
6. User exits Claude Code normally
   ↓
7. SessionEnd hook fires
   ↓
8. Child processes killed
   ↓
9. Session removed from registry
   ↓
10. Heartbeat process detects parent death → exits
```

### Crash Recovery Lifecycle

```
1. User starts Claude Code
   ↓
2. Session registered + heartbeat starts
   ↓
3. Claude Code crashes (kill -9 or system reboot)
   ↓
4. SessionEnd hook does NOT fire
   ↓
5. Heartbeat process detects parent death → removes session → exits
   ↓
6. Watchdog cleanup service (60s later):
   - Scans registry for stale sessions (no heartbeat >60s)
   - Kills zombie parent PID (if still exists)
   - Kills all child_pids from stale session
   - Removes stale locks
   - Sends notification to user
```

### Multiple Session Coordination

```
Session 1 starts:
  ↓
  Watchdog checks registry → No active watchdog
  ↓
  Watchdog starts in daemon mode
  ↓
  Watchdog registers itself

Session 2 starts:
  ↓
  Watchdog checks registry → Active watchdog found
  ↓
  Watchdog exits (no daemon)

Session 1 exits:
  ↓
  SessionEnd hook kills children
  ↓
  If last session → Watchdog self-terminates
```

## Technology Choices

### Why Session Registry (not OS process tracking)?

**Alternatives Considered**:
1. **OS Process Tree** (`pstree`, `ps --forest`)
   - ❌ Not reliable across crashes
   - ❌ Process trees break on daemon detach
   - ❌ No metadata storage (session type, start time)

2. **PID Files** (one per session)
   - ❌ Hard to query all active sessions
   - ❌ No atomic updates
   - ❌ Directory clutter

3. **Session Registry** (chosen)
   - ✅ Atomic updates via temp file + rename
   - ✅ Centralized query point
   - ✅ Stores rich metadata (heartbeat, children, type)
   - ✅ Survives crashes (persistent storage)

### Why Heartbeat (not liveness probes)?

**Alternatives Considered**:
1. **Liveness Probes** (HTTP endpoint)
   - ❌ Requires network stack
   - ❌ Port conflicts
   - ❌ Overhead for simple CLI tool

2. **IPC Signals** (SIGUSR1)
   - ❌ Platform-specific (Windows doesn't support)
   - ❌ No persistence across crashes

3. **Heartbeat File Updates** (chosen)
   - ✅ Simple timestamp updates
   - ✅ Cross-platform (all OSes support file mtime)
   - ✅ Low overhead (<10ms per update)
   - ✅ Persistent (survives process crashes)

### Why Coordination via Registry (not file locks)?

**Alternatives Considered**:
1. **Exclusive File Locks** (`flock`)
   - ❌ Locks released on process death (can't detect stale)
   - ❌ No metadata (can't tell WHO holds lock)

2. **PID Files** (single watchdog.pid)
   - ❌ Race conditions on startup
   - ❌ Stale PIDs not auto-detected

3. **Registry-Based Coordination** (chosen)
   - ✅ Rich metadata (PID, start time, heartbeat)
   - ✅ Stale detection built-in
   - ✅ No race conditions (atomic updates)

## Performance Considerations

### Registry Update Performance

**Target**: <10ms per update on HDD, <1ms on SSD

**Optimization**:
- Use small temp files (avoid large reads/writes)
- Update only modified fields (delta updates)
- Batch child PID additions

**Benchmark** (expected):
```
Registry size: 10 sessions
Update heartbeat: ~0.5ms (SSD), ~5ms (HDD)
Add child PID: ~2ms (SSD), ~10ms (HDD)
Scan stale sessions: ~5ms (SSD), ~20ms (HDD)
```

### Heartbeat Overhead

**Target**: <1% CPU per session

**Optimization**:
- Use `sleep 5` (not busy loop)
- Batch multiple operations per wake
- Skip updates if nothing changed

**Benchmark** (expected):
```
CPU usage: 0.1% per session (5s interval)
Memory: ~5MB per heartbeat process
I/O: 2 writes/sec (heartbeat + parent check)
```

### Cleanup Service Performance

**Target**: Complete scan in <500ms for 100 sessions

**Optimization**:
- Read registry once per scan (not per session)
- Parallel process kills (xargs -P 4)
- Skip PIDs that don't exist (fast fail)

**Benchmark** (expected):
```
10 sessions: ~50ms scan + ~20ms cleanup
100 sessions: ~300ms scan + ~100ms cleanup
```

## Security Considerations

### PID Validation

**Risk**: Cleanup service kills wrong process (PID reuse)

**Mitigation**:
1. Validate PID matches expected pattern before kill
2. Check process command line contains "claude" or "specweave"
3. Dry-run mode for testing (log but don't kill)
4. User confirmation for manual cleanup

**Example**:
```bash
validate_pid() {
  local pid="$1"
  local cmdline=$(ps -p "$pid" -o command= 2>/dev/null)

  if [[ -z "$cmdline" ]]; then
    return 1  # Process doesn't exist
  fi

  # Check if command contains expected patterns
  if [[ "$cmdline" =~ (claude|specweave|session-watchdog|processor\.sh) ]]; then
    return 0  # Valid SpecWeave process
  fi

  return 1  # Not a SpecWeave process
}
```

### Registry Corruption

**Risk**: Concurrent writes corrupt JSON

**Mitigation**:
1. Atomic writes (temp file + rename)
2. File locking during updates
3. Schema validation after read
4. Automatic repair (re-initialize if corrupt)

### Stale Lock Removal

**Risk**: Remove active lock (false positive)

**Mitigation**:
1. Check PID existence before removing
2. Verify process command line
3. Use conservative threshold (5 minutes, not 1 minute)
4. Log all removals for audit

## Testing Strategy

### Unit Tests

**Session Registry** (`session-registry.test.ts`):
```typescript
describe('SessionRegistry', () => {
  it('should register new session', async () => { /* ... */ });
  it('should update heartbeat atomically', async () => { /* ... */ });
  it('should detect stale sessions', async () => { /* ... */ });
  it('should handle concurrent updates', async () => { /* ... */ });
  it('should validate PIDs before operations', async () => { /* ... */ });
});
```

**Lock Manager** (`lock-manager.test.ts`):
```typescript
describe('LockManager', () => {
  it('should acquire lock', async () => { /* ... */ });
  it('should detect stale lock', async () => { /* ... */ });
  it('should remove stale lock after validation', async () => { /* ... */ });
  it('should prevent race conditions', async () => { /* ... */ });
});
```

### Integration Tests

**Watchdog Coordination** (`watchdog-coordination.test.sh`):
```bash
# Start 3 concurrent watchdog processes
bash session-watchdog.sh --daemon &
bash session-watchdog.sh --daemon &
bash session-watchdog.sh --daemon &

# Wait for coordination
sleep 5

# Verify only 1 watchdog running
watchdog_count=$(pgrep -f "session-watchdog.*--daemon" | wc -l)
assert_equals "$watchdog_count" "1"
```

**Cleanup Service** (`cleanup-service.test.sh`):
```bash
# Create fake stale session
create_stale_session_entry "session-abc123" 12345 90

# Run cleanup service once
bash session-watchdog.sh --run-cleanup-once

# Verify session removed
assert_not_exists ".specweave/state/.session-registry.json" "session-abc123"
```

### E2E Tests

**Crash Recovery** (`crash-recovery.e2e.ts`):
```typescript
it('should cleanup after crash', async () => {
  // Start session
  const session = await startClaudeCodeSession();
  const pid = session.pid;

  // Verify registered
  const registry = await readSessionRegistry();
  expect(registry.sessions).toHaveProperty(session.id);

  // Simulate crash
  process.kill(pid, 'SIGKILL');

  // Wait for cleanup
  await sleep(70_000); // 60s scan interval + 10s buffer

  // Verify cleaned up
  const updatedRegistry = await readSessionRegistry();
  expect(updatedRegistry.sessions).not.toHaveProperty(session.id);

  // Verify no zombie processes
  const zombies = await findZombieProcesses(pid);
  expect(zombies).toHaveLength(0);
});
```

## Monitoring & Observability

### Logs

**Locations**:
- `.specweave/logs/heartbeat-{session_id}.log` - Heartbeat updates
- `.specweave/logs/cleanup.log` - Cleanup service actions
- `.specweave/logs/lock-cleanup.log` - Stale lock removals
- `.specweave/logs/watchdog.log` - Watchdog coordination events

**Log Format**:
```
[2025-12-09T10:05:23Z] [INFO] [session-abc123] Heartbeat updated
[2025-12-09T10:06:00Z] [WARN] [cleanup-service] Stale session detected: session-xyz789 (no heartbeat for 90s)
[2025-12-09T10:06:01Z] [INFO] [cleanup-service] Killed process 12345 (session-xyz789)
[2025-12-09T10:06:01Z] [INFO] [cleanup-service] Removed session: session-xyz789
```

### Metrics

**Key Metrics to Track**:
- Active sessions count (gauge)
- Stale sessions detected (counter)
- Processes cleaned up (counter)
- Registry update latency (histogram)
- Cleanup service run duration (histogram)

**Dashboard** (optional, future):
```
┌────────────────────────────────────────────┐
│ SpecWeave Process Health                   │
├────────────────────────────────────────────┤
│ Active Sessions: 3                         │
│ Zombie Sessions: 0                         │
│ Processes Cleaned (24h): 15                │
│ Last Cleanup: 2m ago                       │
│ Registry Size: 3 sessions, 8 child PIDs    │
└────────────────────────────────────────────┘
```

## Deployment Plan

**Phase 1** (Week 1):
- Implement SessionRegistry class
- Add SessionStart/SessionEnd hooks
- Create heartbeat.sh script
- Unit tests + basic integration tests

**Phase 2** (Week 1-2):
- Enhance session-watchdog with coordination
- Implement cleanup service
- Add lock staleness detection
- Cross-platform testing

**Phase 3** (Week 2-3):
- Add notifications
- Performance optimization
- E2E tests on real machines
- Documentation

**Rollout**:
- Beta: 3 developers for 1 week
- General availability: All developers
- Monitor for 2 weeks before marking stable
