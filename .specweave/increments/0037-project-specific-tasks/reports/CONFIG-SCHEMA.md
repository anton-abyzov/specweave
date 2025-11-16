# Config Schema Design: Architecture-Aware SpecWeave

**Document**: Configuration Schema for Multi-Project Architecture
**Date**: 2025-11-15
**Related**: ADR-0037-001 (Copy-Based Sync Paradigm)

---

## Executive Summary

This document defines the `.specweave/config.json` schema that enables SpecWeave to be architecture-aware from initialization. The config stores critical architectural decisions made during `specweave init`, which the PM Agent uses during increment planning to create project-specific user stories and tasks.

**Key Principle**: Architecture decisions happen once (during init), not every increment.

---

## Complete Config Schema

```json
{
  "version": "2.0.0",
  "project": {
    "name": "specweave",
    "version": "0.1.0"
  },

  "architecture": {
    "pattern": "monolith" | "microservices" | "event-driven" | "modular-monolith",
    "repositoryStrategy": "monorepo" | "polyrepo" | "multi-repo",
    "externalTracker": "github" | "jira" | "ado" | "linear" | "none",
    "teamStructure": "single" | "multiple",
    "scalabilityTarget": "startup" | "scale-up" | "enterprise"
  },

  "multiProject": {
    "enabled": true,
    "defaultProject": "backend",
    "projects": {
      "backend": {
        "id": "backend",
        "name": "Backend API",
        "displayName": "Backend Service (Node.js)",
        "type": "backend",
        "description": "REST API and business logic layer",
        "techStack": [
          "Node.js",
          "TypeScript",
          "PostgreSQL",
          "Redis",
          "Docker"
        ],
        "keywords": [
          "api",
          "backend",
          "database",
          "service",
          "server"
        ],
        "team": "backend-team",
        "github": {
          "owner": "anton-abyzov",
          "repo": "specweave-backend"
        },
        "structure": {
          "src": "src/",
          "tests": "tests/",
          "docs": "docs/"
        }
      },
      "frontend": {
        "id": "frontend",
        "name": "Web UI",
        "displayName": "Frontend Application (React)",
        "type": "frontend",
        "description": "User-facing web application",
        "techStack": [
          "React",
          "Next.js",
          "TypeScript",
          "TailwindCSS"
        ],
        "keywords": [
          "ui",
          "frontend",
          "component",
          "react",
          "web"
        ],
        "team": "frontend-team",
        "github": {
          "owner": "anton-abyzov",
          "repo": "specweave-frontend"
        },
        "structure": {
          "src": "app/",
          "components": "components/",
          "tests": "__tests__/"
        }
      },
      "mobile": {
        "id": "mobile",
        "name": "Mobile App",
        "displayName": "iOS & Android App (React Native)",
        "type": "mobile",
        "description": "Cross-platform mobile application",
        "techStack": [
          "React Native",
          "TypeScript",
          "Expo"
        ],
        "keywords": [
          "mobile",
          "ios",
          "android",
          "react-native"
        ],
        "team": "mobile-team",
        "github": {
          "owner": "anton-abyzov",
          "repo": "specweave-mobile"
        }
      },
      "infrastructure": {
        "id": "infrastructure",
        "name": "Infrastructure",
        "displayName": "Infrastructure & DevOps",
        "type": "infrastructure",
        "description": "Deployment, CI/CD, and infrastructure as code",
        "techStack": [
          "Docker",
          "Kubernetes",
          "Terraform",
          "GitHub Actions"
        ],
        "keywords": [
          "infrastructure",
          "devops",
          "deployment",
          "ci/cd",
          "kubernetes"
        ],
        "team": "platform-team"
      }
    }
  },

  "incrementPlanning": {
    "autoDetectProjects": true,
    "askProjectsPerIncrement": true,
    "defaultToAllProjects": false,
    "projectSelectionMode": "interactive" | "auto" | "manual",
    "userStoryNamingConvention": "us-{project}-{num}-{slug}.md" | "us-{num}-{project}-{slug}.md",
    "taskNamingConvention": "T-{PROJECT}-{num}" | "T-{num}-{PROJECT}"
  },

  "livingDocs": {
    "syncMode": "copy-based" | "transformation-based",
    "preserveStatus": true,
    "bidirectionalSync": true,
    "intelligent": {
      "enabled": false,
      "splitByCategory": false,
      "generateCrossLinks": true,
      "preserveOriginal": true
    }
  },

  "sync": {
    "enabled": true,
    "provider": "github",
    "includeStatus": true,
    "includeTaskCheckboxes": true,
    "autoApplyLabels": true,
    "activeProfile": "default",
    "statusSync": {
      "enabled": true,
      "autoSync": true,
      "promptUser": false,
      "conflictResolution": "external-wins" | "internal-wins" | "prompt"
    }
  }
}
```

