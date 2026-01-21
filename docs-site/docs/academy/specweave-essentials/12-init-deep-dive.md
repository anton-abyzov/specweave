---
sidebar_position: 13
slug: 12-init-deep-dive
title: "Lesson 12: The specweave init Deep Dive"
description: "Master the initialization process and understand every question"
---

# Lesson 12: The specweave init Deep Dive

**Time**: 40 minutes
**Goal**: Understand every init question and make informed decisions

---

## Why Initialization Matters

The `specweave init` command is **the most important moment** in your project. The decisions you make here shape:

- How increments sync with external tools (GitHub, JIRA, ADO)
- How your team collaborates on specs
- How documentation is organized
- What plugins are available

**Get it right once. Don't revisit for months.**

---

## The Two Init Paths

### Path 1: Quick Init (Greenfield)

```bash
specweave init .
```

For new projects. Asks essential questions, sets up defaults.

### Path 2: Strategic Init (Brownfield)

```bash
specweave init . --strategic
```

For existing projects. AI-powered analysis, compliance detection, architecture recommendations.

**This lesson covers both paths.**

---

## Phase 1: Project Detection

When you run `specweave init`, the first thing that happens is **automatic detection**:

```
Detecting project configuration...

✓ Git repository detected
✓ package.json found (Node.js project)
✓ TypeScript detected (tsconfig.json)
✓ GitHub remote: origin → github.com/your-org/your-repo
```

### What Gets Detected

| Detection | Why It Matters |
|-----------|----------------|
| **Git provider** | Determines which sync plugin to suggest |
| **Package manager** | npm, yarn, pnpm, bun for dependency scripts |
| **Language** | TypeScript, JavaScript, Python, Go, Rust |
| **Framework** | React, Next.js, Express, NestJS, Django |
| **Existing CI/CD** | GitHub Actions, GitLab CI, Azure Pipelines |

### What Happens Behind the Scenes

```typescript
// SpecWeave checks for:
- .git/config → GitHub/GitLab/Azure DevOps/Bitbucket
- package.json → Node.js ecosystem
- tsconfig.json → TypeScript
- .github/workflows/ → GitHub Actions
- azure-pipelines.yml → Azure DevOps
- .gitlab-ci.yml → GitLab CI
- Dockerfile → Container deployment
```

---

## Phase 2: Git Provider Selection

```
? Which Git provider are you using?
  ❯ GitHub (github.com)
    GitHub Enterprise
    GitLab (gitlab.com)
    GitLab Self-hosted
    Azure DevOps (dev.azure.com)
    Bitbucket
    None / Skip
```

### Why This Question Matters

The Git provider determines:
1. **Which sync plugin** gets installed (sw-github, sw-ado, etc.)
2. **Issue linking format** (`#123` for GitHub, `AB#123` for ADO)
3. **CI/CD integration** templates

### GitHub vs GitHub Enterprise

```
GitHub (github.com):
  API endpoint: api.github.com
  Auth: Personal Access Token (PAT)

GitHub Enterprise:
  API endpoint: api.your-company.com
  Auth: PAT or OAuth app
  Extra config: GH_HOST environment variable
```

**Tip**: If your company uses GitHub Enterprise, select that option even if the URL looks like `github.company.com`.

---

## Phase 3: External Issue Tracker

```
? Do you want to sync increments with an external issue tracker?
  ❯ Yes, GitHub Issues
    Yes, JIRA
    Yes, Azure DevOps Work Items
    No, keep everything local
```

### Why This Question Matters

External sync enables:
- **Bidirectional progress updates** (task completed → checkbox checked)
- **Team visibility** (PMs see progress without accessing code)
- **Integration with existing workflows** (JIRA sprints, ADO boards)

### What Happens If You Choose Each Option

**GitHub Issues**:
```
Additional questions:
  ? GitHub organization/owner name: your-org
  ? Repository name: your-repo
  ? Create issues automatically when increment starts? (Y/n)

Creates:
  - .env (gitignored) with GITHUB_TOKEN placeholder
  - Installs sw-github plugin
```

**JIRA**:
```
Additional questions:
  ? JIRA domain (e.g., company.atlassian.net): your-company.atlassian.net
  ? JIRA project key: PROJ
  ? Default issue type: Story
  ? Map increments to Epics or Stories?

Creates:
  - .env with JIRA_EMAIL, JIRA_API_TOKEN, JIRA_BASE_URL
  - Installs sw-jira plugin
```

**Azure DevOps**:
```
Additional questions:
  ? Azure DevOps organization: your-org
  ? Project name: your-project
  ? Team name(s): Frontend, Backend (comma-separated)
  ? Default work item type: User Story

Creates:
  - .env with ADO_PAT, ADO_ORGANIZATION, ADO_PROJECT
  - Installs sw-ado plugin
```

---

## Phase 4: Team Strategy Selection

If you selected an external tracker, you'll see:

```
? How is your team organized?

For GitHub:
  ❯ Repository-per-team (microservices)
    Team-based (monorepo with team labels)
    Team-multi-repo (platform teams)

For JIRA:
  ❯ Project-per-team (separate JIRA projects)
    Component-based (one project, components = teams)
    Board-based (one project, boards = teams)

For Azure DevOps:
  → Teams within project (single strategy)
```

### Why This Question Matters

This determines **folder structure** and **sync mapping**:

```
Repository-per-team:
  .specweave/docs/specs/
  ├── frontend-app/      → syncs to frontend-app repo
  ├── backend-api/       → syncs to backend-api repo
  └── mobile-app/        → syncs to mobile-app repo

Component-based:
  .specweave/docs/specs/
  ├── Frontend/          → syncs to PROJ with component=Frontend
  ├── Backend/           → syncs to PROJ with component=Backend
  └── Mobile/            → syncs to PROJ with component=Mobile
```

### Decision Guide

| Scenario | Best Strategy |
|----------|---------------|
| Each team deploys independently | Repository-per-team |
| Monorepo with shared code | Team-based |
| Platform team owns multiple services | Team-multi-repo |
| Simple team, one project | Default (no strategy) |

---

## Phase 5: Documentation Approach

```
? Documentation approach:
  ❯ Simple (recommended for small teams)
    Living docs (full feature/epic hierarchy)
    Multi-project (separate specs per team)
```

### Simple (Default)

```
.specweave/
├── increments/       ← Your work lives here
└── docs/
    └── internal/     ← Minimal structure
```

Best for: Solo developers, small teams (1-5 people), single-product companies.

### Living Docs

```
.specweave/
├── increments/
└── docs/
    ├── internal/
    │   ├── specs/
    │   │   └── _features/
    │   │       ├── FS-001/    ← Feature folders
    │   │       ├── FS-002/
    │   │       └── ...
    │   ├── architecture/
    │   │   └── adr/           ← Architecture Decision Records
    │   └── governance/
    └── external/
        └── api/               ← Public API docs
```

Best for: Medium teams (5-15 people), products with multiple features, enterprises needing traceability.

### Multi-Project

```
.specweave/
├── increments/
└── docs/
    └── internal/
        └── specs/
            ├── projects/
            │   ├── frontend/
            │   │   └── specs/
            │   ├── backend/
            │   │   └── specs/
            │   └── mobile/
            │       └── specs/
            └── _shared/       ← Cross-team features
```

Best for: Large teams (15+ people), multiple products, platform teams.

---

## Phase 6: WIP Limits

```
? Maximum active increments (WIP limit):
  ❯ 1 (focused - recommended)
    2 (parallel work allowed)
    3 (large team)
    No limit (not recommended)
```

### Why WIP Limits Matter

```
WIP = 1:
  - One increment at a time
  - Maximum focus
  - No context switching
  - Recommended for 90% of users

WIP = 2:
  - Main feature + hotfix allowed
  - Useful for production support
  - Still maintains focus

WIP = 3+:
  - Only for large teams
  - Risk of scattered focus
  - Requires discipline
```

**The data**: Studies show developers are 40% more productive with WIP limits. Context switching is expensive.

---

## Phase 7: Testing Configuration

```
? Include test configuration?
  ❯ Yes, configure test framework
    No, I'll set up tests later
```

If yes:

```
? Test framework:
  ❯ Vitest (recommended for modern projects)
    Jest
    Mocha
    Playwright (E2E)
    Custom
```

### What Gets Created

```javascript
// .specweave/config.json
{
  "testing": {
    "framework": "vitest",
    "unitTestPattern": "**/*.test.ts",
    "integrationTestPattern": "**/*.integration.test.ts",
    "e2eTestPattern": "**/*.e2e.test.ts",
    "coverageThreshold": 80
  }
}
```

---

## Phase 8: Plugin Installation

```
Installing plugins...

✓ sw-github (GitHub integration)
✓ sw-release (Release management)

Optional plugins available:
  ? Install sw-kafka? (Kafka infrastructure) [y/N]
  ? Install sw-ml? (ML pipeline support) [y/N]
  ? Install sw-mobile? (React Native support) [y/N]
```

### Core Plugins (Auto-installed)

| Plugin | What It Does |
|--------|--------------|
| specweave | Core framework, increment management |
| sw-github/jira/ado | External tool sync |
| sw-release | Version bumping, changelog |

### Optional Plugins

| Plugin | When to Install |
|--------|-----------------|
| sw-kafka | Building event-driven systems |
| sw-ml | ML pipelines, model deployment |
| sw-mobile | React Native mobile apps |
| sw-k8s | K8s deployments |
| sw-infra | Terraform, cloud infrastructure |

---

## Phase 9: Final Configuration

```
? Language for CLI messages and documentation:
  ❯ English
    Spanish (Español)
    German (Deutsch)
    French (Français)
    Russian (Русский)
    Chinese (中文)
```

