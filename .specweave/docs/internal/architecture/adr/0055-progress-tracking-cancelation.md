# ADR-0055: Progress Tracking with Cancelation Support

**Date**: 2025-11-21
**Status**: Accepted

## Context

Bulk operations (importing 100+ projects, pre-loading dependencies) take time. Users need:

**Current Behavior**:
- No progress indicators during bulk operations
- No way to cancel long-running operations (Ctrl+C kills process, loses progress)
- No error handling (single failure stops entire batch)
- No final summary (users don't know what succeeded/failed)

**User Feedback**:
- "I'm importing 200 projects. Is it working? How long will it take?"
- "I pressed Ctrl+C after 5 minutes. Did I lose all progress?"
- "Import failed at project 50. Why? What about the other 150 projects?"

**Requirements**:
- Real-time progress indicators (N/M projects, percentage)
- Cancelation support (Ctrl+C saves partial progress)
- Error handling (continue on failure, report at end)
- Elapsed time tracking and ETA estimation
- Final summary report (succeeded, failed, skipped)

## Decision

Implement **progress tracking with graceful cancelation**:

### Features

**1. Real-Time Progress Bar**
```
Loading projects... 47/127 (37%) [=============>          ] [47s elapsed, ~2m remaining]
✅ BACKEND (completed)
✅ FRONTEND (completed)
⏳ MOBILE (loading dependencies...)
```

**2. Cancelation Support (Ctrl+C)**
- Save partial progress to `.specweave/cache/import-state.json`
- Show summary: "Imported 47/127 projects (37% complete)"
- Suggest resume: "Run `/specweave-jira:import-projects --resume` to continue"
- Exit cleanly (no errors, no corruption)

**3. Error Handling (Continue on Failure)**
- Log error: `❌ PROJECT-123: API error (403 Forbidden)`
- Continue to next project (don't stop entire batch)
- Final summary: "Imported 98/127, 5 failed, 24 skipped"

**4. Final Summary Report**
```
✅ Import Complete!

Imported: 98 projects
Failed: 5 projects (see .specweave/logs/import-errors.log)
  ❌ PROJECT-123: 403 Forbidden (check permissions)
  ❌ PROJECT-456: 404 Not Found (project deleted?)
  ❌ PROJECT-789: Timeout (network issue)
Skipped: 24 projects (archived)

Total time: 2m 34s
```

### Architecture

**Progress Tracker Module**:
```typescript
export class ProgressTracker {
  constructor(options: { total: number; label?: string; showEta?: boolean })

  // Update progress (call after each item)
  update(item: string, status: 'pending' | 'success' | 'error'): void

  // Finish (show final summary)
  finish(succeeded: number, failed: number, skipped: number): void

  // Internal: Render progress bar
  private renderProgressBar(percentage: number): string

  // Internal: Calculate ETA (linear extrapolation)
  private getEta(): string
}
```

**Cancelation Handler Module**:
```typescript
export class CancelationHandler {
  constructor(saveState: (state: any) => Promise<void>)

  // Check if cancelation requested
  shouldCancel(): boolean

  // Register Ctrl+C handler
  private registerSignalHandler(): void

  // Handle cancelation (save state, exit)
  private async handleCancelation(): Promise<void>
}
```

### Progress Bar Rendering

**ASCII Progress Bar** (30 characters wide):
```
[=============>          ]  (37% complete)
[=============================>]  (100% complete)
[===>                    ]  (10% complete)
```

**Implementation**:
```typescript
private renderProgressBar(percentage: number): string {
  const width = 30;
  const filled = Math.floor((percentage / 100) * width);
  const empty = width - filled;

  return `[${'='.repeat(filled)}${'>'}${' '.repeat(empty - 1)}]`;
}
```

### ETA Calculation (Linear Extrapolation)

**Formula**:
```typescript
const elapsed = Date.now() - startTime;  // ms since start
const rate = elapsed / current;          // ms per item
const remaining = (total - current) * rate;  // ms remaining
```

**Accuracy**:
- Works well for consistent API latency
- Less accurate for variable latency (network fluctuations)
- **Improvement**: Use rolling average (last 10 items) instead of overall average

**Display**:
- `[47s elapsed]` → If < 1 minute elapsed
- `[2m 34s elapsed, ~3m remaining]` → If > 1 minute elapsed

### Cancelation State Management

**State File**: `.specweave/cache/import-state.json`
```json
{
  "operation": "import-jira-projects",
  "timestamp": "2025-11-21T10:30:00Z",
  "total": 127,
  "completed": 47,
  "succeeded": 45,
  "failed": 2,
  "remaining": 80,
  "canceled": true,
  "errors": [
    { "project": "PROJECT-123", "error": "403 Forbidden" },
    { "project": "PROJECT-456", "error": "404 Not Found" }
  ]
}
```

**Resume Logic**:
```typescript
async function resumeImport(): Promise<void> {
  const state = await loadImportState();

  if (!state || !state.canceled) {
    console.log('No import to resume.');
    return;
  }

  console.log(`Resuming import... ${state.completed}/${state.total} already completed\n`);

  // Continue from where we left off
  const remainingProjects = state.remaining;
  await importProjects(remainingProjects, state.completed);
}
```

### Error Logging

**Error Log File**: `.specweave/logs/import-errors.log`
```
[2025-11-21 10:30:15] PROJECT-123: 403 Forbidden (check permissions)
[2025-11-21 10:30:22] PROJECT-456: 404 Not Found (project deleted?)
[2025-11-21 10:32:45] PROJECT-789: Timeout (network issue)
```

**Format**:
- Timestamp (for debugging)
- Project key (for identification)
- Error message (human-readable)
- Suggestion (how to fix)

## Alternatives Considered

### Alternative 1: No Progress Tracking (Silent Execution)
**Pros**:
- Simplest implementation (no progress UI)
- No complexity

**Cons**:
- ❌ **Poor UX** (users don't know what's happening)
- ❌ **No feedback** (appears frozen)
- ❌ **No ETA** (users don't know how long to wait)

**Why Not**: Progress tracking is essential for long-running operations. UX is critical.

### Alternative 2: Simple Spinner (No Progress Percentage)
**Approach**: Show spinner with "Loading..." (no N/M count)

**Pros**:
- Simpler than progress bar
- Indicates activity (not frozen)

**Cons**:
- ❌ **No progress visibility** (users don't know if it's 10% or 90% done)
- ❌ **No ETA** (can't estimate time remaining)
- ❌ **Anxiety-inducing** ("Is it stuck? How long will this take?")

**Why Not**: Progress percentage is much better UX. Users want to know N/M, not just "working...".

### Alternative 3: No Cancelation Support (Ctrl+C Kills Process)
**Approach**: Ctrl+C immediately terminates (no save state)

**Pros**:
- Simplest (no state management)
- Immediate exit

**Cons**:
- ❌ **Lost progress** (users must restart from scratch)
- ❌ **Poor UX** (frustrating for long imports)
- ❌ **No resume capability** (users can't continue later)

**Why Not**: Graceful cancelation is important. Users should be able to stop and resume without losing progress.

### Alternative 4: Stop on First Error (No Error Handling)
**Approach**: If project import fails, stop entire batch

**Pros**:
- Simpler error handling (no continue-on-failure logic)
- User aware of error immediately

**Cons**:
- ❌ **Blocks entire import** (1 failed project = 99 others not imported)
- ❌ **Poor resilience** (permissions issue on 1 project shouldn't block all)
- ❌ **Wastes time** (user must retry entire batch)

**Why Not**: Continue-on-failure is more resilient. Most errors are project-specific (permissions, not found).

### Alternative 5: No ETA Estimation (Just Progress Bar)
**Approach**: Show N/M progress but no time estimation

**Pros**:
- Simpler (no ETA calculation)
- Avoids inaccurate estimates

**Cons**:
- ❌ **Less informative** (users want to know "how long?")
- ❌ **Missed opportunity** (ETA helps users plan)

**Why Not**: ETA is valuable even if approximate. Users appreciate knowing "~2m remaining" vs. "unknown".

## Consequences

### Positive
- ✅ **User confidence** (progress bars reduce perceived wait time)
- ✅ **Flexibility** (cancelation allows course correction)
- ✅ **Resilience** (continue on failure, don't block entire batch)
- ✅ **Transparency** (errors logged, users know what failed)
- ✅ **Resume capability** (users can stop and continue later)
- ✅ **Better UX** (informed users are patient users)

### Negative
- ❌ **Implementation complexity** (progress tracking, state management, error handling)
- ❌ **Progress bar spam** (too many updates = noisy console)
- ❌ **Inaccurate ETA** (variable API latency affects estimation)
- ❌ **Disk I/O** (saving state on Ctrl+C adds latency)

### Risks & Mitigations

**Risk 1: Progress Bar Spam (Too Many Updates)**
- **Problem**: Updating on every project (100 updates) is noisy
- **Mitigation**:
  - Update every 5 projects (reduce spam)
  - Configurable: `--progress-interval 10`
  - Flush console buffer (avoid flickering)

**Risk 2: ETA Inaccuracy (Variable API Latency)**
- **Problem**: Linear extrapolation is wrong if API slow/fast
- **Mitigation**:
  - Use rolling average (last 10 projects) instead of overall average
  - Show range: "~2-3m remaining" instead of "~2m 34s"
  - Hide ETA if < 3 items completed (too early to estimate)

**Risk 3: Incomplete State Save (Ctrl+C During Write)**
- **Problem**: Ctrl+C pressed while writing state.json → corrupted file
- **Mitigation**:
  - Atomic write (write to `.tmp`, then rename)
  - Validate JSON on read (catch corruption)
  - Fallback: If corrupted, start from scratch (log warning)

**Risk 4: Resume State Expiry (Stale State)**
- **Problem**: User cancels, forgets to resume, state becomes stale (24 hours later)
- **Mitigation**:
  - State TTL: 24 hours (auto-delete after expiry)
  - Prompt: "Resume state is 25 hours old. Start fresh? (Y/n)"
  - Clear state on successful completion (no orphaned state)

## Implementation Notes

### Progress Tracker Usage

```typescript
const tracker = new ProgressTracker({
  total: projectKeys.length,
  label: 'Importing projects',
  showEta: true
});

for (const projectKey of projectKeys) {
  try {
    await importProject(projectKey);
    tracker.update(projectKey, 'success');
    succeeded++;
  } catch (error) {
    tracker.update(projectKey, 'error');
    failed++;
    logError(projectKey, error);
  }
}

tracker.finish(succeeded, failed, skipped);
```

### Cancelation Handler Usage

```typescript
const handler = new CancelationHandler(async (state) => {
  await saveImportState({
    operation: 'import-jira-projects',
    completed: current,
    total: projectKeys.length,
    canceled: true,
    ...state
  });
});

for (const projectKey of projectKeys) {
  if (handler.shouldCancel()) {
    console.log('\n⏸️  Cancelation requested. Saving progress...');
    break;
  }

  await importProject(projectKey);
  current++;
}
```

### Performance Impact

| Operation | Without Tracking | With Tracking | Overhead |
|-----------|-----------------|---------------|----------|
| Import 100 projects | 60 seconds | 62 seconds | 3% |
| Console updates | 0 | 20 (every 5 projects) | Minimal |
| State saves | 0 | 1 (on Ctrl+C only) | < 50ms |

**Overhead is acceptable** (< 5% performance impact).

## Related Decisions

- **ADR-0052**: Smart Pagination (progress tracking during async fetch)
- **ADR-0050**: Three-Tier Dependency Loading (progress during Tier 3 bulk pre-load)

## References

- **Feature Spec**: `.specweave/docs/internal/specs/_features/FS-048/FEATURE.md`
- **User Story**: `.specweave/docs/internal/specs/specweave/FS-048/us-007-progress-tracking.md`
- **Existing Code**: `plugins/specweave-jira/lib/project-selector.ts` (current no progress tracking)
- **ora Library**: https://github.com/sindresorhus/ora (spinner/progress library)
