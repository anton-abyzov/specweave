---
description: Pull latest changes from GitHub Issues (like git pull). Imports comments, labels, and status changes.
---

# GitHub Pull Command

**Usage**: `/sw-github:pull [increment-id]`

**Purpose**: Pull latest changes from GitHub Issues to your local increment (like `git pull`)

---

## Quick Start

```bash
# Pull for current/active increment
/sw-github:pull

# Pull for specific increment
/sw-github:pull 0005
```

---

## What Gets Pulled

| Field | Behavior |
|-------|----------|
| **Status** | Issue state (open/closed) -> increment status |
| **Labels** | Priority labels imported |
| **Comments** | New team comments imported to notes |
| **Assignees** | Updated if changed |
| **Milestone** | Iteration/sprint mapping |

---

## Command Behavior

When user runs this command:

### 1. Resolve Increment

```typescript
const incrementId = args.incrementId || await findActiveIncrement();

const metadata = JSON.parse(await fs.readFile(
  `.specweave/increments/${incrementId}/metadata.json`, 'utf-8'
));

const issueNumber = metadata?.external_sync?.github?.issue;
if (!issueNumber) {
  console.log(`Not linked to GitHub. Run: /sw-github:create ${incrementId}`);
  return;
}
```

### 2. Fetch and Compare

```
Use Skill tool: Skill({ skill: "sw-github:github-manager", args: "Pull changes from GitHub for increment {increment-id}.

Issue: #{issueNumber}

Steps:
1. Fetch issue #{issueNumber} via gh api
2. Compare GitHub state vs local status
3. Apply conflict resolution (external wins for status)
4. Import new comments to increment notes
5. Update labels/assignees in metadata
6. Display what changed"
```

### 3. Display Changes

```
Pulled from GitHub

Issue: #123
Repository: owner/repo

Changes Applied:
  Status: open -> closed (mapped to: completed)
  Labels: +bug, +priority-high
  Comments: 2 new imported

Last synced: 2025-12-04 10:30:00
URL: https://github.com/owner/repo/issues/123
```

---

## Status Mapping

| GitHub State | SpecWeave Status |
|--------------|------------------|
| `open` | in-progress |
| `closed` | completed |

---

## Examples

### Example 1: Simple Pull

```
User: /sw-github:pull

Claude:
Pulling from GitHub...
  Increment: 0005-payment-integration
  Issue: #123

Changes Applied:
  Status: open -> closed (completed)

Pull complete!
```

### Example 2: Not Linked

```
User: /sw-github:pull 0005

Claude:
Increment 0005 not linked to GitHub yet.

To link: /sw-github:create 0005
```

---

## Related Commands

| Command | Purpose |
|---------|---------|
| `/sw-github:push` | Push local changes to GitHub |
| `/sw-github:sync` | Two-way sync (pull + push) |
| `/sw-github:status` | Check sync status |
| `/sw-github:create` | Create GitHub issue |
