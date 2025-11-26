---
name: specweave:jobs
description: Monitor background jobs (repo cloning, issue import). Shows progress, allows pause/resume.
usage: /specweave:jobs [--active|--all|--id <job-id>] [--resume <job-id>]
---

# Background Jobs Monitor

**Usage**: `/specweave:jobs [options]`

---

## Purpose

Monitor and manage long-running background operations:
- **Repository cloning** (multi-repo/umbrella setup)
- **Issue import** (10K+ items from GitHub/JIRA/ADO)
- **External sync** operations

---

## Check Job Status

Read the background jobs state file and display status:

```bash
# Find and read the state file
STATE_FILE=".specweave/state/background-jobs.json"
```

### Display Format

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

💡 Commands:
   /specweave:jobs --id abc12345  → Details for specific job
   /specweave:jobs --resume def67890  → Resume paused job
   /specweave:jobs --all  → Show all jobs (including old)
```

---

## Actions

### View Specific Job Details

```
/specweave:jobs --id abc12345

📦 Job Details: abc12345

Type: clone-repos
Status: running
Started: 2024-01-15 10:30:00
Updated: 2024-01-15 10:32:15

Progress: 2/4 (50%)
Current: sw-meeting-cost-be
Rate: 0.5 repos/sec
ETA: ~4 seconds

Completed:
  ✅ sw-meeting-cost-fe
  ✅ sw-meeting-cost-shared

Remaining:
  ⏳ sw-meeting-cost-be
  ⏳ sw-meeting-cost

Config:
  Project: /path/to/project
  Repos: 4 total
```

### Resume Paused Job

When a job is paused (rate limited, user requested), resume it:

```
/specweave:jobs --resume def67890

🔄 Resuming job def67890...
   Type: import-issues
   Provider: GitHub
   Resuming from: item 1,234 of 10,000

⏳ Import in progress...
   [1,234/10,000] 12% → PROJ-1234
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
