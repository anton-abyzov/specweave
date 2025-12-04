---
name: specweave-ado:close
description: Close Azure DevOps work item when increment complete
---

# Close ADO Work Item Command

**Usage**: `/specweave-ado:close <increment-id>`

**Purpose**: Close ADO work item and add completion summary

---

## Command Behavior

When user runs this command, Claude should:

### 1. Check Permission Gate (MANDATORY FIRST STEP)

**Before ANY ADO API calls**, check if status updates are allowed:

```typescript
// Read .specweave/config.json
const config = JSON.parse(await fs.readFile('.specweave/config.json', 'utf-8'));
const canUpdateExternal = config?.sync?.settings?.canUpdateExternalItems ?? false;
const canUpdateStatus = config?.sync?.settings?.canUpdateStatus ?? false;

// Close requires both permissions (write to close, status to change state)
if (!canUpdateExternal || !canUpdateStatus) {
  const missing = [];
  if (!canUpdateExternal) missing.push('canUpdateExternalItems');
  if (!canUpdateStatus) missing.push('canUpdateStatus');

  console.log(`
❌ Permission Denied

Closing ADO work items requires these permissions:
${missing.map(p => `  - sync.settings.${p} = false (required: true)`).join('\n')}

To enable, update .specweave/config.json:
{
  "sync": {
    "settings": {
      "canUpdateExternalItems": true,
      "canUpdateStatus": true
    }
  }
}
`);
  return;
}
```

### 2. Resolve ADO Profile

Use the increment's stored profile or fall back to global activeProfile:

```typescript
// Load increment metadata
const metadataPath = `.specweave/increments/${incrementId}/metadata.json`;
const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));

// Priority: increment profile > global activeProfile
let profileName = metadata?.external_sync?.ado?.profile;
if (!profileName) {
  profileName = config?.sync?.activeProfile;
}

// Validate profile exists
const profileConfig = config?.sync?.profiles?.[profileName];
if (!profileConfig || profileConfig.provider !== 'ado') {
  console.log(`❌ ADO profile "${profileName}" not found`);
  return;
}

const { organization, project } = profileConfig.config;
```

### 3. Validate Increment Completion

Before closing, verify the increment is actually complete:

```typescript
// Check tasks.md for completion
const tasksPath = `.specweave/increments/${incrementId}/tasks.md`;
const tasksContent = await fs.readFile(tasksPath, 'utf-8');

const totalTasks = (tasksContent.match(/### T-\d+/g) || []).length;
const completedTasks = (tasksContent.match(/\[x\] completed/gi) || []).length;

if (completedTasks < totalTasks) {
  console.log(`
⚠️ Increment not complete

Tasks: ${completedTasks}/${totalTasks} completed
Cannot close ADO work item until all tasks are done.

Complete remaining tasks first, then re-run this command.
`);
  return;
}
```

### 4. Invoke ADO Manager Agent

```
Use Task tool with subagent_type: "specweave-ado:ado-manager:ado-manager"

Prompt: "Close ADO work item for completed increment {increment-id}.

IMPORTANT:
- Permission verified: canUpdateExternalItems=true, canUpdateStatus=true
- Using profile: {profileName} (org: {organization}, project: {project})

Steps:
1. Validate: All tasks in tasks.md complete
2. Generate: Completion summary (duration, deliverables)
3. Load work item ID from metadata.json
4. PATCH work item: state = Closed (using org: {organization}, project: {project})
5. POST final comment with summary
6. Display: Closure confirmation with profile used"
```

### 5. Display Result

```
✅ Closed ADO Work Item

Work Item: #{workItemId}
Profile: {profileName}
  Organization: {organization}
  Project: {project}

Increment: {increment-id}
Status: 100% complete ({total}/{total} tasks)
Duration: {days} days

Summary posted to ADO work item
URL: https://dev.azure.com/{organization}/{project}/_workitems/edit/{workItemId}
```

---

## Permission Requirements

This command requires **both** permissions:

| Permission | Required | Purpose |
|------------|----------|---------|
| canUpdateExternalItems | true | Write to ADO work item |
| canUpdateStatus | true | Change work item state to Closed |

---

## Example Output

### Success

```
User: /specweave-ado:close-workitem 0005-payment-integration

Claude:
Checking permissions...
  canUpdateExternalItems: true
  canUpdateStatus: true

Resolving ADO profile...
  Using: ado-my-project (from increment)
  Organization: acme-corp
  Project: My Project

Validating completion...
  Tasks: 10/10 complete

Closing work item...

✅ Closed ADO Epic #12345

Profile: ado-my-project
Increment: 0005-payment-integration
Status: 100% complete (10/10 tasks)
Duration: 3 days

Summary posted to ADO work item
URL: https://dev.azure.com/acme-corp/My%20Project/_workitems/edit/12345
```

### Permission Denied

```
User: /specweave-ado:close-workitem 0005

Claude:
Checking permissions...
  canUpdateExternalItems: false
  canUpdateStatus: false

❌ Permission Denied

Closing ADO work items requires:
  - sync.settings.canUpdateExternalItems = true
  - sync.settings.canUpdateStatus = true

Update .specweave/config.json to enable these permissions.
```

### Incomplete Increment

```
User: /specweave-ado:close-workitem 0005

Claude:
Checking permissions...
  canUpdateExternalItems: true
  canUpdateStatus: true

Validating completion...

⚠️ Increment not complete

Tasks: 6/10 completed
Cannot close ADO work item until all tasks are done.

Complete remaining tasks:
  - T-007: Add refund functionality
  - T-008: Implement subscriptions
  - T-009: Add analytics
  - T-010: Security audit
```

---

## Related

| Command | Purpose |
|---------|---------|
| `/specweave-ado:pull` | Pull changes from ADO |
| `/specweave-ado:push` | Push progress to ADO |
| `/specweave-ado:sync` | Two-way sync |
| `/specweave-ado:create` | Create ADO work item |
| `/specweave-ado:status` | Check sync status |
