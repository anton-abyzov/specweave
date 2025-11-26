---
sidebar_position: 16
title: "Lesson 15: JIRA Integration Guide"
description: "Complete guide to syncing SpecWeave with JIRA Epics and Stories"
---

# Lesson 15: JIRA Integration Guide

**Time**: 45 minutes
**Goal**: Set up and master bidirectional JIRA sync

---

## Why JIRA Integration?

JIRA is the enterprise standard for agile project management. SpecWeave integration provides:

- **Epic/Story hierarchy mapping** (Features → Epics, User Stories → Stories)
- **Sprint integration** (increments map to sprint work)
- **Status synchronization** (task progress → JIRA status)
- **Bidirectional updates** (changes sync both ways)

---

## JIRA ↔ SpecWeave Mapping

```
┌─────────────────────────────────────────────────────────────┐
│                    HIERARCHY MAPPING                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   SpecWeave                        JIRA                     │
│   ─────────                        ────                     │
│   Feature (FS-XXX)      ──────▶    Epic                     │
│     └─ User Story (US-XXX) ───▶      └─ Story              │
│         └─ Task (T-XXX)   ────▶          └─ Sub-task       │
│                                                             │
│   Increment 0042         ──────▶   Epic: AUTH-100           │
│     └─ US-001 Login      ──────▶     └─ Story: AUTH-101    │
│         └─ T-001 Service ──────▶         └─ Sub: AUTH-102  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 1: Create JIRA API Token

### Navigate to Atlassian Account

```
1. Go to: https://id.atlassian.com/manage-profile/security/api-tokens
2. Click: "Create API token"
3. Label: "SpecWeave - [your-project-name]"
4. Copy the token (you won't see it again!)
```

### Store Credentials

```bash
# .env file (gitignored)
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=xxxxxxxxxxxxxxxxxxxxxx
JIRA_BASE_URL=https://your-company.atlassian.net
JIRA_PROJECT_KEY=PROJ
```

:::warning Important
Use your **Atlassian account email**, not your company SSO email (unless they're the same).
:::

---

## Step 2: Initialize with JIRA

### During specweave init

```bash
specweave init .

# Questions you'll see:
? Do you want to sync increments with an external issue tracker?
    Yes, GitHub Issues
  ❯ Yes, JIRA
    Yes, Azure DevOps Work Items
    No, keep everything local

? JIRA instance type:
  ❯ JIRA Cloud (*.atlassian.net)
    JIRA Server / Data Center

? JIRA domain (e.g., company.atlassian.net): your-company.atlassian.net

? JIRA project key: PROJ

? Default issue type for increments:
  ❯ Epic
    Story

? Map tasks to JIRA sub-tasks? (Y/n)
```

### Verify Configuration

```bash
cat .specweave/config.json
```

```json
{
  "sync": {
    "jira": {
      "enabled": true,
      "baseUrl": "https://your-company.atlassian.net",
      "projectKey": "PROJ",
      "incrementType": "Epic",
      "userStoryType": "Story",
      "taskType": "Sub-task",
      "syncSubtasks": true
    }
  }
}
```

### Test Connection

```bash
/specweave-jira:status

# Output:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JIRA CONNECTION STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Authentication: Valid
✅ Project: PROJ (My Project)
✅ Issue Types: Epic, Story, Sub-task
✅ Permissions: Create, Edit, Transition

Ready for sync!
```

---

## Step 3: Team Strategy Selection

### Project-per-Team

**Use when**: Each team has its own JIRA project.

```bash
? Select team mapping strategy:
  ❯ Project-per-team (separate JIRA projects)

? JIRA project keys (comma-separated):
  FRONTEND,BACKEND,MOBILE,QA
```

**What happens**:

```
.specweave/docs/specs/
├── FRONTEND/      ← Syncs to FRONTEND project
├── BACKEND/       ← Syncs to BACKEND project
└── MOBILE/        ← Syncs to MOBILE project
```

**Config**:

```json
{
  "sync": {
    "jira": {
      "strategy": "project-per-team",
      "projects": ["FRONTEND", "BACKEND", "MOBILE", "QA"]
    }
  }
}
```

### Component-Based

**Use when**: Single JIRA project with components representing teams.

```bash
? Select team mapping strategy:
    Component-based (one project, multiple components)

? JIRA project key: MAIN

? Component names (comma-separated):
  Frontend,Backend,Mobile,QA
```

**What happens**:

```
All issues → MAIN project
Team identification via Component field
```

**Config**:

```json
{
  "sync": {
    "jira": {
      "strategy": "component-based",
      "projectKey": "MAIN",
      "components": ["Frontend", "Backend", "Mobile", "QA"]
    }
  }
}
```

### Board-Based

**Use when**: Single project with different Scrum/Kanban boards per team.

```bash
? Select team mapping strategy:
    Board-based (one project, filtered boards)

? Board IDs (comma-separated):
  123,456,789
```

**Config**:

```json
{
  "sync": {
    "jira": {
      "strategy": "board-based",
      "projectKey": "MAIN",
      "boardIds": [123, 456, 789]
    }
  }
}
```

---

## Creating JIRA Issues

### Automatic Creation

When an increment is created:

```bash
/specweave:increment "User authentication"

# Output:
Creating increment: 0042-user-authentication
✓ spec.md generated
✓ plan.md generated
✓ tasks.md generated
✓ JIRA Epic AUTH-100 created

Created JIRA hierarchy:
  Epic: AUTH-100 "User Authentication Feature"
    └─ Story: AUTH-101 "US-001: User Login"
        ├─ Sub-task: AUTH-102 "T-001: Create AuthService"
        ├─ Sub-task: AUTH-103 "T-002: Implement JWT"
        └─ Sub-task: AUTH-104 "T-003: Add login endpoint"
    └─ Story: AUTH-105 "US-002: Password Reset"
        ├─ Sub-task: AUTH-106 "T-004: Reset email"
        └─ Sub-task: AUTH-107 "T-005: Reset confirmation"
```

### Manual Creation

```bash
/specweave-jira:sync 0042 --create

# Creates Epic → Stories → Sub-tasks
```

### Issue Format

The created Epic looks like:

```
Title: [FS-001] User Authentication Feature

Description:
  Implementation of user authentication feature.

  ## User Stories
  - US-001: User Login
  - US-002: Password Reset

  ## Acceptance Criteria
  - AC-US1-01: Login with email/password works
  - AC-US1-02: JWT token issued on success
  - AC-US1-03: Rate limit 5 attempts per minute

  ---
  📋 Managed by SpecWeave | Increment: 0042-user-authentication

Labels: specweave, feature:auth
```

---

## Syncing Progress

### Manual Sync

```bash
/specweave-jira:sync 0042

# Output:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JIRA SYNC: 0042-user-authentication
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Direction: SpecWeave → JIRA

Changes:
  AUTH-102: To Do → Done
  AUTH-103: To Do → Done
  AUTH-100: Progress updated to 40%

Sync complete!
```

### Status Mapping

SpecWeave task status maps to JIRA workflow:

| SpecWeave Status | JIRA Status |
|------------------|-------------|
| `pending` | To Do |
| `in_progress` | In Progress |
| `completed` | Done |
| `blocked` | Blocked (if available) |

### Custom Status Mapping

Configure custom workflow mappings:

```json
{
  "sync": {
    "jira": {
      "statusMapping": {
        "pending": "Open",
        "in_progress": "In Development",
        "completed": "Closed",
        "blocked": "On Hold"
      }
    }
  }
}
```

### Bidirectional Sync

If someone updates status in JIRA:

```bash
/specweave-jira:sync 0042 --from-external

# Output:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JIRA SYNC: 0042-user-authentication
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Direction: JIRA → SpecWeave

Changes detected:
  AUTH-106: JIRA shows "Done", tasks.md shows "pending"

Update tasks.md? (Y/n)
  ✓ T-004 marked complete in tasks.md
```

---

## Sprint Integration

### Linking Increments to Sprints

```json
{
  "sync": {
    "jira": {
      "sprints": {
        "enabled": true,
        "autoAssign": true,
        "boardId": 123
      }
    }
  }
}
```

When creating increment:

```bash
/specweave:increment "User authentication"

# Output includes:
✓ Epic AUTH-100 assigned to Sprint 23 (current active sprint)
```

### Sprint Planning View

```bash
/specweave-jira:sprint-status

# Output:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SPRINT 23 STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Sprint: Sprint 23 (Nov 18 - Dec 1)
Days remaining: 8

SpecWeave Increments in Sprint:
  0042-user-authentication    ████████░░  75%
  0043-payment-processing     ██░░░░░░░░  20%

Total story points: 34/50 completed
Burndown: On track ✓
```

---

## JQL Queries

### Find SpecWeave-managed Issues

```jql
# All SpecWeave-managed issues
labels = "specweave"

# Active increments
labels = "specweave" AND status != Done

# Specific increment
labels = "specweave" AND labels = "increment:0042"

# Feature-related
labels = "specweave" AND labels = "feature:FS-001"
```

### Custom JQL in Config

```json
{
  "sync": {
    "jira": {
      "jql": {
        "activeIncrements": "labels = 'specweave' AND status != Done",
        "myWork": "labels = 'specweave' AND assignee = currentUser()"
      }
    }
  }
}
```

---

## Workflow Transitions

### Automatic Transitions

When task completes, JIRA issue transitions:

```bash
# Task T-001 marked complete
# SpecWeave triggers JIRA transition: "To Do" → "Done"

# If transition requires fields:
Transition requires: Resolution
Using default: "Done"
```

### Custom Transition Rules

```json
{
  "sync": {
    "jira": {
      "transitions": {
        "onTaskStart": "Start Progress",
        "onTaskComplete": "Done",
        "onTaskBlock": "Blocked",
        "requireFields": {
          "Done": {
            "resolution": "Done"
          }
        }
      }
    }
  }
}
```

---

## Field Mapping

### Default Fields

| SpecWeave | JIRA Field |
|-----------|------------|
| Increment title | Summary |
| spec.md description | Description |
| Feature ID (FS-XXX) | Labels |
| User Story (US-XXX) | Summary (Story) |
| Acceptance Criteria | Description |
| Task (T-XXX) | Summary (Sub-task) |

### Custom Fields

Map SpecWeave data to custom JIRA fields:

```json
{
  "sync": {
    "jira": {
      "customFields": {
        "SpecWeave Increment": "customfield_10001",
        "Feature ID": "customfield_10002",
        "Test Coverage": "customfield_10003"
      },
      "fieldMapping": {
        "increment": "customfield_10001",
        "featureId": "customfield_10002",
        "testCoverage": "customfield_10003"
      }
    }
  }
}
```

---

## Closing Issues

### Automatic Close on Done

```bash
/specweave:done 0042

# Output includes:
✓ JIRA Epic AUTH-100 transitioned to "Done"
✓ All Stories and Sub-tasks closed
✓ Resolution: "Done"
✓ Comment added with completion summary
```

### Manual Close

```bash
/specweave-jira:close 0042

# Or close with specific resolution:
/specweave-jira:close 0042 --resolution "Won't Do"
```

---

## Troubleshooting

### "Authentication failed"

```bash
# Check credentials
/specweave-jira:status

# Common issues:
# 1. Using company SSO email instead of Atlassian email
# 2. Token expired (regenerate at id.atlassian.com)
# 3. Wrong base URL (should be https://company.atlassian.net)

# Test manually:
curl -u "your-email@company.com:$JIRA_API_TOKEN" \
  "https://your-company.atlassian.net/rest/api/3/myself"
```

### "Project not found"

```bash
# Verify project key (uppercase)
# PROJ ✓
# proj ✗

# Check project exists:
curl -u "email:token" \
  "https://company.atlassian.net/rest/api/3/project/PROJ"
```

### "Transition not allowed"

```bash
# JIRA workflow may not allow direct transitions
# Check available transitions:
/specweave-jira:transitions AUTH-102

# Output:
Available transitions for AUTH-102:
  11: Start Progress
  21: Done
  31: Blocked

# Update config with correct transition IDs:
{
  "transitions": {
    "onTaskComplete": "21"  # Use ID instead of name
  }
}
```

### "Custom field not found"

```bash
# Get all custom fields:
/specweave-jira:fields

# Output:
Custom Fields:
  customfield_10001: "Story Points" (number)
  customfield_10002: "Sprint" (sprint)
  customfield_10003: "Team" (select)

# Use the correct ID in config
```

---

## Enterprise Features

### Data Center / Server Support

```json
{
  "sync": {
    "jira": {
      "type": "server",
      "baseUrl": "https://jira.your-company.com",
      "auth": "basic"  // or "oauth", "pat"
    }
  }
}
```

### Service Account

For team-wide sync, use a service account:

```bash
# .env
JIRA_EMAIL=specweave-bot@company.com
JIRA_API_TOKEN=bot_token_here
```

### Webhooks (Advanced)

Set up JIRA webhooks for real-time sync:

```bash
# 1. In JIRA: System → Webhooks → Create
# URL: https://your-server.com/specweave/jira-webhook
# Events: Issue created, updated, deleted

# 2. In SpecWeave config:
{
  "sync": {
    "jira": {
      "webhooks": {
        "enabled": true,
        "secret": "your-webhook-secret"
      }
    }
  }
}
```

---

## Real-World Example

### Full Workflow

```bash
# 1. Create increment
/specweave:increment "User profile feature"

# Output:
✓ Increment 0050-user-profile created
✓ JIRA Epic PROJ-500 created
  └─ Story PROJ-501 "US-001: View Profile"
      ├─ Sub-task PROJ-502 "T-001: ProfileService"
      └─ Sub-task PROJ-503 "T-002: Profile UI"
  └─ Story PROJ-504 "US-002: Edit Profile"
      └─ Sub-task PROJ-505 "T-003: Edit form"

# 2. Work on tasks
/specweave:do

# Each task completion syncs to JIRA
# Sub-tasks transition: To Do → Done

# 3. PM checks in JIRA
# Sees Epic at 60% progress
# Story PROJ-501 shows 100%
# Story PROJ-504 shows 0%

# 4. Complete increment
/specweave:done 0050

# All JIRA issues closed automatically
```

---

## Quick Exercise

Set up JIRA integration:

```bash
# 1. Create API token at id.atlassian.com

# 2. Configure credentials
cat >> .env << EOF
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your-token
JIRA_BASE_URL=https://your-company.atlassian.net
EOF

# 3. Reconfigure SpecWeave
specweave init . --reconfigure

# 4. Test connection
/specweave-jira:status

# 5. Create test increment
/specweave:increment "Test JIRA sync"

# 6. Verify in JIRA
# Check your project for new Epic
```

---

## Key Takeaways

1. **Hierarchy mapping** preserves your project structure (Epic → Story → Sub-task)
2. **Bidirectional sync** keeps both systems current
3. **Sprint integration** fits into your agile workflow
4. **Custom fields** map to your specific JIRA setup
5. **Workflow transitions** respect your JIRA configuration

---

## Glossary Terms Used

- **[JIRA](/docs/glossary/terms/jira)** — Atlassian project tracking tool
- **[Epic](/docs/glossary/terms/epic)** — Large feature spanning multiple sprints
- **[Increment](/docs/glossary/terms/increments)** — A unit of work in SpecWeave
- **[Split-Source Sync](/docs/glossary/terms/split-source-sync)** — Content out, status in (not true bidirectional)

---

## What's Next?

Learn how to integrate with Azure DevOps for Microsoft-centric teams.

**:next** → [Lesson 16: Azure DevOps Integration Guide](./16-ado-integration)
