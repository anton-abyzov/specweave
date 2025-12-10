---
increment: 0132-process-lifecycle-integration
title: "Technical Architecture - Part 2: Hook Integration & Cross-Platform"
created: 2025-12-09
---

# Technical Architecture: Hook Integration & Cross-Platform

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                   Claude Code Session Lifecycle                  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ Triggers Hooks
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Hook Integration Layer                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ SessionStart Hook (session-start.sh)                     │  │
│  │  1. Detect environment (CI vs interactive)               │  │
│  │  2. Generate session_id                                  │  │
│  │  3. Register session in registry                         │  │
│  │  4. Start heartbeat.sh (background, detached)            │  │
│  │  5. Log session start                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                     │
│                            │ Uses                                │
│                            ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Cross-Platform Utilities (platform-utils.ts)            │  │
│  │  - checkProcessExists(pid)                               │  │
│  │  - getFileMtime(path)                                    │  │
│  │  - acquireFileLock(path)                                 │  │
│  │  - killProcess(pid, signal)                              │  │
│  │  - sendNotification(title, body)                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                     │
│                            │ Platform Detection                  │
│                            ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Platform Implementations                                 │  │
│  │  - macOS: kill -0, stat -f %m, osascript                 │  │
│  │  - Linux: kill -0, stat -c %Y, notify-send               │  │
│  │  - Windows: tasklist, PowerShell, toast notifications    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ SessionEnd Hook (session-end.sh)                         │  │
│  │  1. Find session by current PID                          │  │
│  │  2. Read child_pids from registry                        │  │
│  │  3. Kill each child (SIGTERM → SIGKILL)                  │  │
│  │  4. Remove session from registry                         │  │
│  │  5. Clean up old logs (>7 days)                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ Updates
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│            Session Registry (.session-registry.json)             │
│                    (from Part 1 - 0131)                          │
└─────────────────────────────────────────────────────────────────┘
```

## Component Design

### 1. SessionStart Hook

**File**: `plugins/specweave/hooks/v2/session-start.sh`

**Purpose**: Automatically register Claude Code sessions in the session registry when they start.

**Implementation**:
```bash
#!/usr/bin/env bash
# SessionStart:Callback hook
set -euo pipefail

PROJECT_ROOT="$PWD"
SESSION_ID="session-$$-$(date +%s)"

# Detect CI/non-interactive mode
if [[ "${CI:-}" == "true" ]] || [[ -z "${TERM:-}" ]] || [[ "${TERM:-}" == "dumb" ]]; then
  # Simplified mode: register but no heartbeat
  node "$PROJECT_ROOT/dist/src/cli/register-session.js" "$SESSION_ID" $$ "claude-code" --ci-mode
  exit 0
fi

# Interactive mode: full registration
node "$PROJECT_ROOT/dist/src/cli/register-session.js" "$SESSION_ID" $$ "claude-code"

# Start heartbeat process (background, detached)
nohup bash "$PROJECT_ROOT/plugins/specweave/scripts/heartbeat.sh" "$SESSION_ID" \
  > "$PROJECT_ROOT/.specweave/logs/heartbeat-$SESSION_ID.log" 2>&1 &

HEARTBEAT_PID=$!

# Add heartbeat PID to session's child_pids
node "$PROJECT_ROOT/dist/src/cli/add-child-process.js" "$SESSION_ID" "$HEARTBEAT_PID"

echo "✅ Session registered: $SESSION_ID"
```

**Error Handling**:
- All operations wrapped in try-catch (Node.js scripts)
- Hook failures log error but return success (don't block Claude startup)
- Graceful degradation: if registry corrupted, create new one

**Output Format**:
```json
{
  "continue": true,
  "systemMessage": "✅ Session registered: session-12345-1702123456"
}
```

### 2. SessionEnd Hook

**File**: `plugins/specweave/hooks/v2/session-end.sh`

**Purpose**: Clean up child processes and remove session from registry when Claude Code exits normally.

**Implementation**:
```bash
#!/usr/bin/env bash
# SessionEnd:Callback hook
set -euo pipefail

PROJECT_ROOT="$PWD"

# Find session by current PID
session_info=$(node "$PROJECT_ROOT/dist/src/cli/find-session-by-pid.js" $$ 2>/dev/null || echo "")

