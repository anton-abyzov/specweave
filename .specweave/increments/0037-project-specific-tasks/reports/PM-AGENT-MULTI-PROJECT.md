# PM Agent Multi-Project Enhancement

**Document**: PM Agent Multi-Project Awareness Design
**Date**: 2025-11-15
**Related**: ADR-0037-001 (Copy-Based Sync), CONFIG-SCHEMA.md

---

## Executive Summary

This document designs how the PM Agent becomes **multi-project aware** during increment planning. Instead of creating generic user stories that are split later (transformation paradigm), the PM Agent will create **project-specific user stories from the start** (copy paradigm).

**Key Change**: Architecture awareness moves from living docs sync (too late) to increment planning (correct place).

---

## Current PM Agent Behavior (Transformation Paradigm)

### Current Flow

```
User: /specweave:increment "user authentication"

PM Agent: (no project awareness)
          Creating increment 0045-user-authentication...

          Files created:
          ├── spec.md
          ├── plan.md
          └── tasks.md

          User stories in spec.md:
          - US-001: Implement JWT authentication
          - US-002: Create user database schema
          - US-003: Build login form component

          Tasks in tasks.md:
          - T-001: Setup JWT library (backend + frontend?)
          - T-002: Create user model (backend only)
          - T-003: Build login form (frontend only)

(Later, during living docs sync)
SpecDistributor: (tries to guess project from keywords)
                 - Detected "JWT" → backend
                 - Detected "database" → backend
                 - Detected "form component" → frontend
                 - Creating us-backend-001.md, us-frontend-003.md
```

**Problems**:
1. Generic user stories don't reflect reality (backend JWT ≠ frontend JWT)
2. Task splitting happens during sync (wrong place!)
3. No way to ask user which projects are affected
4. Keyword detection is fragile ("JWT" could be frontend token storage)

---

## New PM Agent Behavior (Copy Paradigm)

### New Flow

```
User: /specweave:increment "user authentication"

PM Agent: (reads config.json)
          I see you have 2 projects: backend, frontend

          Question 1: Does this feature require backend work? (y/n)
          > y

          Question 2: Does this feature require frontend work? (y/n)
          > y

          PM Agent: Creating project-specific user stories...

          Files created:
          ├── spec.md (references both projects)
          ├── plan.md
          ├── tasks.md (project-specific tasks)
          └── user-stories/
              ├── backend/
              │   ├── us-001-jwt-auth-service.md
              │   └── us-002-user-database-schema.md
              └── frontend/
                  ├── us-001-login-form-component.md
                  └── us-002-auth-state-management.md

          Tasks in tasks.md:
          - T-BE-001: Setup JWT library (Node.js)
          - T-BE-002: Create user model (PostgreSQL)
          - T-FE-001: Build login form (React)
          - T-FE-002: Auth state management (Redux)

(Later, during living docs sync)
SpecDistributor: (simple copy, no transformation!)
                 - Copy user-stories/backend/*.md → specs/backend/FS-045/*.md
                 - Copy user-stories/frontend/*.md → specs/frontend/FS-045/*.md
```

**Benefits**:
1. User stories are project-specific from creation
2. No transformation logic needed
3. User explicitly confirms which projects are affected
4. Tasks are created with correct project context

---

## Design Details

### 1. Config Reading

**File**: `plugins/specweave/commands/increment.sh`

**Logic**:

```bash
#!/bin/bash
# /specweave:increment command

# Read config
config_path=".specweave/config.json"
if [[ ! -f "$config_path" ]]; then
  echo "❌ Config not found. Run 'specweave init' first."
  exit 1
fi

# Parse multi-project settings
multi_project_enabled=$(jq -r '.multiProject.enabled' "$config_path")
projects=$(jq -r '.multiProject.projects | keys[]' "$config_path")

if [[ "$multi_project_enabled" != "true" ]]; then
  # Single-project mode: use existing generic increment planning
  echo "📋 Single-project mode (creating generic user stories)"
  create_generic_increment "$feature_name"
  exit 0
fi

# Multi-project mode: ask which projects are affected
echo "🔍 Multi-project mode detected"
echo "   Available projects: $projects"
```

---

### 2. Project Selection (Interactive Mode)

