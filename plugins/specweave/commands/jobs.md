---
name: specweave:jobs
description: Show current work status (active increments, progress) and background jobs (imports, cloning). Even with no jobs, shows increment summary and helpful context.
usage: /sw:jobs [--all] [--id <job-id>] [--resume <job-id>] [--kill <job-id>] [--follow <job-id>] [--logs <job-id>] [--diagnostics]
---

# Background Jobs Monitor

**Usage**: `/sw:jobs [options]`

---

## Purpose

Monitor and manage long-running background operations:
- **Repository cloning** (multi-repo/umbrella setup)
- **Issue import** (10K+ items from GitHub/JIRA/ADO)
- **External sync** operations
- **Brownfield analysis** (codebase documentation gap detection)
- **Session health monitoring** (watchdog diagnostics)

**ASYNC ARCHITECTURE (2025-12-01)**:
- Jobs run as **detached processes** that survive terminal close
- Progress tracked via filesystem (`.specweave/state/jobs/`)
- Can check status anytime with `/sw:jobs`

---

## Command Options

| Option | Description |
|--------|-------------|
| (none) | Show active jobs + session health |
| `--all` | Show all jobs (including completed) |
| `--id <jobId>` | Show details for specific job |
| `--follow <jobId>` | Follow job progress in real-time |
| `--logs <jobId>` | Show worker log output |
| `--resume <jobId>` | Resume paused job |
| `--kill <jobId>` | Kill running background job |
| `--diagnostics` | Show detailed watchdog diagnostics |

---

## Check Job Status

Read the background jobs state file and display status:

```bash
# Find and read the state file
STATE_FILE=".specweave/state/background-jobs.json"

# Also check job-specific files:
# .specweave/state/jobs/<jobId>/config.json  - Job configuration
# .specweave/state/jobs/<jobId>/worker.pid   - Process ID (if running)
# .specweave/state/jobs/<jobId>/worker.log   - Worker output log
# .specweave/state/jobs/<jobId>/result.json  - Results (when complete)
```

### Display Format

```
📋 Background Jobs & Session Health

🩺 Session Health: ✅ healthy (last check: 30s ago)

🔄 Running (2):
  [abc12345] import-issues (ADO)
     Progress: 2,500/10,000 (25%)
     Rate: 15.2/s | ETA: ~8m 14s
     PID: 45678 | Started: 2 mins ago

  [bfa99001] brownfield-analysis
     Phase: 3/5 (doc-matching)
     Files scanned: 1,234 | Discrepancies: 45
     PID: 45680 | Started: 5 mins ago

⏸️  Paused (1):
  [def67890] import-issues (GitHub)
     Progress: 1,234/10,000 (12%)
     Reason: Rate limited (resumes in 45s)
     Resume: /sw:jobs --resume def67890

✅ Completed (3):
  [ghi11111] import-issues - 4,500 items - 5 mins ago
  [jkl22222] clone-repos - 4/4 repos - 1 hour ago
  [bfa88001] brownfield-analysis - 127 discrepancies - 2 hours ago

💡 Commands:
   /sw:jobs --id abc12345     → Details for specific job
   /sw:jobs --follow abc12345 → Follow progress live
   /sw:jobs --logs abc12345   → View worker logs
   /sw:jobs --resume def67890 → Resume paused job
   /sw:jobs --kill abc12345   → Kill running job
   /sw:jobs --diagnostics     → Show watchdog diagnostics
   /sw:jobs --all             → Show all jobs (including old)
```

---

## Actions

### View Specific Job Details

```
/sw:jobs --id abc12345

📦 Job Details: abc12345

Type: import-issues
Status: running
Provider: ADO
PID: 45678

Started: 2024-01-15 10:30:00
Updated: 2024-01-15 10:32:15

Progress: 2,500/10,000 (25%)
Current: Acme\Core-Operations
Rate: 15.2 items/sec
ETA: ~8 minutes

Files:
  Config: .specweave/state/jobs/abc12345/config.json
  Logs: .specweave/state/jobs/abc12345/worker.log
  PID: .specweave/state/jobs/abc12345/worker.pid
```

### Follow Job Progress Live

Watch job progress in real-time (like `tail -f`):

