# Background Jobs Architecture

## Overview

Long-running operations (repo cloning, 10K+ issue imports) can run in background while users continue working. Progress persists across sessions.

## Components

### 1. Job Manager (`src/core/background/job-manager.ts`)

State management for background jobs:
- Create, start, pause, resume, complete jobs
- Progress tracking with rate/ETA calculation
- Persistent state in `.specweave/state/background-jobs.json`

### 2. Job Types (`src/core/background/types.ts`)

```typescript
type JobType = 'clone-repos' | 'import-issues' | 'sync-external';
type JobStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed';
```

### 3. Slash Command (`/specweave:jobs`)

Monitor and manage jobs:
- `--active` - Show running/paused jobs
- `--id <id>` - Details for specific job
- `--resume <id>` - Resume paused job

## State File

Location: `.specweave/state/background-jobs.json`

```json
{
  "jobs": [
    {
      "id": "abc12345",
      "type": "clone-repos",
      "status": "running",
      "progress": {
        "current": 2,
        "total": 4,
        "percentage": 50,
        "currentItem": "sw-meeting-cost-be",
        "itemsCompleted": ["sw-meeting-cost-fe", "sw-meeting-cost-shared"],
        "itemsFailed": [],
        "rate": 0.5,
        "eta": 4
      },
      "startedAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:32:15Z",
      "config": {
        "type": "clone-repos",
        "repositories": [...],
        "projectPath": "/path/to/project"
      }
    }
  ]
}
```

## Integration Points

### Repo Cloning (init flow)

```typescript
import { getJobManager } from '../core/background/index.js';

const manager = getJobManager(projectPath);
const job = manager.createJob('clone-repos', config, repos.length);
manager.startJob(job.id);

for (const repo of repos) {
  await cloneRepo(repo);
  manager.updateProgress(job.id, ++count, repo.name, repo.name);
}

manager.completeJob(job.id);
```

### Issue Import

```typescript
const job = manager.createJob('import-issues', {
  type: 'import-issues',
  provider: 'github',
  repositories: ['owner/repo1', 'owner/repo2'],
  timeRangeMonths: 3,
  projectPath
}, totalItems);

// During import
manager.updateProgress(job.id, current, itemId);

// On rate limit
manager.pauseJob(job.id);
```

## Rate Limiting

When GitHub/JIRA/ADO rate limits hit:
1. Job auto-pauses with status `paused`
2. Error stored: "Rate limit exceeded (retry after Xs)"
3. User notified via `/specweave:jobs`
4. Resume with `/specweave:jobs --resume <id>`

## Cleanup

Old completed jobs auto-cleaned (keeps last 10):
```typescript
manager.cleanup();
```

## Future Enhancements

1. **Webhook notifications** - Notify on job completion
2. **Parallel jobs** - Run multiple imports simultaneously
3. **Priority queue** - High-priority jobs first
4. **Job dependencies** - Job B waits for Job A
