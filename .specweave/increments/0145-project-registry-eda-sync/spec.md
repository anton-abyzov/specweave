---
increment: 0145-project-registry-eda-sync
title: "Project Registry with EDA-Based Synchronization"
type: feature
priority: P1
status: completed
---

# Feature: Project Registry with EDA-Based Synchronization

## Executive Summary

Implement a centralized **Project Registry** as the single source of truth for all projects, with **Event-Driven Architecture (EDA)** for keeping project data synchronized across:
- `config.json` (definition)
- `spec.md` per-US `**Project**:` fields (assignment)
- `us-*.md` frontmatter `project:` (living docs)
- External tools: GitHub labels, ADO area paths, JIRA projects

## Problem Statement

### Current State (Fragmented)

Project information is scattered across multiple locations:

| Location | Format | When Updated |
|----------|--------|--------------|
| `config.json` | `multiProject.projects` | Manual |
| `spec.md` body | `**Project**: xxx` | Increment creation |
| `us-*.md` frontmatter | `project: xxx` | Living docs sync |
| GitHub | `project:xxx` label | GitHub sync |
| ADO | Area path | ADO sync |
| JIRA | Project key | JIRA sync |

### Problems

1. **No Single Source of Truth**: Project definitions scattered, can go out of sync
2. **Manual Sync Required**: Adding a project requires updating multiple places
3. **No Validation**: Can create issues for non-existent projects
4. **No Discovery**: Can't easily list all projects across external tools
5. **No Audit Trail**: No history of project changes

