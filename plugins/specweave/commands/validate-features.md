---
name: sw:validate-features
description: Validate feature folder consistency across project folders. Detects orphaned features, missing FEATURE.md, and auto-repairs discrepancies. Use for periodic health checks of living docs structure.
---

# Validate Feature Folder Consistency

Validates that feature folders in project directories (e.g., `specweave/FS-XXX/`) have proper structure.

**Note (v5.0.0+)**: The `_features/` folder is OBSOLETE. Features live in `{project}/FS-XXX/`.
If you find features in `_features/`, they should be migrated to the correct project folder.

---

## STEP 1: Parse Arguments

```
Arguments: [user's arguments]
```

**Options**:
- `--repair`: Auto-repair discrepancies (create missing project folders)
- `--dry-run`: Show what would be repaired without making changes

---

## STEP 2: Run Consistency Validation

**Execute**:

```typescript
import { FeatureConsistencyValidator } from './dist/src/core/living-docs/feature-consistency-validator.js';

const validator = new FeatureConsistencyValidator(process.cwd(), {
  defaultProject: 'specweave'
});

// Parse repair flag
const autoRepair = process.argv.includes('--repair');
const dryRun = process.argv.includes('--dry-run');

if (dryRun) {
  console.log('🔍 DRY RUN MODE - No files will be modified\n');
}

// Run validation
const result = await validator.validate(autoRepair && !dryRun);
```

---

## STEP 3: Report Results

**Output format**:

```
═══════════════════════════════════════════════════════
📊 FEATURE CONSISTENCY VALIDATION REPORT
═══════════════════════════════════════════════════════

Total features scanned: {total}
Consistent: {consistent}
Discrepancies found: {discrepancies}

───────────────────────────────────────────────────────
{if discrepancies > 0}
⚠️  DISCREPANCIES FOUND

{for each discrepancy}
Feature: {featureId}
Type: {type}
Description: {description}
Auto-repairable: {yes/no}
{if linkedIncrement}
Linked increment: {incrementId} ({exists/not found})
{/if}

{/for}
───────────────────────────────────────────────────────
{/if}

{if repairs}
🔧 REPAIR RESULTS

{for each repair}
{✅/❌} {featureId}: {action}
{if error}   Error: {error}{/if}
{/for}
{/if}

═══════════════════════════════════════════════════════
```

---

## STEP 4: Provide Next Steps

```
🎯 NEXT STEPS
───────────────────────────────────────────────────────

{if discrepancies > 0 && !repair}
To auto-repair these discrepancies:
  /sw:validate-features --repair

This will:
  • Create missing project folders
  • Generate README.md files
  • Link to existing FEATURE.md
{/if}

{if all repaired}
✅ All discrepancies have been repaired!

Verify the repairs:
  ls -la .specweave/docs/internal/specs/specweave/
{/if}

{if orphaned features}
⚠️  Some features could not be auto-repaired.

Manual intervention required for:
{list orphaned features}

Options:
  1. Delete orphaned folder if no longer needed
  2. Re-sync from increment if increment still exists
  3. Move to correct project folder manually
{/if}
```

---

## EXAMPLES

### Example 1: Check for discrepancies
```
User: /sw:validate-features

Output:
═══════════════════════════════════════════════════════
📊 FEATURE CONSISTENCY VALIDATION REPORT
═══════════════════════════════════════════════════════

Total features scanned: 7
Consistent: 6
Discrepancies found: 1

───────────────────────────────────────────────────────
⚠️  DISCREPANCIES FOUND

Feature: FS-062
Type: missing_feature_md
Description: Feature FS-062 folder exists but missing FEATURE.md
Auto-repairable: Yes
Linked increment: 0062-test-living-docs-auto-sync (not found)

───────────────────────────────────────────────────────

🎯 To repair: /sw:validate-features --repair
═══════════════════════════════════════════════════════
```

### Example 2: Auto-repair discrepancies
```
User: /sw:validate-features --repair

Output:
═══════════════════════════════════════════════════════
📊 FEATURE CONSISTENCY VALIDATION REPORT
═══════════════════════════════════════════════════════

Total features scanned: 7
Consistent: 7
Discrepancies found: 1

───────────────────────────────────────────────────────
🔧 REPAIR RESULTS

✅ FS-062: Created .specweave/docs/internal/specs/specweave/FS-062/README.md

═══════════════════════════════════════════════════════
```

---

## WHEN TO USE

**Use this command when**:
- Feature folders are missing FEATURE.md or us-*.md files
- After interrupted/failed sync operations
- After manual cleanup of increments
- Periodic health check of living docs structure
- Legacy migration from `_features/` to `{project}/` folders

**Root cause of discrepancies**:
1. Sync interrupted during feature creation
2. Increment deleted without cleaning up living docs
3. Manual editing of living docs structure
4. Legacy `_features/` folders not yet migrated (v5.0.0+)

---

## RELATED COMMANDS

- `/sw:sync-specs` - Sync increment to living docs (includes consistency check)
- `/sw:validate` - Validate increment structure
- `/sw:archive` - Archive completed increments
