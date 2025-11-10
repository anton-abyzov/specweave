---
name: specweave-ado:sync
description: Bidirectional sync between SpecWeave increment and Azure DevOps work item (two-way sync by default)
---

# Sync ADO Work Item Command

**Usage**: `/specweave-ado:sync <increment-id> [options]`

**Purpose**: Bidirectional synchronization between SpecWeave increment and Azure DevOps work item

**Default**: Two-way sync (bidirectional)

---

## Options

- `--direction <mode>`: Sync direction (default: `bidirectional`)
  - `bidirectional`: SpecWeave ↔ ADO (default - recommended)
  - `to-ado`: SpecWeave → ADO only (push progress)
  - `from-ado`: ADO → SpecWeave only (pull updates)

## Examples

```bash
# Bidirectional sync (default - two-way)
/specweave-ado:sync 0005

# Push only (one-way to ADO)
/specweave-ado:sync 0005 --direction to-ado

# Pull only (one-way from ADO)
/specweave-ado:sync 0005 --direction from-ado
```

---

## Command Behavior

When user runs this command, invoke `ado-manager` agent to perform bidirectional sync:

### Phase 1: Pull FROM ADO (default behavior)
1. Fetch work item state from ADO API
2. Detect changes in ADO:
   - State changes (New → Active → Resolved → Closed)
   - Priority changes
   - Iteration/sprint changes
   - Comments from team members
   - Field updates
3. Apply ADO changes to SpecWeave increment:
   - Update increment status to match ADO state
   - Update priority in metadata
   - Import team comments to increment notes
   - Update iteration tracking

### Phase 2: Push TO ADO (default behavior)
1. Read tasks.md from increment
2. Calculate completion percentage
3. Identify recently completed tasks
4. Format progress update comment
5. POST comment to ADO work item
6. Update work item state if needed (New → Active → Resolved)
7. Update custom fields (completion %, current task, etc.)

**Agent Invocation**:
```
Use Task tool with subagent_type: "ado-manager"

Prompt: "Bidirectional sync for increment 0005-payment-integration with ADO.

Phase 1 - Pull FROM ADO:
1. Fetch work item #12345 from ADO API
2. Detect changes: state, priority, iteration, comments
3. Apply ADO changes to increment metadata
4. Import team comments to increment notes

Phase 2 - Push TO ADO:
1. Read .specweave/increments/0005/tasks.md
2. Calculate: X/Y tasks complete (Z%)
3. Identify: Recently completed tasks
4. Format comment with progress update
5. Load work item ID from increment-metadata.json
6. POST comment to ADO API
7. Update work item state/fields

Display: Bidirectional sync summary"
```

---

## Example Output

### Bidirectional Sync (Default)

```
🔄 Bidirectional sync for increment 0005...

✓ Azure DevOps work item: #12345
✓ Sync direction: bidirectional (two-way)

Detecting changes (both directions)...

FROM ADO:
✓ Work item state changed: Active → Resolved
✓ Iteration updated: Sprint 23 → Sprint 24
✓ Priority changed: 2 → 1
✓ 3 new comments from team

FROM SpecWeave:
✓ 2 new tasks completed (T-005, T-006)
✓ Progress: 40% → 60% (6/10 tasks)
✓ Current task: T-007

Syncing TO ADO...
✓ Posted progress comment (ID: 98765)
✓ Updated completion: 60%
✓ Updated current task field: T-007

Syncing FROM ADO...
✓ Updated increment status: active → completed
✓ Updated priority: P2 → P1
✓ Updated iteration tracking: Sprint 24
✓ Imported 3 team comments to increment notes

✅ Bidirectional Sync Complete!

   SpecWeave ↔ ADO synchronized
   • Pushed: Progress (60%), 2 task updates
   • Pulled: State (Resolved), priority (P1), iteration, 3 comments

ADO Work Item: https://dev.azure.com/myorg/MyProject/_workitems/edit/12345
Last synced: just now
Next sync: Automatic (hook-based) or manual when ready
```

### One-Way Sync (to-ado)

```
✅ Pushed to ADO Work Item #12345

Progress: 60% complete (6/10 tasks)

Recently Completed:
- T-005: Add payment tests
- T-006: Update documentation

URL: https://dev.azure.com/myorg/MyProject/_workitems/edit/12345
```
