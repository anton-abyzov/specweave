---
name: specweave-jira:pull
description: Pull latest changes from Jira (like git pull). Imports status, priority, sprint, and comments.
---

# Jira Pull Command

**Usage**: `/sw-jira:pull [increment-id]`

**Purpose**: Pull latest changes from Jira to your local increment (like `git pull`)

---

## Quick Start

```bash
# Pull for current/active increment
/sw-jira:pull

# Pull for specific increment
/sw-jira:pull 0005
```

---

## What Gets Pulled

| Field | Behavior |
|-------|----------|
| **Status** | External ALWAYS wins (QA/stakeholder decisions) |
| **Priority** | External wins (stakeholder prioritization) |
| **Sprint** | Updated if changed in Jira |
| **Comments** | New team comments imported to notes |
| **Assignee** | Updated if changed |
| **Story Points** | Imported if set |

---

## Status Mapping

| Jira Status | SpecWeave Status |
|-------------|------------------|
| To Do | draft |
| In Progress | in-progress |
| Code Review | implemented |
| In Review | implemented |
| QA / Testing | in-qa |
| Done / Closed | completed |
| Blocked | blocked |
| Cancelled | cancelled |

---

## Command Behavior

When user runs this command:

### 1. Resolve Increment

```typescript
const incrementId = args.incrementId || await findActiveIncrement();

const metadata = JSON.parse(await fs.readFile(
  `.specweave/increments/${incrementId}/metadata.json`, 'utf-8'
));

const jiraIssueKey = metadata?.external_sync?.jira?.issueKey;
if (!jiraIssueKey) {
  console.log(`Not linked to Jira. Link manually or use: /sw-jira:sync ${incrementId}`);
  return;
}
```

### 2. Fetch and Apply

```
Use Task tool with subagent_type: "specweave-jira:jira-manager:jira-manager"

Prompt: "Pull changes from Jira for increment {increment-id}.

Issue: {jiraIssueKey}

Steps:
1. Fetch issue {jiraIssueKey} via Jira REST API
2. Compare Jira status vs local status
3. Apply conflict resolution (EXTERNAL WINS for status/priority)
4. Import new comments to increment notes
5. Update sprint/assignee in metadata
6. Display what changed"
```

### 3. Display Changes

```
Pulled from Jira

Issue: PROJ-123
Project: My Project

Changes Applied:
  Status: In Progress -> Done (mapped to: completed)
  Priority: Medium -> High
  Sprint: Sprint 23 -> Sprint 24
  Comments: 3 new imported

Last synced: 2025-12-04 10:30:00
URL: https://mycompany.atlassian.net/browse/PROJ-123
```

---

## Conflict Resolution

**CRITICAL**: External tool status ALWAYS wins.

| Scenario | Winner | Reason |
|----------|--------|--------|
| Status differs | **External** | QA/stakeholder decisions |
| Priority differs | **External** | Stakeholder prioritization |
| Sprint differs | **External** | Sprint planning decisions |

---

## Examples

### Example 1: Simple Pull

```
User: /sw-jira:pull

Claude:
Pulling from Jira...
  Increment: 0005-payment-integration
  Issue: PROJ-123

Changes Applied:
  Status: In Progress -> Done (completed)

Pull complete!
```

### Example 2: Already Up to Date

```
User: /sw-jira:pull 0005

Claude:
Pulling from Jira...
  Increment: 0005-payment-integration
  Issue: PROJ-123

Already up to date!
Last synced: 5 minutes ago
```

---

## Related Commands

| Command | Purpose |
|---------|---------|
| `/sw-jira:push` | Push local changes to Jira |
| `/sw-jira:sync` | Two-way sync (pull + push) |
| `/sw-jira:import-boards` | Import Jira boards |
