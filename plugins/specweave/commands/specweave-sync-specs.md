---
name: specweave:sync-specs
description: Sync increment specifications to living docs structure. Auto-generates feature IDs for greenfield increments (FS-XXX). Use after completing an increment to make it visible in living docs.
---

# Sync Increment Specifications to Living Docs

Syncs increment specs to living docs structure for stakeholder visibility. Auto-generates feature IDs for greenfield increments.

---

## STEP 1: Parse Arguments

```
Arguments provided: [user's arguments]
```

**Parse the input**:
- Check for increment ID: `0001`, `0002`, etc.
- If no increment ID: find the most recent increment
- Check for options: `--force`, `--dry-run`

**Find increment**:
```bash
if [[ -z "$INCREMENT_ID" ]]; then
  # Find most recent increment
  INCREMENT_ID=$(ls -1 .specweave/increments/ | grep -E '^[0-9]{4}-' | sort -r | head -1)
fi

# Verify increment exists
INCREMENT_PATH=".specweave/increments/$INCREMENT_ID"
if [[ ! -d "$INCREMENT_PATH" ]]; then
  echo "❌ Error: Increment $INCREMENT_ID not found"
  exit 1
fi
```

**Output**:
```
🎯 Target increment: {increment_id}
📁 Increment path: .specweave/increments/{increment_id}
🔄 Mode: Specs-only sync (Universal Hierarchy)

Processing...
```

---

## STEP 2: Check Prerequisites

### 2.1 Verify Spec File Exists

```bash
SPEC_FILE="$INCREMENT_PATH/spec.md"
if [[ ! -f "$SPEC_FILE" ]]; then
  echo "❌ Error: No spec.md found in increment $INCREMENT_ID"
  echo "   Cannot sync specs without a spec file"
  exit 1
fi
```

### 2.2 Check Tasks File (for bidirectional linking)

```bash
TASKS_FILE="$INCREMENT_PATH/tasks.md"
HAS_TASKS=false
if [[ -f "$TASKS_FILE" ]]; then
  HAS_TASKS=true
  echo "✅ Found tasks.md - will create bidirectional links"
else
  echo "⚠️  No tasks.md - spec will sync without task links"
fi
```

### 2.3 Read Metadata for External Links

```bash
METADATA_FILE="$INCREMENT_PATH/metadata.json"
if [[ -f "$METADATA_FILE" ]]; then
  echo "✅ Found metadata.json - will include external links"
else
  echo "⚠️  No metadata.json - no external tool links available"
fi
```

---

## STEP 3: Execute Spec Sync

### 3.1 Run Sync Command

**Execute the sync using the CLI command**:

```typescript
import { syncSpecs } from './dist/src/cli/commands/sync-specs.js';

// Parse arguments
const args = process.argv.slice(2); // e.g., ['0040', '--dry-run']

// Execute sync
await syncSpecs(args);
```

**This will**:
1. Auto-generate feature ID for greenfield increments (FS-040, FS-041, etc.)
2. Parse spec.md for user stories and acceptance criteria
3. Create living docs structure:
   - `.specweave/docs/internal/specs/_features/FS-XXX/FEATURE.md`
   - `.specweave/docs/internal/specs/specweave/FS-XXX/README.md`
   - `.specweave/docs/internal/specs/specweave/FS-XXX/us-*.md`

---

## STEP 4: Report Distribution Results

### 4.1 Show What Was Created

```
═══════════════════════════════════════════════════════
✅ SPECS-ONLY SYNC COMPLETE
═══════════════════════════════════════════════════════

Increment: {increment_id}
Title: {title from spec.md}

───────────────────────────────────────────────────────
📊 UNIVERSAL HIERARCHY CREATED
───────────────────────────────────────────────────────

📁 Epic (Optional):
   {if created}
   Path: .specweave/docs/internal/specs/_epics/{EPIC-ID}/EPIC.md
   Status: Created/Updated

📁 Feature (Required):
   Path: .specweave/docs/internal/specs/_features/{FS-ID}/FEATURE.md
   Status: Created/Updated
   Projects: {list of projects}

📁 Project Contexts:
   {for each project}
   • {project}: .specweave/docs/internal/specs/{project}/{FS-ID}/README.md

📝 User Stories:
   {for each project}
   {project}:
   {for each story}
   • {story-id}: {story-title}
     Path: .specweave/docs/internal/specs/{project}/{FS-ID}/{us-id}.md

───────────────────────────────────────────────────────
🔗 BIDIRECTIONAL LINKING
───────────────────────────────────────────────────────

{if tasks.md exists}
✅ Task → User Story Links:
   Updated tasks.md with user story references
   Each task now links to its parent user story

✅ User Story → Task Links:
   Each user story shows implementing tasks
   Tasks linked back to increment #{increment_id}
{else}
⚠️  No tasks.md found - stories created without task links
{/if}

───────────────────────────────────────────────────────
📂 FILE STRUCTURE
───────────────────────────────────────────────────────

.specweave/docs/internal/specs/
├── _epics/                     {if epic created}
│   └── {EPIC-ID}/
│       └── EPIC.md
├── _features/
│   └── {FS-ID}/
│       └── FEATURE.md          ← Cross-project feature
└── {project}/                  ← Per-project stories
    └── {FS-ID}/
        ├── README.md            ← Project context
        ├── us-001-{title}.md    ← User story 1
        ├── us-002-{title}.md    ← User story 2
        └── ...

───────────────────────────────────────────────────────
🎯 WHAT THIS SYNC DID
───────────────────────────────────────────────────────

✅ Parsed increment spec.md
✅ Detected Epic mapping (if applicable)
✅ Detected Feature mapping (FS-YY-MM-DD pattern)
✅ Classified content by project
✅ Generated hierarchical structure
✅ Created bidirectional links (if tasks.md exists)
✅ Preserved external tool links (GitHub/Jira/ADO)

❌ DID NOT UPDATE:
   • Architecture decisions (ADRs)
   • Operations docs (runbooks, deployment)
   • Delivery docs (CI/CD, testing)
   • Governance docs (security, compliance)
   • Strategy docs (PRDs, roadmaps)

This command ONLY syncs specs folder content!

═══════════════════════════════════════════════════════
```

