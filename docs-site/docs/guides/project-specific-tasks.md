---
id: project-specific-tasks
title: Project-Specific Tasks
sidebar_label: Project-Specific Tasks
description: User stories with checkable task lists for better traceability and GitHub collaboration
keywords: [tasks, user stories, project isolation, github sync, traceability]
---

# Project-Specific Tasks

**Version**: 0.18.3+
**Status**: Production-Ready
**Last Updated**: 2025-11-15

## Overview

**NEW in v0.18.3**: User stories now include their own **project-specific checkable task lists** instead of just links to increment tasks.

### Before (v0.18.2 and earlier)

User stories only had LINKS to increment tasks:

```markdown
## Implementation

**Increment**: [0031-external-tool-sync](link)

**Tasks**:
- [T-001: Setup API endpoint](link)
- [T-002: Create React component](link)
- [T-003: Add DB migration](link)
```

**Problems**:
- ❌ No clear separation between backend/frontend tasks
- ❌ Stakeholders had to navigate to increment tasks.md
- ❌ No checkable task lists in GitHub issues
- ❌ Hard to track progress per project

### After (v0.18.3+)

User stories have their OWN checkable task lists:

```markdown
## Tasks

- [ ] **T-001**: Setup API endpoint
- [x] **T-003**: Add DB migration (completed)

> **Note**: Tasks are project-specific. For the full increment task list, see [increment tasks.md](link)

---

## Implementation
**Increment**: [0031-external-tool-sync](link)
**Source Tasks**: See increment tasks.md for complete task breakdown
```

**Benefits**:
- ✅ **Project Isolation**: Backend tasks separate from frontend tasks
- ✅ **GitHub UX**: Tasks appear as checkable checkboxes in GitHub issues
- ✅ **Traceability**: Each user story explicitly lists its tasks
- ✅ **Status Tracking**: Completion state synced from increment tasks.md
- ✅ **Stakeholder Visibility**: Non-technical stakeholders can track progress in GitHub

---

## How It Works

### Data Flow

```
Increment tasks.md (All tasks, source of truth)
    ↓
TaskProjectSpecificGenerator (Filters by User Story + Project)
    ↓
User Story ## Tasks Section (Project-specific checkboxes)
    ↓
GitHub Issue (Checkable task list for stakeholders)
```

### Filtering Logic

Tasks are filtered in TWO ways:

1. **By User Story** (mandatory):
   - Uses AC-IDs to map tasks to user stories
   - Example: `AC-US1-01` → User Story `US-001`

2. **By Project** (optional):
   - Uses keyword matching to determine project
   - Example: Keywords `['api', 'database']` → Backend project

### Example: Multi-Project Feature

**Increment tasks.md**:
```markdown
## T-001: Setup API endpoint for authentication

**Status**: [x] (100% - Completed)
**AC**: AC-US1-01, AC-US1-02

## T-002: Create React login component

**Status**: [ ] (0% - Not started)
**AC**: AC-US1-01

## T-003: Add user database table

**Status**: [x] (100% - Completed)
**AC**: AC-US1-02
```

**Backend User Story** (`us-001-api-authentication.md`):
```markdown
## Tasks

- [x] **T-001**: Setup API endpoint for authentication
- [x] **T-003**: Add user database table

> **Note**: Tasks are project-specific
```

**Frontend User Story** (`us-001-login-component.md`):
```markdown
## Tasks

- [ ] **T-002**: Create React login component

> **Note**: Tasks are project-specific
```

---

## Configuration

### Project Keywords (Optional)

Configure project keywords in `.specweave/config.json`:

```json
{
  "multiProject": {
    "enabled": true,
    "projects": {
      "backend": {
        "name": "Backend",
        "techStack": ["Node.js", "PostgreSQL"],
        "keywords": ["api", "endpoint", "database", "backend", "server"]
      },
      "frontend": {
        "name": "Frontend",
        "techStack": ["React", "TypeScript"],
        "keywords": ["component", "react", "ui", "css", "style", "frontend"]
      },
      "mobile": {
        "name": "Mobile",
        "techStack": ["React Native"],
        "keywords": ["mobile", "react native", "ios", "android"]
      }
    }
  }
}
```

