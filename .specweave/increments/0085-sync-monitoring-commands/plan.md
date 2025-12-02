# Implementation Plan: Sync Monitoring & Commands

## Executive Summary

This final phase of the Unified Sync Orchestration feature delivers user-facing commands for monitoring, notification management, discrepancy review, and log querying. It makes all the infrastructure from Phases 1-3 accessible and actionable.

## Implementation Approach

### Phase 4a: Dashboard (T-001 to T-002)
1. Sync Monitor dashboard command
2. Dashboard data aggregation

### Phase 4b: Notification Management (T-003)
1. Notifications command with full CRUD

### Phase 4c: Discrepancy Management (T-004)
1. Discrepancies command with review workflow

### Phase 4d: Log Querying (T-005 to T-006)
1. Log aggregator for cross-file queries
2. Sync logs command

### Phase 4e: Integration & Polish (T-007)
1. Inject notifications into existing commands
2. Comprehensive testing

## Architecture Decisions

### ADR-0209: Command Structure Pattern

**Context**: Need consistent command structure across new commands.

**Decision**: Follow existing SpecWeave command patterns:
- Slash command files in `plugins/specweave/commands/`
- Implementation in `src/cli/commands/`
- Consistent flag/argument handling

**Consequences**:
- Familiar UX for users
- Easy to add new commands
- Consistent documentation

### ADR-0210: Dashboard Caching Strategy

**Context**: Dashboard should be fast but data should be fresh.

**Decision**: Cache summary stats with short TTL:
- Job statuses: Real-time (no cache)
- Notification counts: 5-second cache
- Activity summary: 1-minute cache

**Consequences**:
- Fast dashboard loads
- Acceptable freshness for summary data
- Real-time for critical status

### ADR-0211: Log Query Implementation

**Context**: Need to query across multiple JSONL log files efficiently.

**Decision**: Stream-based line-by-line processing:
- Read files line by line (no full load)
- Filter as we go
- Stop early when limit reached

**Consequences**:
- Memory efficient
- Fast for filtered queries
- Slower for unfiltered full exports

## Dependencies

### Internal
- From 0082: JobScheduler, NotificationManager, SyncConfig
- From 0083: SyncAuditLogger, audit logs
- From 0084: DiscrepancyDetector, discrepancy reports

### External
- No new dependencies

## File Locations

```
src/cli/commands/
├── sync-monitor.ts
├── notifications.ts
├── discrepancies.ts
└── sync-logs.ts

plugins/specweave/commands/
├── specweave-sync-monitor.md
├── specweave-notifications.md
├── specweave-discrepancies.md
└── specweave-sync-logs.md

src/core/logs/
├── log-aggregator.ts
├── log-exporter.ts
└── log-query-parser.ts

src/core/dashboard/
├── dashboard-data.ts         # Data aggregation
└── dashboard-formatter.ts    # CLI formatting

tests/unit/cli/commands/
├── sync-monitor.test.ts
├── notifications.test.ts
├── discrepancies.test.ts
└── sync-logs.test.ts
```

## Rollout Plan

1. Implement dashboard (read-only, safe)
2. Implement notifications command (limited write)
3. Implement discrepancies command
4. Implement log querying
5. Integrate notifications into existing commands
6. Final testing and documentation

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Dashboard too slow | Caching, lazy loading |
| Notification spam | Severity filtering, batch dismiss |
| Accidental dismissal | Confirmation prompts |
| Log query timeout | Pagination, limit defaults |
