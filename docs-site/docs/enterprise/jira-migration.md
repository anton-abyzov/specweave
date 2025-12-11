---
id: jira-migration
title: JIRA Enterprise Migration Guide
sidebar_label: JIRA Migration
sidebar_position: 2
---

# JIRA Enterprise Migration Guide

:::tip Enterprise Focus
This guide explains how SpecWeave integrates with **JIRA Cloud and JIRA Data Center** for enterprise teams managing Agile workflows, epics, stories, and sprints across multiple projects.
:::

---

## 🎯 Why JIRA Integration Matters for Enterprises

### The Enterprise Reality

Most large organizations use JIRA as their project management tool:

- **Product Managers**: Track epics, features, roadmaps
- **Engineering**: Work in sprints, burn down stories
- **QA**: Create test plans, track bugs
- **Executives**: View dashboards, monitor progress
- **Stakeholders**: Track dependencies, blockers

**The Problem**: JIRA becomes the **de facto source of truth**, but:
- ❌ Non-technical teams can't read code/specs
- ❌ Developers hate context-switching to JIRA
- ❌ Specs in JIRA tickets become stale
- ❌ No version control for requirements
- ❌ Hard to maintain technical depth

**SpecWeave Solution**:
- ✅ `.specweave/` = **Technical source of truth** (for developers)
- ✅ JIRA = **Business visibility layer** (for stakeholders)
- ✅ **Bidirectional sync** keeps both in sync automatically
- ✅ Full version control + audit trails

---

## 🏗️ Architecture: Local-First, JIRA as Business Mirror

### Source of Truth Pattern

```
✅ CORRECT Architecture:
.specweave/docs/specs/ (LOCAL - Technical Truth)
    ↓ Bidirectional Sync
JIRA Epics/Stories (MIRROR - Business Visibility)

❌ WRONG (JIRA as Source of Truth):
JIRA Epics/Stories (External)
    ↓ One-way sync
.specweave/ (Local - Backup copy)
```

**Why This Matters**:

| Aspect | `.specweave/` (Local) | JIRA (External) |
|--------|----------------------|-----------------|
| **Audience** | Developers, Architects | PMs, Stakeholders, Executives |
| **Detail Level** | Technical (APIs, schemas, tests) | Business (user stories, acceptance criteria) |
| **Version Control** | ✅ Git (full history) | ❌ Limited audit log |
| **Offline Access** | ✅ Always available | ❌ Requires internet |
| **Search** | ✅ Fast (grep, ripgrep) | ❌ Slow (JQL queries) |
| **Format** | Markdown (LLM-friendly) | Rich text (LLM-hostile) |

**Result**: Developers work in `.specweave/`, stakeholders track in JIRA, both stay in sync automatically!

---

## 🚀 Quick Start: JIRA Integration

### Step 1: Generate JIRA API Token

1. Go to: https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Label: "SpecWeave - [project-name]"
4. Copy token (52-character alphanumeric)

### Step 2: Initialize SpecWeave with JIRA

```bash
# Initialize SpecWeave (interactive)
specweave init

# During setup, select:
? Select issue tracker: JIRA
? JIRA instance: JIRA Cloud (company.atlassian.net)
? Email: you@company.com
? API Token: [paste token]
? Strategy: Project-per-team (or Component-based, Board-based)
? Project keys: FRONTEND,BACKEND,MOBILE,QA
```

**Result**: Creates `.env` with JIRA credentials and `.specweave/config.json` with sync profile.

### Step 3: Verify Connection

```bash
# Test JIRA connection
specweave validate-jira

# Expected output:
# ✓ JIRA API connection successful
# ✓ Projects found: FRONTEND, BACKEND, MOBILE, QA
# ✓ User permissions: Create, Edit, Transition issues
```

### Step 4: Create First Increment (Auto-Syncs!)

```bash
# Plan increment
/sw:increment "User authentication with OAuth"

# Result: Auto-creates JIRA Epic!
# 🔗 JIRA Epic BACKEND-45 created
# 🔗 https://company.atlassian.net/browse/BACKEND-45
```

