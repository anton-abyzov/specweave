# Feature-Level GitHub Sync Issue Analysis

**Date**: 2025-11-19
**Reporter**: User (ultrathink)
**Increment**: 0047-us-task-linkage
**Issue**: GitHub issue #627 created with wrong title format (Feature-level instead of User Story-level)

## Problem Statement

SpecWeave is creating GitHub issues at the **Feature/Epic level** (FS-XXX) when it should **ONLY** create issues at the **User Story level** (US-XXX).

### Evidence

**Incorrect Issue Found**:
- **Issue #627**: `[FS-043] Fix spec.md/metadata.json Desync + Add Validation Tools`
- **Format**: `[FS-043]` (Feature-level)
- **Status**: Closed

**Expected Behavior**:
- Issues should ONLY be created for User Stories (US-XXX)
- Format: `[FS-043][US-001] User Story Title`
- Example: `[FS-043][US-001] Status Line Shows Correct Active Increment`

## Root Cause Analysis

### 1. Current Sync Architecture

SpecWeave has **TWO SEPARATE** GitHub sync mechanisms:

#### A. Feature/Epic Level Sync (PROBLEMATIC)
- **Script**: `scripts/update-epic-github-issue.sh`
- **Called by**: `plugins/specweave-github/hooks/post-task-completion.sh` (lines 204-233)
- **Trigger**: After every task completion
- **Creates**: Issues with format `[FS-XXX] Feature Title`
- **Purpose**: Update Epic/Feature-level issues with task progress

**Code Location (post-task-completion.sh:224-226)**:
```bash
if [ -f "$PROJECT_ROOT/scripts/update-epic-github-issue.sh" ]; then
  echo "[$(date)] [GitHub] 🚀 Updating Epic GitHub issue..." >> "$DEBUG_LOG" 2>/dev/null || true
  "$PROJECT_ROOT/scripts/update-epic-github-issue.sh" "$ACTIVE_INCREMENT" >> "$DEBUG_LOG" 2>&1 || true
```

**Issue Creation Logic (update-epic-github-issue.sh:196-205)**:
```bash
# Extract GitHub issue number from FEATURE.md frontmatter
GITHUB_ISSUE=$(grep -A 5 'external_tools:' "$EPIC_FOLDER/FEATURE.md" 2>/dev/null | ...)

if [ -z "$GITHUB_ISSUE" ]; then
  log_info "⚠️  No GitHub issue linked in FEATURE.md, skipping"
  exit 2
fi
```

This script:
1. Finds the Epic folder (FS-XXX) for the increment
2. Checks FEATURE.md for existing GitHub issue
3. Updates the issue with fresh content from `scripts/generate-epic-issue-body.ts`

#### B. User Story Level Sync (CORRECT)
- **Class**: `UserStoryIssueBuilder` (`plugins/specweave-github/lib/user-story-issue-builder.ts`)
- **Called by**: `GitHubFeatureSync.syncFeatureToGitHub()`
- **Creates**: Issues with format `[FS-XXX][US-YYY] User Story Title`
- **Purpose**: Sync individual User Stories to GitHub with AC checkboxes and task lists

**Example Output**:
```
Title: [FS-043][US-001] Status Line Shows Correct Active Increment
Body:
- Acceptance Criteria with checkboxes
- Tasks with completion status
- Links to increment, spec files
```

### 2. Why Feature-Level Issues Were Created

Looking at FS-043's FEATURE.md:
```yaml
---
id: FS-043
title: "Fix spec.md/metadata.json Desync + Add Validation Tools"
external_tools:
  github:
    type: project  # ← This triggered Epic-level sync
    id: 627
    url: https://github.com/anton-abyzov/specweave/issues/627
---
```

**Timeline**:
1. User created increment 0043 (associated with FS-043)
2. `post-increment-planning.sh` hook ran after increment creation
3. Epic sync logic detected FS-043 and created issue #627 with Feature-level title
4. Issue was linked back to FEATURE.md frontmatter
5. User correctly created US-level issues (US-001, US-002, etc.)
6. Now we have BOTH Feature-level AND User Story-level issues (duplication!)

### 3. Tests That Validate Epic Sync

**Test Files**:
- `tests/integration/external-tools/github/github-epic-sync-duplicate-prevention.test.ts`
- `tests/integration/external-tools/github/github-feature-sync-idempotency.test.ts`

