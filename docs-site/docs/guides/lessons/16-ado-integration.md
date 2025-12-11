---
sidebar_position: 17
title: "Lesson 16: Azure DevOps Integration Guide"
description: "Complete guide to syncing SpecWeave with Azure DevOps Work Items"
---

# Lesson 16: Azure DevOps Integration Guide

**Time**: 45 minutes
**Goal**: Set up and master bidirectional Azure DevOps sync

---

## Why Azure DevOps Integration?

Azure DevOps is the enterprise choice for Microsoft-centric organizations. SpecWeave integration provides:

- **Work Item hierarchy** (Features → User Stories → Tasks)
- **Board synchronization** (progress reflects on Kanban boards)
- **Sprint/Iteration planning** (increments map to iterations)
- **Area Path support** (team-based organization)

---

## Azure DevOps ↔ SpecWeave Mapping

```
┌─────────────────────────────────────────────────────────────┐
│                    HIERARCHY MAPPING                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   SpecWeave                        Azure DevOps             │
│   ─────────                        ─────────────            │
│   Feature (FS-XXX)      ──────▶    Feature                  │
│     └─ User Story (US-XXX) ───▶      └─ User Story         │
│         └─ Task (T-XXX)   ────▶          └─ Task           │
│                                                             │
│   Increment 0042         ──────▶   Feature: AB#1000         │
│     └─ US-001 Login      ──────▶     └─ User Story: AB#1001│
│         └─ T-001 Service ──────▶         └─ Task: AB#1002  │
│                                                             │
│   Area Path: MyProject\Backend                              │
│   Iteration: Sprint 23                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 1: Create Personal Access Token (PAT)

### Navigate to Azure DevOps

```
1. Go to: https://dev.azure.com/{your-organization}
2. Click: User Settings (top right) → Personal Access Tokens
3. Click: "+ New Token"
```

### Token Configuration

```
Name: SpecWeave Integration
Organization: Your Organization
Expiration: 1 year (or custom)

Scopes:
  ☑ Work Items: Read & Write
  ☑ Code: Read (for commit linking)
  ☑ Build: Read (optional, for pipeline status)
  ☑ Project and Team: Read
```

### Store the PAT

```bash
# .env file (gitignored)
ADO_PAT=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ADO_ORGANIZATION=your-org-name
ADO_PROJECT=your-project-name
ADO_TEAM=your-team-name  # Optional, for team filtering
```

:::warning PAT Security
- PATs are as sensitive as passwords
- Never commit to version control
- Set shortest practical expiration
- Use separate PATs per integration
:::

---

## Step 2: Initialize with Azure DevOps

### During specweave init

```bash
specweave init .

# Questions you'll see:
? Which Git provider are you using?
    GitHub (github.com)
    GitHub Enterprise
    GitLab
  ❯ Azure DevOps (dev.azure.com)

? Do you want to sync increments with an external issue tracker?
    Yes, GitHub Issues
    Yes, JIRA
  ❯ Yes, Azure DevOps Work Items
    No, keep everything local

? Azure DevOps organization name: your-org-name

? Project name: your-project-name

? Team name(s) (comma-separated, or press Enter for default):
  Frontend,Backend,Mobile

? Default work item type for increments:
  ❯ Feature
    Epic
    User Story

? Map tasks to ADO Tasks? (Y/n)
```

### Verify Configuration

```bash
cat .specweave/config.json
```

```json
{
  "sync": {
    "ado": {
      "enabled": true,
      "organization": "your-org-name",
      "project": "your-project-name",
      "teams": ["Frontend", "Backend", "Mobile"],
      "incrementType": "Feature",
      "userStoryType": "User Story",
      "taskType": "Task",
      "syncTasks": true
    }
  }
}
```

### Test Connection

```bash
/sw-ado:status

# Output:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AZURE DEVOPS CONNECTION STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ PAT: Valid (expires: Dec 31, 2025)
✅ Organization: your-org-name
✅ Project: your-project-name
✅ Teams: Frontend, Backend, Mobile
✅ Permissions: Work Items (RW)

Ready for sync!
```

---

## Step 3: Team and Area Path Configuration

### Understanding Azure DevOps Structure

```
Organization: Contoso
└── Project: ProductLine-A
    ├── Team: Frontend Team
    │   └── Area Path: ProductLine-A\Frontend
    ├── Team: Backend Team
    │   └── Area Path: ProductLine-A\Backend
    └── Team: Mobile Team
        └── Area Path: ProductLine-A\Mobile

Iterations:
├── Sprint 23 (Nov 18 - Dec 1)
├── Sprint 24 (Dec 2 - Dec 15)
└── Sprint 25 (Dec 16 - Dec 29)
```

### Single Team Setup

```bash
? Team name: Backend