**THAT'S IT!** Every task completion now auto-updates JIRA.

---

## 🏢 Enterprise JIRA Patterns

### Pattern 1: Project-per-Team (Most Common)

**Scenario**: Each team has its own JIRA project:

```
Organization Structure:
├── Frontend Team → JIRA Project: FRONTEND
├── Backend Team → JIRA Project: BACKEND
├── Mobile Team → JIRA Project: MOBILE
├── QA Team → JIRA Project: QA
└── DevOps Team → JIRA Project: DEVOPS
```

**SpecWeave Configuration**:

```json
// .specweave/config.json
{
  "sync": {
    "profiles": {
      "jira-main": {
        "provider": "jira",
        "displayName": "JIRA Cloud",
        "config": {
          "domain": "company.atlassian.net",
          "email": "you@company.com",
          "strategy": "project-per-team",
          "projects": ["FRONTEND", "BACKEND", "MOBILE", "QA", "DEVOPS"]
        }
      }
    }
  }
}
```

**Folder Mapping**:

```
.specweave/docs/specs/
├── FRONTEND/
│   ├── spec-001-dashboard-redesign.md
│   └── spec-002-component-library.md
├── BACKEND/
│   ├── spec-001-api-gateway.md
│   └── spec-002-auth-service.md
├── MOBILE/
│   ├── spec-001-ios-app.md
│   └── spec-002-android-app.md
├── QA/
│   └── spec-001-automation-framework.md
└── DEVOPS/
    └── spec-001-ci-cd-pipeline.md
```

**JIRA Mapping**:

```
SpecWeave Increment → JIRA Epic
User Stories → JIRA Stories (nested under Epic)
Tasks → JIRA Sub-tasks (nested under Stories)
```

**Benefits**:
- ✅ Clear team ownership
- ✅ Separate workflows per team
- ✅ Independent permissions
- ✅ Team-specific dashboards

---

### Pattern 2: Component-Based (Shared Project)

**Scenario**: Single JIRA project with components for teams:

```
JIRA Project: PLATFORM
├── Component: Frontend (owned by Frontend Team)
├── Component: Backend (owned by Backend Team)
├── Component: Mobile (owned by Mobile Team)
├── Component: QA (owned by QA Team)
└── Component: DevOps (owned by DevOps Team)
```

**SpecWeave Configuration**:

```json
{
  "sync": {
    "profiles": {
      "jira-platform": {
        "provider": "jira",
        "displayName": "JIRA Platform Project",
        "config": {
          "domain": "company.atlassian.net",
          "email": "you@company.com",
          "strategy": "component-based",
          "project": "PLATFORM",
          "components": ["Frontend", "Backend", "Mobile", "QA", "DevOps"]
        }
      }
    }
  }
}
```

**JIRA Issue Format**:

```
PLATFORM-123: User Authentication (Epic)
  Component: Backend
  Labels: backend, auth, security

PLATFORM-124: Implement OAuth flow (Story)
  Component: Backend
  Parent: PLATFORM-123

PLATFORM-125: Write OAuth tests (Sub-task)
  Component: Backend
  Parent: PLATFORM-124
```

**Benefits**:
- ✅ Unified project view
- ✅ Easier cross-team coordination
- ✅ Shared workflows
- ✅ Centralized reporting

---

### Pattern 3: Board-Based (Advanced Filtering)

**Scenario**: Single project with filtered boards:

```
JIRA Project: PRODUCT
├── Board: Frontend Sprint Board (ID: 123)
│   Filter: component = Frontend AND sprint = currentSprint()
├── Board: Backend Kanban Board (ID: 456)
│   Filter: component = Backend AND statusCategory != Done
├── Board: Mobile Epic Board (ID: 789)
│   Filter: type = Epic AND component = Mobile
└── Board: QA Bug Board (ID: 101)
    Filter: type = Bug AND component = QA
```

