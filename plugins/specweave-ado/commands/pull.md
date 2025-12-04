---
name: specweave-ado:pull
description: Pull latest changes from Azure DevOps (like git pull). Supports increment, project, or full living docs sync.
---

# ADO Pull Command

**Usage**: `/specweave-ado:pull [target] [options]`

**Purpose**: Pull latest changes from Azure DevOps (like `git pull`)

---

## Quick Start

```bash
# Pull for current/active increment (simple mode)
/specweave-ado:pull

# Pull for specific increment
/specweave-ado:pull 0005

# Pull ALL changes across ALL projects (living docs sync)
/specweave-ado:pull --all

# Pull for specific project/board
/specweave-ado:pull --project clinical-insights

# Pull specific feature hierarchy (Epic → Feature → User Stories)
/specweave-ado:pull --feature FS-042
```

---

## Sync Modes

### Mode 1: Increment Sync (Default)
```bash
/specweave-ado:pull [increment-id]
```
Syncs ONE increment ↔ ONE linked work item.

### Mode 2: Living Docs Sync (Full)
```bash
/specweave-ado:pull --all [--time-range 1M]
```
Syncs ALL specs across ALL projects/boards:
- Discovers all linked specs in `.specweave/docs/internal/specs/`
- Fetches changes from ADO for each linked item
- Updates User Stories, Features, Epics
- Respects multi-project folder structure

### Mode 3: Project-Scoped Sync
```bash
/specweave-ado:pull --project clinical-insights
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
/specweave-ado:pull --feature FS-042
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

### For Increment Mode (default):

```typescript
const incrementId = args.incrementId || await findActiveIncrement();
const metadata = await loadIncrementMetadata(incrementId);

const adoWorkItemId = metadata?.external_sync?.ado?.workItemId;
if (!adoWorkItemId) {
  console.log('Not linked to ADO. Run: /specweave-ado:create');
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
User: /specweave-ado:pull 0005

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
User: /specweave-ado:pull --all

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
User: /specweave-ado:pull --project clinical-insights

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
User: /specweave-ado:pull --feature FS-042

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
User: /specweave-ado:pull

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
User: /specweave-ado:pull 0005

Claude:
Pulling from ADO...
  Increment: 0005-payment-integration
  Work Item: #12345

Already up to date!
Last synced: 2 minutes ago
```

### Example 3: Not Linked

```
User: /specweave-ado:pull 0005

Claude:
Increment 0005 not linked to ADO yet.

To link: /specweave-ado:create 0005
```

---

## Related Commands

| Command | Purpose |
|---------|---------|
| `/specweave-ado:push` | Push local changes to ADO |
| `/specweave-ado:sync` | Two-way sync (pull + push) |
| `/specweave-ado:status` | Check sync status |
| `/specweave-ado:create` | Create ADO work item |