---

## Schema Sections Explained

### 1. Architecture Section

**Purpose**: Store high-level architectural decisions that influence increment planning.

```json
"architecture": {
  "pattern": "microservices",
  "repositoryStrategy": "monorepo",
  "externalTracker": "github",
  "teamStructure": "multiple",
  "scalabilityTarget": "scale-up"
}
```

**Fields**:

| Field | Type | Options | Description |
|-------|------|---------|-------------|
| `pattern` | enum | `monolith`, `microservices`, `event-driven`, `modular-monolith` | Overall system architecture pattern |
| `repositoryStrategy` | enum | `monorepo`, `polyrepo`, `multi-repo` | How code is organized across repositories |
| `externalTracker` | enum | `github`, `jira`, `ado`, `linear`, `none` | External issue tracker (affects hierarchy mapping) |
| `teamStructure` | enum | `single`, `multiple` | Whether multiple teams work on different projects |
| `scalabilityTarget` | enum | `startup`, `scale-up`, `enterprise` | Expected scale (influences defaults) |

**How Used**:

- **PM Agent**: Knows whether to ask about multiple projects (microservices) or assume single project (monolith)
- **GitHub Sync**: Knows whether to map to Milestone (GitHub) or Epic (JIRA)
- **Living Docs**: Knows whether to create multiple project folders or single folder

**Examples**:

1. **Startup Monolith**:
   ```json
   {
     "pattern": "monolith",
     "repositoryStrategy": "monorepo",
     "externalTracker": "github",
     "teamStructure": "single",
     "scalabilityTarget": "startup"
   }
   ```
   - PM Agent: Assumes single project (no need to ask)
   - Living Docs: Creates single folder structure

2. **Scale-up Microservices**:
   ```json
   {
     "pattern": "microservices",
     "repositoryStrategy": "polyrepo",
     "externalTracker": "jira",
     "teamStructure": "multiple",
     "scalabilityTarget": "scale-up"
   }
   ```
   - PM Agent: Asks which services this feature affects
   - Living Docs: Creates separate folders per service
   - GitHub Sync: Maps to JIRA Epic (not GitHub Milestone)

---

### 2. Multi-Project Section

**Purpose**: Define all projects in the system and their characteristics.

```json
"multiProject": {
  "enabled": true,
  "defaultProject": "backend",
  "projects": {
    "backend": { ... },
    "frontend": { ... }
  }
}
```

**Project Schema**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique project identifier (kebab-case) |
| `name` | string | Yes | Human-readable project name |
| `displayName` | string | No | Full display name with tech stack |
| `type` | enum | Yes | `backend`, `frontend`, `mobile`, `infrastructure`, `shared` |
| `description` | string | No | What this project does |
| `techStack` | string[] | Yes | Technologies used (for keyword detection) |
| `keywords` | string[] | Yes | Keywords for project detection in increment planning |
| `team` | string | No | Team responsible for this project |
| `github` | object | No | GitHub repo info (for polyrepo) |
| `structure` | object | No | Directory structure (for code generation) |

