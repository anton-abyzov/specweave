---
name: specweave-jira:status
description: Check JIRA sync status for SpecWeave increment
---

# JIRA Status Command

**Usage**: `/specweave-jira:status <increment-id>`

**Purpose**: Display JIRA sync status and issue details for an increment

---

## Command Behavior

When user runs this command, Claude should:

### 1. Read Increment Metadata

```typescript
// Load increment metadata
const metadataPath = `.specweave/increments/${incrementId}/metadata.json`;
const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));

// Check for linked JIRA issue (check both standard and legacy paths)
const jiraSync = metadata?.external_sync?.jira || metadata?.external_ids?.jira;
const issueKey = jiraSync?.issueKey || jiraSync?.epic;

if (!issueKey) {
  console.log(`
⚠️ No JIRA issue linked

This increment is not linked to a JIRA issue.
Create one with: /specweave-jira:create ${incrementId}
`);
  return;
}
```

### 2. Resolve JIRA Profile

```typescript
// Priority: increment profile > global defaultProfile > activeProfile
let profileName = jiraSync?.profile;
if (!profileName) {
  const config = JSON.parse(await fs.readFile('.specweave/config.json', 'utf-8'));
  profileName = config?.sync?.defaultProfile ?? config?.sync?.activeProfile;
}

const profileConfig = config?.sync?.profiles?.[profileName];
const { domain, projectKey } = profileConfig?.config || {};
```

### 3. Read Local Task Status

```typescript
// Check tasks.md for completion
const tasksPath = `.specweave/increments/${incrementId}/tasks.md`;
const tasksContent = await fs.readFile(tasksPath, 'utf-8');

const totalTasks = (tasksContent.match(/### T-\d+/g) || []).length;
const completedTasks = (tasksContent.match(/\[x\] completed/gi) || []).length;
const completion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
```

### 4. Invoke JIRA Manager Agent (Optional - For Live Status)

```
Use Task tool with subagent_type: "specweave-jira:jira-manager:jira-manager"

Prompt: "Check JIRA sync status for increment {increment-id}.

Issue Key: {issueKey}
Profile: {profileName} (domain: {domain})

Steps:
1. GET issue from JIRA API: /rest/api/3/issue/{issueKey}
2. Extract: status, priority, assignee, sprint, story points
3. Compare local vs JIRA status
4. Detect any sync issues or drift
5. Display comprehensive status"
```

### 5. Display Status

```
JIRA Sync Status
================
Increment: {increment-id}
Issue: {issueKey}
URL: https://{domain}/browse/{issueKey}
Status: {jiraStatus}
Completion: {completion}% ({completedTasks}/{totalTasks} tasks)
Last Synced: {lastSyncedAt} ({relativeTime})
Sync Enabled: ✅

Profile: {profileName}
  Domain: {domain}
  Project: {projectKey}

Next Sync: Automatic on task completion
```

---

## Example Output

### Issue Linked

```
User: /specweave-jira:status 0005-payment-integration

Claude:
JIRA Sync Status
================
Increment: 0005-payment-integration
Issue: MYPROJ-123
URL: https://company.atlassian.net/browse/MYPROJ-123
Status: In Progress
Completion: 60% (6/10 tasks)
Last Synced: 2025-12-07 10:30:00 (5 minutes ago)
Sync Enabled: ✅

Profile: jira-my-project
  Domain: company.atlassian.net
  Project: MYPROJ

Priority: High
Assignee: john.doe
Sprint: Sprint 42

Next Sync: Automatic on task completion
```

### No Issue Linked

```
User: /specweave-jira:status 0005

Claude:
JIRA Sync Status
================
Increment: 0005-payment-integration

⚠️ No JIRA issue linked

This increment is not linked to a JIRA issue.
Create one with: /specweave-jira:create 0005-payment-integration
```

### Sync Issues Detected

```
User: /specweave-jira:status 0005

Claude:
JIRA Sync Status
================
Increment: 0005-payment-integration
Issue: MYPROJ-123
URL: https://company.atlassian.net/browse/MYPROJ-123
Status: In Progress
Completion: 60% (6/10 tasks)
Last Synced: 2025-12-05 10:30:00 (2 days ago)
Sync Enabled: ✅

⚠️ Sync Issues Detected:
  - Local status: in_progress, JIRA status: Done
  - Status drift detected - run /specweave-jira:pull to sync

Profile: jira-my-project
  Domain: company.atlassian.net
  Project: MYPROJ
```

---

## Status Information Displayed

| Field | Source | Description |
|-------|--------|-------------|
| Issue | metadata.json | JIRA issue key (e.g., PROJ-123) |
| URL | Constructed | Direct link to JIRA issue |
| Status | JIRA API | Current issue status |
| Completion | tasks.md | Local completion percentage |
| Last Synced | metadata.json | Timestamp of last sync |
| Profile | metadata/config | Which JIRA profile is used |
| Priority | JIRA API | Issue priority |
| Assignee | JIRA API | Current assignee |
| Sprint | JIRA API | Current sprint assignment |

---

## Drift Detection

The status command detects common sync issues:

| Issue | Detection | Resolution |
|-------|-----------|------------|
| Status drift | Local vs JIRA status mismatch | `/specweave-jira:pull` |
| Stale sync | Last synced > 24 hours ago | `/specweave-jira:sync` |
| Missing issue | Issue deleted in JIRA | `/specweave-jira:create` |
| Permission denied | canUpdateExternalItems=false | Read-only mode note |

---

## Related

| Command | Purpose |
|---------|---------|
| `/specweave-jira:pull` | Pull changes from JIRA |
| `/specweave-jira:push` | Push progress to JIRA |
| `/specweave-jira:sync` | Two-way sync |
| `/specweave-jira:create` | Create JIRA issue |
| `/specweave-jira:close` | Close issue when complete |
