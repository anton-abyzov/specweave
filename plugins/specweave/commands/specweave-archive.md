---
name: specweave:archive
description: Manually archive completed increments - NEVER auto-archives, explicit user action only
---

# Archive Increments (Manual Only)

**CRITICAL POLICY**: Increments are **NEVER** auto-archived. Archiving is **MANUAL ONLY** and requires explicit user action via this command.

## Philosophy

**Keep recent work visible** - Completed increments remain in the main folder for easy reference until you explicitly archive them. This allows:
- ✅ Quick reference to recent implementations
- ✅ Easy linking in new increments
- ✅ Visible completion history
- ✅ ~10-20 completed increments available without searching archives

## Usage

```bash
# Archive specific increment
/specweave:archive 0031

# Archive multiple increments
/specweave:archive 0001 0002 0003

# Archive all completed increments older than N days
/specweave:archive --older-than 90

# Keep last N increments, archive the rest
/specweave:archive --keep-last 10

# Archive by pattern
/specweave:archive --pattern "auth-*"

# Dry run (preview without archiving)
/specweave:archive --dry-run --older-than 90
```

## Options

- `<increment-ids>`: Specific increment IDs to archive (e.g., "1", "0001", "0031")
- `--older-than <days>`: Archive increments older than N days
- `--keep-last <n>`: Keep last N increments, archive the rest (default: 10)
- `--pattern <regex>`: Archive increments matching pattern
- `--archive-completed`: Archive all completed increments (use with caution!)
- `--preserve-active`: Never archive active/paused increments (default: true)
- `--dry-run`: Show what would be archived without moving files

## Archive Rules

### Increments are archived when:
1. Explicitly specified by ID (e.g., `/specweave:archive 0031`)
2. Match age criteria (e.g., `--older-than 90`)
3. Match pattern criteria (e.g., `--pattern "old-*"`)
4. Not in last N increments (e.g., `--keep-last 10`)

### Safety Checks (Always Applied):
- ✅ **Active/paused protection**: Never archive active or paused increments
- ✅ **External sync protection**: Skip increments with open GitHub/JIRA/ADO issues
- ✅ **Uncommitted changes**: Warn if git has uncommitted changes
- ✅ **Duplicate prevention**: Refuse if increment already exists in archive

### Archive Structure:
```
.specweave/increments/
├── 0030-recent-work/           # Active/recent increments
├── 0031-recent-work/           # Stay visible for reference
├── 0032-recent-work/
├── 0033-recent-work/
│
├── _archive/                   # Archived increments
│   ├── 0001-old-work/          # Manually archived
│   ├── 0002-old-work/
│   └── 0003-old-work/
│
└── _abandoned/                 # Abandoned work (separate)
    └── 0004-abandoned-work/
```

## Examples

### Example 1: Archive Specific Increment

```bash
/specweave:archive 0031
```

**Output**:
```
📦 Archiving increments...

Checking increment 0031-external-tool-status-sync...
  ✓ Status: completed
  ✓ No active external sync
  ✓ No uncommitted changes
  ✓ Not already in archive

✅ Archived: 0031-external-tool-status-sync
   Location: .specweave/increments/_archive/0031-external-tool-status-sync/

🔄 Auto-archiving orphaned features...
✅ Auto-archived features: FS-031
📝 Updated 0 links in living docs

📊 Archive Statistics:
   Active: 32 increments
   Archived: 31 increments (+ 1 new)
   Auto-archived features: 1
   Auto-archived epics: 0

Next: /specweave:restore 0031 (if you need to unarchive)
```

### Example 2: Archive Old Increments (Keep Last 10)

```bash
/specweave:archive --keep-last 10
```

**Output**:
```
📦 Archiving increments (keeping last 10)...

Found 33 total increments
Keeping: 0024-0033 (last 10)
Candidates for archive: 0001-0023 (23 increments)

Filtering by status and safety checks...
  ✓ 0001-core-framework (completed, no blockers)
  ✓ 0002-plugin-system (completed, no blockers)
  ...
  ⚠ 0015-auth-service (GitHub issue still open) - SKIPPED
  ✓ 0016-payment-integration (completed, no blockers)
  ...

✅ Archived: 22 increments
⚠️  Skipped: 1 increment (external sync active)

📊 Archive Statistics:
   Active: 11 increments (10 recent + 1 with open issue)
   Archived: 53 increments (+ 22 new)
   Total size: 245 MB
```

