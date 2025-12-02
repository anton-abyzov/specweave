---
increment: 0089-bidirectional-sync-pull
type: feature
status: completed
started: 2025-12-01
created: 2025-12-01
completed: 2025-12-02
feature_id: FS-089
---

# Bidirectional Sync with Change Detection

## Problem Statement

Current sync is one-directional (SpecWeave → External). When external tools (ADO/JIRA/GitHub) are updated directly:
1. **No detection** - Changes aren't detected
2. **No pull** - Updates don't flow back to SpecWeave
3. **No audit** - Who changed what, when is not tracked
4. **No conflict resolution** - Timestamp-based resolution missing

## Solution

Implement **pull sync** that:
1. Detects changes in external tools since last sync
2. Pulls status/field updates back to living docs
3. Uses timestamp-based conflict resolution (latest wins)
4. Logs all changes with full audit trail

## Requirements

### External Change Detection

Query external APIs for recently changed items:

| Platform | API | Query |
|----------|-----|-------|
| **ADO** | WIQL | `[System.ChangedDate] > @Today - 1` |
| **JIRA** | JQL | `updated >= -1h` |
| **GitHub** | Issues API | `sort=updated&since={timestamp}` |

### What to Sync (Pull Direction)

| Field | Pull Back? | Reason |
|-------|-----------|--------|
| Status | YES | External status is authoritative |
| Priority | YES | PM may change in external tool |
| Assignee | YES | Assignment changes externally |
| Title | NO | Format preservation |
| Description | NO | Format preservation |
| ACs | NO | Format preservation |

### Polling Strategy

| Trigger | Scope | Purpose |
|---------|-------|---------|
| Session start | Changes since last session | Catch overnight updates |
| Scheduled (hourly) | Changes in last 2 hours | Regular sync |
| Manual | All linked items | Force refresh |

### Conflict Resolution

```
If localModified > externalModified:
  → Local wins (push to external)
If externalModified > localModified:
  → External wins (pull to local)
If equal:
  → No action needed
```

### Audit Trail

Log every sync operation:
```json
{
  "timestamp": "2025-12-01T10:30:00Z",
  "direction": "pull",
  "platform": "ado",
  "itemId": "12345",
  "field": "status",
  "oldValue": "Active",
  "newValue": "Resolved",
  "externalChangedBy": "john.doe@company.com",
  "externalChangedAt": "2025-12-01T10:25:00Z"
}
```

## Acceptance Criteria

### US-001: External Change Detection
- [x] **AC-US1-01**: ADO client can query work items changed in last N hours
- [x] **AC-US1-02**: JIRA client can query issues updated in last N hours
- [x] **AC-US1-03**: GitHub client can query issues updated since timestamp
- [x] **AC-US1-04**: Changed items include `ChangedDate` and `ChangedBy` fields

### US-002: Pull Sync Execution
- [x] **AC-US2-01**: Status changes from external tools update living docs
- [x] **AC-US2-02**: Priority changes from external tools update living docs
- [x] **AC-US2-03**: Assignee changes from external tools update living docs
- [x] **AC-US2-04**: Format-preserved fields (title, description, ACs) are NOT modified

### US-003: Timestamp-Based Conflict Resolution
- [x] **AC-US3-01**: Compare local `lastModified` vs external `ChangedDate`
- [x] **AC-US3-02**: External wins if external timestamp is more recent
- [x] **AC-US3-03**: Local wins if local timestamp is more recent
- [x] **AC-US3-04**: Conflict resolution is logged with both timestamps

### US-004: Scheduled Pull Sync
- [x] **AC-US4-01**: New job type `external-pull` added to scheduler
- [x] **AC-US4-02**: Default interval is 1 hour (configurable)
- [x] **AC-US4-03**: Runs on session start (for overnight changes)
- [x] **AC-US4-04**: Can be triggered manually via `/specweave:sync-pull`

### US-005: Enhanced Audit Logging
- [x] **AC-US5-01**: Pull operations logged with direction="pull"
- [x] **AC-US5-02**: Log includes externalChangedBy and externalChangedAt
- [x] **AC-US5-03**: Log includes old and new values for changed fields
- [x] **AC-US5-04**: `/specweave:sync-logs` shows pull operations

## Configuration

```json
{
  "sync": {
    "pull": {
      "enabled": true,
      "intervalHours": 1,
      "pullOnSessionStart": true,
      "fields": {
        "status": true,
        "priority": true,
        "assignee": true,
        "title": false,
        "description": false
      }
    },
    "conflictResolution": {
      "strategy": "latest-timestamp",
      "favorExternal": ["status", "assignee"],
      "favorLocal": ["description", "acceptanceCriteria"]
    }
  }
}
```

## Technical Notes

### ADO WIQL Query

```sql
SELECT [System.Id], [System.Title], [System.State], [System.ChangedDate], [System.ChangedBy]
FROM WorkItems
WHERE [System.ChangedDate] > @Today - 1
  AND [System.Id] IN (12345, 12346, 12347)
ORDER BY [System.ChangedDate] DESC
```

### Living Docs Update

When pulling status change:
1. Read US frontmatter
2. Update `status` field
3. Update `lastSyncedAt` timestamp
4. Log change to audit trail

### Edge Cases

1. **Item deleted externally** → Mark as "deleted" in living docs, notify user
2. **Item moved to different project** → Update reference, notify user
3. **API rate limits** → Exponential backoff, continue with partial sync
4. **Network failure** → Retry with backoff, log failure

## Out of Scope

- Syncing comments (complex, low value)
- Syncing attachments (binary, complex)
- Real-time webhooks (requires server infrastructure)
