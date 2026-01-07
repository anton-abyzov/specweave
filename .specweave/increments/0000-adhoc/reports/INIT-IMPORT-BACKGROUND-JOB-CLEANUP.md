# Init Import Background Job Cleanup

## Summary

Remove background job usage from `src/cli/helpers/init/external-import.ts` because:
- ✅ Imports are fast (<1 minute in practice)
- ✅ User confirmed: "we are OK to wait"
- ✅ Background jobs add unnecessary complexity for fast operations
- ✅ Background infrastructure IS still used by living-docs and repo cloning

## Changes Required

### 1. Line 35-36: Remove background job imports

**BEFORE:**
```typescript
import { getJobManager, launchImportJob, isJobRunning, getJobLog, detectOrphanedJobs, getActiveImportJob } from '../../../core/background/index.js';
import type { ImportJobConfig } from '../../../core/background/types.js';
```

**AFTER:**
```typescript
// NOTE: Background job imports removed - init imports run synchronously
// Background jobs still used by living-docs builder (see cli/commands/living-docs.ts)
```

### 2. Line 477-501: Remove orphaned job detection

**BEFORE:**
```typescript
  const strings = getExternalImportStrings(language);

  // P2 FIX: Detect and handle orphaned jobs...
  const orphanedJobs = detectOrphanedJobs(targetDir);
  if (orphanedJobs.length > 0) {
    // ... 10 lines of orphaned job handling
  }

  // P2 FIX: Check for active import job...
  const activeJob = getActiveImportJob(targetDir);
  if (activeJob) {
    // ... 10 lines of active job handling
  }
```

**AFTER:**
```typescript
  const strings = getExternalImportStrings(language);

  // NOTE: Background job detection removed - init imports always run synchronously
  // Background jobs are still used by living-docs builder and repo cloning
```

### 3. Line 858: Change useBackground default to false

**BEFORE:**
```typescript
  const useBackground = options.background !== false;
```

**AFTER:**
```typescript
  // Always run import synchronously during init (simple, fast, predictable)
  // Background jobs add unnecessary complexity for fast operations (<1 minute)
  // Background infrastructure is still used by living-docs and repo cloning
  const useBackground = false;
```

### 4. Line 1053: Change runImport default to false

**BEFORE:**
```typescript
  // Default to BACKGROUND mode - prevents terminal pollution with huge messages
  const { background = true, estimatedTotal = 100 } = options;
```

**AFTER:**
```typescript
  // Always run synchronously during init - imports are fast (<1 minute)
  const { background = false, estimatedTotal = 100 } = options;
```

### 5. Lines 1055-1093: Remove background mode spawn block

**DELETE ENTIRE BLOCK:**
```typescript
  // BACKGROUND MODE: Spawn detached worker process (DEFAULT)
  if (background) {
    console.log(chalk.cyan('\n   🚀 Starting background import job...'));
    console.log(chalk.gray('   Import will run in background - init continues immediately'));

    try {
      const result = await launchImportJob({
        type: 'import-issues',
        projectPath: targetDir,
        coordinatorConfig,
        estimatedTotal
      });

      if (result.isBackground) {
        const shortId = result.job.id.slice(0, 8);
        console.log(chalk.green(`\n   ✓ Background import started`));
        console.log(chalk.white(`   Job ID: ${shortId}`));
        console.log(chalk.gray(`   PID: ${result.pid}`));
        console.log('');
        console.log(chalk.blue('   📊 Monitor import progress:'));
        console.log(chalk.gray(`   → /sw:jobs                  Show job status`));
        console.log(chalk.gray(`   → /sw:jobs --follow ${shortId}  Follow live progress`));
        console.log(chalk.gray(`   → /sw:jobs --logs ${shortId}    View full logs`));
        console.log('');

        return {
          jobId: result.job.id,
          isBackground: true,
          pid: result.pid,
          message: `Background import started. Check progress with /sw:jobs`
        };
      }
      // Fallback to foreground if background launch failed
      console.log(chalk.yellow('   ⚠ Background mode unavailable, falling back to foreground'));
    } catch (error: any) {
      console.log(chalk.yellow(`   ⚠ Could not start background job: ${error.message}`));
      console.log(chalk.gray('   Falling back to foreground mode...'));
    }
  }
```

### 6. Lines 1099-1121: Remove job tracking initialization

**DELETE:**
```typescript
  // Create background job for tracking
  let jobManager: ReturnType<typeof getJobManager> | null = null;
  let jobId: string | null = null;

  try {
    jobManager = getJobManager(targetDir);
    const provider = coordinatorConfig.github ? 'github' :
                     coordinatorConfig.jira ? 'jira' :
                     coordinatorConfig.ado ? 'ado' : 'github';
    const jobConfig: ImportJobConfig = {
      type: 'import-issues',
      provider,
      repositories: coordinatorConfig.githubRepositories?.map(r => `${r.owner}/${r.repo}`),
      timeRangeMonths: coordinatorConfig.importConfig?.timeRangeMonths || 3,
      projectPath: targetDir
    };
    // Estimate total - will be updated when we know actual count
    const job = jobManager.createJob('import-issues', jobConfig, 100);
    jobId = job.id;
    jobManager.startJob(jobId);
  } catch {
    // Job tracking is optional
  }
```

**REPLACE WITH:**
```typescript
  // Synchronous mode - no job tracking needed for fast operations
```

### 7. Lines 1140-1144: Remove job progress update

**DELETE:**
```typescript
    // Update background job progress
    if (jobManager && jobId && info.current !== undefined) {
      const itemId = info.sourceRepo || info.platform;
      jobManager.updateProgress(jobId, info.current, itemId);
    }
```

### 8. Lines 1156-1159: Remove job pause on rate limit

**DELETE:**
```typescript
    // Pause background job
    if (jobManager && jobId) {
      jobManager.pauseJob(jobId);
    }
```

### 9. Lines 1168-1170: Remove job completion

**DELETE:**
```typescript
    // Complete background job
    if (jobManager && jobId) {
      jobManager.completeJob(jobId);
    }
```

### 10. Lines 1258-1261: Remove job failure tracking

**DELETE:**
```typescript
    // Mark background job as failed
    if (jobManager && jobId) {
      jobManager.completeJob(jobId, errorMsg);
    }
```

## Testing

After applying changes:

```bash
# Test 1: Small import (should complete in <30 seconds)
specweave init test-project
# Select: Import from GitHub, 1 month
# Expected: Runs synchronously, shows progress spinner

# Test 2: Medium import (should complete in ~1 minute)
specweave init test-project
# Select: Import from GitHub, 3 months
# Expected: Runs synchronously, shows progress spinner

# Verify no background job created:
specweave jobs
# Expected: No import jobs listed
```

## Verification

After changes, confirm:
- ✅ Import runs synchronously (blocking) during init
- ✅ No `/sw:jobs` entries created for init imports
- ✅ Progress shown via spinner (not background job)
- ✅ Living docs builder still uses background jobs
- ✅ Repo cloning still uses background jobs

## Why NOT Delete Background Infrastructure

Background jobs are **actively used** by:
1. **Living Docs Builder** (`/sw:living-docs`) - long-running codebase analysis
2. **Repository Cloning** (init multi-repo) - cloning multiple repos
3. **`/sw:jobs` command** - user-facing job management

Only init **import** should be synchronous. Everything else stays the same.
