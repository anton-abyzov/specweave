---
id: metadata-json
title: metadata.json
sidebar_label: metadata.json
---

# metadata.json

The **`metadata.json`** file tracks [increment](/docs/glossary/terms/increments) status, timestamps, and external tool integration within each increment folder.

## Location

```
.specweave/increments/0007-feature-name/
├── spec.md
├── plan.md
├── tasks.md
└── metadata.json     ← Status tracking
```

## Structure

```json
{
  "id": "0007-user-authentication",
  "type": "feature",
  "status": "active",
  "created": "2025-11-01T10:00:00Z",
  "lastActivity": "2025-11-15T14:30:00Z",
  "featureId": "FS-001",
  "github": {
    "issueNumber": 123,
    "issueUrl": "https://github.com/org/repo/issues/123",
    "lastSync": "2025-11-15T14:30:00Z"
  }
}
```

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Increment identifier (e.g., `0007-user-authentication`) |
| `type` | string | Increment type (`feature`, `hotfix`, `bug`, `refactor`, `experiment`) |
| `status` | string | Current status (`active`, `paused`, `completed`, `abandoned`) |
| `created` | ISO date | Creation timestamp |
| `lastActivity` | ISO date | Last modification time |
| `featureId` | string | Link to living docs feature (e.g., `FS-001`) |
| `pausedReason` | string | Reason if paused |
| `abandonedReason` | string | Reason if abandoned |
| `github` | object | GitHub integration data |
| `jira` | object | JIRA integration data |
| `ado` | object | Azure DevOps integration data |

## Status Values

| Status | Meaning | [WIP Limit](/docs/glossary/terms/wip-limits) |
|--------|---------|---------------------------------------------|
| `active` | Currently being worked on | Counts |
| `paused` | Temporarily blocked | Does not count |
| `completed` | All tasks done | Does not count |
| `abandoned` | Work cancelled | Does not count |

## External Tool Integration

### GitHub

```json
{
  "github": {
    "issueNumber": 123,
    "issueUrl": "https://github.com/org/repo/issues/123",
    "labels": ["feature", "in-progress"],
    "milestone": "v1.0",
    "lastSync": "2025-11-15T14:30:00Z"
  }
}
```

### JIRA

```json
{
  "jira": {
    "epicKey": "PROJ-123",
    "epicUrl": "https://company.atlassian.net/browse/PROJ-123",
    "lastSync": "2025-11-15T14:30:00Z"
  }
}
```

## Related

- [Increments](/docs/glossary/terms/increments) - Work units
- [spec.md](/docs/glossary/terms/spec-md) - Specifications
- [plan.md](/docs/glossary/terms/plan-md) - Architecture plans
- [tasks.md](/docs/glossary/terms/tasks-md) - Task tracking
- [WIP Limits](/docs/glossary/terms/wip-limits) - Work-in-progress limits
