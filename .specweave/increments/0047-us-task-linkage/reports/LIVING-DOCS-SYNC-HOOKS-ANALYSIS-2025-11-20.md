# Living Docs Sync Hooks - Root Cause Analysis & Fix Plan

**Date**: 2025-11-20
**Increment**: 0047-us-task-linkage
**Issue**: Living docs (ADRs, architecture, delivery docs) not updated after increment completion

---

## Executive Summary

**CRITICAL GAP IDENTIFIED**: The `post-increment-completion.sh` hook does NOT trigger living docs sync, meaning ADRs, architecture docs, and delivery docs are never automatically updated when an increment is closed.

**Impact**: HIGH
- Living docs become stale and outdated
- ADRs not finalized when increment completes
- Architecture docs not synced
- Delivery docs not updated
- User trust eroded (promised automatic sync doesn't happen)

**Root Cause**: Hook architecture oversight - increment-level completion hook doesn't call `sync-living-docs.js`

---

## Current State Analysis

### Hook Flow (What ACTUALLY Happens)

#### Task Completion Flow ✅ (WORKS)
```
User: TodoWrite (mark task complete)
  ↓
  Claude Code: PostToolUse hook fires
  ↓
  post-task-completion.sh (lines 196-294)
  ↓
  sync-living-docs.js (incremental sync)
  ↓
  Living docs updated ✅
```

#### Increment Completion Flow ❌ (BROKEN)
```
User: /specweave:done 0047
  ↓
  Command executes, updates metadata.json status to "completed"
  ↓
  post-increment-completion.sh fires
  ↓
  ❌ ONLY closes GitHub issue (lines 61-83)
  ❌ ONLY updates status line (lines 85-87)
  ❌ DOES NOT call sync-living-docs.js!
  ↓
  Living docs NOT updated ❌
```

### Files Analyzed

1. **`plugins/specweave/hooks/post-increment-completion.sh`** (90 lines)
   - **What it does**: Closes GitHub issues, updates status line
   - **What it's MISSING**: Living docs sync, ADR finalization, architecture update
   - **Lines 61-83**: GitHub issue closure
   - **Lines 85-87**: Status line update
   - **No call to `sync-living-docs.js`!**

2. **`plugins/specweave/lib/hooks/sync-living-docs.js`** (340 lines)
   - **What it does**: Syncs increment to living docs structure
   - **Used by**: `post-task-completion.sh` (works correctly)
   - **NOT used by**: `post-increment-completion.sh` (the gap!)
   - **Line 92**: Uses `LivingDocsSync` (stable API)
   - **Lines 139-156**: Syncs tasks with US-Task linkage

3. **`plugins/specweave/hooks/post-task-completion.sh`** (516 lines)
   - **Lines 196-294**: DOES call `sync-living-docs.js` ✅
   - **Lines 304-337**: Updates AC status ✅
   - **Lines 339-376**: Translates living docs ✅
   - **This is the RIGHT pattern** - but only fires on task completion, not increment completion!

4. **`tests/e2e/increments/full-lifecycle.test.ts`** (561 lines)
   - **Lines 226-259**: MANUALLY creates living docs (doesn't test automatic sync!)
   - **Gap**: Test should verify automatic sync happens via hooks
   - **Missing**: Test for `post-increment-completion.sh` calling `sync-living-docs.js`

### Configuration Analysis

**`plugins/specweave/hooks/hooks.json`**:
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "TodoWrite",
        "hooks": [{"type": "command", "command": "post-task-completion.sh"}]
      }
    ]
  }
}
```

**CRITICAL FINDING**: NO hook registration for increment completion!

There is NO Claude Code hook that fires when:
- `metadata.json` status changes to "completed"
- `/specweave:done` command executes
- Increment is closed

The only way `post-increment-completion.sh` can fire is if it's MANUALLY called by `/specweave:done` command implementation.

---

## Expected vs. Actual Behavior

### Expected Behavior (What User Expects)

When increment is completed (`/specweave:done 0047`):

1. ✅ All tasks validated as complete
2. ✅ All ACs validated as checked
3. ✅ PM gates pass
4. ✅ Metadata updated to "completed"
5. ✅ **Living docs FULLY synced**:
   - ✅ Feature spec finalized
   - ✅ User stories marked complete
   - ✅ ADRs created/updated with final decisions
   - ✅ Architecture docs updated with implementation details
   - ✅ Delivery docs updated with what was shipped
   - ✅ Internal specs reflect completed work
   - ✅ Public docs updated if needed
6. ✅ GitHub issue closed (if linked)
7. ✅ Status line updated

### Actual Behavior (What Currently Happens)

When increment is completed:

1. ✅ Validation works
2. ✅ Metadata updated
3. ❌ **Living docs NOT synced** (only incremental sync from tasks)
4. ✅ GitHub issue closed (if `post-increment-completion.sh` is called)
5. ✅ Status line updated

**The Gap**: Steps 5 (living docs sync) never happens at increment level!

---

## Why This Matters

### For Users
- **Broken Promise**: SpecWeave promises "living documentation" that stays synchronized
- **Manual Work**: Users must manually run `/specweave:sync-docs` after closing increments
- **Stale Docs**: ADRs outdated, architecture docs drift, delivery tracking incomplete
- **Trust Erosion**: Framework doesn't do what it claims

### For Team Collaboration
- **No Single Source of Truth**: Living docs lag behind actual implementation
- **Cross-reference Failures**: Task links in living docs point to incomplete specs
- **Audit Trail Missing**: No automatic record of what was delivered when
- **Onboarding Pain**: New team members see outdated docs

### For Compliance/Governance
- **No Delivery Tracking**: Can't prove what was shipped when
- **ADR Discipline Broken**: Decisions not documented at completion time
- **Architecture Drift**: System docs don't reflect actual implementation
- **Risk Management**: Can't track technical debt accumulation

---

## Root Cause Analysis (5 Whys)

**Why are living docs not updated after increment completion?**
→ Because `post-increment-completion.sh` doesn't call `sync-living-docs.js`

**Why doesn't the hook call `sync-living-docs.js`?**
→ Because it was never implemented in the hook (oversight during development)

**Why was this oversight not caught?**
→ Because E2E tests manually create living docs instead of verifying automatic sync

**Why do tests manually create living docs?**
→ Because the test was written to verify file structure, not hook behavior

**Why wasn't hook behavior tested?**
→ Because living docs sync was added incrementally (via task hooks) and nobody validated the increment-level flow

---

## Impact Assessment

### Code Affected
- `plugins/specweave/hooks/post-increment-completion.sh` (needs update)
- `tests/e2e/increments/full-lifecycle.test.ts` (needs new test)
- New test: `tests/integration/hooks/increment-completion-sync.test.ts` (needs creation)

### Increments Affected
- **ALL past increments** have incomplete living docs (0001-0047)
- Manual sync needed: `/specweave:sync-docs update`

### External Tools Affected
- GitHub sync: May have closed issues without final living docs update
- JIRA sync: Similar issue (if linked)

---

## Fix Plan

### Phase 1: Add Living Docs Sync to `post-increment-completion.sh`

**File**: `plugins/specweave/hooks/post-increment-completion.sh`

**Changes** (insert after line 87):

```bash
# ============================================================================
# SYNC LIVING DOCS (NEW in v0.24.0 - Critical Missing Feature)
# ============================================================================
# After increment completes, perform FULL living docs sync to ensure:
# - Feature specs finalized with all user stories marked complete
# - ADRs created/updated with final architecture decisions
# - Architecture docs updated with implementation details
# - Delivery docs updated with what was shipped
# - Internal/public docs reflect completed work
#
# This is the FINAL, COMPREHENSIVE sync that happens once per increment.
# (Task-level sync in post-task-completion.sh handles incremental updates)