# Config:
{
  "sync": {
    "ado": {
      "team": "Backend",
      "areaPath": "ProductLine-A\\Backend"
    }
  }
}
```

### Multi-Team Setup

```bash
? Team names (comma-separated): Frontend,Backend,Mobile

# Config:
{
  "sync": {
    "ado": {
      "teams": ["Frontend", "Backend", "Mobile"],
      "areaPathMapping": {
        "Frontend": "ProductLine-A\\Frontend",
        "Backend": "ProductLine-A\\Backend",
        "Mobile": "ProductLine-A\\Mobile"
      }
    }
  }
}

# Folder structure:
.specweave/docs/specs/
├── Frontend/      ← Area Path: ProductLine-A\Frontend
├── Backend/       ← Area Path: ProductLine-A\Backend
└── Mobile/        ← Area Path: ProductLine-A\Mobile
```

---

## Creating Work Items

### Automatic Creation

When an increment is created:

```bash
/sw:increment "User authentication"

# Output:
Creating increment: 0042-user-authentication
✓ spec.md generated
✓ plan.md generated
✓ tasks.md generated
✓ Azure DevOps Feature AB#1000 created

Created work item hierarchy:
  Feature: AB#1000 "User Authentication Feature"
    └─ User Story: AB#1001 "US-001: User Login"
        ├─ Task: AB#1002 "T-001: Create AuthService"
        ├─ Task: AB#1003 "T-002: Implement JWT"
        └─ Task: AB#1004 "T-003: Add login endpoint"
    └─ User Story: AB#1005 "US-002: Password Reset"
        ├─ Task: AB#1006 "T-004: Reset email"
        └─ Task: AB#1007 "T-005: Reset confirmation"

Area Path: ProductLine-A\Backend
Iteration: Sprint 23
```

### Manual Creation

```bash
/sw-ado:create-workitem 0042

# Creates Feature → User Stories → Tasks
```

### Work Item Format

The created Feature looks like:

```
Title: [FS-001] User Authentication Feature

Description:
  <div>
    <h2>Implementation of user authentication feature</h2>

    <h3>User Stories</h3>
    <ul>
      <li>US-001: User Login</li>
      <li>US-002: Password Reset</li>
    </ul>

    <h3>Acceptance Criteria</h3>
    <ul>
      <li>AC-US1-01: Login with email/password works</li>
      <li>AC-US1-02: JWT token issued on success</li>
      <li>AC-US1-03: Rate limit 5 attempts per minute</li>
    </ul>

    <hr/>
    <p>📋 Managed by SpecWeave | Increment: 0042-user-authentication</p>
  </div>

Tags: specweave, feature:auth, increment:0042
Area Path: ProductLine-A\Backend
Iteration Path: ProductLine-A\Sprint 23
```

---

## Syncing Progress

### Manual Sync

```bash
/sw-ado:sync 0042

# Output:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AZURE DEVOPS SYNC: 0042-user-authentication
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Direction: SpecWeave → Azure DevOps

Changes:
  AB#1002: New → Closed
  AB#1003: New → Closed
  AB#1000: Progress updated (Completed Work: 40%)

Sync complete!
```

### State Mapping

SpecWeave task status maps to Azure DevOps states:

| SpecWeave Status | ADO State |
|------------------|-----------|
| `pending` | New |
| `in_progress` | Active |
| `completed` | Closed |
| `blocked` | Blocked (if configured) |

### Custom State Mapping

```json
{
  "sync": {
    "ado": {
      "stateMapping": {
        "pending": "New",
        "in_progress": "Active",
        "completed": "Resolved",
        "blocked": "On Hold"
      },
      "closedState": "Closed",
      "resolvedState": "Resolved"
    }
  }
}
```

### Bidirectional Sync

If someone updates status in Azure DevOps:

```bash
/sw-ado:sync 0042 --from-external

# Output:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AZURE DEVOPS SYNC: 0042-user-authentication
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Direction: Azure DevOps → SpecWeave

Changes detected:
  AB#1006: ADO shows "Closed", tasks.md shows "pending"

Update tasks.md? (Y/n)
  ✓ T-004 marked complete in tasks.md
```

---

## Iteration (Sprint) Integration

### Linking Increments to Iterations

```json
{
  "sync": {
    "ado": {
      "iterations": {
        "enabled": true,
        "autoAssign": true,
        "useCurrentIteration": true
      }
    }
  }
}
```

### Automatic Iteration Assignment

```bash
/sw:increment "User authentication"

