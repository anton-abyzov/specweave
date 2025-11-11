# Living Docs & GitHub Sync Diagnosis and Fix Plan

**Date**: 2025-11-11
**Status**: Analysis Complete - Ready for Implementation

---

## Executive Summary

Both living docs sync and GitHub issue sync are **completely broken** due to:
1. Living docs sync script is a stub (never implemented)
2. GitHub sync requires metadata.json that isn't being created
3. Documentation describes an ideal architecture that doesn't match reality

## Problem Analysis

### Issue #1: Living Docs Sync is a Stub

**File**: `dist/hooks/lib/sync-living-docs.js`

**Current Behavior**:
```javascript
// Lines 54-60: TODO stub
console.log('\n🔄 Syncing living docs...');
console.log('   (Actual sync command invocation to be implemented in future version)');
console.log('   Would invoke: /sync-docs update');

// Future implementation:
// await invokeSyncDocsCommand(incrementId);
```

**Problem**: The sync script only DETECTS git changes, but never CREATES them!

**What Should Happen**:
1. After task completion, hook fires
2. Detects current increment
3. Copies increment spec to `.specweave/docs/internal/specs/spec-{4-digit-id}-{name}.md`
4. Git diff shows changes
5. Living docs are updated

**What Actually Happens**:
1. Hook fires ✅
2. Detects current increment ✅
3. Checks for git changes in `.specweave/docs/` ❌ (no changes because nothing was copied!)
4. Says "No changes detected" and exits ❌
5. Living docs NEVER update ❌

### Issue #2: GitHub Sync Requires metadata.json

**File**: `plugins/specweave-github/hooks/post-task-completion.sh`

**Current Behavior**:
- Line 95: `GITHUB_ISSUE=$(jq -r '.github.issue // empty' "$METADATA_FILE")`
- If metadata.json doesn't exist OR doesn't have `.github.issue`, sync is skipped

**Problem**: No metadata.json files are being created with GitHub issue links!

**What Should Happen**:
1. `/specweave:increment` creates new increment
2. `post-increment-planning` hook fires
3. GitHub issue auto-created (if enabled)
4. `metadata.json` created with GitHub issue number
5. Hook logs show: "✅ GitHub issue #123 created"

**What Actually Happens**:
1. `/specweave:increment` creates new increment ✅
2. Hook fires ❌ (may not be firing correctly)
3. No GitHub issue created ❌
4. No metadata.json with GitHub link ❌
5. `post-task-completion` hook skips GitHub sync ❌

### Issue #3: Architecture Mismatch

**Documentation** (`CLAUDE.md`):
- Describes dual-spec architecture (3-digit feature-level + 4-digit increment-level)
- Says increment specs reference living docs ("See SPEC-001")
- Says living docs sync happens automatically

