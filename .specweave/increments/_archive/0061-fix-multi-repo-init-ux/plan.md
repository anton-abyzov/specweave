---
increment: 0061-fix-multi-repo-init-ux
---

# Implementation Plan

## Overview

Fix the multi-repo init UX by:
1. Adding `skipValidation` parameter to bulk discovery function
2. Removing redundant discovery calls
3. Improving user messaging

## Files to Modify

### 1. `src/core/repo-structure/repo-bulk-discovery.ts`

**Changes:**
- Add `skipValidation?: boolean` parameter to `discoverRepositories()`
- When `skipValidation=true`, skip the `expectedCount` comparison
- Change message from "you specified X" to "Found N repos matching pattern"

### 2. `src/core/repo-structure/repo-structure-manager.ts`

**Changes:**
- Pass `skipValidation: true` when calling from bulk discovery flow (line ~513)
- Remove the second discovery call (line ~906) - use already-discovered repos
- After parent selection, auto-calculate implementation repos (no count question)

### 3. `src/cli/helpers/init/repository-setup.ts` (if needed)

**Changes:**
- Ensure clean handoff between discovery and selection phases
- Remove any redundant prompts

## Implementation Approach

### Phase 1: Fix Validation Logic

```typescript
// repo-bulk-discovery.ts - Add skipValidation parameter
export async function discoverRepositories(
  octokit: Octokit,
  owner: string,
  isOrg: boolean,
  expectedCount: number,
  options?: { skipValidation?: boolean }  // NEW
): Promise<DiscoveryResult>

// In validation section (~line 292):
if (!options?.skipValidation && filteredRepos.length !== expectedCount) {
  // Show message only when validation is expected
}
```

### Phase 2: Update Caller in repo-structure-manager.ts

```typescript
// Line ~513 - Bulk discovery first call
discoveryResult = await discoverRepositories(
  octokit, owner, isOrg, 0,
  { skipValidation: true }  // Don't validate - discovery mode
);

// Remove or simplify lines ~898-906 (second discovery call)
// Use already-discovered repos instead of re-discovering
```

### Phase 3: Improve Messages

```typescript
// Instead of: "Found 4 repositories, but you specified 0"
// Show: "Found 4 repositories matching pattern 'starts:sw-qr-menu'"

// After parent selection:
// "✓ Parent: sw-qr-menu"
// "✓ Implementation repos: sw-qr-menu-be, sw-qr-menu-fe, sw-qr-menu-shared"
```

## Testing

1. Run `specweave init` in test directory
2. Select "Multiple repos" → "Bulk Discovery"
3. Enter owner and pattern
4. Verify no "you specified X" message
5. Verify single discovery phase
6. Verify parent selection works
7. Verify implementation repos auto-configured

## Risks

- **Low**: Changes are isolated to discovery flow
- **Low**: Manual entry flow untouched
- **Medium**: Need to test all discovery strategies (pattern, all, regex)