## Solution: Centralized Project Registry + EDA

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PROJECT REGISTRY                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ projects.json (Single Source of Truth)                │   │
│  │ - All project definitions                             │   │
│  │ - External tool mappings                              │   │
│  │ - Sync status per tool                                │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────┘
                             │
                    EDA Event Bus
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   GitHub     │    │     ADO      │    │    JIRA      │
│   Adapter    │    │   Adapter    │    │   Adapter    │
│              │    │              │    │              │
│ project:xxx  │    │ Area Path    │    │ Project Key  │
│   labels     │    │   mapping    │    │   mapping    │
└──────────────┘    └──────────────┘    └──────────────┘
```

### Event Types

| Event | Trigger | Handlers |
|-------|---------|----------|
| `ProjectCreated` | New project added to registry | Create in GitHub/ADO/JIRA |
| `ProjectUpdated` | Project config changed | Update external tools |
| `ProjectDeleted` | Project removed | Archive in external tools |
| `ProjectSyncRequested` | Manual sync trigger | Sync to all external tools |
| `ExternalProjectDiscovered` | Found in external tool | Add to registry (optional) |

---

## User Stories

### US-001: Project Registry Data Model (P0)
**Project**: specweave

**As a** SpecWeave developer
**I want** a centralized project registry with well-defined schema
**So that** all project information is stored in one place

**Acceptance Criteria**:
- [x] **AC-US1-01**: Create `ProjectRegistry` class in `src/core/project/project-registry.ts`
- [x] **AC-US1-02**: Define `Project` interface with: id, name, description, techStack, team, externalMappings
- [x] **AC-US1-03**: Define `ExternalMapping` interface: { github?: GitHubMapping, ado?: ADOMapping, jira?: JiraMapping }
- [x] **AC-US1-04**: Store registry in `.specweave/state/projects.json` (not config.json)
- [x] **AC-US1-05**: Unit tests for ProjectRegistry CRUD operations

---

### US-002: Registry CRUD Operations (P0)
**Project**: specweave

**As a** SpecWeave user
**I want** to add, update, list, and remove projects from the registry
**So that** I can manage my project portfolio

**Acceptance Criteria**:
- [x] **AC-US2-01**: `registry.addProject(project)` - adds new project, emits `ProjectCreated`
- [x] **AC-US2-02**: `registry.updateProject(id, updates)` - updates project, emits `ProjectUpdated`
- [x] **AC-US2-03**: `registry.removeProject(id)` - removes project, emits `ProjectDeleted`
- [x] **AC-US2-04**: `registry.getProject(id)` - returns project or null
- [x] **AC-US2-05**: `registry.listProjects()` - returns all projects
- [x] **AC-US2-06**: Validation: prevent duplicate IDs, require valid project name

---

### US-003: EDA Event Bus for Project Events (P0)
**Project**: specweave

**As a** SpecWeave developer
**I want** an event bus for project-related events
**So that** handlers can react to project changes asynchronously

**Acceptance Criteria**:
- [x] **AC-US3-01**: Create `ProjectEventBus` class in `src/core/project/project-event-bus.ts`
- [x] **AC-US3-02**: Support event types: `ProjectCreated`, `ProjectUpdated`, `ProjectDeleted`, `ProjectSyncRequested`
- [x] **AC-US3-03**: Support `on(eventType, handler)` for registering handlers
- [x] **AC-US3-04**: Support `emit(eventType, payload)` for triggering events
- [x] **AC-US3-05**: Handlers execute asynchronously (non-blocking)
- [x] **AC-US3-06**: Error handling: log errors but don't block other handlers

---

### US-004: GitHub Sync Adapter (P1)
**Project**: specweave

**As a** SpecWeave user with GitHub integration
**I want** project changes to sync to GitHub labels automatically
**So that** my GitHub issues are always correctly labeled

**Acceptance Criteria**:
- [x] **AC-US4-01**: Create `GitHubProjectAdapter` that subscribes to project events
- [x] **AC-US4-02**: On `ProjectCreated`: Create `project:{id}` label in GitHub repo
- [x] **AC-US4-03**: On `ProjectUpdated`: Update label name/description if changed
- [x] **AC-US4-04**: On `ProjectDeleted`: Archive label (rename to `_archived_project:{id}`)
- [x] **AC-US4-05**: Store sync status in registry: `lastSynced`, `syncError`

---

### US-005: ADO Sync Adapter (P1)
**Project**: specweave

**As a** SpecWeave user with Azure DevOps integration
**I want** project changes to sync to ADO area paths automatically
**So that** my ADO work items are correctly organized

**Acceptance Criteria**:
- [x] **AC-US5-01**: Create `ADOProjectAdapter` that subscribes to project events
- [x] **AC-US5-02**: On `ProjectCreated`: Create area path in ADO (if permissions allow)
- [x] **AC-US5-03**: On `ProjectUpdated`: Update area path name
- [x] **AC-US5-04**: Map registry project ID to ADO area path
- [x] **AC-US5-05**: Handle ADO rate limits and errors gracefully

---

### US-006: JIRA Sync Adapter (P1)
**Project**: specweave

**As a** SpecWeave user with JIRA integration
**I want** project registry to map to JIRA projects
**So that** I can track which JIRA projects correspond to SpecWeave projects

**Acceptance Criteria**:
- [x] **AC-US6-01**: Create `JiraProjectAdapter` that subscribes to project events
- [x] **AC-US6-02**: Store JIRA project key mapping in registry
- [x] **AC-US6-03**: Validate JIRA project exists on sync
- [x] **AC-US6-04**: Note: JIRA projects can't be created via API (read-only mapping)
- [x] **AC-US6-05**: On `ProjectSyncRequested`: Verify mapping is still valid

---

### US-007: Migration from config.json (P0)
**Project**: specweave

**As a** SpecWeave user with existing projects in config.json
**I want** my projects automatically migrated to the new registry
**So that** I don't lose my project configuration

**Acceptance Criteria**:
- [x] **AC-US7-01**: On first run, detect `config.json` projects (single or multi-project)
- [x] **AC-US7-02**: Create `projects.json` with migrated data
- [x] **AC-US7-03**: Preserve backward compatibility: read from both sources during transition
- [x] **AC-US7-04**: Log migration: "Migrated N projects to registry"
- [x] **AC-US7-05**: Don't delete config.json projects (read-only migration)

---

### US-008: CLI Commands for Registry (P1)
**Project**: specweave

**As a** SpecWeave user
**I want** CLI commands to manage the project registry
**So that** I can add/list/remove projects easily

**Acceptance Criteria**:
- [x] **AC-US8-01**: `specweave project list` - Lists all projects with sync status
- [x] **AC-US8-02**: `specweave project add <id> --name "Name" [--github] [--ado] [--jira]`
- [x] **AC-US8-03**: `specweave project remove <id>` - Removes project (with confirmation)
- [x] **AC-US8-04**: `specweave project sync [<id>]` - Force sync to external tools
- [x] **AC-US8-05**: `specweave project show <id>` - Show project details and mappings

---

### US-009: Integration with Living Docs Sync (P1)
**Project**: specweave

**As a** SpecWeave developer
**I want** living docs sync to validate against the project registry
**So that** only valid projects can be used in specs

**Acceptance Criteria**:
- [x] **AC-US9-01**: Before sync, validate `**Project**:` field exists in registry
- [x] **AC-US9-02**: If project not found, prompt to add it or fail sync
- [x] **AC-US9-03**: Update sync to read project metadata from registry (not just ID)
- [x] **AC-US9-04**: Add project techStack/team to generated us-*.md (optional enhancement)

---

### US-010: Project Discovery from External Tools (P2)
**Project**: specweave

**As a** SpecWeave user
**I want** to discover and import projects from external tools
**So that** I can quickly onboard existing projects

**Acceptance Criteria**:
- [x] **AC-US10-01**: `specweave project discover --github` - List GitHub labels matching `project:*`
- [x] **AC-US10-02**: `specweave project discover --ado` - List ADO area paths
- [x] **AC-US10-03**: `specweave project discover --jira` - List JIRA projects
- [x] **AC-US10-04**: `specweave project import <id>` - Add discovered project to registry

---

## Technical Design

### File Structure

```
.specweave/
├── state/
│   └── projects.json       # NEW: Project registry (single source of truth)
├── config.json             # Existing: Still used for other settings
└── increments/
    └── 0145-project-registry-eda-sync/