**SpecWeave Configuration**:

```json
{
  "sync": {
    "profiles": {
      "jira-product": {
        "provider": "jira",
        "displayName": "JIRA Product Boards",
        "config": {
          "domain": "company.atlassian.net",
          "email": "you@company.com",
          "strategy": "board-based",
          "project": "PRODUCT",
          "boards": {
            "frontend": 123,
            "backend": 456,
            "mobile": 789,
            "qa": 101
          }
        }
      }
    }
  }
}
```

**Benefits**:
- ✅ Advanced JQL filtering
- ✅ Dynamic team membership
- ✅ Custom board views per team
- ✅ Sprint planning optimized

---

## 🔄 Increment ↔ JIRA Sync Mapping

### SpecWeave → JIRA Hierarchy

```
SpecWeave                JIRA
━━━━━━━━━━━━━━━━━━━━━━━  ━━━━━━━━━━━━━━━━━━━━━━━
Increment                Epic
├── User Story 1     →  ├── Story (PROJ-101)
│   ├── AC-US1-01        │   ├── Acceptance Criteria
│   ├── AC-US1-02        │   └── (in description)
│   └── AC-US1-03        │
├── User Story 2     →  ├── Story (PROJ-102)
│   ├── AC-US2-01        │   └── Acceptance Criteria
│   └── AC-US2-02        │
└── Tasks                └── Sub-tasks
    ├── T-001        →      ├── Sub-task (PROJ-103)
    ├── T-002        →      ├── Sub-task (PROJ-104)
    └── T-003        →      └── Sub-task (PROJ-105)
```

### JIRA Issue Fields (Auto-Populated)

**Epic** (from Increment):
```
Summary: [INC-0018] User Authentication with OAuth
Description: [spec.md Quick Overview section]
Epic Name: User Authentication
Epic Link: [self]
Labels: specweave, increment, backend, auth
Priority: High (from spec frontmatter)
Status: Planning → In Progress → Done
Custom Fields:
  - SpecWeave Increment: 0018-user-authentication
  - SpecWeave Profile: jira-backend
  - Total Stories: 5
  - Total Tasks: 12
  - Completion: 67% (8/12 tasks)
```

**Story** (from User Story):
```
Summary: US-001: User can log in with Google OAuth
Description: [User story content + acceptance criteria]
Parent: BACKEND-45 (Epic)
Labels: user-story, auth, oauth
Priority: High
Story Points: 8 (from spec)
Acceptance Criteria: [checklist format]
  ☑ AC-US1-01: User sees Google login button
  ☑ AC-US1-02: User redirected to Google consent screen
  ☐ AC-US1-03: User logged in after OAuth callback
Status: In Progress
```

**Sub-task** (from Task):
```
Summary: T-001: Implement OAuth client configuration
Description: [Task details from tasks.md]
Parent: BACKEND-46 (Story)
Labels: task, implementation
Estimate: 4 hours
Status: Done
Resolution: Done
```

---

## 📊 Sprint Planning Integration

### Sprint Creation Workflow

```bash
# 1. Create sprint in JIRA (via JIRA UI)
Sprint 24: Nov 13 - Nov 27 (2 weeks)

# 2. Plan increments for sprint
/sw:increment "OAuth integration"
/sw:increment "User profile page"
/sw:increment "Email notifications"

# 3. Link to sprint (automatic or manual)
/sw-jira:link-sprint 0018 --sprint 24
/sw-jira:link-sprint 0019 --sprint 24
/sw-jira:link-sprint 0020 --sprint 24

# 4. Start sprint work
/sw:do

# 5. Daily standups: Check JIRA board
# All task updates appear automatically!

# 6. Sprint review: Show JIRA board
# Stakeholders see completed stories without asking devs

# 7. Sprint retrospective: Export metrics
/sw:metrics --sprint 24

# Output:
📊 Sprint 24 Metrics
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Increments Planned: 3
Increments Completed: 2 (67%)
Increments Rolled Over: 1 (to Sprint 25)

Story Points Planned: 34
Story Points Completed: 26 (76%)
Velocity: 26 (target: 30)

Tasks Planned: 28
Tasks Completed: 24 (86%)

Bugs Found: 5
Bugs Fixed: 4 (80%)

Team Capacity: 80 hours
Time Spent: 76 hours (95% utilization)

Recommendations:
  ⚠ Velocity below target (26 vs 30)
  ✓ Team utilization healthy (95%)
  ⚠ 1 increment rolled over (plan buffer next sprint)
```

