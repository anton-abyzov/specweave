---
description: Automatically detect and resolve duplicate increments with smart conflict resolution
disable-model-invocation: true
---

# Fix Duplicate Increments

**Intelligent conflict resolution**: Automatically detects duplicate increments and resolves conflicts by selecting the winner, merging valuable content, and cleaning up losers.

## Philosophy

**Data safety first** - This command provides multiple safety layers:
- ✅ Shows resolution plan before making changes
- ✅ Dry-run mode for preview
- ✅ Merges valuable content before deletion
- ✅ Creates detailed resolution reports
- ✅ Requires confirmation unless `--force` flag

## Usage

```bash
# Detect and fix all duplicates interactively
/sw:fix-duplicates

# Preview what would be done (dry-run)
/sw:fix-duplicates --dry-run

# Auto-fix with content merging
/sw:fix-duplicates --merge

# Force fix without confirmation (use with caution!)
/sw:fix-duplicates --force --merge

# Fix specific increment number
/sw:fix-duplicates 0031
```

## Options

- `<increment-number>`: Optional. Fix only duplicates of specific increment number (e.g., "31", "0031")
- `--dry-run`: Show what would be done without making changes
- `--merge`: Merge valuable content from losers to winner before deletion
- `--force`: Skip confirmation prompts (for automated scripts)
- `--strategy <name>`: Override default resolution strategy (advanced)

## How It Works

### Step 1: Detection

Scans `.specweave/increments/` and all special folders:
- Active increments (`.specweave/increments/NNNN-*`)
- Archive (`.specweave/increments/_archive/`)
- Abandoned (`.specweave/increments/_abandoned/`)
- Backlog (`.specweave/increments/_backlog/`)

Detects duplicates by increment number (e.g., all folders starting with `0031-`).

### Step 2: Winner Selection

**Automatic prioritization algorithm**:

1. **Status priority** (highest wins):
   - active = 5 points
   - completed = 4 points
   - paused = 3 points
   - backlog = 2 points
   - abandoned = 1 point

2. **Most recent activity** (tiebreaker):
   - Uses `lastActivity` from metadata.json
   - Falls back to directory modification time

3. **Completeness** (second tiebreaker):
   - More files = more complete
   - Larger total size = more complete

4. **Location preference** (final tiebreaker):
   - Active folder > Paused > Archive > Abandoned

**Example**:
```
Increment 0031 exists in 3 locations:
  1. active/0031-external-tool-sync (status: active, activity: 2025-11-14) → WINNER
  2. archive/0031-external-tool-sync (status: completed, activity: 2025-11-12)
  3. abandoned/0031-old-attempt (status: abandoned, activity: 2025-10-01)

Winner: Location 1 (active status + most recent activity)
```

### Step 3: Content Merging (Optional)

When `--merge` flag is enabled:

1. **Merge reports/ folder**:
   - Copy all files from losers' `reports/` to winner's `reports/`
   - Rename conflicting files: `REPORT.md` → `REPORT-{timestamp}.md`
   - Preserves completion summaries, session notes, analysis

2. **Merge metadata.json**:
   - Take union of external links (GitHub, JIRA, ADO)
   - Preserve all external issue numbers
   - Keep winner's primary metadata (status, dates)

3. **Create resolution report**:
   - `reports/DUPLICATE-RESOLUTION-{timestamp}.md`
   - Documents what was merged from where
   - Lists all deleted paths

**Example merge**:
```
Winner: .specweave/increments/0031-external-tool-sync/
  reports/
    ├─ IMPLEMENTATION-COMPLETE.md (original)
    ├─ SESSION-NOTES-2025-11-12.md (merged from archive)
    └─ DUPLICATE-RESOLUTION-20251115-070000.md (NEW)

Loser 1: .specweave/increments/_archive/0031-external-tool-sync/
  reports/
    └─ SESSION-NOTES-2025-11-12.md → MERGED to winner

Loser 2: .specweave/increments/_abandoned/0031-old-attempt/
  (No valuable content to merge)
```

