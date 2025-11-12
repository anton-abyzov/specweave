# Multi-Project Spec Architecture - The CORRECT Way

**Date**: 2025-11-12
**Status**: Redesign Based on User Insight
**Problem**: Previous design was too simplistic (single spec per feature)

---

## The Real Problem

### What I Got Wrong

**My Previous Thinking**:
```
Feature: "Instant Polls & Voting"
└── ONE spec: specs/instant-polls-voting.md → ONE GitHub issue ❌
```

**Why This Is Wrong**:
- Features span multiple projects (frontend, backend, mobile, infra)
- Each project has its own GitHub repository
- One GitHub issue can't track work across multiple repos
- No clear project ownership

### The Correct Architecture

**Multi-Project Spec Split**:
```
Feature: "Instant Polls & Voting" (user request)
│
├── Backend API
│   └── specs/backend/spec-001-polls-api.md
│       → GitHub issue in myorg/backend-api repo
│       → Tracks: API endpoints, database, business logic
│
├── Frontend UI
│   └── specs/frontend/spec-001-polls-ui.md
│       → GitHub issue in myorg/frontend-ui repo
│       → Tracks: React components, state management, UI/UX
│
├── Mobile App (optional)
│   └── specs/mobile/spec-001-polls-mobile.md
│       → GitHub issue in myorg/mobile-app repo
│       → Tracks: React Native screens, offline support
│
└── Parent Overview (optional, reference only)
    └── specs/_parent/instant-polls-overview.md
        → NOT synced to GitHub (just coordination doc)
        → Links to all project-specific specs
```

---

## Smart Identifier System

### Spec File Structure

**Location**: `.specweave/docs/internal/specs/{project-id}/spec-{number}-{slug}.md`

**Examples**:
- `specs/backend/spec-001-polls-api.md`
- `specs/frontend/spec-001-polls-ui.md`
- `specs/mobile/spec-001-polls-mobile.md`
- `specs/_parent/instant-polls-overview.md` (not numbered, not synced)

### Spec Frontmatter

```yaml
---
# Project Context
project: backend  # ✅ Which project does this belong to?
projectDisplayName: "Backend API"

# Spec Identity
id: spec-001  # ✅ Unique within project
title: "Polls API - CRUD & Voting Logic"
slug: polls-api

# Status & Priority
status: in-progress
priority: P0

# GitHub Sync
externalLinks:
  github:
    owner: myorg          # ✅ Auto-detected from project config
    repo: backend-api     # ✅ Auto-detected from project config
    issueNumber: 45       # ✅ Synced from GitHub
    issueUrl: https://github.com/myorg/backend-api/issues/45
    syncedAt: "2025-11-12T10:00:00Z"

# Cross-Project References
relatedSpecs:
  - frontend/spec-001-polls-ui  # ✅ Links to frontend spec
  - _parent/instant-polls-overview  # ✅ Links to overview
---
```

### Configuration Mapping

**File**: `.specweave/config.json`

```json
{
  "projects": {
    "backend": {
      "id": "backend",
      "displayName": "Backend API",
      "description": "ASP.NET Core API + PostgreSQL",
      "github": {
        "owner": "myorg",
        "repo": "backend-api"
      },
      "defaultLabels": ["backend", "api"],
      "team": "Backend Team"
    },
    "frontend": {
      "id": "frontend",
      "displayName": "Frontend UI",
      "description": "React 18 + TypeScript + Vite",
      "github": {
        "owner": "myorg",
        "repo": "frontend-ui"
      },
      "defaultLabels": ["frontend", "ui"],
      "team": "Frontend Team"
    },
    "mobile": {
      "id": "mobile",
      "displayName": "Mobile App",
      "description": "React Native",
      "github": {
        "owner": "myorg",
        "repo": "mobile-app"
      },
      "defaultLabels": ["mobile", "react-native"],
      "team": "Mobile Team"
    },
    "_parent": {
      "id": "_parent",
      "displayName": "Parent Repository",
      "description": "Cross-project coordination (not synced)",
      "github": null,  // ✅ No GitHub sync for parent!
      "syncEnabled": false
    }
  }
}
```

---

## Intelligent Spec Splitting

### When User Creates Increment

**User Request**: "I want to build instant polls and voting"

**PM Agent Analysis**:
1. **Detect scope**: This feature spans backend + frontend
2. **Prompt user**:
   ```
   🤔 This feature appears to span multiple projects.

   Detected components:
   - Backend: Poll API (CRUD, voting logic, database)
   - Frontend: Poll UI (create poll form, voting interface, results display)

   How should we split this?

   Option 1: Create separate specs per project (Recommended) ✅
     → specs/backend/spec-001-polls-api.md (syncs to backend-api repo)
     → specs/frontend/spec-001-polls-ui.md (syncs to frontend-ui repo)
     → specs/_parent/instant-polls-overview.md (coordination doc)

   Option 2: Single spec with manual split ❌
     → specs/default/spec-001-instant-polls.md (all components)
     → You manually split tasks across repos

   Option 3: Backend-only for now, frontend later ✅
     → specs/backend/spec-001-polls-api.md (phase 1)
     → specs/frontend/spec-001-polls-ui.md (phase 2, later)

   Your choice: [1]
   ```

