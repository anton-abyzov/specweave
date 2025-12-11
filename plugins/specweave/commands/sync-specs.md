---
name: specweave:sync-specs
description: Sync ALL increment specifications to living docs structure by default. Creates FS-XXX folders for each increment. Use with increment ID to sync single increment.
---

# Sync Increment Specifications to Living Docs

**DEFAULT BEHAVIOR**: Syncs ALL increments to living docs (not just one!)

---

## STEP 1: Parse Arguments & Determine Mode

```
Arguments provided: $ARGUMENTS
```

**Parse the input to determine sync mode**:

| Input | Mode | Action |
|-------|------|--------|
| `/specweave:sync-specs` | **ALL** (default) | Sync ALL increments |
| `/specweave:sync-specs --all` | **ALL** (explicit) | Sync ALL increments |
| `/specweave:sync-specs 0106` | **SINGLE** | Sync only increment 0106 |
| `/specweave:sync-specs 0106 --dry-run` | **SINGLE + DRY** | Preview sync for 0106 |
| `/specweave:sync-specs --dry-run` | **ALL + DRY** | Preview sync for ALL |

**CRITICAL**: No increment ID = sync ALL increments (this is the DEFAULT!)

---

## STEP 2: Execute Sync Based on Mode

### MODE A: Sync ALL Increments (Default)

**This is the DEFAULT when no increment ID is provided!**

```bash
# List ALL syncable increments (with spec.md)
ls -1 .specweave/increments/ | grep -E '^[0-9]{4}E?-' | sort
```

**Execute sync for EACH increment**:

```
🔄 Syncing ALL increments to living docs...

Found {N} increments with spec.md files.
```

**For each increment**, call the sync logic:

```typescript
import { LivingDocsSync } from './src/core/living-docs/living-docs-sync.js';

const sync = new LivingDocsSync(projectRoot);

// Get all increment folders
const incrementsDir = '.specweave/increments';
const entries = fs.readdirSync(incrementsDir);
const increments = entries.filter(e => /^\d{4}E?-/.test(e));

let successCount = 0;
let failCount = 0;
const results = [];

for (const incrementId of increments.sort()) {
  // Check if spec.md exists
  const specPath = path.join(incrementsDir, incrementId, 'spec.md');
  if (!fs.existsSync(specPath)) {
    console.log(`   ⚠️  Skipping ${incrementId} (no spec.md)`);
    continue;
  }

  try {
    const result = await sync.syncIncrement(incrementId, { dryRun, force });
    if (result.success) {
      successCount++;
      results.push({ id: incrementId, featureId: result.featureId, status: '✅' });
    } else {
      failCount++;
      results.push({ id: incrementId, featureId: '', status: '❌', error: result.errors[0] });
    }
  } catch (error) {
    failCount++;
    results.push({ id: incrementId, featureId: '', status: '❌', error: error.message });
  }
}
```

**Output summary table**:

```
═══════════════════════════════════════════════════════
✅ BULK SYNC COMPLETE
═══════════════════════════════════════════════════════

| Increment | Feature ID | Status |
|-----------|------------|--------|
| 0093-ado-permission-profile-fixes | FS-093 | ✅ |
| 0094-unit-test-alignment | FS-094 | ✅ |
| 0095-per-project-epic-hierarchy | FS-095 | ✅ |
| ... | ... | ... |

───────────────────────────────────────────────────────
📊 SUMMARY
───────────────────────────────────────────────────────

Total increments: {N}
✅ Succeeded: {successCount}
❌ Failed: {failCount}
⏭️  Skipped: {skippedCount} (no spec.md)

═══════════════════════════════════════════════════════
```

### MODE B: Sync SINGLE Increment

**Only when a specific increment ID is provided**:

```
🎯 Target increment: {increment_id}
📁 Increment path: .specweave/increments/{increment_id}
🔄 Mode: Single increment sync
```

**Execute single sync**:

```typescript
const result = await sync.syncIncrement(incrementId, { dryRun, force });
```

**Output**:
```
═══════════════════════════════════════════════════════
✅ SINGLE INCREMENT SYNC COMPLETE
═══════════════════════════════════════════════════════

Increment: {increment_id}
Feature ID: FS-{XXX} (derived from increment number)
Project: {project}

Files created:
  • {project}/FS-{XXX}/FEATURE.md
  • {project}/FS-{XXX}/us-001-*.md
  • {project}/FS-{XXX}/us-002-*.md
  ...

═══════════════════════════════════════════════════════
```

---

## STEP 3: Identify Missing/New Specs

After sync, compare increments vs specs:

