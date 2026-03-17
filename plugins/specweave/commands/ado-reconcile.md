---
description: Reconcile Azure DevOps work item states with increment statuses. Fixes drift by closing work items for completed increments and reactivating work items for resumed increments.
---

# Azure DevOps Status Reconciliation

Scan all increments and fix any drift between local metadata.json status and ADO work item states.

## Usage

```bash
/sw-ado:reconcile [options]
```

## Options

- `--dry-run`: Preview changes without making them
- `--verbose`: Show detailed output for each work item checked

## What It Does

1. **Scans** all non-archived increments
2. **Compares** metadata.json status with ADO work item state
3. **Fixes** mismatches:
   - `metadata=completed` + `ADO=Active` → **Close** the work item
   - `metadata=in-progress` + `ADO=Closed` → **Reactivate** the work item

## When to Use

- After manual metadata.json edits
- After git pulls that changed increment statuses
- When you notice active work items for completed work
- As a periodic health check

## Implementation

Run the reconciliation using the AdoReconciler:

```typescript
import { AdoReconciler } from '../../../src/sync/ado-reconciler.js';

const reconciler = new AdoReconciler({
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
📊 Scanning 5 increment(s) for ADO state drift...

  ✅ Work Item #1234 (0056-plugin-fix/US-001): State matches (Active)
  ❌ Work Item #1240 (0066-import-wizard/US-003): Active but should be CLOSED (status=completed)
     ✅ Closed work item #1240
  ❌ Work Item #1238 (0063-multi-repo/US-001): CLOSED but should be ACTIVE (status=in-progress)
     ✅ Reactivated work item #1238

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 ADO RECONCILIATION SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Increments scanned:   5
   Mismatches found:     2
   Work items closed:    1
   Work items reopened:  1
   Errors:               0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Dry Run Mode

```bash
/sw-ado:reconcile --dry-run
```

Shows what would be changed without making any modifications:

```
  ❌ Work Item #1240 (0066-import-wizard/US-003): Active but should be CLOSED
     [DRY RUN] Would close work item #1240

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 ADO RECONCILIATION SUMMARY
   ⚠️  DRY RUN - No changes were made
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Requirements

- Azure DevOps PAT configured (`AZURE_DEVOPS_PAT`)
- `sync.ado.enabled = true` in config.json
- `sync.settings.canUpdateExternalItems = true` in config.json

## ADO Status Mapping

| SpecWeave Status | Expected ADO State |
|-----------------|-------------------|
| `completed` | Closed, Done, Resolved |
| `abandoned` | Closed, Removed |
| `in-progress` | Active, In Progress |
| `active` | Active, New |
| `planning` | New |

## Related Commands

- `/sw-ado:status`: View sync status for increments
- `/sw-ado:sync`: Manual sync to ADO
- `/sw:done`: Close increment (triggers auto-close)
- `/sw:resume`: Resume increment (now triggers auto-reopen)
