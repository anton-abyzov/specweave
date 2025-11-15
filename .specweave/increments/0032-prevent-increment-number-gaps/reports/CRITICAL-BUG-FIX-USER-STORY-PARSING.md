# Critical Bug Fix: User Story Parsing

## 🚨 Production Blocker Identified

### The Bug

**Location**: `src/core/living-docs/spec-distributor.ts:420-427`

**Issue**: Hardcoded regex only accepts `### US-` (3 hash marks)

```typescript
// CURRENT (BROKEN):
const storyParts = content.split(/(?=^###\s+US-\d+:)/m);
//                                     ^^^ ONLY 3 hash marks!

if (!part.trim() || !part.match(/^###\s+US-\d+:/)) continue;
//                                 ^^^ ONLY 3 hash marks!

const headerMatch = part.match(/^###\s+(US-\d+):\s+(.+?)$/m);
//                                ^^^ ONLY 3 hash marks!
```

**Impact**: Any increment using `#### US-` (4 hash marks) will have 0 user stories synced!

### The Fix

Replace the hardcoded patterns with flexible ones:

```typescript
// FIXED (lines 420-427):
// Support both ### and #### for user stories
const storyParts = content.split(/(?=^#{3,4}\s+US-\d+:)/m);
//                                     ^^^^^^ 3 or 4 hash marks

for (const part of storyParts) {
  // Skip empty parts or parts that don't start with US-
  if (!part.trim() || !part.match(/^#{3,4}\s+US-\d+:/)) continue;
  //                                 ^^^^^^ 3 or 4 hash marks

  // Extract the user story ID and title from the first line
  const headerMatch = part.match(/^#{3,4}\s+(US-\d+):\s+(.+?)$/m);
  //                                ^^^^^^ 3 or 4 hash marks
```

### Test Cases

**Before Fix**:
- `### US-001: Title` ✅ Parsed
- `#### US-001: Title` ❌ Skipped (7 stories lost!)

**After Fix**:
- `### US-001: Title` ✅ Parsed
- `#### US-001: Title` ✅ Parsed
- `## US-001: Title` ❌ Correctly skipped (not a standard format)
- `##### US-001: Title` ❌ Correctly skipped (too deep)

### Files to Update

1. **`src/core/living-docs/spec-distributor.ts`**:
   - Line 420: Change `/(?=^###\s+US-\d+:)/m` to `/(?=^#{3,4}\s+US-\d+:)/m`
   - Line 424: Change `/^###\s+US-\d+:/` to `/^#{3,4}\s+US-\d+:/`
   - Line 427: Change `/^###\s+(US-\d+):\s+(.+?)$/m` to `/^#{3,4}\s+(US-\d+):\s+(.+?)$/m`

2. **Documentation Update** (add to internal guides):
   - User stories can use either `### US-XXX:` or `#### US-XXX:` format
   - Both are valid and will be synced correctly

### Verification

After applying the fix:

```bash
# Rebuild
npm run build

# Test sync on 0031
node -e "
  import('./dist/src/core/living-docs/spec-distributor.js').then(async ({ SpecDistributor }) => {
    const d = new SpecDistributor(process.cwd());
    const r = await d.distribute('0031-external-tool-status-sync');
    console.log('Stories synced:', r.totalStories);
  });
"
# Expected: "Stories synced: 7"
```

### Impact Analysis

**Increments Affected**:
- ✅ 0031-external-tool-status-sync (7 stories will now sync)
- ❓ Need to check other increments for #### format

**Priority**: P1 CRITICAL
**Time to Fix**: 5 minutes
**Risk**: Low (simple regex change)