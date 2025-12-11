---
name: specweave-ado:cleanup-duplicates
description: Clean up duplicate Azure DevOps work items for a Feature. Finds work items with duplicate titles and closes all except the first created item.
justification: |
  CRITICAL INCIDENT RESPONSE TOOL - DO NOT DELETE!

  Why This Command Exists:
  - Prevention systems work for single-process execution
  - Multiple parallel Claude Code instances bypass all prevention (file-based cache, no distributed locking)
  - ADO API race conditions: Time gap between "check exists" and "create work item" allows duplicates
  - Historical duplicates from pre-v0.33.0 users (before prevention was added)

  Evidence of Need:
  - GitHub had 123 duplicate issues incident (cleaned to 29 unique) - same risk exists for ADO
  - Parallel execution creates race conditions that prevention CANNOT solve
  - Industry standard: Prevention + Detection + Cleanup (defense in depth)

  When to Delete:
  - ONLY if distributed locking implemented
  - AND parallel execution tested (100+ concurrent syncs with zero duplicates)
  - AND zero duplicates for 6+ months in production
---

# Clean Up Duplicate ADO Work Items

**CRITICAL**: This command detects and closes duplicate ADO work items created by multiple syncs.

## Usage

```bash
/sw-ado:cleanup-duplicates <feature-id> [--dry-run]
```

## What It Does

**Duplicate Detection & Cleanup**:

1. **Find all work items** for the Feature (searches by Feature ID in title)
2. **Group by title** (detect duplicates)
3. **For each duplicate group**:
   - Keep the **FIRST created** work item (lowest ID)
   - Close all **LATER** work items with comment: "Duplicate of #XXX"
4. **Update Feature README** with correct work item IDs

## Examples

### Dry Run (No Changes)

```bash
/sw-ado:cleanup-duplicates FS-031 --dry-run
```

**Output**:
```
Scanning for duplicates in Feature FS-031...
   Found 25 total work items
   Detected 10 duplicate groups:

   Group 1: "[FS-031] External Tool Status Synchronization"
      - #1250 (KEEP) - Created 2025-11-10
      - #1255 (CLOSE) - Created 2025-11-11 - DUPLICATE
      - #1260 (CLOSE) - Created 2025-11-12 - DUPLICATE

   Group 2: "[FS-031] Multi-Project ADO Sync"
      - #1251 (KEEP) - Created 2025-11-10
      - #1256 (CLOSE) - Created 2025-11-11 - DUPLICATE

   ...

Dry run complete!
   Total work items: 25
   Duplicate groups: 10
   Work items to close: 15

This was a DRY RUN - no changes made.
   Run without --dry-run to actually close duplicates.
```

### Actual Cleanup

```bash
/sw-ado:cleanup-duplicates FS-031
```

**Output**:
```
Scanning for duplicates in Feature FS-031...
   Found 25 total work items
   Detected 10 duplicate groups

CONFIRM: Close 15 duplicate work items? [y/N]
> y

Closing duplicates...
   Closed #1255 (duplicate of #1250)
   Closed #1256 (duplicate of #1251)
   Closed #1260 (duplicate of #1250)
   ...

Updating Feature README frontmatter...
   Updated frontmatter with correct work item IDs

Cleanup complete!
   Closed: 15 duplicates
   Kept: 10 original work items
```

## Arguments

- `<feature-id>` - Feature ID (e.g., `FS-031` or just `031`)
- `--dry-run` - Preview changes without actually closing work items (optional)

## Safety Features

- **Confirmation prompt**: Asks before closing work items (unless --dry-run)
- **Dry run mode**: Preview changes safely
- **Keeps oldest work item**: Preserves the first created item
- **Adds closure comment**: Links to the original work item
- **Updates metadata**: Fixes Feature README frontmatter

## What Gets Closed

**Closed work items**:
- Duplicate titles (second, third, etc. occurrences)
- Closed with comment: "Duplicate of #XXX"
- Original work item kept open (or maintains its status)

**Example comment on closed duplicate**:
```markdown
## Duplicate of #1250

This work item was automatically closed by SpecWeave cleanup because it is a duplicate.

The original work item (#1250) contains the same content and should be used for tracking instead.

Auto-closed by SpecWeave Duplicate Cleanup
```

## Requirements

1. **Azure DevOps PAT** configured (`AZURE_DEVOPS_PAT`)
2. **Organization** configured (`AZURE_DEVOPS_ORG`)
3. **Project** configured (`AZURE_DEVOPS_PROJECT`)
4. **Write access** to project (for closing work items)
5. **Feature folder exists** at `.specweave/docs/internal/specs/FS-XXX-name/`

## When to Use

**Use this command when**:
- You see multiple work items with the same title in ADO
- Feature sync ran multiple times and created duplicates
- Feature README frontmatter got corrupted and reset
- Post-sync validation warns about duplicates

**Example warning that triggers this**:
```
WARNING: 10 duplicate(s) detected!
   Run cleanup command to resolve:
   /sw-ado:cleanup-duplicates FS-031
```

## Architecture

**Duplicate Detection Logic**:
1. Query WIQL for work items with Feature ID in title
2. Group work items by **exact title match**
3. Within each group, sort by **work item ID** (ascending)
4. Keep **first work item** (lowest ID = oldest)
5. Close **all others** as duplicates via state transition

**Why lowest ID?**:
- Lower work item IDs were created first
- Preserves chronological order
- Maintains links from old documentation

## Related Commands

- `/sw-ado:sync` - Sync Feature to ADO (with duplicate detection)
- `/sw-ado:reconcile` - Reconcile work item states
- `/sw:validate` - Validate increment completeness

## Implementation

**File**: `plugins/specweave-ado/lib/ado-duplicate-detector.ts`

**Class**: `AdoDuplicateDetector`

**Algorithm** (3-phase protection):
1. **Detection**: WIQL query for existing work items matching pattern
2. **Verification**: Count check to detect duplicates after creation
3. **Reflection**: Auto-close duplicates automatically

For manual cleanup:
1. WIQL query for all work items with Feature ID
2. Group by title (Map<string, number[]>)
3. Filter groups with >1 item (duplicates)
4. For each duplicate group:
   - Keep first work item (lowest ID)
   - Close others via ADO REST API

## Next Steps

After cleanup:

1. **Verify cleanup**: Check ADO for remaining work items
2. **Check Feature FEATURE.md**: Verify frontmatter has correct work item IDs
3. **Re-run sync**: `/sw-ado:sync` (should show no duplicates)
4. **Duplicate detection**: Automatically enabled via AdoDuplicateDetector

---

**SAFE TO USE**: This command is idempotent and safe to run multiple times.
