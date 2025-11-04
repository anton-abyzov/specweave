---
name: sync
description: Sync SpecWeave increment progress with Azure DevOps work item
---

# Sync ADO Work Item Command

**Usage**: `/specweave-ado:sync <increment-id>`

**Purpose**: Update ADO work item with current increment progress

---

## Command Behavior

When user runs this command, invoke `ado-manager` agent to:

1. Read tasks.md from increment
2. Calculate completion percentage
3. Identify recently completed tasks
4. Format progress update comment
5. POST comment to ADO work item
6. Update work item state if needed (New → Active → Resolved)

**Agent Invocation**:
```
Use Task tool with subagent_type: "ado-manager"

Prompt: "Sync progress for increment 0005-payment-integration to ADO.

Steps:
1. Read .specweave/increments/0005/tasks.md
2. Calculate: X/Y tasks complete (Z%)
3. Identify: Recently completed tasks
4. Format comment with progress update
5. Load work item ID from increment-metadata.json
6. POST comment to ADO API
7. Display: Sync confirmation"
```

---

## Example Output

```
✅ Synced to ADO Epic #12345

Progress: 60% complete (6/10 tasks)

Recently Completed:
- T-005: Add payment tests
- T-006: Update documentation

URL: https://dev.azure.com/myorg/MyProject/_workitems/edit/12345
```
