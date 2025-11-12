# metadata.json Backfill Plan

**Date**: 2025-11-12
**Purpose**: Ensure ALL increments have metadata.json for status tracking and external sync

## Current State

- **Total increments**: 30
- **With metadata.json**: 25 (83%)
- **Missing metadata.json**: 5 (17%)

### Missing Increments Analysis

| ID | Spec? | Tasks? | Status | Action |
|----|-------|--------|--------|--------|
| 0023-release-management-enhancements | ✅ | ✅ | Valid, needs backfill | Run backfill script |
| 0027-multi-project-github-sync | ❌ | ❌ | Abandoned | Create metadata with `status: abandoned` |
| 0028-multi-repo-ux-improvements | ✅ | ✅ | Valid, needs backfill | Run backfill script |
| 0029-cicd-failure-detection-auto-fix | ✅ | ✅ | Valid, needs backfill | Run backfill script |
| 0030-intelligent-living-docs | ❌ | ❌ | Incomplete | Either complete planning or abandon |

## Action Steps

### Step 1: Run Automatic Backfill (Recommended)

```bash
# Automatically backfills all missing metadata.json files
# Looks up GitHub issues and creates metadata with sync info
bash scripts/backfill-metadata.sh
```

**Expected Output**:
```
✅ 0023-release-management-enhancements - metadata.json created (issue #XX)
✅ 0028-multi-repo-ux-improvements - metadata.json created (issue #YY)
✅ 0029-cicd-failure-detection-auto-fix - metadata.json created (issue #ZZ)
⚠️  0027-multi-project-github-sync - no GitHub issue found
⚠️  0030-intelligent-living-docs - no GitHub issue found

Created: 3 metadata files
Skipped: 25 (already exist)
No issue: 2 (no GitHub issue found)
```

### Step 2: Handle Abandoned Increments

**0027-multi-project-github-sync** (already has ABANDONED.md):

```bash
# Create metadata.json manually for abandoned increment
cat > .specweave/increments/0027-multi-project-github-sync/metadata.json <<'EOF'
{
  "id": "0027-multi-project-github-sync",
  "status": "abandoned",
  "type": "feature",
  "created": "2025-11-11T19:27:00Z",
  "lastActivity": "2025-11-11T19:27:00Z",
  "abandonedAt": "2025-11-11T19:27:00Z",
  "abandonedReason": "Incomplete implementation (no tasks.md), superseded by increment 0028"
}
EOF
```

### Step 3: Handle Incomplete Increments

**0030-intelligent-living-docs** (only has reports/, no spec/tasks):

**Option A: Complete Planning** (if work is needed)
```bash
# Regenerate spec/plan/tasks
/specweave:increment "0030-intelligent-living-docs"
# This will trigger post-increment-planning hook
# Hook will create metadata.json automatically
```

**Option B: Abandon** (if work not needed)
```bash
# Mark as abandoned
cat > .specweave/increments/0030-intelligent-living-docs/metadata.json <<'EOF'
{
  "id": "0030-intelligent-living-docs",
  "status": "abandoned",
  "type": "feature",
  "created": "2025-11-12T01:43:00Z",
  "lastActivity": "2025-11-12T01:43:00Z",
  "abandonedAt": "2025-11-12T01:43:00Z",
  "abandonedReason": "Never fully planned, only created reports folder"
}
EOF

# Create ABANDONED.md
cat > .specweave/increments/0030-intelligent-living-docs/ABANDONED.md <<'EOF'
# Increment 0030: Intelligent Living Docs - ABANDONED

**Status**: Abandoned
**Date**: 2025-11-12
**Reason**: Never fully planned (no spec.md or tasks.md created)

## Why Abandoned

This increment folder was created but planning never completed. Only reports/ folder exists.

Work may be revisited in a future increment if needed.
EOF
```

### Step 4: Verify All Increments Have metadata.json

```bash
# Check for any remaining missing metadata
for dir in .specweave/increments/[0-9][0-9][0-9][0-9]-*; do
  if [ -d "$dir" ]; then
    id=$(basename "$dir")
    if [ ! -f "$dir/metadata.json" ]; then
      echo "❌ STILL MISSING: $id"
    fi
  fi
done

# If no output → All increments have metadata.json! ✅
```

## Why This Matters

### Critical Dependencies on metadata.json

1. **Status Line Feature** - Shows current increment progress
   - Reads `metadata.json` to find active increment
   - Without it → Status line shows nothing

2. **WIP Limits** - Prevents starting too many increments
   - Counts active increments by reading `status` field
   - Without it → Discipline enforcement fails

3. **External Tool Sync** - GitHub/JIRA/ADO integration
   - Stores issue numbers, epic keys, work item IDs
   - Without it → Sync breaks, manual re-linking needed

4. **Status Commands** - `/specweave:pause`, `/specweave:resume`, `/specweave:status`
   - Read/write metadata for state transitions
   - Without it → Commands fail with "metadata not found"

5. **Completion Tracking** - `/specweave:done`
   - Updates `completedAt`, `completionNotes`
   - Without it → No way to mark increments complete

## Expected Outcome

After completing all steps:
- ✅ **30/30 increments** have metadata.json (100% coverage)
- ✅ Valid increments have `status: active/completed`
- ✅ Abandoned increments have `status: abandoned` + ABANDONED.md
- ✅ All metadata has proper timestamps
- ✅ GitHub-synced increments have issue links
- ✅ Status line works correctly
- ✅ WIP limits enforced properly

## Ongoing Maintenance

**Future increments will automatically get metadata.json** via post-increment-planning hook.

**No manual intervention needed** going forward! ✅

---

**Next**: Run `bash scripts/backfill-metadata.sh` to fix missing metadata
