# Migration Guide: Duplicate Prevention System (v0.18.3)

**Version**: 0.18.3
**Feature**: Duplicate Increment Prevention & Resolution
**Impact**: Low - Non-breaking, backward compatible
**Action Required**: Optional cleanup recommended

---

## Overview

SpecWeave v0.18.3 introduces comprehensive duplicate increment prevention and resolution capabilities:

✅ **Automatic Detection**: Scans for duplicate increments across all folders
✅ **Smart Resolution**: AI-powered winner selection with content merging
✅ **Manual Archive**: Explicit archiving workflow with safety checks
✅ **Zero Breaking Changes**: Existing increments work without modification

---

## What's New

### 1. Duplicate Detection System

**Automatic scanning** during critical operations:
- ✅ Increment planning (`/specweave:increment`)
- ✅ Increment completion (`/specweave:done`)
- ✅ Status checks (`/specweave:status`)

**Scans all folders**:
- `.specweave/increments/` (active)
- `.specweave/increments/_archive/`
- `.specweave/increments/_abandoned/`
- `.specweave/increments/_backlog/`
- `.specweave/increments/_paused/`

### 2. Fix Duplicates Command

**New command**: `/specweave:fix-duplicates`

**Capabilities**:
- Detect duplicates by increment number
- Smart winner selection (4-tier algorithm)
- Content merging (reports/, metadata.json)
- Dry-run preview
- Resolution reports

**Example**:
```bash
# Preview what would be fixed
/specweave:fix-duplicates --dry-run

# Fix with content merging (recommended)
/specweave:fix-duplicates --merge

# Fix specific increment
/specweave:fix-duplicates 0031
```

### 3. Manual Archive Command

**Enhanced**: `/specweave:archive` (already existed, now documented)

**New features**:
- Duplicate prevention (blocks archiving if already in archive)
- External sync checks (GitHub, JIRA, ADO)
- Filtering options (keep-last, older-than, pattern)
- Dry-run mode

**Example**:
```bash
# Archive old increments (keep last 10)
/specweave:archive --keep-last 10

# Archive by age (older than 90 days)
/specweave:archive --older-than 90

# Preview before archiving
/specweave:archive --keep-last 10 --dry-run
```

### 4. Winner Selection Algorithm

**4-Tier Prioritization**:

1. **Status Priority** (highest wins):
   - active = 5 points
   - completed = 4 points
   - paused = 3 points
   - backlog = 2 points
   - abandoned = 1 point

2. **Most Recent Activity** (tiebreaker):
   - Uses `lastActivity` from metadata.json
   - Falls back to directory modification time

3. **Completeness** (second tiebreaker):
   - More files = more complete
   - Larger total size = more complete

4. **Location Preference** (final tiebreaker):
   - Active folder > Paused > Archive > Abandoned

---

## Migration Steps

### Step 1: Update to v0.18.3

```bash
# Update SpecWeave
npm install -g specweave@latest

# Verify version
specweave --version
# Should show: 0.18.3 or higher
```

### Step 2: Scan for Existing Duplicates (Optional)

```bash
# Preview duplicate detection (no changes made)
/specweave:fix-duplicates --dry-run
```

**Expected output**:
- If no duplicates: `✅ No duplicates found!`
- If duplicates exist: Shows resolution plan

### Step 3: Fix Duplicates (If Found)

**Recommended workflow**:

```bash
# 1. Preview resolution plan
/specweave:fix-duplicates --dry-run

# 2. Review which increments would be kept/deleted
# - Check winner selection makes sense
# - Verify valuable content will be merged

# 3. Fix with content merging (safest option)
/specweave:fix-duplicates --merge

# 4. Review resolution reports
ls .specweave/increments/*/reports/DUPLICATE-RESOLUTION-*.md
```

**Alternative (automated)**:
```bash
# Auto-fix without confirmation (use with caution!)
/specweave:fix-duplicates --merge --force
```

