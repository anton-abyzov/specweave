# ULTRATHINK: Multiple Active Increments Status Line Support

**Date**: 2025-11-18
**Context**: Status line force update enhancement
**Problem**: Status line only shows ONE active increment, but system supports UP TO 2
**Analyst**: Claude (Sonnet 4.5)

---

## Problem Statement

### Current Issue

**User Feedback**: "update should work not only for the latest, as there might be several in progress (active incs)"

**Current Behavior**:
```typescript
// StatusLineCache (types.ts)
current: CurrentIncrement | null;  // ❌ ONLY ONE INCREMENT

// Status Line Display
[0043] ████░░░░ 5/8 tasks (2 open)
       ↑ Shows ONLY first increment
```

**Expected Behavior**:
```typescript
// StatusLineCache (enhanced)
activeIncrements: CurrentIncrement[];  // ✅ UP TO 2 INCREMENTS

// Status Line Display (2 active)
[0043] ████░░░░ 5/8 | [0044] ██████░░ 6/8 (2 open)
       ↑ First           ↑ Second
```

---

## Root Cause Analysis

### Architecture Mismatch

**ActiveIncrementManager** (core/increment/active-increment-manager.ts):
```typescript
// ✅ SUPPORTS UP TO 2 ACTIVE INCREMENTS
export interface ActiveIncrementState {
  ids: string[];  // Array of active increment IDs (max 2)
  lastUpdated: string;
}

// Example:
{
  "ids": ["0043-feature", "0044-hotfix"],
  "lastUpdated": "2025-11-18T20:00:00Z"
}
```

**StatusLineCache** (core/status-line/types.ts):
```typescript
// ❌ ONLY SUPPORTS 1 ACTIVE INCREMENT
export interface StatusLineCache {
  current: CurrentIncrement | null;  // SINGLE increment
  openCount: number;
  lastUpdate: string;
}

// Example:
{
  "current": {
    "id": "0043-feature",
    "completed": 5,
    "total": 8
  },
  "openCount": 2  // ⚠️ Says 2 open, but only shows 1!
}
```

**Mismatch**:
- `ActiveIncrementManager` tracks **up to 2** active increments
- `StatusLineCache` only stores/displays **1** increment
- **Result**: Status line misleads user (says "2 open" but only shows 1)

---

## Current Implementation Flow

```
StatusLineUpdater.update()
  ↓
findOpenIncrements() → ["0043-feature", "0044-hotfix"]
  ↓
Sort by created date (oldest first)
  ↓
current = sorted[0]  // ❌ TAKES ONLY FIRST!
  ↓
cache = {
  current: { id: "0043-feature", ... },  // Only first
  openCount: 2  // ⚠️ Misleading!
}
```

**Problem**: We scan ALL increments but only use the FIRST one!

---

## Solution Design

### Option 1: Support Multiple Increments (RECOMMENDED)

**Architecture Change**:

```typescript
// OLD (types.ts)
export interface StatusLineCache {
  current: CurrentIncrement | null;  // SINGLE
  openCount: number;
  lastUpdate: string;
}

// NEW (types.ts)
export interface StatusLineCache {
  activeIncrements: CurrentIncrement[];  // ARRAY (max 2)
  openCount: number;
  lastUpdate: string;

  // DEPRECATED (backward compatibility)
  current?: CurrentIncrement | null;
}
```

**StatusLineUpdater Changes**:

```typescript
async update(): Promise<void> {
  const openIncrements = await this.findOpenIncrements();

  // Sort by lastActivity (most recent first)
  const sorted = openIncrements.sort((a, b) => {
    return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
  });

  // Take UP TO 2 active increments
  const activeIds = sorted.slice(0, 2);

  // Parse progress for EACH increment
  const activeIncrements: CurrentIncrement[] = [];
  for (const inc of activeIds) {
    const progress = await this.parseTaskProgress(inc.id);
    activeIncrements.push({
      id: inc.id,
      name: inc.id,
      completed: progress.completed,
      total: progress.total,
      percentage: progress.percentage
    });
  }

  // Write cache
  const cache: StatusLineCache = {
    activeIncrements,
    openCount: openIncrements.length,
    lastUpdate: new Date().toISOString(),

    // Backward compatibility: Set 'current' to first active
    current: activeIncrements[0] || null
  };

  await this.writeCache(cache);
}
```

