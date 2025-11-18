# ULTRATHINK: Status Line Not Showing Active Increment

**Date**: 2025-11-18
**Analyst**: Claude (Sonnet 4.5)
**Context**: User reports status line empty despite increment 0042 being "active"

---

## Executive Summary

The status line is **working correctly** but reveals **THREE critical vocabulary mismatches** in SpecWeave's status management:

1. **TypeScript enum** uses: `'planning'`, `'active'`
2. **Spec files** use: `'planned'`, `'in-progress'` ❌ (non-standard!)
3. **Hook script** looks for: `'planning'`, `'in-progress'`, `'active'` (mixed vocabulary)

**Result**: Increment 0042 has `status: planned` in spec.md, which doesn't match ANY expected vocabulary, so it's ignored. Status line correctly shows increment 0038 (`status: in-progress`) instead.

---

## Observed Behavior

**User's screenshot shows**:
- Increment 0042 metadata.json: `"status": "active"`
- Status line: Empty / showing increment 0038
- Expectation: Should show increment 0042

---

## Investigation: Deep Dive

### 1. Current Status Line State

**Cache content** (`.specweave/state/status-line.json`):
```json
{
  "current": {
    "id": "0038-serverless-architecture-intelligence",
    "name": "0038-serverless-architecture-intelligence",
    "completed": 12,
    "total": 24,
    "percentage": 50
  },
  "openCount": 1,
  "lastUpdate": "2025-11-18T01:03:30Z"
}
```

**Observation**: Status line shows 0038, not 0042. Cache was updated recently (1 min ago).

---

### 2. Increment Status Analysis

| Increment | spec.md Status | metadata.json Status | Detected by Hook? |
|-----------|----------------|----------------------|-------------------|
| 0038 | `in-progress` | N/A | ✅ YES |
| 0040 | `completed` | N/A | ❌ NO |
| 0041 | `planned` | N/A | ❌ NO |
| 0042 | `planned` | `"active"` | ❌ NO |

**Key Finding**:
- **spec.md is source of truth** for status line hook
- **metadata.json is ignored** by the hook
- Only increment 0038 has a status (`in-progress`) that matches hook's detection logic

---

### 3. Hook Detection Logic Analysis

**File**: `plugins/specweave/hooks/lib/update-status-line.sh:49-52`

```bash
status=$(grep -m1 "^status:" "$spec_file" 2>/dev/null | cut -d: -f2 | tr -d ' ')

# Check if increment is open (active, in-progress, or planning)
if [[ "$status" == "active" ]] ||
   [[ "$status" == "in-progress" ]] ||
   [[ "$status" == "planning" ]]; then
  # ... count as active
fi
```

**Hook looks for**: `"active"`, `"in-progress"`, `"planning"`

---

### 4. TypeScript Enum Definition

**File**: `src/core/types/increment-metadata.ts:12-30`

```typescript
export enum IncrementStatus {
  /** Planning phase */
  PLANNING = 'planning',   // ← Official enum value

  /** Currently being worked on */
  ACTIVE = 'active',

  BACKLOG = 'backlog',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned'
}
```

**Official enum values**: `'planning'`, `'active'`
**NOT in enum**: `'planned'`, `'in-progress'`

---

### 5. Actual Spec File Usage (Project-Wide Analysis)

**Command**: `grep -h "^status:" .specweave/increments/*/spec.md | sort | uniq -c`

**Results**:
```
   6 status: completed     ✅ Matches enum
   2 status: planned       ❌ NOT IN ENUM! (should be 'planning')
   1 status: in-progress   ❌ NOT IN ENUM! (should be 'active')
   1 status: "completed"   ⚠️  Old format with quotes
```

---

## Root Cause: Vocabulary Mismatch Cascade

### Issue 1: Spec Files Use Non-Standard Values

**Expected (from enum)**:
- `status: planning` (for planning phase)
- `status: active` (for in-progress work)

**Actual usage**:
- `status: planned` ❌ (no such enum value!)
- `status: in-progress` ❌ (no such enum value!)

**Where this comes from**:
- Likely manual editing or old spec generator templates
- Human-readable values (`planned`, `in-progress`) instead of enum values

---

### Issue 2: Hook Uses Mixed Vocabulary

**Hook expects**: `"active"` OR `"in-progress"` OR `"planning"`

