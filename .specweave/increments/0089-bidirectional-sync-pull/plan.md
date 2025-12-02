# Technical Plan: Bidirectional Sync with Change Detection

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     PULL SYNC FLOW                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │  ADO API     │    │  JIRA API    │    │  GitHub API  │       │
│  │ ChangedDate  │    │  updated >=  │    │  since=      │       │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘       │
│         │                   │                   │                │
│         └─────────┬─────────┴─────────┬─────────┘                │
│                   ▼                   ▼                          │
│         ┌─────────────────────────────────────┐                  │
│         │     ExternalChangePuller            │                  │
│         │  - fetchRecentChanges(platform)     │                  │
│         │  - mapToLivingDocsUpdate()          │                  │
│         └─────────────────┬───────────────────┘                  │
│                           ▼                                      │
│         ┌─────────────────────────────────────┐                  │
│         │     ConflictResolver                │                  │
│         │  - compareTimestamps()              │                  │
│         │  - decideWinner()                   │                  │
│         └─────────────────┬───────────────────┘                  │
│                           ▼                                      │
│         ┌─────────────────────────────────────┐                  │
│         │     LivingDocsUpdater               │                  │
│         │  - updateFrontmatter()              │                  │
│         │  - logAuditTrail()                  │                  │
│         └─────────────────────────────────────┘                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Design

### 1. ExternalChangePuller

**Location**: `src/sync/external-change-puller.ts`

```typescript
interface ExternalChange {
  platform: 'ado' | 'jira' | 'github';
  externalId: string;
  changedAt: string;        // ISO timestamp
  changedBy: string;        // Email/username
  changedFields: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
}

class ExternalChangePuller {
  // Fetch changes from all configured platforms
  async fetchRecentChanges(since: Date): Promise<ExternalChange[]>;

  // Platform-specific implementations
  private async fetchAdoChanges(since: Date): Promise<ExternalChange[]>;
  private async fetchJiraChanges(since: Date): Promise<ExternalChange[]>;
  private async fetchGitHubChanges(since: Date): Promise<ExternalChange[]>;
}
```

### 2. ConflictResolver

**Location**: `src/sync/conflict-resolver.ts` (enhance existing)

```typescript
interface ConflictResult {
  winner: 'local' | 'external';
  field: string;
  localValue: unknown;
  externalValue: unknown;
  localTimestamp: string;
  externalTimestamp: string;
  reason: string;
}

class SyncConflictResolver {
  // Compare timestamps and decide winner
  resolve(
    localItem: LivingDocsUSFile,
    externalChange: ExternalChange
  ): ConflictResult[];
}
```

### 3. LivingDocsUpdater

**Location**: `src/sync/living-docs-updater.ts`

```typescript
interface UpdateResult {
  itemId: string;
  updatedFields: string[];
  conflicts: ConflictResult[];
  auditEntry: AuditLogEntry;
}

class LivingDocsUpdater {
  // Apply external changes to living docs
  async applyChanges(changes: ExternalChange[]): Promise<UpdateResult[]>;

  // Update frontmatter with new values
  private async updateFrontmatter(
    filePath: string,
    field: string,
    value: unknown
  ): Promise<void>;
}
```

### 4. Scheduler Integration

**Location**: `src/core/scheduler/scheduled-job.ts`

Add new job type:
```typescript
export type JobType =
  | 'external-sync'         // Existing: push
  | 'external-pull'         // NEW: pull changes
  | 'discrepancy-check'
  | 'living-docs-sync'
  | 'notification-cleanup';
```

## API Implementations

### ADO: WIQL Query

```typescript
async fetchAdoChanges(since: Date): Promise<ExternalChange[]> {
  const wiql = `
    SELECT [System.Id], [System.State], [System.ChangedDate], [System.ChangedBy]
    FROM WorkItems
    WHERE [System.ChangedDate] >= '${since.toISOString()}'
      AND [System.Id] IN (${linkedItemIds.join(',')})
  `;

  const result = await this.adoClient.executeWiql(wiql);
  return this.mapAdoToChanges(result);
}
```

### JIRA: JQL Query

```typescript
async fetchJiraChanges(since: Date): Promise<ExternalChange[]> {
  const hoursSince = Math.ceil((Date.now() - since.getTime()) / 3600000);
  const jql = `updated >= -${hoursSince}h AND key IN (${linkedIssueKeys.join(',')})`;

  const result = await this.jiraClient.search(jql, {
    fields: ['status', 'priority', 'assignee', 'updated'],
    expand: ['changelog']  // Get change history
  });

  return this.mapJiraToChanges(result);
}
```

### GitHub: Issues API

```typescript
async fetchGitHubChanges(since: Date): Promise<ExternalChange[]> {
  const issues = await this.githubClient.listIssues({
    state: 'all',
    since: since.toISOString(),
    sort: 'updated',
    direction: 'desc'
  });

  // Filter to only linked issues
  return issues
    .filter(i => linkedIssueNumbers.includes(i.number))
    .map(this.mapGitHubToChange);
}
```

## Living Docs Schema Updates

Add sync metadata to frontmatter:

```yaml
---
id: US-001
title: "User Story Title"
status: in_progress
# NEW: Sync metadata
sync:
  lastPulledAt: "2025-12-01T10:00:00Z"
  lastModifiedAt: "2025-12-01T09:30:00Z"
  externalModifiedAt: "2025-12-01T09:45:00Z"
  externalModifiedBy: "john.doe@company.com"
---
```

## Audit Log Enhancement

Extend `AuditLogEntry`:

```typescript
interface AuditLogEntry {
  // Existing fields...

  // NEW: Pull-specific fields
  direction?: 'push' | 'pull';
  externalChangedBy?: string;
  externalChangedAt?: string;
  oldValue?: unknown;
  newValue?: unknown;
  conflictResolution?: 'local-wins' | 'external-wins' | 'no-conflict';
}
```

## Configuration Schema

```json
{
  "sync": {
    "pull": {
      "enabled": true,
      "intervalHours": 1,
      "pullOnSessionStart": true,
      "platforms": {
        "ado": true,
        "jira": true,
        "github": true
      },
      "fields": {
        "status": { "pull": true, "push": true },
        "priority": { "pull": true, "push": true },
        "assignee": { "pull": true, "push": false },
        "title": { "pull": false, "push": false },
        "description": { "pull": false, "push": false }
      }
    },
    "conflictResolution": {
      "strategy": "latest-timestamp",
      "tieBreaker": "external-wins"
    }
  }
}
```

## Implementation Order

1. **T-001**: Add `external-pull` job type to scheduler
2. **T-002**: Implement ADO change detection (WIQL)
3. **T-003**: Implement JIRA change detection (JQL + changelog)
4. **T-004**: Implement GitHub change detection (Issues API)
5. **T-005**: Create `ExternalChangePuller` class
6. **T-006**: Enhance `ConflictResolver` with timestamp comparison
7. **T-007**: Create `LivingDocsUpdater` for frontmatter updates
8. **T-008**: Enhance `SyncAuditLogger` with pull fields
9. **T-009**: Add `/specweave:sync-pull` command
10. **T-010**: Update session-start hook to run pull sync
11. **T-011**: Add configuration schema for pull sync
12. **T-012**: Write tests for conflict resolution scenarios

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| API rate limits | Exponential backoff, batch requests |
| Large change sets | Pagination, limit to 100 items |
| Network failures | Retry with backoff, partial sync OK |
| Timestamp drift | Use ISO strings, compare server-side |
| Stale local cache | Always fetch fresh on pull |
