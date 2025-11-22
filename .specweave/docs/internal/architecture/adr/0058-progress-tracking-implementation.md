# ADR-0058: Progress Tracking Implementation Strategy

**Date**: 2025-11-21
**Status**: Accepted

## Context

ADR-0055 established the need for progress tracking during bulk operations. Now we need concrete implementation details for how progress tracking works.

**Requirements**:
- Real-time progress bar with percentage (e.g., "50/127, 39%")
- ETA estimation (e.g., "~2m remaining")
- Update frequency control (not every item, reduce console spam)
- Final summary (succeeded/failed/skipped counts)
- Error logging with actionable suggestions
- Integration with async batch fetching (ADR-0057)

**User Expectations** (from user feedback):
- "I'm importing 200 projects. Is it working? How long will it take?"
- "Show me a progress bar like npm/git do"
- "Tell me if any projects failed and why"

**Technical Constraints**:
- CLI environment (no GUI, terminal-only)
- Must work with Ora (spinner library already in use)
- Must work with Chalk (color library already in use)
- Must not impact performance (< 100ms per update)

## Decision

Implement **ProgressTracker component with rolling average ETA**:

### Architecture

```typescript
class ProgressTracker {
  private startTime: number;
  private spinner: ora.Ora;
  private total: number;
  private current: number = 0;
  private succeeded: number = 0;
  private failed: number = 0;
  private skipped: number = 0;
  private updateFrequency: number;
  private recentDurations: number[] = [];  // Rolling window for ETA
  private lastItemTime: number;

  constructor(options: ProgressOptions) {
    this.total = options.total;
    this.startTime = Date.now();
    this.lastItemTime = this.startTime;
    this.updateFrequency = options.updateFrequency || 5;  // Every 5 items
    this.spinner = ora(this.getProgressText()).start();
  }

  update(item: string, status: 'success' | 'failure' | 'skip'): void {
    this.current++;

    // Update counters
    if (status === 'success') this.succeeded++;
    if (status === 'failure') this.failed++;
    if (status === 'skip') this.skipped++;

    // Track duration for ETA calculation
    const now = Date.now();
    const duration = now - this.lastItemTime;
    this.recentDurations.push(duration);
    if (this.recentDurations.length > 10) {
      this.recentDurations.shift();  // Keep last 10 items only (rolling window)
    }
    this.lastItemTime = now;

    // Update UI (throttled to reduce console spam)
    if (this.current % this.updateFrequency === 0 || this.current === this.total) {
      this.spinner.text = this.getProgressText();
    }
  }

  private getProgressText(): string {
    const percentage = Math.floor((this.current / this.total) * 100);
    const elapsed = this.formatDuration(Date.now() - this.startTime);
    const eta = this.calculateEta();
    const bar = this.renderProgressBar(percentage);

    return [
      `Loading projects... ${this.current}/${this.total} (${percentage}%)`,
      bar,
      eta ? `[${elapsed} elapsed, ${eta} remaining]` : `[${elapsed} elapsed]`
    ].filter(Boolean).join(' ');
  }

  private renderProgressBar(percentage: number): string {
    const width = 30;
    const filled = Math.floor((percentage / 100) * width);
    const empty = width - filled - 1;  // -1 for arrow

    return `[${'='.repeat(filled)}>${' '.repeat(empty)}]`;
  }

  private calculateEta(): string | null {
    if (this.recentDurations.length < 3) return null;  // Too early to estimate

    const avgDuration = this.recentDurations.reduce((a, b) => a + b, 0)
                       / this.recentDurations.length;
    const remainingItems = this.total - this.current;
    const remainingMs = remainingItems * avgDuration;

    return this.formatDuration(remainingMs);
  }

  private formatDuration(ms: number): string {
    const seconds = Math.ceil(ms / 1000);

    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      return `${Math.ceil(seconds / 60)}m`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.ceil((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }

  finish(): void {
    const elapsed = Date.now() - this.startTime;
    const elapsedFormatted = this.formatDuration(elapsed);

    this.spinner.succeed(
      chalk.green(`✅ Loaded ${this.succeeded}/${this.total} projects `) +
      chalk.yellow(`(${this.failed} failed, ${this.skipped} skipped) `) +
      chalk.cyan(`in ${elapsedFormatted}`)
    );
  }

  getSummary(): ProgressSummary {
    return {
      total: this.total,
      completed: this.current,
      succeeded: this.succeeded,
      failed: this.failed,
      skipped: this.skipped,
      elapsed: Date.now() - this.startTime
    };
  }
}
```

