# Multi-Project Setup Guide

**Version**: 0.16.11+ (Flattened Structure)
**Last Updated**: 2025-11-11
**Previous Version**: [0.8.0-0.16.10 (Nested Structure)](#historical-nested-structure)

Complete guide to setting up and using SpecWeave's multi-project mode for enterprise teams managing multiple repos, microservices, or projects.

---

## Table of Contents

- [Overview](#overview)
- [When to Use Multi-Project](#when-to-use-multi-project)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Workflows](#workflows)
- [Integration with External Sync](#integration-with-external-sync)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

Multi-project mode allows you to organize SpecWeave documentation by project or team:

- **Specs** - Feature specifications per project
- **Modules** - Module-level documentation per project
- **Team Docs** - Team playbooks and conventions per project
- **Architecture** - Project-specific architecture (optional)
- **Legacy** - Brownfield imported documentation per project

**Key Benefit**: Clean separation for multiple teams, repos, or microservices while sharing cross-cutting docs (strategy, operations, governance).

---

## When to Use Multi-Project

### Single Project Mode (Default)

**Use when**:
- Small projects or startups
- One team, one codebase
- Simple organizational structure
- Getting started with SpecWeave

**Structure**:
```
.specweave/docs/internal/specs/default/
├── specs/
├── modules/
└── team/
```

**Behavior**: Uses `projects/default/` automatically (transparent to you).

### Multi-Project Mode

**Use when**:
- Multiple teams or repos
- Microservices architecture
- Platform engineering managing multiple projects
- Different tech stacks per team
- Enterprise with multiple products

**Structure**:
```
.specweave/docs/internal/specs/
├── web-app/
├── mobile-app/
└── platform-infra/
```

**Behavior**: Switch between projects using `/specweave:switch-project`.

---

## Getting Started

### Step 1: Initialize Multi-Project Mode

```bash
/specweave:init-multiproject
```

**Interactive prompts**:

```
🚀 Initialize Multi-Project Mode

✅ Migration complete! Using projects/default/ structure

Enable multi-project mode? (supports multiple teams/repos) (y/N): y
✅ Multi-project mode enabled!

Create additional projects? (besides "default") (y/N): y

📝 Create New Project

Project ID (kebab-case): web-app
Project name: Web Application
Description: Customer-facing web application
Tech stack (comma-separated): React, TypeScript, Node.js, PostgreSQL
Team name: Frontend Team
Tech lead email (optional): lead@example.com
Product manager email (optional): pm@example.com

✅ Created project: Web Application (web-app)

Create another project? (y/N): y

Project ID (kebab-case): mobile-app
...
```

### Step 2: Switch to a Project

```bash
/specweave:switch-project web-app
```

**Output**:
```
✅ Switched to project: Web Application (web-app)

ℹ️  Future increments will use:
   - .specweave/docs/internal/specs/web-app/
   - .specweave/docs/internal/modules/web-app/
   - .specweave/docs/internal/team/web-app/
```

### Step 3: Create Increments (As Usual)

```bash
/specweave:increment "Add user authentication"
```

**Result**: Spec created in `specs/web-app/spec-001-user-auth.md`

---

## Project Structure

### Full Directory Structure

```
.specweave/docs/internal/
│
├── strategy/              # Cross-project (business rationale)
├── architecture/          # Shared architecture (system-wide ADRs)
├── delivery/              # Cross-project (build & release)
├── operations/            # Cross-project (production ops)
├── governance/            # Cross-project (policies)
│
└── projects/              # 🆕 Multi-project support
    │
    ├── _README.md         # Multi-project guide
    │
    ├── default/           # Default project (single-project mode)
    │   ├── README.md      # Project overview
    │   ├── specs/         # Living docs specs
    │   │   ├── spec-001-user-auth.md
    │   │   └── spec-002-payments.md
    │   ├── modules/       # Module-level docs
    │   │   ├── auth-module.md
    │   │   └── payment-module.md
    │   ├── team/          # Team playbooks
    │   │   ├── onboarding.md
    │   │   ├── conventions.md
    │   │   └── workflows.md
    │   ├── architecture/  # Project-specific architecture
    │   │   ├── README.md
    │   │   └── adr/       # Project-specific ADRs
    │   └── legacy/        # Brownfield imports
    │       ├── README.md
    │       ├── notion/
    │       └── confluence/
    │
    ├── web-app/           # Additional projects
    │   └── ... (same structure)
    │
    ├── mobile-app/
    │   └── ... (same structure)
    │
    └── platform-infra/
        └── ... (same structure)
```

### Per-Project Folders

Each project has:

#### 1. `specs/` - Living Documentation Specs

**Purpose**: Feature specifications with user stories and acceptance criteria

**Example**:
```
specs/
├── spec-001-user-auth.md
├── spec-002-payments.md
└── spec-003-notifications.md
```

**Naming**: `spec-NNN-feature-name.md`

#### 2. `modules/` - Module Documentation

**Purpose**: Module/component-level documentation

**Example**:
```
modules/
├── README.md
├── auth-module.md          # Authentication domain
├── payment-module.md       # Payment processing
└── notification-module.md  # Messaging
```

**When to create**: Large modules with complex logic, integration points, or security considerations

#### 3. `team/` - Team Playbooks

**Purpose**: Team-specific conventions and workflows

**Example**:
```
team/
├── README.md
├── onboarding.md           # How to join this team
├── conventions.md          # Coding standards, naming
├── workflows.md            # PR process, deployments
└── contacts.md             # Team members, on-call
```

#### 4. `architecture/` - Project-Specific Architecture

**Purpose**: Architecture docs specific to this project (optional)

**Example**:
```
architecture/
├── README.md
└── adr/                    # Project-specific ADRs
    ├── 0001-use-postgres.md
    └── 0002-api-versioning.md
```

**When to use**:
- **Project-specific**: Decisions affecting only this project
- **Shared** (`.specweave/docs/internal/architecture/`): System-wide decisions

#### 5. `legacy/` - Brownfield Imports

**Purpose**: Imported documentation from external sources

**Example**:
```
legacy/
├── README.md              # Migration report
├── notion/                # From Notion export
├── confluence/            # From Confluence
└── wiki/                  # From GitHub Wiki
```

---

## Increment spec.md Requirements (v0.31.0+)

When creating increments in multi-project mode, you must specify the target project in the spec.md YAML frontmatter. This ensures increments sync to the correct location in living docs.

### 1-Level Structure (Projects Only)

**When**: `multiProject.enabled: true` in config.json

**Required field**: `project:`

```yaml
---
increment: 0001-dark-mode
project: web-app           # REQUIRED
title: "Add Dark Mode"
status: planned
---
```

**Sync path**: `internal/specs/web-app/FS-001/`

### 2-Level Structure (Projects + Boards)

**When**: ADO area paths, JIRA boards, or umbrella with teams

**Required fields**: `project:` AND `board:`

```yaml
---
increment: 0001-clinical-reports
project: acme-corp                 # REQUIRED
board: clinical-insights           # REQUIRED for 2-level
title: "Add Clinical Reports"
status: planned
---
```

**Sync path**: `internal/specs/acme-corp/clinical-insights/FS-001/`

### Automatic Detection

The increment planner automatically detects your structure level and prompts for project/board selection:

```
🔍 Detected 2-level structure (ADO area path mapping)
   Available projects: acme-corp

   📁 Project: acme-corp
      Boards: clinical-insights, platform-engineering, digital-operations

Which board should this increment sync to?
> clinical-insights

✅ Increment will sync to: internal/specs/acme-corp/clinical-insights/FS-XXX/
```

### Migration: Adding project to existing increments

If you have existing increments without `project:` field:

```bash
# Add to spec.md YAML frontmatter:
---
increment: 0001-existing-feature
project: my-project          # Add this line
---
```

See [ADR-0190](/internal/architecture/adr/0190-spec-project-board-requirement.md) for technical details.

---

## Workflows

### Workflow 1: Managing Multiple Teams

**Scenario**: Frontend team and Mobile team, separate repos

```bash
# Morning: Frontend team work
/specweave:switch-project web-app
/specweave:increment "Add dark mode"
# Spec created in: specs/web-app/spec-004-dark-mode.md

# Afternoon: Mobile team work
/specweave:switch-project mobile-app
/specweave:increment "Add biometric auth"
# Spec created in: specs/mobile-app/spec-001-biometric-auth.md
```

### Workflow 2: Platform Engineering

**Scenario**: Platform team managing infrastructure + multiple app teams

```bash
# Projects:
# - platform-infra (Terraform, K8s, runbooks)
# - backend-api (Node.js API)
# - frontend-app (React)

# Infrastructure work
/specweave:switch-project platform-infra
/specweave:increment "Upgrade Kubernetes to 1.28"

# Backend work
/specweave:switch-project backend-api
/specweave:increment "Add rate limiting middleware"

# Frontend work
/specweave:switch-project frontend-app
/specweave:increment "Implement new design system"
```

### Workflow 3: Microservices

**Scenario**: 5 microservices, each with its own project

```bash
# Projects:
# - user-service
# - order-service
# - payment-service
# - notification-service
# - analytics-service

/specweave:switch-project user-service
/specweave:increment "Add OAuth2 support"

/specweave:switch-project order-service
/specweave:increment "Implement order tracking"

# Each service gets its own specs, modules, team docs
```

---

## Integration with External Sync

Multi-project mode integrates with external sync (GitHub, JIRA, ADO):

### Configuration

**File**: `.specweave/config.json`

```json
{
  "multiProject": {
    "enabled": true,
    "activeProject": "web-app",
    "projects": [
      {
        "id": "web-app",
        "name": "Web Application",
        "description": "Customer-facing web app",
        "techStack": ["React", "TypeScript"],
        "team": "Frontend Team",
        "syncProfiles": ["web-app-github", "web-app-jira"]
      },
      {
        "id": "mobile-app",
        "name": "Mobile Application",
        "techStack": ["React Native"],
        "team": "Mobile Team",
        "syncProfiles": ["mobile-jira"]
      }
    ]
  },
  "sync": {
    "profiles": {
      "web-app-github": {
        "provider": "github",
        "config": {
          "owner": "acme-corp",
          "repo": "web-app"
        }
      },
      "web-app-jira": {
        "provider": "jira",
        "config": {
          "domain": "acme.atlassian.net",
          "projectKey": "WEBAPP"
        }
      },
      "mobile-jira": {
        "provider": "jira",
        "config": {
          "domain": "acme.atlassian.net",
          "projectKey": "MOBILE"
        }
      }
    }
  }
}
```

### Workflow with Sync

```bash
# Switch to web-app
/specweave:switch-project web-app

# Create increment (syncs to web-app-github and web-app-jira)
/specweave:increment "Add payment integration"

# Result:
# - Spec: specs/web-app/spec-005-payment-integration.md
# - GitHub issue created in acme-corp/web-app
# - JIRA epic created in WEBAPP project
```

> **Note**: If you used the `-shared` flag during `specweave init`, ensure your git remote also includes `-shared` in the repo name. Validate with: `bash scripts/validate-parent-repo-setup.sh`

---

## Best Practices

### 1. Project Organization

**Group by team or repo**:
```
projects/
├── team-alpha/         ✅ Good (team-based)
├── team-beta/
└── team-gamma/

projects/
├── web-app/            ✅ Good (repo-based)
├── mobile-app/
└── backend-api/

projects/
├── feature-auth/       ❌ Bad (feature-based, too granular)
├── feature-payments/
└── feature-reports/
```

### 2. Spec Numbering

Specs are numbered per project:

```
specs/web-app/
├── spec-001-user-auth.md       ← Web app feature 1
└── spec-002-payments.md        ← Web app feature 2

specs/mobile-app/
├── spec-001-push-notifs.md     ← Mobile feature 1 (different from web!)
└── spec-002-offline-mode.md   ← Mobile feature 2
```

**Key**: `spec-001` in `web-app` is DIFFERENT from `spec-001` in `mobile-app`.

### 3. Module Documentation

**Create module docs when**:
- Module has complex logic (>1000 lines of code)
- Module has security implications (auth, payments)
- Module has integration points (external APIs)
- Module is reused across services

**Example**:
```
modules/
├── auth-module.md              ✅ Good (auth is complex)
├── payment-module.md           ✅ Good (payments are critical)
├── notification-module.md      ✅ Good (integrations)
└── button-component.md         ❌ Overkill (too simple)
```

### 4. Team Playbooks

**Update regularly**:
- Onboarding: Review every quarter
- Conventions: Update when tech stack changes
- Workflows: Update when process changes

### 5. Legacy Cleanup

**After brownfield import**:
- Review classification weekly
- Move misclassified files immediately
- Delete obsolete content monthly
- Remove `legacy/` folder when migration complete

---

## Troubleshooting

### Problem: Can't switch projects

**Error**: `Multi-project mode not enabled`

**Solution**:
```bash
/specweave:init-multiproject
# Select "Yes" to enable multi-project mode
```

### Problem: Project not found

**Error**: `Project 'foo' not found`

**Solution**:
```bash
# List all projects
/specweave:switch-project

# Create missing project
/specweave:init-multiproject
# Select "Yes" to create additional projects
```

### Problem: Specs in wrong project

**Issue**: Created increment in wrong project

**Solution**:
1. Switch to correct project: `/specweave:switch-project correct-project`
2. Manually move spec file to correct project folder
3. Update increment metadata if needed

### Problem: Sync profiles not working

**Issue**: External sync not creating issues in correct repo

**Solution**:
1. Check config: `cat .specweave/config.json`
2. Verify `syncProfiles` array in project config
3. Verify profiles exist in `sync.profiles`
4. Restart SpecWeave after config changes

---

## Migration from Single to Multi-Project


```bash
/specweave:init-multiproject

# Prompts:
# - Enable multi-project mode? → Yes
# - Create additional projects? → Yes (optional)
```

---

## See Also

- **Brownfield Import Guide** (coming soon) - Import existing docs from external sources
- **Team Playbooks Guide** (coming soon) - Best practices for team documentation
- `/specweave:init-multiproject` - CLI command reference
- `/specweave:switch-project` - CLI command reference
- `/specweave:import-docs` - CLI command reference

---

**Last Updated**: 2025-11-05
**Version**: 0.8.0+