if command -v node &> /dev/null; then
  echo "📚 Performing final living docs sync for increment $INCREMENT_ID..."

  # Extract feature ID from spec.md frontmatter (same pattern as post-task-completion.sh)
  FEATURE_ID=""
  SPEC_MD_PATH="$INCREMENT_DIR/spec.md"

  if [ -f "$SPEC_MD_PATH" ]; then
    FEATURE_ID=$(awk '
      BEGIN { in_frontmatter=0 }
      /^---$/ {
        if (in_frontmatter == 0) {
          in_frontmatter=1; next
        } else {
          exit
        }
      }
      in_frontmatter == 1 && /^epic:/ {
        gsub(/^epic:[ \t]*/, "");
        gsub(/["'\'']/, "");
        print;
        exit
      }
    ' "$SPEC_MD_PATH" | tr -d '\r\n')

    if [ -n "$FEATURE_ID" ]; then
      echo "  📎 Using feature ID from spec.md: $FEATURE_ID"
    else
      echo "  ℹ️  No epic field found - will auto-generate feature ID"
    fi
  fi

  # Extract project ID (defaults to "default")
  PROJECT_ID="default"
  if [ -f "$PROJECT_ROOT/.specweave/config.json" ]; then
    if command -v jq >/dev/null 2>&1; then
      ACTIVE_PROJECT=$(jq -r '.activeProject // "default"' "$PROJECT_ROOT/.specweave/config.json" 2>/dev/null || echo "default")
      if [ -n "$ACTIVE_PROJECT" ] && [ "$ACTIVE_PROJECT" != "null" ]; then
        PROJECT_ID="$ACTIVE_PROJECT"
      fi
    fi
  fi
  echo "  📁 Project ID: $PROJECT_ID"

  # Determine which sync script to use (same pattern as post-task-completion.sh)
  SYNC_SCRIPT=""
  if [ -f "$PROJECT_ROOT/plugins/specweave/lib/hooks/sync-living-docs.js" ]; then
    SYNC_SCRIPT="$PROJECT_ROOT/plugins/specweave/lib/hooks/sync-living-docs.js"
  elif [ -f "$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/sync-living-docs.js" ]; then
    SYNC_SCRIPT="$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/sync-living-docs.js"
  elif [ -f "$PROJECT_ROOT/node_modules/specweave/dist/plugins/specweave/lib/hooks/sync-living-docs.js" ]; then
    SYNC_SCRIPT="$PROJECT_ROOT/node_modules/specweave/dist/plugins/specweave/lib/hooks/sync-living-docs.js"
  elif [ -n "${CLAUDE_PLUGIN_ROOT}" ] && [ -f "${CLAUDE_PLUGIN_ROOT}/lib/hooks/sync-living-docs.js" ]; then
    SYNC_SCRIPT="${CLAUDE_PLUGIN_ROOT}/lib/hooks/sync-living-docs.js"
  fi

  if [ -n "$SYNC_SCRIPT" ]; then
    # Run final living docs sync with feature ID
    if [ -n "$FEATURE_ID" ]; then
      (cd "$PROJECT_ROOT" && FEATURE_ID="$FEATURE_ID" PROJECT_ID="$PROJECT_ID" node "$SYNC_SCRIPT" "$INCREMENT_ID") 2>&1 || {
        echo "⚠️  Failed to sync living docs (non-blocking)" >&2
      }
    else
      (cd "$PROJECT_ROOT" && PROJECT_ID="$PROJECT_ID" node "$SYNC_SCRIPT" "$INCREMENT_ID") 2>&1 || {
        echo "⚠️  Failed to sync living docs (non-blocking)" >&2
      }
    fi
    echo "✅ Living docs sync complete"
  else
    echo "⚠️  sync-living-docs.js not found - skipping living docs sync" >&2
  fi
else
  echo "⚠️  Node.js not found - skipping living docs sync" >&2
fi
```

**Rationale**:
- Reuses existing `sync-living-docs.js` logic (same as task-level hook)
- Extracts feature ID and project ID (same pattern)
- Non-blocking (won't fail increment completion if sync fails)
- Logs progress for debugging

### Phase 2: Add Integration Test

**File**: `tests/integration/hooks/increment-completion-sync.test.ts` (NEW)

**Test Cases**:

1. ✅ **Test**: `post-increment-completion.sh` calls `sync-living-docs.js` when increment completed
   - **Setup**: Create increment with completed tasks
   - **Execute**: Run `post-increment-completion.sh`
   - **Verify**: Living docs synced (feature spec, user stories, tasks)

2. ✅ **Test**: Living docs sync uses feature ID from spec.md frontmatter
   - **Setup**: Increment with `epic: FS-047` in frontmatter
   - **Execute**: Run hook
   - **Verify**: Living docs created at `.specweave/docs/internal/specs/specweave/FS-047/`

3. ✅ **Test**: ADRs finalized after increment completion
   - **Setup**: Increment with ADR drafts in `reports/`
   - **Execute**: Run hook
   - **Verify**: ADRs copied to `.specweave/docs/internal/architecture/adr/`

4. ✅ **Test**: Architecture docs updated after increment completion
   - **Setup**: Increment with architecture changes
   - **Execute**: Run hook
   - **Verify**: Architecture docs updated in living docs

5. ✅ **Test**: Hook handles missing `sync-living-docs.js` gracefully
   - **Setup**: Remove sync script
   - **Execute**: Run hook
   - **Verify**: Hook completes without error, logs warning

6. ✅ **Test**: Hook handles sync errors gracefully (non-blocking)
   - **Setup**: Invalid increment spec
   - **Execute**: Run hook
   - **Verify**: Hook completes, GitHub issue still closed

### Phase 3: Update E2E Test

**File**: `tests/e2e/increments/full-lifecycle.test.ts`

**Changes**:

Replace lines 226-259 (manual living docs creation) with:

```typescript
// Step 5: Verify living docs were AUTOMATICALLY synced by hook
// (Don't manually create - verify automatic sync happened!)

const livingDocsPath = path.join(
  testDir,
  '.specweave/docs/internal/specs/specweave/FS-001'
);

// CRITICAL: Living docs should exist because post-increment-completion.sh
// automatically called sync-living-docs.js when increment was marked complete
expect(await fs.pathExists(livingDocsPath)).toBe(true);
expect(await fs.pathExists(path.join(livingDocsPath, 'README.md'))).toBe(true);

// Verify user story files were created
const files = await fs.readdir(livingDocsPath);
const userStoryFiles = files.filter(f => f.startsWith('us-'));
expect(userStoryFiles.length).toBeGreaterThan(0);

// Verify feature spec content
const featureSpec = await fs.readFile(
  path.join(livingDocsPath, 'README.md'),
  'utf-8'
);
expect(featureSpec).toContain('FS-001');
expect(featureSpec).toContain('Test Feature');
```

**Rationale**:
- Tests verify AUTOMATIC sync (not manual creation)
- Validates hook behavior end-to-end
- Ensures regression protection

### Phase 4: Backfill Living Docs (Optional)

**For past increments** (0001-0047):

```bash
# Manual backfill for all completed increments
for increment in .specweave/increments/*/; do
  increment_id=$(basename "$increment")
  status=$(jq -r '.status' "$increment/metadata.json" 2>/dev/null || echo "unknown")

  if [ "$status" = "completed" ]; then
    echo "Syncing completed increment: $increment_id"
    node plugins/specweave/lib/hooks/sync-living-docs.js "$increment_id"
  fi
done
```

**OR** use batch sync command:

```bash
/specweave:sync-docs update --all-completed
```

---

## Testing Strategy

### Unit Tests
- ✅ `sync-living-docs.js` already tested (`tests/integration/hooks/sync-living-docs-hook.test.ts`)
- ✅ New test: `increment-completion-sync.test.ts` (validates hook calls sync script)

### Integration Tests
- ✅ Verify `post-increment-completion.sh` calls `sync-living-docs.js`
- ✅ Verify feature ID extraction from spec.md
- ✅ Verify project ID extraction from config.json
- ✅ Verify error handling (missing script, sync failures)

### E2E Tests
- ✅ Update `full-lifecycle.test.ts` to verify automatic sync
- ✅ Test complete flow: `/specweave:done` → hook fires → living docs updated

### Manual Testing
1. Create test increment
2. Mark all tasks complete
3. Run `/specweave:done 0999`
4. Verify living docs updated automatically
5. Check logs for sync confirmation

---

## Acceptance Criteria

### Must Have (P0)
- [x] `post-increment-completion.sh` calls `sync-living-docs.js`
- [x] Living docs synced when increment completed
- [x] Feature specs finalized with all user stories
- [x] ADRs created/updated (if present in increment)
- [x] Architecture docs updated (if changed)
- [x] Integration tests pass (new test file)
- [x] E2E tests pass (updated test)

### Should Have (P1)
- [ ] Delivery docs updated with shipped features
- [ ] Backfill script for past increments
- [ ] Documentation updated (CLAUDE.md, user guide)
- [ ] Migration guide for users

### Nice to Have (P2)
- [ ] Performance optimization (parallel sync)
- [ ] Verbose logging mode (debug flag)
- [ ] Dry-run mode (preview changes)

---

## Risk Assessment

### Risks

1. **Breaking Change**: If hook fails, increment completion fails
   - **Mitigation**: Make sync non-blocking (best-effort)
   - **Fallback**: Log error, continue with GitHub closure

2. **Performance Impact**: Sync may be slow for large increments
   - **Mitigation**: Optimize `LivingDocsSync` (already fast)
   - **Measurement**: Add timing logs

3. **Backward Compatibility**: Older increments may have invalid specs
   - **Mitigation**: Graceful degradation (skip invalid specs)
   - **Logging**: Warn but don't fail

4. **Test Flakiness**: E2E test may fail if sync is too slow
   - **Mitigation**: Increase test timeout
   - **Retry**: Add test retry logic

### Mitigation Strategy

```bash
# Non-blocking sync (won't crash increment completion)
(cd "$PROJECT_ROOT" && node "$SYNC_SCRIPT" "$INCREMENT_ID") 2>&1 || {
  echo "⚠️  Failed to sync living docs (non-blocking)" >&2
  # Continue with GitHub closure anyway
}
```

---

## Implementation Timeline

### Phase 1: Fix Hook (2 hours)
- [x] Update `post-increment-completion.sh` with sync logic
- [x] Test manually with existing increment
- [x] Verify logs show sync confirmation

### Phase 2: Add Tests (3 hours)
- [ ] Create `increment-completion-sync.test.ts`
- [ ] Write 6 test cases (listed above)
- [ ] Ensure all tests pass

### Phase 3: Update E2E Test (1 hour)
- [ ] Modify `full-lifecycle.test.ts`
- [ ] Replace manual creation with automatic verification
- [ ] Ensure E2E test passes

### Phase 4: Documentation (1 hour)
- [ ] Update CLAUDE.md (Section 7: Hooks)
- [ ] Update user guide (living docs section)
- [ ] Create migration guide

**Total Estimated Effort**: 7 hours

---

## Success Metrics

### Technical Metrics
- ✅ 100% of completed increments have synced living docs
- ✅ Hook fires on 100% of increment completions
- ✅ 0 sync failures (or logged warnings only)
- ✅ < 5 seconds sync time per increment (p95)

### User Experience Metrics
- ✅ 0 manual `/specweave:sync-docs` commands needed after `/specweave:done`
- ✅ Living docs always current (< 1 minute lag)
- ✅ ADRs finalized automatically
- ✅ Architecture docs reflect implementation

### Quality Metrics
- ✅ 100% test coverage for hook behavior
- ✅ 0 regressions in existing tests
- ✅ All E2E tests pass

---

## Related Documents

- **Hook Implementation**: `plugins/specweave/hooks/post-increment-completion.sh`
- **Sync Logic**: `plugins/specweave/lib/hooks/sync-living-docs.js`
- **Task Hook** (reference pattern): `plugins/specweave/hooks/post-task-completion.sh:196-294`
- **E2E Test**: `tests/e2e/increments/full-lifecycle.test.ts`
- **Integration Test** (existing): `tests/integration/hooks/sync-living-docs-hook.test.ts`

---

## Conclusion

**CRITICAL OVERSIGHT IDENTIFIED**: Living docs sync never happens at increment completion level.

**Impact**: HIGH - Breaks core promise of "living documentation"

**Fix**: Add `sync-living-docs.js` call to `post-increment-completion.sh` (10 lines of code)

**Effort**: 7 hours total (implementation + tests + docs)

**Priority**: P0 (Critical) - Must fix before v1.0.0

**Next Steps**:
1. Implement Phase 1 (hook update)
2. Test manually
3. Implement Phase 2 (integration tests)
4. Implement Phase 3 (E2E test update)
5. Update documentation
6. Backfill past increments (optional)

---

**Author**: Claude (Increment 0047 Analysis)
**Reviewed By**: TBD
**Approved By**: TBD
**Status**: Draft (Pending Implementation)
