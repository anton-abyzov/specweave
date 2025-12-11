# Implementation Plan: Instant Dashboard Cache

## Overview

Transform status commands from O(n) file parsing to O(1) cache reads by implementing a write-time cache pattern.

## Phase 1: Cache Infrastructure (US-001)

### Step 1.1: Define Cache Schema
- Create `src/types/dashboard-cache.ts` with TypeScript interfaces
- Version field for future migrations
- Sections: increments, summary, jobs, costs

### Step 1.2: Create Rebuild Script
- `plugins/specweave/scripts/rebuild-dashboard-cache.sh`
- Scans all increments, builds complete cache
- Atomic write: write to `.tmp`, rename to `dashboard.json`
- Used for: initial build, recovery, manual rebuild

### Step 1.3: Create Update Script
- `plugins/specweave/scripts/update-dashboard-cache.sh`
- Arguments: `<incrementId> <changeType>` (metadata|tasks|spec|jobs)
- Updates only affected increment + summary deltas
- Acquires file lock to prevent concurrent writes

## Phase 2: Write Path Integration (US-002)

### Step 2.1: Hook into Post-Tool-Use
- Modify `plugins/specweave/hooks/v2/dispatchers/post-tool-use.sh`
- Pattern match: `*/metadata.json`, `*/tasks.md`, `*/spec.md`
- Extract increment ID from path
- Call update script with change type

### Step 2.2: Incremental Summary Updates
- When task completes: `summary.byStatus[old]--`, `summary.byStatus[new]++`
- Avoid recounting all increments
- Store enough data in increment record for delta math

### Step 2.3: Mtime Validation
- Store source file mtimes in cache
- On read, quick mtime check to detect external changes
- If mismatch, trigger incremental update before read

## Phase 3: Read Path Optimization (US-003)

### Step 3.1: Create Pure Bash Readers
- `plugins/specweave/scripts/read-progress.sh` - progress bars, task counts
- `plugins/specweave/scripts/read-status.sh` - status overview, grouping
- `plugins/specweave/scripts/read-jobs.sh` - background job status

### Step 3.2: Update user-prompt-submit.sh
- Replace:
  ```bash
  node "$SCRIPTS_DIR/progress.js" $ARGS
  ```
- With:
  ```bash
  bash "$SCRIPTS_DIR/read-progress.sh" $ARGS
  ```
- Add jq availability check with Node fallback

### Step 3.3: Output Format Preservation
- Match existing output exactly (progress bars, colors, icons)
- Use `printf` for formatting
- Test visual regression

## Phase 4: Cache Lifecycle (US-004)

### Step 4.1: Session Start Validation
- In `session-start.sh`: check if `dashboard.json` exists
- If missing: run `rebuild-dashboard-cache.sh`
- If version mismatch: run rebuild

### Step 4.2: Corruption Recovery
- Wrap cache reads in error handling
- On JSON parse failure: delete and rebuild
- Log recovery to `.specweave/logs/cache-recovery.log`

### Step 4.3: Manual Commands
- Add `specweave cache --rebuild` CLI command
- Add `specweave cache --validate` for debugging
- Show cache stats in debug output

## Phase 5: Additional Commands (US-005)

### Step 5.1: Instant Workflow
- `read-workflow.sh` - current phase, next action suggestions
- Uses increment status + task progress to suggest next step
- No LLM needed for basic workflow guidance

### Step 5.2: Cost Tracking Foundation
- Add `costs` section to cache schema
- Track tokens/cost per increment (future: hook into LLM calls)
- `read-costs.sh` - display cost dashboard

## Testing Strategy

### Unit Tests
- Cache schema validation
- Incremental update math
- Mtime comparison logic

### Integration Tests
- Full rebuild produces valid cache
- Incremental update matches full rebuild
- Concurrent updates don't corrupt

### Performance Tests
```bash
# Baseline (current)
time /specweave:progress  # ~200ms

# Target (after)
time /specweave:progress  # <10ms
```

## Rollout

1. **Phase 1-2**: Cache infrastructure (internal, no user-facing changes)
2. **Phase 3**: Opt-in via env var `SPECWEAVE_INSTANT_CACHE=1`
3. **Phase 4**: Default enabled, fallback to Node scripts
4. **Phase 5**: Additional commands

## File Summary

### New Files (7)
```
plugins/specweave/scripts/
├── rebuild-dashboard-cache.sh   # Full cache rebuild
├── update-dashboard-cache.sh    # Incremental updates
├── read-progress.sh             # Pure bash progress reader
├── read-status.sh               # Pure bash status reader
├── read-jobs.sh                 # Pure bash jobs reader
├── read-workflow.sh             # Pure bash workflow reader
└── read-costs.sh                # Pure bash costs reader

src/types/
└── dashboard-cache.ts           # TypeScript interfaces
```

### Modified Files (3)
```
plugins/specweave/hooks/
├── user-prompt-submit.sh        # Use bash readers instead of Node
├── v2/dispatchers/post-tool-use.sh  # Trigger cache updates
└── v2/dispatchers/session-start.sh  # Cache validation/rebuild
```