These tests verify:
- Epic-level issues are created for Features
- Duplicate detection prevents multiple Epic issues
- Idempotency (running sync multiple times doesn't create duplicates)

**Example Test (github-epic-sync-duplicate-prevention.test.ts:36)**:
```typescript
it('should find issue by epic ID in title', () => {
  const githubIssues = [
    {
      number: 100,
      title: '[FS-25-11-14] Test Feature',  // ← Feature-level title!
      body: '**Increment**: 0032-test-feature\n\nSome content...'
    }
  ];
  // ... validation logic
});
```

These tests are **testing the wrong behavior** according to the user's requirement.

## Impact Analysis

### Files Affected

1. **Hooks**:
   - `plugins/specweave-github/hooks/post-task-completion.sh` (calls Epic sync)
   - `plugins/specweave/hooks/post-increment-planning.sh` (may also trigger Epic sync)

2. **Scripts**:
   - `scripts/update-epic-github-issue.sh` (generates Feature-level issues)
   - `scripts/generate-epic-issue-body.ts` (generates issue body)

3. **Tests**:
   - `tests/integration/external-tools/github/github-epic-sync-duplicate-prevention.test.ts`
   - `tests/integration/external-tools/github/github-feature-sync-idempotency.test.ts`

4. **Documentation**:
   - `.specweave/docs/internal/specs/_features/FS-*/FEATURE.md` (contains external_tools.github)
   - Living docs may reference Epic-level issues

### Breaking Changes

**Minimal Impact**:
- Feature-level sync is **already optional** (hook checks if script exists)
- User Story sync is **already working correctly**
- Disabling Feature sync will NOT break User Story sync

**Test Failures Expected**:
- `github-epic-sync-duplicate-prevention.test.ts` - Tests Epic sync logic
- `github-feature-sync-idempotency.test.ts` - Tests Epic idempotency

These tests should be **removed or rewritten** to validate US-level sync instead.

## Proposed Fix

### Phase 1: Disable Feature-Level Sync (Non-Breaking)

**File**: `plugins/specweave-github/hooks/post-task-completion.sh`

**Change (lines 204-233)**:
```bash
# ============================================================================
# EPIC GITHUB ISSUE SYNC (Update Epic issue with fresh task progress)
# ============================================================================
#
# DEPRECATED (v0.24.0+): SpecWeave now syncs ONLY at User Story level.
# Feature-level (FS-XXX) issues are no longer created/updated.
# This section is kept for backward compatibility but is disabled by default.
#
# To re-enable (NOT recommended):
#   export SPECWEAVE_ENABLE_EPIC_SYNC=true
#
# @see .specweave/increments/0047-us-task-linkage/reports/FEATURE-LEVEL-GITHUB-SYNC-ANALYSIS.md
# ============================================================================

if [ "$SPECWEAVE_ENABLE_EPIC_SYNC" = "true" ]; then
  echo "[$(date)] [GitHub] 🔄 Checking for Epic GitHub issue update (DEPRECATED)..." >> "$DEBUG_LOG" 2>/dev/null || true

  # ... existing Epic sync code ...

  echo "[$(date)] [GitHub] ⚠️  Epic sync is deprecated. Use User Story sync instead." >> "$DEBUG_LOG" 2>/dev/null || true
else
  echo "[$(date)] [GitHub] ℹ️  Epic sync disabled (sync at User Story level only)" >> "$DEBUG_LOG" 2>/dev/null || true
fi
```

### Phase 2: Deprecate Script

**File**: `scripts/update-epic-github-issue.sh`

**Add deprecation notice**:
```bash
#!/bin/bash
#
# DEPRECATED: Update Epic GitHub Issue with Fresh Data
#
# ⚠️  This script is DEPRECATED as of v0.24.0 (Increment 0047)
#
# Reason: SpecWeave now syncs ONLY at User Story level (US-XXX).
#         Feature-level (FS-XXX) issues are no longer recommended.
#
# Migration: Use /specweave-github:sync instead, which syncs User Stories.
#
# @see .specweave/increments/0047-us-task-linkage/reports/FEATURE-LEVEL-GITHUB-SYNC-ANALYSIS.md
#

echo "⚠️  WARNING: update-epic-github-issue.sh is deprecated"
echo "   Use /specweave-github:sync for User Story-level sync instead"
echo ""
echo "   To proceed anyway, set: export SPECWEAVE_FORCE_EPIC_SYNC=true"

if [ "$SPECWEAVE_FORCE_EPIC_SYNC" != "true" ]; then
  exit 2
fi

# ... rest of script (kept for backward compatibility) ...
```

### Phase 3: Update Tests

**File**: `tests/integration/external-tools/github/github-epic-sync-duplicate-prevention.test.ts`

**Options**:
1. **Remove entirely** (recommended) - Epic sync is deprecated
2. **Skip with `.skip`** - Preserve code but don't run
3. **Rewrite for User Story sync** - Test US-level duplicate prevention instead

**Recommendation**: Skip tests with comment explaining deprecation:

```typescript
describe.skip('GitHub Epic Sync - Duplicate Prevention (DEPRECATED)', () => {
  // NOTE: This test suite is skipped as of v0.24.0 (Increment 0047)
  // Reason: SpecWeave now syncs ONLY at User Story level (US-XXX).
  //         Feature-level (FS-XXX) GitHub issues are deprecated.
  //
  // See: .specweave/increments/0047-us-task-linkage/reports/FEATURE-LEVEL-GITHUB-SYNC-ANALYSIS.md

  // ... existing tests ...
});
```

### Phase 4: Clean Up Existing Feature-Level Issues

**Manual Steps**:

1. **Close issue #627**:
   ```bash
   gh issue close 627 --comment "Closing Feature-level issue. SpecWeave now syncs at User Story level only. See individual US issues for FS-043."
   ```

2. **Verify User Story issues exist**:
   ```bash
   gh issue list --label "user-story" --search "FS-043 in:title"
   ```

3. **Remove external_tools.github from FEATURE.md**:
   ```bash
   # Edit .specweave/docs/internal/specs/_features/FS-043/FEATURE.md
   # Remove external_tools.github section from frontmatter
   ```

4. **Update living docs references**:
   - Search for issue #627 in living docs
   - Replace with references to User Story issues

## Validation Steps

After implementing the fix:

1. **Verify Epic sync disabled**:
   ```bash
   # Complete a task in any increment
   # Check logs - should NOT see "Updating Epic GitHub issue"
   tail -f .specweave/logs/hooks-debug.log | grep "Epic"
   ```

2. **Verify User Story sync works**:
   ```bash
   /specweave-github:sync FS-047
   # Should create/update US-level issues only
   gh issue list --label "user-story" --search "FS-047 in:title"
   ```

3. **Run tests**:
   ```bash
   npm run test:integration -- github
   # Should pass (with Epic tests skipped)
   ```

4. **Check for orphaned Feature-level issues**:
   ```bash
   gh issue list --search "is:open [FS- in:title -[FS-"
   # Should return issues with ONLY [FS-XXX] (no [US-XXX])
   # These are Feature-level issues that should be closed
   ```

## Migration Guide (For Users)

If users have existing Feature-level issues:

1. **List all Feature-level issues**:
   ```bash
   gh issue list --search "is:open [FS- in:title" --json number,title
   ```

2. **For each Feature-level issue**:
   - Check if User Story issues exist for that feature
   - If not, create them: `/specweave-github:sync FS-XXX`
   - Close Feature-level issue with reference to User Story issues
   - Remove `external_tools.github` from FEATURE.md

3. **Update hooks (if custom)**:
   - Remove calls to `update-epic-github-issue.sh`
   - Use `/specweave-github:sync` command instead

## Conclusion

**Summary**:
- SpecWeave has been creating BOTH Feature-level AND User Story-level issues
- User requirement: ONLY User Story-level issues
- Fix: Disable Epic/Feature sync in hooks, deprecate script, update tests
- Impact: Minimal (Epic sync already optional, US sync unaffected)

**Next Steps**:
1. Implement Phase 1 (disable Epic sync in hook)
2. Implement Phase 2 (deprecate script)
3. Implement Phase 3 (skip/remove tests)
4. Execute Phase 4 (close issue #627, clean up references)
5. Update CLAUDE.md with new policy

**Estimated Effort**: 2-3 hours (implementation + testing + cleanup)

---

**References**:
- Issue #627: https://github.com/anton-abyzov/specweave/issues/627
- Increment 0047: `.specweave/increments/0047-us-task-linkage/`
- User Story Issue Builder: `plugins/specweave-github/lib/user-story-issue-builder.ts`
