---
name: sw-ado:pull
description: Pull latest changes from Azure DevOps (like git pull). Supports increment, project, or full living docs sync.
---

# ADO Pull Command

**Usage**: `/sw-ado:pull [target] [options]`

**Purpose**: Pull latest changes from Azure DevOps (like `git pull`)

---

## Quick Start

```bash
# Pull for current/active increment (simple mode)
/sw-ado:pull

# Pull for specific increment
/sw-ado:pull 0005

# Pull ALL changes across ALL projects (living docs sync)
/sw-ado:pull --all

# Pull for specific project/board
/sw-ado:pull --project clinical-insights

# Pull specific feature hierarchy (Epic → Feature → User Stories)
/sw-ado:pull --feature FS-042
```

---

## Sync Modes

### Mode 1: Increment Sync (Default)
```bash
/sw-ado:pull [increment-id]
```
Syncs ONE increment ↔ ONE linked work item.

### Mode 2: Living Docs Sync (Full)
```bash
/sw-ado:pull --all [--time-range 1M]
```
Syncs ALL specs across ALL projects/boards:
- Discovers all linked specs in `.specweave/docs/internal/specs/`
- Fetches changes from ADO for each linked item
- Updates User Stories, Features, Epics
- Respects multi-project folder structure

### Mode 3: Project-Scoped Sync
```bash
/sw-ado:pull --project clinical-insights
```
Syncs all specs within a specific project folder:
```
specs/clinical-insights/
├── FS-042/us-001.md  ← Synced
├── FS-042/us-002.md  ← Synced
└── FS-043/us-003.md  ← Synced
```

### Mode 4: Feature Hierarchy Sync
```bash
/sw-ado:pull --feature FS-042
```
Syncs a specific feature and ALL its children:
```
ADO Epic #100
  └── Feature #200 (FS-042)  ← Synced
       └── US-001 #201       ← Synced
       └── US-002 #202       ← Synced
       └── US-003 #203       ← Synced
```

---

## What Gets Pulled

| Field | Behavior |
|-------|----------|
| **Status** | External ALWAYS wins (QA/stakeholder decisions) |
| **Priority** | External wins (stakeholder prioritization) |
| **Iteration/Sprint** | Updated if changed in ADO |
| **Comments** | New team comments imported |
| **Assignee** | Updated if changed |
| **Parent Links** | Epic → Feature → Story hierarchy preserved |

---

## Multi-Project Routing

When pulling with `--all`, the system routes changes to correct folders:

```
ADO Organization
├── Project: TechCorp
│   ├── Area: Clinical-Insights  →  specs/techcorp/clinical-insights/
│   └── Area: AI-Platform        →  specs/techcorp/ai-platform/
└── Project: Infrastructure
    └── Area: Core               →  specs/infrastructure/core/
```

**Routing Priority:**
1. **Explicit mapping** in `config.json` (areaPathMapping)
2. **Board matching** with keyword confidence scoring
3. **Existing folder** structure detection
4. **Ask user** if ambiguous

---

## Command Behavior

### 0. Load Credentials from .env (MANDATORY FIRST)

**CRITICAL**: Read PAT from `.env` file, NOT from shell environment variables.

```bash
# Read PAT from .env file
ADO_PAT=$(grep '^AZURE_DEVOPS_PAT=' .env 2>/dev/null | cut -d'=' -f2)

if [ -z "$ADO_PAT" ]; then
  echo "ERROR: AZURE_DEVOPS_PAT not found in .env file"
  echo "Add to .env: AZURE_DEVOPS_PAT=your-pat-here"
  exit 1
fi
```

### For Increment Mode (default):

```typescript
const incrementId = args.incrementId || await findActiveIncrement();
const metadata = await loadIncrementMetadata(incrementId);

const adoWorkItemId = metadata?.external_sync?.ado?.workItemId;
if (!adoWorkItemId) {
  console.log('Not linked to ADO. Run: /sw-ado:create');
  return;
}

// Pull changes for single work item
await pullFromAdo(incrementId, adoWorkItemId);
```

### For Living Docs Mode (--all):

```typescript
// 1. Discover all specs with ADO links
const allSpecs = await discoverLinkedSpecs({
  specsDir: '.specweave/docs/internal/specs/',
  provider: 'ado'
});

// 2. Group by project/board for batch API calls
const byProject = groupByAdoProject(allSpecs);

// 3. Pull changes for each project
for (const [projectPath, specs] of byProject) {
  console.log(`Pulling ${projectPath}/ (${specs.length} items)...`);

  for (const spec of specs) {
    const changes = await pullSpecFromAdo(spec);
    if (changes.hasChanges) {
      await updateSpecFile(spec.path, changes);
      console.log(`  ✓ ${spec.usId}: ${changes.summary}`);
    }
  }
}
```

