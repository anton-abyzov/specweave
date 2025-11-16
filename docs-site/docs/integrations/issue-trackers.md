---
sidebar_label: Issue Tracker Integration
sidebar_position: 1
---

# Issue Tracker Integration

SpecWeave integrates with Jira, GitHub Issues, and Azure DevOps to sync your increments with external project tracking tools.

**Key Feature**: **Strategy-based team mapping** adapts to your organization's structure, whether you use separate projects per team, monorepos, or complex multi-repo setups.

---

## Quick Start

```bash
# Initialize SpecWeave with issue tracker
specweave init

# Select your issue tracker:
# - Jira
# - GitHub
# - Azure DevOps
```

During initialization, you'll be prompted to choose a **team mapping strategy** that matches your organization's structure.

---

## GitHub Integration

GitHub supports **3 strategies** for organizing teams and repositories.

### Strategy 1: Repository-per-Team (Most Common)

**Use when**: Each team owns separate repositories (microservices, multi-repo architecture).

**Example**: Frontend team owns `frontend-app`, Backend team owns `backend-api`.

**Environment Variables**:
```bash
GH_TOKEN=ghp_your-token-here
GITHUB_STRATEGY=repository-per-team
GITHUB_OWNER=myorg
GITHUB_REPOS=frontend-app,backend-api,mobile-app,qa-tools
```

**Folder Structure**:
```
.specweave/docs/specs/
├── frontend-app/
├── backend-api/
├── mobile-app/
└── qa-tools/
```

**When to use**:
- ✅ Microservices architecture
- ✅ Each team has independent deployment cycles
- ✅ Clear team ownership boundaries
- ✅ Different tech stacks per team

---

### Strategy 2: Team-Based (Monorepo)

**Use when**: Single repository with teams working on different parts.

**Example**: Monorepo with frontend-team, backend-team, mobile-team.

**Environment Variables**:
```bash
GH_TOKEN=ghp_your-token-here
GITHUB_STRATEGY=team-based
GITHUB_OWNER=myorg
GITHUB_REPO=main-product
GITHUB_TEAMS=frontend-team,backend-team,mobile-team,qa-team
```

**Folder Structure**:
```
.specweave/docs/specs/
├── frontend-team/
├── backend-team/
├── mobile-team/
└── qa-team/
```

**When to use**:
- ✅ Monorepo architecture (Nx, Turborepo, Lerna)
- ✅ Shared codebase with team boundaries
- ✅ Coordinated releases across teams
- ✅ Common tech stack

---

### Strategy 3: Team-Multi-Repo (Complex)

**Use when**: Teams own multiple repositories (platform/infrastructure teams).

**Example**: Platform team owns `api-gateway` + `auth-service`, Frontend team owns `web-app` + `mobile-app`.

**Environment Variables**:
```bash
GH_TOKEN=ghp_your-token-here
GITHUB_STRATEGY=team-multi-repo
GITHUB_OWNER=myorg
GITHUB_TEAM_REPO_MAPPING='{"platform-team":["api-gateway","auth-service"],"frontend-team":["web-app","mobile-app"]}'
```

**Folder Structure**:
```
.specweave/docs/specs/
├── platform-team/
│   ├── api-gateway/
│   └── auth-service/
└── frontend-team/
    ├── web-app/
    └── mobile-app/
```

**When to use**:
- ✅ Platform/infrastructure teams
- ✅ Cross-cutting concerns
- ✅ Teams owning multiple related services
- ✅ Complex organizational structures

---

## Jira Integration

Jira supports **3 strategies** based on how teams are organized.

### Strategy 1: Project-per-Team

**Use when**: Each team has its own Jira project.

**Example**: `FRONTEND` project, `BACKEND` project, `MOBILE` project.

**Environment Variables**:
```bash
JIRA_API_TOKEN=your-token
JIRA_EMAIL=you@example.com
JIRA_DOMAIN=company.atlassian.net
JIRA_STRATEGY=project-per-team
JIRA_PROJECTS=FRONTEND,BACKEND,MOBILE,QA
```

**Folder Structure**:
```
.specweave/docs/specs/
├── FRONTEND/
├── BACKEND/
├── MOBILE/
└── QA/
```

**When to use**:
- ✅ Separate budgets per team
- ✅ Independent workflows per team
- ✅ Different permissions per team
- ✅ Clear team autonomy

---

### Strategy 2: Component-Based

**Use when**: Single Jira project with components representing teams.

**Example**: `MAIN` project with `Frontend`, `Backend`, `Mobile` components.