**StatusLineManager Changes**:

```typescript
private formatStatusLine(cache: StatusLineCache): string {
  const parts: string[] = [];

  // Show ALL active increments (up to 2)
  const increments = cache.activeIncrements || [cache.current].filter(Boolean);

  for (const inc of increments) {
    const name = this.truncate(inc.name, 20);
    const bar = this.renderProgressBar(inc.completed, inc.total);
    parts.push(`[${name}] ${bar} ${inc.completed}/${inc.total}`);
  }

  // Open count (if more than active count)
  if (cache.openCount > increments.length) {
    parts.push(`(+${cache.openCount - increments.length} more)`);
  }

  return parts.join(' | ');
}

// Example outputs:
// 1 active:  [0043-feature] ████░░░░ 5/8
// 2 active:  [0043-feature] ████░░░░ 5/8 | [0044-hotfix] ██████░░ 6/8
// 3+ open:   [0043-feature] ████░░░░ 5/8 | [0044-hotfix] ██████░░ 6/8 (+1 more)
```

**Benefits**:
- ✅ Shows progress for ALL active increments
- ✅ Aligns with ActiveIncrementManager (max 2)
- ✅ Backward compatible (keeps `current` field)
- ✅ Informative (user sees all work in progress)

**Drawbacks**:
- ⚠️ Longer status line (may need truncation)
- ⚠️ Breaking change for cache format

---

### Option 2: Keep Single Increment, Improve Selection (REJECTED)

**Idea**: Keep showing only 1 increment, but improve which one is selected

**Selection Logic**:
1. Prefer hotfix/bug over feature
2. Prefer most recently active
3. Prefer highest priority

**Why Rejected**:
- ❌ Still misleading (says "2 open" but shows 1)
- ❌ User has no visibility into second increment
- ❌ Doesn't solve original problem

---

### Option 3: Carousel/Rotation (REJECTED)

**Idea**: Rotate status line between active increments every N seconds

**Example**:
```
T+0s:  [0043-feature] ████░░░░ 5/8 (1/2)
T+5s:  [0044-hotfix] ██████░░ 6/8 (2/2)
T+10s: [0043-feature] ████░░░░ 5/8 (1/2)
```

**Why Rejected**:
- ❌ Complex implementation (requires timer)
- ❌ Confusing UX (status line keeps changing)
- ❌ Doesn't work well in static environments

---

## Implementation Plan

### Phase 1: Enhance Types (Backward Compatible)

**File**: `src/core/status-line/types.ts`

```typescript
export interface StatusLineCache {
  /** NEW: Array of active increments (up to 2) */
  activeIncrements: CurrentIncrement[];

  /** Total number of open increments */
  openCount: number;

  /** ISO timestamp of last cache update */
  lastUpdate: string;

  /** DEPRECATED: Use activeIncrements[0] instead (backward compatibility) */
  current?: CurrentIncrement | null;
}
```

**Migration Strategy**:
- New code writes BOTH `activeIncrements` AND `current` (compatibility)
- Old code reads `current` (keeps working)
- New code reads `activeIncrements` (enhanced)

---

### Phase 2: Update StatusLineUpdater

**File**: `src/core/status-line/status-line-updater.ts`

**Changes**:

1. **Update `update()` method**:
   ```typescript
   // OLD: Take first increment
   const current = sorted[0] || null;

   // NEW: Take up to 2 increments
   const activeIds = sorted.slice(0, 2);
   const activeIncrements = await Promise.all(
     activeIds.map(async (inc) => {
       const progress = await this.parseTaskProgress(inc.id);
       return {
         id: inc.id,
         name: inc.id,
         ...progress
       };
     })
   );
   ```

2. **Update cache format**:
   ```typescript
   const cache: StatusLineCache = {
     activeIncrements,
     openCount: openIncrements.length,
     lastUpdate: new Date().toISOString(),
     // Backward compatibility
     current: activeIncrements[0] || null
   };
   ```

---

### Phase 3: Update StatusLineManager