```
/sw:jobs --follow abc12345

📦 Following job abc12345 (Ctrl+C to stop)

[10:30:15] Progress: 2,500/10,000 (25%) - Acme\Core-Operations
[10:30:16] Progress: 2,520/10,000 (25%) - Acme\Core-Operations
[10:30:17] Progress: 2,545/10,000 (25%) - Acme\AI-Platform
[10:30:18] Progress: 2,570/10,000 (26%) - Acme\AI-Platform
...
```

**Implementation**: Read `.specweave/state/jobs/<jobId>/worker.log` with tail-like behavior, or poll the job state file every second.

### View Worker Logs

Show detailed worker output:

```
/sw:jobs --logs abc12345

📋 Worker Logs for abc12345 (last 50 lines):

[2024-01-15T10:30:00.123Z] Worker started for job abc12345
[2024-01-15T10:30:00.456Z] Project path: /Users/dev/my-project
[2024-01-15T10:30:00.789Z] PID: 45678
[2024-01-15T10:30:01.234Z] Dependencies loaded, starting import...
[2024-01-15T10:30:02.567Z] Progress: 100/10000 - ado Acme\Core-Operations
[2024-01-15T10:30:03.890Z] Progress: 200/10000 - ado Acme\Core-Operations
...
```

**Implementation**: Read `.specweave/state/jobs/<jobId>/worker.log`

### Kill Running Job

Stop a background job:

```
/sw:jobs --kill abc12345

⚠️  Killing job abc12345...
   Type: import-issues
   PID: 45678
   Progress: 2,500/10,000 (25%)

✅ Job killed. Status changed to 'paused'.
   Resume later: /sw:jobs --resume abc12345
```

**Implementation**:
```typescript
import { killJob } from '../../../src/core/background/job-launcher.js';

const success = killJob(projectPath, jobId);
if (success) {
  console.log('Job killed successfully');
}
```

### Resume Paused Job

When a job is paused (rate limited, killed, or user requested), resume it:

```
/sw:jobs --resume def67890

🔄 Resuming job def67890...
   Type: import-issues
   Provider: GitHub
   Resuming from: item 1,234 of 10,000

⏳ Spawning background worker...
   New PID: 45679

✅ Job resumed in background.
   Check progress: /sw:jobs --follow def67890
```

**Implementation**:
```typescript
import { launchImportJob } from '../../../src/core/background/job-launcher.js';

// Re-launch the worker with existing config
const result = await launchImportJob({
  type: 'import-issues',
  projectPath,
  coordinatorConfig: existingConfig,
  estimatedTotal: job.progress.total
});
```

---

## Implementation

1. Read `.specweave/state/background-jobs.json`
2. Read `.specweave/state/.watchdog-diagnostics.json` for session health
3. Parse job entries
4. Display formatted status with health indicator
5. For --resume, update job status and continue operation
6. For --diagnostics, show detailed watchdog checks

### State File Locations

```
.specweave/state/background-jobs.json          - Job status and progress
.specweave/state/.watchdog-diagnostics.json    - Session health checks
.specweave/state/jobs/<jobId>/config.json      - Job configuration
.specweave/state/jobs/<jobId>/worker.pid       - Worker process ID
.specweave/state/jobs/<jobId>/worker.log       - Worker output log
.specweave/logs/watchdog.log                   - Watchdog history
```

### Reading Session Health

```typescript
import * as fs from 'fs';
import * as path from 'path';

function getSessionHealth(projectPath: string): SessionHealth | null {
  const diagnosticsPath = path.join(projectPath, '.specweave/state/.watchdog-diagnostics.json');
  if (!fs.existsSync(diagnosticsPath)) {
    return null; // Watchdog not running
  }

  try {
    const content = fs.readFileSync(diagnosticsPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

interface SessionHealth {
  timestamp: string;
  severity: 0 | 1 | 2;  // INFO | WARNING | CRITICAL
  status: 'healthy' | 'warning' | 'critical';
  checks: {
    lock: { severity: number; message: string };
    zombies: { count: number; message: string };
    mcp: { drops: number; message: string };
    orphanedJobs: { count: number; message: string };
  };
  consecutiveWarnings: number;
  thresholdSeconds: number;
  checkIntervalSeconds: number;
}
```

### Job Types

| Type | Description | Typical Duration |
|------|-------------|------------------|
| `clone-repos` | Multi-repo cloning | 1-5 mins |
| `import-issues` | Issue import from external | 5-60 mins |
| `sync-external` | Bidirectional sync | 1-10 mins |
| `brownfield-analysis` | Doc gap detection | 2-30 mins |

---

## Integration Points

