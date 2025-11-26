# ADR-0055: Progress Tracking with Cancelation

**Date**: 2025-11-21
**Status**: Accepted

## Context

After implementing smart pagination (ADR-0052) and CLI-first defaults (ADR-0053), users still face two UX problems during bulk operations:

1. **No feedback during long operations** (30-60 seconds for 100+ projects)
   - Users don't know if operation is working
   - No indication of how long it will take
   - Terminal appears frozen

2. **Cannot interrupt long operations** (Ctrl+C kills process, loses progress)
   - Users abandon import after 30 seconds
   - Must restart from scratch
   - No partial success handling

**User Complaints**:
- "I'm importing 200 projects. Is it working? How long will it take?"
- "I hit Ctrl+C after 2 minutes. Now I have to start over?"
- "Show me a progress bar like npm/git do."

**Requirements**:
- Real-time progress feedback (percentage, ETA)
- Graceful cancelation (Ctrl+C saves partial state)
- Resume capability (continue from saved state)
- Error handling (continue on failure, don't block batch)

## Decision

Implement **progress tracking with cancelation support**:

### High-Level Architecture

```
Bulk Operation Start
    ↓
Register SIGINT Handler (Ctrl+C detection)
    ↓
Initialize ProgressTracker
    ↓
For each batch (50 projects):
    ↓
Check if canceled (shouldCancel())
    ↓ NO
Fetch batch from API
    ↓
Update progress (N/M, %)
    ↓
If every 5 projects:
    └→ Render progress bar
    └→ Calculate ETA (rolling avg)
    └→ Update console
    ↓
Continue to next batch
    ↓
YES (canceled)
    ↓
Save partial state to .specweave/cache/import-state.json
    ↓
Show summary (N/M completed)
    ↓
Suggest resume command
    ↓
Clean exit (code 0)
```

### Components

**1. ProgressTracker**
- Real-time progress bar with percentage
- ETA estimation (rolling average of last 10 items)
- Update frequency control (every 5 projects)
- Final summary (succeeded/failed/skipped counts)

See ADR-0058 for detailed implementation.

**2. CancelationHandler**
- SIGINT (Ctrl+C) signal handler
- Partial state persistence (`.specweave/cache/import-state.json`)
- Clean exit with summary
- Resume suggestion to user

See ADR-0059 for detailed implementation.

**3. Integration with AsyncProjectLoader**
```typescript
class AsyncProjectLoader {
  async fetchAllProjects(
    credentials: Credentials,
    totalCount: number,
    options: FetchOptions
  ): Promise<FetchResult> {
    // Initialize components
    const progressTracker = new ProgressTracker({ total: totalCount });
    const cancelHandler = new CancelationHandler({
      stateFile: '.specweave/cache/import-state.json'
    });

    for (let offset = 0; offset < totalCount; offset += batchSize) {
      // Check for cancelation
      if (cancelHandler.shouldCancel()) {
        await cancelHandler.saveState({
          operation: 'import-projects',
          completed: offset,
          total: totalCount,
          projects
        });
        progressTracker.cancel();
        return { canceled: true, projects, errors };
      }

      // Fetch batch
      const batch = await this.fetchBatch(offset, batchSize);
      projects.push(...batch);

      // Update progress
      progressTracker.update('PROJECT-XXX', 'success');
    }

    progressTracker.finish();
    return { projects, succeeded: projects.length, errors };
  }
}
```

### Progress UI Example

**During Operation**:
```
Loading projects... 50/127 (39%) [=============>          ] [47s elapsed, ~2m remaining]
```

**On Completion**:
```
✅ Loaded 125/127 projects (2 failed, 0 skipped) in 28s
```

**On Cancelation (Ctrl+C)**:
```
⚠️  Operation canceled
   Imported 47/127 projects (37% complete)
   Resume with: /specweave-jira:import-projects --resume
```

**Error Summary**:
```
❌ 2 projects failed:
  - PROJECT-123: 403 Forbidden (Check project permissions)
  - PROJECT-456: 404 Not Found (Project may have been deleted)

See logs: .specweave/logs/import-errors.log
```

### State Persistence

**File**: `.specweave/cache/import-state.json`

**Structure**:
```json
{
  "operation": "import-projects",
  "provider": "jira",
  "domain": "example.atlassian.net",
  "timestamp": "2025-11-21T10:30:00Z",
  "total": 127,
  "completed": 47,
  "succeeded": 45,
  "failed": 2,
  "skipped": 0,
  "remaining": [
    { "key": "PROJECT-048", "name": "Backend Services" },
    { "key": "PROJECT-049", "name": "Frontend App" }
    // ... 78 more
  ],
  "errors": [
    {
      "projectKey": "PROJECT-123",
      "error": "403 Forbidden",
      "timestamp": "2025-11-21T10:29:45Z"
    }
  ]
}
```

**TTL**: 24 hours (force fresh start if stale)

### Resume Flow

**Command**: `/specweave-jira:import-projects --resume`

**Behavior**:
1. Check if `.specweave/cache/import-state.json` exists
2. Validate timestamp (< 24 hours old)
3. Load `remaining` projects
4. Continue from saved position
5. Show summary: "Resuming from 47/127 (37% complete)"

**State Validation**:
- Expired state (> 24h) → Prompt fresh start
- Invalid state (corrupted JSON) → Prompt fresh start
- Missing state file → Error: "No operation to resume"

## Alternatives Considered

### Alternative 1: No Progress Tracking (Current Behavior)

**Approach**: Silent operation, show summary at end

**Pros**:
- Simple implementation
- No console updates during operation

**Cons**:
- Poor UX (appears frozen)
- Users abandon long operations
- No indication of success/failure until end

**Why not**: Current pain point. Progress tracking is a must-have.

---

### Alternative 2: Polling-Based Progress (Not Event-Based)

**Approach**: Progress tracker polls operation status every 1 second

**Pros**:
- Simpler integration (no callback coupling)
- Works with any async operation

**Cons**:
- Unnecessary polling overhead (even when no progress)
- Delayed updates (up to 1 second lag)
- Harder to test (timing-dependent)

**Why not**: Event-based updates are more efficient and immediate.

---

### Alternative 3: No Cancelation Support

**Approach**: Don't handle Ctrl+C (let Node.js kill process)

**Pros**:
- Simpler implementation (no state persistence)
- No resume logic needed

**Cons**:
- Users lose all progress (must restart)
- Poor UX (frustrating for long operations)
- Inconsistent with CLI tools (git, npm support Ctrl+C)

**Why not**: Cancelation is a core CLI UX requirement. Users expect it.

---

### Alternative 4: Database-Backed State (Not File-Based)

**Approach**: Save cancelation state to SQLite database

**Pros**:
- More robust (transactions, schema validation)
- Easier to query (SQL vs. JSON parsing)

**Cons**:
- Overkill for simple state persistence
- Adds dependency (SQLite driver)
- Harder to debug (binary database file)

**Why not**: JSON file is sufficient for simple key-value state. Easier to debug.

## Consequences

**Positive**:
- ✅ Real-time progress feedback (users know operation is working)
- ✅ Graceful cancelation (Ctrl+C doesn't lose progress)
- ✅ Resume capability (continue from saved state)
- ✅ Error handling (continue on failure, comprehensive logs)
- ✅ CLI-aligned UX (like git clone, npm install)

**Negative**:
- ❌ Complexity added (progress tracker, cancelation handler)
- ❌ State file management (TTL expiration, validation)
- ❌ Resume command adds another UX path to test

**Risks & Mitigations**:

**Risk**: State file corrupted (invalid JSON)
- **Mitigation**: Atomic writes (write to temp file, then move)
- **Mitigation**: Validation on resume (prompt fresh start if invalid)

**Risk**: State expires during operation (user resumes after 25 hours)
- **Mitigation**: TTL check before resume (prompt fresh start if > 24h)

**Risk**: Ctrl+C during state save (partial write)
- **Mitigation**: Atomic writes (temp file → move)
- **Mitigation**: Validation on resume (detect partial write)

## Implementation Notes

**Files Created**:
- `src/cli/helpers/progress-tracker.ts` - Progress bar and ETA calculation (ADR-0058)
- `src/cli/helpers/cancelation-handler.ts` - Ctrl+C handling and state save (ADR-0059)
- `.specweave/cache/import-state.json` - Cancelation state persistence

**Files Modified**:
- `src/cli/helpers/project-fetcher.ts` - Integrate progress tracking and cancelation
- `src/cli/commands/init.ts` - Register SIGINT handler during init

**Config Fields** (`.specweave/config.json`):
```json
{
  "importProgressUpdateInterval": 5,
  "importProgressShowEta": true,
  "importStateTtlHours": 24,
  "importResumeEnabled": true
}
```

**Testing**:
- Unit tests: Progress percentage, ETA calculation, state validation
- Integration tests: Mock async operation, verify progress updates, Ctrl+C handling
- E2E tests: Real JIRA instance, Ctrl+C at 50% completion, verify resume

## Related Decisions

- **ADR-0052**: Smart Pagination - Defines batch size for progress tracking
- **ADR-0053**: CLI-First Defaults - Defines "Import all" strategy triggering progress
- **ADR-0057**: Async Batch Fetching - Defines batch operations requiring progress tracking
- **ADR-0058**: Progress Tracking Implementation - Detailed ProgressTracker design
- **ADR-0059**: Cancelation Strategy - Detailed CancelationHandler design
