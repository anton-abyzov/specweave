---
sidebar_position: 15
---

# /specweave:jobs - Background Jobs Monitor

Monitor and manage long-running background operations.

## Usage

```bash
/specweave:jobs [options]
```

## Options

| Option | Description |
|--------|-------------|
| (none) | Show active jobs (running, paused, pending) |
| `--all` | Include completed jobs (last 10) |
| `--id <jobId>` | Show detailed info for specific job |
| `--follow <jobId>` | Follow progress in real-time (1s polling) |
| `--logs <jobId>` | View worker output log (last 50 lines) |
| `--kill <jobId>` | Kill running job (marks as paused) |
| `--resume <jobId>` | Resume paused job from checkpoint |

## Output Format

### Active Jobs View

```
Background Jobs Status

Running (1):

| Job ID   | Type        | Progress      | Current Item              | Rate  | ETA     |
|----------|-------------|---------------|---------------------------|-------|---------|
| ae362dfe | clone-repos | 154/245 (63%) | infrastructure-apo-platform | 0.1/s | ~15 min |

Started: ~23 min ago
Cloned: 154 repositories (up from 138)
Failed: 1 repo (infrastructure-adp)

Completed (1):

| Job ID   | Type          | Items | Completed     |
|----------|---------------|-------|---------------|
| def67890 | import-issues | 4,500 | 5 mins ago    |
```

### Paused Jobs

```
Paused (1):
  [ghi11111] import-issues (GitHub)
     Progress: 1,234/10,000 (12%)
     Reason: Rate limited (resumes in 45s)
     Resume: /specweave:jobs --resume ghi11111
```

### Failed Jobs

```
Failed (1):
  [jkl22222] import-issues
     Error: Authentication failed - token expired
     Failed at: item 5,000 of 10,000
     Retry: Update token, then /specweave:jobs --resume jkl22222
```

## Examples

### Check All Active Jobs

```bash
/specweave:jobs
```

Returns grouped view of all running, paused, and pending jobs.

### View Specific Job Details

```bash
/specweave:jobs --id ae362dfe
```

Output:
```
Job Details: ae362dfe

Type: clone-repos
Status: running
PID: 45678 (alive)

Started: 2024-01-15 10:30:00
Updated: 2024-01-15 10:53:15 (30s ago)

Progress: 154/245 (63%)
Current: infrastructure-apo-platform
Rate: 0.1 items/sec
ETA: ~15 minutes

Completed: 154 repositories
Failed: 1 (infrastructure-adp)

Files:
  Config: .specweave/state/jobs/ae362dfe/config.json
  Logs: .specweave/state/jobs/ae362dfe/worker.log
  PID: .specweave/state/jobs/ae362dfe/worker.pid
```

### Follow Progress Live

```bash
/specweave:jobs --follow ae362dfe
```

Output (updates every second):
```
Following job ae362dfe (Ctrl+C to stop)

[10:53:15] Progress: 154/245 (63%) → infrastructure-apo-platform
[10:53:25] Progress: 155/245 (63%) → infrastructure-apo-platform
[10:53:35] Progress: 156/245 (64%) → data-processing-core
[10:53:45] Progress: 157/245 (64%) → data-processing-core
```

### View Worker Logs

```bash
/specweave:jobs --logs ae362dfe
```

Output:
```
Worker Logs for ae362dfe (last 50 lines):

[2024-01-15T10:30:00.123Z] Worker started for job ae362dfe
[2024-01-15T10:30:00.456Z] Project path: /Users/dev/my-project
[2024-01-15T10:30:00.789Z] PID: 45678
[2024-01-15T10:30:01.234Z] Starting clone operations...
[2024-01-15T10:30:02.567Z] Cloned: frontend-web (1/245)
[2024-01-15T10:30:12.890Z] Cloned: backend-api (2/245)
[2024-01-15T10:30:22.123Z] FAILED: infrastructure-adp - Permission denied
[2024-01-15T10:30:32.456Z] Cloned: shared-utils (4/245)
...
```

### Kill Running Job

```bash
/specweave:jobs --kill ae362dfe
```