3. **Create specs based on choice**:
   - If Option 1: Create 2-3 specs (one per project + optional parent)
   - If Option 2: Create single spec (user manages split)
   - If Option 3: Create backend spec only (frontend deferred)

### Smart Project Detection

**Keywords → Project Mapping**:

```typescript
const projectDetection = {
  backend: [
    'api', 'endpoint', 'database', 'crud', 'business logic',
    'authentication', 'authorization', 'data model', 'migration',
    'asp.net', '.net', 'ef core', 'sql', 'postgresql'
  ],
  frontend: [
    'ui', 'ux', 'component', 'page', 'form', 'button', 'layout',
    'react', 'next.js', 'tailwind', 'css', 'responsive',
    'state management', 'redux', 'context'
  ],
  mobile: [
    'mobile', 'ios', 'android', 'react native', 'expo',
    'offline', 'push notifications', 'biometric', 'camera'
  ],
  infra: [
    'deploy', 'kubernetes', 'docker', 'ci/cd', 'monitoring',
    'terraform', 'helm', 'aws', 'azure', 'gcp'
  ]
};

function detectProjects(userRequest: string): string[] {
  const detected: string[] = [];
  const lowerRequest = userRequest.toLowerCase();

  for (const [project, keywords] of Object.entries(projectDetection)) {
    if (keywords.some(keyword => lowerRequest.includes(keyword))) {
      detected.push(project);
    }
  }

  return detected;
}

// Example:
detectProjects("Build poll API with React UI")
// → ['backend', 'frontend']

detectProjects("Add voting logic to database and show results in mobile app")
// → ['backend', 'mobile']
```

---

## Sync Workflow

### Scenario 1: Multi-Project Feature

**User creates increment**: "Instant Polls & Voting"

**PM Agent**:
1. Detects keywords: "polls", "voting" → backend + frontend
2. Creates specs:
   - `specs/backend/spec-001-polls-api.md`
   - `specs/frontend/spec-001-polls-ui.md`
   - `specs/_parent/instant-polls-overview.md`