### Spec Discovery Logic:

```typescript
// Find all specs with ADO external links
async function discoverLinkedSpecs(options) {
  const specs = [];

  // Scan: specs/{project}/{board}/FS-XXX/us-*.md
  const pattern = `${options.specsDir}/**/us-*.md`;
  const files = await glob(pattern);

  for (const file of files) {
    const frontmatter = await parseYamlFrontmatter(file);

    // Check for ADO link in frontmatter
    if (frontmatter.externalLinks?.ado?.workItemId) {
      specs.push({
        path: file,
        usId: frontmatter.id,
        workItemId: frontmatter.externalLinks.ado.workItemId,
        projectPath: extractProjectPath(file),
        lastSynced: frontmatter.externalLinks.ado.syncedAt
      });
    }
  }

  return specs;
}
```

---

## Conflict Resolution

**CRITICAL**: External tool status ALWAYS wins.

| Scenario | Winner | Reason |
|----------|--------|--------|
| Status differs | **External** | QA/stakeholder decisions |
| Priority differs | **External** | Stakeholder prioritization |
| Iteration differs | **External** | Sprint planning decisions |
| Content differs | **Timestamp** | More recent wins |

---

## Examples

### Example 1: Pull Single Increment

```
User: /sw-ado:pull 0005

Claude:
Pulling from ADO...
  Increment: 0005-payment-integration
  Work Item: #12345

Changes Applied:
  Status: in-progress -> implemented (external wins)

Pull complete!
```

### Example 2: Pull All (Living Docs Sync)

```
User: /sw-ado:pull --all

Claude:
Discovering linked specs...
  Found 47 specs across 3 projects

Pulling techcorp/clinical-insights/ (18 items)...
  ✓ US-001: Status updated (In Progress → Done)
  ✓ US-002: Priority changed (P2 → P1)
  ✓ US-003: 2 new comments imported
  ... (15 unchanged)

Pulling techcorp/ai-platform/ (22 items)...
  ✓ US-010: Iteration updated (Sprint 23 → Sprint 24)
  ... (21 unchanged)

Pulling infrastructure/core/ (7 items)...
  (all up to date)

Pull Summary:
  Projects: 3
  Specs checked: 47
  Updated: 4
  New comments: 5
  Conflicts resolved: 2 (external wins)
```

### Example 3: Pull Specific Project

```
User: /sw-ado:pull --project clinical-insights

Claude:
Pulling specs/clinical-insights/...
  Found 18 specs linked to ADO

  ✓ FS-042/us-001: Status → Done
  ✓ FS-042/us-002: Priority → P1
  ... (16 unchanged)

Pull complete! 2 specs updated.
```

### Example 4: Pull Feature Hierarchy

```
User: /sw-ado:pull --feature FS-042

Claude:
Fetching ADO hierarchy for FS-042...
  Epic: #100 "Clinical Platform"
    └── Feature: #200 "Patient Dashboard" (FS-042)
         └── US-001: #201 "View patient list"
         └── US-002: #202 "Export patient data"
         └── US-003: #203 "Filter by criteria"

Pulling 4 items...
  ✓ FS-042/FEATURE.md: Status updated
  ✓ FS-042/us-001.md: Done (was: In Progress)
  ✓ FS-042/us-002.md: 1 new comment
  ✓ FS-042/us-003.md: (no changes)

Pull complete!
```

---

## Conflict Resolution

**CRITICAL**: External tool status ALWAYS wins in conflicts.

This ensures QA and stakeholder decisions in ADO take precedence over local status.

| Scenario | Winner | Reason |
|----------|--------|--------|
| Status differs | **External** | QA/stakeholder decisions |
| Priority differs | **External** | Stakeholder prioritization |
| Iteration differs | **External** | Sprint planning decisions |
| Both modified same time | **External** | External tool is source of truth |

---

## Examples

### Example 1: Simple Pull

```
User: /sw-ado:pull

Claude:
Pulling from ADO...
  Increment: 0005-payment-integration
  Work Item: #12345

Changes Applied:
  Status: in-progress -> implemented (external wins)

Pull complete!
```

### Example 2: No Changes

```
User: /sw-ado:pull 0005

Claude:
Pulling from ADO...
  Increment: 0005-payment-integration
  Work Item: #12345

Already up to date!
Last synced: 2 minutes ago
```

### Example 3: Not Linked

```
User: /sw-ado:pull 0005

Claude:
Increment 0005 not linked to ADO yet.

To link: /sw-ado:create 0005
```