### Step 4: Archive Old Increments (Optional)

**Clean up completed work**:

```bash
# Keep last 10 increments visible
/specweave:archive --keep-last 10

# Or archive by age (older than 90 days)
/specweave:archive --older-than 90

# Preview first (recommended)
/specweave:archive --keep-last 10 --dry-run
```

---

## Common Scenarios

### Scenario 1: Duplicate in Active + Archive

**Problem**: Increment 0031 exists in both `.specweave/increments/` and `_archive/`

**Solution**:
```bash
# Fix specific increment
/specweave:fix-duplicates 0031 --merge

# Winner: Active version (status priority)
# Action: Archives merged to active, archive version deleted
```

### Scenario 2: Three-Way Conflict

**Problem**: Increment 0025 exists in active, archive, and abandoned folders

**Solution**:
```bash
/specweave:fix-duplicates 0025 --merge

# Winner Selection:
# 1. Active (status: active, 5 points) → WINNER
# 2. Archive (status: completed, 4 points)
# 3. Abandoned (status: abandoned, 1 point)

# Action: Merges content from archive and abandoned to active
```

### Scenario 3: Different Names, Same Number

**Problem**:
- `.specweave/increments/0031-external-tool-sync/`
- `.specweave/increments/_archive/0031-external-tool-status-sync/`

**Solution**:
```bash
/specweave:fix-duplicates 0031 --merge

# Detection: Both have increment number 0031
# Winner: Active version (better status)
# Action: Content merged, archive deleted
```

### Scenario 4: Too Many Completed Increments

**Problem**: 50 completed increments cluttering workspace

**Solution**:
```bash
# Keep last 10 visible, archive rest
/specweave:archive --keep-last 10

# Result: 40 moved to _archive/, 10 remain visible
```

---

## Backward Compatibility

### ✅ No Breaking Changes

**Existing workflows unchanged**:
- `/specweave:increment` - Works as before
- `/specweave:do` - No changes
- `/specweave:done` - Adds duplicate detection (non-blocking)
- `/specweave:status` - Shows duplicates if found

**Existing increments**:
- ✅ Work without modification
- ✅ Metadata.json format unchanged
- ✅ Folder structure unchanged
- ✅ External sync (GitHub, JIRA, ADO) unaffected

### Optional Adoption

