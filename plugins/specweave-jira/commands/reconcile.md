---
name: specweave-jira:reconcile
description: Reconcile JIRA issue states with increment statuses. Fixes drift by closing issues for completed increments and reopening issues for resumed increments.
---

# JIRA Status Reconciliation

Scan all increments and fix any drift between local metadata.json status and JIRA issue states.

## Usage

```bash
/sw-jira:reconcile [options]
```

## Options

- `--dry-run`: Preview changes without making them
- `--verbose`: Show detailed output for each issue checked

## What It Does

1. **Scans** all non-archived increments
2. **Compares** metadata.json status with JIRA issue state
3. **Fixes** mismatches:
   - `metadata=completed` + `JIRA=In Progress` → **Close** the issue (transition to Done)
   - `metadata=in-progress` + `JIRA=Done` → **Reopen** the issue (transition to To Do)

## When to Use

- After manual metadata.json edits
- After git pulls that changed increment statuses
- When you notice open issues for completed work
- As a periodic health check

## Implementation

Run the reconciliation using the JiraReconciler:

```typescript
import { JiraReconciler } from '../../../src/sync/jira-reconciler.js';

const reconciler = new JiraReconciler({
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
📊 Scanning 5 increment(s) for JIRA state drift...

  ✅ Issue PROJ-123 (0056-plugin-fix/US-001): State matches (In Progress)
  ❌ Issue PROJ-130 (0066-import-wizard/US-003): In Progress but should be CLOSED (status=completed)
     ✅ Closed issue PROJ-130
  ❌ Issue PROJ-128 (0063-multi-repo/US-001): CLOSED but should be OPEN (status=in-progress)
     ✅ Reopened issue PROJ-128

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 JIRA RECONCILIATION SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Increments scanned:  5
   Mismatches found:    2
   Issues closed:       1
   Issues reopened:     1
   Errors:              0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Dry Run Mode

```bash
/sw-jira:reconcile --dry-run
```

Shows what would be changed without making any modifications:

```
  ❌ Issue PROJ-130 (0066-import-wizard/US-003): In Progress but should be CLOSED
     [DRY RUN] Would close issue PROJ-130

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 JIRA RECONCILIATION SUMMARY
   ⚠️  DRY RUN - No changes were made
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Requirements

- JIRA API token configured (`JIRA_API_TOKEN`)
- JIRA email configured (`JIRA_EMAIL`)
- JIRA domain configured (`JIRA_DOMAIN`)
- `sync.jira.enabled = true` in config.json
- `sync.settings.canUpdateExternalItems = true` in config.json
- `sync.settings.canUpdateStatus = true` in config.json

## JIRA Status Mapping

| SpecWeave Status | Expected JIRA Status |
|-----------------|---------------------|
| `completed` | Done, Closed, Resolved |
| `abandoned` | Won't Do, Closed |
| `in-progress` | In Progress, In Review |
| `active` | To Do, Open |
| `planning` | To Do |

## Related Commands

- `/sw-jira:status`: View sync status for increments
- `/sw-jira:sync`: Manual sync to JIRA
- `/sw:done`: Close increment (triggers auto-close)
- `/sw:resume`: Resume increment (now triggers auto-reopen)
