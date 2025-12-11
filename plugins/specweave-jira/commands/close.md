---
name: specweave-jira:close
description: Close JIRA issue when increment complete
---

# Close JIRA Issue Command

**Usage**: `/sw-jira:close <increment-id>`

**Purpose**: Close JIRA issue and add completion summary

---

## Command Behavior

When user runs this command, Claude should:

### 1. Check Permission Gate (MANDATORY FIRST STEP)

**Before ANY JIRA API calls**, check if status updates are allowed:

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

Closing JIRA issues requires these permissions:
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

### 2. Resolve JIRA Profile

Use the increment's stored profile or fall back to global defaultProfile/activeProfile:

```typescript
// Load increment metadata
const metadataPath = `.specweave/increments/${incrementId}/metadata.json`;
const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));

// Priority: increment profile > global defaultProfile > activeProfile
let profileName = metadata?.external_sync?.jira?.profile;
if (!profileName) {
  profileName = config?.sync?.defaultProfile ?? config?.sync?.activeProfile;
}

// Validate profile exists
const profileConfig = config?.sync?.profiles?.[profileName];
if (!profileConfig || profileConfig.provider !== 'jira') {
  console.log(`❌ JIRA profile "${profileName}" not found`);
  return;
}

const { domain, projectKey } = profileConfig.config;
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
Cannot close JIRA issue until all tasks are done.

Complete remaining tasks first, then re-run this command.
`);
  return;
}
```

### 4. Validate Issue Is Linked

```typescript
// Check for linked issue
const issueKey = metadata?.external_sync?.jira?.issueKey
  || metadata?.external_ids?.jira?.epic;

if (!issueKey) {
  console.log(`
⚠️ No JIRA issue linked

This increment is not linked to a JIRA issue.
First create an issue with: /sw-jira:create ${incrementId}
`);
  return;
}
```

### 5. Invoke JIRA Manager Agent

```
Use Task tool with subagent_type: "specweave-jira:jira-manager:jira-manager"

Prompt: "Close JIRA issue for completed increment {increment-id}.

IMPORTANT:
- Permission verified: canUpdateExternalItems=true, canUpdateStatus=true
- Using profile: {profileName} (domain: {domain}, project: {projectKey})
- Issue key: {issueKey}

Steps:
1. Validate: All tasks in tasks.md complete
2. Generate: Completion summary (duration, deliverables)
3. Load issue key from metadata.json
4. GET available transitions from /rest/api/3/issue/{issueKey}/transitions
5. Find transition to 'Done' or 'Closed' status
6. POST transition: /rest/api/3/issue/{issueKey}/transitions
7. POST final comment with summary
8. Display: Closure confirmation with profile used"
```

### 6. Display Result

```
✅ Closed JIRA Issue

Issue: {issueKey}
Profile: {profileName}
  Domain: {domain}
  Project: {projectKey}

Increment: {increment-id}
Status: 100% complete ({total}/{total} tasks)
Duration: {days} days

Summary posted to JIRA issue
URL: https://{domain}/browse/{issueKey}
```

---

## Permission Requirements

This command requires **both** permissions:

| Permission | Required | Purpose |
|------------|----------|---------|
| canUpdateExternalItems | true | Write to JIRA issue |
| canUpdateStatus | true | Transition issue state to Done/Closed |

---

## Example Output

### Success

```
User: /sw-jira:close 0005-payment-integration

Claude:
Checking permissions...
  canUpdateExternalItems: true
  canUpdateStatus: true

Resolving JIRA profile...
  Using: jira-my-project (from increment)
  Domain: company.atlassian.net
  Project: MYPROJ

Validating completion...
  Tasks: 10/10 complete

Closing issue...

✅ Closed JIRA Issue MYPROJ-123

Profile: jira-my-project
Increment: 0005-payment-integration
Status: 100% complete (10/10 tasks)
Duration: 3 days

Summary posted to JIRA issue
URL: https://company.atlassian.net/browse/MYPROJ-123
```

### Permission Denied

```
User: /sw-jira:close 0005

Claude:
Checking permissions...
  canUpdateExternalItems: false
  canUpdateStatus: false

❌ Permission Denied

Closing JIRA issues requires:
  - sync.settings.canUpdateExternalItems = true
  - sync.settings.canUpdateStatus = true

Update .specweave/config.json to enable these permissions.
```

### Incomplete Increment

```
User: /sw-jira:close 0005

Claude:
Checking permissions...
  canUpdateExternalItems: true
  canUpdateStatus: true

Validating completion...

⚠️ Increment not complete

Tasks: 6/10 completed
Cannot close JIRA issue until all tasks are done.

Complete remaining tasks:
  - T-007: Add refund functionality
  - T-008: Implement subscriptions
  - T-009: Add analytics
  - T-010: Security audit
```

### No Issue Linked

```
User: /sw-jira:close 0005

Claude:
Checking linked issue...

⚠️ No JIRA issue linked

This increment is not linked to a JIRA issue.
First create an issue with: /sw-jira:create 0005
```

---

## Metadata Updates

After successful closure, the increment's `metadata.json` will be updated:

```json
{
  "external_sync": {
    "jira": {
      "profile": "jira-my-project",
      "issueKey": "MYPROJ-123",
      "issueUrl": "https://company.atlassian.net/browse/MYPROJ-123",
      "status": "Done",
      "closedAt": "2025-12-07T04:30:00Z",
      "lastSyncedAt": "2025-12-07T04:30:00Z"
    }
  }
}
```

---

## Related

| Command | Purpose |
|---------|---------|
| `/sw-jira:pull` | Pull changes from JIRA |
| `/sw-jira:push` | Push progress to JIRA |
| `/sw-jira:sync` | Two-way sync |
| `/sw-jira:create` | Create JIRA issue |
| `/sw-jira:status` | Check sync status |
