---
id: azure-devops-migration
title: Azure DevOps Enterprise Migration Guide
sidebar_label: Azure DevOps Migration
sidebar_position: 3
---

# Azure DevOps Enterprise Migration Guide

:::tip Enterprise Focus
This guide explains how SpecWeave integrates with **Azure DevOps** (formerly VSTS) for enterprise teams managing work items, boards, repos, pipelines, and test plans in Microsoft-centric organizations.
:::

---

## 🎯 Why Azure DevOps Integration Matters for Enterprises

### The Microsoft Enterprise Reality

Azure DevOps (ADO) is the **dominant ALM tool** in Microsoft shops:

- **Fortune 500 adoption**: 70%+ of enterprise Windows shops use ADO
- **End-to-End ALM**: Work items + Repos + Pipelines + Test Plans + Artifacts
- **Enterprise Features**: Azure AD integration, compliance, audit logs, RBAC
- **Hybrid Support**: Cloud (azure.com) + On-Prem (Azure DevOps Server)

**The Enterprise Challenge**:
- ❌ ADO becomes the **only** source of truth (vendor lock-in)
- ❌ Developers hate rich-text editors for technical specs
- ❌ No version control for work item descriptions
- ❌ Hard to maintain technical depth in work items
- ❌ Difficult to migrate away from ADO

**SpecWeave Solution**:
- ✅ `.specweave/` = **Technical source of truth** (Markdown, Git, portable)
- ✅ ADO = **Business visibility + ALM workflows** (work tracking, pipelines, testing)
- ✅ **Bidirectional sync** keeps both in sync automatically
- ✅ **No vendor lock-in**: Migrate to GitHub/GitLab without losing specs

---

## 🏗️ Architecture: Local-First, ADO as ALM Layer

### Source of Truth Pattern

```
✅ CORRECT Architecture:
.specweave/docs/specs/ (LOCAL - Technical Truth)
    ↓ Bidirectional Sync
ADO Work Items (MIRROR - Business + ALM)

❌ WRONG (ADO as Source of Truth):
ADO Work Items (External)
    ↓ One-way sync
.specweave/ (Local - Backup copy)
```

**Why This Matters**:

| Aspect | `.specweave/` (Local) | ADO (External) |
|--------|----------------------|----------------|
| **Audience** | Developers, Architects | PMs, Stakeholders, QA, Executives |
| **Detail Level** | Technical (code, APIs, tests) | Business (features, bugs, tasks) |
| **Version Control** | ✅ Git (full history) | ❌ Limited work item history |
| **Offline Access** | ✅ Always available | ❌ Requires VPN/internet |
| **Search** | ✅ Fast (grep, IDE search) | ❌ Slow (WIQL queries) |
| **Format** | Markdown (LLM-friendly) | HTML (LLM-hostile) |
| **Portability** | ✅ Portable (migrate to GitLab) | ❌ Locked to ADO |

**Result**: Developers work in `.specweave/`, stakeholders track in ADO, both stay in sync!

---

## 🚀 Quick Start: Azure DevOps Integration

### Step 1: Generate Personal Access Token (PAT)

1. Go to: https://dev.azure.com/`{organization}`/_usersSettings/tokens
2. Click "New Token"
3. Name: "SpecWeave - `{project-name}`"
4. Organization: `{your-org}`
5. Scopes:
   - ☑ Work Items (Read, Write, Delete)
   - ☑ Code (Read) - for repo info
   - ☑ Build (Read) - for pipeline status
6. Expiration: 90 days (recommended)
7. Copy token (52-character base64 string)

### Step 2: Initialize SpecWeave with Azure DevOps

```bash
# Initialize SpecWeave (interactive)
specweave init

# During setup, select:
? Select issue tracker: Azure DevOps
? ADO instance: Azure DevOps Services (cloud) or Azure DevOps Server (on-prem)
? Organization: myorg
? Project: MyProject
? Teams (comma-separated): Frontend,Backend,Mobile,QA
```

**Result**: Creates `.env` with ADO PAT and `.specweave/config.json` with sync profile.

### Step 3: Verify Connection

```bash
# Test ADO connection
specweave validate-ado

# Expected output:
# ✓ Azure DevOps API connection successful
# ✓ Organization: myorg
# ✓ Project: MyProject
# ✓ Teams found: Frontend, Backend, Mobile, QA
# ✓ User permissions: Create, Edit, Delete work items
```

### Step 4: Create First Increment (Auto-Syncs!)

