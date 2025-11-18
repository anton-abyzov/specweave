---
name: specweave:update-status
description: Force-update status line cache with latest increment status
---

# Update Status Line

**Purpose**: Force-refresh status line cache when it appears stale or after making changes.

**Use When**:
- Status line doesn't reflect recent changes
- After completing tasks (want to see updated progress immediately)
- After status transitions (active → completed)
- Before checking progress with `/specweave:progress`
- When status line shows outdated information

---

## How It Works

1. **Scan All Increments**
   - Reads all spec.md files in `.specweave/increments/`
   - Identifies open increments (status = active/planning/in-progress)
   - Extracts creation dates from YAML frontmatter

2. **Select Current Increment**
   - Sorts by creation date (oldest first)
   - Takes first as current active increment
   - Counts total open increments

3. **Parse Task Progress**
   - Reads tasks.md from current increment
   - Uses TaskCounter for accurate counting (no overcounting)
   - Calculates: completed, total, percentage

4. **Update Cache**
   - Writes `.specweave/state/status-line.json`
   - Atomic write (temp file → rename)
   - Runs SYNCHRONOUSLY (user waits ~50-100ms)

---

## Usage

```bash
# Force-update status line (no arguments)
/specweave:update-status
```

**Output**:
```
✓ Status line cache updated
```

---

## Example

**Before Update** (stale cache):
```
Status Line: [0043] ████░░░░ 5/8 tasks (2 open)
```

**After Update** (fresh cache):
```
Status Line: [0043] ████████ 8/8 tasks (1 open) ✓
```

---

## Integration with Other Commands

This command is automatically called by:

1. **`/specweave:progress`**
   - Ensures status line is fresh before showing progress
   - User always sees accurate completion percentages

2. **`/specweave:done`**
   - Refreshes status line before PM validation
   - Ensures final progress is accurate

3. **`/specweave:status`**
   - Updates cache before showing increment list
   - Shows current increment status

---

## Technical Details

**Performance**: ~50-100ms (synchronous execution)

**Cache Location**: `.specweave/state/status-line.json`

**Cache Format**:
```json
{
  "current": {
    "id": "0043-spec-md-desync-fix",
    "name": "0043-spec-md-desync-fix",
    "completed": 8,
    "total": 8,
    "percentage": 100
  },
  "openCount": 1,
  "lastUpdate": "2025-11-18T15:30:00Z"
}
```

**Source of Truth**:
- Increment status: `spec.md` YAML frontmatter (NOT metadata.json)
- Task progress: `tasks.md` (TaskCounter for accuracy)

**Atomicity**: Uses temp file → rename pattern to prevent cache corruption

---

## Troubleshooting

**Status line still stale after update?**
1. Check if `.specweave/state/status-line.json` was modified
2. Verify spec.md has correct status in YAML frontmatter
3. Check tasks.md has proper task format (## T-001, etc.)

**Error: "Failed to update status line"**
- Ensure `.specweave/increments/` exists
- Check file permissions on `.specweave/state/`
- Verify spec.md has valid YAML frontmatter

**Cache shows wrong increment?**
- Status line shows oldest active increment by default
- Complete older increments first
- Or check `created` date in spec.md frontmatter

---

## Implementation

**CLI**: `src/cli/update-status-line.ts`
**Core Logic**: `src/core/status-line/status-line-updater.ts`
**Hook (async)**: `plugins/specweave/hooks/lib/update-status-line.sh`

**Difference from Hook**:
- **Command**: SYNCHRONOUS (user waits, sees immediate result)
- **Hook**: ASYNCHRONOUS (background refresh, no blocking)

Both use same logic, different execution model.

---

**This command ensures status line is ALWAYS fresh when you need it!** ✓