---

## STEP 5: Next Steps Guidance

```
🎯 NEXT STEPS
───────────────────────────────────────────────────────

1. Review generated specs:
   cd .specweave/docs/internal/specs/
   ls -la {project}/{FS-ID}/

2. Verify bidirectional links (if applicable):
   • Check tasks.md has "User Story:" links
   • Check user stories have "Implementation:" sections

3. Sync to external tools (if configured):
   {if GitHub configured}
   • GitHub: /specweave-github:sync-spec
   {/if}
   {if Jira configured}
   • Jira: /specweave-jira:sync-spec
   {/if}
   {if ADO configured}
   • Azure DevOps: /specweave-ado:sync-spec
   {/if}

4. Update other docs (if needed):
   • Full sync: /specweave:sync-docs
   • Architecture only: Update ADRs manually
   • Operations only: Update runbooks manually

5. Commit changes:
   git add .specweave/docs/internal/specs/
   git commit -m "docs: sync specs from increment {increment_id}"
```

---

## ERROR HANDLING

### Error: Increment Not Found
```
❌ Error: Increment '{increment_id}' not found

Available increments:
  {list .specweave/increments/*/}

Usage: /specweave:sync-specs [increment_id] [--dry-run]
```

### Error: No Spec File
```
❌ Error: No spec.md in increment '{increment_id}'

The increment must have a spec.md file to sync specs.
Check: .specweave/increments/{increment_id}/spec.md

Cannot proceed with specs sync.
```

### Error: Distribution Failed
```
❌ Error: Failed to distribute specs

Reason: {error message}

Common causes:
  • Invalid spec.md format
  • Missing user stories
  • Corrupted YAML frontmatter

Try: /specweave:validate {increment_id}
```

---

## OPTIONS

### --dry-run
Show what would be synced without making changes:

```bash
/specweave:sync-specs 0031 --dry-run
```

Output:
```
🔍 DRY RUN MODE - No files will be modified

Would create/update:
  • Epic: _epics/EPIC-2025-Q1/EPIC.md
  • Feature: _features/FS-25-11-14/FEATURE.md
  • Project context: backend/FS-25-11-14/README.md
  • User story: backend/FS-25-11-14/us-001-api-sync.md
  • User story: backend/FS-25-11-14/us-002-status-mapping.md
  • Tasks.md: Would add 5 user story links

Total: 6 files would be affected
```

### --force
Overwrite existing files without prompting:

```bash
/specweave:sync-specs 0031 --force
```

---

## EXAMPLES

### Example 1: Sync Current Increment
```
User: /specweave:sync-specs

Output:
🎯 Target increment: 0031-external-tool-status-sync
📁 Increment path: .specweave/increments/0031-external-tool-status-sync
🔄 Mode: Specs-only sync (Universal Hierarchy)

Processing...
✅ Distribution successful!
   📊 Total stories: 7
   📁 Total files created: 10
   🎯 Feature ID: FS-25-11-14-external-tool-status-sync
```

### Example 2: Sync Specific Increment
```
User: /specweave:sync-specs 0025

Output:
🎯 Target increment: 0025-per-project-resource-config
📁 Increment path: .specweave/increments/0025-per-project-resource-config
🔄 Mode: Specs-only sync (Universal Hierarchy)

Processing...
✅ Distribution successful!
   📊 Total stories: 3
   📁 Total files created: 5
```

### Example 3: Dry Run
```
User: /specweave:sync-specs 0031 --dry-run

Output:
🔍 DRY RUN MODE - No files will be modified

Would sync increment: 0031-external-tool-status-sync
Would create feature: FS-25-11-14-external-tool-status-sync
Would affect 2 projects: backend, frontend
Would create 7 user stories
Would update tasks.md with bidirectional links

No changes made (dry run mode)
```

---

## IMPORTANT NOTES

1. **Specs-only**: This command ONLY updates `.specweave/docs/internal/specs/` folder
2. **Universal Hierarchy**: Uses Epic → Feature → User Story → Task structure
3. **Bidirectional Links**: Automatically creates if tasks.md exists
4. **Project-aware**: Distributes stories to correct project folders
5. **Non-destructive**: Creates backups before overwriting (unless --force)
6. **External Links**: Preserves GitHub/Jira/ADO links from metadata.json

---

## WHEN TO USE THIS COMMAND

✅ **Use `/specweave:sync-specs` when**:
- You only want to update user stories and features
- You've made changes to spec.md and want them in living docs
- You want to preserve existing architecture/operations docs
- You need quick spec sync without full documentation update

❌ **Use `/specweave:sync-docs` instead when**:
- You want to update ALL documentation areas
- You have new architecture decisions (ADRs)
- You updated operations/deployment docs
- You need comprehensive documentation sync

---

**You are now ready to execute this specs-only sync command. Follow the steps above precisely.**