**How Used**:

- **PM Agent**: Reads `projects` to ask: "Does this feature need backend? frontend? mobile?"
- **PM Agent**: Uses `keywords` to auto-detect project from feature description
- **Living Docs**: Uses `id` to create folder structure: `specs/{project}/{feature}/`
- **GitHub Sync**: Uses `github.repo` to create issues in correct repo (polyrepo)

**Project Type Mapping**:

| Type | Typical Tech Stack | Keywords | Living Docs Folder |
|------|-------------------|----------|-------------------|
| `backend` | Node.js, PostgreSQL, Redis | api, service, database, server | `specs/backend/` |
| `frontend` | React, Next.js, TypeScript | ui, component, web, react | `specs/frontend/` |
| `mobile` | React Native, Swift, Kotlin | mobile, ios, android, app | `specs/mobile/` |
| `infrastructure` | Docker, Kubernetes, Terraform | devops, deployment, ci/cd | `specs/infrastructure/` |
| `shared` | TypeScript types, utils | shared, common, utils | `specs/shared/` |

---

### 3. Increment Planning Section

**Purpose**: Configure how PM Agent behaves during increment planning.

```json
"incrementPlanning": {
  "autoDetectProjects": true,
  "askProjectsPerIncrement": true,
  "defaultToAllProjects": false,
  "projectSelectionMode": "interactive",
  "userStoryNamingConvention": "us-{project}-{num}-{slug}.md",
  "taskNamingConvention": "T-{PROJECT}-{num}"
}
```

**Fields**:

| Field | Type | Options | Description |
|-------|------|---------|-------------|
| `autoDetectProjects` | boolean | - | Try to detect projects from feature description |
| `askProjectsPerIncrement` | boolean | - | Always ask which projects feature affects |
| `defaultToAllProjects` | boolean | - | If unsure, default to all projects |
| `projectSelectionMode` | enum | `interactive`, `auto`, `manual` | How to select projects |
| `userStoryNamingConvention` | string | - | Template for US file naming |
| `taskNamingConvention` | string | - | Template for task ID format |

**How Used**:

- **PM Agent**: If `autoDetectProjects = true`, analyzes feature description for keywords
- **PM Agent**: If `askProjectsPerIncrement = true`, always prompts user to confirm
- **PM Agent**: Uses naming conventions to generate files

**Examples**:

1. **Auto-Detect Projects**:
   ```
   User: /specweave:increment "JWT authentication for API"

   PM Agent: (analyzes "API" keyword)
            → Detected projects: backend
            → Creating us-backend-001-jwt-auth-service.md
   ```

2. **Interactive Selection**:
   ```
   User: /specweave:increment "user profile page"

   PM Agent: This feature could affect multiple projects.
            Which projects should I create user stories for?
            [ ] backend (API endpoints)
            [x] frontend (UI components)
            [ ] mobile

            → Creating us-frontend-001-profile-page-component.md
   ```

---

### 4. Living Docs Section

**Purpose**: Configure how living docs sync behaves.

```json
"livingDocs": {
  "syncMode": "copy-based",
  "preserveStatus": true,
  "bidirectionalSync": true
}
```

**Fields**:

| Field | Type | Options | Description |
|-------|------|---------|-------------|
| `syncMode` | enum | `copy-based`, `transformation-based` | Copy files or transform content |
| `preserveStatus` | boolean | - | Preserve AC/task completion status during sync |
| `bidirectionalSync` | boolean | - | Sync status changes back to increment |

**How Used**:

- **SpecDistributor**: If `syncMode = "copy-based"`, use simple file copy
- **SpecDistributor**: If `preserveStatus = true`, don't reset checkboxes
- **SpecDistributor**: If `bidirectionalSync = true`, sync status from living docs → increment

**Migration Strategy**:

- Old config (no `syncMode` field): Defaults to `transformation-based` (backward compatible)
- New config (after 0037): Defaults to `copy-based` (new paradigm)

---

## Configuration Presets

SpecWeave provides presets for common architectures during `specweave init`.

### Preset 1: Startup Monolith

**Use Case**: Single-team startup, all code in one repo, single project.

```json
{
  "version": "2.0.0",
  "architecture": {
    "pattern": "monolith",
    "repositoryStrategy": "monorepo",
    "externalTracker": "github",
    "teamStructure": "single",
    "scalabilityTarget": "startup"
  },
  "multiProject": {
    "enabled": false,
    "projects": {
      "main": {
        "id": "main",
        "name": "Main Application",
        "type": "backend",
        "techStack": ["Node.js", "React", "PostgreSQL"],
        "keywords": ["app", "main", "service"]
      }
    }
  },
  "incrementPlanning": {
    "autoDetectProjects": false,
    "askProjectsPerIncrement": false,
    "defaultToAllProjects": true
  }
}
```

**PM Agent Behavior**:
- Always creates generic user stories (us-001.md)
- No project-specific splitting
- Simple increment structure

---

### Preset 2: Full-Stack Multi-Project

**Use Case**: Backend + Frontend separation, monorepo, single team.

```json
{
  "version": "2.0.0",
  "architecture": {
    "pattern": "modular-monolith",
    "repositoryStrategy": "monorepo",
    "externalTracker": "github",
    "teamStructure": "single",
    "scalabilityTarget": "scale-up"
  },
  "multiProject": {
    "enabled": true,
    "defaultProject": "backend",
    "projects": {
      "backend": { ... },
      "frontend": { ... }
    }
  },
  "incrementPlanning": {
    "autoDetectProjects": true,
    "askProjectsPerIncrement": true,
    "defaultToAllProjects": false
  }
}
```

**PM Agent Behavior**:
- Auto-detects backend vs frontend from keywords
- Asks user to confirm project selection
- Creates project-specific user stories

---

### Preset 3: Microservices Polyrepo

**Use Case**: Multiple services, separate repos, multiple teams.

```json
{
  "version": "2.0.0",
  "architecture": {
    "pattern": "microservices",
    "repositoryStrategy": "polyrepo",
    "externalTracker": "jira",
    "teamStructure": "multiple",
    "scalabilityTarget": "enterprise"
  },
  "multiProject": {
    "enabled": true,
    "projects": {
      "auth-service": {
        "id": "auth-service",
        "name": "Authentication Service",
        "type": "backend",
        "team": "platform-team",
        "github": {
          "owner": "company",
          "repo": "auth-service"
        }
      },
      "user-service": { ... },
      "payment-service": { ... },
      "web-app": {
        "id": "web-app",
        "name": "Web Application",
        "type": "frontend",
        "team": "frontend-team",
        "github": {
          "owner": "company",
          "repo": "web-app"
        }
      }
    }
  },
  "incrementPlanning": {
    "autoDetectProjects": true,
    "askProjectsPerIncrement": true,
    "projectSelectionMode": "interactive"
  }
}
```

**PM Agent Behavior**:
- Shows all services, asks which are affected
- Creates separate issues in each repo (polyrepo)
- Maps to JIRA Epic (not GitHub Milestone)

---

## Config Generation During `specweave init`

### Interactive Questions

