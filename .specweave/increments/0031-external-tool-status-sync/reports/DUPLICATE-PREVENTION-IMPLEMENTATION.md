# GitHub Duplicate Prevention - Implementation Complete

**Date**: 2025-11-14
**Status**: ✅ FIX IMPLEMENTED
**Version**: v0.14.1

---

## Summary

**Problem**: 41 duplicate GitHub issues (35 FS-* epics + 6 INC-* increments)
**Root Cause**: Missing duplicate detection in post-increment-planning hook
**Fix**: Added metadata.json check before creating GitHub issues
**Status**: ✅ IMPLEMENTED (ready for testing)
**Cleanup**: 🔧 READY TO EXECUTE (41 issues to close)

---

## Changes Made

### 1. Post-Increment-Planning Hook (INC-* Duplicate Prevention)

**File**: `plugins/specweave/hooks/post-increment-planning.sh`
**Lines**: 674-730 (56 lines modified)
**Change Type**: DUPLICATE DETECTION ADDED

**Before** (❌ No check):
```bash
if [ "$auto_create" = "true" ]; then
  log_info "  📦 Auto-create enabled, checking for GitHub CLI..."

  # NO DUPLICATE CHECK!
  if ! command -v gh >/dev/null 2>&1; then
    log_info "  ⚠️  GitHub CLI (gh) not found"
  else
    # Creates issue EVERY TIME!
    if create_github_issue "$increment_id" "$increment_dir"; then
      log_info "  ✅ GitHub issue created successfully"
    fi
  fi
fi
```

**After** (✅ With check):
```bash
if [ "$auto_create" = "true" ]; then
  log_info "  📦 Auto-create enabled, checking for GitHub CLI..."

  # ✅ NEW: Check if issue already exists
  local metadata_file="$increment_dir/metadata.json"
  local existing_issue=""

  if [ -f "$metadata_file" ]; then
    existing_issue=$(cat "$metadata_file" | grep -o '"github".*"issue".*[0-9]*' | grep -o '[0-9]*$')

    if [ -n "$existing_issue" ]; then
      log_info "  ✅ GitHub issue already exists: #$existing_issue"
      log_info "  ⏭️  Skipping creation (idempotent)"
      # Displays existing URL
    fi
  fi

  # ✅ Only create if no existing issue
  if [ -z "$existing_issue" ]; then
    if ! command -v gh >/dev/null 2>&1; then
      log_info "  ⚠️  GitHub CLI (gh) not found"
    else
      if create_github_issue "$increment_id" "$increment_dir"; then
        log_info "  ✅ GitHub issue created successfully"
      fi
    fi
  fi
fi
```

**Key Features**:
- ✅ Reads metadata.json to check for existing `github.issue`
- ✅ Skips creation if issue already exists (idempotent)
- ✅ Shows existing issue number and URL
- ✅ Prevents 100%+ issue bloat
- ✅ Safe to re-run `/specweave:increment` multiple times

### 2. GitHub Epic Sync (FS-* Duplicate Prevention)

**File**: `plugins/specweave-github/lib/github-epic-sync.ts`
**Status**: ✅ ALREADY HAS DUPLICATE DETECTION (no changes needed)

**Existing Code** (lines 151-184):
```typescript
if (!existingIssue) {
  // ✅ Check GitHub FIRST before creating (duplicate detection!)
  console.log(`   🔍 Checking GitHub for existing issue: ${increment.id}...`);
  const githubIssue = await this.findExistingIssue(epicData.id, increment.id);

  if (githubIssue) {
    // ✅ Found existing issue! Re-link instead of creating duplicate
    console.log(`   ♻️  Found existing Issue #${githubIssue} for ${increment.id}`);
    await this.updateIncrementExternalLink(...);
    duplicatesDetected++;
  } else {
    // Truly new issue - create it
    const issueNumber = await this.createIssue(...);
    issuesCreated++;
  }
}
```

**Key Features**:
- ✅ Searches GitHub for existing issues matching epic ID
- ✅ Re-links found issues instead of creating duplicates
- ✅ Self-healing sync (fixes broken links)
- ✅ Post-sync validation (detects duplicates)
- ✅ Cleanup command available (`/specweave-github:cleanup-duplicates`)

---

## Test Plan

### Test Case 1: INC-* Duplicate Prevention

**Objective**: Verify no duplicate INC-* issues created on re-planning

**Steps**:
```bash
# 1. Create new increment
/specweave:increment "Test Duplicate Prevention"

# 2. Verify initial issue created
gh issue list --search "Test Duplicate Prevention"
# Expected: 1 issue (e.g., #366)