# Output includes:
✓ Feature AB#1000 assigned to Sprint 23 (current iteration)
✓ All child work items inherit iteration
```

### Sprint Planning View

```bash
/sw-ado:sprint-status

# Output:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SPRINT 23 STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Iteration: ProductLine-A\Sprint 23
Dates: Nov 18 - Dec 1
Days remaining: 8

SpecWeave Increments in Sprint:
  0042-user-authentication    ████████░░  75%
  0043-payment-processing     ██░░░░░░░░  20%

Capacity: 120 hours
Completed: 84 hours
Remaining: 36 hours

Burndown: On track ✓
```

---

## Board Integration

### Kanban Board Sync

When tasks change state, they move on the board automatically:

```
Board: Backend Team Board

New          | Active       | Resolved     | Closed
─────────────┼──────────────┼──────────────┼─────────────
AB#1004      | AB#1005      |              | AB#1002
AB#1006      |              |              | AB#1003
AB#1007      |              |              |
```

### Board Columns Mapping

```json
{
  "sync": {
    "ado": {
      "boardColumns": {
        "New": "pending",
        "Active": "in_progress",
        "Resolved": "completed",
        "Closed": "completed"
      }
    }
  }
}
```

---

## Queries (WIQL)

### Find SpecWeave-managed Items

```wiql
-- All SpecWeave-managed work items
SELECT [System.Id], [System.Title], [System.State]
FROM WorkItems
WHERE [System.Tags] CONTAINS 'specweave'

-- Active increments
SELECT [System.Id], [System.Title]
FROM WorkItems
WHERE [System.Tags] CONTAINS 'specweave'
  AND [System.State] <> 'Closed'

-- Specific increment
SELECT [System.Id], [System.Title], [System.State]
FROM WorkItems
WHERE [System.Tags] CONTAINS 'increment:0042'
```

### Custom Queries in Config

```json
{
  "sync": {
    "ado": {
      "queries": {
        "activeIncrements": "SELECT * FROM WorkItems WHERE [System.Tags] CONTAINS 'specweave' AND [System.State] <> 'Closed'",
        "myWork": "SELECT * FROM WorkItems WHERE [System.Tags] CONTAINS 'specweave' AND [System.AssignedTo] = @Me"
      }
    }
  }
}
```

---

## Field Mapping

### Default Fields

| SpecWeave | ADO Field |
|-----------|-----------|
| Increment title | Title |
| spec.md description | Description (HTML) |
| Feature ID (FS-XXX) | Tags |
| User Story (US-XXX) | Title |
| Acceptance Criteria | Acceptance Criteria field |
| Task (T-XXX) | Title |
| Task status | State |

### Custom Fields

```json
{
  "sync": {
    "ado": {
      "customFields": {
        "SpecWeave Increment": "Custom.SpecWeaveIncrement",
        "Feature ID": "Custom.FeatureId",
        "Test Coverage": "Custom.TestCoverage"
      },
      "fieldMapping": {
        "increment": "Custom.SpecWeaveIncrement",
        "featureId": "Custom.FeatureId",
        "testCoverage": "Custom.TestCoverage"
      }
    }
  }
}
```

### Effort/Story Points

```json
{
  "sync": {
    "ado": {
      "effortMapping": {
        "enabled": true,
        "field": "Microsoft.VSTS.Scheduling.Effort",
        "defaultEffort": {
          "Task": 4,
          "User Story": 8
        }
      }
    }
  }
}
```

---

## Closing Work Items

### Automatic Close on Done

```bash
/sw:done 0042

# Output includes:
✓ Feature AB#1000 state: Closed
✓ All User Stories: Closed
✓ All Tasks: Closed
✓ Reason: "Completed"
✓ Comment added with completion summary
```

### Manual Close

```bash
/sw-ado:close-workitem 0042

# Or close with specific reason:
/sw-ado:close-workitem 0042 --reason "Deferred"
```

---

## Troubleshooting

### "Authentication failed"

```bash
# Check PAT validity
/sw-ado:status

# Common issues:
# 1. PAT expired (regenerate)
# 2. Wrong organization name
# 3. Insufficient scopes

# Test manually:
curl -u "":"$ADO_PAT" \
  "https://dev.azure.com/$ADO_ORGANIZATION/_apis/projects?api-version=7.0"
```

### "Project not found"

```bash
# Verify project name (exact match required)
# Check project exists in organization

# List all projects:
curl -u "":"$ADO_PAT" \
  "https://dev.azure.com/$ADO_ORGANIZATION/_apis/projects?api-version=7.0"
```

### "Area path not found"

```bash
# Area paths are hierarchical:
# ProductLine-A\Backend ✓
# Backend ✗ (missing project prefix)