```
$ specweave init

┌─────────────────────────────────────────────────────────────┐
│ SpecWeave Project Initialization                           │
└─────────────────────────────────────────────────────────────┘

Project Name: specweave
Project Version: 0.1.0

┌─────────────────────────────────────────────────────────────┐
│ Architecture Configuration                                  │
└─────────────────────────────────────────────────────────────┘

1. What is your architecture pattern?
   › Monolith (single application)
   › Microservices (multiple services)
   › Event-Driven (message-based)
   › Modular Monolith (modules in one repo)

   > Microservices

2. What is your repository strategy?
   › Monorepo (all code in one repo)
   › Polyrepo (separate repo per service)
   › Multi-repo (multiple repos, not services)

   > Monorepo

3. Which external tracker do you use?
   › GitHub Issues
   › JIRA
   › Azure DevOps
   › Linear
   › None

   > GitHub Issues

4. What is your team structure?
   › Single team (everyone works on everything)
   › Multiple teams (separate teams per project)

   > Multiple teams

5. What is your scalability target?
   › Startup (< 10 users, MVP)
   › Scale-up (10-100 users, growth phase)
   › Enterprise (100+ users, mature product)

   > Scale-up

┌─────────────────────────────────────────────────────────────┐
│ Project Setup                                               │
└─────────────────────────────────────────────────────────────┘

You selected "Microservices". How many projects/services? (1-10)
> 2

Project 1:
  Name: Backend API
  ID (kebab-case): backend
  Type:
    › Backend (API, database, business logic)
    › Frontend (UI, web app)
    › Mobile (iOS, Android)
    › Infrastructure (DevOps, CI/CD)

  > Backend

  Tech Stack (comma-separated): Node.js, TypeScript, PostgreSQL
  Team Name: backend-team

Project 2:
  Name: Web UI
  ID (kebab-case): frontend
  Type: Frontend
  Tech Stack: React, Next.js, TypeScript
  Team Name: frontend-team

┌─────────────────────────────────────────────────────────────┐
│ Configuration Preview                                       │
└─────────────────────────────────────────────────────────────┘

Architecture:
  Pattern: Microservices
  Repository: Monorepo
  Tracker: GitHub
  Teams: Multiple (backend-team, frontend-team)

Projects:
  1. backend (Backend API)
     - Tech: Node.js, TypeScript, PostgreSQL
     - Team: backend-team

  2. frontend (Web UI)
     - Tech: React, Next.js, TypeScript
     - Team: frontend-team

Looks good? (y/n)
> y

✅ Configuration saved to .specweave/config.json
✅ Created project folders:
   - .specweave/docs/internal/specs/backend/
   - .specweave/docs/internal/specs/frontend/

Next steps:
  1. Run: specweave increment "your feature name"
  2. PM Agent will ask which projects this feature affects
  3. Project-specific user stories will be created automatically
```

---

## Config Validation Rules

### Required Fields

- `version` (semantic version)
- `architecture.pattern`
- `architecture.repositoryStrategy`
- `multiProject.enabled` (boolean)
- If `multiProject.enabled = true`:
  - At least 1 project in `multiProject.projects`
  - Each project must have: `id`, `name`, `type`, `techStack`, `keywords`

### Validation Errors

```typescript
// Example validation errors
{
  "errors": [
    {
      "field": "multiProject.projects.backend.id",
      "message": "Project ID must be kebab-case (lowercase, hyphens only)",
      "value": "Backend_API",
      "suggestion": "backend-api"
    },
    {
      "field": "architecture.pattern",
      "message": "Invalid architecture pattern",
      "value": "serverless",
      "allowedValues": ["monolith", "microservices", "event-driven", "modular-monolith"]
    }
  ]
}
```

---

## Config Migration (v1 → v2)

### Migration Script