```bash
# Plan increment
/specweave:increment "User authentication with Azure AD B2C"

# Result: Auto-creates ADO Feature!
# 🔗 ADO Feature #1234 created
# 🔗 https://dev.azure.com/myorg/MyProject/_workitems/edit/1234
```

**THAT'S IT!** Every task completion now auto-updates ADO.

---

## 🏢 Azure DevOps Hierarchy & Mapping

### ADO Work Item Types

```
Portfolio Level:
├── Epic (strategic initiative, 6-12 months)
└── Feature (deliverable capability, 1-3 months)

Requirement Level:
├── User Story (user-facing requirement)
├── Bug (defect to fix)
└── Issue (non-development work)

Implementation Level:
└── Task (development work unit)
```

### SpecWeave → ADO Mapping

```
SpecWeave                    Azure DevOps
━━━━━━━━━━━━━━━━━━━━━━━━━━━  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Increment (Feature)      →  Feature (#1234)
├── User Story 1         →  ├── User Story (#1235)
│   ├── AC-US1-01        │   │   ├── Acceptance Criteria
│   ├── AC-US1-02        │   │   │   (in Description)
│   └── AC-US1-03        │   │   └── (in Acceptance Criteria field)
├── User Story 2         →  ├── User Story (#1236)
│   ├── AC-US2-01        │   │   └── Acceptance Criteria
│   └── AC-US2-02        │   │
└── Tasks                →  └── Tasks
    ├── T-001            →      ├── Task (#1237)
    ├── T-002            →      ├── Task (#1238)
    └── T-003            →      └── Task (#1239)
```

**Key Differences from GitHub/JIRA**:
- ✅ ADO has native **hierarchy** (Feature → User Story → Task)
- ✅ ADO has **Portfolio Backlog** (Epic → Feature → User Story)
- ✅ ADO has **built-in test plans** (linked to user stories)
- ✅ ADO has **custom work item types** (you can create your own)

---

## 🏭 Enterprise ADO Patterns

### Pattern 1: Team-Based Organization (Recommended)