**You can choose**:
- ✅ Use new commands when needed (`/specweave:fix-duplicates`)
- ✅ Ignore duplicates (system warns but doesn't block)
- ✅ Clean up manually (move folders yourself)

**System behavior**:
- **Planning**: Warns about duplicates, suggests fix
- **Completion**: Warns about duplicates, continues
- **Archiving**: Prevents creating duplicates

---

## Safety Guarantees

### 1. Multiple Confirmation Layers

**Before deletion**:
- ✅ Shows resolution plan
- ✅ Asks for confirmation (unless `--force`)
- ✅ Default answer: No deletion

**Example**:
```
Delete archive/0031-external-tool-sync? [y/N]: _
```

### 2. Content Preservation

**When using `--merge`**:
- ✅ Copies all files from `reports/` folder
- ✅ Merges metadata.json (external links, tags)
- ✅ Creates resolution report (audit trail)

**Never lost**:
- Reports and session notes
- GitHub/JIRA/ADO issue numbers
- External sync status

### 3. Dry-Run Mode

**Preview changes**:
```bash
/specweave:fix-duplicates --dry-run
```

**Shows**:
- Which increments would be kept
- Which would be deleted
- How many files affected
- No actual changes made

### 4. Resolution Reports

**Automatic documentation**:
- Created at: `reports/DUPLICATE-RESOLUTION-{timestamp}.md`
- Documents: What was merged, what was deleted, why
- Permanent audit trail

---

## Troubleshooting

### "Duplicate increment detected" warning

**Cause**: Same increment number exists in multiple folders

**Fix**:
```bash
# Preview resolution
/specweave:fix-duplicates --dry-run

# Fix with content merging
/specweave:fix-duplicates --merge
```

### Archive command fails with "already exists in archive"

**Cause**: Attempting to archive when duplicate already in _archive/

**Fix**:
```bash
# Fix the duplicate first
/specweave:fix-duplicates 0031 --merge

# Then archive if needed
/specweave:archive 0031
```

### Wrong increment selected as winner

**Cause**: Algorithm prioritizes active > completed > paused

**Manual override**:
```bash
# Don't use /specweave:fix-duplicates
# Instead, manually:
# 1. Copy valuable content from loser to winner
# 2. Delete loser folder manually
# 3. Create resolution report for audit trail
```

### Content lost after duplicate resolution

**Prevention**: ALWAYS use `--merge` flag
```bash
# ✅ CORRECT - Preserves content
/specweave:fix-duplicates --merge

# ❌ WRONG - May lose reports
/specweave:fix-duplicates
```

**Recovery**: Check git history
```bash
# Find deleted files
git log --all --full-history -- .specweave/increments/0031-*

# Restore from commit
git checkout <commit-hash> -- .specweave/increments/0031-lost-content/
```

---

## Best Practices

### 1. Regular Cleanup

**Monthly workflow**:
```bash
# 1. Fix any duplicates
/specweave:fix-duplicates --merge

# 2. Archive old increments
/specweave:archive --keep-last 10

# 3. Check status
/specweave:status
```

### 2. Safe Archiving

**Always preview first**:
```bash
# 1. Dry-run to see what would happen
/specweave:archive --keep-last 10 --dry-run

# 2. Review output carefully

# 3. Execute if looks correct
/specweave:archive --keep-last 10
```

### 3. Content Preservation

**When fixing duplicates**:
```bash
# ✅ ALWAYS use --merge for valuable content
/specweave:fix-duplicates --merge

# ✅ Review resolution report after
cat .specweave/increments/*/reports/DUPLICATE-RESOLUTION-*.md
```

### 4. Automation

**CI/CD integration**:
```bash
# In pre-release script:
# 1. Fix duplicates automatically
/specweave:fix-duplicates --merge --force

# 2. Archive old work
/specweave:archive --older-than 180 --force

# 3. Validate clean state
/specweave:validate
```

---

## FAQ

### Q: Will this break my existing increments?

**A**: No. All changes are backward compatible. Existing increments work without modification.

### Q: Do I need to fix duplicates immediately?

**A**: No. Duplicates trigger warnings but don't block operations. Fix when convenient.

### Q: What happens if I don't use --merge?

**A**: Losing increments are deleted without merging content. Use `--merge` to preserve reports.

### Q: Can I disable duplicate detection?

**A**: Not recommended. Detection is lightweight and helps maintain data integrity. Warnings are non-blocking.

### Q: How do I restore a deleted increment?

**A**: Check git history (`git log --all --full-history`) or restore from backup. Resolution reports document what was deleted.

### Q: Does this work with GitHub/JIRA/ADO sync?

**A**: Yes. External sync status is preserved during merging. Archive command respects open external issues.

---

## Related Documentation

- **Command Reference**: `/specweave:fix-duplicates --help`
- **Archive Guide**: `/specweave:archive --help`
- **CLAUDE.md**: Complete contributor guide with troubleshooting
- **Architecture**: `.specweave/increments/0033-duplicate-increment-prevention/spec.md`

---

## Version History

- **v0.18.3**: Initial release (duplicate detection + fix-duplicates command)
- **v0.18.0**: Manual archive command (undocumented)
- **v0.17.0**: Conflict resolver implementation

---

**Questions?** Open an issue at: https://github.com/anton-abyzov/specweave/issues

**Need help?** Run `/specweave:fix-duplicates --dry-run` to preview resolution safely.