### Multilingual Support

SpecWeave supports 30+ languages. Choosing a non-English language:
- Translates CLI messages
- Translates generated documentation headers
- Keeps code and technical terms in English (best practice)

---

## The Config File

After init, you'll have `.specweave/config.json`:

```json
{
  "project": {
    "name": "your-project",
    "description": "Your project description"
  },
  "limits": {
    "maxActiveIncrements": 1,
    "hardCap": 2
  },
  "sync": {
    "github": {
      "enabled": true,
      "owner": "your-org",
      "repo": "your-repo",
      "autoCreateIssues": true
    }
  },
  "testing": {
    "framework": "vitest",
    "coverageThreshold": 80
  },
  "language": "en"
}
```

### Secrets File

Sensitive values go in `.env` (gitignored):

```bash
# GitHub
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx

# JIRA (if configured)
JIRA_EMAIL=you@company.com
JIRA_API_TOKEN=xxxxxxxxxxxx
JIRA_BASE_URL=https://company.atlassian.net

# Azure DevOps (if configured)
ADO_PAT=xxxxxxxxxxxxxxxxxxxx
ADO_ORGANIZATION=your-org
ADO_PROJECT=your-project
```

---

## Common Init Scenarios

### Scenario 1: Solo Developer, New Project

```bash
specweave init .

# Answers:
# Git provider: GitHub
# External tracker: No (keep local)
# Documentation: Simple
# WIP limit: 1
# Testing: Vitest
```

**Result**: Minimal setup, maximum speed.

### Scenario 2: Startup Team (5 devs), GitHub-First

```bash
specweave init .

# Answers:
# Git provider: GitHub
# External tracker: GitHub Issues
# Team strategy: Repository-per-team
# Documentation: Living docs
# WIP limit: 2
# Testing: Vitest + Playwright
```

**Result**: Full GitHub integration, team visibility.

### Scenario 3: Enterprise, JIRA + Azure DevOps

```bash
specweave init . --strategic

# Strategic Init phases:
# Phase 0: Vision analysis
# Phase 1: Compliance detection (finds HIPAA, SOC 2)
# Phase 2: Team recommendations (suggests Security Engineer)
# Phase 3: Repository selection
# Phase 4-5: Architecture (recommends traditional, not serverless)
# Phase 6: Project generation

# Regular Init continues:
# Git provider: Azure DevOps
# External tracker: JIRA
# Team strategy: Project-per-team
# Documentation: Multi-project
# WIP limit: 3
```

**Result**: Enterprise-grade setup with compliance.

---

## Re-initializing Existing Projects

```bash
# Update config without losing data
specweave init . --reconfigure

# Full re-init (preserves increments)
specweave init . --force

# Dangerous: fresh start (DELETES everything)
specweave init . --fresh  # Requires confirmation
```

### What Gets Preserved

| Item | --reconfigure | --force | --fresh |
|------|---------------|---------|---------|
| Increments | ✅ | ✅ | ❌ |
| Living docs | ✅ | ✅ | ❌ |
| Config | ❌ (updated) | ❌ (updated) | ❌ |
| .env | ✅ | ✅ | ❌ |

---

## Troubleshooting Init

### "Git repository not found"

```bash
# Initialize git first
git init
git remote add origin https://github.com/you/repo.git
specweave init .
```

### "Plugin installation failed"

```bash
# Check npm permissions
npm config get prefix
# Should be user-writable directory

# Or run with sudo (not recommended)
sudo specweave init .
```

### "Token validation failed"

```bash
# Check token permissions
# GitHub: needs 'repo', 'read:org' scopes
# JIRA: needs project read/write
# ADO: needs Work Items read/write

# Test manually:
curl -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/user
```

---

## Quick Exercise

Initialize a test project:

```bash
mkdir specweave-init-test && cd specweave-init-test
npm init -y
git init

specweave init .

# Answer questions, then verify:
ls -la .specweave/
cat .specweave/config.json
```

**Success criteria**:
- [ ] `.specweave/` directory created
- [ ] `config.json` reflects your answers
- [ ] No error messages during init

---

## Key Takeaways

1. **Init is strategic** — Take 5 minutes to answer thoughtfully
2. **Detection is automatic** — SpecWeave finds your stack
3. **Team strategy matters** — Choose based on your org structure
4. **WIP limits boost productivity** — Start with 1 or 2
5. **Secrets stay local** — `.env` is gitignored

---

## Glossary Terms Used

- **[WIP Limits](/docs/glossary/terms/wip-limits)** — Work-in-progress constraints
- **[Living Docs](/docs/glossary/terms/living-docs)** — Auto-synced documentation
- **[Increment](/docs/glossary/terms/increments)** — A unit of work

---

## What's Next?

Now that your project is initialized, learn how to manage increments through their full lifecycle — from creation to archival.

**:next** → [Lesson 13: Increment Lifecycle Management](./13-increment-lifecycle)