### Step 4: Deletion

**Safety measures**:
- Shows confirmation prompt: `Delete {path}? This will permanently remove {N} files. [y/N]`
- Default answer: `N` (no deletion unless confirmed)
- `--force` flag skips prompts (for CI/automated scripts)
- Dry-run mode never deletes (shows preview only)

## Examples

### Example 1: Interactive Fix (Recommended)

```bash
/sw:fix-duplicates
```

**Output**:
```
🔍 Scanning for duplicate increments...

Found 2 duplicates:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Duplicate 1: Increment 0031-external-tool-status-sync
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Locations:
  1. ✓ (recommended) active/0031-external-tool-status-sync
     Status: active | Activity: 2025-11-14 | Files: 12
     Reason: Active status + most recent

  2. ✗ archive/0031-external-tool-sync
     Status: completed | Activity: 2025-11-12 | Files: 10

Resolution Plan:
  • Keep: active/0031-external-tool-status-sync
  • Delete: archive/0031-external-tool-sync

Delete archive/0031-external-tool-sync? [y/N]: y

✅ Resolved duplicate 0031
   • Kept: active/0031-external-tool-status-sync
   • Deleted: archive/0031-external-tool-sync (10 files removed)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Duplicates found: 2
Duplicates resolved: 2
Files deleted: 15
Space freed: 2.3 MB

📝 Resolution reports:
   • active/0031-external-tool-status-sync/reports/DUPLICATE-RESOLUTION-20251115-070000.md
```

### Example 2: Dry-Run Preview

```bash
/sw:fix-duplicates --dry-run
```

**Output**:
```
🔍 DRY RUN - No files will be deleted

Found 2 duplicates:

Duplicate 1: Increment 0031
  [DRY RUN] Would keep: active/0031-external-tool-status-sync
  [DRY RUN] Would delete: archive/0031-external-tool-sync (10 files)

Duplicate 2: Increment 0032
  [DRY RUN] Would keep: active/0032-increment-number-gap-prevention
  [DRY RUN] Would delete: active/0032-prevent-increment-number-gaps (8 files)

Summary:
  Would resolve: 2 duplicates
  Would delete: 18 files
  Would free: 2.5 MB

Run without --dry-run to proceed:
  /sw:fix-duplicates --merge
```

### Example 3: Auto-Fix with Merge

```bash
/sw:fix-duplicates --merge --force
```

**Output**:
```
🔍 Scanning for duplicate increments...

Found 2 duplicates:

Duplicate 1: Increment 0031
  ✓ Winner: active/0031-external-tool-status-sync
  📦 Merging content from losers...
     • Merged: reports/SESSION-NOTES-2025-11-12.md
     • Created: reports/DUPLICATE-RESOLUTION-20251115-070000.md
  ✓ Deleted: archive/0031-external-tool-sync

Duplicate 2: Increment 0032
  ✓ Winner: active/0032-increment-number-gap-prevention
  ⚠️  No content to merge (loser empty)
  ✓ Deleted: active/0032-prevent-increment-number-gaps

✅ All duplicates resolved!

Summary:
  Resolved: 2 duplicates
  Merged: 1 file
  Deleted: 2 paths (18 files)
  Space freed: 2.5 MB
```

### Example 4: Fix Specific Increment

```bash
/sw:fix-duplicates 0031
```

**Output**:
```
🔍 Scanning for duplicates of increment 0031...

Found 1 duplicate:

Duplicate: Increment 0031-external-tool-status-sync
  Locations:
    1. ✓ active/0031-external-tool-status-sync (recommended)
    2. ✗ archive/0031-external-tool-sync

Delete archive/0031-external-tool-sync? [y/N]: y

✅ Duplicate 0031 resolved
   • Kept: active/0031-external-tool-status-sync
   • Deleted: archive/0031-external-tool-sync
```

## Error Handling

