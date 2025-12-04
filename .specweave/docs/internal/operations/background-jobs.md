# Background Jobs

Monitor and manage long-running operations in SpecWeave.

## Overview

The Background Jobs System enables long-running operations (repo cloning, issue imports) to **continue even after closing Claude**. This is critical for enterprise workflows with hundreds of repositories and thousands of work items.

## Quick Reference

```bash
/specweave:jobs                    # Show active jobs
/specweave:jobs --all              # Include completed jobs
/specweave:jobs --id <id>          # Job details
/specweave:jobs --follow <id>      # Live progress
/specweave:jobs --logs <id>        # Worker logs
/specweave:jobs --kill <id>        # Stop job
/specweave:jobs --resume <id>      # Resume paused job
```

## When Are Background Jobs Used?

| Scenario | Trigger | Duration |
|----------|---------|----------|
| Multi-repo cloning | `specweave init` with 4+ repos | 5-30 min |
| Large issue imports | 1000+ items from GitHub/JIRA/ADO | 10-60 min |
| External sync | Large bidirectional sync | 1-10 min |

## Output Example

```
Background Jobs Status

Running (1):

| Job ID   | Type        | Progress      | Current Item                | Rate  | ETA     |
|----------|-------------|---------------|-----------------------------|-------|---------|
| ae362dfe | clone-repos | 154/245 (63%) | infrastructure-apo-platform | 0.1/s | ~15 min |

Started: ~23 min ago
Cloned: 154 repositories (up from 138)
Failed: 1 repo (infrastructure-adp)

Paused (1):
  [def67890] import-issues (GitHub)
     Progress: 1,234/10,000 (12%)
     Reason: Rate limited
     Resume: /specweave:jobs --resume def67890

Completed (2):
  [ghi11111] clone-repos - 4/4 repos - 5 mins ago
  [jkl22222] import-issues - 500 items - 1 hour ago
```

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Claude Session                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ /specweave: │───▶│ JobManager  │───▶│ JobLauncher │     │
│  │ jobs        │    │ (State)     │    │ (Spawner)   │     │
│  └─────────────┘    └─────────────┘    └──────┬──────┘     │
└──────────────────────────────────────────────│─────────────┘
                                               │ spawn detached
                                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   Detached Worker Process                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  clone-worker.js / import-worker.js                 │   │
│  │  - Runs independently of Claude session             │   │
│  │  - Writes progress to filesystem                    │   │
│  │  - Handles rate limits (auto-pause)                 │   │
│  │  - Survives terminal close                          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Core Files

| File | Purpose | Lines |
|------|---------|-------|
| `src/core/background/job-manager.ts` | State management (singleton) | ~230 |
| `src/core/background/job-launcher.ts` | Process spawning | ~385 |
| `src/core/background/types.ts` | Type definitions | ~80 |
| `src/cli/commands/jobs.ts` | CLI command | ~515 |
| `src/cli/workers/clone-worker.ts` | Clone executor | ~250 |
| `src/cli/workers/import-worker.ts` | Import executor | ~340 |

### State Persistence

Jobs persist to filesystem for session independence:

```
.specweave/state/
├── background-jobs.json      ← Master job list (all metadata)
└── jobs/
    └── <jobId>/
        ├── config.json       ← Job configuration
        ├── worker.pid        ← Process ID (ephemeral, while running)
        ├── worker.log        ← Timestamped worker output
        └── result.json       ← Final results (on completion)
```

### Job State Schema

```json
{
  "jobs": [{
    "id": "abc12345",
    "type": "clone-repos",
    "status": "running",
    "progress": {
      "current": 154,
      "total": 245,
      "percentage": 63,
      "currentItem": "infrastructure-apo-platform",
      "itemsCompleted": ["repo-1", "repo-2"],
      "itemsFailed": ["infrastructure-adp"],
      "rate": 0.1,
      "eta": 900
    },
    "startedAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:53:15Z",
    "config": { /* job-specific */ }
  }]
}
```

## Job Types

### clone-repos

Clones multiple repositories from GitHub, GitLab, or Azure DevOps.

**Triggered by**: `specweave init` with umbrella/multi-repo setup, `/specweave-ado:clone-repos`

**Features**:
- Skips already-cloned repos (checks `.git` folder)
- 500ms delay between clones (rate limiting)
- Sanitizes PAT tokens from error logs
- Graceful SIGTERM/SIGINT handling

**Config**:
```json
{
  "repositories": [
    { "owner": "org", "name": "repo", "cloneUrl": "https://..." }
  ],
  "projectPath": "/path/to/project"
}
```

### import-issues

Imports work items from external tools.

**Triggered by**: `specweave init` import flow, `/specweave:import-external`

**Features**:
- Dynamic imports (reduces startup overhead)
- Container-aware grouping (by JIRA project, ADO area path)
- Converts items to SpecWeave UserStory format
- Rate limit auto-pause

**Config**:
```json
{
  "provider": "ado",
  "repositories": ["org/project"],
  "timeRangeMonths": 6,
  "projectPath": "/path/to/project"
}
```

### sync-external

Bidirectional synchronization with external tools.

**Triggered by**: `/specweave-github:sync`, `/specweave-jira:sync`, `/specweave-ado:sync`

**Config**:
```json
{
  "provider": "github",
  "direction": "bidirectional",
  "profileId": "profile-1",
  "projectPath": "/path/to/project"
}
```

## Job Lifecycle