**User Interaction**:

```
PM Agent: This feature could affect multiple projects.
          Which projects should I create user stories for?

          Available projects:
          [ ] backend (Backend API - Node.js, PostgreSQL)
          [ ] frontend (Web UI - React, Next.js)
          [ ] mobile (Mobile App - React Native)
          [ ] infrastructure (DevOps - Docker, Kubernetes)

          Select (space to toggle, enter to confirm):
          > [x] backend
            [x] frontend
            [ ] mobile
            [ ] infrastructure

          You selected: backend, frontend

          PM Agent: Creating project-specific user stories for:
                   - backend (Backend API)
                   - frontend (Web UI)
```

**Implementation**:

```typescript
// src/commands/increment/project-selector.ts

async function selectProjects(config: Config): Promise<string[]> {
  const projects = Object.keys(config.multiProject.projects);

  if (projects.length === 1) {
    // Only one project: no need to ask
    return projects;
  }

  // Interactive multi-select
  const choices = projects.map(id => {
    const project = config.multiProject.projects[id];
    return {
      name: `${id} (${project.name} - ${project.techStack.join(', ')})`,
      value: id,
      checked: false
    };
  });

  const answers = await inquirer.prompt([{
    type: 'checkbox',
    name: 'selectedProjects',
    message: 'Which projects does this feature affect?',
    choices,
    validate: (input) => {
      if (input.length === 0) {
        return 'Please select at least one project';
      }
      return true;
    }
  }]);

  return answers.selectedProjects;
}
```

---

### 3. Auto-Detection (Smart Mode)

**Logic**: Analyze feature description for keywords to suggest projects.

```typescript
// src/commands/increment/project-detector.ts

function autoDetectProjects(
  featureName: string,
  featureDescription: string,
  config: Config
): string[] {
  const detectedProjects: string[] = [];
  const text = `${featureName} ${featureDescription}`.toLowerCase();

  for (const [projectId, project] of Object.entries(config.multiProject.projects)) {
    // Check if any project keywords appear in feature text
    const hasKeyword = project.keywords.some(keyword =>
      text.includes(keyword.toLowerCase())
    );

    // Check if tech stack is mentioned
    const hasTechStack = project.techStack.some(tech =>
      text.includes(tech.toLowerCase())
    );

    if (hasKeyword || hasTechStack) {
      detectedProjects.push(projectId);
    }
  }

  return detectedProjects;
}
```

**Example**:

```
User: /specweave:increment "JWT authentication for API endpoints"

PM Agent: (analyzes "API endpoints")
          → Detected keywords: "api" (backend project)
          → Suggested projects: backend

          I detected this feature likely affects: backend
          Add more projects? (y/n)
          > n

          PM Agent: Creating user stories for: backend
```

---

### 4. Project-Specific User Story Generation

**File Structure**:

```
.specweave/increments/0045-user-authentication/
├── spec.md                          # References all projects
├── plan.md                          # Implementation plan
├── tasks.md                         # All tasks (T-BE-*, T-FE-*)
└── user-stories/                    # NEW: Project-specific folder
    ├── backend/
    │   ├── us-001-jwt-auth-service.md
    │   └── us-002-user-database-schema.md
    └── frontend/
        ├── us-001-login-form-component.md
        └── us-002-auth-state-management.md
```

**Generation Logic**:

```typescript
// src/commands/increment/user-story-generator.ts

async function generateProjectUserStories(
  incrementId: string,
  featureName: string,
  selectedProjects: string[],
  config: Config
): Promise<void> {
  const incrementPath = `.specweave/increments/${incrementId}`;
  const userStoriesPath = `${incrementPath}/user-stories`;

  for (const projectId of selectedProjects) {
    const project = config.multiProject.projects[projectId];
    const projectPath = `${userStoriesPath}/${projectId}`;

    await fs.ensureDir(projectPath);

    // Generate user stories for this project
    const userStories = await pmAgent.generateUserStoriesForProject(
      featureName,
      project
    );

    for (const story of userStories) {
      const filename = `us-${story.number.toString().padStart(3, '0')}-${story.slug}.md`;
      const filepath = `${projectPath}/${filename}`;

      const content = formatUserStory(story, project);
      await fs.writeFile(filepath, content, 'utf-8');
    }
  }
}
```

