# ULTRATHINK Analysis: Status Line Stale Cache & Missing Default State

**Date**: 2025-11-18
**Increment**: 0043-spec-md-desync-fix
**Severity**: P1 - CRITICAL
**Impact**: Developer confusion, poor UX, violates status line contract

---

## Executive Summary

**Problem**: Status line shows stale increment data even when all increments are completed. No default state exists for "no active increments" scenario.

**Evidence**:
- Status line displays: `[0042-test-infrastructure-cleanup] 5/18 tasks (2 open)` (Image #2)
- Reality: 0042 completed at 2025-11-18, 0043 completed at 2025-11-18
- Status line cache last updated: `2025-11-18T05:50:50Z` (15+ hours ago)
- **NO open increments** in entire project

**Root Causes**:
1. Status line cache NOT refreshed automatically when increments close
2. Missing default state for "no active increments" scenario
3. Cache stale for 15+ hours without invalidation

**User Impact**:
- Developer sees wrong increment as "active"
- Confusion about which work to continue
- Poor developer experience

---

## Investigation Timeline

### Step 1: User Report
```
User: "I see old status line state - [Image #2] it MUST be updated, introduce default state
       in status line, when no active sprint too"
```

**Observation**: User interface shows increment 0042 in status line, but metadata shows 0043 is completed.

### Step 2: Metadata Analysis

**Increment 0043 metadata.json**:
```json
{
  "id": "0043-spec-md-desync-fix",
  "status": "completed",  // ✅ COMPLETED
  "completed": "2025-11-18T20:32:08.457Z"
}
```

**Increment 0043 spec.md frontmatter**:
```yaml
increment: 0043-spec-md-desync-fix
status: completed  # ✅ COMPLETED
completed: 2025-11-18
```

**Increment 0042 metadata.json**:
```json
{
  "status": "completed"  // ✅ COMPLETED
}
```

**Increment 0042 spec.md**:
```yaml
status: completed  # ✅ COMPLETED
```

**Finding**: Both increments 0042 and 0043 are marked as `completed`. NO active increments exist.

### Step 3: Status Line Cache Analysis

**Cache file**: `.specweave/state/status-line.json`
```json
{
  "current": {
    "id": "0042-test-infrastructure-cleanup",  // ❌ STALE!
    "name": "0042-test-infrastructure-cleanup",
    "completed": 5,
    "total": 18,
    "percentage": 27
  },
  "openCount": 2,  // ❌ WRONG! Should be 0
  "lastUpdate": "2025-11-18T05:50:50Z"  // ⏰ 15+ HOURS AGO!
}
```

**Finding**: Cache shows 0042 as active, but 0042 was completed hours ago. Cache is STALE.

### Step 4: Active Increment Detection

**Config.json activeIncrement**:
```json
{
  "activeIncrement": null  // ✅ CORRECT!
}
```

**Finding**: `activeIncrement` in config.json is correctly set to `null`, but status line cache still shows 0042.

### Step 5: Open Increments Scan

**Command**: `find .specweave/increments -name "spec.md" -exec grep -l "^status: active\|planning\|in-progress" {} \;`

**Result**: **EMPTY** (no matches found)

**Finding**: ZERO open increments exist in the project. Status line should show default state, not 0042.

### Step 6: Status Line Updater Logic Review

**Code**: `src/core/status-line/status-line-updater.ts` (lines 122-128)
```typescript
// Check if increment is open (active, planning, or in-progress)
// ONLY accepts official IncrementStatus enum values
if (
  metadata.status === 'active' ||
  metadata.status === 'planning' ||
  metadata.status === 'in-progress'
) {
  // ... add to open increments list
}
```

**Finding**: StatusLineUpdater logic is CORRECT - only counts `active`, `planning`, `in-progress` as open. Increment 0042 (`status: completed`) should NOT be in status line.

**Problem**: Cache was NOT refreshed after 0042 was closed. Status line still shows old data from before closure.

---

## Root Cause Analysis

### Root Cause #1: Cache Not Invalidated on Increment Closure

**Evidence**:
- Cache timestamp: `2025-11-18T05:50:50Z`
- Increment 0042 completed: (timestamp unknown, but later than cache)
- Increment 0043 completed: `2025-11-18T20:32:08.457Z`
- Cache NEVER refreshed after closures

**Code Gap**:
- `/specweave:done` command does NOT trigger status line cache refresh
- MetadataManager.updateStatus() does NOT call StatusLineUpdater.update()
- Hooks may trigger refresh, but are asynchronous (can fail silently)

**Expected Behavior**:
```typescript
// In /specweave:done command (after closing increment):
await MetadataManager.updateStatus(incrementId, 'completed');

// ✅ MISSING: Force status line refresh
const updater = new StatusLineUpdater();
await updater.update();  // ← THIS IS MISSING!
```

**Impact**: Status line cache becomes stale and never recovers until user manually refreshes (unknown command).

### Root Cause #2: Missing Default State for "No Active Increments"

**Evidence**:
- When `openCount === 0`, cache still shows old increment data
- No friendly message like "No active increments - start with /specweave:increment"

**Expected Behavior**:
```json
{
  "current": null,  // ✅ No active increment
  "openCount": 0,
  "lastUpdate": "2025-11-18T20:50:00Z",
  "message": "No active increments. Start with /specweave:increment"  // ← MISSING!
}
```

**Code Gap**:
- `StatusLineUpdater.update()` (lines 66-89) writes `current: null` when no increments found
- But UI/status line display logic doesn't handle `current: null` gracefully
- User sees old cached increment instead of "no active" message

**Impact**: Confusing UX - user thinks 0042 is still active when it's not.

### Root Cause #3: Asynchronous Hook Failures Silent

**Evidence**:
- Status line update hook may run asynchronously
- If hook fails (exit code 127, "tsx not found", etc.), failure is silent
- Cache remains stale indefinitely

**Hook Pattern** (typical):
```bash
#!/usr/bin/env tsx
# plugins/specweave/hooks/lib/update-status-line.ts

# If tsx not in PATH, hook fails silently
# Cache never updated
```

**Impact**: Even if hook SHOULD refresh cache, failures go unnoticed.

---

## Spec.md Desync Analysis (Secondary Issue)

**User Comment**: "I see ACs are not checked in 0043 spec.md, deeply investigate, ultrathink on it!"

### Findings

**Tasks.md Completion Status**:
```yaml
total_tasks: 24
completed_tasks: 9  # ⚠️ Only 37.5% complete!
```

**Increment Status**:
- metadata.json: `status: "completed"` ❌ PREMATURE!
- spec.md frontmatter: `status: completed` ❌ PREMATURE!

**Acceptance Criteria Status** (from spec.md):
```markdown
- [ ] AC-US1-01: Status line updates (UNCHECKED - task NOT done)
- [ ] AC-US1-02: No completed in status line (UNCHECKED)
- [ ] AC-US1-03: Hook reads spec.md (UNCHECKED)
- [x] AC-US2-01: updateStatus updates both (CHECKED - T-005 done ✅)
- [ ] AC-US2-02: Desync detection (UNCHECKED)
- [x] AC-US2-03: All transitions update (CHECKED - T-007 done ✅)
- [x] AC-US2-04: Enum validation (CHECKED - T-001 done ✅)
- [ ] AC-US3-01: Status line hook (UNCHECKED)
```

**Analysis**:
- **AC Sync IS working** (some ACs are checked: AC-US2-01, AC-US2-03, AC-US2-04)
- AC sync ran correctly - ACs are checked ONLY for completed tasks (T-001, T-005, T-007)
- Other ACs remain unchecked because their tasks are NOT done

**Conclusion**: This is NOT a desync bug. This is **premature increment closure**:
- Increment 0043 was closed via `/specweave:done` when only 9/24 tasks complete
- PM validation gates were bypassed or skipped
- Increment should NOT be marked as "completed" with 63% of tasks incomplete

**Remediation**:
1. Reopen increment 0043: `/specweave:reopen 0043`
2. Complete remaining tasks (T-008 through T-024)
3. Re-run PM validation: `/specweave:done 0043` (with proper gates)

---

## Impact Assessment

### Severity: P1 - CRITICAL

**Developer Experience Impact** (HIGH):
- Developer sees wrong increment as "active"
- Confusion about which work to continue
- Wasted time checking status manually
- Loss of trust in status line feature

**System Integrity Impact** (MEDIUM):
- Status line cache out of sync with reality
- Cache can be stale for hours/days without detection
- No automatic refresh mechanism

**Workflow Impact** (HIGH):
- Developers may start wrong work (based on status line)
- Multi-increment workflows broken (status line never updates)
- New users confused (no clear "what's next?" guidance)

### User Pain Points

**Quote from user**:
> "I still see old status line state - it MUST be updated, introduce default state in status
> line, when no active sprint too"

**Pain points**:
1. **Stale cache** - sees 0042 when 0042 is completed
2. **No default state** - no message for "no active increments"
3. **No refresh command** - unclear how to manually update status line
4. **Silent failures** - cache staleness not detected or warned

---

## Proposed Solutions

### Solution #1: Add Status Line Force Refresh Command

**Command**: `/specweave:update-status`

**Implementation**:
```typescript
// plugins/specweave/commands/specweave-update-status.md
---
name: specweave-update-status
description: Force-refresh status line cache when it appears stale
---

Force-refresh the status line cache by re-scanning all increments.

## Usage

```bash
/specweave:update-status
```

## What It Does

1. Scans all increments for open status (active, planning, in-progress)
2. Selects oldest open increment as current
3. Counts task progress from tasks.md
4. Updates status line cache atomically
5. Displays result to user

## When to Use

- Status line shows wrong increment
- Status line appears stale (not updated after closing increment)
- After manual edits to spec.md status field

## Output

```
✅ Status line updated
   Current increment: 0044-feature-name (12/25 tasks, 48%)
   Open increments: 1
```

Or if no active increments:

```
ℹ️  No active increments
   Start new work with: /specweave:increment "feature name"
```
```

**CLI Script**:
```typescript
// src/cli/update-status-line.ts
import { StatusLineUpdater } from '../core/status-line/status-line-updater.js';

export async function updateStatusLineCommand(): Promise<void> {
  const updater = new StatusLineUpdater();
  await updater.update();

  const cache = await updater.getCurrentCache();

  if (!cache || !cache.current) {
    console.log('ℹ️  No active increments');
    console.log('   Start new work with: /specweave:increment "feature name"');
  } else {
    console.log('✅ Status line updated');
    console.log(`   Current increment: ${cache.current.id} (${cache.current.completed}/${cache.current.total} tasks, ${cache.current.percentage}%)`);
    console.log(`   Open increments: ${cache.openCount}`);
  }
}
```

**Benefits**:
- User has manual control to refresh stale cache
- Clear output shows status line state
- Helps with "what's next?" question

**Limitations**:
- Still requires manual invocation
- Doesn't solve automatic refresh problem

### Solution #2: Auto-Refresh Cache on Increment Closure

**Implementation**: Modify MetadataManager.updateStatus()

```typescript
// src/core/increment/metadata-manager.ts (line 268+)
static async updateStatus(
  incrementId: string,
  newStatus: IncrementStatus,
  reason?: string
): Promise<IncrementMetadata> {
  // ... existing logic ...

  // Update metadata.json
  this.write(incrementId, metadata);

  // Update spec.md frontmatter
  await SpecFrontmatterUpdater.updateStatus(incrementId, newStatus);

  // Update active increment cache
  const activeManager = new ActiveIncrementManager();
  if (newStatus === IncrementStatus.ACTIVE) {
    activeManager.setActive(incrementId);
  } else {
    activeManager.smartUpdate();
  }

  // ✅ NEW: Force refresh status line cache on status change
  if (newStatus === IncrementStatus.COMPLETED ||
      newStatus === IncrementStatus.PAUSED ||
      newStatus === IncrementStatus.ABANDONED) {
    try {
      const statusLineUpdater = new StatusLineUpdater();
      await statusLineUpdater.update();
      console.log('ℹ️  Status line refreshed');
    } catch (error) {
      // Non-blocking: Log warning but don't fail status update
      console.warn('⚠️  Failed to refresh status line:', error);
    }
  }

  return metadata;
}
```

**Benefits**:
- Automatic cache refresh on every status change
- No manual intervention needed
- Status line always shows correct state

**Risks**:
- Performance overhead (~50-100ms per status change)
- Potential circular dependencies (if updater imports MetadataManager)
- Non-blocking failure handling required

### Solution #3: Add Default State to Status Line Display

**Implementation**: Update status line display logic

```typescript
// src/core/status-line/status-line-updater.ts (lines 74-85)
// Build cache object
const cache: StatusLineCache = {
  current: current ? {
    id: current.id,
    name: current.id,
    completed: progress.completed,
    total: progress.total,
    percentage: progress.percentage
  } : null,
  openCount: openIncrements.length,
  lastUpdate: new Date().toISOString(),

  // ✅ NEW: Add default state message
  message: openIncrements.length === 0
    ? 'No active increments. Start with /specweave:increment "feature name"'
    : undefined
};
```

**Display Logic** (UI layer):
```typescript
// In status line renderer (wherever it's displayed):
if (!cache.current && cache.message) {
  console.log('📋 SpecWeave Status');
  console.log(`   ${cache.message}`);
} else if (cache.current) {
  console.log(`[${cache.current.id}] ${cache.current.completed}/${cache.current.total} tasks (${cache.openCount} open)`);
}
```

**Benefits**:
- Clear UX when no work active
- Guides user to next action
- Eliminates "what should I do?" confusion

**Example Output**:
```bash
# No active increments:
📋 SpecWeave Status
   No active increments. Start with /specweave:increment "feature name"

# Active increment exists:
[0044-feature-name] ████████░░ 12/25 tasks (1 open)
```

### Solution #4: Add Cache Staleness Detection

**Implementation**: Add timestamp check to cache reader

```typescript
// src/core/status-line/status-line-updater.ts
const CACHE_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

async getCurrentCache(): Promise<StatusLineCache | null> {
  const cacheFile = path.join(this.rootDir, '.specweave/state/status-line.json');

  if (!await fs.pathExists(cacheFile)) {
    return null;
  }

  try {
    const content = await fs.readFile(cacheFile, 'utf-8');
    const cache = JSON.parse(content);

    // ✅ NEW: Check cache age
    const lastUpdate = new Date(cache.lastUpdate).getTime();
    const now = Date.now();
    const age = now - lastUpdate;

    if (age > CACHE_MAX_AGE_MS) {
      console.warn(`⚠️  Status line cache is stale (${Math.round(age / 60000)} minutes old). Run /specweave:update-status to refresh.`);
    }

    return cache;
  } catch {
    return null;
  }
}
```

**Benefits**:
- Detects stale cache automatically
- Warns user to refresh
- Prevents silent staleness

**Limitations**:
- Still requires manual refresh
- Warning may be missed if not displayed

---

## Recommended Implementation Plan

### Phase 1: Immediate Fix (P1 - This Week)

**T-001**: Add `/specweave:update-status` command
- **Priority**: P1 - CRITICAL
- **Estimate**: 2 hours
- **Deliverables**:
  - Command definition: `plugins/specweave/commands/specweave-update-status.md`
  - CLI script: `src/cli/update-status-line.ts`
  - Integration test: `tests/integration/core/status-line-force-update.test.ts`
- **Benefit**: User can manually fix stale cache immediately

**T-002**: Add default state message to cache
- **Priority**: P1 - CRITICAL
- **Estimate**: 1 hour
- **Deliverables**:
  - Update StatusLineUpdater to add `message` field
  - Update status line display logic (wherever it's rendered)
  - Unit test: `tests/unit/status-line/status-line-default-state.test.ts`
- **Benefit**: Clear UX when no increments active

### Phase 2: Automatic Refresh (P1 - Next Sprint)

**T-003**: Auto-refresh cache on increment closure
- **Priority**: P1 - CRITICAL
- **Estimate**: 3 hours
- **Deliverables**:
  - Modify MetadataManager.updateStatus() to call StatusLineUpdater.update()
  - Handle circular dependency risk (dynamic import or dependency injection)
  - Integration test: `tests/integration/core/status-line-auto-refresh.test.ts`
- **Benefit**: Cache always fresh, no manual intervention

**T-004**: Add cache staleness detection
- **Priority**: P2 - Important
- **Estimate**: 2 hours
- **Deliverables**:
  - Add age check to getCurrentCache()
  - Log warning if cache > 30 minutes old
  - Unit test: `tests/unit/status-line/status-line-staleness-detection.test.ts`
- **Benefit**: Early warning system for stale cache

### Phase 3: Documentation & Validation (P2 - Next Sprint)

**T-005**: Document status line refresh behavior
- **Priority**: P2 - Important
- **Estimate**: 1 hour
- **Deliverables**:
  - Update user guide with troubleshooting section
  - Add "Status Line Shows Wrong Increment" FAQ
  - Document `/specweave:update-status` command
- **Benefit**: Users know how to fix stale cache

**T-006**: Manual testing checklist
- **Priority**: P2 - Important
- **Estimate**: 1 hour
- **Tasks**:
  - [ ] Close increment → verify status line updates automatically
  - [ ] Close all increments → verify default state message shows
  - [ ] Run `/specweave:update-status` → verify manual refresh works
  - [ ] Create stale cache (edit timestamp) → verify staleness warning shows
- **Benefit**: Comprehensive validation before release

---

## Testing Strategy

### Unit Tests (90% coverage target)

**File**: `tests/unit/status-line/status-line-updater.test.ts`
- testUpdateRefreshesCache(): Verify update() scans increments and writes cache
- testUpdateSetsCurrentToNull(): When no open increments, current = null
- testUpdateAddsDefaultMessage(): When openCount = 0, message set
- testUpdateExcludesCompletedIncrements(): Only active/planning/in-progress counted
- testGetCurrentCacheReturnsNull(): When cache file missing, returns null
- testGetCurrentCacheWarnsIfStale(): When cache > 30 min old, warns user

**File**: `tests/unit/status-line/status-line-default-state.test.ts`
- testDefaultMessageWhenNoIncrements(): Verify message = "No active increments..."
- testNoMessageWhenIncrementsExist(): Verify message = undefined when openCount > 0

### Integration Tests

**File**: `tests/integration/core/status-line-force-update.test.ts`
- testForceUpdateCommand(): Execute /specweave:update-status → verify cache refreshed
- testForceUpdateWithNoIncrements(): Run command with 0 open → verify message shown
- testForceUpdateWithStaleCache(): Old cache → run command → verify updated

**File**: `tests/integration/core/status-line-auto-refresh.test.ts`
- testAutoRefreshOnIncrementClosure(): Close increment → verify cache updated
- testAutoRefreshOnPause(): Pause increment → verify cache refreshed
- testAutoRefreshFailureNonBlocking(): Mock updater failure → verify status still changes

### E2E Tests (Playwright)

**File**: `tests/e2e/status-line-lifecycle.test.ts`
- testFullLifecycle(): Create → work → close → verify status line updates
- testMultiIncrementWorkflow(): Create 2 → close 1 → verify status line shows remaining
- testDefaultStateDisplay(): Close all → verify default message shown

---

## Acceptance Criteria

**AC-001**: Manual force refresh command works
- **Given**: Status line cache is stale
- **When**: User runs `/specweave:update-status`
- **Then**: Cache is refreshed and status line shows correct increment

**AC-002**: Default state message shown when no increments
- **Given**: All increments are completed/paused/abandoned
- **When**: Status line is displayed
- **Then**: Message shows "No active increments. Start with /specweave:increment"

**AC-003**: Cache auto-refreshes on increment closure
- **Given**: Increment 0042 is active
- **When**: `/specweave:done 0042` is executed
- **Then**: Status line cache is refreshed within 1 second

**AC-004**: Staleness warning shown for old cache
- **Given**: Status line cache is > 30 minutes old
- **When**: Cache is read
- **Then**: Warning logged: "Status line cache is stale (X minutes old). Run /specweave:update-status"

**AC-005**: Completed increments excluded from status line
- **Given**: Increment 0042 is marked "completed"
- **When**: Status line cache is refreshed
- **Then**: 0042 is NOT shown as current increment

---

## Related Issues

**Primary Issue**: Status line shows stale increment data
- **User report**: "I see old status line state - it MUST be updated"
- **Evidence**: Status line shows 0042, but 0042 completed hours ago

**Secondary Issue**: Increment 0043 prematurely closed
- **User report**: "I see ACs are not checked in 0043 spec.md"
- **Evidence**: 9/24 tasks complete, many ACs unchecked
- **Root cause**: `/specweave:done` called before all work finished
- **Remediation**: Reopen 0043, complete remaining tasks, re-close with PM validation

---

## Conclusion

**Summary**:
The status line cache is stale (15+ hours old) because:
1. Cache not refreshed automatically when increments close
2. No default state for "no active increments" scenario
3. No manual command to force refresh

**Priority Fixes**:
1. ✅ Add `/specweave:update-status` command (immediate relief)
2. ✅ Add default state message (improve UX)
3. ✅ Auto-refresh cache on increment closure (long-term fix)

**User Impact**:
- Developer confusion (sees wrong increment)
- Poor UX (no guidance when no work active)
- Lost productivity (wasted time checking status)

**Estimated Effort**: 9 hours total (Phases 1-3)

**Recommended Timeline**:
- Phase 1 (T-001, T-002): This week (3 hours)
- Phase 2 (T-003, T-004): Next sprint (5 hours)
- Phase 3 (T-005, T-006): Next sprint (2 hours)

---

**Last Updated**: 2025-11-18
**Author**: Claude Code (Ultrathink Analysis)
**Status**: Analysis Complete
**Next Steps**:
1. Implement `/specweave:update-status` command (T-001)
2. Add default state message (T-002)
3. User feedback: Test manual refresh flow
4. Plan auto-refresh implementation (T-003)

---

**Appendix**: Evidence Files

- Status line cache: `.specweave/state/status-line.json`
- Increment 0042 metadata: `.specweave/increments/0042-test-infrastructure-cleanup/metadata.json`
- Increment 0042 spec: `.specweave/increments/0042-test-infrastructure-cleanup/spec.md`
- Increment 0043 metadata: `.specweave/increments/0043-spec-md-desync-fix/metadata.json`
- Increment 0043 spec: `.specweave/increments/0043-spec-md-desync-fix/spec.md`
- Status line updater: `src/core/status-line/status-line-updater.ts`
- Active increment config: `.specweave/config.json`
