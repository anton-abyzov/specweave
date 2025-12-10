# Progress Command Missing Statuses - Root Cause Analysis

**Date**: 2025-12-09
**Severity**: High (User-facing bug)
**Status**: Fixed
**Version**: 0.33.1+

## Problem

The `/specweave:progress` command shows "No active increments" even when increments exist with work in progress (status: `ready_for_review` or `backlog`).

## Root Cause

Multiple status-filtering locations were hardcoded with an incomplete list of "active" statuses, missing the `ready_for_review` and `backlog` statuses that were added in v0.28.63.

### Status Evolution

**v0.28.63 Added:**
- `READY_FOR_REVIEW = 'ready_for_review'` - All tasks complete, awaiting user review
- Purpose: Prevent auto-completion bugs by requiring explicit `/specweave:done` approval

**Type Definition** ([src/core/types/increment-metadata.ts:12-44](src/core/types/increment-metadata.ts#L12-L44)):
```typescript
export enum IncrementStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  BACKLOG = 'backlog',
  PAUSED = 'paused',
  READY_FOR_REVIEW = 'ready_for_review',  // ← Added v0.28.63
  COMPLETED = 'completed',
  ABANDONED = 'abandoned'
}
```

**Status Semantics:**
- **Active-like** (should show in progress): `active`, `planning`, `backlog`, `ready_for_review`
- **Inactive** (should NOT show in progress): `paused`, `completed`, `abandoned`

### Affected Files

All 8 locations were filtering with the incomplete list `['active', 'planning', 'in-progress']`:

1. **plugins/specweave/scripts/progress.js:121**
   - Filter: `['active', 'planning', 'in-progress']`
   - Impact: Progress command shows no increments

2. **plugins/specweave/scripts/status.js:143-145**
   - Active count missing `ready_for_review` and `backlog`
   - Impact: Active count in summary line is wrong

3. **plugins/specweave/scripts/read-jobs.sh:113**
   - jq filter: `status == "active" or "planning" or "in-progress"`
   - Impact: Jobs command doesn't show in-progress work

4. **plugins/specweave/scripts/read-progress.sh:132**
   - jq filter: Same as above
   - Impact: Duplicate of progress.js issue

5. **plugins/specweave/hooks/post-metadata-change.sh:227**
   - Case statement: `active|planning|in-progress`
   - Impact: Active increment not registered on status change

6. **plugins/specweave/hooks/user-prompt-submit.sh:194**
   - Condition: `status == "active" || "planning" || "in-progress"`
   - Impact: Hook doesn't detect active increments

7. **plugins/specweave/hooks/lib/update-active-increment.sh:57**
   - Condition: Same as above
   - Impact: Active increment state not updated

8. **plugins/specweave/hooks/lib/update-status-line.sh:132**
   - Condition: Same as above
   - Impact: Status line doesn't update

9. **src/core/status-line/status-line-updater.ts:142-146**
   - TypeScript filter: Missing `backlog` and `ready_for_review`
   - Impact: Status line cache doesn't include these statuses

### Additional Bugs Found

1. **Invalid status `'in-progress'` (hyphenated)**
   - Several locations check for `'in-progress'` (with hyphen)
   - Type system uses `'active'` only, NOT `'in-progress'`
   - This was never a valid status but was being checked

2. **Missing status icons**
   - [progress.js:162-169](plugins/specweave/scripts/progress.js#L162-L169) was missing icons for:
     - `ready_for_review` → Added: `'👀 ready for review'`
     - `backlog` → Added: `'📋 backlog'`

## Fix Applied

### Changed Files (11 total)

1. **plugins/specweave/scripts/progress.js**
   - Line 121: Updated filter to `['active', 'planning', 'backlog', 'ready_for_review']`
   - Line 165-166: Added status icons for `backlog` and `ready_for_review`

2. **plugins/specweave/scripts/status.js**
   - Line 143-146: Added `backlog` and `ready_for_review` to active count

3. **plugins/specweave/scripts/read-jobs.sh**
   - Line 113: Updated jq filter to include `backlog` and `ready_for_review`

4. **plugins/specweave/scripts/read-progress.sh**
   - Line 132: Updated jq filter to include `backlog` and `ready_for_review`

5. **plugins/specweave/hooks/post-metadata-change.sh**
   - Line 227: Updated case pattern to `active|planning|backlog|ready_for_review`

6. **plugins/specweave/hooks/user-prompt-submit.sh**
   - Line 194: Updated condition to include `backlog` and `ready_for_review`

7. **plugins/specweave/hooks/lib/update-active-increment.sh**
   - Line 40: Updated comment
   - Line 57: Updated condition to include `backlog` and `ready_for_review`

8. **plugins/specweave/hooks/lib/update-status-line.sh**
   - Line 132: Updated condition to include `backlog` and `ready_for_review`

9. **src/core/status-line/status-line-updater.ts**
   - Line 10: Updated comment
   - Line 142-146: Updated condition to include `backlog` and `ready_for_review`

### Pattern Changes

**Before:**
```typescript
// JavaScript/Node.js
const active = increments.filter(i =>
  ['active', 'planning', 'in-progress'].includes(i.status)
);

// Shell/Bash
if [[ "$status" == "active" || "$status" == "planning" || "$status" == "in-progress" ]]; then

// jq filter
select(.value.status == "active" or .value.status == "planning" or .value.status == "in-progress")
```

**After:**
```typescript
// JavaScript/Node.js
const active = increments.filter(i =>
  ['active', 'planning', 'backlog', 'ready_for_review'].includes(i.status)
);

// Shell/Bash
if [[ "$status" == "active" || "$status" == "planning" || "$status" == "backlog" || "$status" == "ready_for_review" ]]; then

// jq filter
select(.value.status == "active" or .value.status == "planning" or .value.status == "backlog" or .value.status == "ready_for_review")
```

## Verification

### Test Results

```bash
# Before fix:
$ node plugins/specweave/scripts/progress.js
📊 Increment Progress
No active increments.

# After fix:
$ node plugins/specweave/scripts/progress.js
📊 Increment Progress

🔄 Active (1):
  0136-process-lifecycle-test-suite
     [░░░░░░░░░░░░░░░] 0/0 (0%)

💡 For details: /specweave:progress <incrementId>
```

### Status Command Verification

```bash
$ node plugins/specweave/scripts/status.js
📋 SpecWeave Status Overview

📝 planning (1):
   0136-process-lifecycle-test-suite

✅ completed (19):
   [list of completed increments]

────────────────────────────────────────
Total: 20 increment(s) | Active: 1 | Completed: 19 | Archived: 114
```

## Prevention

### Guidelines for Future Status Changes

When adding new increment statuses:

1. **Update Type Definition**
   - [src/core/types/increment-metadata.ts](src/core/types/increment-metadata.ts)
   - Add to `IncrementStatus` enum with documentation

2. **Update All Filters** (use global search):
   ```bash
   # Find all status filtering locations
   grep -r "active.*planning" plugins/specweave src/
   ```

3. **Critical Locations to Check:**
   - `plugins/specweave/scripts/progress.js` (filter + icons)
   - `plugins/specweave/scripts/status.js` (active count)
   - `plugins/specweave/scripts/read-*.sh` (all read scripts)
   - `plugins/specweave/hooks/` (all hook files)
   - `src/core/status-line/` (TypeScript status line logic)

4. **Test Commands After Changes:**
   ```bash
   npm run rebuild
   node plugins/specweave/scripts/progress.js
   node plugins/specweave/scripts/status.js
   ```

### Recommended Refactoring

Create a **shared status filter function** to prevent future drift:

```typescript
// src/utils/status-filters.ts
export const ACTIVE_STATUSES = [
  'active',
  'planning',
  'backlog',
  'ready_for_review'
] as const;

export function isActiveStatus(status: string): boolean {
  return ACTIVE_STATUSES.includes(status as any);
}
```

Then import in all filtering locations:
```typescript
import { ACTIVE_STATUSES, isActiveStatus } from './utils/status-filters.js';

// JavaScript array filter
const active = increments.filter(i => isActiveStatus(i.status));

// Shell scripts (export from node)
node -e "import('./utils/status-filters.js').then(m => console.log(m.ACTIVE_STATUSES.join('|')))"
```

## Related Issues

- ADR-0060: Status state machine and transitions
- Issue #0028: Status desync between metadata.json and spec.md
- v0.28.63: Introduction of `ready_for_review` status

## Impact Assessment

**User Impact**: High
- Users see "No active increments" when work is in progress
- Progress tracking broken for `ready_for_review` state
- Active increment count incorrect

**System Impact**: Medium
- Status line cache not updated correctly
- Hooks don't register active increments properly
- Sync operations may be skipped

**Data Impact**: None
- No data corruption
- Status values in metadata.json are correct
- Only display/filtering logic affected

## Lessons Learned

1. **Status enum changes require comprehensive updates** across JavaScript, TypeScript, and shell scripts
2. **Hardcoded status lists create maintenance burden** - need centralized constants
3. **Test coverage gaps** - no integration tests for status filtering
4. **Documentation lag** - comments in code referenced old status list

## Action Items

- [ ] Create shared status filter utility (see Recommended Refactoring)
- [ ] Add integration tests for all status commands
- [ ] Update CLAUDE.md with "status change checklist"
- [ ] Create pre-commit hook to detect status enum changes
- [ ] Add linter rule to prevent hardcoded status lists