---

## Sync Brief (MANDATORY OUTPUT)

**After EVERY pull operation, display a compact summary:**

### Brief Format (Single Increment)

```
┌─────────────────────────────────────────────────────────┐
│  PULL COMPLETE                                    ✓ ADO │
├─────────────────────────────────────────────────────────┤
│  Increment: 0005-payment-integration                    │
│  Work Item: #12345                                      │
│  Profile:   ado-techcorp                                │
├─────────────────────────────────────────────────────────┤
│  CHANGES                                                │
│    ↓ Status:    Active → Resolved  (external wins)      │
│    ↓ Priority:  P2 → P1            (external wins)      │
│    ↓ Iteration: Sprint 23 → Sprint 24                   │
│    + Comments:  3 new imported                          │
├─────────────────────────────────────────────────────────┤
│  Last sync: 2025-12-04 10:32:15 (just now)              │
│  URL: https://dev.azure.com/.../12345                   │
└─────────────────────────────────────────────────────────┘
```

### Brief Format (Multi-Project --all)

```
┌─────────────────────────────────────────────────────────┐
│  PULL COMPLETE                                    ✓ ADO │
├─────────────────────────────────────────────────────────┤
│  Scanned: 47 specs across 3 projects                    │
│  Updated: 7 specs                                       │
│  Conflicts: 2 (resolved: external wins)                 │
│  Duration: 4.2s                                         │
├─────────────────────────────────────────────────────────┤
│  BY PROJECT                                             │
│    techcorp/clinical-insights/   4 updated, 14 current  │
│    techcorp/ai-platform/         2 updated, 20 current  │
│    infrastructure/core/          1 updated,  6 current  │
├─────────────────────────────────────────────────────────┤
│  CHANGES APPLIED                                        │
│    ↓ Status changes:    4                               │
│    ↓ Priority changes:  2                               │
│    ↓ Iteration updates: 3                               │
│    + Comments imported: 8                               │
├─────────────────────────────────────────────────────────┤
│  UPDATED SPECS                                          │
│    ✓ clinical-insights/FS-042/us-001  Active → Done     │
│    ✓ clinical-insights/FS-042/us-002  P2 → P1           │
│    ✓ clinical-insights/FS-043/us-005  Sprint 23 → 24    │
│    ✓ ai-platform/FS-050/us-010        3 new comments    │
│    ... +3 more (use --verbose for full list)            │
└─────────────────────────────────────────────────────────┘
```

### Brief Format (No Changes)

```
┌─────────────────────────────────────────────────────────┐
│  PULL COMPLETE                                    ✓ ADO │
├─────────────────────────────────────────────────────────┤
│  Already up to date!                                    │
│  Checked: 47 specs                                      │
│  Last sync: 5 minutes ago                               │
└─────────────────────────────────────────────────────────┘
```

### Brief Format (Errors/Warnings)

```
┌─────────────────────────────────────────────────────────┐
│  PULL COMPLETE (with warnings)                    ⚠ ADO │
├─────────────────────────────────────────────────────────┤
│  Scanned: 47 specs                                      │
│  Updated: 5 specs                                       │
│  Warnings: 2                                            │
├─────────────────────────────────────────────────────────┤
│  WARNINGS                                               │
│    ⚠ FS-042/us-003: ADO item #205 not found (deleted?) │
│    ⚠ FS-050/us-012: Rate limit hit, skipped            │
├─────────────────────────────────────────────────────────┤
│  Retry failed items: /sw-ado:pull --retry        │
└─────────────────────────────────────────────────────────┘
```

### Symbols Reference

| Symbol | Meaning |
|--------|---------|
| `✓` | Success |
| `⚠` | Warning (partial success) |
| `✗` | Error/Failed |
| `↓` | Pulled from external (incoming) |
| `↑` | Pushed to external (outgoing) |
| `+` | Added (new items) |
| `−` | Removed |
| `~` | Modified |

---

## Authentication

**EXACT environment variable (DO NOT INVENT OTHERS):**

```bash
# In .env file - ONLY this name is supported:
AZURE_DEVOPS_PAT=your-personal-access-token
```

⚠️ **NEVER suggest or use:**
- ❌ `AZURE_DEVOPS_EXT_PAT` ← DOES NOT EXIST
- ❌ `ADO_PAT` ← NOT SUPPORTED

---

## Related Commands

| Command | Purpose |
|---------|---------|
| `/sw-ado:push` | Push local changes to ADO |
| `/sw-ado:sync` | Two-way sync (pull + push) |
| `/sw-ado:status` | Check sync status |
| `/sw-ado:create` | Create ADO work item |