3. Syncs to GitHub:
   - Backend spec → GitHub issue in `myorg/backend-api` (issue #45)
   - Frontend spec → GitHub issue in `myorg/frontend-ui` (issue #78)
   - Parent overview → NOT synced (reference only)
4. Creates increment:
   - `increments/0001-instant-polls-voting/spec.md`:
     ```markdown
     **Implements**:
     - Backend: SPEC-BE-001 (specs/backend/spec-001-polls-api.md)
     - Frontend: SPEC-FE-001 (specs/frontend/spec-001-polls-ui.md)
     - Overview: specs/_parent/instant-polls-overview.md
     ```

**Task Completion**:
1. Backend task completes → Updates `specs/backend/spec-001-polls-api.md`
2. Hook syncs to GitHub → Updates issue #45 in backend-api repo
3. Frontend task completes → Updates `specs/frontend/spec-001-polls-ui.md`
4. Hook syncs to GitHub → Updates issue #78 in frontend-ui repo

### Scenario 2: Single-Project Feature

**User creates increment**: "Optimize database queries"

**PM Agent**:
1. Detects keywords: "database", "queries" → backend only
2. Creates spec:
   - `specs/backend/spec-002-db-optimization.md`
3. Syncs to GitHub:
   - Backend spec → GitHub issue in `myorg/backend-api` (issue #46)
4. Creates increment:
   - `increments/0002-db-optimization/spec.md`:
     ```markdown
     **Implements**: SPEC-BE-002 (specs/backend/spec-002-db-optimization.md)
     ```

**Task Completion**:
1. Backend task completes → Updates `specs/backend/spec-002-db-optimization.md`
2. Hook syncs to GitHub → Updates issue #46 in backend-api repo

---

## Identifier Format

### Full Spec Identifier

**Format**: `{project}/{spec-id}`

**Examples**:
- `backend/spec-001` - Backend API spec #1
- `frontend/spec-001` - Frontend UI spec #1
- `mobile/spec-001` - Mobile app spec #1
- `_parent/instant-polls-overview` - Parent overview (no number, not synced)

### Compact Display Format

**Format**: `SPEC-{PROJECT_CODE}-{NUMBER}`

**Examples**:
- `SPEC-BE-001` - Backend spec #1
- `SPEC-FE-001` - Frontend spec #1
- `SPEC-MB-001` - Mobile spec #1

**Project Codes**:
```typescript
const projectCodes = {
  backend: 'BE',
  frontend: 'FE',
  mobile: 'MB',
  infra: 'IN',
  _parent: 'PA'
};
```

### GitHub Issue Title Format

**Format**: `[{COMPACT_ID}] {Title}`

**Examples**:
- `[SPEC-BE-001] Polls API - CRUD & Voting Logic`
- `[SPEC-FE-001] Polls UI - Create & Vote Interface`

---

## Metadata Storage

### Per-Spec Metadata

**Location**: `.specweave/docs/internal/specs/{project}/.metadata/{spec-id}.json`

**Example**: `specs/backend/.metadata/spec-001.json`

```json
{
  "specId": "spec-001",
  "project": "backend",
  "fullId": "backend/spec-001",
  "compactId": "SPEC-BE-001",
  "externalLinks": {
    "github": {
      "owner": "myorg",
      "repo": "backend-api",
      "issueNumber": 45,
      "issueUrl": "https://github.com/myorg/backend-api/issues/45",
      "syncedAt": "2025-11-12T10:00:00Z"
    }
  },
  "relatedSpecs": [
    "frontend/spec-001",
    "_parent/instant-polls-overview"
  ],
  "increments": [
    "0001-instant-polls-voting",
    "0005-polls-enhancements"
  ]
}
```

---

## Implementation Changes

### Hook: post-task-completion.sh

**Current (Wrong)**:
```bash
# Tries to find ONE spec for increment
SPEC_ID=$(detect_spec_from_increment "$CURRENT_INCREMENT")
```

**New (Correct)**:
```bash
# Finds ALL specs for increment (can be multiple projects!)
SPEC_IDS=$(detect_specs_from_increment "$CURRENT_INCREMENT")

# Sync each spec to its respective GitHub repo
for SPEC_ID in $SPEC_IDS; do
  PROJECT=$(echo "$SPEC_ID" | cut -d'/' -f1)
  SPEC_NUM=$(echo "$SPEC_ID" | cut -d'/' -f2)

  # Skip _parent (not synced)
  if [ "$PROJECT" = "_parent" ]; then
    continue
  fi

  # Get GitHub repo from project config
  OWNER=$(get_project_github_owner "$PROJECT")
  REPO=$(get_project_github_repo "$PROJECT")

  # Sync spec to correct GitHub repo
  SPEC_FILE="specs/$PROJECT/$SPEC_NUM.md"
  sync_spec_to_github "$SPEC_FILE" "$OWNER" "$REPO"
done
```

### Config Schema Update

Add `projects` section to `.specweave/config.json`:

```json
{
  "projects": {
    "{project-id}": {
      "id": "string",
      "displayName": "string",
      "description": "string",
      "github": {
        "owner": "string",
        "repo": "string"
      } | null,
      "syncEnabled": boolean,
      "defaultLabels": ["string"],
      "team": "string"
    }
  }
}
```

---

## Benefits

### Why This Architecture Is Better

1. **Project Ownership** ✅
   - Each project team owns their specs
   - GitHub issues in their own repos
   - Clear responsibility boundaries

2. **Independent Scaling** ✅
   - Backend team can plan 10 specs
   - Frontend team can plan 8 specs
   - No cross-team blocking

3. **Correct GitHub Mapping** ✅
   - Backend specs → backend-api repo
   - Frontend specs → frontend-ui repo
   - Mobile specs → mobile-app repo

4. **Cross-Project Coordination** ✅
   - Parent overview links all related specs
   - Easy to see full-stack features
   - Shared context without duplication

5. **Flexible Splitting** ✅
   - User decides: single project or multi-project
   - PM agent suggests based on keywords
   - Can defer projects to later increments

---

## Migration Strategy

### For Existing Single-Spec Projects

**Before**:
```
specs/instant-polls-voting.md → One GitHub issue ❌
```

**After**:
```
specs/backend/spec-001-polls-api.md → GitHub issue in backend repo ✅
specs/frontend/spec-001-polls-ui.md → GitHub issue in frontend repo ✅
```

**Migration Script**:
1. Detect which projects exist in codebase
2. Analyze existing spec content (keywords)
3. Suggest split: backend vs frontend vs mobile
4. User approves split
5. Create project-specific specs
6. Sync to respective GitHub repos
7. Update increment references

---

## Next Steps

**What I need from you**:

1. **Does this match your vision?**
   - Multi-project spec split
   - Each project → own GitHub repo
   - Smart identifier system
   - Parent overview (not synced)

2. **Project structure questions**:
   - Do you have `backend`, `frontend`, `mobile` as separate repos?
   - Or monorepo with multiple projects?
   - What are your project names?

3. **Approval to implement**:
   - Update config schema (add `projects`)
   - Implement multi-spec detection
   - Update hooks to sync all specs
   - Create project-to-repo mapping

Let me know if this is the right direction!

---

**Status**: Awaiting user confirmation on multi-project architecture
**Date**: 2025-11-12