```typescript
// scripts/migrate-config-v1-to-v2.ts

async function migrateConfig(oldConfig: ConfigV1): ConfigV2 {
  const newConfig: ConfigV2 = {
    version: "2.0.0",
    project: oldConfig.project,

    // Detect architecture from old config
    architecture: {
      pattern: detectPattern(oldConfig),
      repositoryStrategy: "monorepo", // Default assumption
      externalTracker: oldConfig.sync?.provider || "none",
      teamStructure: "single",
      scalabilityTarget: "startup"
    },

    // Convert old multiProject to new format
    multiProject: {
      enabled: oldConfig.multiProject?.enabled || false,
      defaultProject: Object.keys(oldConfig.multiProject?.projects || {})[0] || "main",
      projects: convertProjects(oldConfig.multiProject?.projects)
    },

    // New sections
    incrementPlanning: {
      autoDetectProjects: true,
      askProjectsPerIncrement: true,
      defaultToAllProjects: false,
      projectSelectionMode: "interactive",
      userStoryNamingConvention: "us-{project}-{num}-{slug}.md",
      taskNamingConvention: "T-{PROJECT}-{num}"
    },

    livingDocs: {
      syncMode: "transformation-based", // Keep old behavior
      preserveStatus: true,
      bidirectionalSync: oldConfig.livingDocs?.intelligent?.enabled || false
    },

    sync: oldConfig.sync
  };

  return newConfig;
}

function detectPattern(oldConfig: ConfigV1): ArchitecturePattern {
  if (oldConfig.multiProject?.enabled &&
      Object.keys(oldConfig.multiProject.projects).length > 3) {
    return "microservices";
  }
  if (oldConfig.multiProject?.enabled) {
    return "modular-monolith";
  }
  return "monolith";
}
```

---

## Usage Examples

### Example 1: PM Agent Reading Config

```typescript
// plugins/specweave/commands/increment.sh

async function planIncrement(featureName: string) {
  const config = await loadConfig();

  if (!config.multiProject?.enabled) {
    // Single-project mode: create generic user stories
    return createGenericIncrement(featureName);
  }

  // Multi-project mode: ask which projects
  const projects = Object.keys(config.multiProject.projects);

  console.log(`This system has ${projects.length} projects:`);
  projects.forEach(p => {
    const proj = config.multiProject.projects[p];
    console.log(`  - ${p}: ${proj.name} (${proj.type})`);
  });

  const selectedProjects = await promptMultiSelect(
    "Which projects does this feature affect?",
    projects
  );

  // Create project-specific user stories
  for (const projectId of selectedProjects) {
    const project = config.multiProject.projects[projectId];
    await createProjectUserStories(featureName, project);
  }
}
```

---

### Example 2: Living Docs Sync Using Config

```typescript
// src/core/living-docs/spec-distributor.ts

async function syncLivingDocs(incrementId: string) {
  const config = await loadConfig();

  if (config.livingDocs?.syncMode === "copy-based") {
    // NEW: Copy-based sync (simple)
    return await copyBasedSync(incrementId, config);
  } else {
    // OLD: Transformation-based sync (legacy)
    return await transformationBasedSync(incrementId, config);
  }
}

async function copyBasedSync(incrementId: string, config: Config) {
  const incrementPath = `.specweave/increments/${incrementId}`;
  const userStoriesPath = `${incrementPath}/user-stories`;

  // For each project folder in increment
  const projects = await fs.readdir(userStoriesPath);

  for (const projectId of projects) {
    const projectConfig = config.multiProject.projects[projectId];
    if (!projectConfig) {
      console.warn(`Unknown project: ${projectId}`);
      continue;
    }

    // Simple copy: increment/user-stories/{project}/*.md → specs/{project}/FS-XXX/*.md
    const sourceDir = `${userStoriesPath}/${projectId}`;
    const targetDir = `.specweave/docs/internal/specs/${projectId}/FS-XXX`;

    await fs.copy(sourceDir, targetDir, {
      preserveTimestamps: true,
      overwrite: true
    });
  }
}
```

---

## Summary

This config schema enables:

1. **Architecture-aware initialization**: Capture decisions once during `specweave init`
2. **Project-specific planning**: PM Agent knows which projects exist and their characteristics
3. **Copy-based sync**: Simple file copying instead of complex transformations
4. **Polyrepo support**: GitHub repo info per project for separate issue creation
5. **Team awareness**: Multi-team workflows with separate project ownership

**Next Steps**: Implement PM Agent multi-project awareness using this config schema.