Output:
```
Killing job ae362dfe...

Type: clone-repos
PID: 45678
Progress: 154/245 (63%)

Job killed. Status changed to 'paused'.
Resume later: /specweave:jobs --resume ae362dfe
```

### Resume Paused Job

```bash
/specweave:jobs --resume ae362dfe
```

Output:
```
Resuming job ae362dfe...

Type: clone-repos
Resuming from: item 155 of 245

Spawning background worker...
New PID: 45679

Job resumed in background.
Check progress: /specweave:jobs --follow ae362dfe
```

### Show All Jobs Including Completed

```bash
/specweave:jobs --all
```

Includes the last 10 completed jobs in the output.

## Job Types

| Type | Trigger | Duration |
|------|---------|----------|
| `clone-repos` | `specweave init` with repos | 5-30 min |
| `import-issues` | `/specweave:import-external` | 10-60 min |
| `sync-external` | `/specweave-*:sync` | 1-10 min |

## Integration Points

Jobs are automatically created by:

1. **Repository Cloning**
   - `specweave init` with multi-repo/umbrella setup
   - `/specweave-ado:clone-repos`

2. **Issue Import**
   - `specweave init` + import flow (>50 items)
   - `/specweave:import-external`

3. **External Sync**
   - `/specweave-github:sync` for large syncs
   - `/specweave-jira:sync` for large syncs
   - `/specweave-ado:sync` for large syncs

## Rate Limit Handling

When GitHub/JIRA/ADO rate limits are hit:

1. Worker detects rate limit response (429 / X-RateLimit-Remaining)
2. Job auto-transitions to `paused` status
3. Worker exits gracefully, saving checkpoint
4. Notification shown: "Rate limited, wait N minutes"
5. User resumes: `/specweave:jobs --resume <id>`

**Typical rate limit windows**:
- GitHub: 15-60 minutes
- JIRA: 5-15 minutes
- Azure DevOps: 5-30 minutes

## State Files

Jobs persist to filesystem for session independence:

```
.specweave/state/
├── background-jobs.json      ← Master job list
└── jobs/
    └── <jobId>/
        ├── config.json       ← Job configuration
        ├── worker.pid        ← Process ID (while running)
        ├── worker.log        ← Worker output
        └── result.json       ← Final results
```

### Reading State Directly

For debugging, you can read state files:

```bash
# Job metadata
cat .specweave/state/background-jobs.json | jq .

# Specific job config
cat .specweave/state/jobs/ae362dfe/config.json | jq .

# Worker log
tail -50 .specweave/state/jobs/ae362dfe/worker.log

# Check if worker is running
cat .specweave/state/jobs/ae362dfe/worker.pid
ps aux | grep <pid>
```

## Troubleshooting

### Job shows "running" but no progress

Worker may have crashed:

```bash
/specweave:jobs --id <id>
```

If PID shows "dead", resume:

```bash
/specweave:jobs --resume <id>
```

### Can't resume - "config not found"

Config file may be corrupted. Start fresh:

```bash
/specweave:import-external    # For imports
/specweave-ado:clone-repos    # For cloning
```

### Too many completed jobs

Auto-cleanup keeps last 10. Manual cleanup:

```bash
rm -rf .specweave/state/jobs/<old-job-id>
```

### Worker not starting

Check worker script exists:

```bash
ls dist/src/cli/workers/
```

If missing, rebuild:

```bash
npm run rebuild
```

## Tips

1. **Check jobs after init** - Always run `/specweave:jobs` after `specweave init` with large imports

2. **Don't close Claude immediately** - Give workers 10-30s to fully detach

3. **Resume promptly** - Don't let rate-limited jobs wait too long

4. **Use --follow for visibility** - Real-time progress is reassuring for long operations

## Related Commands

- `/specweave:import-external` - Import issues from external tools
- `/specweave-ado:clone-repos` - Clone Azure DevOps repositories
- `/specweave-github:sync` - Sync with GitHub
- `/specweave-jira:sync` - Sync with JIRA
- `/specweave-ado:sync` - Sync with Azure DevOps

## Related Documentation

- [Background Jobs Concepts](/docs/guides/core-concepts/background-jobs) - Architecture deep-dive
- [ADO Multi-Project Migration](/docs/guides/ado-multi-project-migration) - Enterprise setup