### No Duplicates Found

```
🔍 Scanning for duplicate increments...

✅ No duplicates found!

All increments have unique numbers and locations.
```

### User Declines Deletion

```
Delete archive/0031-external-tool-sync? [y/N]: n

⏭️  Skipped deletion of archive/0031-external-tool-sync

Summary:
  Duplicates found: 2
  Duplicates resolved: 0
  User declined: 2

💡 Tip: Use --force to skip confirmation prompts
```

### Filesystem Error

```
❌ Error resolving duplicate 0031:
   Failed to delete archive/0031-external-tool-sync
   Reason: Permission denied

Recommendation:
  1. Check file permissions
  2. Close any programs using these files
  3. Retry with sudo (if appropriate)
```

## Resolution Report Format

**File**: `reports/DUPLICATE-RESOLUTION-{timestamp}.md`

```markdown
# Duplicate Resolution Report

**Increment**: 0031-external-tool-status-sync
**Resolved**: 2025-11-15 07:00:00 UTC
**Command**: /sw:fix-duplicates --merge

## Detected Duplicates

Increment 0031 existed in 2 locations:
1. active/0031-external-tool-status-sync (status: active, activity: 2025-11-14)
2. archive/0031-external-tool-sync (status: completed, activity: 2025-11-12)

## Winner Selection

**Winner**: active/0031-external-tool-status-sync

**Reason**: Active status (5 points) + Most recent activity (2025-11-14)

## Content Merged

Merged from archive/0031-external-tool-sync:
- reports/SESSION-NOTES-2025-11-12.md → reports/SESSION-NOTES-2025-11-12.md
- metadata.json (union of external links)

## Deleted Paths

- archive/0031-external-tool-sync (10 files, 1.2 MB)

## Metadata Union

**GitHub**:
- Issue #45 (from winner)
- Issue #42 (from archive) ← merged

**JIRA**:
- PROJ-123 (from winner)

## Summary

- Duplicates resolved: 1
- Files merged: 1
- Paths deleted: 1
- Space freed: 1.2 MB
- Total time: 0.5s
```

## Implementation