if [[ -z "$session_info" ]]; then
  # No session found (hook didn't run on start, or registry corrupted)
  echo "⚠️  No session found for PID $$, skipping cleanup"
  exit 0
fi

session_id=$(echo "$session_info" | jq -r '.session_id')
child_pids=$(echo "$session_info" | jq -r '.child_pids[]' 2>/dev/null || echo "")

# Kill child processes (SIGTERM first, then SIGKILL after 2s)
if [[ -n "$child_pids" ]]; then
  for pid in $child_pids; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done

  # Wait 2 seconds for graceful termination
  sleep 2

  # Force kill any survivors
  for pid in $child_pids; do
    if kill -0 "$pid" 2>/dev/null; then
      kill -9 "$pid" 2>/dev/null || true
    fi
  done
fi

# Remove session from registry
node "$PROJECT_ROOT/dist/src/cli/remove-session.js" "$session_id"

# Clean up logs older than 7 days
find "$PROJECT_ROOT/.specweave/logs/" -name "heartbeat-*.log" -mtime +7 -delete 2>/dev/null || true

echo "✅ Session cleanup complete: $session_id"
```

**Error Handling**:
- Missing session → log warning, exit success
- Non-existent child PIDs → handle gracefully (already dead)
- Registry errors → log error, continue with cleanup

**Output Format**:
```json
{
  "continue": true,
  "systemMessage": "✅ Session cleanup complete: session-12345-1702123456"
}
```

### 3. Cross-Platform Utilities

**File**: `src/utils/platform-utils.ts`

**Purpose**: Abstract platform-specific operations to work on macOS, Linux, and Windows.

**API**:
```typescript
export enum Platform {
  macOS = 'darwin',
  Linux = 'linux',
  Windows = 'win32'
}

export class PlatformUtils {
  private platform: Platform;

  constructor() {
    this.platform = process.platform as Platform;
  }

  /**
   * Check if a process exists by PID
   * - macOS/Linux: kill -0 $pid
   * - Windows: tasklist /FI "PID eq $pid"
   */
  async checkProcessExists(pid: number): Promise<boolean> {
    if (this.platform === Platform.Windows) {
      return this.checkProcessExistsWindows(pid);
    } else {
      return this.checkProcessExistsPosix(pid);
    }
  }

  private async checkProcessExistsPosix(pid: number): Promise<boolean> {
    try {
      process.kill(pid, 0); // Signal 0 = check existence without killing
      return true;
    } catch (err: any) {
      if (err.code === 'ESRCH') return false; // No such process
      if (err.code === 'EPERM') return true; // Process exists but no permission
      throw err;
    }
  }