```
CREATE → PENDING → RUNNING → [PAUSED] → COMPLETED/FAILED
                      ↓
                 rate limit / kill
                      ↓
                   PAUSED
                      ↓
                   RESUME
                      ↓
                  RUNNING
```

| Status | Meaning |
|--------|---------|
| `pending` | Created, not started |
| `running` | Worker actively processing |
| `paused` | Stopped mid-progress (rate limit or killed) |
| `completed` | Successfully finished |
| `failed` | Error prevented completion |

## Implementation Details

### Detached Process Spawning

Workers run independently of Claude:

```typescript
const child = spawn('node', [workerPath, jobId, projectPath], {
  detached: true,     // Run independently
  stdio: 'ignore'     // Don't tie to parent stdio
});
child.unref();        // Allow parent to exit
```

### Progress Updates

Workers update progress atomically:

```typescript
// In worker
jobManager.updateProgress(
  jobId,
  currentIndex,      // Current position
  currentItem,       // Current item name
  completedItem,     // Item just completed (optional)
  failedItem         // Item that failed (optional)
);

// Rate/ETA calculated:
rate = current / elapsedSeconds;
eta = (total - current) / rate;
```

### Rate Limit Handling

1. Worker detects rate limit (429 response)
2. Calls `jobManager.pauseJob(jobId)`
3. Exits gracefully with checkpoint
4. User resumes later: `/specweave:jobs --resume <id>`

### Process Health Check

```typescript
function isJobRunning(projectPath: string, jobId: string): boolean {
  const pidFile = path.join(stateDir, 'jobs', jobId, 'worker.pid');
  const pid = parseInt(fs.readFileSync(pidFile, 'utf8'));
  try {
    process.kill(pid, 0); // Signal 0 = check if alive
    return true;
  } catch {
    return false;
  }
}
```

## API Reference

### JobManager

```typescript
import { getJobManager } from './core/background/job-manager.js';

const manager = getJobManager(projectPath);

// Create
const job = manager.createJob('clone-repos', config, totalItems);

// Lifecycle
manager.startJob(jobId);
manager.pauseJob(jobId);
manager.completeJob(jobId, error?);

// Progress
manager.updateProgress(jobId, current, currentItem?, completed?, failed?);

// Query
manager.getJob(jobId);
manager.getJobs({ status: 'running' });
manager.getActiveJobs();

// Cleanup
manager.cleanup(); // Keeps last 10 completed
```

### JobLauncher

```typescript
import {
  launchCloneJob,
  launchImportJob,
  isJobRunning,
  killJob,
  getJobLog,
  getJobResult
} from './core/background/job-launcher.js';

// Launch clone
const result = await launchCloneJob({
  projectPath,
  repositories: [{ owner, name, cloneUrl }],
  estimatedTotal: repos.length
});

// Launch import
const result = await launchImportJob({
  type: 'import-issues',
  projectPath,
  coordinatorConfig,
  estimatedTotal: 10000,
  foreground: false
});

// Utilities
isJobRunning(projectPath, jobId);
killJob(projectPath, jobId);
getJobLog(projectPath, jobId, tailLines?);
getJobResult(projectPath, jobId);
```

## Troubleshooting

### Job stuck in "running"?

Worker may have crashed. Check:
```bash
/specweave:jobs --id <id>
```

If PID shows "dead", resume:
```bash
/specweave:jobs --resume <id>
```

### Can't resume - "config not found"?

Start fresh operation:
```bash
/specweave:import-external    # For imports
/specweave-ado:clone-repos    # For cloning
```

### Rate limited?

Wait for reset (15-60 min), then:
```bash
/specweave:jobs --resume <id>
```

### Worker not starting?

Check worker scripts exist:
```bash
ls dist/src/cli/workers/
```

Rebuild if missing:
```bash
npm run rebuild
```

### Debug worker directly

```bash
# Read state
cat .specweave/state/background-jobs.json | jq .

# Check if process alive
cat .specweave/state/jobs/<id>/worker.pid
ps aux | grep <pid>

# View logs
tail -f .specweave/state/jobs/<id>/worker.log
```

## Design Decisions

### Why Filesystem-Based?

1. **No database required** - Works in any environment
2. **Survives crashes** - Atomic JSON writes
3. **Session independence** - Workers don't need Claude
4. **Simple debugging** - Just read JSON files
5. **No IPC complexity** - Workers write, CLI reads

### Why Detached Processes?

1. **Terminal independence** - Continue when Claude closes
2. **No signal propagation** - Parent exit doesn't kill worker
3. **Cleaner lifecycle** - Worker manages own cleanup

### Why Checkpoint-Based Resume?

1. **Crash recovery** - Resume from last good state
2. **Rate limit handling** - Pause/resume at exact position
3. **Predictable behavior** - Same result after resume

## Testing

```bash
# Integration tests
npm test -- tests/integration/core/background-job-manager.test.ts

# Unit tests
npm test -- tests/unit/core/background/job-launcher.test.ts
```

Coverage includes:
- Job lifecycle (create, start, pause, complete)
- Progress tracking with rate/ETA
- State persistence across sessions
- Process health detection
- Log retrieval and cleanup

## Related Documentation

- [Public: Commands Reference](/docs/commands/jobs)
- [Public: Core Concepts](/docs/guides/core-concepts/background-jobs)
- [Internal: ADR-0065 Background Jobs](/.specweave/increments/_archive/0065-background-jobs/spec.md)
