# ADR-0053: Progress Tracking and Cancelation Handling

**Date**: 2025-11-21
**Status**: Accepted

## Context

Bulk operations in SpecWeave (importing 100+ projects, pre-loading dependencies) take significant time (1-5 minutes) but provide no user feedback:

**Current Behavior**:
- User runs bulk import command
- Terminal shows spinner: "Importing projects..."
- No progress indication (0/127? 50/127? 90/127?)
- No time estimate (30 seconds left? 2 minutes?)
- Ctrl+C exits abruptly (loses all progress, must restart)
- Errors buried in logs (user doesn't see failures)

**User Pain Points**:
1. **Anxiety**: "Is it stuck? How long will this take?"
2. **Lost Progress**: Ctrl+C loses all work (must start over)
3. **Hidden Failures**: Some projects fail silently (user doesn't notice)
4. **No Control**: Can't cancel safely, can't resume interrupted operations

**Comparison with Modern CLI Tools**:
- **npm install**: Progress bar, package count, download speed
- **git clone --progress**: Transfer progress, objects received
- **docker pull**: Layer-by-layer progress, size/speed
- **SpecWeave (current)**: Spinner only, no information

## Decision

Implement comprehensive progress tracking with graceful cancelation:

### 1. Real-Time Progress Bar

**Visual Format**:
```
Importing projects... 47/127 (37%) [=============>          ] [47s elapsed, ~2m remaining]
✅ BACKEND (completed)
✅ FRONTEND (completed)
⏳ MOBILE (loading dependencies...)
```

**Components**:
- **Counter**: `47/127` - Absolute progress
- **Percentage**: `(37%)` - Relative progress
- **ASCII Bar**: `[=============>          ]` - Visual indicator
- **Time**: `[47s elapsed, ~2m remaining]` - Time tracking
- **Status**: `✅/⏳/❌` - Per-item status

**Update Frequency**:
- Update every 5 projects (avoid UI spam)
- Configurable: `--progress-interval 10`
- Always update on errors (immediate feedback)

### 2. Progress Tracker API

```typescript
export interface ProgressOptions {
  total: number;            // Total items to process
  label?: string;           // "Importing projects", "Pre-loading dependencies"
  showEta?: boolean;        // Show estimated time remaining (default: true)
  updateInterval?: number;  // Update every N items (default: 5)
}

export class ProgressTracker {
  private total: number;
  private current: number = 0;
  private startTime: number;
  private succeeded: string[] = [];
  private failed: string[] = [];
  private skipped: string[] = [];

  constructor(options: ProgressOptions);

  /**
   * Update progress (call after each item)
   */
  update(item: string, status: 'success' | 'error' | 'skipped'): void;

  /**
   * Render progress bar (called by update)
   */
  private renderProgressBar(percentage: number): string;

  /**
   * Calculate ETA (linear extrapolation)
   */
  private getEta(): string;

  /**
   * Show final summary
   */
  finish(): void;
}
```

**Usage Example**:
```typescript
const tracker = new ProgressTracker({
  total: 127,
  label: 'Importing projects',
  showEta: true
});

for (const project of projects) {
  try {
    await importProject(project);
    tracker.update(project.key, 'success');
  } catch (error) {
    tracker.update(project.key, 'error');
  }
}

tracker.finish();
// Output:
// ✅ Import Complete!
//    Succeeded: 120
//    Failed: 5
//    Skipped: 2
//    Total time: 2m 34s
```

### 3. Graceful Cancelation (Ctrl+C Handling)

**Problem**: Ctrl+C abruptly exits, loses all progress

**Solution**: Intercept SIGINT, save state, exit gracefully

**Implementation**:
```typescript
export class CancelationHandler {
  private isCanceled: boolean = false;
  private saveState: (state: any) => Promise<void>;

  constructor(saveState: (state: any) => Promise<void>) {
    this.saveState = saveState;

    // Register Ctrl+C handler
    process.on('SIGINT', async () => {
      if (this.isCanceled) {
        process.exit(1);  // Force exit on second Ctrl+C
      }

      this.isCanceled = true;
      console.log('\n\n⏸️  Cancelation requested...');
      console.log('   Saving progress (press Ctrl+C again to force exit)\n');

      await this.handleCancelation();
    });
  }

  shouldCancel(): boolean {
    return this.isCanceled;
  }

  private async handleCancelation(): Promise<void> {
    await this.saveState({ canceled: true });
    console.log('✅ Progress saved. Run with --resume to continue.\n');
    process.exit(0);
  }
}
```

**User Experience**:
```
Importing projects... 47/127 (37%)
^C  ← User presses Ctrl+C

⏸️  Cancelation requested...
   Saving progress (press Ctrl+C again to force exit)

✅ Progress saved. Run with --resume to continue.

$ /specweave-jira:import-projects --resume
📋 Resuming import from last checkpoint (47/127 complete)
```

### 4. Resume Capability

**State File**: `.specweave/cache/import-state.json`

**Format**:
```json
{
  "operation": "jira-import-projects",
  "total": 127,
  "completed": 47,
  "succeeded": ["BACKEND", "FRONTEND", ...],
  "failed": ["LEGACY"],
  "skipped": ["ARCHIVED-PROJ"],
  "lastProject": "MOBILE",
  "timestamp": "2025-11-21T10:30:00Z"
}
```

**Resume Logic**:
```typescript
async function resumeImport(): Promise<void> {
  const state = await loadImportState();

  if (!state) {
    console.log('⚠️  No import state found. Starting fresh import.\n');
    return await startFreshImport();
  }

  // Validate state (expire after 24 hours)
  const stateAge = Date.now() - new Date(state.timestamp).getTime();
  if (stateAge > 24 * 60 * 60 * 1000) {
    console.log('⚠️  Import state expired (> 24 hours old). Starting fresh.\n');
    await deleteImportState();
    return await startFreshImport();
  }

  console.log(`📋 Resuming import from last checkpoint (${state.completed}/${state.total} complete)\n`);

  // Continue from last position
  const remainingProjects = allProjects.filter(p =>
    !state.succeeded.includes(p.key) &&
    !state.failed.includes(p.key) &&
    !state.skipped.includes(p.key)
  );

  await importProjects(remainingProjects, state);
}
```

**Expiration**: State files expire after 24 hours (force fresh start if stale)

### 5. Error Handling (Continue on Failure)

**Philosophy**: One failure shouldn't break entire batch operation

**Implementation**:
```typescript
for (const project of projects) {
  try {
    await importProject(project);
    tracker.update(project.key, 'success');
    succeeded.push(project.key);
  } catch (error) {
    console.error(`❌ ${project.key}: ${(error as Error).message}`);
    tracker.update(project.key, 'error');
    failed.push({ key: project.key, error: (error as Error).message });
  }

  // Check for cancelation after each project
  if (cancelHandler.shouldCancel()) {
    await saveState({ succeeded, failed, skipped });
    break;
  }
}
```

**Error Logging**: All failures logged to `.specweave/logs/import-errors.log`

**Final Summary**:
```
✅ Import Complete!

Imported: 120 projects
Failed: 5 projects (see .specweave/logs/import-errors.log)
  ❌ LEGACY: 403 Forbidden (check permissions)
  ❌ ARCHIVED: 404 Not Found (project deleted?)
  ❌ TEST-PROJ: Timeout (network issue)
Skipped: 2 projects (archived)

Total time: 2m 34s
```

### 6. ETA Calculation (Linear Extrapolation)

**Algorithm**:
```typescript
private getEta(): string {
  if (this.current === 0) return '';

  const elapsed = Date.now() - this.startTime;
  const rate = elapsed / this.current;  // ms per item
  const remaining = (this.total - this.current) * rate;

  const seconds = Math.floor(remaining / 1000);

  if (seconds < 60) return `, ~${seconds}s remaining`;
  const minutes = Math.floor(seconds / 60);
  return `, ~${minutes}m remaining`;
}
```

**Accuracy**: Typically within 20% for uniform workloads (API calls)

**Limitations**:
- Assumes uniform processing time (may be inaccurate if variance high)
- Early estimates less accurate (small sample size)
- Network variance affects accuracy

**Improvement** (Future Enhancement):
```typescript
// Use rolling average (last 10 items) instead of overall average
private getEtaRolling(): string {
  const recentTimes = this.itemTimes.slice(-10);
  const avgTime = recentTimes.reduce((a, b) => a + b) / recentTimes.length;
  const remaining = (this.total - this.current) * avgTime;
  // ...
}
```

## Alternatives Considered

### Alternative 1: No Progress Tracking (Current Behavior)

- **Pros**: Simpler code, no UI complexity
- **Cons**: Poor UX, user anxiety, no cancelation
- **Why not**: Unacceptable for long-running operations (1-5 minutes)

### Alternative 2: Percentage Only (No Progress Bar)

- **Pros**: Simpler than ASCII bar, still informative
- **Cons**: Less visual, harder to gauge progress at glance
- **Why not**: ASCII bar is standard in CLI tools (npm, git, docker)

### Alternative 3: Spinner with Count (No Progress Bar)

- **Pros**: Simpler than full progress bar
- **Cons**: No visual indicator, harder to estimate time remaining
- **Why not**: Insufficient for long operations (user needs time estimate)

### Alternative 4: No Resume Capability (Always Start Fresh)

- **Pros**: Simpler, no state management
- **Cons**: Lost progress frustrating, especially for 500+ project imports
- **Why not**: Resume is critical for reliability (network failures, user mistakes)

### Alternative 5: Automatic Retry (No User Intervention)

- **Pros**: Fully automated, no manual resume needed
- **Cons**: May retry infinitely on persistent errors (permissions, deleted projects)
- **Why not**: User should decide whether to retry (may need to fix permissions first)

## Consequences

### Positive

- ✅ **Reduced anxiety**: Users see progress, know how long to wait
- ✅ **Graceful cancelation**: Ctrl+C doesn't lose work, can resume later
- ✅ **Error transparency**: Failures shown immediately, logged for review
- ✅ **Reliability**: Resume capability handles network failures, rate limits
- ✅ **Modern UX**: Matches expectations from npm, git, docker

### Negative

- ❌ **Code complexity**: Progress tracking, cancelation, state management add ~500 lines
- ❌ **State file maintenance**: Expired state files need cleanup
- ❌ **ETA inaccuracy**: Linear extrapolation wrong if workload non-uniform
- ❌ **Testing complexity**: Harder to test cancelation, resume flows

### Neutral

- ⚖️ **Configurable interval**: `--progress-interval 10` for different update frequencies
- ⚖️ **Disable progress**: `--no-progress` for CI/CD environments (no TTY)
- ⚖️ **State expiration**: 24-hour TTL prevents stale state accumulation

## Risks & Mitigations

### Risk 1: Progress Bar Spam (Too Many Updates)

**Problem**: Updating on every item (500 updates) floods terminal

**Mitigation**:
- Update every 5 items (configurable)
- Suppress updates in CI/CD (`process.stdout.isTTY` check)
- Option to disable: `--no-progress`

### Risk 2: ETA Inaccuracy (Variable Latency)

**Problem**: Network variance makes linear extrapolation wrong

**Mitigation**:
- Show range instead of exact time: "~2-3m remaining"
- Use rolling average (last 10 items) for better accuracy
- Don't show ETA until 10% complete (sample size too small)

### Risk 3: State File Corruption

**Problem**: Write interrupted, state file corrupted

**Mitigation**:
- Atomic writes: Write to temp file, rename on success
- JSON validation: Catch parse errors on read
- Fallback to fresh start if state invalid

### Risk 4: Second Ctrl+C Not Detected

**Problem**: User presses Ctrl+C twice but force exit doesn't work

**Mitigation**:
- Set `isCanceled = true` on first Ctrl+C
- Check flag on second Ctrl+C → immediate `process.exit(1)`
- Timeout: If save takes > 5 seconds, force exit anyway

## Usage Examples

### Example 1: Import Projects with Progress

```bash
$ /specweave-jira:import-projects --filter active

Importing projects... 47/127 (37%) [=============>          ] [47s elapsed, ~2m remaining]
✅ BACKEND
✅ FRONTEND
⏳ MOBILE (loading dependencies...)

[User presses Ctrl+C]

⏸️  Cancelation requested...
   Saving progress (press Ctrl+C again to force exit)

✅ Progress saved. Run with --resume to continue.
```

### Example 2: Resume Interrupted Import

```bash
$ /specweave-jira:import-projects --resume

📋 Resuming import from last checkpoint (47/127 complete)

Importing projects... 80/127 (63%) [===================>    ] [1m 23s elapsed, ~1m remaining]
✅ MOBILE
✅ INFRA
✅ DEVOPS

✅ Import Complete!
   Imported: 125 projects
   Failed: 2 projects (see .specweave/logs/import-errors.log)
   Total time: 2m 34s
```

### Example 3: Bulk Pre-Load Dependencies

```bash
$ /specweave-jira:preload-dependencies

Pre-loading dependencies for 50 projects...

Loading dependencies... 12/50 (24%) [=====>              ] [34s elapsed, ~2m remaining]
✅ BACKEND (boards: 3, components: 5)
✅ FRONTEND (boards: 2, components: 3)
⏳ MOBILE (loading...)

✅ Pre-load complete!
   Loaded: 48 projects
   Failed: 2 projects (permissions)
   Total time: 1m 52s
```

## Related Decisions

- **ADR-0050**: Three-Tier Dependency Loading (Tier 3 uses progress tracking)
- **ADR-0052**: CLI-First Defaults and Smart Pagination (async fetch uses progress bar)

## Implementation Notes

### Files to Create

1. `src/core/progress/progress-tracker.ts` - Progress bar, ETA calculation
2. `src/core/progress/cancelation-handler.ts` - Ctrl+C handling, state saving
3. `src/core/progress/import-state-manager.ts` - Resume state persistence

### Files to Modify

1. `plugins/specweave-jira/commands/import-projects.ts` - Use ProgressTracker
2. `plugins/specweave-ado/commands/import-projects.ts` - Use ProgressTracker
3. `plugins/specweave-jira/commands/preload-dependencies.ts` - Use ProgressTracker
4. `src/cli/helpers/issue-tracker/jira.ts` - Use progress bar for async fetch

### Testing Strategy

**Unit Tests**:
- Progress bar rendering (ASCII output)
- ETA calculation (various scenarios)
- State file serialization/deserialization

**Integration Tests**:
- Cancelation handling (mock Ctrl+C)
- Resume from saved state
- Error handling (continue on failure)

**E2E Tests**:
- Visual validation (progress bar appears)
- Ctrl+C workflow (cancel → resume)
- Final summary (counts match actual)

---

**Created**: 2025-11-21
**Author**: Architect Agent
**Status**: Accepted (FS-048 implementation)
