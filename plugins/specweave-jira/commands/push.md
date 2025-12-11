---
name: sw-jira:push
description: Push local progress to Jira (like git push). Updates epic/story with task completion and comments.
---

# Jira Push Command

**Usage**: `/sw-jira:push [increment-id]`

**Purpose**: Push local progress to Jira (like `git push`)

---

## Quick Start

```bash
# Push current/active increment
/sw-jira:push

# Push specific increment
/sw-jira:push 0005
```

---

## What Gets Pushed

| Field | Source |
|-------|--------|
| **Progress** | Calculated from tasks.md (X/Y tasks, Z%) |
| **Comment** | Auto-generated with completed tasks list |
| **Status** | Transition if threshold crossed |
| **Custom Fields** | Completion % if field exists |

---

## Command Behavior

When user runs this command:

### 1. Check Permission Gate

```typescript
const config = JSON.parse(await fs.readFile('.specweave/config.json', 'utf-8'));
const canUpdateExternal = config?.sync?.settings?.canUpdateExternalItems ?? false;

if (!canUpdateExternal) {
  console.log(`
Permission Denied: Jira writes disabled

To enable: Set sync.settings.canUpdateExternalItems = true

Or use read-only: /sw-jira:pull ${incrementId}
`);
  return;
}
```

### 2. Calculate Progress

```typescript
const tasksContent = await fs.readFile(
  `.specweave/increments/${incrementId}/tasks.md`, 'utf-8'
);

const totalTasks = (tasksContent.match(/### T-\d+/g) || []).length;
const completedTasks = (tasksContent.match(/\[x\] completed/gi) || []).length;
const percentage = Math.round((completedTasks / totalTasks) * 100);
```

### 3. Invoke Push Sync

```
Use Task tool with subagent_type: "specweave-jira:jira-manager:jira-manager"

Prompt: "Push progress to Jira for increment {increment-id}.

Issue: {jiraIssueKey}
Progress: {completedTasks}/{totalTasks} ({percentage}%)

Steps:
1. Format progress comment with task list
2. POST comment to Jira issue
3. Update custom fields if available
4. Transition status if threshold crossed:
   - 100% completed -> Done (if canUpdateStatus)
5. Update sync timestamp in metadata
6. Display push summary"
```

### 4. Display Result

```
Pushed to Jira

Issue: PROJ-123
Project: My Project

Progress: 6/10 tasks (60%)

Comment posted:
  "Progress Update: 60% complete

   Recently completed:
   - T-005: Add payment validation
   - T-006: Implement refund flow"

Fields updated:
  Completion: 60%

URL: https://mycompany.atlassian.net/browse/PROJ-123
```

---

## Permission Requirements

| Permission | Required | Purpose |
|------------|----------|---------|
| `canUpdateExternalItems` | **true** | Write to Jira |
| `canUpdateStatus` | optional | Transition issue status |

---

## Examples

### Example 1: Simple Push

```
User: /sw-jira:push

Claude:
Pushing to Jira...
  Increment: 0005-payment-integration
  Issue: PROJ-123

Progress: 8/10 tasks (80%)
Comment posted.

Push complete!
```

### Example 2: 100% Complete

```
User: /sw-jira:push 0005

Claude:
Pushing to Jira...

Progress: 10/10 tasks (100%)

Comment posted:
  "All tasks complete!"

Status transitioned:
  In Progress -> Done (canUpdateStatus = true)

Ready to close: /sw:done 0005
```

---

## Related Commands

| Command | Purpose |
|---------|---------|
| `/sw-jira:pull` | Pull changes from Jira |
| `/sw-jira:sync` | Two-way sync (pull + push) |
| `/sw-jira:import-boards` | Import Jira boards |