### Example 3: Dry Run (Preview)

```bash
/specweave:archive --older-than 90 --dry-run
```

**Output**:
```
🔍 DRY RUN - No files will be moved

Increments older than 90 days:
  [DRY RUN] Would archive: 0001-core-framework (152 days old)
  [DRY RUN] Would archive: 0002-plugin-system (148 days old)
  [DRY RUN] Would archive: 0003-auth-service (145 days old)
  [DRY RUN] Would skip: 0004-payment (GitHub issue open)

Summary:
  Would archive: 18 increments
  Would skip: 5 increments (active sync)
  Total size: 180 MB

Run without --dry-run to proceed:
  /specweave:archive --older-than 90
```

### Example 4: Archive by Pattern

```bash
/specweave:archive --pattern "auth-|payment-|legacy-"
```

**Output**:
```
📦 Archiving increments matching pattern: auth-|payment-|legacy-

Found matches:
  ✓ 0015-auth-service
  ✓ 0016-payment-integration
  ✓ 0007-legacy-migration
  ⚠ 0025-auth-enhancements (still active) - SKIPPED

✅ Archived: 3 increments
⚠️  Skipped: 1 increment (active)

📊 Archive Statistics:
   Active: 30 increments
   Archived: 34 increments (+ 3 new)
```

## Error Handling

### Increment Already Archived

```
❌ Error: Increment 0031 already exists in archive

Location: .specweave/increments/_archive/0031-external-tool-status-sync/

Options:
  1. Delete from archive first, then retry
  2. Restore from archive: /specweave:restore 0031
  3. Resolve duplicates: /specweave:fix-duplicates
```

### Active Increment Protection

```
⚠️  Cannot archive active increments

Skipped:
  • 0032-duplicate-prevention (status: active)
  • 0033-current-work (status: in-progress)

Recommendation:
  1. Close increments first: /specweave:done 0032
  2. Then archive: /specweave:archive 0032
```

### External Sync Active

```
⚠️  Cannot archive increments with active external sync

Skipped:
  • 0031-external-tool-sync (GitHub issue #45 still open)
  • 0030-jira-integration (JIRA PROJ-123 In Progress)

Recommendation:
  1. Close external issues first
  2. Then retry: /specweave:archive 0031 0030

Or force archive (not recommended):
  /specweave:archive 0031 --force
```

## Related Commands

- `/specweave:restore <increment-id>` - Restore increment from archive
- `/specweave:done <increment-id>` - Close increment (does NOT archive!)
- `/specweave:archive-features` - **DEPRECATED**: Now automatic, no longer needed!
- `/specweave:status` - View archive statistics

## Important Notes

### ⚠️ Manual Only Policy

**Increments are NEVER auto-archived!** This is a deliberate design decision:
- ✅ `/specweave:done` closes increments but leaves them visible
- ✅ You control when increments are archived
- ✅ Keep ~10-20 recent increments visible for reference
- ✅ Archive older work when you're ready

### 🔗 Feature Archiving (FULLY AUTOMATIC!)

**Features/epics ARE automatically archived** when all their increments are archived:
- ✅ `/specweave:archive 0031` → **AUTOMATICALLY** archives FS-031 if all increments archived
- ✅ **AUTOMATICALLY** updates living docs and archives orphaned features
- ✅ **ONE COMMAND** does everything - no manual `/specweave:archive-features` needed!
- ✅ Keeps feature docs in sync with increment archives

**You never need to run `/specweave:archive-features` manually anymore!**

### 📦 Archive is Local Only

Archives are **NOT** synced to GitHub/JIRA/ADO. They're local file management only.

## Implementation

