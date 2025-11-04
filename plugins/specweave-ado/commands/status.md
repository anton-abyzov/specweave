---
name: status
description: Check Azure DevOps sync status for increment
---

# ADO Status Command

**Usage**: `/specweave-ado:status <increment-id>`

**Purpose**: Display ADO sync status and work item details

---

## Command Behavior

When user runs this command, invoke `ado-manager` agent to:

1. Read increment-metadata.json
2. Fetch work item from ADO API
3. Display: ID, URL, state, completion %, last sync time
4. Check for sync issues

**Agent Invocation**:
```
Use Task tool with subagent_type: "ado-manager"

Prompt: "Check ADO sync status for increment 0005-payment-integration.

Steps:
1. Read increment-metadata.json
2. Extract: work item ID, last sync time
3. GET work item from ADO API
4. Display status information
5. Check for any sync issues"
```

---

## Example Output

```
ADO Sync Status
===============
Increment: 0005-payment-integration
Work Item: #12345
URL: https://dev.azure.com/myorg/MyProject/_workitems/edit/12345
State: Active
Completion: 60% (6/10 tasks)
Last Synced: 2025-11-04 10:30:00 (5 minutes ago)
Sync Enabled: ✅

Next Sync: Automatic on task completion
```
