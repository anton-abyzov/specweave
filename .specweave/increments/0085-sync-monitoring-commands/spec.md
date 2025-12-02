---
increment: 0085-sync-monitoring-commands
feature_id: FS-082
title: "Sync Monitoring & Commands - Phase 4"
status: completed
started: 2025-12-01
priority: P2
type: feature
created: 2025-12-01
---

# 0085: Sync Monitoring & Commands - Phase 4

## Overview

This increment completes the Unified Sync Orchestration feature by adding monitoring dashboards, notification management commands, discrepancy review workflows, and log aggregation. It provides full visibility into sync operations and enables proactive issue resolution.

## Scope

**This Increment (0085) - Phase 4: Monitoring & Commands**
- US-001: Sync Monitor Dashboard
- US-002: Notifications Command
- US-003: Discrepancies Command
- US-004: Log Aggregation & Querying

**Dependencies**: Requires 0082, 0083, 0084

## Problem Statement

1. **No Central Dashboard**: Users can't see sync status at a glance
2. **Hidden Notifications**: Notifications exist but no command to view/manage them
3. **Discrepancy Review**: No workflow to review and act on discrepancies
4. **Log Fragmentation**: Logs exist but can't be easily queried

## User Stories

### US-001: Sync Monitor Dashboard
**As a** developer,
**I want** a dashboard showing sync status,
**So that** I can see job states, notifications, and recent activity.

#### Acceptance Criteria
- [x] **AC-US1-01**: Show scheduled job statuses (idle/running/failed/disabled)
- [x] **AC-US1-02**: Show last run and next run times for each job
- [x] **AC-US1-03**: Show pending notification count by severity
- [x] **AC-US1-04**: Show recent sync activity (last 24h summary)
- [x] **AC-US1-05**: Show quick stats: synced/failed/skipped counts

### US-002: Notifications Command
**As a** developer,
**I want** to view and manage notifications,
**So that** I can stay informed and dismiss resolved items.

#### Acceptance Criteria
- [x] **AC-US2-01**: List pending notifications with severity and message
- [x] **AC-US2-02**: Show notification details with data payload
- [x] **AC-US2-03**: Dismiss individual notifications by ID
- [x] **AC-US2-04**: Dismiss all notifications with confirmation
- [x] **AC-US2-05**: Filter notifications by type or severity

### US-003: Discrepancies Command
**As a** developer,
**I want** to view and act on discrepancies,
**So that** I can keep specs in sync with code.

#### Acceptance Criteria
- [x] **AC-US3-01**: List all detected discrepancies
- [x] **AC-US3-02**: Show discrepancy details (spec vs code)
- [x] **AC-US3-03**: Accept recommendation (apply patch)
- [x] **AC-US3-04**: Dismiss discrepancy (mark as intentional)
- [x] **AC-US3-05**: Run discrepancy check on demand

### US-004: Log Aggregation & Querying
**As a** project admin,
**I want** to query sync logs,
**So that** I can troubleshoot issues and audit operations.

#### Acceptance Criteria
- [x] **AC-US4-01**: Query logs by date range
- [x] **AC-US4-02**: Query logs by platform (GitHub/JIRA/ADO)
- [x] **AC-US4-03**: Query logs by operation type
- [x] **AC-US4-04**: Query logs by result (success/denied/error)
- [x] **AC-US4-05**: Export query results to JSON

## Technical Architecture

### 1. Sync Monitor Command (`/specweave:sync-monitor`)

```
╔══════════════════════════════════════════════════════════════╗
║                    SYNC MONITOR DASHBOARD                     ║
╠══════════════════════════════════════════════════════════════╣
║ SCHEDULED JOBS                                                ║
╟──────────────────────────────────────────────────────────────╢
║ external-sync      │ ✅ idle    │ Last: 5m ago │ Next: 10m   ║
║ discrepancy-check  │ 🔄 running │ Started: 2m ago            ║
║ living-docs-sync   │ ⏸️ disabled                             ║
╠══════════════════════════════════════════════════════════════╣
║ PENDING NOTIFICATIONS (3)                                     ║
╟──────────────────────────────────────────────────────────────╢
║ ⚠️ WARNING: 2 discrepancies detected in FS-045               ║
║ ℹ️ INFO: 107 items imported from JIRA (project CORE)         ║
║ ❗ CRITICAL: GitHub sync failed (rate limited)                ║
╠══════════════════════════════════════════════════════════════╣
║ RECENT SYNC ACTIVITY (last 24h)                               ║
╟──────────────────────────────────────────────────────────────╢
║ GitHub: 45 synced │ JIRA: 12 synced │ ADO: 0 synced          ║
║ Success: 55 │ Failed: 2 │ Skipped (no permission): 8         ║
╚══════════════════════════════════════════════════════════════╝
```

### 2. Notifications Command (`/specweave:notifications`)

```bash
/specweave:notifications              # List pending
/specweave:notifications --all        # Include dismissed
/specweave:notifications --type sync-failure
/specweave:notifications dismiss 123  # Dismiss by ID
/specweave:notifications dismiss-all  # Dismiss all
```

### 3. Discrepancies Command (`/specweave:discrepancies`)

```bash
/specweave:discrepancies              # List all
/specweave:discrepancies --check      # Run check now
/specweave:discrepancies show 456     # Show details
/specweave:discrepancies accept 456   # Apply patch
/specweave:discrepancies dismiss 456  # Mark intentional
```

### 4. Log Query Command (`/specweave:sync-logs`)

```bash
/specweave:sync-logs                           # Last 24h
/specweave:sync-logs --since "2025-12-01"      # Since date
/specweave:sync-logs --platform github         # Filter platform
/specweave:sync-logs --result denied           # Filter result
/specweave:sync-logs --export logs.json        # Export
```

## File Locations

```
src/cli/commands/
├── sync-monitor.ts          # Dashboard command
├── notifications.ts         # Notification management
├── discrepancies.ts         # Discrepancy management
└── sync-logs.ts             # Log querying

plugins/specweave/commands/
├── specweave-sync-monitor.md
├── specweave-notifications.md
├── specweave-discrepancies.md
└── specweave-sync-logs.md

src/core/logs/
├── log-aggregator.ts        # Query across log files
└── log-exporter.ts          # Export to JSON
```

## Testing Strategy

- Unit tests for each command
- Unit tests for log aggregator
- Integration tests for full workflows
- E2E tests for command output formatting

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Large log files | Pagination, streaming queries |
| Dashboard performance | Cache summary stats |
| Complex queries | Start simple, add filters incrementally |

## Success Metrics

- Dashboard loads in < 1 second
- Notification actions complete in < 500ms
- Log queries return in < 5 seconds for typical date ranges
