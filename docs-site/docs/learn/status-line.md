---
id: status-line
title: Status Line Feature
sidebar_label: Status Line
---

# Status Line Feature

:::info New in v0.14.0
Ultra-fast status line showing current increment progress with intelligent caching
:::

The status line provides at-a-glance visibility into your current increment's progress without disrupting your workflow.

---

## The Problem

Users working on increments had no quick way to see:
- Which increment is active
- How many tasks complete (X/Y)
- Current task being worked on
- Overall progress percentage

They had to run `/specweave:progress` every time, which was slow and disruptive.

---

## The Solution: Fast Caching Architecture

**Performance Target**: &lt;1ms render time (99% of requests)

### Architecture

1. **Hook pre-computes cache** (async, 10-50ms) - User doesn't wait
2. **Status line reads cache** (sync, &lt;1ms) - Ultra-fast display
3. **mtime-based invalidation** - Detects external edits

### How It Works

```
Post-Task-Completion Hook
  ↓
Runs update-status-line.sh (async, non-blocking)
  ├─ Parses tasks.md (counts completed/total)
  ├─ Finds current task (first [ ] checkbox)
  ├─ Gets tasks.md mtime (for invalidation)
  └─ Writes to .specweave/state/status-line.json

Status Line Renderer
  ├─ Reads cache (&lt;0.3ms)
  ├─ Validates freshness (0.2ms)
  │   ├─ Age check (&lt;5s = fresh)
  │   └─ mtime check (file unchanged = fresh)
  └─ Formats output (0.1ms)

Total: &lt;1ms ✅
```

---

## Example Output

```bash
# Normal progress
[sync-fix] ████░░░░ 15/30 (50%) • T-016: Update docs

# Near completion
[sync-fix] ███████░ 28/30 (93%) • T-029: Final review

# Complete
[sync-fix] ████████ 30/30 (100%) • Use /specweave:done

# No active increment
No active increment
```

---

## Cache File Format

**Location**: `.specweave/state/status-line.json`

```json
{
  "incrementId": "0017-sync-architecture-fix",
  "incrementName": "sync-architecture-fix",
  "totalTasks": 30,
  "completedTasks": 15,
  "percentage": 50,
  "currentTask": {
    "id": "T-016",
    "title": "Update documentation"
  },
  "lastUpdate": "2025-11-10T15:30:00Z",
  "lastModified": 1699632600
}
```

---

## Multi-Window Support

### Scenario 1: Same Increment, Multiple Windows ✅

- Window 1 completes T-016 → Hook updates cache
- Window 2 reads cache → Sees same progress
- ✅ Both windows synchronized via shared cache

### Scenario 2: External Edits (Vim/Git) ✅

- User edits tasks.md in vim → mtime changes
- Cache detects mtime mismatch → Returns null
- Next hook fire regenerates cache
- ✅ Changes detected within 5 seconds

### Scenario 3: Multiple Active Increments ⚠️

- User violates 1-active rule (starts 0018 while 0017 active)
- Cache shows 0018 (most recent)
- Window 1 (working on 0017) sees 0018 status ❌
- ✅ **This is intentional!** Visual enforcement of discipline

---

## Configuration

In `.specweave/config.json`:

```json
{
  "statusLine": {
    "enabled": true,
    "maxCacheAge": 5000,
    "progressBarWidth": 8,
    "maxIncrementNameLength": 20,
    "maxTaskTitleLength": 30,
    "showProgressBar": true,
    "showPercentage": true,
    "showCurrentTask": true
  }
}
```

---

## Performance Benchmarks

| Metric | Target | Actual | Result |
|--------|--------|--------|--------|
| **Cache Hit** | &lt;1ms | 0.015ms | ✅ 67x faster |
| **Cache Miss** | N/A | 10-50ms | Async (no wait) |
| **1000 Renders** | &lt;1000ms | 14.87ms | ✅ 67x faster |

---

## Usage

### Automatic (via hook)

```bash
# Complete any task
# → Hook fires automatically
# → Cache updates in background
# → Status line shows latest progress
```

### Manual (CLI)

```bash
# Display status line
specweave status-line

# Output JSON
specweave status-line --json

# Clear cache
specweave status-line --clear
```

### Integration (status displays)

```typescript
import { StatusLineManager } from 'specweave/core/status-line';

const manager = new StatusLineManager(process.cwd());
const status = manager.render();
console.log(status); // "[sync-fix] ████░░░░ 15/30 (50%) • T-016"
```

---

## Benefits

### For Users

- ✅ Always know where they are in increment (at a glance)
- ✅ No need to run `/specweave:progress` repeatedly
- ✅ Multi-window support (shared cache)
- ✅ Detects external edits (vim, git)

### For Development

- ✅ &lt;1ms render (no performance impact)
- ✅ Simple architecture (150 lines total)
- ✅ No database, no locking, no complexity
- ✅ Works with CI/CD (cache optional)

---

## Implementation Details

### Core Files

- `src/core/status-line/types.ts` - Type definitions
- `src/core/status-line/status-line-manager.ts` - Fast cache reader
- `plugins/specweave/hooks/lib/update-status-line.sh` - Cache updater
- `src/cli/commands/status-line.ts` - CLI command

### Tests

- `tests/unit/status-line/status-line-manager.test.ts` - Unit tests
- `tests/integration/status-line/multi-window.test.ts` - Integration tests

### Integration

- Modified: `plugins/specweave/hooks/post-task-completion.sh` (+8 lines)
- Modified: `src/core/schemas/specweave-config.schema.json` (+54 lines)

---

## Related

- [Increment Lifecycle](../workflows/increment-lifecycle.md)
- [Hooks System](./hooks.md)
- [Configuration Reference](../reference/configuration.md)