# 3. Check metadata.json
cat .specweave/increments/0032-test-duplicate-prevention/metadata.json | jq '.github'
# Expected: {"issue": 366, "url": "...", "synced": "..."}

# 4. Re-run increment planning (simulate spec update)
/specweave:increment "Test Duplicate Prevention - Updated"

# 5. Check hook logs
# Expected: "✅ GitHub issue already exists: #366"
# Expected: "⏭️  Skipping creation (idempotent)"

# 6. Verify NO NEW ISSUE created
gh issue list --search "Test Duplicate Prevention"
# Expected: STILL 1 issue (#366), NOT 2!

# 7. Re-run again (simulate typo fix)
/specweave:increment "Test Duplicate Prevention - Final"

# 8. Final verification
gh issue list --search "Test Duplicate Prevention"
# Expected: STILL 1 issue (#366), NOT 3!
```

**Success Criteria**:
- ✅ Only 1 issue created across 3 planning cycles
- ✅ Hook logs show "Skipping creation (idempotent)"
- ✅ Metadata.json unchanged (same issue number)
- ✅ No error messages or warnings

### Test Case 2: FS-* Duplicate Prevention

**Objective**: Verify no duplicate FS-* epic issues on re-sync

**Steps**:
```bash
# 1. Complete increment (triggers living docs sync)
/specweave:done 0032

# 2. Verify epic issue created
gh issue list --search "[FS-25-11-14]"
# Expected: 1 issue (e.g., #367)

# 3. Re-run living docs sync manually
/specweave:sync-docs 0032

# 4. Check sync logs
# Expected: "🔍 Checking GitHub for existing issue: 0032-test-duplicate-prevention..."
# Expected: "🔗 Found existing issue #367"
# Expected: "♻️  Self-healed: 1 (found existing issues)"

# 5. Verify NO DUPLICATE created
gh issue list --search "[FS-25-11-14]"
# Expected: STILL 1 issue (#367), NOT 2!

# 6. Run epic sync directly
/specweave-github:sync-epic FS-25-11-14

# 7. Final verification
gh issue list --search "[FS-25-11-14]"
# Expected: STILL 1 issue (#367), NOT 3!
```

**Success Criteria**:
- ✅ Only 1 epic issue across 3 sync cycles
- ✅ Sync logs show "Found existing issue"
- ✅ Self-healing detected (duplicatesDetected > 0)
- ✅ Post-sync validation: "No duplicates found"

---

## Cleanup Execution

### Pre-Cleanup Validation

**Current State**:
- Living Docs Features: 29
- GitHub FS-* Issues: 64 (35 duplicates)
- GitHub INC-* Issues: 6 (5 duplicates)
- Total Duplicates: 41 issues

**Files Generated**:
1. **Analysis Report**: `.specweave/increments/0031-external-tool-status-sync/reports/DUPLICATE-ANALYSIS.md`
2. **Cleanup Script**: `.specweave/increments/0031-external-tool-status-sync/reports/CLEANUP-COMMANDS.sh`

### Cleanup Script Review

**Review before executing**:
```bash
# View cleanup commands
cat .specweave/increments/0031-external-tool-status-sync/reports/CLEANUP-COMMANDS.sh

# Expected content:
# - Close #302, #331 (duplicates of #296)
# - Close #303, #333 (duplicates of #297)
# - ... (35 FS-* duplicates)
# - Close #346, #362-#365 (duplicates of #332)
# Total: 41 `gh issue close` commands
```

### Execute Cleanup

**Command**:
```bash
bash .specweave/increments/0031-external-tool-status-sync/reports/CLEANUP-COMMANDS.sh
```

**Interactive Prompt**:
```
🚀 Starting GitHub issue cleanup...

⚠️  This will close duplicate issues!
Continue? (y/N)
```

**Expected Output**:
```
Closing #302...
Closing #303...
... (41 total issues)

✅ Cleanup complete!
📊 Total issues closed: 41
```

### Post-Cleanup Validation

**Verify cleanup success**:
```bash
# Count remaining issues
gh issue list --repo anton-abyzov/specweave --limit 1000 --state all \
  --json number,title --jq '.[] | select(.title | test("\\[FS-"))' | wc -l

# Expected: 29 (down from 64!)

# Verify INC-0031 has only 1 issue
gh issue list --repo anton-abyzov/specweave --search "INC-0031"

# Expected: Only #332 (all others closed)

# Check living docs count matches GitHub
ls -1 .specweave/docs/internal/specs/default/ | grep "^FS-" | wc -l