---

### 5. User Story File Format (Project-Specific)

**Example**: `user-stories/backend/us-001-jwt-auth-service.md`

```markdown
---
id: US-BE-001
project: backend
feature: FS-045
title: "JWT Authentication Service"
status: planning
priority: P0
created: 2025-11-15
---

# US-BE-001: JWT Authentication Service

**Project**: backend (Backend API)
**Feature**: [FS-045: User Authentication](../../../docs/internal/specs/_features/FS-045/FEATURE.md)

**As a** backend developer
**I want** a JWT-based authentication service
**So that** users can securely log in to the API

---

## Acceptance Criteria

- [ ] **AC-BE-US1-01**: JWT library installed (jsonwebtoken) (P0, testable)
- [ ] **AC-BE-US1-02**: Token generation endpoint `/auth/login` created (P0, testable)
- [ ] **AC-BE-US1-03**: Token validation middleware implemented (P0, testable)
- [ ] **AC-BE-US1-04**: Refresh token rotation implemented (P1, testable)
- [ ] **AC-BE-US1-05**: Token expiry set to 15 minutes (P0, testable)

---

## Tasks

- [ ] **T-BE-001**: Install jsonwebtoken library
- [ ] **T-BE-002**: Create AuthService class
- [ ] **T-BE-003**: Implement POST /auth/login endpoint
- [ ] **T-BE-004**: Create JWT validation middleware
- [ ] **T-BE-005**: Write integration tests for auth flow

> **Note**: Tasks are specific to backend implementation. See [tasks.md](../../tasks.md) for complete task list.

---

## Implementation

**Tech Stack**: Node.js, TypeScript, jsonwebtoken, PostgreSQL

**Architecture Considerations**:
- Use RS256 algorithm (public/private key pair)
- Store refresh tokens in database (users.refresh_token)
- Implement token blacklist for logout

**Dependencies**:
- Requires: User database schema (US-BE-002)
- Blocks: Protected API endpoints (future user stories)

---

## Business Rationale

JWT authentication is critical for securing API endpoints. Without proper authentication:
- User data is exposed
- Unauthorized access to sensitive operations
- No audit trail of API usage

**Business Value**: Secure API = trust = more users
```

**Key Points**:
- `id: US-BE-001` (project prefix in ID)
- `project: backend` (explicit project field)
- `AC-BE-US1-01` (project prefix in AC IDs)
- `T-BE-001` (project prefix in task IDs)
- Tech stack specific to backend (Node.js, not React)

---

### 6. Task Generation (Project-Specific)

**File**: `tasks.md`

```markdown
# Tasks: User Authentication

## Backend Tasks

### T-BE-001: Install JWT Library

**Status**: [ ]
**AC**: AC-BE-US1-01
**User Story**: [US-BE-001: JWT Auth Service](user-stories/backend/us-001-jwt-auth-service.md)
**Project**: backend
**Tech Stack**: Node.js, TypeScript

**Description**: Install jsonwebtoken library and configure TypeScript types.

**Implementation**:
```bash
npm install jsonwebtoken
npm install --save-dev @types/jsonwebtoken
```

**Verification**:
- [ ] Library installed in package.json
- [ ] TypeScript types available
- [ ] Import works: `import jwt from 'jsonwebtoken'`

---

### T-BE-002: Create User Database Schema

**Status**: [ ]
**AC**: AC-BE-US2-01
**User Story**: [US-BE-002: User Database Schema](user-stories/backend/us-002-user-database-schema.md)
**Project**: backend
**Tech Stack**: PostgreSQL, TypeScript

**Description**: Create users table with fields for authentication.

**Implementation**:
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  refresh_token TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Verification**:
- [ ] Migration file created
- [ ] Table created in database
- [ ] User model defined in TypeScript

---

## Frontend Tasks

### T-FE-001: Build Login Form Component

**Status**: [ ]
**AC**: AC-FE-US1-01
**User Story**: [US-FE-001: Login Form Component](user-stories/frontend/us-001-login-form-component.md)
**Project**: frontend
**Tech Stack**: React, TypeScript, TailwindCSS

**Description**: Create LoginForm component with email/password fields.

**Implementation**:
```tsx
// components/auth/LoginForm.tsx
export function LoginForm() {
  return (
    <form>
      <input type="email" placeholder="Email" />
      <input type="password" placeholder="Password" />
      <button type="submit">Login</button>
    </form>
  );
}
```

**Verification**:
- [ ] Component renders without errors
- [ ] Form validation works
- [ ] Storybook story created
- [ ] Jest tests pass
```