**How Keywords Work**:
- Task title is checked against project keywords
- If keyword found → task belongs to that project
- If no keywords configured → all tasks included (filtered by User Story only)

---

## Usage

### Generate User Stories with Tasks

After creating your increment spec and tasks:

```bash
/specweave:sync-docs update
```

**What Happens**:
1. Parses increment spec.md → Extracts user stories
2. Loads increment tasks.md → Reads ALL tasks with completion status
3. **FOR EACH PROJECT**:
   - Filters user stories for this project
   - **FOR EACH USER STORY**:
     - Filters tasks by User Story ID (via AC-IDs)
     - Optionally filters tasks by project keywords
     - Generates user story file with `## Tasks` section

**Result**: User story files have project-specific task lists!

### Sync to GitHub

Create GitHub issues with checkable task lists:

```bash
/specweave-github:sync-spec specweave/FS-031
```

**Result**: GitHub issues have checkable task lists like this:

```markdown
## User Story

**As a** backend developer
**I want** to implement API authentication
**So that** only authorized users can access the API

## Acceptance Criteria

- [ ] **AC-US1-01**: JWT token generation works
- [x] **AC-US1-02**: Token validation middleware implemented

## Tasks

- [x] **T-001**: Setup API endpoint
- [x] **T-003**: Add DB migration

## Implementation
**Increment**: [0031-external-tool-sync](link)
```

---

## Architecture

### Key Components

1. **TaskProjectSpecificGenerator** (`src/core/living-docs/task-project-specific-generator.ts`):
   - Loads increment tasks with completion status
   - Filters tasks by User Story ID (via AC-IDs)
   - Optional project keyword filtering
   - Preserves completion status

2. **SpecDistributor** (`src/core/living-docs/spec-distributor.ts`):
   - Orchestrates user story generation
   - Calls TaskProjectSpecificGenerator for each user story
   - Formats `## Tasks` section in user story files

3. **UserStoryIssueBuilder** (`plugins/specweave-github/lib/user-story-issue-builder.ts`):
   - Reads tasks from `## Tasks` section (NEW)
   - Falls back to legacy extraction from increment tasks.md
   - Generates GitHub issue body with task checkboxes

### Source of Truth

**Important**: Increment tasks.md remains the **source of truth** for:
- All task definitions
- Task completion status
- Task-to-AC mapping

User story `## Tasks` sections are **filtered views**, NOT duplicates.

### Backward Compatibility

Old user stories (without `## Tasks` section) still work:
- GitHub sync falls back to legacy extraction
- Tasks read from increment tasks.md
- No breaking changes

---

## Benefits

### 1. Project Isolation

**Problem**: In multi-project increments, backend and frontend tasks were mixed.

**Solution**: Each project's user stories show only relevant tasks.

**Example**:
- Backend US-001 shows: `T-001` (API), `T-003` (DB)
- Frontend US-001 shows: `T-002` (React component)

### 2. GitHub Collaboration

**Problem**: Stakeholders had to navigate to increment tasks.md to see tasks.

**Solution**: Tasks appear directly in GitHub issues with checkboxes.

**Benefit**: Non-technical stakeholders can:
- See what's being worked on
- Track progress via checkboxes
- Understand implementation details

### 3. Traceability

**Problem**: Hard to see which tasks belong to which user story.

**Solution**: Each user story explicitly lists its tasks.

**Benefit**: Clear visibility of:
- What needs to be done for this user story
- What's completed vs incomplete
- Which tasks are blocked

### 4. Status Tracking

**Problem**: Task completion status only visible in increment tasks.md.

**Solution**: Status synced to user story files and GitHub issues.

**Benefit**: Multiple views of completion:
- Increment tasks.md (technical view)
- User story files (project view)
- GitHub issues (stakeholder view)

---

## Migration