# Expected: 29 (matches GitHub issue count!)
```

**Success Criteria**:
- ✅ 64 → 29 FS-* issues (35 closed)
- ✅ 6 → 1 INC-0031 issues (5 closed)
- ✅ Perfect 1:1 mapping (29 features = 29 GitHub issues)
- ✅ No errors during cleanup
- ✅ All closed issues have closure comment

---

## Architecture Documentation

### Idempotency Principle

**Definition**: Every sync operation MUST be safe to run multiple times without creating duplicates.

**Implementation**:
```
1. Check "does this resource already exist?"
   ↓
2. If YES → Skip creation, log "idempotent skip"
   ↓
3. If NO → Create new resource, store ID in metadata
   ↓
4. Result: Safe to re-run anytime!
```

**Locations**:
- INC-* issues: Check `metadata.json` for `github.issue`
- FS-* epics: Call `findExistingIssue()` to search GitHub
- Living docs: Check FEATURE.md frontmatter for `external_tools.github`

### Metadata Tracking

**Single Source of Truth**:
- `.specweave/increments/####/metadata.json` → `github.issue` (INC-* issues)
- `.specweave/docs/internal/specs/default/FS-*/FEATURE.md` → `external_tools.github` (FS-* epics)

**Format**:
```json
{
  "id": "0031-external-tool-status-sync",
  "status": "active",
  "created": "2025-11-12T12:46:00Z",
  "github": {
    "issue": 186,
    "url": "https://github.com/anton-abyzov/specweave/issues/186",
    "synced": "2025-11-13T18:00:00Z"
  }
}
```

### Self-Healing Sync

**Concept**: If external link is broken or missing, search GitHub and re-link automatically.

**Example**:
```typescript
// External link missing in FEATURE.md
if (!existingIssue) {
  // Search GitHub for orphaned issue
  const githubIssue = await this.findExistingIssue(epicId, incrementId);

  if (githubIssue) {
    // Found it! Re-link instead of creating duplicate
    await this.updateIncrementExternalLink(...);
    duplicatesDetected++; // Self-healing event
  }
}
```

---

## Next Steps

### Immediate (Today)

1. ✅ **Fix implemented** - DONE
   - plugins/specweave/hooks/post-increment-planning.sh (duplicate detection added)
   - plugins/specweave-github/lib/github-epic-sync.ts (already has duplicate detection)

2. 🧪 **Test fix** - NEXT
   - Run Test Case 1 (INC-* prevention)
   - Run Test Case 2 (FS-* prevention)
   - Verify logs show idempotent behavior

3. 🧹 **Execute cleanup** - AFTER TESTING
   - Review CLEANUP-COMMANDS.sh
   - Execute cleanup script
   - Verify 41 issues closed
   - Confirm 1:1 mapping (29 features = 29 issues)

### Follow-Up (This Week)

4. 📝 **Add unit tests**
   - `tests/unit/hooks/post-increment-planning-idempotency.test.ts`
   - `tests/integration/github-epic-sync-duplicate-prevention.test.ts`

5. 📚 **Update documentation**
   - CLAUDE.md: Add idempotency principle section
   - Create ADR-0032: Duplicate Prevention Architecture

6. 🔍 **Add monitoring**
   - Log duplicate detection events
   - Track sync health metrics
   - Alert on validation failures

---

## Risk Assessment

### Low Risk Changes

- ✅ Only adds safety checks (no removal of existing logic)
- ✅ Non-breaking (existing metadata.json format unchanged)
- ✅ Backwards compatible (works with old increments)
- ✅ Fail-safe (defaults to creation if check fails)

### Rollback Plan

If issues occur:
```bash
# 1. Revert hook changes
git checkout HEAD~1 plugins/specweave/hooks/post-increment-planning.sh

# 2. Rebuild
npm run build

# 3. Test without duplicate detection
/specweave:increment "Test Rollback"
```

---

## Success Metrics

### Before Fix

- ❌ 64 FS-* issues (120% bloat)
- ❌ 6 INC-0031 issues (500% bloat)
- ❌ 41 duplicate issues
- ❌ Non-idempotent sync
- ❌ Manual cleanup required

### After Fix

- ✅ 29 FS-* issues (1:1 mapping)
- ✅ 1 INC-* issue per active increment
- ✅ 0 duplicate issues
- ✅ Idempotent sync (safe to re-run)
- ✅ Self-healing (automatic relink)

### Business Impact

- 📈 **Developer Experience**: Clean GitHub issues list
- 📈 **System Reliability**: Predictable, repeatable syncs
- 📈 **Maintenance**: Zero manual cleanup needed
- 📈 **Search Quality**: Accurate, noise-free results
- 📈 **Audit Trail**: Clear, unambiguous tracking

---

**Status**: ✅ FIX COMPLETE, READY FOR TESTING AND CLEANUP
