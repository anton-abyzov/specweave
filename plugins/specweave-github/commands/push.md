---
description: Push local progress to GitHub Issues (like git push). Updates issue with task completion checklist.
---

# GitHub Push Command

**Usage**: `/sw-github:push [increment-id]`

**Purpose**: Push local progress to GitHub Issues (like `git push`)

---

## Quick Start

```bash
# Push current/active increment
/sw-github:push

# Push specific increment
/sw-github:push 0005
```

---

## What Gets Pushed

| Field | Source |
|-------|--------|
| **Task Checklist** | Updated from tasks.md completion |
| **Comment** | Auto-generated progress update |
| **Labels** | Status labels updated |
| **State** | Closed if 100% complete |

---

## Command Behavior

When user runs this command:

### 1. Check Permission Gate

```typescript
const config = JSON.parse(await fs.readFile('.specweave/config.json', 'utf-8'));
const canUpdateExternal = config?.sync?.settings?.canUpdateExternalItems ?? false;

if (!canUpdateExternal) {
  console.log(`
Permission Denied: GitHub writes disabled

To enable: Set sync.settings.canUpdateExternalItems = true

Or use read-only: /sw-github:pull ${incrementId}
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
Use Skill tool: Skill({ skill: "sw-github:github-manager", args: "Push progress to GitHub for increment {increment-id}.

Issue: #{issueNumber}
Progress: {completedTasks}/{totalTasks} ({percentage}%)

Steps:
1. Update issue body task checklist
2. Add progress comment
3. Update labels if needed
4. Close issue if 100% complete (if canUpdateStatus)
5. Update sync timestamp"
```

### 4. Display Result

```
Pushed to GitHub

Issue: #123
Repository: owner/repo

Progress: 6/10 tasks (60%)

Updates:
  Task checklist: 6/10 checked
  Comment: Progress update posted
  Labels: +in-progress

URL: https://github.com/owner/repo/issues/123
```

---

## Examples

### Example 1: Simple Push

```
User: /sw-github:push

Claude:
Pushing to GitHub...
  Increment: 0005-payment-integration
  Issue: #123

Progress: 8/10 tasks (80%)
Checklist updated, comment posted.

Push complete!
```

### Example 2: 100% Complete

```
User: /sw-github:push 0005

Claude:
Pushing to GitHub...

Progress: 10/10 tasks (100%)

Updates:
  Task checklist: 10/10 checked
  Comment: "All tasks complete!"
  Issue: CLOSED

Ready for next: /sw:done 0005
```

---

## Related Commands

| Command | Purpose |
|---------|---------|
| `/sw-github:pull` | Pull changes from GitHub |
| `/sw-github:sync` | Two-way sync (pull + push) |
| `/sw-github:status` | Check sync status |
| `/sw-github:close` | Close issue with summary |
