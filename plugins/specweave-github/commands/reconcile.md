---
name: reconcile
description: Reconcile GitHub issue states with increment statuses. Fixes drift by closing issues for completed increments and reopening issues for resumed increments.
---

# GitHub Status Reconciliation

Scan all increments and fix any drift between local metadata.json status and GitHub issue states.

## Usage

```bash
/sw-github:reconcile [options]
```

## Options

- `--dry-run`: Preview changes without making them
- `--verbose`: Show detailed output for each issue checked

## What It Does

1. **Scans** all non-archived increments
2. **Compares** metadata.json status with GitHub issue state
3. **Fixes** mismatches:
   - `metadata=completed` + `GH=open` → **Close** the issue
   - `metadata=in-progress` + `GH=closed` → **Reopen** the issue

## When to Use

- After manual metadata.json edits
- After git pulls that changed increment statuses
- When you notice open issues for completed work
- As a periodic health check

## Implementation

Run the reconciliation using the GitHubReconciler:

```typescript
import { GitHubReconciler } from '../../../src/sync/github-reconciler.js';

const reconciler = new GitHubReconciler({
  projectRoot: process.cwd(),
  dryRun: args.includes('--dry-run'),
});

const result = await reconciler.reconcile();

// Report results
console.log(`\nReconciliation complete:`);
console.log(`  Scanned: ${result.scanned} increments`);
console.log(`  Fixed: ${result.closed} closed, ${result.reopened} reopened`);
if (result.errors.length > 0) {
  console.log(`  Errors: ${result.errors.length}`);
}
```

## Example Output

```
📊 Scanning 5 increment(s) for GitHub state drift...

  ✅ Issue #765 (0056-plugin-fix/US-001): State matches (open)
  ❌ Issue #771 (0066-import-wizard/US-003): OPEN but should be CLOSED (status=completed)
     ✅ Closed issue #771
  ❌ Issue #763 (0063-multi-repo/US-001): CLOSED but should be OPEN (status=in-progress)
     ✅ Reopened issue #763

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 RECONCILIATION SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Increments scanned: 5
   Mismatches found:   2
   Issues closed:      1
   Issues reopened:    1
   Errors:             0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Dry Run Mode

```bash
/sw-github:reconcile --dry-run
```

Shows what would be changed without making any modifications:

```
  ❌ Issue #771 (0066-import-wizard/US-003): OPEN but should be CLOSED
     [DRY RUN] Would close issue #771

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 RECONCILIATION SUMMARY
   ⚠️  DRY RUN - No changes were made
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Requirements

- GitHub CLI (`gh`) installed and authenticated
- `sync.github.enabled = true` in config.json
- `sync.settings.canUpdateExternalItems = true` in config.json

## Related Commands

- `/sw-github:status`: View sync status for increments
- `/sw-github:sync`: Manual sync to GitHub
- `/sw:done`: Close increment (triggers auto-close)
- `/sw:resume`: Resume increment (now triggers auto-reopen)