**Environment Variables**:
```bash
JIRA_API_TOKEN=your-token
JIRA_EMAIL=you@example.com
JIRA_DOMAIN=company.atlassian.net
JIRA_STRATEGY=component-based
JIRA_PROJECT=MAIN
JIRA_COMPONENTS=Frontend,Backend,Mobile,QA
```

**Folder Structure**:
```
.specweave/docs/specs/
├── Frontend/
├── Backend/
├── Mobile/
└── QA/
```

**When to use**:
- ✅ Shared project structure
- ✅ Unified reporting across teams
- ✅ Common workflows
- ✅ Easier cross-team collaboration

---

### Strategy 3: Board-Based

**Use when**: Single Jira project with board filters for teams.

**Example**: `MAIN` project with `Frontend Board` (ID: 123), `Backend Board` (ID: 456).

**Environment Variables**:
```bash
JIRA_API_TOKEN=your-token
JIRA_EMAIL=you@example.com
JIRA_DOMAIN=company.atlassian.net
JIRA_STRATEGY=board-based
JIRA_PROJECT=MAIN
JIRA_BOARDS=123,456,789,101
```

**Folder Structure** (derived from board names):
```
.specweave/docs/specs/
├── Frontend-Board/
├── Backend-Board/
├── Mobile-Board/
└── QA-Board/
```

**When to use**:
- ✅ Advanced JQL filtering
- ✅ Dynamic team membership
- ✅ Sprint-based workflows
- ✅ Customized board views per team

---

## Azure DevOps Integration

Azure DevOps uses a **fixed hierarchy**: Organization → Project (ONE) → Teams (multiple).

**Structure**:
```
Organization (e.g., "Contoso")
└── Project (e.g., "ProductLine-A") ← ONE project per organization
    ├── Team: Frontend
    ├── Team: Backend
    ├── Team: Mobile
    └── Team: QA
```

**Environment Variables**:
```bash
AZURE_DEVOPS_PAT=your-personal-access-token
AZURE_DEVOPS_ORG=your-org-name
AZURE_DEVOPS_PROJECT=your-project-name
AZURE_DEVOPS_TEAMS=Frontend,Backend,Mobile,QA
```

**Folder Structure**:
```
.specweave/docs/specs/
├── Frontend/
├── Backend/
├── Mobile/
└── QA/
```

**Key Differences**:
- ✅ **ONE project per organization** (not multiple projects)
- ✅ **Multiple teams within project** (comma-separated)
- ✅ Teams are **first-class entities** in Azure DevOps
- ✅ Direct 1:1 mapping between teams and folders

**Backward Compatibility**:
```bash
# Legacy single team (still supported):
AZURE_DEVOPS_TEAM=Frontend

# New multiple teams (recommended):
AZURE_DEVOPS_TEAMS=Frontend,Backend,Mobile
```

---

## Comparison Matrix

| Aspect | GitHub | Jira | Azure DevOps |
|--------|--------|------|--------------|
| **Strategies** | 3 (repo-per-team, team-based, team-multi-repo) | 3 (project-per-team, component-based, board-based) | 1 (teams within project) |
| **Primary Unit** | Repository | Project | Team |
| **Team Representation** | Repository, Team tag, or JSON mapping | Project, Component, or Board | Native team entity |
| **Flexibility** | High (3 strategies) | High (3 strategies) | Medium (fixed structure) |
| **Best For** | Microservices, Monorepos, Platform teams | Agile teams, Kanban boards, Sprint planning | Microsoft shops, Enterprise ALM |
| **Setup Complexity** | Medium | Medium | Low (straightforward) |

---

## Interactive Setup

SpecWeave provides **interactive prompts** during initialization:

```bash
specweave init

# GitHub Setup Example:
? Which GitHub instance are you using? GitHub.com (cloud)
? Select team mapping strategy:
  ❯ Repository-per-team (most common)
    Team-based (monorepo with team filtering)
    Team-multi-repo (complex team-to-repo mapping)
? GitHub organization/owner name: myorg
? Repository names (comma-separated): frontend-app,backend-api,mobile-app

# Jira Setup Example:
? Which Jira instance are you using? Jira Cloud
? Select team mapping strategy:
  ❯ Project-per-team (separate projects for each team)
    Component-based (one project, multiple components)
    Board-based (one project, filtered boards)
? Project keys (comma-separated): FRONTEND,BACKEND,MOBILE

# Azure DevOps Setup Example:
? Organization name: myorg
? Project name: MyProject
? Team name(s) (comma-separated): Frontend,Backend,Mobile,QA
```

---

## How to Choose a Strategy

### GitHub

| Scenario | Recommended Strategy |
|----------|---------------------|
| Microservices (each team owns services) | **Repository-per-team** |
| Monorepo (Nx, Turborepo, Lerna) | **Team-based** |
| Platform team owning infrastructure | **Team-multi-repo** |

