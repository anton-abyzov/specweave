---
name: close-workitem
description: Close Azure DevOps work item when increment complete
---

# Close ADO Work Item Command

**Usage**: `/specweave-ado:close-workitem <increment-id>`

**Purpose**: Close ADO work item and add completion summary

---

## Command Behavior

When user runs this command, invoke `ado-manager` agent to:

1. Validate increment is 100% complete (all tasks done)
2. Generate completion summary
3. PATCH work item state → Closed
4. POST final comment with deliverables
5. Display confirmation

**Agent Invocation**:
```
Use Task tool with subagent_type: "ado-manager"

Prompt: "Close ADO work item for completed increment 0005-payment-integration.

Steps:
1. Validate: All tasks in tasks.md complete
2. Generate: Completion summary (duration, deliverables)
3. Load work item ID from increment-metadata.json
4. PATCH work item: state = Closed
5. POST final comment with summary
6. Display: Closure confirmation"
```

---

## Example Output

```
✅ Closed ADO Epic #12345

Increment: 0005-payment-integration
Status: 100% complete (10/10 tasks)
Duration: 3 days

Summary posted to ADO work item
URL: https://dev.azure.com/myorg/MyProject/_workitems/edit/12345
```