```typescript
import { Task } from '@claude/types';

const task = new Task('archive-increments', 'Archive completed increments');

task.run(async () => {
  const { IncrementArchiver } = await import('../../../dist/src/core/increment/increment-archiver.js');
  const archiver = new IncrementArchiver(process.cwd());

  // Parse arguments
  const args = process.argv.slice(2);
  const incrementIds = args.filter(arg => !arg.startsWith('--'));

  // Parse options
  const options = {
    increments: incrementIds.length > 0 ? incrementIds : undefined,
    olderThanDays: parseOption(args, '--older-than'),
    keepLast: parseOption(args, '--keep-last') || 10,
    archiveCompleted: args.includes('--archive-completed'),
    preserveActive: !args.includes('--no-preserve-active'),
    pattern: parseOption(args, '--pattern'),
    dryRun: args.includes('--dry-run')
  };

  // Execute archiving
  const result = await archiver.archive(options);

  // Display results
  if (options.dryRun) {
    console.log('\n🔍 DRY RUN - No files will be moved\n');
  }

  console.log(`✅ Archived: ${result.archived.length} increments`);
  if (result.skipped.length > 0) {
    console.log(`⚠️  Skipped: ${result.skipped.length} increments`);
  }
  if (result.errors.length > 0) {
    console.error(`❌ Errors: ${result.errors.length} increments`);
  }

  // ✅ AUTOMATIC FEATURE ARCHIVING (NEW!)
  // When increments are archived, automatically archive orphaned features
  let featureResult;
  if (result.archived.length > 0 && !options.dryRun) {
    console.log('\n🔄 Auto-archiving orphaned features...');
    const { FeatureArchiver } = await import('../../../dist/src/core/living-docs/feature-archiver.js');
    const featureArchiver = new FeatureArchiver(process.cwd());

    featureResult = await featureArchiver.archiveFeatures({
      archiveOrphanedFeatures: true,
      archiveOrphanedEpics: true,
      forceArchiveWhenAllIncrementsArchived: true,
      updateLinks: true,
      dryRun: false
    });

    if (featureResult.archivedFeatures.length > 0) {
      console.log(`✅ Auto-archived features: ${featureResult.archivedFeatures.join(', ')}`);
    }
    if (featureResult.archivedEpics.length > 0) {
      console.log(`✅ Auto-archived epics: ${featureResult.archivedEpics.join(', ')}`);
    }
    if (featureResult.updatedLinks.length > 0) {
      console.log(`📝 Updated ${featureResult.updatedLinks.length} links in living docs`);
    }
  }

  // Show statistics
  const stats = await archiver.getStats();
  console.log('\n📊 Archive Statistics:');
  console.log(`   Active: ${stats.active} increments`);
  console.log(`   Archived: ${stats.archived} increments`);
  console.log(`   Abandoned: ${stats.abandoned} increments`);
  console.log(`   Total archive size: ${formatSize(stats.totalSize)}`);

  // Show feature/epic stats if auto-archiving occurred
  if (featureResult && (featureResult.archivedFeatures.length > 0 || featureResult.archivedEpics.length > 0)) {
    console.log(`   Auto-archived features: ${featureResult.archivedFeatures.length}`);
    console.log(`   Auto-archived epics: ${featureResult.archivedEpics.length}`);
  }
});

function parseOption(args: string[], flag: string): number | string | undefined {
  const index = args.indexOf(flag);
  if (index !== -1 && index + 1 < args.length) {
    const value = args[index + 1];
    return isNaN(Number(value)) ? value : Number(value);
  }
  return undefined;
}

function formatSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb < 1 ? `${Math.round(bytes / 1024)} KB` : `${Math.round(mb)} MB`;
}

export default task;
```

## Configuration

No configuration needed - all options are provided via command-line flags.

Default behavior:
- Preserves active/paused increments
- Skips increments with open external issues
- Warns about uncommitted changes
- Requires explicit user action (no auto-archiving)

---

**Best Practice**: Archive completed increments periodically (e.g., monthly or quarterly) to keep your workspace clean while preserving all history.

**Recommended Workflow**:
```bash
# 1. Check what would be archived (dry run)
/specweave:archive --keep-last 10 --dry-run

# 2. Archive old increments (features auto-archived!)
/specweave:archive --keep-last 10

# 3. Check results
/specweave:status
```

**That's it!** Features are automatically archived in step 2 - no manual intervention needed!