**Key Points**:
- Tasks are grouped by project (Backend Tasks, Frontend Tasks)
- Each task has `**Project**: backend` field
- Task IDs use project prefix (T-BE-*, T-FE-*)
- Tech stack is project-specific (PostgreSQL vs React)

---

## User Interaction Examples

### Example 1: Full-Stack Feature (Backend + Frontend)

```
User: /specweave:increment "user profile page"

PM Agent: Reading configuration...
          Projects detected: backend, frontend

          Analyzing feature description...
          Keywords detected: "user", "profile", "page"
          Likely projects: backend (API), frontend (UI)

          Question 1: Does this feature require backend work? (y/n)
          > y

          Question 2: Does this feature require frontend work? (y/n)
          > y

PM Agent: Creating project-specific user stories...

          Backend User Stories:
          ✅ us-001-user-profile-api-endpoint.md
          ✅ us-002-profile-data-validation.md

          Frontend User Stories:
          ✅ us-001-profile-page-component.md
          ✅ us-002-profile-edit-form.md

          Tasks created:
          - T-BE-001: Create GET /users/:id endpoint
          - T-BE-002: Validate profile data schema
          - T-FE-001: Build ProfilePage component
          - T-FE-002: Build ProfileEditForm component

          Increment created: 0046-user-profile-page

          Next steps:
          1. Review user stories in user-stories/{project}/
          2. Run: /specweave:do to start implementation
          3. Living docs will sync automatically (copy-based)
```

---

### Example 2: Backend-Only Feature

```
User: /specweave:increment "database migration to PostgreSQL 15"

PM Agent: Reading configuration...
          Projects detected: backend, frontend

          Analyzing feature description...
          Keywords detected: "database", "postgresql"
          Likely projects: backend

          Auto-detected project: backend
          Create user stories for other projects? (y/n)
          > n

PM Agent: Creating user stories for: backend

          Backend User Stories:
          ✅ us-001-postgres-15-upgrade.md
          ✅ us-002-migration-script.md
          ✅ us-003-rollback-plan.md

          Tasks created:
          - T-BE-001: Backup production database
          - T-BE-002: Test migration on staging
          - T-BE-003: Update connection string
          - T-BE-004: Verify application compatibility

          Increment created: 0047-postgres-15-migration

          Note: This is a backend-only increment (no frontend changes)
```

---

### Example 3: Cross-Project Shared Feature

```
User: /specweave:increment "shared TypeScript types for API contracts"

PM Agent: Reading configuration...
          Projects detected: backend, frontend, mobile

          Analyzing feature description...
          Keywords detected: "shared", "typescript", "api"
          Likely projects: backend, frontend, mobile (all share types)

          This feature affects multiple projects.
          Select projects:
          [x] backend (needs types)
          [x] frontend (needs types)
          [x] mobile (needs types)
          [ ] infrastructure (doesn't need types)

          You selected: backend, frontend, mobile

PM Agent: Creating project-specific user stories...

          Backend User Stories:
          ✅ us-001-api-contract-types.md (defines types)

          Frontend User Stories:
          ✅ us-001-import-api-types.md (consumes types)

          Mobile User Stories:
          ✅ us-001-import-api-types.md (consumes types)

          Tasks created:
          - T-BE-001: Define User, Post, Comment types
          - T-BE-002: Export types from @/types package
          - T-FE-001: Install @/types package
          - T-FE-002: Update API calls to use types
          - T-MOB-001: Install @/types package
          - T-MOB-002: Update API calls to use types

          Increment created: 0048-shared-api-types

          Note: Backend defines types, frontend/mobile consume them
```

---

## PM Agent Instructions Update

**File**: `plugins/specweave/agents/pm.md`

**New Section**:

```markdown
## Multi-Project Awareness (NEW)

When planning increments for multi-project systems, you MUST:

1. **Read Config First**:
   ```bash
   config=$(cat .specweave/config.json)
   multi_project_enabled=$(echo "$config" | jq -r '.multiProject.enabled')
   ```

2. **Check Project Count**:
   - If `multiProject.enabled = false`: Use generic user stories (old behavior)
   - If `multiProject.enabled = true`: Use project-specific user stories (new behavior)

3. **Auto-Detect Projects** (if enabled):
   ```typescript
   const detectedProjects = autoDetectProjects(featureName, featureDescription, config);
   console.log(`Auto-detected projects: ${detectedProjects.join(', ')}`);
   ```

4. **Ask User to Confirm**:
   ```
   Detected projects: backend, frontend
   Is this correct? (y/n)
   > y
   ```

5. **Create Project-Specific Files**:
   ```
   user-stories/
   ├── backend/
   │   ├── us-001-{slug}.md
   │   └── us-002-{slug}.md
   └── frontend/
       ├── us-001-{slug}.md
       └── us-002-{slug}.md
   ```

6. **Use Project-Specific Naming**:
   - User Story IDs: `US-BE-001`, `US-FE-001` (not `US-001`)
   - Task IDs: `T-BE-001`, `T-FE-001` (not `T-001`)
   - AC IDs: `AC-BE-US1-01`, `AC-FE-US1-01`

7. **Include Project Context**:
   - Tech stack specific to project
   - Dependencies specific to project
   - Architecture considerations specific to project

## Examples

See PM-AGENT-MULTI-PROJECT.md for complete examples.
```

---

## Implementation Checklist

### Phase 1: Config Reading (2-3 hours)
- [ ] Update `increment.sh` to read `.specweave/config.json`
- [ ] Parse `multiProject.enabled` and `multiProject.projects`
- [ ] Handle missing config (show error, suggest `specweave init`)

### Phase 2: Project Selection (4-6 hours)
- [ ] Implement `selectProjects()` interactive prompt
- [ ] Implement `autoDetectProjects()` keyword detection
- [ ] Handle single-project case (skip prompt)
- [ ] Handle multi-project case (show checkbox list)

### Phase 3: User Story Generation (8-12 hours)
- [ ] Create `user-stories/{project}/` folder structure
- [ ] Generate project-specific US files with correct IDs
- [ ] Include project-specific tech stack in US
- [ ] Include project-specific AC with correct prefixes
- [ ] Generate project-specific tasks in tasks.md

### Phase 4: PM Agent Instructions (2-3 hours)
- [ ] Update `pm.md` with multi-project guidelines
- [ ] Add examples of single-project vs multi-project increments
- [ ] Document project-specific naming conventions
- [ ] Document cross-project feature handling

### Phase 5: Testing (4-6 hours)
- [ ] Unit tests for `autoDetectProjects()`
- [ ] Unit tests for `selectProjects()`
- [ ] Integration test: create multi-project increment
- [ ] Integration test: create single-project increment
- [ ] E2E test: full flow from init → increment → sync

**Total Effort**: 20-30 hours

---

## Success Metrics

### Code Quality
- **Test Coverage**: 95%+ for new project selection logic
- **Type Safety**: All config reading is type-safe (TypeScript)

### User Experience
- **Project Selection Time**: < 30 seconds (interactive prompt)
- **Auto-Detection Accuracy**: 90%+ correct project suggestions
- **User Satisfaction**: "Creating project-specific US makes sense" (user survey)

### Correctness
- **File Structure**: 100% of increments have correct folder structure
- **Naming Convention**: 100% of tasks/AC use project prefixes
- **Status Sync**: 100% lossless (copy-based sync)

---

## Summary

PM Agent multi-project awareness enables:

1. **Architecture-aware planning**: Config drives increment structure
2. **Project-specific user stories**: Created from the start (not split later)
3. **Simple living docs sync**: Copy files (no transformation)
4. **Clear project boundaries**: Backend team != frontend team
5. **Realistic task breakdown**: T-BE-001 ≠ T-FE-001

**Next Step**: Update increment 0037 spec.md to reflect copy-based sync paradigm.