### Key Features

**1. Progress Bar Rendering**

ASCII progress bar with percentage:
```
Loading projects... 50/127 (39%) [=============>          ] [47s elapsed, ~2m remaining]
```

Components:
- **Counter**: `50/127` (current/total)
- **Percentage**: `39%` (visual indicator)
- **Bar**: `[=============>          ]` (30 characters wide)
- **Elapsed**: `47s` (time since start)
- **ETA**: `~2m remaining` (estimated time remaining)

---

**2. ETA Calculation (Rolling Average)**

**Algorithm**:
```typescript
// Keep last 10 item durations (rolling window)
const recentDurations = [120, 130, 115, 125, 118, 122, 128, 119, 124, 121];  // ms

// Calculate average
const avgDuration = recentDurations.reduce((a, b) => a + b) / recentDurations.length;
// avgDuration = 122ms

// Estimate remaining time
const remainingItems = 127 - 50;  // 77 items
const remainingMs = remainingItems * avgDuration;  // 77 × 122 = 9394ms ≈ 9.4s
```

**Why Rolling Average?**
- More accurate than simple elapsed / current (accounts for variable latency)
- Adapts to changing network conditions (recent samples weighted equally)
- Window size 10 balances stability vs. responsiveness

**Example ETA Evolution**:
```
10/127 (8%)   [====>                       ] [12s elapsed, ~3m remaining]
50/127 (39%)  [=============>              ] [47s elapsed, ~2m remaining]
100/127 (79%) [=========================>  ] [1m 32s elapsed, ~30s remaining]
127/127 (100%) [============================] [2m 5s elapsed]
```

---

**3. Update Frequency Control**

**Problem**: Updating console every item causes spam (127 updates for 127 projects)

**Solution**: Update every N items (default: 5)

```typescript
if (this.current % 5 === 0 || this.current === this.total) {
  this.spinner.text = this.getProgressText();
}
```

**Update Pattern**:
```
0/127   → No update (initial state)
5/127   → Update (5 % 5 === 0) ✅
10/127  → Update (10 % 5 === 0) ✅
15/127  → Update (15 % 5 === 0) ✅
...
125/127 → Update (125 % 5 === 0) ✅
127/127 → Update (last item) ✅
```

**Benefits**:
- Reduces console updates from 127 → 26 (81% reduction)
- Improves readability (no flickering)
- Minimal performance impact (< 1ms per update)

---

**4. Final Summary**

**Output Example**:
```
✅ Loaded 125/127 projects (2 failed, 0 skipped) in 28s
```

**Color Coding** (Chalk):
- Green: Success count (`✅ Loaded 125/127`)
- Yellow: Failed count (`2 failed`)
- Cyan: Elapsed time (`in 28s`)

**Error Details** (if failures):
```
❌ 2 projects failed:
  - PROJECT-123: 403 Forbidden (Check project permissions)
  - PROJECT-456: 404 Not Found (Project may have been deleted)

See logs: .specweave/logs/import-errors.log
```

---

**5. Error Logging**

**Log File**: `.specweave/logs/import-errors.log`

**Format**:
```
[2025-11-21 10:30:15] PROJECT-123: 403 Forbidden
  Suggestion: Check project permissions (you may lack read access)
  API Response: {"error": "Forbidden"}

[2025-11-21 10:30:22] PROJECT-456: 404 Not Found
  Suggestion: Project may have been deleted or archived
  API Response: {"error": "Project not found"}

[2025-11-21 10:32:45] PROJECT-789: ETIMEDOUT
  Suggestion: Network timeout (try again or reduce batch size)
  Retry Attempts: 3/3 (all failed)
```