- Called after `specweave init` with background clone
- Called after `/sw:import-external` starts background import
- Called after `/sw-github:sync` for large syncs
- Called after `/sw-jira:sync` for large syncs
- Called after `specweave init` brownfield analysis prompt

---

## Brownfield Analysis Completion

When a brownfield-analysis job completes, it shows a summary:

```
✅ Brownfield Analysis Complete (bfa88001)

📊 Results Summary:
   Files analyzed: 2,456
   Modules detected: 18
   Duration: 12m 34s

📋 Discrepancies Found: 127
   By Type:
     missing-docs:   72 (57%)
     stale-docs:     28 (22%)
     knowledge-gap:  15 (12%)
     orphan-doc:      8 (6%)
     missing-adr:     4 (3%)

   By Priority:
     🔴 Critical:    3
     🟠 High:       24
     🟡 Medium:     68
     🟢 Low:        32

💡 Next Steps:
   /sw:discrepancies           → View all pending discrepancies
   /sw:discrepancies --module auth → Filter by module
   /sw:discrepancy-to-increment DISC-0001 DISC-0002 → Create increment
```

---

## Error Handling

If job failed:
```
❌ Failed (1):
  [xyz99999] import-issues
     Error: Rate limit exceeded (retry after 60s)
     Failed at: item 5,000 of 10,000
     Resume: /sw:jobs --resume xyz99999
```

---

## Session Health & Watchdog Diagnostics (v2.0)

The `/sw:jobs` command now includes session health monitoring. The watchdog runs in the background and writes diagnostics that help explain any alerts you may have received.

### Display Format (with health status)

```
📋 Background Jobs & Session Health

🩺 Session Health: ✅ healthy
   Last check: 30 seconds ago
   Consecutive warnings: 0/3

🔄 Running (1):
  [abc12345] import-issues (ADO)
     Progress: 2,500/10,000 (25%)
     ...
```

### Diagnostics File

The watchdog writes diagnostics to `.specweave/state/.watchdog-diagnostics.json`:

```json
{
  "timestamp": "2025-12-10T10:30:00Z",
  "severity": 0,
  "status": "healthy",
  "checks": {
    "lock": { "severity": 0, "message": "ok" },
    "zombies": { "count": 0, "message": "none" },
    "mcp": { "drops": 2, "message": "minor instability" },
    "orphanedJobs": { "count": 0, "message": "none" }
  },
  "consecutiveWarnings": 0,
  "thresholdSeconds": 300,
  "checkIntervalSeconds": 60
}
```

### View Detailed Diagnostics

```
/sw:jobs --diagnostics

🩺 Watchdog Diagnostics

Overall Status: ✅ healthy
Last Check: 2025-12-10 10:30:00
Severity Level: INFO (0)

Checks:
  📁 Lock File:      ✅ ok
  💀 Zombie Procs:   ✅ none (0)
  🔌 MCP Connection: ⚠️  2 drops detected (minor instability)
  📦 Orphaned Jobs:  ✅ none (0)

Alert Threshold: 3 consecutive warnings
Current Warnings: 0/3

Severity Levels:
  INFO (0)     - Everything healthy, no action needed
  WARNING (1)  - Minor issue detected, monitoring (NO notification)
  CRITICAL (2) - Real stuck condition detected → NOTIFICATION SENT

💡 The watchdog only sends notifications for CRITICAL issues
   that persist across 3+ consecutive checks (prevents false positives).
```

### Why You Got a Notification

If you received a notification but your job completed successfully, here's what happened:

1. **Old behavior (v1)**: Watchdog triggered on stale lock files even if no process was stuck
2. **New behavior (v2)**: Watchdog verifies actual process state before alerting

Common false positive causes (now fixed):
- Stale `.processor.lock` file from completed job
- Missing heartbeat file (never written in normal operation)
- MCP connection drops (warning only, not critical)

**The v2 watchdog now requires**:
1. **Actual stuck process** (zombie heredoc, hung worker)
2. **3 consecutive checks** showing the same issue
3. **CRITICAL severity** (not just warnings)

### Watchdog Log

View historical watchdog checks:

```bash
cat .specweave/logs/watchdog.log
```

---

## Notes

- Jobs persist across Claude sessions
- Paused jobs can be resumed later
- Completed jobs cleaned up after 10 entries
- Rate limiting auto-pauses and notifies
- Watchdog diagnostics available via `--diagnostics` flag