# List area paths:
/sw-ado:area-paths

# Output:
Area Paths for ProductLine-A:
  ProductLine-A
  ProductLine-A\Frontend
  ProductLine-A\Backend
  ProductLine-A\Mobile
```

### "State transition not allowed"

```bash
# ADO workflows may restrict transitions
# Check allowed transitions:
/sw-ado:transitions AB#1002

# Output:
Current state: Active
Allowed transitions:
  → New (Revert)
  → Resolved (Resolve)
  → Closed (Close)

# Update config to use allowed transitions
```

### "Work item type not found"

```bash
# Process template determines available types
# Agile: Epic, Feature, User Story, Task, Bug
# Scrum: Epic, Feature, PBI, Task, Bug
# CMMI: Epic, Feature, Requirement, Task, Bug

# Check available types:
/sw-ado:work-item-types

# Update config to match your process template
```

---

## Azure Pipelines Integration

### Link Commits to Work Items

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main
      - develop

jobs:
  - job: Build
    steps:
      - script: |
          # Commits with AB#1234 auto-link to work items
          git log -1 --pretty=%B
        displayName: 'Show commit message'
```

### Sync on Pipeline Completion

```yaml
# azure-pipelines.yml
stages:
  - stage: Deploy
    jobs:
      - job: SyncSpecWeave
        steps:
          - script: |
              npm install -g specweave
              specweave sync-progress --auto-yes
            displayName: 'Sync SpecWeave progress'
            env:
              ADO_PAT: $(ADO_PAT)
```

---

## Enterprise Features

### Azure DevOps Server (On-premises)

```json
{
  "sync": {
    "ado": {
      "type": "server",
      "serverUrl": "https://tfs.your-company.com/tfs",
      "collection": "DefaultCollection"
    }
  }
}
```

### Service Account

For team-wide sync:

```bash
# Create service account in Azure AD
# Generate PAT for service account
# Use in .env:
ADO_PAT=service_account_pat
```

### Webhooks (Advanced)

```bash
# 1. In ADO: Project Settings → Service Hooks → Create
# Service: Web Hooks
# Trigger: Work item updated
# URL: https://your-server.com/specweave/ado-webhook

# 2. In SpecWeave config:
{
  "sync": {
    "ado": {
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
/sw:increment "User profile feature"

# Output:
✓ Increment 0050-user-profile created
✓ Azure DevOps Feature AB#2000 created
  └─ User Story AB#2001 "US-001: View Profile"
      ├─ Task AB#2002 "T-001: ProfileService"
      └─ Task AB#2003 "T-002: Profile UI"
  └─ User Story AB#2004 "US-002: Edit Profile"
      └─ Task AB#2005 "T-003: Edit form"

Area Path: ProductLine-A\Backend
Iteration: Sprint 23

# 2. Work on tasks
/sw:do

# Each task completion syncs to ADO
# Tasks transition: New → Closed
# Board updates automatically

# 3. PM checks in Azure DevOps
# - Board shows tasks moving across columns
# - Feature shows 60% complete
# - Sprint burndown updates

# 4. Complete increment
/sw:done 0050

# All work items closed automatically
# Feature state: Closed
# Reason: Completed
```

---

## Quick Exercise

Set up Azure DevOps integration:

```bash
# 1. Create PAT at dev.azure.com

# 2. Configure credentials
cat >> .env << EOF
ADO_PAT=your-pat-here
ADO_ORGANIZATION=your-org
ADO_PROJECT=your-project
EOF

# 3. Reconfigure SpecWeave
specweave init . --reconfigure

# 4. Test connection
/sw-ado:status

# 5. Create test increment
/sw:increment "Test ADO sync"

# 6. Verify in Azure DevOps
# Check your project board for new Feature
```

---

## Key Takeaways

1. **Hierarchy mapping** preserves structure (Feature → User Story → Task)
2. **Area Paths** enable team-based organization
3. **Iterations** integrate with sprint planning
4. **Board sync** provides real-time visibility
5. **Bidirectional updates** keep both systems current

---

## Glossary Terms Used

- **[Azure DevOps](/docs/glossary/terms/azure-devops)** — Microsoft DevOps platform
- **[Increment](/docs/glossary/terms/increments)** — A unit of work in SpecWeave
- **[Split-Source Sync](/docs/glossary/terms/split-source-sync)** — Content out, status in (not true bidirectional)
- **[Sprint](/docs/glossary/terms/sprint)** — Time-boxed iteration

---

## What's Next?

You've completed the external tools integration lessons! Now let's return to advanced patterns and see how everything comes together.

**:next** → [Back to Advanced Patterns](./10-advanced-patterns) or [Academy Overview](./index)