**Problems**:
1. Hook looks for `"in-progress"` (non-enum value) ← Accommodates bad data
2. Hook looks for `"planning"` (correct enum) ← Good
3. Hook doesn't look for `"planned"` ← Misses increment 0042!

**Result**: Hook is trying to bridge enum and non-standard values, but misses `planned`.

---

### Issue 3: Metadata.json vs Spec.md Sync Gap

**Increment 0042**:
- `metadata.json`: `"status": "active"` ← Created by CLI tool
- `spec.md`: `status: planned` ← Manual edit or template

**Why the mismatch?**
1. CLI creates `metadata.json` with enum values (`"active"`)
2. Spec generator creates `spec.md` with human values (`planned`)
3. No sync validation between the two files

---

## Why Status Line Shows Increment 0038

**Decision tree**:
1. Hook scans all spec.md files
2. Finds these statuses:
   - 0038: `in-progress` ✅ (matches hook's detection)
   - 0040: `completed` ❌ (not active)
   - 0041: `planned` ❌ (hook doesn't recognize)
   - 0042: `planned` ❌ (hook doesn't recognize)
3. Only 0038 matches → **openCount = 1**
4. 0038 is oldest (created 2025-11-16) → **selected as current**
5. Status line shows: `[0038-serverless-architecture-intelligence] ████░░░░ 12/24`

**Conclusion**: Hook is working correctly based on its logic. The problem is vocabulary mismatch.

---

## Impact Analysis

### Immediate Impact

**User confusion**:
- User sees metadata.json says `"status": "active"` for 0042
- Status line doesn't show 0042
- Unclear which increment is actually "active"

**Data inconsistency**:
- 2 increments with `status: planned` in spec.md
- 1 increment with `"status": "active"` in metadata.json
- No single source of truth for increment status

---

### Broader Impact

**Vocabulary drift across codebase**:
```
TypeScript enum    → 'planning', 'active'
Spec frontmatter   → 'planned', 'in-progress'
Hook detection     → 'planning', 'in-progress', 'active' (all three!)
metadata.json      → 'active', 'planning' (enum values)
```

**This creates**:
1. Confusion for contributors (which value to use?)
2. Brittle detection logic (hook must know ALL variations)
3. Sync issues (metadata.json ≠ spec.md)
4. Testing complexity (must test all vocabulary variations)

---

## Recommended Fixes

### Fix 1: Standardize on Enum Values (CRITICAL)

**Action**: Update all spec.md files to use official enum values

```bash
# Fix all spec files:
find .specweave/increments -name "spec.md" -exec sed -i '' \
  -e 's/^status: planned/status: planning/g' \
  -e 's/^status: in-progress/status: active/g' \
  {} +
```

**Result**:
- All specs use enum vocabulary
- Hook detection becomes predictable
- metadata.json and spec.md sync naturally

---

### Fix 2: Update Hook to Match Enum (MEDIUM)

**File**: `plugins/specweave/hooks/lib/update-status-line.sh:52`

**Change**:
```bash
# BEFORE (mixed vocabulary):
if [[ "$status" == "active" ]] ||
   [[ "$status" == "in-progress" ]] ||
   [[ "$status" == "planning" ]]; then

# AFTER (enum-only vocabulary):
if [[ "$status" == "active" ]] ||
   [[ "$status" == "planning" ]]; then
```

**Rationale**:
- Remove support for `in-progress` (non-enum)
- Only detect official enum values
- Forces spec files to use correct vocabulary

---

### Fix 3: Add Validation Hook (LONG-TERM)

**Create**: `plugins/specweave/hooks/lib/validate-spec-status.sh`

**Logic**:
1. Run on spec.md save
2. Parse `status:` value
3. Check against `IncrementStatus` enum
4. Error if non-standard value detected
5. Suggest correct value

**Example error**:
```
❌ Invalid status 'planned' in spec.md
✅ Did you mean 'planning'? (official enum value)

Valid statuses: planning, active, backlog, paused, completed, abandoned
```

---

### Fix 4: Sync metadata.json ↔ spec.md (CRITICAL)

**Problem**: Two files can drift out of sync

**Solution**: Make spec.md YAML frontmatter the **single source of truth**

**Implementation**:
1. Remove `status` field from `metadata.json` entirely
2. All tools read status from spec.md frontmatter
3. metadata.json only tracks timestamps (created, lastActivity)

**Benefits**:
- Single source of truth (no sync issues)
- spec.md is human-editable (good UX)
- metadata.json becomes pure metadata (timestamps, counters)

---

## Spec Vocabulary Standard (Proposed)

### Official Status Values (from IncrementStatus enum)

| Status | When to Use | Counts Toward WIP? |
|--------|-------------|-------------------|
| `planning` | Creating spec/plan/tasks | ❌ No |
| `active` | Currently executing tasks | ✅ Yes |
| `backlog` | Planned but not started | ❌ No |
| `paused` | Blocked/deprioritized | ✅ Yes |
| `completed` | All tasks done | ❌ No |
| `abandoned` | Cancelled/obsolete | ❌ No |

### Deprecated Values (NEVER USE)

| Value | Why Deprecated | Use Instead |
|-------|---------------|-------------|
| `planned` | Not in enum | `planning` |
| `in-progress` | Not in enum | `active` |
| `"completed"` | Old quoted format | `completed` |

---

## Migration Plan

### Phase 1: Immediate (30 min)

1. ✅ Fix increment 0042 spec.md: `status: planned` → `status: planning`
2. ✅ Fix increment 0038 spec.md: `status: in-progress` → `status: active`
3. ✅ Run hook manually to update status line
4. ✅ Verify status line shows correct increment

### Phase 2: Project-Wide Cleanup (1 hour)

1. Audit all spec.md files for non-standard status values
2. Run automated migration script (Fix 1 above)
3. Update spec generator templates to use enum values
4. Update hook to only accept enum values (Fix 2)

### Phase 3: Validation (2 hours)

1. Create validation hook (Fix 3)
2. Add pre-commit check for spec.md status values
3. Add unit tests for status validation
4. Document status vocabulary in CLAUDE.md

### Phase 4: Architecture Fix (4 hours)

1. Implement single source of truth (Fix 4)
2. Remove status from metadata.json
3. Update all tools to read from spec.md
4. Migration script for existing projects

---

## Testing Checklist

After applying fixes:

- [ ] Run hook: `bash plugins/specweave/hooks/lib/update-status-line.sh`
- [ ] Check cache: `cat .specweave/state/status-line.json`
- [ ] Verify current increment is 0042 (not 0038)
- [ ] Run `/specweave:status` to see all increments
- [ ] Check status line in UI shows `[0042-test-infrastructure-cleanup]`

---

## Lessons Learned

1. **Vocabulary drift is insidious**: Small inconsistencies (planned vs planning) cascade into big issues
2. **Multiple sources of truth create sync problems**: metadata.json vs spec.md
3. **Type safety stops at TypeScript boundary**: Shell scripts don't validate enum values
4. **Human-readable ≠ correct**: "planned" feels natural but breaks tooling
5. **Detection logic shouldn't be flexible**: Hook supporting multiple vocabularies hides the problem

---

## Related Issues

- **Increment 0042**: Blocked by this status line issue
- **spec.md templates**: Need to use enum values
- **Hook vocabulary**: Too permissive, accepts bad data
- **Validation gap**: No pre-commit check for status values

---

## Appendix: Full Status Line Flow

```
1. User makes change (e.g., completes task)
     ↓
2. Hook: user-prompt-submit.sh triggers
     ↓
3. Hook: update-status-line.sh runs (async)
     ↓
4. Scan .specweave/increments/*/spec.md
     ↓
5. grep "^status:" to find active increments
     ↓
6. Filter: status IN ["active", "in-progress", "planning"]  ← VOCABULARY CHECK
     ↓
7. Sort by created date (oldest first)
     ↓
8. Take first as "current increment"
     ↓
9. Parse tasks.md for progress (via count-tasks.js)
     ↓
10. Write to .specweave/state/status-line.json
     ↓
11. StatusLineManager reads cache
     ↓
12. Render: [increment-name] ████░░░░ X/Y tasks
     ↓
13. Display in status line UI
```

**Failure point**: Step 6 - vocabulary check fails for `"planned"` status

---

## Immediate Action Required

**For increment 0042 to show in status line**:

```bash
# Edit spec.md frontmatter:
vim .specweave/increments/0042-test-infrastructure-cleanup/spec.md

# Change line 5:
status: planned
# To:
status: planning

# Run hook manually:
bash plugins/specweave/hooks/lib/update-status-line.sh

# Verify:
cat .specweave/state/status-line.json | jq '.current.id'
# Should show: "0042-test-infrastructure-cleanup"
```

---

**Analysis complete. Root cause identified. Fixes proposed. Ready for implementation.**
