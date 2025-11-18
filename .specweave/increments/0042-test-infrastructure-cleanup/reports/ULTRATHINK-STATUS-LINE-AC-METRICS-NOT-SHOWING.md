# ULTRATHINK: Status Line AC Metrics Not Showing

**Date**: 2025-11-18
**Priority**: P0 (CRITICAL - User-Facing Issue)
**Status**: INVESTIGATING

---

## Problem Statement

**OBSERVED**: User's status line shows:
```
[0043-spec-md-desync...] █████░░░ 11/24
```

**EXPECTED**: Should show:
```
[0043-spec-md-desync...] █████░░░ 11/24 tasks | X/Y ACs
```

**CRITICAL**: AC metrics are NOT displaying despite implementation being complete!

---

## Root Cause Analysis

### Implementation Status (What Was Done)

✅ **Step 1: Types Updated** (`src/core/status-line/types.ts`)
```typescript
export interface CurrentIncrement {
  completed: number;
  total: number;
  acsCompleted?: number;  // ✅ ADDED
  acsTotal?: number;      // ✅ ADDED
}
```

✅ **Step 2: Manager Updated** (`src/core/status-line/status-line-manager.ts`)
```typescript
// AC count (if available)
if (inc.acsTotal !== undefined && inc.acsCompleted !== undefined) {
  incrementParts.push(`${inc.acsCompleted}/${inc.acsTotal} ACs`);
}
```

✅ **Step 3: Hook Updated** (`plugins/specweave/hooks/lib/update-status-line.sh`)
```bash
# Count total ACs
TOTAL_ACS=$(grep -cE '^- \[(x| )\] \*\*AC-' "$SPEC_FILE")

# Count completed ACs
COMPLETED_ACS=$(grep -cE '^- \[x\] \*\*AC-' "$SPEC_FILE")

# Write to cache
jq -n '{
  current: {
    ...
    acsCompleted: $acsCompleted,
    acsTotal: $acsTotal
  }
}'
```

### Why AC Metrics Not Showing

**ROOT CAUSE 1: Cache Not Updated**
- Hook hasn't run since code changes
- Existing cache file has old format (no AC fields)
- Manager gracefully handles missing AC fields (shows tasks only)

**ROOT CAUSE 2: Hook Not Executed**
- Post-task-completion hook only runs on TodoWrite
- User hasn't triggered TodoWrite since implementation
- Cache still has stale data from before AC metrics were added

**ROOT CAUSE 3: Build May Be Stale**
- TypeScript changes require rebuild
- Hook script changes require no rebuild (bash)
- Manager changes require rebuild for CLI usage

---

## Verification Steps

### Step 1: Check Current Cache

```bash
cat .specweave/state/status-line.json | jq .
```

**Expected** (NEW):
```json
{
  "current": {
    "id": "0043-spec-md-desync-fix",
    "name": "0043-spec-md-desync-fix",
    "completed": 11,
    "total": 24,
    "percentage": 45,
    "acsCompleted": 15,  // ← SHOULD BE HERE
    "acsTotal": 32       // ← SHOULD BE HERE
  },
  "openCount": 1,
  "lastUpdate": "2025-11-18T..."
}
```

**Actual** (OLD):
```json
{
  "current": {
    "id": "0043-spec-md-desync-fix",
    "name": "0043-spec-md-desync-fix",
    "completed": 11,
    "total": 24,
    "percentage": 45
    // ← NO AC FIELDS!
  },
  "openCount": 1,
  "lastUpdate": "..."
}
```

### Step 2: Manual Hook Execution

Force cache update:
```bash
bash plugins/specweave/hooks/lib/update-status-line.sh
```

Then check cache again.

### Step 3: Verify AC Counting Logic

Test AC counting in spec.md:
```bash
# Count total ACs
grep -cE '^- \[(x| )\] \*\*AC-' .specweave/increments/0043-spec-md-desync-fix/spec.md

# Count completed ACs
grep -cE '^- \[x\] \*\*AC-' .specweave/increments/0043-spec-md-desync-fix/spec.md

# Count open ACs
grep -cE '^- \[ \] \*\*AC-' .specweave/increments/0043-spec-md-desync-fix/spec.md
```

### Step 4: Test Status Line Rendering

After cache update:
```bash
node dist/src/cli/status-line.js
```

Should show: `X/Y tasks | A/B ACs`

---

## Immediate Fixes Required

### Fix 1: Force Cache Update (IMMEDIATE)