**File**: `src/core/status-line/status-line-manager.ts`

**Changes**:

1. **Update `formatStatusLine()` method**:
   ```typescript
   private formatStatusLine(cache: StatusLineCache): string {
     const parts: string[] = [];

     // Support both new and old format
     const increments = cache.activeIncrements ||
       (cache.current ? [cache.current] : []);

     // Show each active increment
     for (const inc of increments) {
       const name = this.truncate(inc.name, 20);
       const bar = this.renderProgressBar(inc.completed, inc.total);
       parts.push(`[${name}] ${bar} ${inc.completed}/${inc.total}`);
     }

     // Show remaining open count
     if (cache.openCount > increments.length) {
       parts.push(`(+${cache.openCount - increments.length} more)`);
     }

     return parts.join(' | ');
   }
   ```

2. **Add length limit**:
   ```typescript
   private formatStatusLine(cache: StatusLineCache): string {
     const formatted = // ... (see above)

     // Truncate if too long (max 80 chars for status line)
     if (formatted.length > 80) {
       return this.truncate(formatted, 77) + '...';
     }

     return formatted;
   }
   ```

---

### Phase 4: Update Tests

**Unit Tests** (`tests/unit/status-line/status-line-updater.test.ts`):

Add tests for:
```typescript
it('should include multiple active increments in cache', async () => {
  await createIncrement(testRoot, '0043-feature', 'active', '2025-11-01');
  await createIncrement(testRoot, '0044-hotfix', 'active', '2025-11-02');

  await updater.update();

  const cache = await updater.getCurrentCache();
  expect(cache?.activeIncrements).toHaveLength(2);
  expect(cache?.activeIncrements[0].id).toBe('0043-feature');
  expect(cache?.activeIncrements[1].id).toBe('0044-hotfix');
});

it('should limit to 2 active increments', async () => {
  await createIncrement(testRoot, '0043-first', 'active', '2025-11-01');
  await createIncrement(testRoot, '0044-second', 'active', '2025-11-02');
  await createIncrement(testRoot, '0045-third', 'active', '2025-11-03');

  await updater.update();

  const cache = await updater.getCurrentCache();
  expect(cache?.activeIncrements).toHaveLength(2);
  expect(cache?.openCount).toBe(3);
});

it('should maintain backward compatibility with current field', async () => {
  await createIncrement(testRoot, '0043-feature', 'active', '2025-11-01');

  await updater.update();

  const cache = await updater.getCurrentCache();
  expect(cache?.current).not.toBeNull();
  expect(cache?.current?.id).toBe('0043-feature');
  expect(cache?.activeIncrements[0]).toEqual(cache?.current);
});
```

**Integration Tests** (`tests/integration/core/status-line-force-update.test.ts`):

Add tests for:
```typescript
it('should show multiple active increments in status line', async () => {
  await createIncrementWithTasks(testRoot, '0043-feature', 'active', 5, 8);
  await createIncrementWithTasks(testRoot, '0044-hotfix', 'active', 6, 8);

  await updater.update();

  const statusLine = manager.render();
  expect(statusLine).toContain('0043');
  expect(statusLine).toContain('0044');
  expect(statusLine).toContain('|'); // Separator
  expect(statusLine).toContain('5/8');
  expect(statusLine).toContain('6/8');
});

it('should show +N more for additional open increments', async () => {
  await createIncrement(testRoot, '0043-active1', 'active', '2025-11-01');
  await createIncrement(testRoot, '0044-active2', 'active', '2025-11-02');
  await createIncrement(testRoot, '0045-planning', 'planning', '2025-11-03');

  await updater.update();

  const statusLine = manager.render();
  expect(statusLine).toContain('(+1 more)'); // 3 open, showing 2
});
```

---

## Migration Strategy

### Backward Compatibility

**Old Code** (reads `current` field):
```typescript
const cache = await updater.getCurrentCache();
const incrementId = cache?.current?.id;  // ✅ Still works
```

**New Code** (reads `activeIncrements` array):
```typescript
const cache = await updater.getCurrentCache();
const activeIds = cache?.activeIncrements.map(i => i.id);  // ✅ Enhanced
```

