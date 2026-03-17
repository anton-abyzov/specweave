# Multi-Project Setup Guide

Complete guide to setting up and using SpecWeave's multi-project mode for enterprise teams managing multiple repos, microservices, or projects.

---

## Table of Contents

- [Overview](#overview)
- [When to Use Multi-Project](#when-to-use-multi-project)
- [Getting Started](#getting-started)
- [How Project Routing Works](#how-project-routing-works)
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

**Behavior**: Each increment targets a project via the `**Project**:` field in spec.md user stories.

---

## Getting Started

Multi-project mode can be enabled in three ways:

### Option 1: During `specweave init` with an Issue Tracker

When you run `specweave init` and connect JIRA or Azure DevOps with multiple projects, multi-project mode is enabled automatically:

```bash
specweave init my-project
```

During the interactive setup, when you configure JIRA/ADO with multiple projects, SpecWeave:
1. Sets `multiProject.enabled: true` in config.json
2. Creates project folders under `.specweave/docs/internal/specs/`
3. Maps each external project to a SpecWeave project

### Option 2: Migrate an Existing Project

If you already have a single-project setup and want to reorganize by project:

```bash
specweave migrate-to-umbrella --reorganize-specs
```

This scans existing increments for `**Project**:` fields, builds a feature-to-project map, and moves spec folders into per-project directories. It also sets `multiProject.enabled = true` in config.

### Option 3: Manual Configuration

Edit `.specweave/config.json` directly:

```json
{
  "multiProject": {
    "enabled": true,
    "projects": {
      "web-app": {
        "name": "Web Application",
        "description": "Customer-facing web app",
        "techStack": ["React", "TypeScript"],
        "team": "Frontend Team"
      },
      "mobile-app": {
        "name": "Mobile Application",
        "techStack": ["React Native"],
        "team": "Mobile Team"
      }
    }
  }
}
```

Then create the project folders:

```bash
mkdir -p .specweave/docs/internal/specs/web-app
mkdir -p .specweave/docs/internal/specs/mobile-app
```

---

## How Project Routing Works

SpecWeave does **not** use a global "active project" switch. Instead, project routing is **per-increment** — each increment's spec.md determines which project it belongs to.

### The `**Project**:` Field

When you create an increment with `/sw:increment`, the PM skill adds a `**Project**:` field to each user story in spec.md:

```markdown
### US-FE-001: Login Page UI
**Project**: web-app
**As a** user **I want** a login form **so that** I can authenticate

### US-BE-001: Authentication API
**Project**: backend-api
**As a** user **I want** a /login endpoint **so that** the app can verify credentials
```

### Resolution Priority

SpecWeave resolves the target project using this priority chain:

1. **Per-US `**Project**:` fields** in spec.md (highest priority)
2. **`config.project.name`** in single-project mode
3. **Keyword matching** against registered projects
4. **Fallback to "default"**

### What This Means in Practice

You don't need to "switch projects" before creating increments. Simply describe what you want to build, and the PM skill will route user stories to the correct project based on context:

```bash
# No switching needed — just create the increment
/sw:increment "Add dark mode to the web app"
# → PM adds **Project**: web-app to the user stories

/sw:increment "Add biometric auth to the mobile app"
# → PM adds **Project**: mobile-app to the user stories
```

Living docs sync then places each spec in the correct project folder automatically.

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
└── specs/                 # Per-project living docs
    │
    ├── default/           # Default project (single-project mode)
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
    │   │   └── adr/       # Project-specific ADRs
    │   └── legacy/        # Brownfield imports
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

**Purpose**: Imported documentation from external sources (via `/sw:import`)

**Example**:
```
legacy/
├── README.md              # Migration report
├── notion/                # From Notion export
├── confluence/            # From Confluence
└── wiki/                  # From GitHub Wiki
```

---

## Increment spec.md Requirements

When creating increments in multi-project mode, you must specify the target project. This ensures increments sync to the correct location in living docs.

### Per-User-Story Project Field

The PM skill adds `**Project**:` to each user story during `/sw:increment`:

```markdown
## User Stories

### US-001: Dark Mode Toggle
**Project**: web-app
**As a** user **I want** a dark mode toggle **so that** I can reduce eye strain
```

### 2-Level Structure (Projects + Boards)

**When**: ADO area paths, JIRA boards, or umbrella with teams

The spec.md includes both project and board context:

```markdown
### US-001: Clinical Reports
**Project**: acme-corp
**Board**: clinical-insights
**As a** clinician **I want** patient reports **so that** I can track outcomes
```

**Sync path**: `internal/specs/acme-corp/clinical-insights/FS-001/`

### Automatic Detection

The increment planner automatically detects your structure level and prompts for project/board selection:

```
Detected 2-level structure (ADO area path mapping)
   Available projects: acme-corp

   Project: acme-corp
      Boards: clinical-insights, platform-engineering, digital-operations

Which board should this increment sync to?
> clinical-insights

Increment will sync to: internal/specs/acme-corp/clinical-insights/FS-XXX/
```

---

## Workflows

### Workflow 1: Managing Multiple Teams

**Scenario**: Frontend team and Mobile team, separate repos

```bash
# Morning: Frontend team work
/sw:increment "Add dark mode to the web app"
# PM adds **Project**: web-app to user stories
# Spec synced to: specs/web-app/spec-004-dark-mode.md

# Afternoon: Mobile team work
/sw:increment "Add biometric auth for mobile"
# PM adds **Project**: mobile-app to user stories
# Spec synced to: specs/mobile-app/spec-001-biometric-auth.md
```

### Workflow 2: Platform Engineering

**Scenario**: Platform team managing infrastructure + multiple app teams

```bash
# Infrastructure work
/sw:increment "Upgrade Kubernetes to 1.28"
# → **Project**: platform-infra

# Backend work
/sw:increment "Add rate limiting middleware to the API"
# → **Project**: backend-api

# Frontend work
/sw:increment "Implement new design system"
# → **Project**: frontend-app
```

### Workflow 3: Microservices

**Scenario**: 5 microservices, each with its own project

```bash
/sw:increment "Add OAuth2 support to user service"
# → **Project**: user-service

/sw:increment "Implement order tracking"
# → **Project**: order-service

# Each service gets its own specs, modules, team docs
```

---

## Integration with External Sync

Multi-project mode integrates with external sync (GitHub, JIRA, ADO).

### Configuration

**File**: `.specweave/config.json`

```json
{
  "multiProject": {
    "enabled": true,
    "projects": {
      "web-app": {
        "name": "Web Application",
        "description": "Customer-facing web app",
        "techStack": ["React", "TypeScript"],
        "team": "Frontend Team",
        "externalTools": {
          "github": { "repository": "acme-corp/web-app" },
          "jira": { "project": "WEBAPP" }
        }
      },
      "mobile-app": {
        "name": "Mobile Application",
        "techStack": ["React Native"],
        "team": "Mobile Team",
        "externalTools": {
          "jira": { "project": "MOBILE" }
        }
      }
    }
  }
}
```

### Workflow with Sync

```bash
# Create increment (syncs to the matching external tools)
/sw:increment "Add payment integration to the web app"

# Result:
# - Spec synced to: specs/web-app/spec-005-payment-integration.md
# - GitHub issue created in acme-corp/web-app
# - JIRA epic created in WEBAPP project
```

Use `/sw:sync-setup` to configure external tool connections interactively.

---

## Best Practices

### 1. Project Organization

**Group by team or repo**:
```
specs/
├── team-alpha/         Good (team-based)
├── team-beta/
└── team-gamma/

specs/
├── web-app/            Good (repo-based)
├── mobile-app/
└── backend-api/

specs/
├── feature-auth/       Bad (feature-based, too granular)
├── feature-payments/
└── feature-reports/
```

### 2. Spec Numbering

Specs are numbered per project:

```
specs/web-app/
├── spec-001-user-auth.md       <- Web app feature 1
└── spec-002-payments.md        <- Web app feature 2

specs/mobile-app/
├── spec-001-push-notifs.md     <- Mobile feature 1 (different from web!)
└── spec-002-offline-mode.md    <- Mobile feature 2
```

**Key**: `spec-001` in `web-app` is DIFFERENT from `spec-001` in `mobile-app`.

### 3. Module Documentation

**Create module docs when**:
- Module has complex logic (>1000 lines of code)
- Module has security implications (auth, payments)
- Module has integration points (external APIs)
- Module is reused across services

### 4. Team Playbooks

**Update regularly**:
- Onboarding: Review every quarter
- Conventions: Update when tech stack changes
- Workflows: Update when process changes

### 5. Legacy Cleanup

**After brownfield import** (via `/sw:import`):
- Review classification weekly
- Move misclassified files immediately
- Delete obsolete content monthly
- Remove `legacy/` folder when migration complete

---

## Troubleshooting

### Problem: Specs landing in the wrong project

**Issue**: Increment specs are syncing to `default/` instead of the target project

**Solution**:
1. Verify `multiProject.enabled: true` in `.specweave/config.json`
2. Check that the `**Project**:` field exists in your spec.md user stories
3. Verify the project name matches a key in `multiProject.projects`

### Problem: Multi-project mode not enabled

**Issue**: All specs go to `default/` regardless of `**Project**:` field

**Solution**:
```bash
# Option A: Re-run init with issue tracker setup
specweave init

# Option B: Reorganize existing specs
specweave migrate-to-umbrella --reorganize-specs

# Option C: Edit config.json manually
# Set multiProject.enabled: true and define your projects
```

### Problem: Project not recognized

**Issue**: `**Project**: my-project` in spec.md but no matching folder created

**Solution**:
1. Add the project to `multiProject.projects` in config.json
2. Create the folder: `mkdir -p .specweave/docs/internal/specs/my-project`
3. Re-run living docs sync: `/sw:sync-docs`

### Problem: Sync profiles not working

**Issue**: External sync not creating issues in correct repo

**Solution**:
1. Check config: `cat .specweave/config.json`
2. Verify `externalTools` mapping in the project config
3. Use `/sw:sync-setup` to reconfigure connections
4. Restart SpecWeave after config changes

---

## Migration from Single to Multi-Project

```bash
# Scan existing specs and reorganize by project
specweave migrate-to-umbrella --reorganize-specs

# This will:
# 1. Scan all increments for **Project**: fields
# 2. Move specs into per-project folders
# 3. Set multiProject.enabled: true in config
```

---

## See Also

- `/sw:import` - Import existing docs from external sources
- `/sw:sync-setup` - Configure external tool connections
- `/sw:sync-docs` - Sync living docs for an increment
- `specweave migrate-to-umbrella` - CLI command for multi-repo setup