**Scenario**: One project, multiple teams (ADO's native model):

```
Organization: Contoso
└── Project: ContosoApp
    ├── Team: Frontend Team
    ├── Team: Backend Team
    ├── Team: Mobile Team
    ├── Team: QA Team
    └── Team: DevOps Team
```

**SpecWeave Configuration**:

```json
// .specweave/config.json
{
  "sync": {
    "profiles": {
      "ado-main": {
        "provider": "ado",
        "displayName": "Azure DevOps - ContosoApp",
        "config": {
          "organization": "contoso",
          "project": "ContosoApp",
          "teams": [
            "Frontend Team",
            "Backend Team",
            "Mobile Team",
            "QA Team",
            "DevOps Team"
          ]
        }
      }
    }
  }
}
```

**Folder Mapping**:

```
.specweave/docs/specs/
├── Frontend-Team/
│   ├── spec-001-dashboard-redesign.md
│   └── spec-002-component-library.md
├── Backend-Team/
│   ├── spec-001-api-gateway.md
│   └── spec-002-auth-service.md
├── Mobile-Team/
│   ├── spec-001-ios-app.md
│   └── spec-002-android-app.md
├── QA-Team/
│   └── spec-001-automation-framework.md
└── DevOps-Team/
    └── spec-001-ci-cd-pipeline.md
```

**ADO Area Paths** (Auto-Created):

```
ContosoApp
├── Frontend Team (Area Path)
├── Backend Team (Area Path)
├── Mobile Team (Area Path)
├── QA Team (Area Path)
└── DevOps Team (Area Path)
```

**Benefits**:
- ✅ Native ADO team model (no hacks)
- ✅ Team dashboards out-of-the-box
- ✅ Velocity tracking per team
- ✅ Sprint planning per team

---

### Pattern 2: Area Path Hierarchy (Large Orgs)

**Scenario**: Complex org structure with sub-teams:

```
Organization: GlobalCorp
└── Project: ERPSystem
    ├── Area: Core Platform
    │   ├── Subarea: API Gateway (Team: API Team)
    │   └── Subarea: Database (Team: Data Team)
    ├── Area: Frontend
    │   ├── Subarea: Web UI (Team: Web Team)
    │   └── Subarea: Mobile UI (Team: Mobile Team)
    └── Area: Integrations
        ├── Subarea: SAP (Team: SAP Team)
        └── Subarea: Salesforce (Team: CRM Team)
```

**SpecWeave Configuration**:

```json
{
  "sync": {
    "profiles": {
      "ado-erp": {
        "provider": "ado",
        "displayName": "ERP System",
        "config": {
          "organization": "globalcorp",
          "project": "ERPSystem",
          "areaPathStrategy": "hierarchical",
          "areaPaths": {
            "Core Platform": {
              "API Gateway": "API Team",
              "Database": "Data Team"
            },
            "Frontend": {
              "Web UI": "Web Team",
              "Mobile UI": "Mobile Team"
            },
            "Integrations": {
              "SAP": "SAP Team",
              "Salesforce": "CRM Team"
            }
          }
        }
      }
    }
  }
}
```

**Work Item Assignment**:

```
Feature #1234: Implement OAuth
  Area Path: ERPSystem\Core Platform\API Gateway
  Assigned To: API Team
  Iteration: Sprint 24
```

---

### Pattern 3: Multi-Project Setup (Separate Projects)

**Scenario**: Multiple ADO projects (rare, but happens):

```
Organization: MegaCorp
├── Project: InternalPortal (for employees)
├── Project: CustomerApp (for customers)
└── Project: PartnerAPI (for partners)
```

**SpecWeave Configuration**:

```json
{
  "sync": {
    "profiles": {
      "ado-internal": {
        "provider": "ado",
        "config": {
          "organization": "megacorp",
          "project": "InternalPortal",
          "teams": ["Web Team", "API Team"]
        }
      },
      "ado-customer": {
        "provider": "ado",
        "config": {
          "organization": "megacorp",
          "project": "CustomerApp",
          "teams": ["Mobile Team", "Backend Team"]
        }
      },
      "ado-partner": {
        "provider": "ado",
        "config": {
          "organization": "megacorp",
          "project": "PartnerAPI",
          "teams": ["Integration Team"]
        }
      }
    }
  }
}
```

**Usage**:

```bash
# Sync to specific project
/specweave-ado:sync 0018 --profile ado-internal
/specweave-ado:sync 0019 --profile ado-customer
/specweave-ado:sync 0020 --profile ado-partner
```

---

## 🔄 Sprint Planning with Azure DevOps

### Sprint Creation Workflow

```bash
# 1. Create sprint in ADO (via ADO UI or CLI)
az boards iteration project create \
  --org https://dev.azure.com/contoso \
  --project ContosoApp \
  --name "Sprint 24" \
  --path "\\ContosoApp\\Iteration" \
  --start-date "2025-11-13" \
  --finish-date "2025-11-27"

# 2. Plan increments for sprint
/specweave:increment "OAuth integration"
/specweave:increment "User profile page"

# 3. Link to sprint (automatic)
# SpecWeave detects active sprint and assigns work items

# 4. Start sprint work
/specweave:do

# 5. Daily standups: Check ADO board
# All task updates appear automatically!

# 6. Sprint burndown (ADO auto-generates)
# https://dev.azure.com/contoso/ContosoApp/_sprints/taskboard/Backend%20Team/Sprint%2024

# 7. Sprint review: Show ADO dashboard
# Velocity chart, burndown, work item status

# 8. Sprint retrospective: Export metrics
/specweave:metrics --sprint 24 --ado

# Output:
📊 Sprint 24 Metrics (Azure DevOps)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Team: Backend Team
Sprint: Sprint 24 (Nov 13 - Nov 27, 2025)

Features Planned: 2
Features Completed: 2 (100%)

User Stories Planned: 8
User Stories Completed: 7 (88%)
Stories Rolled Over: 1 (to Sprint 25)

Tasks Planned: 34
Tasks Completed: 30 (88%)

Story Points Planned: 42
Story Points Completed: 38 (90%)
Velocity: 38 (target: 40)

Bugs Filed: 6
Bugs Fixed: 5 (83%)

Team Capacity: 80 hours
Actual Effort: 78 hours (98% utilization)

Pipeline Runs: 45
Pipeline Success Rate: 93% (42/45)

Test Plans Executed: 3
Test Suites Passed: 89% (278/312 tests)

ADO Links:
  Sprint Backlog: https://dev.azure.com/contoso/ContosoApp/_sprints/backlog/Backend%20Team/Sprint%2024
  Burndown Chart: https://dev.azure.com/contoso/ContosoApp/_sprints/taskboard/Backend%20Team/Sprint%2024
  Velocity Chart: https://dev.azure.com/contoso/ContosoApp/_dashboards/dashboard/...

Recommendations:
  ✓ Velocity on target (38 vs 40)
  ✓ Team utilization healthy (98%)
  ⚠ 1 story rolled over (plan buffer next sprint)
  ✓ Pipeline success rate excellent (93%)
```

---

## 🏭 Multi-Environment ADO Setup

### Scenario: Dev → QA → UAT → Prod Environments

```
Azure DevOps Organization: Contoso
├── Project: ContosoApp-Dev (development)
├── Project: ContosoApp-QA (testing)
├── Project: ContosoApp-UAT (user acceptance)
└── Project: ContosoApp-Prod (production)
```

**SpecWeave Configuration**:

```json
{
  "sync": {
    "profiles": {
      "ado-dev": {
        "provider": "ado",
        "displayName": "Development",
        "config": {
          "organization": "contoso",
          "project": "ContosoApp-Dev"
        }
      },
      "ado-qa": {
        "provider": "ado",
        "displayName": "QA Environment",
        "config": {
          "organization": "contoso",
          "project": "ContosoApp-QA"
        }
      },
      "ado-uat": {
        "provider": "ado",
        "displayName": "UAT Environment",
        "config": {
          "organization": "contoso",
          "project": "ContosoApp-UAT"
        }
      },
      "ado-prod": {
        "provider": "ado",
        "displayName": "Production",
        "config": {
          "organization": "contoso",
          "project": "ContosoApp-Prod"
        }
      }
    }
  }
}
```

**Promotion Workflow**:

```bash
# 1. Create in dev ADO
/specweave-ado:sync 0018 --profile ado-dev

# 2. Dev complete → Promote to QA
/specweave-ado:promote 0018 --from ado-dev --to ado-qa

# 3. QA approved → Promote to UAT
/specweave-ado:promote 0018 --from ado-qa --to ado-uat

# 4. UAT approved → Promote to prod
/specweave-ado:promote 0018 --from ado-uat --to ado-prod

# Result: Same increment tracked across all 4 environments!
```

**ADO Work Item States** (per environment):

```
Dev Project:
  Feature #1234: Implement OAuth
    State: Done → Closed
    Deployed to: Dev (https://dev.contoso.com)

QA Project:
  Feature #5678: Implement OAuth
    State: New → Active (testing)
    Deployed to: QA (https://qa.contoso.com)

UAT Project:
  Feature #9012: Implement OAuth
    State: New (awaiting UAT approval)
    Deployed to: UAT (https://uat.contoso.com)

Prod Project:
  Feature #3456: Implement OAuth
    State: New (awaiting prod deployment)
    Deployed to: Prod (https://contoso.com)
```

---

## 🔗 Azure Pipeline Integration

### Workflow: Auto-Sync on Deployment

```yaml
# azure-pipelines.yml
trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

stages:
  - stage: Build
    jobs:
      - job: BuildJob
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '18.x'

          - script: npm install
            displayName: 'Install dependencies'

          - script: npm run build
            displayName: 'Build application'

  - stage: Test
    jobs:
      - job: TestJob
        steps:
          - script: npm test
            displayName: 'Run tests'

  - stage: Deploy
    jobs:
      - job: DeployJob
        steps:
          - task: Bash@3
            displayName: 'Install SpecWeave'
            inputs:
              targetType: 'inline'
              script: npm install -g specweave

          - task: Bash@3
            displayName: 'Sync SpecWeave to ADO'
            env:
              AZURE_DEVOPS_PAT: $(AZURE_DEVOPS_PAT)
            inputs:
              targetType: 'inline'
              script: |
                # Find active increment
                ACTIVE_INCREMENT=$(specweave status --active --json | jq -r '.id')

                # Sync to ADO
                specweave sync ado $ACTIVE_INCREMENT

                # Mark as deployed
                specweave done $ACTIVE_INCREMENT --deployed

          - task: AzureWebApp@1
            displayName: 'Deploy to Azure App Service'
            inputs:
              azureSubscription: 'ContosoSubscription'
              appName: 'contoso-app'
              package: '$(System.DefaultWorkingDirectory)/**/*.zip'
```

**Result**: Every successful deployment auto-updates ADO work items!

---

## 📊 ADO Custom Fields for SpecWeave

### Recommended Custom Fields

```xml
<!-- Create these in ADO Process Template -->

1. SpecWeave Increment (Text Field, String)
   - Stores increment ID (e.g., "0018-user-authentication")
   - Searchable via WIQL
   - Required: No
   - Default: Empty

2. SpecWeave Profile (Text Field, String)
   - Stores sync profile (e.g., "ado-backend")
   - Required: No
   - Default: Empty

3. SpecWeave Completion (Integer Field)
   - Stores completion percentage (0-100)
   - Required: No
   - Default: 0
   - Auto-updated on task completion

4. SpecWeave Last Synced (Date Time Field)
   - Stores last sync timestamp
   - Required: No
   - Auto-updated on every sync

5. SpecWeave Spec URL (Hyperlink Field)
   - Links to spec.md in Azure Repos / GitHub
   - Required: No
   - Quick access to technical details
```

**WIQL Queries**:

```sql
-- Find all SpecWeave increments in current iteration
SELECT [System.Id], [System.Title], [Custom.SpecWeaveIncrement]
FROM WorkItems
WHERE [System.IterationPath] = @currentIteration
  AND [Custom.SpecWeaveIncrement] <> ''

-- Find incomplete increments
SELECT [System.Id], [System.Title], [Custom.SpecWeaveCompletion]
FROM WorkItems
WHERE [Custom.SpecWeaveCompletion] < 100
  AND [System.State] <> 'Done'

-- Find stale increments (not synced in 7 days)
SELECT [System.Id], [System.Title], [Custom.SpecWeaveLastSynced]
FROM WorkItems
WHERE [Custom.SpecWeaveLastSynced] < @today - 7

-- Find increments by profile
SELECT [System.Id], [System.Title], [Custom.SpecWeaveProfile]
FROM WorkItems
WHERE [Custom.SpecWeaveProfile] = 'ado-backend'
```

---

## 🔒 Security & Compliance

### Personal Access Token (PAT) Best Practices

**DO** ✅:
- Create separate PATs per environment (dev/qa/prod)
- Use service accounts (`ado-service@company.com`)
- Store PATs in Azure Key Vault (not `.env`)
- Set expiration to 90 days (maximum)
- Use minimal scopes (Work Items only)
- Rotate PATs before expiration
- Revoke PATs when team members leave

**DON'T** ❌:
- Share PATs via email/Slack
- Commit PATs to git
- Use personal account PATs for CI/CD
- Reuse PATs across projects
- Use PATs with `Full access` scope
- Store PATs in plain text

### Azure Key Vault Integration

```bash
# Store PAT in Azure Key Vault
az keyvault secret set \
  --vault-name contoso-keyvault \
  --name specweave-ado-pat \
  --value "YOUR_PAT_HERE"

# Use in Azure Pipeline
# azure-pipelines.yml
variables:
  - group: specweave-secrets  # Links to Key Vault

steps:
  - task: Bash@3
    env:
      AZURE_DEVOPS_PAT: $(specweave-ado-pat)  # From Key Vault
    inputs:
      script: specweave sync ado 0018
```

---

## 🚨 Troubleshooting

### Issue: "Authentication failed (401)"

**Cause**: Invalid or expired PAT.

**Fix**:
```bash
# Test PAT
curl -u :YOUR_PAT \
  https://dev.azure.com/contoso/_apis/projects?api-version=7.0

# Should return projects list
# If 401 → regenerate PAT
```

---

### Issue: "Project not found (404)"

**Cause**: Project name mismatch or no permissions.

**Fix**:
```bash
# List accessible projects
az devops project list \
  --org https://dev.azure.com/contoso

# Verify exact project name (case-sensitive!)
# ContosoApp ✓
# contosoapp ✗
```

---

### Issue: "Area path not found"

**Cause**: Area path doesn't exist or not configured.

**Fix**:
```bash
# List area paths
az boards area project list \
  --org https://dev.azure.com/contoso \
  --project ContosoApp

# Create missing area path
az boards area project create \
  --org https://dev.azure.com/contoso \
  --project ContosoApp \
  --name "Backend Team"
```

---

## 📚 Related Guides

- [GitHub Migration Guide](./github-migration.md)
- [JIRA Migration Guide](./jira-migration.md)
- [Multi-Environment Deployment Strategy](./multi-environment-deployment.md)
- [Release Management Guide](./release-management.md)
- [Azure Pipeline Integration](./cicd-integration.md)

---

## 🆘 Getting Help

- **Documentation**: https://spec-weave.com
- **GitHub Issues**: https://github.com/anton-abyzov/specweave/issues
- **Azure DevOps Docs**: https://docs.microsoft.com/azure/devops
- **Enterprise Support**: enterprise@spec-weave.com
