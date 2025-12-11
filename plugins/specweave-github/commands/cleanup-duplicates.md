---
name: specweave-github:cleanup-duplicates
description: Clean up duplicate GitHub issues for a Feature. Finds issues with duplicate titles and closes all except the first created issue.
justification: |
  CRITICAL INCIDENT RESPONSE TOOL - DO NOT DELETE!

  Why This Command Exists:
  - Prevention systems (deduplication, GitHub self-healing) work for single-process execution
  - Multiple parallel Claude Code instances bypass all prevention (file-based cache, no distributed locking)
  - GitHub API race conditions: Time gap between "check exists" and "create issue" allows duplicates
  - Historical duplicates from pre-v0.14.1 users (before prevention was added)

  Evidence of Need:
  - 2025-11-13: 123 duplicate GitHub issues incident (cleaned to 29 unique)
  - Parallel execution creates race conditions that prevention CANNOT solve
  - Industry standard: Prevention + Detection + Cleanup (defense in depth)

  When to Delete:
  - ONLY if distributed locking implemented (Redis/file locks)
  - AND parallel execution tested (100+ concurrent syncs with zero duplicates)
  - AND zero duplicates for 6+ months in production
  - AND all users migrated to prevention-enabled versions

  See: .specweave/increments/0043-spec-md-desync-fix/reports/ULTRATHINK-CLEANUP-DUPLICATES-NECESSITY-2025-11-18.md
---

# Clean Up Duplicate GitHub Issues

**CRITICAL**: This command detects and closes duplicate GitHub issues created by multiple syncs.

## Usage

```bash
/sw-github:cleanup-duplicates <epic-id> [--dry-run]
```

## What It Does

**Duplicate Detection & Cleanup**:

1. **Find all issues** for the Epic (searches by Epic ID in title)
2. **Group by title** (detect duplicates)
3. **For each duplicate group**:
   - Keep the **FIRST created** issue (lowest number)
   - Close all **LATER** issues with comment: "Duplicate of #XXX"
4. **Update Epic README** with correct issue numbers

## Examples

### Dry Run (No Changes)

```bash
/sw-github:cleanup-duplicates FS-031 --dry-run
```

**Output**:
```
🔍 Scanning for duplicates in Epic FS-031...
   Found 25 total issues
   Detected 10 duplicate groups:

   📋 Group 1: "[FS-031] External Tool Status Synchronization"
      - #250 (KEEP) - Created 2025-11-10
      - #255 (CLOSE) - Created 2025-11-11 - DUPLICATE
      - #260 (CLOSE) - Created 2025-11-12 - DUPLICATE

   📋 Group 2: "[FS-031] Multi-Project GitHub Sync"
      - #251 (KEEP) - Created 2025-11-10
      - #256 (CLOSE) - Created 2025-11-11 - DUPLICATE

   ...

✅ Dry run complete!
   Total issues: 25
   Duplicate groups: 10
   Issues to close: 15

⚠️  This was a DRY RUN - no changes made.
   Run without --dry-run to actually close duplicates.
```

### Actual Cleanup

```bash
/sw-github:cleanup-duplicates FS-031
```

**Output**:
```
🔍 Scanning for duplicates in Epic FS-031...
   Found 25 total issues
   Detected 10 duplicate groups

⚠️  CONFIRM: Close 15 duplicate issues? [y/N]
> y

🗑️  Closing duplicates...
   ✅ Closed #255 (duplicate of #250)
   ✅ Closed #256 (duplicate of #251)
   ✅ Closed #260 (duplicate of #250)
   ...

📝 Updating Epic README frontmatter...
   ✅ Updated frontmatter with correct issue numbers

✅ Cleanup complete!
   Closed: 15 duplicates
   Kept: 10 original issues
```

## Arguments

- `<epic-id>` - Epic ID (e.g., `FS-031` or just `031`)
- `--dry-run` - Preview changes without actually closing issues (optional)

## Safety Features

✅ **Confirmation prompt**: Asks before closing issues (unless --dry-run)
✅ **Dry run mode**: Preview changes safely
✅ **Keeps oldest issue**: Preserves the first created issue
✅ **Adds closure comment**: Links to the original issue
✅ **Updates metadata**: Fixes Epic README frontmatter

## What Gets Closed

**Closed issues**:
- ✅ Duplicate titles (second, third, etc. occurrences)
- ✅ Closed with comment: "Duplicate of #XXX"
- ✅ Original issue kept open (or maintains its status)

**Example comment on closed duplicate**:
```markdown
Duplicate of #250

This issue was automatically closed by SpecWeave cleanup because it is a duplicate.

The original issue (#250) contains the same content and should be used for tracking instead.

🤖 Auto-closed by SpecWeave Duplicate Cleanup
```

## Requirements

1. **GitHub CLI** (`gh`) installed and authenticated
2. **Write access** to repository (for closing issues)
3. **Epic folder exists** at `.specweave/docs/internal/specs/FS-XXX-name/`

## When to Use

**Use this command when**:
- ✅ You see multiple issues with the same title in GitHub
- ✅ Epic sync ran multiple times and created duplicates
- ✅ Epic README frontmatter got corrupted and reset
- ✅ Post-sync validation warns about duplicates

**Example warning that triggers this**:
```
⚠️  WARNING: 10 duplicate(s) detected!
   Run cleanup command to resolve:
   /sw-github:cleanup-duplicates FS-031
```

## Troubleshooting

**"No duplicates found"**:
- Good! Your Epic has no duplicate issues
- Run epic sync is working correctly with duplicate detection

**"GitHub CLI not authenticated"**:
- Run: `gh auth login`
- Ensure you have write access to the repository

**"Could not find Epic folder"**:
- Check Epic exists: `ls .specweave/docs/internal/specs/`
- Verify Epic ID format: `FS-031-epic-name/`

**"Error closing issue"**:
- Check GitHub CLI: `gh auth status`
- Verify write permissions: `gh repo view`

## Architecture

**Duplicate Detection Logic**:
1. Group issues by **exact title match**
2. Within each group, sort by **issue number** (ascending)
3. Keep **first issue** (lowest number = oldest)
4. Close **all others** as duplicates

**Why lowest number?**:
- Lower issue numbers were created first
- Preserves chronological order
- Maintains links from old documentation

## Related Commands

- `/sw-github:sync` - Sync Feature to GitHub (with duplicate detection)
- `/sw:validate` - Validate increment completeness
- `gh issue list` - View all issues (GitHub CLI)

## Implementation

**File**: `plugins/specweave-github/lib/duplicate-detector.ts`

**Class**: `DuplicateDetector`

**Algorithm** (3-phase protection):
1. **Detection**: Search GitHub for existing issues matching pattern
2. **Verification**: Count check to detect duplicates after creation
3. **Reflection**: Auto-close duplicates automatically

For manual cleanup:
1. Search GitHub for all issues with Feature ID
2. Group by title (Map<string, number[]>)
3. Filter groups with >1 issue (duplicates)
4. For each duplicate group:
   - Keep first issue (lowest number)
   - Close others with gh CLI

## Next Steps

After cleanup:

1. **Verify cleanup**: `gh issue list --search "[FS-031]"`
2. **Check Feature FEATURE.md**: Verify frontmatter has correct issue numbers
3. **Re-run sync**: `/sw-github:sync` (should show no duplicates)
4. **Duplicate detection**: Automatically enabled via DuplicateDetector

---

**✅ SAFE TO USE**: This command is idempotent and safe to run multiple times.
