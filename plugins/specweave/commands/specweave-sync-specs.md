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
1. **Derive feature ID from increment number** (e.g., 0040 → FS-040, 0002 → FS-002)
2. **Smart project matching** from (priority order):
   - `**Project**:` field in spec.md (explicit)
   - `multiProject.activeProject` in config.json
   - ADO area path / JIRA board mapping
   - Git remote (repo name)
   - **ASK USER if unsure** (multi-project mode)
3. Parse spec.md for user stories and acceptance criteria
4. Create living docs structure:
   - `.specweave/docs/internal/specs/{project}/FS-XXX/FEATURE.md`
   - `.specweave/docs/internal/specs/{project}/FS-XXX/us-*.md`

**CRITICAL**: Feature ID is DERIVED from increment number (ADR-0187)
- Increment 0002-user-authentication → FS-002
- Increment 0040-some-feature → FS-040
- NO date-based patterns like FS-YY-MM-DD-name

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
📂 FILE STRUCTURE (v5.0.0+)
───────────────────────────────────────────────────────

**NO _features folder** - Features live directly in project folders!

**Project folder detection** (priority order):
1. `**Project**:` field in spec.md (explicit)
2. `multiProject.activeProject` in config.json
3. ADO area path mapping / JIRA board mapping
4. Git remote (repo name)
5. **ASK USER if multi-project mode and unsure**

.specweave/docs/internal/specs/
├── {project}/                  ← Features + stories together
│   └── FS-XXX/                 ← Feature ID derived from increment (0002 → FS-002)
│       ├── FEATURE.md          ← Feature overview
│       ├── us-001-{title}.md   ← User story 1
│       ├── us-002-{title}.md   ← User story 2
│       └── ...
├── _epics/                     ← Optional (SAFe/large orgs only)
│   └── EP-XXX/
│       └── EPIC.md
└── _archive/                   ← Archived features
    └── {project}/FS-XXX/

───────────────────────────────────────────────────────
🎯 WHAT THIS SYNC DID
───────────────────────────────────────────────────────

✅ Parsed increment spec.md
✅ Derived Feature ID from increment number (e.g., 0002 → FS-002)
✅ Detected project folder (or asked user if unsure)
✅ Generated hierarchical structure in {project}/FS-XXX/
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
  • Feature: specweave/FS-031/FEATURE.md
  • User story: specweave/FS-031/us-001-api-sync.md
  • User story: specweave/FS-031/us-002-status-mapping.md
  • Tasks.md: Would add 5 user story links

Total: 4 files would be affected

Note: Feature ID FS-031 derived from increment number 0031
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
🔄 Mode: Specs-only sync

Processing...
✅ Distribution successful!
   📊 Total stories: 7
   📁 Total files created: 10
   🎯 Feature ID: FS-031 (derived from increment 0031)
   📁 Project folder: specweave/FS-031/
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
Would create feature: FS-031 (derived from increment 0031)
Would use project folder: specweave/FS-031/
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