**Cache Format** (both fields present):
```json
{
  "activeIncrements": [
    { "id": "0043-feature", "completed": 5, "total": 8, "percentage": 62 },
    { "id": "0044-hotfix", "completed": 6, "total": 8, "percentage": 75 }
  ],
  "openCount": 2,
  "lastUpdate": "2025-11-18T20:00:00Z",
  "current": { "id": "0043-feature", "completed": 5, "total": 8, "percentage": 62 }
}
```

---

## Edge Cases

### 1. Only 1 Active Increment
```typescript
activeIncrements: [{ id: "0043-feature", ... }]
openCount: 1

// Display: [0043-feature] ████░░░░ 5/8
```

### 2. Exactly 2 Active Increments
```typescript
activeIncrements: [
  { id: "0043-feature", ... },
  { id: "0044-hotfix", ... }
]
openCount: 2

// Display: [0043-feature] ████░░░░ 5/8 | [0044-hotfix] ██████░░ 6/8
```

### 3. More than 2 Open Increments
```typescript
activeIncrements: [
  { id: "0043-feature", ... },
  { id: "0044-hotfix", ... }
]
openCount: 4  // 2 active + 2 planning

// Display: [0043-feature] ████░░░░ 5/8 | [0044-hotfix] ██████░░ 6/8 (+2 more)
```

### 4. No Active Increments
```typescript
activeIncrements: []
openCount: 0

// Display: No active increment
```

### 5. Status Line Too Long (>80 chars)
```typescript
// Before truncation:
[0043-very-long-feature-name] ████░░░░ 5/8 | [0044-another-long-hotfix-name] ██████░░ 6/8

// After truncation:
[0043-very-long-feature-name] ████░░░░ 5/8 | [0044-another-long-hotf...
```

---

## Success Criteria

### Must Have
- ✅ `StatusLineCache` supports `activeIncrements` array
- ✅ `StatusLineUpdater` includes up to 2 active increments
- ✅ `StatusLineManager` displays all active increments
- ✅ Backward compatibility (keeps `current` field)
- ✅ Unit tests updated (multiple increments)
- ✅ Integration tests updated (status line display)
- ✅ Build succeeds

### Should Have
- ✅ Status line shows `+N more` for additional open increments
- ✅ Status line truncates if >80 chars
- ✅ Selection prioritizes most recently active
- ✅ Tests cover edge cases (0, 1, 2, 3+ increments)

### Nice to Have
- ⚠️ Configurable max active increments (default 2)
- ⚠️ Prioritize hotfix/bug over feature
- ⚠️ Color-coded progress bars (red for hotfix, blue for feature)

---

## Performance Impact

**Before** (single increment):
- Parse 1 tasks.md file
- Total: ~50ms

**After** (up to 2 increments):
- Parse 2 tasks.md files
- Total: ~80ms (+30ms)

**Acceptable**: Still under 100ms threshold for user-facing commands

---

## Risk Assessment

### Low Risk
- **Backward compatibility**: Old code keeps working
- **Test coverage**: Comprehensive unit + integration tests
- **Atomic writes**: No cache corruption

### Medium Risk
- **Status line length**: May exceed 80 chars
  - Mitigation: Truncate with ellipsis
- **UX confusion**: Multiple progress bars
  - Mitigation: Clear separator (`|`)

### High Risk
- **None identified**

---

## Conclusion

**Recommended Solution**: Option 1 (Support Multiple Increments)

**Benefits**:
- ✅ Aligns with `ActiveIncrementManager` (max 2)
- ✅ User sees ALL active work in progress
- ✅ Backward compatible (no breaking changes)
- ✅ Fixes misleading "2 open" message

**Implementation Effort**: ~2 hours
- Types update: 15 min
- StatusLineUpdater: 30 min
- StatusLineManager: 30 min
- Tests: 45 min

**Next Steps**:
1. Update `StatusLineCache` type (add `activeIncrements` array)
2. Update `StatusLineUpdater.update()` (parse up to 2 increments)
3. Update `StatusLineManager.formatStatusLine()` (display all active)
4. Add unit tests (multiple increments)
5. Add integration tests (status line display)
6. Update documentation

---

**Analysis Complete** ✓