**Action**: Run hook manually to regenerate cache with AC metrics

**Command**:
```bash
bash plugins/specweave/hooks/lib/update-status-line.sh
```

**Verification**:
```bash
cat .specweave/state/status-line.json | jq '.current | {completed, total, acsCompleted, acsTotal}'
```

**Expected Output**:
```json
{
  "completed": 11,
  "total": 24,
  "acsCompleted": 15,
  "acsTotal": 32
}
```

### Fix 2: Add Status Line Force Update Command

**Need**: `/specweave:update-status-line` command to force cache refresh

**Why**: Users can't wait for TodoWrite to trigger hook

**Implementation**: New command that runs update-status-line.sh manually

### Fix 3: Clear Old Cache on Startup

**Need**: Detect old cache format and auto-regenerate

**Logic**:
```typescript
const cache = readCache();
if (cache.current && !cache.current.acsCompleted) {
  // Old format detected - regenerate cache
  execSync('bash plugins/specweave/hooks/lib/update-status-line.sh');
}
```

---

## Testing After Fix

### Test 1: Verify Cache Has AC Metrics

```bash
cat .specweave/state/status-line.json | jq '.current'
```

Should include `acsCompleted` and `acsTotal`.

### Test 2: Verify Status Line Shows AC Metrics

Run status line renderer:
```bash
node dist/src/cli/status-line.js
```

Should show: `[0043-...] ████░░░░ 11/24 tasks | 15/32 ACs`

### Test 3: Verify Hook Updates AC Metrics

1. Check 1 AC in spec.md: `- [ ] **AC-...` → `- [x] **AC-...`
2. Trigger hook (via TodoWrite or manual)
3. Check cache updated: `acsCompleted` increased by 1
4. Verify status line shows new count

---

## Long-Term Solutions

### Solution 1: Auto-Update on Claude Code Startup

Add to `.claude/hooks/startup.sh`:
```bash
# Regenerate status line cache on startup
if [ -d ".specweave" ]; then
  bash plugins/specweave/hooks/lib/update-status-line.sh &
fi
```

### Solution 2: Cache Version Detection

Add version field to cache:
```json
{
  "version": 2,  // v2 includes AC metrics
  "current": { ... }
}
```

If version < 2, auto-regenerate.

### Solution 3: Real-Time AC Counting

Instead of cache, count ACs on-demand:
- Pros: Always accurate
- Cons: Slower (file reads on every render)

**Decision**: Keep cache for performance, but add version detection.

---

## Action Items

**IMMEDIATE** (P0):
1. ✅ Run manual hook execution to update cache
2. ✅ Verify cache has AC metrics
3. ✅ Verify status line displays AC metrics
4. ✅ Test with user's increment (0043)

**SHORT-TERM** (P1):
1. Add `/specweave:update-status-line` force update command
2. Add cache version detection (auto-regenerate old format)
3. Document cache format change in CHANGELOG

**LONG-TERM** (P2):
1. Add startup hook to regenerate cache
2. Add cache staleness detection (warn if > 24h old)
3. Monitor AC metrics usage/adoption

---

## Related Issues

**Issue 1: Multiple Active Increments**
- Current implementation supports up to 2 active increments
- Each should show AC metrics
- Need to test with multiple increments

**Issue 2: Increments Without ACs**
- Some increments might have 0 ACs
- Manager handles gracefully (shows `0/0 ACs` or nothing)
- Need to define desired behavior

**Issue 3: AC Count Accuracy**
- Regex pattern: `^- \[(x| )\] \*\*AC-`
- Must match EXACTLY: `- [x] **AC-US1-01**:`
- Need to verify pattern matches all AC formats

---

## Success Criteria

✅ **Criteria 1**: Cache includes AC metrics
✅ **Criteria 2**: Status line displays AC metrics
✅ **Criteria 3**: Hook updates AC metrics correctly
✅ **Criteria 4**: AC count accuracy matches manual count
✅ **Criteria 5**: User sees: `X/Y tasks | A/B ACs`

---

## Conclusion

**DIAGNOSIS**: Implementation is correct, but cache has stale data (pre-AC-metrics format).

**FIX**: Run hook manually to regenerate cache with AC metrics.

**PREVENTION**: Add cache version detection and auto-regeneration logic.

**TIMELINE**: Fix in < 5 minutes (manual hook execution).

---

**NEXT STEP**: Execute manual hook update and verify AC metrics display correctly.
