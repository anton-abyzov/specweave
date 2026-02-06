# ADR-0238: GitHub Projects v2 Integration

**Date**: 2026-02-06
**Status**: Accepted
**Increment**: 0190-sync-architecture-redesign

## Context

Current GitHub sync only uses Issues + Labels + Milestones. GitHub Projects v2 (GraphQL-based) offers custom fields, board views, and status workflows. Many teams use Projects v2 as their primary board.

## Decision

Extend `GitHubAdapter` with Projects v2 support via GraphQL API:

```typescript
interface GitHubProjectsV2Extension {
  // Discovery
  listProjects(): Promise<ProjectV2[]>
  getProjectFields(projectId: string): Promise<ProjectField[]>

  // Item management
  addIssueToProject(issueId: string, projectId: string): Promise<ProjectItem>
  updateProjectItemField(itemId: string, fieldId: string, value: FieldValue): Promise<void>

  // Field mapping
  mapFields(specweaveFields: FieldMap, projectFields: ProjectField[]): FieldMapping
}
```

Field mapping configuration:
```json
{
  "sync": {
    "github": {
      "projectId": "PVT_kwDOABC123",
      "fieldMapping": {
        "status": "Status",
        "priority": "Priority",
        "sprint": "Sprint"
      }
    }
  }
}
```

The Projects v2 integration lives in `src/sync/projects-v2.ts` as a separate module (not in the provider adapter) because it's GitHub-specific and uses GraphQL instead of REST.

## Consequences

**Positive**: Full board sync, custom fields, modern GitHub workflow support
**Negative**: Requires GraphQL, GitHub-specific (no equivalent for JIRA/ADO board sync yet)