---

## 🔄 Git-Style Sync Commands (Recommended)

### Quick Reference

SpecWeave provides intuitive **git-style commands** for JIRA synchronization:

| Command | Purpose |
|---------|---------|
| `/sw-jira:pull` | Pull changes from JIRA (like `git pull`) |
| `/sw-jira:push` | Push progress to JIRA (like `git push`) |
| `/sw-jira:sync` | Two-way sync (pull + push) |

### Basic Usage

```bash
# Pull latest changes from JIRA
/sw-jira:pull

# Push your progress to JIRA
/sw-jira:push

# Two-way sync (both directions)
/sw-jira:sync 0018
```

### Multi-Project Sync

```bash
# Pull ALL specs across ALL projects (living docs sync)
/sw-jira:pull --all

# Pull specific project only
/sw-jira:pull --project BACKEND

# Pull specific feature/epic hierarchy
/sw-jira:pull --feature FS-042

# Push all local changes to JIRA
/sw-jira:push --all
```

### Sync Brief Output

After every sync operation, you'll see a compact summary:

```
┌─────────────────────────────────────────────────────────┐
│  PULL COMPLETE                                   ✓ JIRA │
├─────────────────────────────────────────────────────────┤
│  Scanned: 52 specs across 4 projects                    │
│  Updated: 8 specs                                       │
│  Conflicts: 1 (resolved: external wins)                 │
├─────────────────────────────────────────────────────────┤
│  CHANGES APPLIED                                        │
│    ↓ Status changes:    5                               │
│    ↓ Priority changes:  2                               │
│    ↓ Sprint updates:    3                               │
│    + Comments imported: 6                               │
└─────────────────────────────────────────────────────────┘
```

**Symbols**: `↓` = pulled (incoming), `↑` = pushed (outgoing), `✓` = success

---

## 🔄 Bidirectional Sync Examples

### Example 1: Local Change → JIRA

```bash
# Developer completes task locally
/sw:do
# (completes T-003: Write OAuth tests)

# SpecWeave auto-syncs to JIRA:
# 1. Finds JIRA sub-task BACKEND-48
# 2. Transitions status: To Do → Done
# 3. Adds comment:
#    "✅ Task completed in SpecWeave
#     Completed by: john.doe@company.com
#     Completed at: 2025-11-13 14:30:00 UTC
#     Time spent: 3.5 hours"
# 4. Updates Epic progress: 75% → 83%
```

### Example 2: JIRA Change → Local

```bash
# PM updates story in JIRA:
# - Changes priority: Medium → High
# - Adds comment: "Legal review required before deployment"
# - Moves to "Blocked" status

# SpecWeave detects change (via webhook or polling):
# 1. Updates spec.md frontmatter:
#    priority: "P2" → "P1"
# 2. Adds note to tasks.md:
#    "⚠️ BLOCKED: Legal review required before deployment"
#    "Updated by: jane.smith@company.com (JIRA)"
# 3. Creates git commit:
#    "sync: Update priority and status from JIRA BACKEND-45"
```

---

## 🏭 Multi-Environment JIRA Setup

### Scenario: 3 JIRA Instances

```
Development JIRA: dev-jira.company.net
  - DEVPROJ project
  - Development teams only
  - 2-day sprints

Staging JIRA: staging-jira.company.net
  - STGPROJ project
  - QA + Product teams
  - Weekly releases

Production JIRA: jira.company.com
  - PROD project
  - All stakeholders
  - Monthly releases
```