```bash
# Get all increment numbers
INCREMENT_NUMS=$(ls -1 .specweave/increments/ | grep -E '^[0-9]{4}E?-' | sed 's/^\([0-9]*E\?\).*/\1/')

# Get all FS-XXX folders in specs
SPEC_NUMS=$(ls -1 .specweave/docs/internal/specs/*/FS-* 2>/dev/null | grep -oE 'FS-[0-9]+E?' | sed 's/FS-//')

# Find missing (increments without corresponding FS-XXX)
echo "Checking for gaps..."
```

**Report gaps** (increments without corresponding specs):

```
📊 GAP ANALYSIS
───────────────────────────────────────────────────────

{if gaps found}
⚠️  Found {N} increments without corresponding specs:
   • 0106-ci-health-improvements → FS-106 missing
   • 0113-enhanced-living-docs-architecture → FS-113 missing

These were synced in this run.
{else}
✅ All increments have corresponding spec folders!
{/if}
```

---

## STEP 4: Feature ID Derivation Rules

**CRITICAL**: Feature ID is ALWAYS derived from increment number:

| Increment ID | Feature ID |
|--------------|------------|
| 0002-user-authentication | FS-002 |
| 0040-some-feature | FS-040 |
| 0106-ci-health | FS-106 |
| 0111E-dora-metrics-fix | FS-111E |

**Rules**:
- Increment `XXXX-name` → Feature `FS-XXX` (3-digit minimum)
- Increment `XXXXE-name` (external) → Feature `FS-XXXE`
- NO date-based patterns (FS-YY-MM-DD-name is WRONG)
- See ADR-0187 for rationale

---

## OPTIONS

### --dry-run
Preview what would be synced without making changes:

```bash
/specweave:sync-specs --dry-run        # Preview ALL
/specweave:sync-specs 0106 --dry-run   # Preview single
```

### --force
Overwrite existing files without prompting:

```bash
/specweave:sync-specs --force          # Force ALL
/specweave:sync-specs 0106 --force     # Force single
```

---

## EXAMPLES

### Example 1: Sync ALL (Default - Most Common)
```
User: /specweave:sync-specs

Output:
🔄 Syncing ALL increments to living docs...

Found 25 increments with spec.md files.

| Increment | Feature ID | Status |
|-----------|------------|--------|
| 0093-ado-permission-profile-fixes | FS-093 | ✅ |
| 0094-unit-test-alignment | FS-094 | ✅ |
| 0095-per-project-epic-hierarchy | FS-095 | ✅ |
| 0096-ado-import-fixes | FS-096 | ✅ |
| 0097-umbrella-module-detection | FS-097 | ✅ |
| ... | ... | ... |
| 0116-livingspec-universal-standard | FS-116 | ✅ |

📊 SUMMARY: 25 succeeded, 0 failed
```

### Example 2: Sync Single Increment
```
User: /specweave:sync-specs 0106

Output:
🎯 Target increment: 0106-ci-health-improvements
📁 Increment path: .specweave/increments/0106-ci-health-improvements
🔄 Mode: Single increment sync

✅ Synced 0106-ci-health-improvements → FS-106
   Created: specweave/FS-106/FEATURE.md
   Created: specweave/FS-106/us-001-*.md
```

### Example 3: Dry Run ALL
```
User: /specweave:sync-specs --dry-run

Output:
🔍 DRY RUN MODE - No files will be modified

Would sync 25 increments:
  • 0093 → FS-093 (exists, would update)
  • 0094 → FS-094 (exists, would update)
  • 0106 → FS-106 (NEW - would create)
  • 0113 → FS-113 (NEW - would create)
  ...

No changes made (dry run mode)
```

---

## ERROR HANDLING

### Error: No Increments Found
```
❌ Error: No increments found in .specweave/increments/

Create an increment first:
  /specweave:increment "feature name"
```

### Error: Specific Increment Not Found
```
❌ Error: Increment '0999' not found

Available increments:
  0093-ado-permission-profile-fixes
  0094-unit-test-alignment
  ...

Usage: /specweave:sync-specs [increment_id]
```

### Error: Missing spec.md
```
⚠️  Skipping 0107-incomplete-feature (no spec.md)

Increment must have a spec.md file to sync.
```

---

## IMPORTANT NOTES

1. **DEFAULT = ALL**: Running without arguments syncs ALL increments
2. **Idempotent**: Safe to run multiple times (updates existing, creates missing)
3. **Feature ID derivation**: Always from increment number (not stored in metadata)
4. **Project detection**: Reads `project:` from spec.md YAML frontmatter
5. **External sync**: Triggers GitHub/JIRA/ADO sync if configured

---

## WHEN TO USE THIS COMMAND

✅ **Use `/specweave:sync-specs` (no args) when**:
- You want to ensure ALL increments are in living docs
- After creating multiple increments
- To fix gaps in specs folder
- Regular maintenance sync

✅ **Use `/specweave:sync-specs <id>` when**:
- You only want to sync one specific increment
- After updating a single spec.md
- Debugging sync issues for one increment

---

**Execute this command now. Default = sync ALL increments.**