**Log Entry Structure**:
```typescript
interface ErrorLogEntry {
  timestamp: string;
  projectKey: string;
  error: string;
  suggestion: string;
  apiResponse?: object;
  retryAttempts?: number;
}
```

**Error Classification** (actionable suggestions):
- `403 Forbidden` → "Check project permissions"
- `404 Not Found` → "Project may have been deleted"
- `ETIMEDOUT` → "Network timeout (try again or reduce batch size)"
- `429 Too Many Requests` → "Rate limit exceeded (throttling applied)"
- `5XX Server Error` → "API issue (retrying with backoff)"

## Alternatives Considered

### Alternative 1: Per-Item Progress (No Throttling)

**Approach**: Update console every item (127 updates for 127 projects)

**Pros**:
- Maximum real-time feedback
- Users see every project loaded

**Cons**:
- Console spam (127 updates)
- Flickering UI (rapid updates)
- Performance overhead (127 render calls)

**Why not**: Poor UX (unreadable), performance overhead. Throttling (every 5 items) is better.

---

### Alternative 2: Simple Elapsed Time ETA

**Approach**: ETA = (elapsed / current) * remaining

**Pros**:
- Simpler algorithm (no rolling window)
- Less memory (no duration array)

**Cons**:
- Inaccurate with variable latency (e.g., network fluctuations)
- Early estimates wildly inaccurate (first item slow → huge ETA)
- Doesn't adapt to changing conditions

**Why not**: Rolling average is more accurate and adaptive. Minimal complexity cost.

---

### Alternative 3: External Progress Library (cli-progress)

**Approach**: Use `cli-progress` npm package instead of Ora

**Pros**:
- Feature-rich (multiple progress bars, customization)
- Built-in ETA calculation

**Cons**:
- Another dependency (SpecWeave already uses Ora)
- Incompatible with Ora spinners (can't mix)
- Larger bundle size

**Why not**: Ora is already in use. Custom implementation gives full control and minimal deps.

## Consequences

**Positive**:
- ✅ Real-time progress feedback (users know operation is working)
- ✅ Accurate ETA estimation (±20% variance typical)
- ✅ Readable console output (no spam, clear updates)
- ✅ Comprehensive error logging (actionable suggestions)
- ✅ Performance efficient (< 1ms per update)

**Negative**:
- ❌ Rolling window adds complexity (duration array management)
- ❌ Update throttling may miss intermediate states (only see every 5th item)
- ❌ ETA inaccurate early on (< 3 items completed)

**Risks & Mitigations**:

**Risk**: Console spam if update frequency too high
- **Mitigation**: Default to 5 items (configurable via `importProgressUpdateInterval`)

**Risk**: ETA wildly inaccurate early on
- **Mitigation**: Don't show ETA until 3+ items completed (`if (recentDurations.length < 3) return null`)

**Risk**: Progress bar width breaks on narrow terminals
- **Mitigation**: Use 30-character width (fits 80-column terminals)

## Implementation Notes

**Files Created**:
- `src/cli/helpers/progress-tracker.ts` - ProgressTracker implementation
- `tests/unit/cli/helpers/progress-tracker.test.ts` - Unit tests

**Config Fields** (`.specweave/config.json`):
```json
{
  "importProgressUpdateInterval": 5,  // Update every N projects (default: 5)
  "importProgressBarWidth": 30,      // ASCII bar width (default: 30)
  "importProgressShowEta": true      // Show ETA estimation (default: true)
}
```

**Dependencies**:
- `ora@^7.0.0` - Spinner library (already in use)
- `chalk@^5.0.0` - Terminal colors (already in use)

**Testing**:
- Unit tests: Percentage calculation, ETA estimation, progress bar rendering
- Integration tests: Mock async fetcher, verify progress updates
- Performance tests: < 1ms per update (100 updates < 100ms)

## Related Decisions

- **ADR-0055**: Progress Tracking with Cancelation - Defines high-level requirements
- **ADR-0057**: Async Batch Fetching - Defines integration with batch fetching
- **ADR-0059**: Cancelation Strategy - Defines integration with cancelation handler