**Reality**:
- Increment specs are standalone (don't reference living docs)
- Living docs specs (`spec-001-...`) are manually created, not auto-synced
- Archive folder has old 4-digit specs (`spec-0001-...`) from previous architecture
- Current increments (0001-0020) don't follow new architecture

## Root Cause Analysis

### Root Cause #1: Incomplete Feature Implementation

The living docs sync feature was **partially implemented**:
- ✅ Hook fires correctly
- ✅ Configuration exists
- ❌ Actual sync logic is stubbed out (TODO comment)
- ❌ `/specweave:sync-docs` command exists but is manual/interactive

### Root Cause #2: Hook Execution Order

The `post-increment-planning` hook should create GitHub issues, but:
- Hook may not be firing
- Hook may not have correct logic
- Auto-creation may be disabled in config

### Root Cause #3: Documentation Out of Sync

CLAUDE.md describes an **ideal** architecture, but:
- PM agent doesn't create feature-level living docs specs
- Increment specs don't reference living docs
- Architecture changed but implementation didn't follow

## Fix Plan

### Phase 1: Fix Living Docs Auto-Sync (CRITICAL)

**Goal**: Automatically copy increment specs to living docs after completion

**Implementation**:
1. Update `dist/hooks/lib/sync-living-docs.js` to actually sync:
   ```javascript
   // Instead of TODO stub:
   async function syncIncrement SpecToLivingDocs(incrementId) {
     const incrementSpec = `.specweave/increments/${incrementId}/spec.md`;
     const livingDocsSpec = `.specweave/docs/internal/specs/spec-${incrementId}.md`;

     // Copy file
     await fs.copy(incrementSpec, livingDocsSpec);

     console.log(`✅ Synced: ${incrementSpec} → ${livingDocsSpec}`);
   }
   ```

2. Test with existing increments:
   ```bash
   node dist/hooks/lib/sync-living-docs.js 0017-sync-architecture-fix
   ```

3. Verify specs appear in `.specweave/docs/internal/specs/`

**Expected Result**:
- After every task completion, increment spec auto-copies to living docs
- `.specweave/docs/internal/specs/` contains all increment specs
- No manual `/specweave:sync-docs` needed for basic sync

### Phase 2: Fix GitHub Issue Auto-Creation (CRITICAL)

**Goal**: Automatically create GitHub issues with metadata.json when increments are created

**Implementation**:
1. Check `post-increment-planning` hook:
   ```bash
   cat plugins/specweave/hooks/post-increment-planning.sh
   ```

2. Verify auto-creation logic exists

3. If missing, implement GitHub issue creation:
   ```bash
   # In post-increment-planning hook:
   if [ "$AUTO_CREATE_GITHUB_ISSUE" = "true" ]; then
     gh issue create \
       --title "[INC-$INCREMENT_ID] $TITLE" \
       --body "$(cat spec.md)" \
       --label "specweave,increment"

     ISSUE_NUM=$(gh issue list --limit 1 --json number -q '.[0].number')

     # Create metadata.json
     cat > metadata.json <<EOF
{
  "id": "$INCREMENT_ID",
  "github": {
    "issue": $ISSUE_NUM,
    "url": "https://github.com/$OWNER/$REPO/issues/$ISSUE_NUM"
  }
}
EOF
   fi
   ```

4. Test with new increment

**Expected Result**:
- `/specweave:increment` creates increment
- GitHub issue auto-created
- metadata.json contains GitHub link
- Hook sync works automatically

### Phase 3: Backfill Missing metadata.json Files (MEDIUM)

**Goal**: Create metadata.json for existing increments that have GitHub issues

**Implementation**:
1. List all increments without metadata.json
2. Check if GitHub issues exist for them
3. Create metadata.json files:
   ```bash
   for INC in 0001 0002 0003 ...; do
     ISSUE=$(gh issue list --search "$INC" --json number -q '.[0].number')
     if [ -n "$ISSUE" ]; then
       echo "Creating metadata.json for $INC (issue #$ISSUE)"
       cat > ".specweave/increments/$INC/metadata.json" <<EOF
{
  "id": "$INC",
  "github": {
    "issue": $ISSUE
  }
}
EOF
     fi
   done
   ```

**Expected Result**:
- All increments with GitHub issues have metadata.json
- Future hook syncs work for historical increments

### Phase 4: Clean Up Archive Folder (LOW)

**Goal**: Remove deprecated `_archive_increment_copies` folder

**Implementation**:
1. Verify all archive specs are in living docs:
   ```bash
   for FILE in .specweave/docs/internal/specs/_archive_increment_copies/*; do
     BASENAME=$(basename "$FILE")
     if [ ! -f ".specweave/docs/internal/specs/$BASENAME" ]; then
       echo "Missing: $BASENAME"
     fi
   done
   ```

2. If all files exist in parent directory, delete archive:
   ```bash
   rm -rf .specweave/docs/internal/specs/_archive_increment_copies
   ```

**Expected Result**:
- Clean specs folder
- No duplicate/archived specs

### Phase 5: Update Documentation (MEDIUM)

**Goal**: Fix CLAUDE.md to reflect actual architecture

**Implementation**:
1. Update "Living Docs Sync" section to explain actual behavior:
   - Automatic sync copies increment specs to living docs
   - Uses 4-digit format: `spec-0001-core-framework.md`
   - Feature-level specs (3-digit) are manually created

2. Fix "Manual Sync" examples to match reality

3. Add troubleshooting section for sync issues

**Expected Result**:
- Documentation matches implementation
- Clear guidance for contributors

## Testing Plan

### Test 1: Living Docs Sync
```bash
# 1. Complete a task in current increment
/specweave:do

# 2. Check hook logs
tail -50 .specweave/logs/hooks-debug.log | grep "living docs"

# 3. Verify spec copied
ls -la .specweave/docs/internal/specs/spec-0020-github-multi-repo.md

# 4. Check git status
git status .specweave/docs/
```

### Test 2: GitHub Issue Sync
```bash
# 1. Create new increment
/specweave:increment "test-sync"

# 2. Check metadata.json
cat .specweave/increments/0021-test-sync/metadata.json

# 3. Verify GitHub issue exists
gh issue view $(jq -r '.github.issue' metadata.json)

# 4. Complete a task and check sync
# (Task completion should update GitHub issue checkboxes)
```

### Test 3: End-to-End Workflow
```bash
# 1. Start fresh increment
/specweave:increment "e2e-sync-test"

# 2. Implement tasks
/specweave:do

# 3. Verify both syncs work:
# - Living docs updated
# - GitHub issue updated

# 4. Close increment
/specweave:done

# 5. Verify final state
```

## Success Criteria

- ✅ Living docs sync works automatically (no manual `/specweave:sync-docs` needed)
- ✅ GitHub issues auto-created on `/specweave:increment`
- ✅ GitHub issue checkboxes update on task completion
- ✅ metadata.json created with GitHub links
- ✅ Archive folder cleaned up
- ✅ Documentation updated and accurate

## Risks & Mitigations

### Risk 1: Breaking Existing Increments
- **Mitigation**: Test on new increment first before backfilling

### Risk 2: Hook Execution Failures
- **Mitigation**: Add extensive error logging and fallback mechanisms

### Risk 3: GitHub API Rate Limits
- **Mitigation**: Implement rate limit checking before bulk operations

## Implementation Order

1. **CRITICAL**: Fix living docs sync (Phase 1) - 2-3 hours
2. **CRITICAL**: Fix GitHub issue auto-creation (Phase 2) - 2-3 hours
3. **MEDIUM**: Backfill metadata.json (Phase 3) - 1 hour
4. **LOW**: Clean up archive (Phase 4) - 15 minutes
5. **MEDIUM**: Update documentation (Phase 5) - 1 hour

**Total Estimated Time**: 6-8 hours

---

## Next Steps

1. Implement Phase 1 (living docs sync)
2. Test with current increment (0020)
3. Implement Phase 2 (GitHub auto-creation)
4. Test end-to-end workflow
5. Backfill metadata.json for historical increments
6. Clean up archive folder
7. Update CLAUDE.md

**Ready to start implementation!**
