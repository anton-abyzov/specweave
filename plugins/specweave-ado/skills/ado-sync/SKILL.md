---
name: ado-sync
description: Bidirectional synchronization between SpecWeave increments and Azure DevOps work items (two-way sync by default). Creates work items from increments, tracks progress via comments, updates increment status from work item state, syncs changes in both directions automatically. Activates for: Azure DevOps, ADO, work items, project management, sync to ADO, ADO integration, TFS integration, bidirectional ADO sync.
---

# Azure DevOps Sync Skill

**Purpose**: Seamlessly sync SpecWeave increments with Azure DevOps work items for unified project tracking.

**Default Behavior**: **Bidirectional (two-way) sync** - Changes in either system are automatically synchronized

**Capabilities**:
- Bidirectional sync: SpecWeave ↔ ADO (default)
- Create ADO work items from increments
- Sync task progress → ADO comments
- Update increment status ← ADO state changes
- Pull ADO comments and field updates → SpecWeave
- Close work items when increments complete
- Support for Epics, Features, User Stories

---

## When This Skill Activates

**Keywords**: Azure DevOps, ADO, work items, sync to ADO, ADO integration, TFS, Visual Studio Team Services

**Examples**:
- "Sync this increment with Azure DevOps"
- "Create ADO work item for this feature"
- "Update work item #12345 with progress"
- "Close ADO work item when done"

---

## Prerequisites

### 1. ADO Plugin Installed

```bash
# Check if installed
/plugin list --installed | grep specweave-ado

# Install if needed
/plugin install specweave-ado@specweave
```

### 2. Azure DevOps Personal Access Token (PAT)

**Create PAT**:
1. Go to https://dev.azure.com/{organization}/_usersSettings/tokens
2. Click "New Token"
3. Name: "SpecWeave Sync"
4. Scopes: Work Items (Read & Write), Comments (Read & Write)
5. Copy token → Set environment variable

**Set Token**:
```bash
export AZURE_DEVOPS_PAT="your-token-here"
```

### 3. ADO Configuration

Add to `.specweave/config.json`:
```json
{
  "externalPM": {
    "tool": "ado",
    "enabled": true,
    "config": {
      "organization": "myorg",
      "project": "MyProject",
      "workItemType": "Epic",
      "areaPath": "MyProject\\Team A",
      "syncOnTaskComplete": true
    }
  }
}
```

---

## Commands Available

### `/specweave-ado:create-workitem <increment-id>`

**Purpose**: Create ADO work item from increment

**Example**:
```bash
/specweave-ado:create-workitem 0005
```

**Result**:
- Creates Epic/Feature/User Story in ADO
- Links work item to increment (metadata)
- Adds initial comment with spec summary
- Sets tags: `specweave`, `increment-0005`

---

### `/specweave-ado:sync <increment-id>`

**Purpose**: Sync increment progress with ADO work item

**Example**:
```bash
/specweave-ado:sync 0005
```

**Result**:
- Calculates task completion (%)
- Updates work item description
- Adds comment with progress update
- Updates state (New → Active → Resolved)

---

### `/specweave-ado:close-workitem <increment-id>`

**Purpose**: Close ADO work item when increment complete

**Example**:
```bash
/specweave-ado:close-workitem 0005
```

**Result**:
- Updates work item state → Closed
- Adds completion comment with summary
- Marks work item as resolved

---

### `/specweave-ado:status <increment-id>`

**Purpose**: Check ADO sync status for increment

**Example**:
```bash
/specweave-ado:status 0005
```

**Result**:
```
ADO Sync Status
===============
Increment: 0005-payment-integration
Work Item: #12345
URL: https://dev.azure.com/myorg/MyProject/_workitems/edit/12345
State: Active
Completion: 60% (6/10 tasks)
Last Synced: 2025-11-04 10:30:00
Sync Enabled: ✅
```

---

## Automatic Sync

### When Task Completes

**Trigger**: Post-task-completion hook fires

**Flow**:
1. User marks task complete: `[x] T-005: Add payment tests`
2. Hook detects ADO sync enabled
3. Calculate new completion %
4. Update ADO work item comment:
   ```markdown
   ## Progress Update
   
   **Increment**: 0005-payment-integration
   **Status**: 60% complete (6/10 tasks)
   
   ### Recently Completed
   - [x] T-005: Add payment tests
   
   ### Remaining
   - [ ] T-007: Add refund functionality
   - [ ] T-008: Implement subscriptions
   - [ ] T-009: Add analytics
   - [ ] T-010: Security audit
   
   ---
   🤖 Auto-updated by SpecWeave
   ```

### When Increment Completes