### Jira

| Scenario | Recommended Strategy |
|----------|---------------------|
| Teams have separate budgets/workflows | **Project-per-team** |
| Unified project with shared workflows | **Component-based** |
| Advanced filtering with dynamic teams | **Board-based** |

### Azure DevOps

| Scenario | Approach |
|----------|----------|
| Any team structure | **Teams within project** (only option) |

---

## Folder Mapping

All strategies map to **`.specweave/docs/specs/`** folders for consistency:

```
.specweave/docs/specs/
├── {team-1}/     ← Maps to GitHub repo, Jira project/component, or ADO team
├── {team-2}/
├── {team-3}/
└── {team-n}/
```

**Naming Convention**: Kebab-case (lowercase with hyphens)

Examples:
- GitHub repo `Frontend-App` → folder `frontend-app/`
- Jira project `BACKEND` → folder `backend/`
- ADO team `Mobile Team` → folder `mobile-team/`

---

## Authentication

### GitHub Token

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token"
3. Scopes: ☑ `repo`, ☑ `read:org`, ☑ `workflow`
4. Copy token (starts with `ghp_`)

### Jira API Token

1. Go to: https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Label: "SpecWeave - [project-name]"
4. Copy token

### Azure DevOps PAT

1. Go to: https://dev.azure.com/
2. User Settings → Personal Access Tokens
3. Scopes: ☑ Work Items (Read, Write), ☑ Code (Read)
4. Copy token (52-character Base64 string)

---

## Troubleshooting

### GitHub

**Issue**: "Repository not found"
- ✅ Check `GITHUB_OWNER` matches organization/username
- ✅ Verify repository names (case-sensitive)
- ✅ Ensure token has `repo` scope

**Issue**: "Team not found"
- ✅ Check team names match GitHub organization teams
- ✅ Ensure token has `read:org` scope

### Jira

**Issue**: "Project key invalid"
- ✅ Use uppercase letters only (e.g., `FRONTEND`, not `frontend`)
- ✅ Verify 2-10 character length
- ✅ Check project exists in Jira

**Issue**: "Component not found"
- ✅ Verify component names match exactly
- ✅ Check components exist in the specified project

### Azure DevOps

**Issue**: "Team not found"
- ✅ Check team names match Azure DevOps team names
- ✅ Verify project name is correct
- ✅ Ensure teams exist in the project

---

## Migration Guide

### From Legacy Format to Strategies

**GitHub Legacy** (still works):
```bash
GITHUB_REPOS=repo1,repo2,repo3
```

**GitHub New** (recommended):
```bash
GITHUB_STRATEGY=repository-per-team
GITHUB_OWNER=myorg
GITHUB_REPOS=repo1,repo2,repo3
```

**Jira Legacy** (still works):
```bash
JIRA_PROJECT=MAIN
```

**Jira New** (recommended):
```bash
JIRA_STRATEGY=component-based
JIRA_PROJECT=MAIN
JIRA_COMPONENTS=Frontend,Backend
```

**No migration required** - legacy formats continue to work!

---

## Cross-Platform Migration

:::tip Switching Tools?
SpecWeave's universal mapping template enables seamless migration between GitHub ↔ JIRA ↔ Azure DevOps.
:::

### How It Works

Since `.specweave/` is your **permanent source of truth**, you can migrate between external tools:

```
GitHub → .specweave/ → JIRA
JIRA → .specweave/ → Azure DevOps
ADO → .specweave/ → GitHub
```

**Example: GitHub to JIRA Migration**

```bash
# Migration happens automatically via living docs sync
# Complete your increment first:
/specweave:done 0001

# Living docs sync automatically:
# 1. Syncs to GitHub (creates Milestone + Issues)
# 2. Syncs to JIRA (creates Epic + Stories)
# Both tools stay synchronized!
```

**What gets migrated:**
- ✅ Hierarchy (Epics → Stories → Tasks)
- ✅ Status (via configurable mapping)
- ✅ Priority, labels, assignees
- ✅ Comments and attachments
- ✅ Links between issues

**See**: [Multi-Project Sync - Cross-Platform Migration](/docs/integrations/multi-project-sync#cross-platform-migration) for complete guide

---

## Next Steps

- [Sync Increments to Issues](/docs/commands/sync)
- [Create GitHub/Jira Issues Automatically](/docs/commands/create-issue)
- [View Sync Status](/docs/commands/status)
- [Multi-Project Configuration](/docs/advanced/multi-project)
- [Cross-Platform Migration Guide](/docs/integrations/multi-project-sync#cross-platform-migration)
