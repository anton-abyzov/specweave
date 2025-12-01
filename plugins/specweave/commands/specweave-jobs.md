---
name: specweave:jobs
description: Monitor background jobs (repo cloning, issue import). Shows progress, allows pause/resume/kill.
usage: /specweave:jobs [--active|--all|--id <job-id>] [--resume <job-id>] [--kill <job-id>] [--follow <job-id>] [--logs <job-id>]
---

# Background Jobs Monitor

**Usage**: `/specweave:jobs [options]`

---

## Purpose

Monitor and manage long-running background operations:
- **Repository cloning** (multi-repo/umbrella setup)
- **Issue import** (10K+ items from GitHub/JIRA/ADO)
- **External sync** operations

**ASYNC ARCHITECTURE (2025-12-01)**:
- Jobs run as **detached processes** that survive terminal close
- Progress tracked via filesystem (`.specweave/state/jobs/`)
- Can check status anytime with `/specweave:jobs`

---

## Command Options

| Option | Description |
|--------|-------------|
| (none) | Show active jobs |
| `--all` | Show all jobs (including completed) |
| `--id <jobId>` | Show details for specific job |
| `--follow <jobId>` | Follow job progress in real-time |
| `--logs <jobId>` | Show worker log output |
| `--resume <jobId>` | Resume paused job |
| `--kill <jobId>` | Kill running background job |

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
📋 Background Jobs

🔄 Running (1):
  [abc12345] import-issues (ADO)
     Progress: 2,500/10,000 (25%)
     Rate: 15.2/s | ETA: ~8m 14s
     PID: 45678 | Started: 2 mins ago

⏸️  Paused (1):
  [def67890] import-issues (GitHub)
     Progress: 1,234/10,000 (12%)
     Reason: Rate limited (resumes in 45s)
     Resume: /specweave:jobs --resume def67890

✅ Completed (2):
  [ghi11111] import-issues - 4,500 items - 5 mins ago
  [jkl22222] clone-repos - 4/4 repos - 1 hour ago

💡 Commands:
   /specweave:jobs --id abc12345     → Details for specific job
   /specweave:jobs --follow abc12345 → Follow progress live
   /specweave:jobs --logs abc12345   → View worker logs
   /specweave:jobs --resume def67890 → Resume paused job
   /specweave:jobs --kill abc12345   → Kill running job
   /specweave:jobs --all             → Show all jobs (including old)
```

---

## Actions

### View Specific Job Details

```
/specweave:jobs --id abc12345

📦 Job Details: abc12345

Type: import-issues
Status: running
Provider: ADO
PID: 45678

Started: 2024-01-15 10:30:00
Updated: 2024-01-15 10:32:15

Progress: 2,500/10,000 (25%)
Current: OlySense\Core-Operations
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
/specweave:jobs --follow abc12345

📦 Following job abc12345 (Ctrl+C to stop)

[10:30:15] Progress: 2,500/10,000 (25%) - OlySense\Core-Operations
[10:30:16] Progress: 2,520/10,000 (25%) - OlySense\Core-Operations
[10:30:17] Progress: 2,545/10,000 (25%) - OlySense\AI-Platform
[10:30:18] Progress: 2,570/10,000 (26%) - OlySense\AI-Platform
...
```

**Implementation**: Read `.specweave/state/jobs/<jobId>/worker.log` with tail-like behavior, or poll the job state file every second.

### View Worker Logs

Show detailed worker output:

```
/specweave:jobs --logs abc12345

📋 Worker Logs for abc12345 (last 50 lines):

[2024-01-15T10:30:00.123Z] Worker started for job abc12345
[2024-01-15T10:30:00.456Z] Project path: /Users/dev/my-project
[2024-01-15T10:30:00.789Z] PID: 45678
[2024-01-15T10:30:01.234Z] Dependencies loaded, starting import...
[2024-01-15T10:30:02.567Z] Progress: 100/10000 - ado OlySense\Core-Operations
[2024-01-15T10:30:03.890Z] Progress: 200/10000 - ado OlySense\Core-Operations
...
```

**Implementation**: Read `.specweave/state/jobs/<jobId>/worker.log`

### Kill Running Job

Stop a background job:

```
/specweave:jobs --kill abc12345

⚠️  Killing job abc12345...
   Type: import-issues
   PID: 45678
   Progress: 2,500/10,000 (25%)

✅ Job killed. Status changed to 'paused'.
   Resume later: /specweave:jobs --resume abc12345
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
/specweave:jobs --resume def67890

🔄 Resuming job def67890...
   Type: import-issues
   Provider: GitHub
   Resuming from: item 1,234 of 10,000

⏳ Spawning background worker...
   New PID: 45679

✅ Job resumed in background.
   Check progress: /specweave:jobs --follow def67890
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
2. Parse job entries
3. Display formatted status
4. For --resume, update job status and continue operation

### State File Location

```
.specweave/state/background-jobs.json
```

### Job Types

| Type | Description | Typical Duration |
|------|-------------|------------------|
| `clone-repos` | Multi-repo cloning | 1-5 mins |
| `import-issues` | Issue import from external | 5-60 mins |
| `sync-external` | Bidirectional sync | 1-10 mins |

---

## Integration Points

- Called after `specweave init` with background clone
- Called after `/specweave:import-external` starts background import
- Called after `/specweave-github:sync` for large syncs
- Called after `/specweave-jira:sync` for large syncs

---

## Error Handling

If job failed:
```
❌ Failed (1):
  [xyz99999] import-issues
     Error: Rate limit exceeded (retry after 60s)
     Failed at: item 5,000 of 10,000
     Resume: /specweave:jobs --resume xyz99999
```

---

## Notes

- Jobs persist across Claude sessions
- Paused jobs can be resumed later
- Completed jobs cleaned up after 10 entries
- Rate limiting auto-pauses and notifies