**Trigger**: `/specweave:done` command

**Flow**:
1. User runs `/specweave:done 0005`
2. Validate all tasks complete
3. Close ADO work item automatically
4. Add completion comment with summary

---

## Work Item Types

### Epic (Recommended)

**Use When**: Large feature spanning multiple sprints

**Mapping**:
- SpecWeave increment → ADO Epic
- Tasks → Epic description (checklist)
- Progress → Epic comments

---

### Feature

**Use When**: Medium-sized feature within a sprint

**Mapping**:
- SpecWeave increment → ADO Feature
- Tasks → Feature description (checklist)
- Progress → Feature comments

---

### User Story

**Use When**: Small, single-sprint work

**Mapping**:
- SpecWeave increment → ADO User Story
- Tasks → User Story description (checklist)
- Progress → User Story comments

---

## Bidirectional Sync (Optional)

**Enable**: Set `bidirectional: true` in config

**Flow**: ADO → SpecWeave
1. User updates work item state in ADO (Active → Resolved)
2. SpecWeave detects change (polling or webhook)
3. Updates increment status locally
4. Notifies user: "Work item #12345 resolved → Increment 0005 marked complete"

**Note**: Bidirectional sync requires webhook or polling setup

---

## Configuration Options

**`.specweave/config.json`**:
```json
{
  "externalPM": {
    "tool": "ado",
    "enabled": true,
    "config": {
      "organization": "myorg",
      "project": "MyProject",
      "personalAccessToken": "${AZURE_DEVOPS_PAT}",
      "workItemType": "Epic",
      "areaPath": "MyProject\\Team A",
      "iterationPath": "MyProject\\Sprint 1",
      "syncOnTaskComplete": true,
      "syncOnIncrementComplete": true,
      "createWorkItemsAutomatically": true,
      "bidirectional": false,
      "tags": ["specweave", "increment"],
      "customFields": {
        "incrementId": "Custom.IncrementId"
      }
    }
  }
}
```

---

## Troubleshooting

### Error: "Personal Access Token invalid"

**Solution**:
1. Verify token is set: `echo $AZURE_DEVOPS_PAT`
2. Check token scopes: Work Items (Read & Write)
3. Ensure token not expired
4. Regenerate token if needed

---

### Error: "Work item not found"

**Solution**:
1. Check work item ID is correct
2. Verify you have access to the project
3. Ensure work item not deleted

---

### Error: "Organization or project not found"

**Solution**:
1. Verify organization name: https://dev.azure.com/{organization}
2. Check project name (case-sensitive)
3. Ensure you have access to the project

---

## API Rate Limits

**Azure DevOps**:
- Rate limit: 200 requests per minute per PAT
- Burst limit: 5000 requests per hour
- Recommendation: Enable rate limiting in config

**Config**:
```json
{
  "externalPM": {
    "config": {
      "rateLimiting": {
        "enabled": true,
        "maxRequestsPerMinute": 150
      }
    }
  }
}
```

---

## Security Best Practices

### DO:
- ✅ Store PAT in environment variable (`AZURE_DEVOPS_PAT`)
- ✅ Use `.env` file (gitignored)
- ✅ Set minimum required scopes
- ✅ Rotate PAT every 90 days

### DON'T:
- ❌ Commit PAT to git
- ❌ Share PAT via Slack/email
- ❌ Use PAT with excessive permissions
- ❌ Log PAT to console/files

---

## Related Commands

- `/specweave:inc` - Create increment (auto-creates ADO work item if enabled)
- `/specweave:do` - Execute tasks (auto-syncs progress to ADO)
- `/specweave:done` - Complete increment (auto-closes ADO work item)
- `/specweave:status` - Show increment status (includes ADO sync status)

---

## Examples

### Example 1: Create Increment with ADO Sync

```bash
# User
"Create increment for payment integration"

# SpecWeave (if ADO enabled)
1. PM agent generates spec.md
2. Auto-create ADO Epic #12345
3. Link Epic to increment metadata
4. Display: "Created increment 0005 → ADO Epic #12345"
```

### Example 2: Manual Sync

```bash
# User completed 3 tasks manually
# Now sync to ADO

/specweave-ado:sync 0005

# Result: ADO Epic #12345 updated with 30% progress
```

### Example 3: Check Sync Status

```bash
/specweave-ado:status 0005

# Output:
# Work Item: #12345
# URL: https://dev.azure.com/myorg/MyProject/_workitems/edit/12345
# State: Active
# Completion: 60%
# Last Synced: 5 minutes ago
```

---

**Status**: Ready to use
**Version**: 0.1.0
**Plugin**: specweave-ado@specweave
