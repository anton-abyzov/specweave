# ADR-0196: Project Registry with EDA-Based Synchronization

## Status

Accepted

## Date

2025-12-11

## Context

SpecWeave needs a centralized way to manage projects across external tools (GitHub, JIRA, Azure DevOps). Previously, project information was scattered across:

1. `config.json` - Both single-project and multi-project configurations
2. Per-increment `metadata.json` - External tool links per increment
3. Living docs folders - Project-based organization

This fragmentation led to:
- Inconsistent project detection across components
- No single source of truth for project metadata
- Manual synchronization between external tools
- Difficulty validating project references in specs

## Decision

We implemented a centralized **Project Registry** with **Event-Driven Architecture (EDA)** for external tool synchronization.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Project Registry                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           projects: Map<string, Project>                 │   │
│  │   - id, name, description, techStack, team, keywords    │   │
│  │   - external: { github, ado, jira }                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            │                                     │
│                      EventBus                                    │
│         ProjectCreated / ProjectUpdated / ProjectDeleted         │
│                     ProjectSyncRequested                         │
│                            │                                     │
│  ┌─────────────┬─────────────────┬──────────────────┐          │
│  │ GitHubAdapter│  ADOAdapter    │   JiraAdapter    │          │
│  │  (labels)    │  (area paths)  │  (project keys)  │          │
│  └──────────────┴────────────────┴──────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

1. **ProjectRegistry** (`src/core/project/project-registry.ts`)
   - CRUD operations with validation
   - File persistence to `.specweave/state/projects.json`
   - Migration from `config.json` on first load
   - Event emission on all mutations

2. **ProjectEventBus** (`src/core/project/project-event-bus.ts`)
   - EventEmitter-based implementation
   - Async handler execution with error isolation
   - Typed events: ProjectCreated, ProjectUpdated, ProjectDeleted, ProjectSyncRequested

3. **External Tool Adapters**
   - GitHubProjectAdapter: Creates/archives `project:{id}` labels
   - ADOProjectAdapter: Maps to area paths (read-only if no permissions)
   - JiraProjectAdapter: Maps to JIRA project keys (read-only)

4. **CLI Commands** (`src/cli/commands/project.ts`)
   - `specweave project list` - Display all projects with sync status
   - `specweave project add <id>` - Add new project
   - `specweave project remove <id>` - Remove project
   - `specweave project sync [id]` - Force sync to external tools
   - `specweave project show <id>` - Show project details
   - `specweave project discover` - Discover projects from external tools
   - `specweave project import <id>` - Import discovered project

5. **Living Docs Integration** (`src/core/project/project-resolution.ts`)
   - `validateAgainstRegistry()` - Warns if project not registered
   - `getProjectMetadata()` - Enriches living docs with project context

### Data Model

```typescript
interface Project {
  id: string;          // Kebab-case identifier (e.g., "frontend-app")
  name: string;        // Human-readable name
  description?: string;
  techStack?: string[];
  team?: string;
  keywords?: string[]; // For intelligent detection
  created: string;     // ISO timestamp
  updated?: string;
  external?: {
    github?: { labelName: string; labelColor?: string; lastSynced?: string; syncError?: string; };
    ado?: { areaPath: string; lastSynced?: string; syncError?: string; };
    jira?: { projectKey: string; lastSynced?: string; syncError?: string; };
  };
}
```

### Event Types

```typescript
type ProjectEvent =
  | ProjectCreatedEvent    // New project added
  | ProjectUpdatedEvent    // Project metadata changed
  | ProjectDeletedEvent    // Project removed
  | ProjectSyncRequestedEvent; // Sync to external tools requested
```

## Consequences

### Positive

1. **Single Source of Truth**: All project data in one place
2. **Loose Coupling**: Adapters subscribe to events, no direct dependencies
3. **Extensibility**: Easy to add new external tool adapters
4. **Validation**: Projects can be validated before living docs sync
5. **Discovery**: Can discover existing projects from external tools
6. **Migration**: Backward compatible with existing config.json

### Negative

1. **Additional State File**: New `.specweave/state/projects.json`
2. **Event Ordering**: Async handlers may execute in any order
3. **External API Dependency**: Discovery requires API access

### Risks

1. **State Drift**: Registry may get out of sync with external tools
   - Mitigated by: Sync validation on demand, sync status tracking

2. **Migration Failures**: Legacy config.json may have edge cases
   - Mitigated by: Graceful fallbacks, warning logs

## Related

- ADR-0140: Per-US Project Fields (project resolution priority)
- ADR-0016: Multi-project External Sync (original design)
- [src/core/project/](src/core/project/) - Implementation
- [tests/unit/core/project/](tests/unit/core/project/) - Unit tests