**SpecWeave Configuration**:

```json
{
  "sync": {
    "profiles": {
      "jira-dev": {
        "provider": "jira",
        "displayName": "Development JIRA",
        "config": {
          "domain": "dev-jira.company.net",
          "email": "dev@company.com",
          "project": "DEVPROJ"
        }
      },
      "jira-staging": {
        "provider": "jira",
        "displayName": "Staging JIRA",
        "config": {
          "domain": "staging-jira.company.net",
          "email": "qa@company.com",
          "project": "STGPROJ"
        }
      },
      "jira-prod": {
        "provider": "jira",
        "displayName": "Production JIRA",
        "config": {
          "domain": "jira.company.com",
          "email": "pm@company.com",
          "project": "PROD"
        }
      }
    }
  }
}
```

**Promotion Workflow**:

```bash
# 1. Pull latest from dev JIRA (git-style)
/sw-jira:pull --profile jira-dev

# 2. Push progress to dev JIRA
/sw-jira:push 0018 --profile jira-dev

# 3. Test in dev, then promote to staging
/sw-jira:promote 0018 --from jira-dev --to jira-staging

# 4. QA approval, then promote to prod
/sw-jira:promote 0018 --from jira-staging --to jira-prod

# Result: Same increment tracked across all 3 JIRA instances!
```

---

## 🔒 Security & Compliance

### API Token Best Practices

**DO** ✅:
- Create separate API tokens per environment (dev/staging/prod)
- Use service accounts (jira-service@company.com) instead of personal accounts
- Store tokens in `.env` (gitignored)
- Rotate tokens every 90 days
- Revoke tokens when team members leave
- Use JIRA's IP allowlist feature

**DON'T** ❌:
- Share API tokens via Slack/email
- Commit tokens to git
- Use personal account tokens for automation
- Reuse tokens across projects
- Use tokens without expiration

### Audit Trails

**SpecWeave provides full audit trails**:

```bash
/sw:audit 0018 --jira

# Output:
📊 JIRA Sync Audit Trail: Increment 0018
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

JIRA Epic: BACKEND-45
JIRA URL: https://company.atlassian.net/browse/BACKEND-45
Created: 2025-11-01 09:00:00 UTC (by john.doe@company.com)

Sync Events (23 total):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2025-11-01 09:00:00 UTC [CREATE]
  Epic BACKEND-45 created from increment 0018
  User: john.doe@company.com (SpecWeave)

2025-11-01 09:15:00 UTC [UPDATE]
  5 stories created under epic (BACKEND-46 to BACKEND-50)
  User: john.doe@company.com (SpecWeave)

2025-11-02 14:30:00 UTC [UPDATE]
  Story BACKEND-46 status: To Do → In Progress
  User: john.doe@company.com (SpecWeave)

2025-11-02 16:45:00 UTC [COMMENT]
  "✅ Task T-001 completed"
  User: john.doe@company.com (SpecWeave)

2025-11-03 10:00:00 UTC [UPDATE]
  Priority changed: Medium → High
  User: jane.smith@company.com (JIRA UI)
  ⚠️ Synced to local spec.md

2025-11-03 10:15:00 UTC [COMMENT]
  "Legal review required before deployment"
  User: jane.smith@company.com (JIRA UI)
  ⚠️ Synced to local tasks.md

... (17 more events)

2025-11-08 16:30:00 UTC [RESOLVE]
  Epic BACKEND-45 resolved: Done
  User: john.doe@company.com (SpecWeave)
  Resolution: Completed, deployed to production

Summary:
  Total sync events: 23
  Local → JIRA: 18 events
  JIRA → Local: 5 events
  Conflicts resolved: 0
  Last synced: 2025-11-08 16:30:00 UTC
```

---

## 📊 JIRA Custom Fields

### SpecWeave Fields (Recommended)

Create these custom fields in JIRA for better tracking:

```
1. SpecWeave Increment (Text Field, Single Line)
   - Stores increment ID (e.g., "0018-user-authentication")
   - Searchable via JQL: cf[10001] = "0018-user-authentication"

2. SpecWeave Profile (Text Field, Single Line)
   - Stores sync profile (e.g., "jira-backend")
   - Useful for multi-profile setups

3. SpecWeave Completion (Number Field)
   - Stores completion percentage (0-100)
   - Auto-updated on task completion

4. SpecWeave Last Synced (Date Time Picker)
   - Stores last sync timestamp
   - Useful for troubleshooting sync issues

5. SpecWeave Spec URL (URL Field)
   - Links to spec.md in GitHub/GitLab
   - Quick access to technical details
```

**JQL Queries**:

```sql
-- Find all SpecWeave increments in current sprint
project = BACKEND AND sprint = 24 AND "SpecWeave Increment" is not EMPTY

-- Find incomplete increments
"SpecWeave Completion" < 100 AND status != Done

-- Find stale increments (not synced in 7 days)
"SpecWeave Last Synced" < -7d

-- Find increments by profile
"SpecWeave Profile" = "jira-backend"
```

---

## 🚨 Troubleshooting

### Issue: "Authentication failed"

**Cause**: Invalid API token or email.

**Fix**:
```bash
# Test authentication
curl -u you@company.com:YOUR_API_TOKEN \
  https://company.atlassian.net/rest/api/3/myself

# Should return user info
# If 401 error → regenerate token
```

---

### Issue: "Project not found"

**Cause**: Project key doesn't exist or no permissions.

**Fix**:
```bash
# List accessible projects
curl -u you@company.com:YOUR_API_TOKEN \
  https://company.atlassian.net/rest/api/3/project

# Verify project key (case-sensitive!)
# BACKEND ✓
# backend ✗
```

---

### Issue: "Rate limit exceeded"

**Cause**: Too many API calls.

**Limits**:
- JIRA Cloud: 100 requests/minute per user
- JIRA Data Center: Configurable (default: 200/minute)

**Fix**:
```bash
# Use time range filtering (git-style)
/sw-jira:pull --time-range 1M
/sw-jira:sync 0020 --time-range 1M

# Or enable rate limiting in config
{
  "sync": {
    "profiles": {
      "jira-main": {
        "rateLimits": {
          "maxRequestsPerMinute": 80,  // 80% of JIRA limit
          "retryAfter": 60             // Wait 60s if hit
        }
      }
    }
  }
}
```

---

### Issue: "Webhook not triggering"

**Cause**: Webhook URL not configured or firewall blocking.

**Fix**:
```bash
# 1. Register webhook in JIRA
# https://company.atlassian.net/plugins/servlet/webhooks

# 2. Configure webhook URL
Webhook URL: https://your-server.com/api/specweave/webhook/jira
Events: Issue Created, Issue Updated, Issue Deleted

# 3. Test webhook
curl -X POST https://your-server.com/api/specweave/webhook/jira \
  -H "Content-Type: application/json" \
  -d '{"webhookEvent": "jira:issue_updated"}'

# Should return 200 OK

# 4. Check firewall rules (if self-hosted)
# Allow JIRA IPs: https://support.atlassian.com/organization-administration/docs/ip-addresses-and-domains-for-atlassian-cloud-products/
```

---

## 📚 Related Guides

- [GitHub Migration Guide](./github-migration.md)
- [Azure DevOps Migration Guide](./azure-devops-migration.md)
- [Multi-Environment Deployment Strategy](./multi-environment-deployment.md)
- [Release Management Guide](./release-management.md)
- [Sprint Planning with SpecWeave](./sprint-planning.md)

---

## 🆘 Getting Help

- **Documentation**: https://spec-weave.com
- **GitHub Issues**: https://github.com/anton-abyzov/specweave/issues
- **Discussions**: https://github.com/anton-abyzov/specweave/discussions
- **JIRA-specific help**: https://community.atlassian.com
- **Enterprise Support**: enterprise@spec-weave.com
