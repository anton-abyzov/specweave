# Background Jobs

Monitor and manage long-running operations in SpecWeave.

## When Are Background Jobs Used?

1. **Multi-repo cloning** - Setting up umbrella projects with 4+ repositories
2. **Large issue imports** - Importing 1000+ items from GitHub/JIRA/ADO
3. **External sync** - Bidirectional sync with large datasets

## Checking Job Status

```bash
/specweave:jobs
```

### Output Example

```
📋 Background Jobs

🔄 Running (1):
  [abc12345] clone-repos
     Progress: 2/4 (50%) → sw-meeting-cost-be
     Rate: 0.5/s | ETA: ~4s
     Started: 2 mins ago

⏸️  Paused (1):
  [def67890] import-issues (GitHub)
     Progress: 1,234/10,000 (12%)
     Reason: Rate limited
     Resume: /specweave:jobs --resume def67890

✅ Completed (2):
  [ghi11111] clone-repos - 4/4 repos - 5 mins ago
  [jkl22222] import-issues - 500 items - 1 hour ago
```

## Commands

| Command | Description |
|---------|-------------|
| `/specweave:jobs` | Show all active jobs |
| `/specweave:jobs --all` | Show all jobs (including completed) |
| `/specweave:jobs --id <id>` | Detailed view of specific job |
| `/specweave:jobs --resume <id>` | Resume a paused job |

## Job Types

### clone-repos
Multi-repository cloning during `specweave init`:
- Clones repositories from GitHub
- Creates project structure
- Typical duration: 1-5 minutes

### import-issues
Importing work items from external tools:
- GitHub Issues
- JIRA Epics/Stories
- Azure DevOps Work Items
- Typical duration: 5-60 minutes (depends on volume)

### sync-external
Bidirectional sync operations:
- Progress sync to external tools
- Status updates
- Typical duration: 1-10 minutes

## Handling Rate Limits

When GitHub/JIRA/ADO rate limits are hit:

1. Job automatically pauses
2. You see the job in "Paused" status
3. Wait for rate limit to reset (usually 1-15 minutes)
4. Resume: `/specweave:jobs --resume <job-id>`

## State Persistence

Jobs persist across Claude sessions. If you close Claude and come back:

```bash
/specweave:jobs
```

Will show the current state of all jobs, including:
- Running jobs (if still in progress)
- Paused jobs (can be resumed)
- Recently completed jobs

## Troubleshooting

### Job stuck in "running"?
The job may have been interrupted. Check:
```bash
/specweave:jobs --id <job-id>
```

### Can't resume a job?
Some jobs can't be resumed if the session context was lost. Start a new import:
```bash
/specweave:import-external
```

### Too many old jobs?
Jobs auto-cleanup keeps only the last 10 completed jobs.