### For Existing Increments

Re-run living docs sync to add `## Tasks` sections:

```bash
/specweave:sync-docs update
```

**What Changes**:
- User story files updated with `## Tasks` section
- Old `## Implementation` section remains (backward compat)
- GitHub issues updated on next sync

### For New Increments

Tasks are automatically included:
- Create increment as usual
- Run `/specweave:sync-docs update`
- User stories generated with `## Tasks` sections

---

## Troubleshooting

### Tasks Not Appearing in User Stories

**Symptom**: User story has no `## Tasks` section.

**Causes**:
1. Tasks.md doesn't exist
2. Tasks have no AC-IDs
3. AC-IDs don't match user story ID

**Solution**:
- Ensure tasks.md exists with **AC**: field
- Verify AC-ID format: `AC-US1-01` → User Story `US-001`
- Check console output for filtering messages

### Wrong Tasks in User Story

**Symptom**: User story shows tasks from other projects.

**Causes**:
1. Project keywords not configured
2. Task titles don't match keywords

**Solution**:
- Configure keywords in `.specweave/config.json`
- Ensure task titles contain project keywords
- Example: "Setup API endpoint" should contain "api" for backend

### Tasks Not Showing in GitHub Issues

**Symptom**: GitHub issue has no `## Tasks` section.

**Causes**:
1. User story file has no `## Tasks` section
2. Old GitHub sync code

**Solution**:
- Re-run `/specweave:sync-docs update`
- Update to v0.18.3+
- Verify user story file has `## Tasks` section

---

## Best Practices

### 1. Use Descriptive Task Titles

**Good**:
```markdown
## T-001: Setup JWT authentication middleware
## T-002: Create React login form component
```

**Bad**:
```markdown
## T-001: Auth
## T-002: Form
```

**Why**: Descriptive titles help keyword matching and make tasks self-explanatory.

### 2. Configure Project Keywords

**Recommended**:
```json
{
  "projects": {
    "backend": {
      "keywords": ["api", "database", "server", "endpoint", "middleware"]
    },
    "frontend": {
      "keywords": ["component", "ui", "react", "css", "style"]
    }
  }
}
```

**Why**: Enables automatic project filtering without manual tagging.

### 3. Keep AC-IDs Consistent

**Format**: `AC-US{number}-{criteria}`

**Examples**:
- User Story 1: `AC-US1-01`, `AC-US1-02`, `AC-US1-03`
- User Story 2: `AC-US2-01`, `AC-US2-02`

**Why**: Enables automatic task-to-user-story mapping.

### 4. Update Living Docs Regularly

**Frequency**: After completing each task or at end of day.

**Command**:
```bash
/specweave:sync-docs update
```

**Why**: Keeps user story task lists in sync with increment tasks.md.

---

## FAQ

### Q: Are tasks duplicated between increment and user stories?

**A**: No. User story `## Tasks` sections are **filtered views** of increment tasks.md, not duplicates.

### Q: What if I edit tasks in user story files?

**A**: Don't. Increment tasks.md is the source of truth. User story tasks are regenerated on sync.

### Q: Can I have tasks without project filtering?

**A**: Yes. If no keywords configured, tasks are filtered by User Story only (all tasks shown).

### Q: What about bidirectional sync (GitHub → SpecWeave)?

**A**: Planned for future release. Architecture supports it via `parseTasksFromMarkdown()` and `updateTaskCheckboxes()` methods.

### Q: Do old user stories still work?

**A**: Yes. GitHub sync falls back to legacy extraction if `## Tasks` section missing.

---

## Related Documentation

- [Intelligent Living Docs Sync](./intelligent-living-docs-sync.md) - Overall sync architecture
- [GitHub Integration](./github-integration.md) - GitHub sync setup
- [Multi-Project Setup](./multi-project-setup.md) - Multi-project configuration
- [Bidirectional Linking](../../internal/specs/default/README.md) - AC-ID format

---

**Last Updated**: 2025-11-15
**Version**: 0.18.3+