  private async checkProcessExistsWindows(pid: number): Promise<boolean> {
    const { execSync } = await import('child_process');
    try {
      const output = execSync(`tasklist /FI "PID eq ${pid}" /NH`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore']
      });
      return output.includes(pid.toString());
    } catch {
      return false;
    }
  }

  /**
   * Get file modification time (seconds since epoch)
   * - macOS: stat -f %m
   * - Linux: stat -c %Y
   * - Windows: PowerShell (Get-Item).LastWriteTime
   */
  async getFileMtime(path: string): Promise<number> {
    const fs = await import('fs/promises');
    const stats = await fs.stat(path);
    return Math.floor(stats.mtimeMs / 1000);
  }

  /**
   * Acquire file lock using atomic mkdir
   * (works on all platforms)
   */
  async acquireFileLock(lockPath: string, timeoutMs: number = 5000): Promise<boolean> {
    const fs = await import('fs/promises');
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        await fs.mkdir(lockPath, { recursive: false });
        return true; // Lock acquired
      } catch (err: any) {
        if (err.code === 'EEXIST') {
          // Lock already exists, wait and retry
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }
        throw err;
      }
    }

    return false; // Timeout
  }

  /**
   * Release file lock
   */
  async releaseFileLock(lockPath: string): Promise<void> {
    const fs = await import('fs/promises');
    try {
      await fs.rmdir(lockPath);
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err;
    }
  }

  /**
   * Kill process with signal
   * - POSIX: kill -s SIGNAL $pid
   * - Windows: taskkill /PID $pid /F
   */
  async killProcess(pid: number, signal: string = 'SIGTERM'): Promise<void> {
    if (this.platform === Platform.Windows) {
      const { execSync } = await import('child_process');
      execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
    } else {
      process.kill(pid, signal);
    }
  }

  /**
   * Send system notification
   * - macOS: osascript -e "display notification..."
   * - Linux: notify-send (if available)
   * - Windows: PowerShell toast notification
   */
  async sendNotification(title: string, body: string): Promise<void> {
    const { exec } = await import('child_process');

    try {
      if (this.platform === Platform.macOS) {
        await this.sendNotificationMacOS(title, body);
      } else if (this.platform === Platform.Linux) {
        await this.sendNotificationLinux(title, body);
      } else if (this.platform === Platform.Windows) {
        await this.sendNotificationWindows(title, body);
      }
    } catch (err) {
      // Graceful fallback: log instead of throwing
      console.warn(`Failed to send notification: ${err}`);
    }
  }

  private async sendNotificationMacOS(title: string, body: string): Promise<void> {
    const { exec } = await import('child_process');
    const escapedTitle = title.replace(/"/g, '\\"');
    const escapedBody = body.replace(/"/g, '\\"');
    const cmd = `osascript -e 'display notification "${escapedBody}" with title "${escapedTitle}"'`;

    await new Promise<void>((resolve, reject) => {
      exec(cmd, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private async sendNotificationLinux(title: string, body: string): Promise<void> {
    const { exec } = await import('child_process');

    // Check if notify-send is available
    await new Promise<void>((resolve, reject) => {
      exec('command -v notify-send', (err) => {
        if (err) reject(new Error('notify-send not available'));
        else resolve();
      });
    });

    const cmd = `notify-send "${title}" "${body}"`;
    await new Promise<void>((resolve, reject) => {
      exec(cmd, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private async sendNotificationWindows(title: string, body: string): Promise<void> {
    const { exec } = await import('child_process');
    const escapedTitle = title.replace(/'/g, "''");
    const escapedBody = body.replace(/'/g, "''");
    const psScript = `
      [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null;
      $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02);
      $xml = [xml]$template.GetXml();
      $xml.GetElementsByTagName('text')[0].AppendChild($xml.CreateTextNode('${escapedTitle}')) | Out-Null;
      $xml.GetElementsByTagName('text')[1].AppendChild($xml.CreateTextNode('${escapedBody}')) | Out-Null;
      $toast = [Windows.UI.Notifications.ToastNotification]::new($xml);
      [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('SpecWeave').Show($toast);
    `;

    await new Promise<void>((resolve, reject) => {
      exec(`powershell -Command "${psScript}"`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

// Export singleton instance
export const platformUtils = new PlatformUtils();
```

**Platform Detection**:
```typescript
import { platformUtils, Platform } from './platform-utils.js';

if (platformUtils.platform === Platform.macOS) {
  // macOS-specific logic
}
```

### 4. Non-Interactive Mode Support

**Detection Logic**:
```bash
# In session-start.sh
is_ci_mode() {
  [[ "${CI:-}" == "true" ]] || \
  [[ -z "${TERM:-}" ]] || \
  [[ "${TERM:-}" == "dumb" ]]
}

if is_ci_mode; then
  # Simplified mode
  SIMPLIFIED_MODE=true
else
  # Full mode
  SIMPLIFIED_MODE=false
fi
```

**CI Mode Behavior**:
- ✅ Register session in registry
- ❌ Do NOT start heartbeat (no background processes in CI)
- ❌ Do NOT start watchdog
- ✅ Fast cleanup on SessionEnd (no staleness checks)

### 5. CLI Scripts

**File**: `src/cli/register-session.js`
```typescript
#!/usr/bin/env node
import { SessionRegistry } from '../utils/session-registry.js';
import { consoleLogger } from '../utils/logger.js';

const [sessionId, pid, type, ...flags] = process.argv.slice(2);
const ciMode = flags.includes('--ci-mode');

const registry = new SessionRegistry(process.cwd(), { logger: consoleLogger });

await registry.registerSession(sessionId, parseInt(pid), type as 'claude-code' | 'watchdog');

if (ciMode) {
  console.log(`Session registered (CI mode): ${sessionId}`);
} else {
  console.log(`Session registered: ${sessionId}`);
}
```

**File**: `src/cli/find-session-by-pid.js`
```typescript
#!/usr/bin/env node
import { SessionRegistry } from '../utils/session-registry.js';
import { consoleLogger } from '../utils/logger.js';

const [pidStr] = process.argv.slice(2);
const pid = parseInt(pidStr);

const registry = new SessionRegistry(process.cwd(), { logger: consoleLogger });
const session = await registry.findSessionByPid(pid);

if (session) {
  console.log(JSON.stringify(session));
} else {
  process.exit(1);
}
```

**File**: `src/cli/add-child-process.js`
```typescript
#!/usr/bin/env node
import { SessionRegistry } from '../utils/session-registry.js';
import { consoleLogger } from '../utils/logger.js';

const [sessionId, childPidStr] = process.argv.slice(2);
const childPid = parseInt(childPidStr);

const registry = new SessionRegistry(process.cwd(), { logger: consoleLogger });
await registry.addChildProcess(sessionId, childPid);

console.log(`Child process ${childPid} added to session ${sessionId}`);
```

## Data Flow

### SessionStart Hook Flow

```
1. Claude Code starts
   ↓
2. SessionStart hook fires
   ↓
3. Detect CI mode (CI env var, TERM check)
   ↓
4. Generate session_id (session-{pid}-{timestamp})
   ↓
5. Call register-session.js (creates entry in .session-registry.json)
   ↓
6. If interactive mode:
   - Start heartbeat.sh in background
   - Add heartbeat PID to child_pids
   ↓
7. Return success to Claude Code
   ↓
8. Claude Code continues startup
```

### SessionEnd Hook Flow

```
1. Claude Code exits normally
   ↓
2. SessionEnd hook fires
   ↓
3. Call find-session-by-pid.js (get session info)
   ↓
4. If session not found → log warning, exit success
   ↓
5. Read child_pids from session
   ↓
6. For each child PID:
   - Send SIGTERM
   - Wait 2 seconds
   - Send SIGKILL if still alive
   ↓
7. Call remove-session.js (delete from registry)
   ↓
8. Clean up logs older than 7 days
   ↓
9. Return success
```

## Technology Choices

### Why Hooks (not Manual Integration)?

**Alternatives Considered**:
1. **Manual API calls** (user calls `specweave.register()`)
   - ❌ Easy to forget
   - ❌ Not automatic
   - ❌ Fragile

2. **Automatic Detection** (detect Claude process startup)
   - ❌ Unreliable (process tree changes)
   - ❌ Race conditions

3. **Hooks** (chosen)
   - ✅ Automatic execution
   - ✅ Guaranteed to run on every session
   - ✅ No user action needed

### Why Cross-Platform Abstraction?

**Alternatives Considered**:
1. **Platform-Specific Scripts** (separate .sh, .ps1, .bat)
   - ❌ Code duplication
   - ❌ Hard to maintain
   - ❌ Inconsistent behavior

2. **Node.js Only** (no shell scripts)
   - ❌ Can't hook into shell lifecycle
   - ❌ No daemon support

3. **Hybrid: Shell + TypeScript Abstraction** (chosen)
   - ✅ Hooks in shell (Claude Code integration)
   - ✅ Platform logic in TypeScript (testable, maintainable)
   - ✅ Single source of truth for platform differences

### Why CI Mode Detection?

**Alternatives Considered**:
1. **Ignore CI** (same behavior everywhere)
   - ❌ Background processes break CI
   - ❌ Slow CI builds (staleness checks)

2. **Manual Flag** (--ci flag)
   - ❌ Easy to forget
   - ❌ Not automatic

3. **Automatic Detection** (chosen)
   - ✅ Works out of the box
   - ✅ No extra configuration
   - ✅ Conservative logic (if in doubt, assume CI)

## Performance Considerations

### Hook Execution Time

**Target**: <100ms per hook (don't delay session startup)

**Optimization**:
- Use Node.js scripts (fast startup compared to bash)
- Minimize file I/O (single registry read/write)
- Async heartbeat startup (don't block hook)

**Benchmark** (expected):
```
SessionStart hook: ~50ms (registration + heartbeat spawn)
SessionEnd hook: ~200ms (PID kills + cleanup)
```

### Cross-Platform Call Overhead

**Target**: <10ms per platform utility call

**Optimization**:
- Cache platform detection (don't re-detect)
- Use native Node.js APIs where possible (fs.stat vs shell stat)
- Batch operations (kill multiple PIDs in one loop)

**Benchmark** (expected):
```
checkProcessExists: ~5ms (macOS/Linux), ~20ms (Windows)
getFileMtime: ~2ms (all platforms)
killProcess: ~10ms (macOS/Linux), ~50ms (Windows)
```

## Security Considerations

### Hook Injection

**Risk**: Malicious code in hook scripts

**Mitigation**:
- Hooks stored in plugin directory (not user-writable)
- Validate session_id format (no shell injection)
- Sanitize all user inputs in CLI scripts

### PID Validation

**Risk**: Kill wrong process (PID reuse)

**Mitigation**:
- Check process command line before kill
- Only kill processes owned by current user
- Log all kill operations for audit

**Example**:
```typescript
async function killProcessSafely(pid: number): Promise<void> {
  // Check if process is owned by current user
  const { execSync } = await import('child_process');
  const currentUid = process.getuid?.();

  if (currentUid !== undefined) {
    const pidUid = execSync(`ps -o uid= -p ${pid}`, { encoding: 'utf-8' }).trim();
    if (parseInt(pidUid) !== currentUid) {
      throw new Error(`PID ${pid} not owned by current user`);
    }
  }

  // Proceed with kill
  await platformUtils.killProcess(pid);
}
```

## Testing Strategy

### Unit Tests

**Platform Utilities** (`platform-utils.test.ts`):
```typescript
describe('PlatformUtils', () => {
  it('should detect platform correctly', () => { /* ... */ });
  it('should check process existence', async () => { /* ... */ });
  it('should get file mtime', async () => { /* ... */ });
  it('should acquire and release file locks', async () => { /* ... */ });
  it('should kill processes', async () => { /* ... */ });
  it('should send notifications (mock)', async () => { /* ... */ });
});
```

**Hook Logic** (`hook-logic.test.ts`):
```typescript
describe('Hook Logic', () => {
  it('should generate unique session ID', () => { /* ... */ });
  it('should detect CI mode', () => { /* ... */ });
  it('should handle missing session gracefully', () => { /* ... */ });
});
```

### Integration Tests

**SessionStart Hook** (`session-start-hook.test.sh`):
```bash
# Test interactive mode
CI="" TERM="xterm-256color" bash session-start.sh
assert_file_contains ".session-registry.json" "session-"
assert_process_running "heartbeat.sh"

# Test CI mode
CI="true" bash session-start.sh
assert_file_contains ".session-registry.json" "session-"
assert_process_not_running "heartbeat.sh"
```

**SessionEnd Hook** (`session-end-hook.test.sh`):
```bash
# Setup: create fake session with child processes
create_test_session "session-123" 12345 [12346, 12347]

# Run hook
bash session-end.sh

# Verify: children killed, session removed
assert_process_not_running 12346
assert_process_not_running 12347
assert_not_in_registry "session-123"
```

### CI Matrix Tests

**GitHub Actions** (`.github/workflows/process-lifecycle-tests.yml`):
```yaml
name: Process Lifecycle Tests

on: [push, pull_request]

jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node: [18, 20]

    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node }}

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration

      - name: Test platform utilities
        run: npm run test:platform

      - name: Test hooks (POSIX)
        if: runner.os != 'Windows'
        run: bash tests/integration/hooks.test.sh

      - name: Test hooks (Windows)
        if: runner.os == 'Windows'
        run: powershell tests/integration/hooks.test.ps1
```

## Deployment Plan

**Week 1** (Part 2):
- Implement SessionStart/SessionEnd hooks (Day 1-2)
- Implement cross-platform utilities (Day 3-4)
- Add CI matrix tests (Day 5)
- Integration testing (Day 5-7)

**Dependencies on Part 1**:
- Session registry must be complete
- Heartbeat script must be functional
- Cleanup service must work

**Rollout**:
- Merge Part 2 after all CI tests pass
- No beta needed (hooks fail-safe, don't break existing workflows)
- Monitor for hook failures in production logs