```

### projects.json Schema

```json
{
  "version": "1.0.0",
  "projects": {
    "frontend-app": {
      "id": "frontend-app",
      "name": "Frontend App",
      "description": "React frontend application",
      "techStack": ["TypeScript", "React", "Tailwind"],
      "team": "Frontend Team",
      "keywords": ["frontend", "ui", "react"],
      "created": "2025-12-11T00:00:00Z",
      "external": {
        "github": {
          "labelName": "project:frontend-app",
          "labelColor": "0052CC",
          "lastSynced": "2025-12-11T00:00:00Z"
        },
        "ado": {
          "areaPath": "MyProject\\Frontend",
          "lastSynced": "2025-12-11T00:00:00Z"
        },
        "jira": {
          "projectKey": "FRONT",
          "lastSynced": "2025-12-11T00:00:00Z"
        }
      }
    }
  },
  "defaultProject": "frontend-app"
}
```

### Event Payloads

```typescript
interface ProjectCreatedEvent {
  type: 'ProjectCreated';
  project: Project;
  timestamp: string;
}

interface ProjectUpdatedEvent {
  type: 'ProjectUpdated';
  projectId: string;
  changes: Partial<Project>;
  timestamp: string;
}

interface ProjectDeletedEvent {
  type: 'ProjectDeleted';
  projectId: string;
  timestamp: string;
}

interface ProjectSyncRequestedEvent {
  type: 'ProjectSyncRequested';
  projectId?: string; // If undefined, sync all
  targets: ('github' | 'ado' | 'jira')[];
  timestamp: string;
}
```

---

## Dependencies

- Existing: `src/core/project/project-manager.ts`
- Existing: `src/core/project/project-resolution.ts`
- Existing: `plugins/specweave-github/lib/user-story-issue-builder.ts`
- Existing: `src/core/living-docs/living-docs-sync.ts`

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Migration breaks existing projects | Read from both config.json and registry during transition |
| External tool API failures | Retry with backoff, log errors, continue with other tools |
| Race conditions in event handlers | Queue events, process sequentially per project |
| Registry file corruption | Backup before write, validate JSON schema |

## Success Metrics

- [ ] All existing projects migrated to registry without data loss
- [ ] Project changes sync to GitHub within 5 seconds
- [ ] Zero manual intervention needed for project sync
- [ ] CLI commands work for all CRUD operations

---

## References

- ADR-0140: Per-US project field as primary source
- ADR-0195: Remove frontmatter project field
- CLAUDE.md: "Two File Formats for Project Field" section