```typescript
import { Task } from '@claude/types';

const task = new Task('fix-duplicates', 'Fix duplicate increments');

task.run(async () => {
  const { detectAllDuplicates } = await import('../../../dist/src/core/increment/duplicate-detector.js');
  const { resolveConflict } = await import('../../../dist/src/core/increment/conflict-resolver.js');

  // Parse arguments
  const args = process.argv.slice(2);
  const incrementNumber = args.find(arg => /^\d+$/.test(arg));

  // Parse options
  const options = {
    dryRun: args.includes('--dry-run'),
    merge: args.includes('--merge'),
    force: args.includes('--force'),
    strategy: args.includes('--strategy') ? args[args.indexOf('--strategy') + 1] : undefined
  };

  // Detect duplicates
  console.log('🔍 Scanning for duplicate increments...\n');
  const report = await detectAllDuplicates(process.cwd());

  // Filter by increment number if specified
  let duplicates = report.duplicates;
  if (incrementNumber) {
    const paddedNumber = incrementNumber.padStart(4, '0');
    duplicates = duplicates.filter(d => d.incrementNumber === paddedNumber);
  }

  if (duplicates.length === 0) {
    console.log('✅ No duplicates found!\n');
    console.log('All increments have unique numbers and locations.');
    return;
  }

  console.log(`Found ${duplicates.length} duplicate${duplicates.length > 1 ? 's' : ''}:\n`);

  // Display resolution plan
  if (options.dryRun) {
    console.log('🔍 DRY RUN - No files will be deleted\n');
  }

  // Resolve each duplicate
  const results = [];
  for (const duplicate of duplicates) {
    console.log('━'.repeat(60));
    console.log(`Duplicate: Increment ${duplicate.incrementNumber}`);
    console.log('━'.repeat(60));

    // Show locations
    console.log('\nLocations:');
    duplicate.locations.forEach((loc, index) => {
      const isWinner = loc === duplicate.recommendedWinner;
      const marker = isWinner ? '✓ (recommended)' : '✗';
      console.log(`  ${index + 1}. ${marker} ${path.basename(loc.path)}`);
      console.log(`     Status: ${loc.metadata?.status || 'unknown'} | Activity: ${loc.metadata?.lastActivity || 'unknown'} | Files: ${loc.fileCount}`);
    });

    // Show resolution reason
    console.log(`\nResolution reason: ${duplicate.resolutionReason}`);

    // Resolve conflict
    try {
      const result = await resolveConflict(duplicate, options);
      results.push(result);

      if (options.dryRun) {
        console.log(`\n[DRY RUN] Would keep: ${path.basename(result.winner)}`);
        console.log(`[DRY RUN] Would delete: ${result.deleted.map(p => path.basename(p)).join(', ')}`);
      } else {
        console.log(`\n✅ Resolved duplicate ${duplicate.incrementNumber}`);
        console.log(`   • Kept: ${path.basename(result.winner)}`);
        console.log(`   • Deleted: ${result.deleted.map(p => path.basename(p)).join(', ')}`);
        if (result.merged.length > 0) {
          console.log(`   • Merged: ${result.merged.length} file(s)`);
        }
      }
    } catch (error) {
      console.error(`\n❌ Error resolving duplicate ${duplicate.incrementNumber}:`);
      console.error(`   ${error.message}`);
    }

    console.log();
  }

  // Summary
  console.log('━'.repeat(60));
  console.log('Summary');
  console.log('━'.repeat(60));

  const totalDeleted = results.reduce((sum, r) => sum + r.deleted.length, 0);
  const totalMerged = results.reduce((sum, r) => sum + r.merged.length, 0);

  if (options.dryRun) {
    console.log(`\nWould resolve: ${results.length} duplicate${results.length > 1 ? 's' : ''}`);
    console.log(`Would delete: ${totalDeleted} path${totalDeleted > 1 ? 's' : ''}`);
    if (totalMerged > 0) {
      console.log(`Would merge: ${totalMerged} file${totalMerged > 1 ? 's' : ''}`);
    }
    console.log('\nRun without --dry-run to proceed:');
    console.log('  /sw:fix-duplicates --merge');
  } else {
    console.log(`\nDuplicates resolved: ${results.length}`);
    console.log(`Paths deleted: ${totalDeleted}`);
    if (totalMerged > 0) {
      console.log(`Files merged: ${totalMerged}`);
    }
    console.log('\n📝 Resolution reports:');
    results.forEach(r => {
      console.log(`   • ${r.reportPath}`);
    });
  }
});

export default task;
```

## Configuration

No configuration needed - all options are provided via command-line flags.

## Related Commands

- `/sw:archive <id>` - Archive specific increment (prevents duplicates)
- `/sw:restore <id>` - Restore increment from archive
- `/sw:status` - View all increment statuses

## Safety Notes

### ⚠️ Important Warnings

1. **Backup before bulk operations**: If fixing many duplicates, consider git commit first
2. **Review dry-run output**: Always run with `--dry-run` first to preview changes
3. **Merge valuable content**: Use `--merge` flag to preserve reports and session notes
4. **Force flag caution**: `--force` skips confirmations - use only in automated scripts

### 🔒 What Gets Preserved

**Always preserved** (in winner):
- spec.md, plan.md, tasks.md (core files)
- metadata.json (merged external links if `--merge`)
- All files in winner's directory

**Conditionally preserved** (if `--merge`):
- reports/ folder from losers → merged to winner
- External links (GitHub, JIRA, ADO) → union in metadata.json

**Always deleted**:
- Losing increment directories and all their contents
- Creates resolution report documenting what was deleted

---

**Best Practice**: Run with `--dry-run --merge` first to see what would happen, then run without `--dry-run` to apply changes.
